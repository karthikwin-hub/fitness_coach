"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type Exercise = {
  id: string;
  name: string;
  youtubeVideoId: string | null;
  muscleGroup: string | null;
  defaultReps: string | null;
  defaultSets: number | null;
};

export default function ExercisesPage() {
  const getHeaders = useAuthHeaders();
  const [items, setItems] = useState<Exercise[]>([]);
  const [name, setName] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editYoutubeVideoId, setEditYoutubeVideoId] = useState("");
  const [editMuscleGroup, setEditMuscleGroup] = useState("");
  const [editDefaultReps, setEditDefaultReps] = useState("");
  const [editDefaultSets, setEditDefaultSets] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setItems(await authFetch("/api/exercises", {}, getHeaders).then((r) => r.json()));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await authFetch(
      "/api/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, youtubeVideoId, muscleGroup }),
      },
      getHeaders,
    );
    setName("");
    setYoutubeVideoId("");
    setMuscleGroup("");
    setMessage("Exercise added.");
    load();
  }

  function openExercise(ex: Exercise) {
    if (expandedId === ex.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ex.id);
    setEditName(ex.name);
    setEditYoutubeVideoId(ex.youtubeVideoId ?? "");
    setEditMuscleGroup(ex.muscleGroup ?? "");
    setEditDefaultReps(ex.defaultReps ?? "");
    setEditDefaultSets(ex.defaultSets != null ? String(ex.defaultSets) : "");
  }

  async function saveExercise(id: string) {
    await authFetch(
      `/api/exercises/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          youtubeVideoId: editYoutubeVideoId || null,
          muscleGroup: editMuscleGroup || null,
          defaultReps: editDefaultReps || null,
          defaultSets: editDefaultSets ? Number(editDefaultSets) : null,
        }),
      },
      getHeaders,
    );
    setMessage("Exercise updated.");
    setExpandedId(null);
    load();
  }

  async function deleteExercise(id: string) {
    if (!confirm("Delete this exercise? It will be removed from the catalog.")) return;
    await authFetch(`/api/exercises/${id}`, { method: "DELETE" }, getHeaders);
    setMessage("Exercise deleted.");
    setExpandedId(null);
    load();
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Exercise catalog"
        title="Exercise catalog"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {message && (
            <p className="rounded-lg bg-[var(--brand-workout)]/20 px-3 py-2 text-sm">{message}</p>
          )}
          <form onSubmit={create} className="space-y-3 rounded-xl border border-white/10 p-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exercise name"
              required
              className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
            />
            <input
              value={youtubeVideoId}
              onChange={(e) => setYoutubeVideoId(e.target.value)}
              placeholder="YouTube URL or video ID"
              className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
            />
            <input
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              placeholder="Muscle group"
              className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Add exercise
            </button>
          </form>
          <ul className="space-y-2">
            {items.map((ex) => (
              <li
                key={ex.id}
                className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm"
              >
                <button type="button" onClick={() => openExercise(ex)} className="w-full text-left">
                  <p className="font-medium">{ex.name}</p>
                  <p className="text-xs text-white/40">
                    {ex.muscleGroup ?? "—"} · {ex.defaultSets ?? 3}×{ex.defaultReps ?? "—"} ·{" "}
                    {ex.youtubeVideoId ?? "no video"}
                  </p>
                </button>
                {expandedId === ex.id && (
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    />
                    <input
                      value={editYoutubeVideoId}
                      onChange={(e) => setEditYoutubeVideoId(e.target.value)}
                      placeholder="YouTube URL or video ID"
                      className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    />
                    <input
                      value={editMuscleGroup}
                      onChange={(e) => setEditMuscleGroup(e.target.value)}
                      placeholder="Muscle group"
                      className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editDefaultSets}
                        onChange={(e) => setEditDefaultSets(e.target.value)}
                        placeholder="Default sets"
                        type="number"
                        className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                      />
                      <input
                        value={editDefaultReps}
                        onChange={(e) => setEditDefaultReps(e.target.value)}
                        placeholder="Default reps"
                        className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveExercise(ex.id)}
                        className="rounded-lg bg-[var(--brand-workout)] px-3 py-2 text-xs font-semibold text-[var(--brand-dark)]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteExercise(ex.id)}
                        className="rounded-lg border border-red-400/40 px-3 py-2 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
