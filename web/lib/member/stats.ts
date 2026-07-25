import type { CheckIn } from "@/lib/db/schema";

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function computeStreakDays(checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return 0;

  const dates = new Set(
    checkIns.map((c) => dateKey(new Date(c.createdAt))),
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (dates.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeWeeklyCompliance(checkIns: CheckIn[]): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dates = new Set(
    checkIns.map((c) => dateKey(new Date(c.createdAt))),
  );

  let daysWithCheckIn = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (dates.has(dateKey(d))) daysWithCheckIn++;
  }

  return Math.round((daysWithCheckIn / 7) * 100);
}

export function todayDayIndex() {
  return (new Date().getDay() + 6) % 7;
}
