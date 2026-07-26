import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  getCalendarSettings,
  upsertCalendarSettings,
} from "@/lib/appointments/queries";
import { googleCalendarConfigured } from "@/lib/appointments/google-calendar";

const meetingTypes = ["none", "in_person", "google_meet", "zoom", "whatsapp"] as const;

function validOptionalUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const settings = await getCalendarSettings(user.id, user.tenantId);
  return NextResponse.json({
    preferredMeetingType: settings?.preferredMeetingType ?? "none",
    defaultLocation: settings?.defaultLocation ?? "",
    defaultZoomUrl: settings?.defaultZoomUrl ?? "",
    defaultWhatsappUrl: settings?.defaultWhatsappUrl ?? "",
    timeZone: settings?.timeZone ?? "Europe/London",
    googleConfigured: googleCalendarConfigured(),
    googleConnected: Boolean(settings?.googleRefreshToken),
    googleEmail: settings?.googleEmail ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!body || !meetingTypes.includes(body.preferredMeetingType)) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: body.timeZone });
  } catch {
    return NextResponse.json({ error: "Invalid time zone" }, { status: 400 });
  }
  if (
    !validOptionalUrl(body.defaultZoomUrl) ||
    !validOptionalUrl(body.defaultWhatsappUrl)
  ) {
    return NextResponse.json({ error: "Invalid meeting link" }, { status: 400 });
  }
  if (body.preferredMeetingType === "google_meet") {
    const current = await getCalendarSettings(user.id, user.tenantId);
    if (!current?.googleRefreshToken) {
      return NextResponse.json(
        { error: "Connect Google Calendar before choosing Google Meet as the default" },
        { status: 400 },
      );
    }
  }
  const settings = await upsertCalendarSettings(user.id, user.tenantId, {
    preferredMeetingType: body.preferredMeetingType,
    defaultLocation:
      typeof body.defaultLocation === "string" ? body.defaultLocation.trim() || null : null,
    defaultZoomUrl:
      typeof body.defaultZoomUrl === "string" ? body.defaultZoomUrl.trim() || null : null,
    defaultWhatsappUrl:
      typeof body.defaultWhatsappUrl === "string"
        ? body.defaultWhatsappUrl.trim() || null
        : null,
    timeZone: body.timeZone,
  });
  return NextResponse.json(settings);
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await upsertCalendarSettings(user.id, user.tenantId, {
    googleRefreshToken: null,
    googleEmail: null,
    googleConnectedAt: null,
  });
  return NextResponse.json({ ok: true });
}
