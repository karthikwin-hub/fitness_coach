"use client";

import { useEffect, useState } from "react";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { coachCopy } from "@/lib/copy/coach-portal";

type Recipe = {
  name: string;
  proteinG: number;
  calories: number;
  tags: string[];
  note?: string;
};

export function RecipeSwapDrawer({
  open,
  onClose,
  memberName,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  memberName: string;
  onSelect: (recipe: Recipe) => void;
}) {
  const getHeaders = useAuthHeaders();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tag, setTag] = useState<string>("all");

  useEffect(() => {
    if (!open) return;
    authFetch("/api/coach/recipes", {}, getHeaders)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRecipes)
      .catch(() => setRecipes([]));
  }, [open, getHeaders]);

  if (!open) return null;

  const tags = ["all", ...new Set(recipes.flatMap((r) => r.tags))];
  const filtered =
    tag === "all" ? recipes : recipes.filter((r) => r.tags.includes(tag));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[var(--brand-dark-surface)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg">{coachCopy.recipeDrawerTitle}</h2>
            <p className="mt-1 text-xs text-white/50">
              {coachCopy.recipeDrawerHint} — {memberName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                tag === t
                  ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                  : "border border-white/15 text-white/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {filtered.map((recipe) => (
            <li key={recipe.name}>
              <button
                type="button"
                onClick={() => onSelect(recipe)}
                className="w-full rounded-xl border border-white/10 p-3 text-left hover:border-[var(--brand-diet)]/50"
              >
                <p className="font-medium">{recipe.name}</p>
                <p className="mt-1 text-xs text-white/50">
                  {recipe.proteinG}g protein · {recipe.calories} cal
                </p>
                {recipe.note && (
                  <p className="mt-1 text-xs text-white/40">{recipe.note}</p>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-white/40">No recipes match this filter.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
