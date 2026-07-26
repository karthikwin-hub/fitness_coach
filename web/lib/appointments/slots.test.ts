import { describe, expect, it } from "vitest";
import {
  addDays,
  buildDaySlots,
  DAY_END_HOUR,
  DAY_START_HOUR,
  rangesOverlap,
  rangeIsAvailable,
  selectedSlotRange,
  SLOT_MINUTES,
  startOfWeek,
  weekDays,
} from "@/lib/appointments/slots";

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(
      rangesOverlap(
        "2026-08-03T09:00:00Z",
        "2026-08-03T10:00:00Z",
        "2026-08-03T09:30:00Z",
        "2026-08-03T10:30:00Z",
      ),
    ).toBe(true);
  });

  it("treats touching ranges as non-overlapping (half-open)", () => {
    expect(
      rangesOverlap(
        "2026-08-03T09:00:00Z",
        "2026-08-03T10:00:00Z",
        "2026-08-03T10:00:00Z",
        "2026-08-03T11:00:00Z",
      ),
    ).toBe(false);
  });
});

describe("startOfWeek / weekDays", () => {
  it("returns Monday as the first day", () => {
    // 2026-08-05 is a Wednesday
    const start = startOfWeek(new Date(2026, 7, 5));
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(3); // Monday Aug 3
  });

  it("returns 7 consecutive days", () => {
    const days = weekDays(new Date(2026, 7, 5));
    expect(days).toHaveLength(7);
    expect(days[6].getDate()).toBe(addDays(days[0], 6).getDate());
  });
});

describe("buildDaySlots", () => {
  const day = new Date(2026, 7, 5); // future date
  const past = new Date(2026, 7, 5, 0, 0, 0);

  it("produces one slot per 30-minute interval", () => {
    const slots = buildDaySlots(day, [], past);
    expect(slots).toHaveLength(
      ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES,
    );
    expect(slots[0].start.getHours()).toBe(DAY_START_HOUR);
  });

  it("marks slots overlapping a busy range as unavailable", () => {
    const busyStart = new Date(2026, 7, 5, DAY_START_HOUR, 0, 0);
    const busyEnd = new Date(2026, 7, 5, DAY_START_HOUR + 1, 0, 0);
    const slots = buildDaySlots(
      day,
      [{ startsAt: busyStart.toISOString(), endsAt: busyEnd.toISOString() }],
      past,
    );
    expect(slots[0].available).toBe(false);
    expect(slots[1].available).toBe(false);
    expect(slots[2].available).toBe(true);
  });

  it("marks slots in the past as unavailable", () => {
    const now = new Date(2026, 7, 5, DAY_START_HOUR + 2, 0, 0);
    const slots = buildDaySlots(day, [], now);
    expect(slots[0].available).toBe(false); // before now
    expect(slots[slots.length - 1].available).toBe(true); // after now
  });
});

describe("multi-slot selection", () => {
  it("includes both selected 30-minute cells", () => {
    const first = new Date(2026, 7, 5, 9, 0);
    const second = new Date(2026, 7, 5, 10, 0);
    const range = selectedSlotRange(first, second);
    expect(range.start.getHours()).toBe(9);
    expect(range.end.getHours()).toBe(10);
    expect(range.end.getMinutes()).toBe(30);
  });

  it("rejects a range containing a busy slot", () => {
    const day = new Date(2026, 7, 5);
    const busyStart = new Date(2026, 7, 5, 9, 30);
    const busyEnd = new Date(2026, 7, 5, 10, 0);
    const slots = buildDaySlots(
      day,
      [{ startsAt: busyStart.toISOString(), endsAt: busyEnd.toISOString() }],
      new Date(2026, 7, 5, 0, 0),
    );
    expect(
      rangeIsAvailable(
        new Date(2026, 7, 5, 9, 0),
        new Date(2026, 7, 5, 10, 30),
        slots,
      ),
    ).toBe(false);
  });
});
