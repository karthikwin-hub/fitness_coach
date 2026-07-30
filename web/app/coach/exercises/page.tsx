"use client";

import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type ExerciseCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

type Exercise = {
  id: string;
  name: string;
  youtubeVideoId: string | null;
  muscleGroup: string | null;
  defaultReps: string | null;
  defaultSets: number | null;
  categoryId: string | null;
  videoSource: "owned" | "third_party";
};

type CategorySection = {
  id: string;
  name: string;
  exercises: Exercise[];
};

const UNCategorized_ID = "__uncategorized__";

const SOURCE_LABEL: Record<Exercise["videoSource"], string> = {
  owned: "Coach",
  third_party: "Third party",
};

function sortExercises(rows: Exercise[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export default function ExercisesPage() {
  const getHeaders = useAuthHeaders();
  const [items, setItems] = useState<Exercise[]>([]);
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [videoSource, setVideoSource] = useState<Exercise["videoSource"]>("third_party");
  const [editName, setEditName] = useState("");
  const [editYoutubeVideoId, setEditYoutubeVideoId] = useState("");
  const [editMuscleGroup, setEditMuscleGroup] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editVideoSource, setEditVideoSource] = useState<Exercise["videoSource"]>("third_party");
  const [editDefaultReps, setEditDefaultReps] = useState("");
  const [editDefaultSets, setEditDefaultSets] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [exercises, cats] = await Promise.all([
      authFetch("/api/exercises", {}, getHeaders).then((r) => r.json()),
      authFetch("/api/exercise-categories", {}, getHeaders).then((r) => r.json()),
    ]);
    setItems(exercises);
    setCategories(cats);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categorySections = useMemo(() => {
    const byCategory = new Map<string, Exercise[]>();
    for (const ex of items) {
      const key = ex.categoryId ?? UNCategorized_ID;
      const list = byCategory.get(key) ?? [];
      list.push(ex);
      byCategory.set(key, list);
    }

    const sections: CategorySection[] = [];
    const sortedCategories = [...categories].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );

    for (const cat of sortedCategories) {
      const exercises = byCategory.get(cat.id);
      if (!exercises?.length) continue;
      sections.push({
        id: cat.id,
        name: cat.name,
        exercises: sortExercises(exercises),
      });
      byCategory.delete(cat.id);
    }

    const uncategorized = byCategory.get(UNCategorized_ID);
    if (uncategorized?.length) {
      sections.push({
        id: UNCategorized_ID,
        name: "Uncategorized",
        exercises: sortExercises(uncategorized),
      });
      byCategory.delete(UNCategorized_ID);
    }

    for (const [id, exercises] of byCategory) {
      if (!exercises.length) continue;
      const cat = categories.find((c) => c.id === id);
      sections.push({
        id,
        name: cat?.name ?? "Unknown category",
        exercises: sortExercises(exercises),
      });
    }

    return sections;
  }, [items, categories]);

  function toggleCategory(sectionId: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  function expandAllCategories() {
    setExpandedCategories(new Set(categorySections.map((s) => s.id)));
  }

  function collapseAllCategories() {
    setExpandedCategories(new Set());
    setExpandedId(null);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await authFetch(
      "/api/exercises",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          youtubeVideoId,
          muscleGroup,
          categoryId: categoryId || null,
          videoSource,
        }),
      },
      getHeaders,
    );
    setName("");
    setYoutubeVideoId("");
    setMuscleGroup("");
    setCategoryId("");
    setVideoSource("third_party");
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
    setEditCategoryId(ex.categoryId ?? "");
    setEditVideoSource(ex.videoSource);
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
          categoryId: editCategoryId || null,
          videoSource: editVideoSource,
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
            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={videoSource}
                onChange={(e) => setVideoSource(e.target.value as Exercise["videoSource"])}
                className="rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              >
                <option value="third_party">Third party video</option>
                <option value="owned">Coach-owned video</option>
              </select>
            </div>
            <input
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              placeholder="Muscle group (legacy label)"
              className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Add exercise
            </button>
          </form>

          {categorySections.length > 0 && (
            <div className="flex items-center justify-end gap-3 text-xs text-white/40">
              <button type="button" onClick={expandAllCategories} className="hover:text-white/70">
                Expand all
              </button>
              <span aria-hidden>·</span>
              <button type="button" onClick={collapseAllCategories} className="hover:text-white/70">
                Collapse all
              </button>
            </div>
          )}

          <div className="space-y-3">
            {categorySections.map((section) => {
              const open = expandedCategories.has(section.id);
              const ownedCount = section.exercises.filter((e) => e.videoSource === "owned").length;
              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(section.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5"
                  >
                    <div>
                      <p className="font-medium">{section.name}</p>
                      <p className="text-xs text-white/40">
                        {section.exercises.length} exercise{section.exercises.length === 1 ? "" : "s"}
                        {ownedCount > 0
                          ? ` · ${ownedCount} coach-owned`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-white/30">{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <ul className="space-y-2 border-t border-white/10 p-3">
                      {section.exercises.map((ex) => (
                        <li
                          key={ex.id}
                          className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => openExercise(ex)}
                            className="w-full text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{ex.name}</p>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  ex.videoSource === "owned"
                                    ? "bg-[var(--brand-workout)]/25 text-[var(--brand-workout)]"
                                    : "bg-white/10 text-white/50"
                                }`}
                              >
                                {SOURCE_LABEL[ex.videoSource]}
                              </span>
                              <span className="ml-auto text-xs text-white/30">
                                {expandedId === ex.id ? "▲" : "▼"}
                              </span>
                            </div>
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
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={editCategoryId}
                                  onChange={(e) => setEditCategoryId(e.target.value)}
                                  className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                                >
                                  <option value="">Uncategorized</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={editVideoSource}
                                  onChange={(e) =>
                                    setEditVideoSource(e.target.value as Exercise["videoSource"])
                                  }
                                  className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
                                >
                                  <option value="third_party">Third party video</option>
                                  <option value="owned">Coach-owned video</option>
                                </select>
                              </div>
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
                  )}
                </section>
              );
            })}
          </div>

          {categorySections.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm text-white/50">
              No exercises yet. Add one above or import a catalog workbook.
            </p>
          )}
        </div>
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
