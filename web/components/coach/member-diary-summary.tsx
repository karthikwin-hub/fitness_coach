"use client";

import { useEffect, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";

type DiarySummary = {
  logDate: string;
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  targets: {
    caloriesMin: number | null;
    caloriesMax: number | null;
    proteinMin: number | null;
    proteinMax: number | null;
    carbsMax: number | null;
  } | null;
  compliance: { score: number; flags: string[] } | null;
  entries: Array<{ id: string; mealType: string; foodName: string; calories: number }>;
};

export function MemberDiarySummary({ memberId }: { memberId: string }) {
  const getHeaders = useAuthHeaders();
  const [diary, setDiary] = useState<DiarySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetchJson<DiarySummary>(`/api/members/${memberId}/food-diary`, {}, getHeaders)
      .then(({ data }) => setDiary(data ?? null))
      .finally(() => setLoading(false));
  }, [memberId, getHeaders]);

  if (loading) {
    return <p className="text-sm text-white/50">Loading food diary…</p>;
  }

  if (!diary) {
    return <p className="text-sm text-white/50">No diary data for today.</p>;
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <h3 className="font-heading text-sm text-[var(--brand-diet)]">Today&apos;s food diary</h3>
      <p className="mt-2 text-sm text-white/80">
        {Math.round(diary.totals.calories)} cal · {Math.round(diary.totals.proteinG)}g protein ·{" "}
        {Math.round(diary.totals.carbsG)}g carbs · {Math.round(diary.totals.fatG)}g fat
      </p>
      {diary.targets && (
        <p className="mt-1 text-xs text-white/40">
          Targets: {diary.targets.caloriesMin}–{diary.targets.caloriesMax} cal · protein{" "}
          {diary.targets.proteinMin}–{diary.targets.proteinMax}g · carbs ≤{diary.targets.carbsMax}g
        </p>
      )}
      {diary.compliance && diary.compliance.flags.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
          {diary.compliance.flags.map((flag) => (
            <li key={flag}>• {flag}</li>
          ))}
        </ul>
      )}
      {diary.entries.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-white/60">
          {diary.entries.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              {entry.mealType}: {entry.foodName} ({entry.calories} cal)
            </li>
          ))}
          {diary.entries.length > 8 && (
            <li className="text-white/40">+{diary.entries.length - 8} more items</li>
          )}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-white/40">Nothing logged yet today.</p>
      )}
    </section>
  );
}
