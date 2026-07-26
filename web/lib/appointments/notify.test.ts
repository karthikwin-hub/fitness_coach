import { describe, expect, it } from "vitest";
import {
  buildAppointmentIcs,
  googleCalendarAddUrl,
} from "@/lib/appointments/notify";

describe("appointment calendar invitation", () => {
  const input = {
    id: "appointment-1",
    title: "Coaching session",
    startsAt: new Date("2026-08-03T09:00:00Z"),
    endsAt: new Date("2026-08-03T10:00:00Z"),
    location: "Main Studio",
    joinUrl: "https://meet.google.com/abc-defg-hij",
  };

  it("builds an ICS event with location and join URL", () => {
    const ics = buildAppointmentIcs(input);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("LOCATION:Main Studio");
    expect(ics).toContain("URL:https://meet.google.com/abc-defg-hij");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("builds an Add to Google Calendar URL", () => {
    const url = googleCalendarAddUrl(input);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("Coaching+session");
  });
});
