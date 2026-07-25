"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Search } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders, authFetch, authFetchJson } from "@/lib/api/client";
import { uploadMealPhoto } from "@/lib/firebase/storage-upload";
import type { FoodSearchResult, MealType } from "@/lib/nutrition/types";
import { MEAL_LABELS } from "@/lib/nutrition/types";

type Tab = "search" | "manual" | "photo";

export function AddFoodSheet({
  mealType,
  logDate,
  open,
  onClose,
  onAdded,
}: {
  mealType: MealType;
  logDate: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { firebaseUser } = useAuth();
  const getHeaders = useAuthHeaders();
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [manual, setManual] = useState({
    foodName: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });

  useEffect(() => {
    if (!open) return;
    setTab("search");
    setQuery("");
    setResults([]);
    setBarcode("");
    setPhotoFile(null);
    setManual({ foodName: "", calories: "", proteinG: "", carbsG: "", fatG: "" });
  }, [open, mealType]);

  const runSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await authFetchJson<{ results: FoodSearchResult[] }>(
      `/api/foods/search?q=${encodeURIComponent(query.trim())}`,
      {},
      getHeaders,
    );
    setResults(data?.results ?? []);
    setSearching(false);
  }, [query, getHeaders]);

  useEffect(() => {
    if (tab !== "search" || query.trim().length < 2) return;
    const t = setTimeout(() => void runSearch(), 300);
    return () => clearTimeout(t);
  }, [query, tab, runSearch]);

  async function logFood(payload: Record<string, unknown>) {
    setSaving(true);
    await authFetch(
      "/api/members/me/food-diary",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mealType, logDate }),
      },
      getHeaders,
    );
    setSaving(false);
    onAdded();
    onClose();
  }

  async function addSearchResult(item: FoodSearchResult) {
    await logFood({
      source: "search",
      foodName: item.foodName,
      externalFoodId: item.externalFoodId,
      externalProvider: item.externalProvider,
      servingDescription: item.servingDescription,
      quantity: 1,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
    });
  }

  async function addManual() {
    if (!manual.foodName.trim()) return;
    await logFood({
      source: "manual",
      foodName: manual.foodName.trim(),
      calories: Number(manual.calories) || 0,
      proteinG: Number(manual.proteinG) || 0,
      carbsG: Number(manual.carbsG) || 0,
      fatG: Number(manual.fatG) || 0,
    });
  }

  async function addFromBarcode() {
    if (!barcode.trim()) return;
    setSaving(true);
    const res = await authFetch(
      `/api/foods/barcode?upc=${encodeURIComponent(barcode.trim())}`,
      {},
      getHeaders,
    );
    const item = (await res.json()) as FoodSearchResult;
    setSaving(false);
    if (res.ok) await addSearchResult(item);
  }

  async function addFromPhoto() {
    if (!photoFile) return;
    setSaving(true);
    const storageId = firebaseUser?.uid ?? "member";
    const photoUrl = (await uploadMealPhoto(photoFile, storageId)) ?? undefined;

    const analyzeRes = await authFetch(
      "/api/members/me/analyze-meal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPhotoUrl: photoUrl }),
      },
      getHeaders,
    );

    if (!analyzeRes.ok) {
      setSaving(false);
      return;
    }

    const analysis = (await analyzeRes.json()) as {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      summary: string;
    };

    await logFood({
      source: "photo_ai",
      foodName: analysis.summary || "Meal (photo)",
      calories: analysis.calories,
      proteinG: analysis.proteinG,
      carbsG: analysis.carbsG,
      fatG: analysis.fatG,
      photoUrl,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[var(--brand-dark)] p-4 shadow-xl"
        role="dialog"
        aria-labelledby="add-food-title"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="add-food-title" className="font-heading text-lg">
            Add to {MEAL_LABELS[mealType]}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-white/50">
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {(
            [
              ["search", "Search", Search],
              ["manual", "Manual", null],
              ["photo", "Photo", Camera],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium ${
                tab === id
                  ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                  : "border border-white/15 text-white/70"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {tab === "search" && (
          <div className="mt-4 space-y-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods…"
              className="w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Barcode (UPC)"
                className="flex-1 rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-2 text-sm"
              />
              <button
                type="button"
                disabled={saving || !barcode.trim()}
                onClick={() => void addFromBarcode()}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs disabled:opacity-50"
              >
                Scan
              </button>
            </div>
            {searching && <p className="text-sm text-white/50">Searching…</p>}
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={`${item.externalProvider}-${item.externalFoodId}`}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void addSearchResult(item)}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm hover:border-[var(--brand-diet)]/40 disabled:opacity-50"
                  >
                    <span className="font-medium">{item.foodName}</span>
                    <span className="mt-0.5 block text-xs text-white/40">
                      {item.calories} cal · {item.servingDescription}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "manual" && (
          <div className="mt-4 space-y-3">
            <input
              value={manual.foodName}
              onChange={(e) => setManual((m) => ({ ...m, foodName: e.target.value }))}
              placeholder="Food name"
              className="w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["calories", "proteinG", "carbsG", "fatG"] as const).map((key) => (
                <input
                  key={key}
                  type="number"
                  value={manual[key]}
                  onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))}
                  placeholder={key === "calories" ? "Calories" : key.replace("G", " (g)")}
                  className="rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
                />
              ))}
            </div>
            <button
              type="button"
              disabled={saving || !manual.foodName.trim()}
              onClick={() => void addManual()}
              className="w-full rounded-xl bg-[var(--brand-diet)] py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add food"}
            </button>
          </div>
        )}

        {tab === "photo" && (
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--brand-diet)]/40 px-4 py-8">
              <Camera className="h-8 w-8 text-[var(--brand-diet)]" />
              <span className="mt-2 text-sm">
                {photoFile ? photoFile.name : "Tap to add meal photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              disabled={saving || !photoFile}
              onClick={() => void addFromPhoto()}
              className="w-full rounded-xl bg-[var(--brand-diet)] py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Analyzing…" : "Analyze & log meal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
