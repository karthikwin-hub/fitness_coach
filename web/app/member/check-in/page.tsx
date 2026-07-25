"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { uploadMealPhoto } from "@/lib/firebase/storage-upload";
import type { MealType } from "@/lib/nutrition/types";

type MealAnalysis = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  summary: string;
};

type SubmitResult = {
  status: string;
  aiConfidence?: number;
  mealPhotoUrl?: string;
  aiAnalysis?: MealAnalysis;
};

export default function CheckInPage() {
  const { firebaseUser } = useAuth();
  const getHeaders = useAuthHeaders();
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(4);
  const [weight, setWeight] = useState("");
  const [sleep, setSleep] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [diaryMeal, setDiaryMeal] = useState<MealType>("lunch");
  const [addingToDiary, setAddingToDiary] = useState(false);
  const [addedToDiary, setAddedToDiary] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let mealPhotoUrl: string | undefined;
    if (photoFile) {
      const storageId = firebaseUser?.uid ?? "member";
      mealPhotoUrl = (await uploadMealPhoto(photoFile, storageId)) ?? undefined;
    }

    const res = await authFetch("/api/check-ins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mealPhotoUrl,
        weightKg: weight ? Number(weight) : undefined,
        sleepHours: sleep ? Number(sleep) : undefined,
        energy,
        soreness,
      }),
    }, getHeaders);

    const data = await res.json();
    setSubmitted({
      status: data.status,
      aiConfidence: data.aiConfidence,
      mealPhotoUrl: data.mealPhotoUrl,
      aiAnalysis: data.aiAnalysisJson ?? undefined,
    });
    setSubmitting(false);
  }

  async function addMealToDiary() {
    if (!submitted?.aiAnalysis) return;
    setAddingToDiary(true);
    await authFetch(
      "/api/members/me/food-diary",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: diaryMeal,
          source: "photo_ai",
          foodName: submitted.aiAnalysis.summary || "Meal (check-in photo)",
          calories: submitted.aiAnalysis.calories,
          proteinG: submitted.aiAnalysis.proteinG,
          carbsG: submitted.aiAnalysis.carbsG,
          fatG: submitted.aiAnalysis.fatG,
          photoUrl: submitted.mealPhotoUrl,
        }),
      },
      getHeaders,
    );
    setAddingToDiary(false);
    setAddedToDiary(true);
  }

  if (submitted) {
    return (
      <div className="space-y-6 py-12 text-center">
        <div>
          <p className="font-heading text-xl text-[var(--brand-diet)]">
            {submitted.status === "approved" ? "Auto-approved" : "Sent to Coach Helna"}
          </p>
          <p className="mt-2 text-sm text-white/60">
            Status: {submitted.status}
            {submitted.aiConfidence != null &&
              ` · AI confidence ${Math.round(submitted.aiConfidence * 100)}%`}
          </p>
        </div>

        {submitted.aiAnalysis && !addedToDiary && (
          <div className="mx-auto max-w-sm rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-left">
            <p className="text-sm font-medium">Add meal to today&apos;s diary?</p>
            <p className="mt-1 text-xs text-white/50">{submitted.aiAnalysis.summary}</p>
            <p className="mt-2 text-xs text-white/60">
              {submitted.aiAnalysis.calories} cal · P {submitted.aiAnalysis.proteinG}g · C{" "}
              {submitted.aiAnalysis.carbsG}g · F {submitted.aiAnalysis.fatG}g
            </p>
            <label className="mt-3 block text-xs text-white/50">
              Meal
              <select
                value={diaryMeal}
                onChange={(e) => setDiaryMeal(e.target.value as MealType)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </label>
            <button
              type="button"
              disabled={addingToDiary}
              onClick={() => void addMealToDiary()}
              className="mt-3 w-full rounded-xl bg-[var(--brand-diet)] py-2.5 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {addingToDiary ? "Adding…" : "Add to food diary"}
            </button>
          </div>
        )}

        {addedToDiary && (
          <p className="text-sm text-[var(--brand-diet)]">Added to today&apos;s food diary.</p>
        )}

        <Link href="/member/nutrition" className="text-sm text-white/50 underline-offset-2 hover:underline">
          View nutrition diary
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <header>
        <h1 className="font-heading text-2xl">Check-in</h1>
        <p className="mt-1 text-sm text-white/60">Daily weight, sleep, meal photo</p>
      </header>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--brand-diet)]/50 bg-[var(--brand-dark-surface)] px-4 py-10">
        <Camera className="h-10 w-10 text-[var(--brand-diet)]" />
        <span className="mt-3 font-medium">
          {photoFile ? photoFile.name : "Tap to snap meal photo"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div>
        <label className="text-sm text-white/70">Weight (kg)</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-3"
          placeholder="72.5"
        />
      </div>

      <div>
        <label className="text-sm text-white/70">Sleep (hours)</label>
        <input
          type="number"
          step="0.5"
          value={sleep}
          onChange={(e) => setSleep(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/15 bg-[var(--brand-dark-surface)] px-4 py-3"
          placeholder="7.5"
        />
      </div>

      <div>
        <label className="text-sm text-white/70">Energy ({energy}/10)</label>
        <input
          type="range"
          min={1}
          max={10}
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--brand-diet)]"
        />
      </div>

      <div>
        <label className="text-sm text-white/70">Soreness ({soreness}/10)</label>
        <input
          type="range"
          min={1}
          max={10}
          value={soreness}
          onChange={(e) => setSoreness(Number(e.target.value))}
          className="mt-2 w-full accent-[var(--brand-workout)]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="tap-target fixed bottom-20 inset-x-4 mx-auto max-w-lg rounded-xl bg-[var(--brand-diet)] py-4 font-semibold text-[var(--brand-dark)] disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send to Coach Helna"}
      </button>
    </form>
  );
}
