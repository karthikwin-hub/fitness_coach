"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentBlockBody } from "@/components/content-block-body";
import { PlanPdfDownloadButton } from "@/components/member/plan-pdf-download-button";
import { useAuthHeaders, authFetch, authFetchJson } from "@/lib/api/client";
import { localWorkoutDateString } from "@/lib/workouts/date";

type ExerciseRow = {
  reps: string;
  sets: number;
  supersetGroup: string | null;
  exercise: { id: string; name: string; youtubeVideoId: string | null };
};

type Block = {
  id: string;
  title: string;
  bodyJson: { items?: string[]; categories?: Record<string, string[]>; template?: string };
};

type Section = { type: string; restNote: string | null; exercises: ExerciseRow[] };
type Day = { dayIndex: number; label: string; sections: Section[] };
type TrainingPlan = {
  weekNumber: number;
  stepGoal: number | null;
  blocks?: Block[];
  days: Day[];
};

function todayDayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function completionKey(exerciseId: string, setNumber: number) {
  return `${exerciseId}:${setNumber}`;
}

export function MemberWorkoutView() {
  const getHeaders = useAuthHeaders();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [selectedEx, setSelectedEx] = useState<ExerciseRow | null>(null);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const workoutDate = localWorkoutDateString();

  useEffect(() => {
    Promise.all([
      authFetchJson<{ training: TrainingPlan | null }>("/api/members/me/plans", {}, getHeaders),
      authFetch(`/api/members/me/workout-sets?date=${workoutDate}`, {}, getHeaders).then((r) =>
        r.json(),
      ),
    ])
      .then(([plansResult, setsResult]) => {
        if (plansResult.error) {
          setError(plansResult.error);
          return;
        }
        setPlan(plansResult.data?.training ?? null);
        const keys = new Set<string>(
          (setsResult.completions ?? []).map(
            (row: { exerciseId: string; setNumber: number }) =>
              completionKey(row.exerciseId, row.setNumber),
          ),
        );
        setCompletedSets(keys);
      })
      .finally(() => setLoading(false));
  }, [getHeaders, workoutDate]);

  const today = useMemo(() => {
    if (!plan?.days) return null;
    const idx = todayDayIndex();
    return plan.days.find((d) => d.dayIndex === idx) ?? plan.days[0];
  }, [plan]);

  const toggleSet = useCallback(
    async (exerciseId: string, setNumber: number, completed: boolean) => {
      const key = completionKey(exerciseId, setNumber);
      setCompletedSets((prev) => {
        const next = new Set(prev);
        if (completed) next.add(key);
        else next.delete(key);
        return next;
      });
      await authFetch(
        "/api/members/me/workout-sets",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId, setNumber, completed, workoutDate }),
        },
        getHeaders,
      );
    },
    [getHeaders, workoutDate],
  );

  if (loading) return <p className="text-white/50">Loading workout…</p>;

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        {error}
      </div>
    );
  }

  if (!plan || !today) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
        <p className="text-sm text-white/60">No published training plan yet.</p>
      </div>
    );
  }

  const allExercises = today.sections.flatMap((s) => s.exercises);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--brand-workout)]/30 bg-[var(--brand-dark-surface)] p-4">
        <div>
          <p className="text-xs text-white/40">Week {plan.weekNumber} · Step goal {plan.stepGoal ?? "—"}</p>
          <h2 className="font-heading text-lg">{today.label}</h2>
        </div>
        <PlanPdfDownloadButton label="PDF" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70" />
      </div>

      {plan.blocks && plan.blocks.length > 0 && (
        <div className="space-y-2">
          {plan.blocks.map((block) => (
            <details
              key={block.id}
              className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
            >
              <summary className="cursor-pointer font-medium">{block.title}</summary>
              <div className="mt-3">
                <ContentBlockBody bodyJson={block.bodyJson} />
              </div>
            </details>
          ))}
        </div>
      )}

      {selectedEx?.exercise.youtubeVideoId && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title={selectedEx.exercise.name}
              src={`https://www.youtube-nocookie.com/embed/${selectedEx.exercise.youtubeVideoId}?rel=0`}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <h3 className="font-heading">{selectedEx.exercise.name}</h3>
            <p className="text-xs text-white/50">
              {selectedEx.sets} sets × {selectedEx.reps}
            </p>
            <ul className="mt-3 space-y-2">
              {Array.from({ length: selectedEx.sets }, (_, i) => {
                const setNumber = i + 1;
                const key = completionKey(selectedEx.exercise.id, setNumber);
                const done = completedSets.has(key);
                return (
                  <li key={setNumber}>
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() =>
                          void toggleSet(selectedEx.exercise.id, setNumber, !done)
                        }
                        className="h-5 w-5 accent-[var(--brand-workout)]"
                      />
                      Set {setNumber}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {today.sections.map((section, si) => (
        <div key={si} className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
          <p className="text-xs uppercase text-[var(--brand-workout)]">{section.type}</p>
          {section.restNote && <p className="text-xs text-white/40">{section.restNote}</p>}
          <ul className="mt-2 space-y-2">
            {section.exercises.map((ex, ei) => (
              <li key={ei}>
                <button
                  type="button"
                  onClick={() => setSelectedEx(ex)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedEx === ex
                      ? "border-[var(--brand-workout)] bg-[var(--brand-workout)]/10"
                      : "border-white/10"
                  }`}
                >
                  {ex.supersetGroup && <span className="text-white/40">{ex.supersetGroup} </span>}
                  {ex.exercise.name} — {ex.sets}×{ex.reps}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {allExercises.length === 0 && (
        <p className="text-sm text-white/50">Rest day — recovery and steps.</p>
      )}
    </div>
  );
}
