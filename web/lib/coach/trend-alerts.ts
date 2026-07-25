export type TrendAlert = {
  code: "sleep_decline" | "protein_low" | "missed_checkins";
  message: string;
};

export type CheckInTrendPoint = {
  date: string;
  weightKg: number | null;
  sleepHours: number | null;
};

export type MemberTrendSnapshot = {
  memberId: string;
  alerts: TrendAlert[];
  history: CheckInTrendPoint[];
  proteinLowDays: number;
};

type CheckInLike = {
  createdAt: string | Date;
  weightKg: number | null;
  sleepHours: number | null;
};

type DiaryDayLike = {
  logDate: string;
  proteinG: number;
};

function toDateKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function buildCheckInHistory(
  checkIns: CheckInLike[],
  days = 7,
): CheckInTrendPoint[] {
  const byDay = new Map<string, CheckInLike>();
  for (const c of checkIns) {
    const key = toDateKey(c.createdAt);
    if (!byDay.has(key)) byDay.set(key, c);
  }
  return lastNDays(days).map((date) => {
    const row = byDay.get(date);
    return {
      date,
      weightKg: row?.weightKg ?? null,
      sleepHours: row?.sleepHours ?? null,
    };
  });
}

export function computeTrendAlerts(input: {
  checkIns: CheckInLike[];
  proteinMin?: number | null;
  diaryDays?: DiaryDayLike[];
}): TrendAlert[] {
  const alerts: TrendAlert[] = [];
  const history = buildCheckInHistory(input.checkIns, 7);
  const sleepValues = history.map((h) => h.sleepHours).filter((v): v is number => v != null);

  if (sleepValues.length >= 3) {
    const recent = sleepValues.slice(-3);
    const prior = sleepValues.slice(-6, -3);
    if (prior.length >= 2) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
      if (priorAvg - recentAvg >= 1) {
        alerts.push({
          code: "sleep_decline",
          message: "Sleep trending down over 3 days",
        });
      }
    }
  }

  const dayKeys = lastNDays(7);
  const checkInDays = new Set(input.checkIns.map((c) => toDateKey(c.createdAt)));
  const missed = dayKeys.filter((d) => !checkInDays.has(d)).length;
  if (missed >= 3) {
    alerts.push({
      code: "missed_checkins",
      message: `No check-in ${missed} of last 7 days`,
    });
  }

  const proteinMin = input.proteinMin ?? 60;
  if (input.diaryDays && input.diaryDays.length > 0) {
    const proteinByDay = new Map<string, number>();
    for (const row of input.diaryDays) {
      proteinByDay.set(row.logDate, (proteinByDay.get(row.logDate) ?? 0) + row.proteinG);
    }
    let lowDays = 0;
    for (const day of dayKeys) {
      const total = proteinByDay.get(day) ?? 0;
      if (total > 0 && total < proteinMin * 0.85) lowDays++;
    }
    if (lowDays >= 4) {
      alerts.push({
        code: "protein_low",
        message: `Protein below target ${lowDays}/7 days`,
      });
    }
  }

  return alerts;
}

export function buildMemberTrendSnapshot(
  memberId: string,
  checkIns: CheckInLike[],
  options?: {
    proteinMin?: number | null;
    diaryDays?: DiaryDayLike[];
  },
): MemberTrendSnapshot {
  const history = buildCheckInHistory(checkIns, 7);
  const alerts = computeTrendAlerts({
    checkIns,
    proteinMin: options?.proteinMin,
    diaryDays: options?.diaryDays,
  });
  const proteinMin = options?.proteinMin ?? 60;
  let proteinLowDays = 0;
  if (options?.diaryDays) {
    const proteinByDay = new Map<string, number>();
    for (const row of options.diaryDays) {
      proteinByDay.set(row.logDate, (proteinByDay.get(row.logDate) ?? 0) + row.proteinG);
    }
    for (const day of lastNDays(7)) {
      const total = proteinByDay.get(day) ?? 0;
      if (total > 0 && total < proteinMin * 0.85) proteinLowDays++;
    }
  }
  return { memberId, alerts, history, proteinLowDays };
}
