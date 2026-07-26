import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isCoach } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import {
  deleteAppointment,
  getCalendarSettings,
  getAppointmentById,
  hasConflict,
  updateAppointment,
} from "@/lib/appointments/queries";
import {
  deleteAppointmentFromGoogle,
  syncAppointmentToGoogle,
} from "@/lib/appointments/google-calendar";
import { notifyMemberOfAppointment } from "@/lib/appointments/notify";

type Params = { params: Promise<{ id: string }> };

function validWebUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Confirm the caller may act on this appointment. */
async function authorize(
  request: NextRequest,
  id: string,
) {
  const user = await getAuthUser(request);
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const appt = await getAppointmentById(id, user.tenantId);
  if (!appt) return { error: "Not found", status: 404 as const };

  if (isCoach(user)) {
    if (user.role !== "platform_admin" && appt.coachId !== user.id) {
      return { error: "Forbidden", status: 403 as const };
    }
    return { user, appt, isCoachActor: true as const };
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member || appt.memberId !== member.id) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { user, appt, isCoachActor: false as const };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorize(request, id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user, appt, isCoachActor } = auth;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateAppointment>[2] = {};

  if (typeof body.title === "string") patch.title = body.title.trim() || null;
  if (typeof body.notes === "string") patch.notes = body.notes.trim() || null;
  if (isCoachActor && typeof body.meetingType === "string") {
    if (
      !["none", "in_person", "google_meet", "zoom", "whatsapp"].includes(
        body.meetingType,
      )
    ) {
      return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
    }
    patch.meetingType = body.meetingType;
  }
  if (isCoachActor && body.location !== undefined) {
    patch.location =
      typeof body.location === "string" ? body.location.trim() || null : null;
  }
  if (isCoachActor && body.joinUrl !== undefined) {
    patch.joinUrl =
      typeof body.joinUrl === "string" ? body.joinUrl.trim() || null : null;
  }
  const resultingMeetingType = patch.meetingType ?? appt.meetingType;
  const resultingLocation =
    patch.location !== undefined ? patch.location : appt.location;
  const resultingJoinUrl =
    patch.joinUrl !== undefined ? patch.joinUrl : appt.joinUrl;
  if (resultingMeetingType === "in_person" && !resultingLocation) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }
  if (resultingMeetingType === "google_meet" && !resultingJoinUrl) {
    const settings = await getCalendarSettings(appt.coachId, user.tenantId);
    if (!settings?.googleRefreshToken) {
      return NextResponse.json(
        { error: "Connect Google Calendar before using Google Meet" },
        { status: 400 },
      );
    }
  }
  if (
    (resultingMeetingType === "zoom" || resultingMeetingType === "whatsapp") &&
    !resultingJoinUrl
  ) {
    return NextResponse.json({ error: "Meeting link is required" }, { status: 400 });
  }
  if (!validWebUrl(resultingJoinUrl)) {
    return NextResponse.json({ error: "Invalid meeting link" }, { status: 400 });
  }

  // Members may only cancel; coaches may set any status.
  if (typeof body.status === "string") {
    if (isCoachActor) {
      if (!["booked", "cancelled", "completed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = body.status;
    } else if (body.status === "cancelled") {
      patch.status = "cancelled";
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (body.startsAt !== undefined || body.endsAt !== undefined) {
    const startsAt = new Date(body.startsAt ?? appt.startsAt);
    const endsAt = new Date(body.endsAt ?? appt.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
    }
    if (endsAt <= startsAt) {
      return NextResponse.json({ error: "End must be after start" }, { status: 400 });
    }
    if (startsAt.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: "Cannot book in the past" }, { status: 400 });
    }
    const conflict = await hasConflict(
      user.tenantId,
      appt.coachId,
      startsAt,
      endsAt,
      appt.id,
    );
    if (conflict) {
      return NextResponse.json(
        { error: "That time is no longer available" },
        { status: 409 },
      );
    }
    patch.startsAt = startsAt;
    patch.endsAt = endsAt;
  }

  let updated = await updateAppointment(id, user.tenantId, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    if (patch.status === "cancelled") {
      await deleteAppointmentFromGoogle(updated);
    } else {
      updated = await syncAppointmentToGoogle(updated);
    }
  } catch (error) {
    console.error("[appointments] Google sync failed", error);
  }
  await notifyMemberOfAppointment(
    id,
    user.tenantId,
    patch.status === "cancelled" ? "cancelled" : "rescheduled",
  );
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await authorize(request, id);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await notifyMemberOfAppointment(id, auth.user.tenantId, "cancelled");
  try {
    await deleteAppointmentFromGoogle(auth.appt);
  } catch (error) {
    console.error("[appointments] Google delete failed", error);
  }
  await deleteAppointment(id, auth.user.tenantId);
  return NextResponse.json({ ok: true });
}
