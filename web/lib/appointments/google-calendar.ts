import crypto from "node:crypto";
import {
  getAppointmentNotificationDetails,
  getCalendarSettings,
  listCalendarRowsForSync,
  setAppointmentGoogleDetails,
  setBlockGoogleEventId,
  setRuleGoogleEventId,
  upsertCalendarSettings,
} from "@/lib/appointments/queries";
import type {
  Appointment,
  AvailabilityBlock,
  AvailabilityRule,
} from "@/lib/db/schema";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3";

function config() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      `${process.env.APP_BASE_URL ?? "http://localhost:3010"}/api/coach/calendar/google/callback`,
  };
}

export function googleCalendarConfigured(): boolean {
  const c = config();
  return Boolean(c.clientId && c.clientSecret && c.redirectUri);
}

function encryptionKey(): Buffer {
  const secret =
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || config().clientSecret;
  if (!secret) throw new Error("Calendar token encryption is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptCalendarToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptCalendarToken(value: string): string {
  const [iv, tag, encrypted] = value.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function signState(payload: string): string {
  return crypto
    .createHmac("sha256", config().clientSecret)
    .update(payload)
    .digest("base64url");
}

export function buildGoogleAuthUrl(user: {
  id: string;
  tenantId: string;
}): string {
  if (!googleCalendarConfigured()) throw new Error("Google Calendar is not configured");
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      tenantId: user.tenantId,
      exp: Date.now() + 10 * 60_000,
    }),
  ).toString("base64url");
  const state = `${payload}.${signState(payload)}`;
  const c = config();
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" "),
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export function verifyGoogleState(state: string): {
  userId: string;
  tenantId: string;
} | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = signState(payload);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    userId: string;
    tenantId: string;
    exp: number;
  };
  if (parsed.exp < Date.now()) return null;
  return { userId: parsed.userId, tenantId: parsed.tenantId };
}

export async function completeGoogleConnection(
  code: string,
  userId: string,
  tenantId: string,
) {
  const c = config();
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const token = (await response.json()) as {
    refresh_token?: string;
    access_token: string;
  };
  if (!token.refresh_token) throw new Error("Google did not return a refresh token");
  const infoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const info = infoResponse.ok
    ? ((await infoResponse.json()) as { email?: string })
    : {};
  await upsertCalendarSettings(userId, tenantId, {
    googleRefreshToken: encryptCalendarToken(token.refresh_token),
    googleEmail: info.email ?? null,
    googleConnectedAt: new Date(),
  });
}

async function accessToken(coachId: string, tenantId: string) {
  const settings = await getCalendarSettings(coachId, tenantId);
  if (!settings?.googleRefreshToken || !googleCalendarConfigured()) return null;
  const c = config();
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: decryptCalendarToken(settings.googleRefreshToken),
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Google token refresh failed (${response.status})`);
  const token = (await response.json()) as { access_token: string };
  return { token: token.access_token, calendarId: settings.googleCalendarId };
}

async function calendarRequest(
  coachId: string,
  tenantId: string,
  path: string,
  init: RequestInit,
) {
  const auth = await accessToken(coachId, tenantId);
  if (!auth) return null;
  const response = await fetch(
    `${GOOGLE_CALENDAR}/calendars/${encodeURIComponent(auth.calendarId)}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Google Calendar request failed (${response.status})`);
  }
  if (response.status === 204) return {};
  return response.json();
}

export async function syncAppointmentToGoogle(
  appointment: Appointment,
): Promise<Appointment> {
  const detail = await getAppointmentNotificationDetails(
    appointment.id,
    appointment.tenantId,
  );
  const body: Record<string, unknown> = {
    summary: appointment.title ?? "Coaching session",
    description: appointment.notes ?? undefined,
    location: appointment.location ?? undefined,
    start: { dateTime: appointment.startsAt.toISOString() },
    end: { dateTime: appointment.endsAt.toISOString() },
    attendees: detail ? [{ email: detail.memberEmail }] : undefined,
  };
  if (appointment.meetingType === "google_meet" && !appointment.joinUrl) {
    body.conferenceData = {
      createRequest: {
        requestId: `abstrack-${appointment.id}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  const query = appointment.meetingType === "google_meet"
    ? "?conferenceDataVersion=1&sendUpdates=all"
    : "?sendUpdates=all";
  const path = appointment.googleEventId
    ? `/events/${encodeURIComponent(appointment.googleEventId)}${query}`
    : `/events${query}`;
  const data = (await calendarRequest(
    appointment.coachId,
    appointment.tenantId,
    path,
    { method: appointment.googleEventId ? "PUT" : "POST", body: JSON.stringify(body) },
  )) as { id?: string; hangoutLink?: string } | null;
  if (!data?.id) return appointment;
  return (
    (await setAppointmentGoogleDetails(
      appointment.id,
      data.id,
      data.hangoutLink ?? appointment.joinUrl,
    )) ?? appointment
  );
}

export async function deleteAppointmentFromGoogle(appointment: Appointment) {
  if (!appointment.googleEventId) return;
  await calendarRequest(
    appointment.coachId,
    appointment.tenantId,
    `/events/${encodeURIComponent(appointment.googleEventId)}?sendUpdates=all`,
    { method: "DELETE" },
  );
}

export async function syncBlockToGoogle(block: AvailabilityBlock) {
  const body = {
    summary: block.reason || "Unavailable",
    transparency: "opaque",
    start: { dateTime: block.startsAt.toISOString() },
    end: { dateTime: block.endsAt.toISOString() },
  };
  const path = block.googleEventId
    ? `/events/${encodeURIComponent(block.googleEventId)}`
    : "/events";
  const data = (await calendarRequest(block.coachId, block.tenantId, path, {
    method: block.googleEventId ? "PUT" : "POST",
    body: JSON.stringify(body),
  })) as { id?: string } | null;
  if (data?.id) await setBlockGoogleEventId(block.id, data.id);
}

export async function deleteBlockFromGoogle(block: AvailabilityBlock) {
  if (!block.googleEventId) return;
  await calendarRequest(
    block.coachId,
    block.tenantId,
    `/events/${encodeURIComponent(block.googleEventId)}`,
    { method: "DELETE" },
  );
}

export async function syncRuleToGoogle(rule: AvailabilityRule) {
  const weekday = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][rule.weekday];
  const firstDate = new Date(`${rule.startsOn}T00:00:00Z`);
  const daysUntil = (rule.weekday - firstDate.getUTCDay() + 7) % 7;
  firstDate.setUTCDate(firstDate.getUTCDate() + daysUntil);
  const nextDate = new Date(firstDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const body = {
    summary: rule.reason || "Unavailable",
    transparency: "opaque",
    start: { date: firstDate.toISOString().slice(0, 10) },
    end: { date: nextDate.toISOString().slice(0, 10) },
    recurrence: [
      `RRULE:FREQ=WEEKLY;BYDAY=${weekday}${rule.endsOn ? `;UNTIL=${rule.endsOn.replace(/-/g, "")}T235959Z` : ""}`,
    ],
  };
  const path = rule.googleEventId
    ? `/events/${encodeURIComponent(rule.googleEventId)}`
    : "/events";
  const data = (await calendarRequest(rule.coachId, rule.tenantId, path, {
    method: rule.googleEventId ? "PUT" : "POST",
    body: JSON.stringify(body),
  })) as { id?: string } | null;
  if (data?.id) await setRuleGoogleEventId(rule.id, data.id);
}

export async function deleteRuleFromGoogle(rule: AvailabilityRule) {
  if (!rule.googleEventId) return;
  await calendarRequest(
    rule.coachId,
    rule.tenantId,
    `/events/${encodeURIComponent(rule.googleEventId)}`,
    { method: "DELETE" },
  );
}

export async function syncExistingCalendarToGoogle(
  coachId: string,
  tenantId: string,
) {
  const rows = await listCalendarRowsForSync(coachId, tenantId);
  for (const appointment of rows.appointments) {
    try {
      await syncAppointmentToGoogle(appointment);
    } catch (error) {
      console.error("[calendar] appointment backfill failed", appointment.id, error);
    }
  }
  for (const block of rows.blocks) {
    try {
      await syncBlockToGoogle(block);
    } catch (error) {
      console.error("[calendar] block backfill failed", block.id, error);
    }
  }
  for (const rule of rows.rules) {
    try {
      await syncRuleToGoogle(rule);
    } catch (error) {
      console.error("[calendar] rule backfill failed", rule.id, error);
    }
  }
}
