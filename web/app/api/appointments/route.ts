import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isCoach } from "@/lib/auth/server";
import { getMemberByUserId, getMemberById } from "@/lib/members/queries";
import {
  createAppointment,
  getCalendarSettings,
  hasConflict,
  listBlocks,
  listCoachAppointments,
  listCoachBusyRanges,
  listMemberAppointments,
  listAvailabilityRules,
} from "@/lib/appointments/queries";
import { notifyMemberOfAppointment } from "@/lib/appointments/notify";
import { syncAppointmentToGoogle } from "@/lib/appointments/google-calendar";

const MAX_RANGE_DAYS = 60;

function validWebUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Parse from/to query params, defaulting to a 2-week window from today. */
function parseRange(request: NextRequest): { from: Date; to: Date } | null {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(from.getTime() + 14 * 86400_000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  if (to <= from) return null;
  if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86400_000) return null;
  return { from, to };
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = parseRange(request);
  if (!range) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  if (isCoach(user)) {
    const [appointments, blocks, rules, settings] = await Promise.all([
      listCoachAppointments(user.tenantId, user.id, range.from, range.to),
      listBlocks(user.tenantId, user.id, range.from, range.to),
      listAvailabilityRules(user.tenantId, user.id, range.from, range.to),
      getCalendarSettings(user.id, user.tenantId),
    ]);
    return NextResponse.json({
      role: "coach",
      appointments,
      blocks,
      rules,
      defaults: {
        meetingType: settings?.preferredMeetingType ?? "none",
        location: settings?.defaultLocation ?? null,
        zoomUrl: settings?.defaultZoomUrl ?? null,
        whatsappUrl: settings?.defaultWhatsappUrl ?? null,
      },
    });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (!member.coachId) {
    return NextResponse.json({
      role: "member",
      coachAssigned: false,
      appointments: [],
      busy: [],
      blocks: [],
    });
  }

  const [appointments, busy, blocks, rules, settings] = await Promise.all([
    listMemberAppointments(user.tenantId, member.id, range.from, range.to),
    listCoachBusyRanges(user.tenantId, member.coachId, range.from, range.to),
    listBlocks(user.tenantId, member.coachId, range.from, range.to),
    listAvailabilityRules(user.tenantId, member.coachId, range.from, range.to),
    getCalendarSettings(member.coachId, user.tenantId),
  ]);

  return NextResponse.json({
    role: "member",
    coachAssigned: true,
    appointments,
    busy,
    // Members only need coach busy times to compute open slots, not the reason.
    blocks: blocks.map((b) => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
    rules: rules.map((r) => ({
      weekday: r.weekday,
      startsOn: r.startsOn,
      endsOn: r.endsOn,
    })),
    defaults: {
      meetingType: settings?.preferredMeetingType ?? "none",
      location: settings?.defaultLocation ?? null,
      zoomUrl: settings?.defaultZoomUrl ?? null,
      whatsappUrl: settings?.defaultWhatsappUrl ?? null,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }
  if (startsAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "Cannot book in the past" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

  let coachId: string;
  let memberId: string;
  let resolvedTitle = title;
  let meetingType:
    | "none"
    | "in_person"
    | "google_meet"
    | "zoom"
    | "whatsapp" = "none";
  let location: string | null = null;
  let joinUrl: string | null = null;

  if (isCoach(user)) {
    if (typeof body.memberId !== "string") {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }
    const member = await getMemberById(body.memberId, user.tenantId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (user.role !== "platform_admin" && member.coachId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    coachId = user.id;
    memberId = member.id;
    const requestedMeetingType = body.meetingType;
    if (
      typeof requestedMeetingType === "string" &&
      ["none", "in_person", "google_meet", "zoom", "whatsapp"].includes(
        requestedMeetingType,
      )
    ) {
      meetingType = requestedMeetingType as typeof meetingType;
    }
    location =
      typeof body.location === "string" ? body.location.trim() || null : null;
    joinUrl =
      typeof body.joinUrl === "string" ? body.joinUrl.trim() || null : null;
  } else {
    const member = await getMemberByUserId(user.id, user.tenantId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (!member.coachId) {
      return NextResponse.json({ error: "No coach assigned" }, { status: 404 });
    }
    coachId = member.coachId;
    memberId = member.id;
    resolvedTitle = title ?? "Coaching session";
    const settings = await getCalendarSettings(coachId, user.tenantId);
    meetingType = settings?.preferredMeetingType ?? "none";
    location =
      meetingType === "in_person" ? settings?.defaultLocation ?? null : null;
    joinUrl =
      meetingType === "zoom"
        ? settings?.defaultZoomUrl ?? null
        : meetingType === "whatsapp"
          ? settings?.defaultWhatsappUrl ?? null
          : null;
  }

  if (meetingType === "in_person" && !location) {
    return NextResponse.json(
      { error: "A location is required for an in-person appointment" },
      { status: 400 },
    );
  }
  if (meetingType === "google_meet") {
    const settings = await getCalendarSettings(coachId, user.tenantId);
    if (!settings?.googleRefreshToken && !joinUrl) {
      return NextResponse.json(
        { error: "Connect Google Calendar in Coach Settings before using Google Meet" },
        { status: 400 },
      );
    }
  }
  if (
    (meetingType === "zoom" || meetingType === "whatsapp") &&
    !joinUrl
  ) {
    return NextResponse.json(
      { error: "A meeting link is required" },
      { status: 400 },
    );
  }
  if (!validWebUrl(joinUrl)) {
    return NextResponse.json({ error: "Invalid meeting link" }, { status: 400 });
  }

  const conflict = await hasConflict(user.tenantId, coachId, startsAt, endsAt);
  if (conflict) {
    return NextResponse.json(
      { error: "That time is no longer available" },
      { status: 409 },
    );
  }

  const appt = await createAppointment({
    tenantId: user.tenantId,
    coachId,
    memberId,
    title: resolvedTitle,
    notes,
    meetingType,
    location,
    joinUrl,
    startsAt,
    endsAt,
    createdBy: user.id,
  });

  let synced = appt;
  try {
    synced = await syncAppointmentToGoogle(appt);
  } catch (error) {
    console.error("[appointments] Google sync failed", error);
  }
  await notifyMemberOfAppointment(appt.id, user.tenantId, "booked");
  return NextResponse.json(synced, { status: 201 });
}
