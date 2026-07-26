export const WINDOW_DAYS = 90;

export type ProgramWindow = {
  index: number;
  from: string;
  to: string;
};

export type WindowMeta = ProgramWindow & {
  totalWindows: number;
  hasPrev: boolean;
  hasNext: boolean;
};

function parseDate(iso: string): Date {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${iso}`);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Build consecutive 90-day windows from program start through end (or today if ongoing). */
export function computeProgramWindows(
  programStartDate: string | null,
  programEndDate: string | null,
  asOf: Date = new Date(),
): ProgramWindow[] {
  const start = programStartDate
    ? parseDate(programStartDate)
    : addDays(asOf, -WINDOW_DAYS);
  const end = programEndDate ? parseDate(programEndDate) : parseDate(formatDate(asOf));
  const effectiveEnd = end > asOf ? parseDate(formatDate(asOf)) : end;
  if (effectiveEnd < start) {
    return [{ index: 0, from: formatDate(start), to: formatDate(start) }];
  }

  const windows: ProgramWindow[] = [];
  let cursor = new Date(start);
  let index = 0;
  while (cursor <= effectiveEnd) {
    const windowEnd = addDays(cursor, WINDOW_DAYS - 1);
    const cappedEnd = windowEnd > effectiveEnd ? effectiveEnd : windowEnd;
    windows.push({
      index,
      from: formatDate(cursor),
      to: formatDate(cappedEnd),
    });
    cursor = addDays(cappedEnd, 1);
    index += 1;
  }
  return windows.length > 0 ? windows : [{ index: 0, from: formatDate(start), to: formatDate(effectiveEnd) }];
}

export function resolveWindowIndex(
  windows: ProgramWindow[],
  requested: number | undefined,
  asOf: Date = new Date(),
): number {
  if (windows.length === 0) return 0;
  if (requested !== undefined && !Number.isNaN(requested)) {
    return Math.min(Math.max(0, requested), windows.length - 1);
  }
  const today = formatDate(asOf);
  const current = windows.findIndex((w) => today >= w.from && today <= w.to);
  return current >= 0 ? current : windows.length - 1;
}

export function windowBounds(
  windows: ProgramWindow[],
  index: number,
): WindowMeta | null {
  if (windows.length === 0) return null;
  const safe = Math.min(Math.max(0, index), windows.length - 1);
  const w = windows[safe];
  return {
    ...w,
    totalWindows: windows.length,
    hasPrev: safe > 0,
    hasNext: safe < windows.length - 1,
  };
}

export function windowRangeIso(window: ProgramWindow): { from: Date; to: Date } {
  const from = new Date(`${window.from}T00:00:00`);
  const to = new Date(`${window.to}T23:59:59.999`);
  return { from, to };
}

export function formatWindowLabel(window: ProgramWindow): string {
  const from = parseDate(window.from);
  const to = parseDate(window.to);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  if (fmt(from) === fmt(to)) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}
