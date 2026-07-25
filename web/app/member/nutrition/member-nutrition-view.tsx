"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ContentBlockBody } from "@/components/content-block-body";
import { AddFoodSheet } from "@/components/member/food-diary/add-food-sheet";
import { MacroProgress } from "@/components/member/food-diary/macro-progress";
import { MealSection } from "@/components/member/food-diary/meal-section";
import { useAuthHeaders, authFetch, authFetchJson } from "@/lib/api/client";
import type { DiaryEntryDto, MealType } from "@/lib/nutrition/types";
import { MEAL_TYPES } from "@/lib/nutrition/types";
import { memberCopy } from "@/lib/copy/member-portal";

type Block = {
  id: string;
  title: string;
  category: string;
  bodyJson: { items?: string[]; categories?: Record<string, string[]>; template?: string };
};

type NutritionPlan = {
  weekNumber: number;
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
  blocks: Block[];
};

type DiaryDay = {
  logDate: string;
  entries: DiaryEntryDto[];
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
    fatMin: number | null;
    fatMax: number | null;
  } | null;
  compliance: { score: number; flags: string[] } | null;
};

export function MemberNutritionView() {
  const getHeaders = useAuthHeaders();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [diary, setDiary] = useState<DiaryDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addMeal, setAddMeal] = useState<MealType | null>(null);

  const load = useCallback(async () => {
    const [plansResult, diaryResult] = await Promise.all([
      authFetchJson<{ nutrition: NutritionPlan | null }>("/api/members/me/plans", {}, getHeaders),
      authFetchJson<DiaryDay>("/api/members/me/food-diary", {}, getHeaders),
    ]);

    if (plansResult.error) {
      setError(plansResult.error);
      return;
    }
    if (diaryResult.error) {
      setError(diaryResult.error);
      return;
    }

    setPlan(plansResult.data?.nutrition ?? null);
    setDiary(diaryResult.data ?? null);
  }, [getHeaders]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function removeEntry(entryId: string) {
    await authFetch(`/api/members/me/food-diary/${entryId}`, { method: "DELETE" }, getHeaders);
    await load();
  }

  if (loading) return <p className="text-white/50">{memberCopy.nutritionLoading}</p>;

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        {error}
      </div>
    );
  }

  const entriesByMeal = MEAL_TYPES.reduce(
    (acc, meal) => {
      acc[meal] = (diary?.entries ?? []).filter((e) => e.mealType === meal);
      return acc;
    },
    {} as Record<MealType, DiaryEntryDto[]>,
  );

  return (
    <div className="space-y-4">
      {plan && (
        <div className="rounded-2xl border border-[var(--brand-diet)]/30 bg-[var(--brand-dark-surface)] p-4">
          <p className="text-xs text-white/40">Week {plan.weekNumber} targets</p>
          <p className="mt-2 text-sm text-white/90">
            Calories {plan.caloriesMin}–{plan.caloriesMax} · Protein {plan.proteinMin}–
            {plan.proteinMax}g · Carbs ≤{plan.carbsMax}g · Fat {plan.fatMin}–{plan.fatMax}g
          </p>
        </div>
      )}

      {diary && (
        <>
          <MacroProgress totals={diary.totals} targets={diary.targets ?? plan} />
          {diary.compliance && diary.compliance.flags.length > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              {diary.compliance.flags.join(" · ")}
            </div>
          )}
        </>
      )}

      {MEAL_TYPES.map((meal) => (
        <MealSection
          key={meal}
          mealType={meal}
          entries={entriesByMeal[meal]}
          onAdd={setAddMeal}
          onRemove={(id) => void removeEntry(id)}
        />
      ))}

      {plan?.blocks?.map((block) => (
        <details key={block.id} className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <summary className="cursor-pointer font-medium">{block.title}</summary>
          <div className="mt-3">
            <ContentBlockBody bodyJson={block.bodyJson} />
          </div>
        </details>
      ))}

      {!plan && (
        <div className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <p className="text-sm text-white/60">{memberCopy.nutritionEmptyPlan}</p>
        </div>
      )}

      <Link
        href="/member/check-in"
        className="tap-target flex w-full items-center justify-center rounded-xl border border-white/15 py-3 text-sm text-white/70"
      >
        Weight & sleep check-in
      </Link>

      {addMeal && diary && (
        <AddFoodSheet
          mealType={addMeal}
          logDate={diary.logDate}
          open={Boolean(addMeal)}
          onClose={() => setAddMeal(null)}
          onAdded={() => void load()}
        />
      )}
    </div>
  );
}
