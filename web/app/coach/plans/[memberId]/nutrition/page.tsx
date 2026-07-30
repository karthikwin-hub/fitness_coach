"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachClientPlanHeader } from "@/components/coach/coach-client-plan-header";
import { usePilotTimer } from "@/components/coach/use-pilot-timer";
import { DragReorderList } from "@/components/coach/drag-reorder-list";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type NutritionPlan = {
  id: string;
  weekNumber: number;
  status: string;
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
  blockIdsJson: string[];
};

type ContentBlock = { id: string; title: string; category: string };
type PlanTemplateOption = {
  id: string;
  key: string;
  name: string;
  hasNutrition: boolean;
  type: string;
};
type MemberOption = { id: string; displayName: string };

export default function NutritionBuilderPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const getHeaders = useAuthHeaders();
  const timer = usePilotTimer(memberId);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
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

  async function loadPlans() {
    const [plans, allBlocks] = await Promise.all([
      authFetch(`/api/nutrition-plans?memberId=${memberId}`, {}, getHeaders).then((r) => r.json()),
      authFetch("/api/content-blocks", {}, getHeaders).then((r) => r.json()),
    ]);
    setBlocks(allBlocks);
    setPlan(plans[0] ?? null);
  }

  useEffect(() => {
    loadPlans();
    authFetch("/api/plan-templates", {}, getHeaders)
      .then((r) => r.json())
      .then((rows: PlanTemplateOption[]) =>
        setTemplates(rows.filter((t) => t.hasNutrition)),
      );
    authFetch("/api/members", {}, getHeaders)
      .then((r) => r.json())
      .then((rows: MemberOption[]) =>
        setMembers(rows.filter((m) => m.id !== memberId)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  async function savePlan(silent = false) {
    if (!plan) return false;
    setSaving(true);
    const updated = await authFetch(`/api/nutrition-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    }, getHeaders).then((r) => r.json());
    setPlan(updated);
    setSaving(false);
    if (!silent) setMessage("Plan saved.");
    return true;
  }

  async function createWeek1() {
    const newPlan = await authFetch("/api/nutrition-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        weekNumber: 1,
        caloriesMin: 1600,
        caloriesMax: 1900,
        proteinMin: 100,
        proteinMax: 130,
        carbsMax: 180,
        fatMin: 45,
        fatMax: 65,
        blockIdsJson: [],
      }),
    }, getHeaders).then((r) => r.json());
    setPlan(newPlan);
    setMessage("Created week 1 nutrition plan (draft).");
  }

  async function publish() {
    if (!plan) return;
    setSaving(true);
    await savePlan(true);
    const duration = timer.running ? timer.stop() : timer.elapsed;
    const res = await authFetch(`/api/nutrition-plans/${plan.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assemblyDurationSeconds: duration || undefined }),
    }, getHeaders);
    const data = await res.json();
    setSaving(false);
    setMessage(
      data.underTarget
        ? `Saved and published in ${timer.format(duration)} — under 5 min target!`
        : "Saved and published to member Nutrition tab.",
    );
    setPlan({ ...plan, status: "published" });
  }

  async function cloneWeek() {
    if (!plan) return;
    timer.start();
    const newPlan = await authFetch("/api/nutrition-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloneFromPlanId: plan.id, weekNumber: plan.weekNumber + 1 }),
    }, getHeaders).then((r) => r.json());
    setPlan(newPlan);
    setMessage(`Cloned to week ${newPlan.weekNumber} (draft).`);
  }

  async function saveAsTemplate() {
    if (!plan) return;
    const name = window.prompt("Template name");
    if (!name?.trim()) return;
    const res = await authFetch("/api/plan-templates/from-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        nutritionPlanId: plan.id,
        weekNumber: plan.weekNumber,
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
        : "/api/nutrition-plans/from-template",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          templateId: selectedTemplateId,
          template: template?.key ?? selectedTemplateId,
          weekNumber: (plan?.weekNumber ?? 0) + 1,
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
    if (data.id) {
      setPlan(data);
    } else {
      await loadPlans();
    }
    setMessage("Template applied (draft).");
  }

  async function loadCopySourcePlans(sourceMemberId: string) {
    setCopySourceMemberId(sourceMemberId);
    setCopySourcePlanId("");
    if (!sourceMemberId) {
      setCopySourcePlans([]);
      return;
    }
    const list = await authFetch(
      `/api/nutrition-plans?memberId=${sourceMemberId}`,
      {},
      getHeaders,
    ).then((r) => r.json());
    setCopySourcePlans(list);
    if (list[0]) setCopySourcePlanId(list[0].id);
  }

  async function copyFromClient() {
    if (!copySourcePlanId) return;
    timer.start();
    const res = await authFetch("/api/nutrition-plans/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourcePlanId: copySourcePlanId,
        targetMemberId: memberId,
        weekNumber: (plan?.weekNumber ?? 0) + 1,
      }),
    }, getHeaders);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Copy failed.");
      return;
    }
    const newPlan = await res.json();
    setPlan(newPlan);
    setMessage(`Copied nutrition plan to week ${newPlan.weekNumber}.`);
  }

  function toggleBlock(blockId: string) {
    if (!plan) return;
    const ids = plan.blockIdsJson ?? [];
    const next = ids.includes(blockId) ? ids.filter((id) => id !== blockId) : [...ids, blockId];
    setPlan({ ...plan, blockIdsJson: next });
  }

  const attachedBlocks = (plan?.blockIdsJson ?? [])
    .map((id) => blocks.find((b) => b.id === id))
    .filter((b): b is ContentBlock => Boolean(b));

  const unattachedBlocks = blocks.filter((b) => !(plan?.blockIdsJson ?? []).includes(b.id));

  function reorderAttachedBlocks(reordered: ContentBlock[]) {
    if (!plan) return;
    setPlan({ ...plan, blockIdsJson: reordered.map((b) => b.id) });
  }

  if (!plan) {
    return (
      <RequireAuth roles={["coach", "platform_admin"]}>
        <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
          <CoachClientPlanHeader memberId={memberId} title="Nutrition builder" />
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-center">
            <p className="text-white/60">No nutrition plan for this client yet.</p>
            <button
              type="button"
              onClick={createWeek1}
              className="rounded-xl bg-[var(--brand-diet)] px-6 py-3 text-sm font-semibold text-[var(--brand-dark)]"
            >
              + Create week 1
            </button>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white pb-24">
        <CoachClientPlanHeader memberId={memberId} title="Nutrition builder">
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-white/60">
              Week {plan.weekNumber} · {plan.status}
            </p>
            {timer.running && (
              <span
                className={`font-mono text-xs ${timer.underTarget ? "text-[var(--brand-diet)]" : "text-amber-300"}`}
              >
                {timer.format(timer.elapsed)} / 5:00
              </span>
            )}
          </div>
        </CoachClientPlanHeader>

        <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
          {message && <p className="rounded-lg bg-[var(--brand-diet)]/20 px-3 py-2 text-sm">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveAsTemplate}
              className="rounded-lg border border-[var(--brand-diet)]/40 px-3 py-1.5 text-xs text-[var(--brand-diet)]"
            >
              Save as template
            </button>
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

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["caloriesMin", "Cal min"],
                ["caloriesMax", "Cal max"],
                ["proteinMin", "Protein min"],
                ["proteinMax", "Protein max"],
                ["carbsMax", "Carbs max"],
                ["fatMin", "Fat min"],
                ["fatMax", "Fat max"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-white/60">{label}</span>
                <input
                  type="number"
                  value={plan[key] ?? ""}
                  onChange={(e) => setPlan({ ...plan, [key]: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => savePlan()}
            disabled={saving}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save plan"}
          </button>

          <section>
            <h2 className="font-heading text-sm">Attached tip blocks</h2>
            <p className="mt-1 text-xs text-white/40">
              Drag to reorder how blocks appear for the member.{" "}
              <Link href="/coach/content-blocks" className="text-[var(--brand-diet)] underline">
                Manage reusable blocks →
              </Link>
            </p>
            {attachedBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-white/40">No blocks attached yet.</p>
            ) : (
              <DragReorderList
                className="mt-2 space-y-2"
                items={attachedBlocks}
                onReorder={reorderAttachedBlocks}
                keyExtractor={(b) => b.id}
                renderItem={(b) => (
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                    <span>{b.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">{b.category}</span>
                      <button
                        type="button"
                        onClick={() => toggleBlock(b.id)}
                        className="text-xs text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              />
            )}
          </section>

          <section>
            <h2 className="font-heading text-sm">Add blocks</h2>
            <ul className="mt-2 space-y-2">
              {unattachedBlocks.map((b) => (
                <li key={b.id}>
                  <label className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => toggleBlock(b.id)}
                      className="accent-[var(--brand-diet)]"
                    />
                    {b.title}
                    <span className="ml-auto text-xs text-white/40">{b.category}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <div className="fixed bottom-0 inset-x-0 flex gap-2 border-t border-white/10 bg-[var(--brand-dark)] p-4">
            <button
              type="button"
              onClick={cloneWeek}
              className="flex-1 rounded-xl border border-white/20 py-3 text-sm"
            >
              Clone → next week
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={saving}
              className="flex-1 rounded-xl bg-[var(--brand-diet)] py-3 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Save & publish"}
            </button>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
