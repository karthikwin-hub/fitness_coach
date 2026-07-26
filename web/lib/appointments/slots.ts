/**
 * Pure, timezone-agnostic helpers for the appointment calendar.
 *
 * All slot generation runs in the browser's local time so the coach and member
 * see the same wall-clock grid. Times are exchanged with the server as ISO
 * strings (UTC), and overlap checks compare absolute instants, so they are
 * timezone-safe regardless of where they run.
 */

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;
export const SLOT_MINUTES = 30;

export type TimeRange = { startsAt: string; endsAt: string };

export type DaySlot = {
  start: Date;
  end: Date;
  available: boolean;
};

/** True when two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
export function rangesOverlap(
  aStart: Date | string | number,
  aEnd: Date | string | number,
  bStart: Date | string | number,
  bEnd: Date | string | number,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

/** Local-midnight start of the ISO week (Monday) containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** The seven local-midnight day starts for the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate the bookable slots for a single local day, marking each slot
 * unavailable if it overlaps any busy range (existing appointments + blocks)
 * or has already started (relative to `now`).
 */
export function buildDaySlots(
  day: Date,
  busy: TimeRange[],
  now: Date = new Date(),
): DaySlot[] {
  const base = startOfDay(day);
  const slots: DaySlot[] = [];
  const stepMs = SLOT_MINUTES * 60 * 1000;

  for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour += SLOT_MINUTES / 60) {
    const start = new Date(base);
    start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
    const end = new Date(start.getTime() + stepMs);

    const isPast = start.getTime() <= now.getTime();
    const clashes = busy.some((b) =>
      rangesOverlap(start, end, b.startsAt, b.endsAt),
    );

    slots.push({ start, end, available: !isPast && !clashes });
  }

  return slots;
}

/** Hour labels for the coach week-grid rows. */
export function hourLabels(): number[] {
  return Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => DAY_START_HOUR + i,
  );
}

/**
 * Returns a contiguous selectable range from two slot starts. The second
 * selected cell is included, matching calendar selection behaviour.
 */
export function selectedSlotRange(
  first: Date,
  second: Date,
): { start: Date; end: Date } {
  const step = SLOT_MINUTES * 60_000;
  const startMs = Math.min(first.getTime(), second.getTime());
  const endMs = Math.max(first.getTime(), second.getTime()) + step;
  return { start: new Date(startMs), end: new Date(endMs) };
}

export function rangeIsAvailable(
  start: Date,
  end: Date,
  slots: DaySlot[],
): boolean {
  return slots
    .filter((slot) => slot.start < end && start < slot.end)
    .every((slot) => slot.available);
}

/** Format a Date as a value for <input type="datetime-local"> in local time. */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
