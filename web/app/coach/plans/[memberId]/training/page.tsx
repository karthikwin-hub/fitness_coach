"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachClientPlanHeader } from "@/components/coach/coach-client-plan-header";
import { usePilotTimer } from "@/components/coach/use-pilot-timer";
import { DragReorderList } from "@/components/coach/drag-reorder-list";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { isWorkoutGuidelineCategory } from "@/lib/plans/content-blocks";

type Exercise = { id: string; name: string };
type ContentBlock = { id: string; title: string; category: string };
type ExerciseRow = {
  id?: string;
  exerciseId: string;
  supersetGroup: string | null;
  reps: string;
  sets: number;
  exercise?: { name: string; id: string };
};
type Section = {
  id?: string;
  type: string;
  restNote: string | null;
  exercises: ExerciseRow[];
};
type Day = { id?: string; dayIndex: number; label: string; sections: Section[] };
type TrainingPlan = {
  id: string;
  weekNumber: number;
  stepGoal: number | null;
  status: string;
  blockIdsJson: string[];
  days: Day[];
};
type PlanTemplateOption = {
  id: string;
  key: string;
  name: string;
  hasTraining: boolean;
  type: string;
};
type MemberOption = { id: string; displayName: string };

const SECTION_TYPES = ["warmup", "resistance", "core", "cardio", "stretch"];
const SUPERSET_OPTIONS = ["", "1A", "1B", "1C", "1D", "1E", "1F"];

export default function TrainingBuilderPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const getHeaders = useAuthHeaders();
  const timer = usePilotTimer(memberId);
  const [plans, setPlans] = useState<Array<{ id: string; weekNumber: number; status: string }>>([]);
  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [guidelineBlocks, setGuidelineBlocks] = useState<ContentBlock[]>([]);
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [stepGoal, setStepGoal] = useState(10000);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<PlanTemplateOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [copySourceMemberId, setCopySourceMemberId] = useState("");
  const [copySourcePlans, setCopySourcePlans] = useState<
    Array<{ id: string; weekNumber: number }>
  >([]);
  const [copySourcePlanId, setCopySourcePlanId] = useState("");

  async function loadPlan(planId: string) {
    const detail = await authFetch(`/api/training-plans/${planId}`, {}, getHeaders).then((r) => r.json());
    setActivePlan({
      ...detail,
      blockIdsJson: detail.blockIdsJson ?? [],
    });
    setStepGoal(detail.stepGoal ?? 10000);
  }

  async function loadPlans() {
    const list = await authFetch(`/api/training-plans?memberId=${memberId}`, {}, getHeaders).then((r) => r.json());
    setPlans(list);
    if (list[0] && !activePlan) await loadPlan(list[0].id);
  }

  useEffect(() => {
    authFetch("/api/exercises", {}, getHeaders).then((r) => r.json()).then(setCatalog);
    authFetch("/api/content-blocks", {}, getHeaders)
      .then((r) => r.json())
      .then((all: ContentBlock[]) =>
        setGuidelineBlocks(all.filter((b) => isWorkoutGuidelineCategory(b.category))),
      );
    authFetch("/api/plan-templates", {}, getHeaders)
      .then((r) => r.json())
      .then((rows: PlanTemplateOption[]) =>
        setTemplates(rows.filter((t) => t.hasTraining)),
      );
    authFetch("/api/members", {}, getHeaders)
      .then((r) => r.json())
      .then((rows: MemberOption[]) =>
        setMembers(rows.filter((m) => m.id !== memberId)),
      );
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  function toSavePayload(plan: TrainingPlan) {
    return {
      stepGoal,
      days: plan.days.map((day) => ({
        dayIndex: day.dayIndex,
        label: day.label,
        sections: day.sections.map((section, si) => ({
          type: section.type,
          restNote: section.restNote ?? undefined,
          sortOrder: si,
          exercises: section.exercises.map((ex, ei) => ({
            exerciseId: ex.exerciseId,
            supersetGroup: ex.supersetGroup || undefined,
            reps: ex.reps,
            sets: ex.sets,
            sortOrder: ei,
          })),
        })),
      })),
    };
  }

  async function saveStructure(silent = false) {
    if (!activePlan) return false;
    setSaving(true);
    await authFetch(`/api/training-plans/${activePlan.id}/structure`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSavePayload(activePlan)),
    }, getHeaders);
    await authFetch(`/api/training-plans/${activePlan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepGoal,
        blockIdsJson: activePlan.blockIdsJson ?? [],
      }),
    }, getHeaders);
    await loadPlan(activePlan.id);
    setSaving(false);
    if (!silent) setMessage("Plan saved.");
    return true;
  }

  async function publish() {
    if (!activePlan) return;
    setSaving(true);
    await saveStructure(true);
    const duration = timer.running ? timer.stop() : timer.elapsed;
    const res = await authFetch(`/api/training-plans/${activePlan.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assemblyDurationSeconds: duration || undefined }),
    }, getHeaders);
    const data = await res.json();
    setSaving(false);
    setMessage(
      data.underTarget
        ? `Saved and published in ${timer.format(duration)} — under 5 min target!`
        : `Saved and published (revision ${data.revisionNumber}).`,
    );
    loadPlans();
  }

  async function cloneWeek() {
    if (!activePlan) return;
    timer.start();
    const res = await authFetch(`/api/training-plans/${activePlan.id}/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekNumber: activePlan.weekNumber + 1 }),
    }, getHeaders);
    const newPlan = await res.json();
    await loadPlan(newPlan.id);
    setMessage(`Cloned to week ${newPlan.weekNumber}. Timer started.`);
    loadPlans();
  }

  async function createFromTemplate(template: string) {
    timer.start();
    const res = await authFetch("/api/training-plans/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        template,
        weekNumber: (plans[0]?.weekNumber ?? 0) + 1,
      }),
    }, getHeaders);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Template apply failed.");
      return;
    }
    const newPlan = await res.json();
    await loadPlan(newPlan.id);
    setMessage(`Created from template. Timer started.`);
    loadPlans();
  }

  async function saveAsTemplate() {
    if (!activePlan) return;
    const name = window.prompt("Template name");
    if (!name?.trim()) return;
    const res = await authFetch("/api/plan-templates/from-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        trainingPlanId: activePlan.id,
        weekNumber: activePlan.weekNumber,
        name: name.trim(),
      }),
    }, getHeaders);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save as template failed.");
      return;
    }
    setMessage(`Saved template "${data.name}".`);
  }

  async function applySelectedTemplate() {
    if (!selectedTemplateId) return;
    timer.start();
    const template = templates.find((t) => t.id === selectedTemplateId);
    const res = await authFetch(
      template?.type === "plan_bundle"
        ? `/api/plan-templates/${selectedTemplateId}/apply`
        : "/api/training-plans/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          templateId: selectedTemplateId,
          template: template?.key ?? selectedTemplateId,
          weekNumber: (plans[0]?.weekNumber ?? 0) + 1,
        }),
      },
      getHeaders,
    );
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Apply failed.");
      return;
    }
    const data = await res.json();
    const planId = data.trainingPlanId ?? data.id;
    if (planId) await loadPlan(planId);
    setMessage("Template applied (draft).");
    loadPlans();
  }

  async function loadCopySourcePlans(sourceMemberId: string) {
    setCopySourceMemberId(sourceMemberId);
    setCopySourcePlanId("");
    if (!sourceMemberId) {
      setCopySourcePlans([]);
      return;
    }
    const list = await authFetch(
      `/api/training-plans?memberId=${sourceMemberId}`,
      {},
      getHeaders,
    ).then((r) => r.json());
    setCopySourcePlans(list);
    if (list[0]) setCopySourcePlanId(list[0].id);
  }

  async function copyFromClient() {
    if (!copySourcePlanId) return;
    timer.start();
    const res = await authFetch("/api/training-plans/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourcePlanId: copySourcePlanId,
        targetMemberId: memberId,
        weekNumber: (plans[0]?.weekNumber ?? 0) + 1,
      }),
    }, getHeaders);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Copy failed.");
      return;
    }
    const newPlan = await res.json();
    await loadPlan(newPlan.id);
    setMessage(`Copied training plan to week ${newPlan.weekNumber}.`);
    loadPlans();
  }

  function updateDayLabel(dayIndex: number, label: string) {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex === dayIndex ? { ...d, label } : d,
      ),
    });
  }

  function updateExercise(
    dayIndex: number,
    sectionIdx: number,
    exIdx: number,
    patch: Partial<ExerciseRow>,
  ) {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s, si) =>
                si !== sectionIdx
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.map((ex, ei) =>
                        ei !== exIdx ? ex : { ...ex, ...patch },
                      ),
                    },
              ),
            },
      ),
    });
  }

  function addExercise(dayIndex: number, sectionIdx: number) {
    if (!activePlan || catalog.length === 0) return;
    const first = catalog[0];
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s, si) =>
                si !== sectionIdx
                  ? s
                  : {
                      ...s,
                      exercises: [
                        ...s.exercises,
                        {
                          exerciseId: first.id,
                          supersetGroup: null,
                          reps: "12",
                          sets: 3,
                          exercise: { id: first.id, name: first.name },
                        },
                      ],
                    },
              ),
            },
      ),
    });
  }

  function reorderExercises(dayIndex: number, sectionIdx: number, exercises: ExerciseRow[]) {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s, si) =>
                si !== sectionIdx ? s : { ...s, exercises },
              ),
            },
      ),
    });
  }

  function removeExercise(dayIndex: number, sectionIdx: number, exIdx: number) {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex !== dayIndex
          ? d
          : {
              ...d,
              sections: d.sections.map((s, si) =>
                si !== sectionIdx
                  ? s
                  : {
                      ...s,
                      exercises: s.exercises.filter((_, ei) => ei !== exIdx),
                    },
              ),
            },
      ),
    });
  }

  function addSection(dayIndex: number) {
    if (!activePlan) return;
    setActivePlan({
      ...activePlan,
      days: activePlan.days.map((d) =>
        d.dayIndex !== dayIndex
          ? d
          : {
              ...d,
              sections: [
                ...d.sections,
                { type: "resistance", restNote: null, exercises: [] },
              ],
            },
      ),
    });
  }

  function toggleGuidelineBlock(blockId: string) {
    if (!activePlan) return;
    const ids = activePlan.blockIdsJson ?? [];
    const next = ids.includes(blockId) ? ids.filter((id) => id !== blockId) : [...ids, blockId];
    setActivePlan({ ...activePlan, blockIdsJson: next });
  }

  function reorderGuidelineBlocks(reordered: ContentBlock[]) {
    if (!activePlan) return;
    setActivePlan({ ...activePlan, blockIdsJson: reordered.map((b) => b.id) });
  }

  const attachedGuidelines = (activePlan?.blockIdsJson ?? [])
    .map((id) => guidelineBlocks.find((b) => b.id === id))
    .filter((b): b is ContentBlock => Boolean(b));

  const unattachedGuidelines = guidelineBlocks.filter(
    (b) => !(activePlan?.blockIdsJson ?? []).includes(b.id),
  );

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white pb-32">
        <CoachClientPlanHeader memberId={memberId} title="Training builder">
          {timer.running && (
            <div className="mt-2 flex justify-end">
              <span
                className={`rounded-full px-3 py-1 text-xs font-mono ${
                  timer.underTarget
                    ? "bg-[var(--brand-diet)]/20 text-[var(--brand-diet)]"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {timer.format(timer.elapsed)} / 5:00
              </span>
            </div>
          )}
          {activePlan && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={activePlan.id}
                onChange={(e) => loadPlan(e.target.value)}
                className="rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-2 py-1 text-sm"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    Week {p.weekNumber} ({p.status})
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-white/60">
                Steps
                <input
                  type="number"
                  value={stepGoal}
                  onChange={(e) => setStepGoal(Number(e.target.value))}
                  className="w-20 rounded border border-white/15 bg-[var(--brand-dark-surface)] px-2 py-1"
                />
              </label>
            </div>
          )}
        </CoachClientPlanHeader>

        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          {message && (
            <p className="rounded-lg bg-[var(--brand-workout)]/20 px-3 py-2 text-sm">{message}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => createFromTemplate("training_gym")}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
            >
              + Gym template (W1)
            </button>
            <button
              type="button"
              onClick={() => createFromTemplate("training_home")}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs"
            >
              + Home template (W21)
            </button>
            {activePlan && (
              <button
                type="button"
                onClick={saveAsTemplate}
                className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)]"
              >
                Save as template
              </button>
            )}
            <Link href="/coach/pilot" className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)]">
              Pilot metrics →
            </Link>
          </div>

          {(templates.length > 0 || members.length > 0) && (
            <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 space-y-3">
              <h2 className="font-heading text-sm">Reuse plans</h2>
              {templates.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-xs"
                  >
                    <option value="">Apply template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applySelectedTemplate}
                    disabled={!selectedTemplateId}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              )}
              {members.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={copySourceMemberId}
                    onChange={(e) => loadCopySourcePlans(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-xs"
                  >
                    <option value="">Copy from client…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                  {copySourcePlans.length > 0 && (
                    <select
                      value={copySourcePlanId}
                      onChange={(e) => setCopySourcePlanId(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/20 px-2 py-1.5 text-xs"
                    >
                      {copySourcePlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          Week {p.weekNumber}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={copyFromClient}
                    disabled={!copySourcePlanId}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    Copy
                  </button>
                </div>
              )}
            </section>
          )}

          {activePlan && (
            <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
              <h2 className="font-heading text-sm">Workout guideline blocks</h2>
              <p className="mt-1 text-xs text-white/40">
                Shown on the member workout tab (warm-up, stretching, cardio finishers).
              </p>
              {attachedGuidelines.length > 0 && (
                <DragReorderList
                  className="mt-3 space-y-2"
                  items={attachedGuidelines}
                  onReorder={reorderGuidelineBlocks}
                  keyExtractor={(b) => b.id}
                  renderItem={(b) => (
                    <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <span>{b.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleGuidelineBlock(b.id)}
                        className="text-xs text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                />
              )}
              <ul className="mt-3 space-y-2">
                {unattachedGuidelines.map((b) => (
                  <li key={b.id}>
                    <label className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggleGuidelineBlock(b.id)}
                        className="accent-[var(--brand-workout)]"
                      />
                      {b.title}
                      <span className="ml-auto text-xs text-white/40">{b.category}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activePlan?.days.map((day) => (
            <div key={day.dayIndex} className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
              <input
                value={day.label}
                onChange={(e) => updateDayLabel(day.dayIndex, e.target.value)}
                className="w-full bg-transparent font-heading text-sm outline-none"
              />
              {day.sections.length === 0 ? (
                <p className="mt-2 text-xs text-white/40">Rest day</p>
              ) : (
                day.sections.map((section, si) => (
                  <div key={si} className="mt-3 border-t border-white/5 pt-3">
                    <p className="text-xs uppercase text-[var(--brand-workout)]">{section.type}</p>
                    <DragReorderList
                      items={section.exercises}
                      onReorder={(exercises) => reorderExercises(day.dayIndex, si, exercises)}
                      keyExtractor={(_, ei) => `${day.dayIndex}-${si}-${ei}`}
                      renderItem={(ex, ei) => (
                        <div className="grid grid-cols-12 gap-1 text-xs">
                          <select
                            value={ex.supersetGroup ?? ""}
                            onChange={(e) =>
                              updateExercise(day.dayIndex, si, ei, {
                                supersetGroup: e.target.value || null,
                              })
                            }
                            className="col-span-2 rounded border border-white/10 bg-black/20 px-1 py-1"
                          >
                            {SUPERSET_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o || "—"}</option>
                            ))}
                          </select>
                          <select
                            value={ex.exerciseId}
                            onChange={(e) => {
                              const picked = catalog.find((c) => c.id === e.target.value);
                              updateExercise(day.dayIndex, si, ei, {
                                exerciseId: e.target.value,
                                exercise: picked
                                  ? { id: picked.id, name: picked.name }
                                  : undefined,
                              });
                            }}
                            className="col-span-5 rounded border border-white/10 bg-black/20 px-1 py-1"
                          >
                            {catalog.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <input
                            value={ex.sets}
                            type="number"
                            onChange={(e) =>
                              updateExercise(day.dayIndex, si, ei, {
                                sets: Number(e.target.value),
                              })
                            }
                            className="col-span-1 rounded border border-white/10 bg-black/20 px-1 py-1"
                          />
                          <input
                            value={ex.reps}
                            onChange={(e) =>
                              updateExercise(day.dayIndex, si, ei, { reps: e.target.value })
                            }
                            className="col-span-3 rounded border border-white/10 bg-black/20 px-1 py-1"
                            placeholder="reps"
                          />
                          <button
                            type="button"
                            onClick={() => removeExercise(day.dayIndex, si, ei)}
                            className="col-span-1 text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => addExercise(day.dayIndex, si)}
                      className="mt-2 text-xs text-[var(--brand-workout)]"
                    >
                      + Add exercise
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => addSection(day.dayIndex)}
                className="mt-2 text-xs text-white/40"
              >
                + Add section
              </button>
            </div>
          ))}

          <div className="fixed bottom-0 inset-x-0 flex flex-wrap gap-2 border-t border-white/10 bg-[var(--brand-dark)] p-4">
            <button
              type="button"
              onClick={() => saveStructure()}
              disabled={saving}
              className="rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save plan"}
            </button>
            <button
              type="button"
              onClick={cloneWeek}
              className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-medium"
            >
              Clone → next week
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={saving}
              className="flex-1 rounded-xl bg-[var(--brand-workout)] py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Save & publish"}
            </button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
