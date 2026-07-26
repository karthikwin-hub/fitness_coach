import { sendEmail } from "@/lib/notify/email";
import {
  getAppointmentNotificationDetails,
  getCalendarSettings,
} from "@/lib/appointments/queries";

type AppointmentAction = "booked" | "rescheduled" | "cancelled";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildAppointmentIcs(input: {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  joinUrl: string | null;
  cancelled?: boolean;
}): string {
  const description = input.joinUrl ? `Join meeting: ${input.joinUrl}` : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abs-Track//Appointments//EN",
    `METHOD:${input.cancelled ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${input.id}@abstrack`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(input.startsAt)}`,
    `DTEND:${icsDate(input.endsAt)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    ...(input.location ? [`LOCATION:${escapeIcs(input.location)}`] : []),
    ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
    ...(input.joinUrl ? [`URL:${escapeIcs(input.joinUrl)}`] : []),
    `STATUS:${input.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarAddUrl(input: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  joinUrl: string | null;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${icsDate(input.startsAt)}/${icsDate(input.endsAt)}`,
  });
  if (input.location) params.set("location", input.location);
  if (input.joinUrl) params.set("details", `Join meeting: ${input.joinUrl}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function notifyMemberOfAppointment(
  appointmentId: string,
  tenantId: string,
  action: AppointmentAction,
): Promise<void> {
  const detail = await getAppointmentNotificationDetails(appointmentId, tenantId);
  if (!detail) return;
  const { appointment, memberEmail, memberName } = detail;
  const settings = await getCalendarSettings(
    appointment.coachId,
    appointment.tenantId,
  );
  const title = appointment.title ?? "Coaching session";
  const startsAt = appointment.startsAt;
  const endsAt = appointment.endsAt;
  const cancelled = action === "cancelled";
  const addUrl = googleCalendarAddUrl({
    title,
    startsAt,
    endsAt,
    location: appointment.location,
    joinUrl: appointment.joinUrl,
  });
  const appUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3010"}/member/appointments`;
  const when = startsAt.toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: settings?.timeZone ?? "Europe/London",
  });
  const place = appointment.location
    ? `<p><strong>Location:</strong> ${escapeHtml(appointment.location)}</p>`
    : "";
  const join = appointment.joinUrl
    ? `<p><a href="${escapeHtml(appointment.joinUrl)}" style="display:inline-block;background:#1D6468;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Join meeting</a></p>`
    : "";
  const calendarButton = cancelled
    ? ""
    : `<p><a href="${addUrl}">Add to Google Calendar</a></p>`;
  const subject = `Appointment ${action}: ${title}`;
  const html = `<p>Hi ${escapeHtml(memberName)},</p>
<p>Your appointment has been <strong>${action}</strong>.</p>
<p><strong>${escapeHtml(title)}</strong><br>${escapeHtml(when)}</p>
${place}${join}${calendarButton}
<p><a href="${appUrl}">Manage your booking in Abs-Track</a></p>`;
  const ics = buildAppointmentIcs({
    id: appointment.id,
    title,
    startsAt,
    endsAt,
    location: appointment.location,
    joinUrl: appointment.joinUrl,
    cancelled,
  });
  const result = await sendEmail({
    to: memberEmail,
    subject,
    html,
    text: `${title}\n${when}\n${appointment.location ?? ""}\n${appointment.joinUrl ?? ""}\n${appUrl}`,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(ics).toString("base64"),
      },
    ],
  });
  if (!result.ok) {
    console.error("[appointments] member notification failed", result.error);
  }
}
