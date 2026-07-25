"use client";

import type { DiaryEntryDto, MealType } from "@/lib/nutrition/types";
import { MEAL_LABELS } from "@/lib/nutrition/types";

export function MealSection({
  mealType,
  entries,
  onAdd,
  onRemove,
}: {
  mealType: MealType;
  entries: DiaryEntryDto[];
  onAdd: (mealType: MealType) => void;
  onRemove: (entryId: string) => void;
}) {
  const subtotal = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
    }),
    { calories: 0, proteinG: 0 },
  );

  return (
    <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{MEAL_LABELS[mealType]}</h3>
          {entries.length > 0 && (
            <p className="text-xs text-white/40">
              {subtotal.calories} cal · {Math.round(subtotal.proteinG)}g protein
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdd(mealType)}
          className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs font-medium text-[var(--brand-diet)]"
        >
          + Add
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">Nothing logged yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.foodName}</p>
                <p className="text-xs text-white/40">
                  {entry.calories} cal · P {Math.round(entry.proteinG)}g · C{" "}
                  {Math.round(entry.carbsG)}g · F {Math.round(entry.fatG)}g
                  {entry.servingDescription ? ` · ${entry.servingDescription}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                className="shrink-0 text-xs text-white/40 hover:text-red-300"
                aria-label={`Remove ${entry.foodName}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
