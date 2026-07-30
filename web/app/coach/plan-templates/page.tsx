"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import {
  canDeleteTemplate,
  listBuiltInTrainingTemplates,
  listCustomBundles,
  listNutritionTemplates,
} from "@/lib/plans/template-management";

type PlanTemplate = {
  id: string;
  key: string;
  type: string;
  name: string;
  description: string | null;
  tags: string[];
  hasTraining: boolean;
  hasNutrition: boolean;
  archivedAt: string | null;
  updatedAt: string;
};

type Tab = "active" | "archived";

function TemplateRow({
  template,
  selected,
  onToggle,
  showCheckbox,
  onDelete,
  deleting,
}: {
  template: PlanTemplate;
  selected: boolean;
  onToggle: () => void;
  showCheckbox: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <li className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <div className="flex items-start gap-3">
        {showCheckbox && canDeleteTemplate(template.type) && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 accent-[var(--brand-diet)]"
            aria-label={`Select ${template.name}`}
          />
        )}
        <Link href={`/coach/plan-templates/${template.id}`} className="min-w-0 flex-1 hover:opacity-90">
          <p className="font-medium">{template.name}</p>
          <p className="text-xs text-white/40">
            Code {template.key}
            {template.hasTraining && template.hasNutrition
              ? " · training + nutrition"
              : template.hasTraining
                ? " · training"
                : template.hasNutrition
                  ? " · nutrition"
                  : ""}
          </p>
          {template.description && (
            <p className="mt-1 text-sm text-white/60">{template.description}</p>
          )}
          {template.tags.length > 0 && (
            <p className="mt-2 text-xs text-white/40">{template.tags.join(" · ")}</p>
          )}
        </Link>
        {onDelete && canDeleteTemplate(template.type) && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="text-xs text-red-400 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export default function PlanTemplatesPage() {
  const getHeaders = useAuthHeaders();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [tab, setTab] = useState<Tab>("active");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  async function load() {
    const url =
      tab === "archived"
        ? "/api/plan-templates?includeArchived=1"
        : "/api/plan-templates";
    const rows = (await authFetch(url, {}, getHeaders).then((r) => r.json())) as PlanTemplate[];
    setTemplates(tab === "archived" ? rows.filter((t) => t.archivedAt) : rows);
  }

  useEffect(() => {
    load();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const customTemplates = listCustomBundles(templates);
  const builtIn = listBuiltInTrainingTemplates(templates);
  const nutritionTemplates = listNutritionTemplates(templates);

  const selectableCustom = customTemplates.filter((t) => canDeleteTemplate(t.type));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(selectableCustom.map((t) => t.id)));
  }

  async function bulkAction(action: "archive" | "restore" | "delete") {
    if (selectedIds.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selectedIds.size} template(s)?`)) return;
    setBusy(true);
    const res = await authFetch("/api/plan-templates/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: [...selectedIds] }),
    }, getHeaders);
    setBusy(false);
    if (res.ok) {
      setMessage(action === "archive" ? "Archived selected templates." : action === "restore" ? "Restored selected templates." : "Deleted selected templates.");
      setSelectedIds(new Set());
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Bulk action failed.");
    }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    const rows = (await authFetch("/api/plan-templates?includeArchived=1", {}, getHeaders).then(
      (r) => r.json(),
    )) as PlanTemplate[];
    let max = 999;
    for (const t of rows) {
      if (/^[0-9]+$/.test(t.key)) max = Math.max(max, parseInt(t.key, 10));
    }
    const templateKey = String(max + 1);
    const res = await authFetch("/api/plan-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        key: templateKey,
        type: "plan_bundle",
        structureJson: { version: 1, trainingBlockSlugs: [] },
        description: newDescription.trim() || null,
      }),
    }, getHeaders);
    setBusy(false);
    if (res.ok) {
      setShowNew(false);
      setNewName("");
      setNewDescription("");
      setMessage("Template created.");
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Create failed.");
    }
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Plan templates"
        title="Plan templates"
        description="Reusable training + nutrition bundles. Nutrition blocks live under Content blocks."
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-white/50">
            <Link href="/coach/content-blocks" className="text-[var(--brand-diet)] underline">
              Manage nutrition & workout blocks →
            </Link>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${tab === "active" ? "border-[var(--brand-diet)]/50 text-[var(--brand-diet)]" : "border-white/15 text-white/60"}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setTab("archived")}
              className={`rounded-lg border px-3 py-1.5 text-xs ${tab === "archived" ? "border-[var(--brand-diet)]/50 text-[var(--brand-diet)]" : "border-white/15 text-white/60"}`}
            >
              Archived
            </button>
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="ml-auto rounded-lg bg-[var(--brand-diet)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)]"
            >
              New template
            </button>
          </div>

          {showNew && (
            <form onSubmit={createTemplate} className="space-y-3 rounded-xl border border-white/10 p-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Template name"
                required
                className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              />
              <button type="submit" disabled={busy} className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50">
                Create empty bundle
              </button>
            </form>
          )}

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span>{selectedIds.size} selected</span>
              <button type="button" onClick={selectAll} className="underline text-white/70">Select all bundles</button>
              {tab === "active" ? (
                <button type="button" disabled={busy} onClick={() => void bulkAction("archive")} className="rounded border border-white/20 px-2 py-1">Archive</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void bulkAction("restore")} className="rounded border border-white/20 px-2 py-1">Restore</button>
              )}
              <button type="button" disabled={busy} onClick={() => void bulkAction("delete")} className="rounded border border-red-400/40 px-2 py-1 text-red-300">Delete</button>
            </div>
          )}

          {message && (
            <p className="rounded-lg bg-[var(--brand-diet)]/20 px-3 py-2 text-sm">{message}</p>
          )}

          <section>
            <h2 className="font-heading text-sm">Custom bundles</h2>
            <p className="mt-1 text-xs text-white/40">
              Save from a client&apos;s plan builder, then apply to new members.
            </p>
            {customTemplates.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">No custom templates in this tab.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {customTemplates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    selected={selectedIds.has(t.id)}
                    onToggle={() => toggleSelect(t.id)}
                    showCheckbox
                    onDelete={async () => {
                      if (!confirm(`Delete template "${t.name}"?`)) return;
                      await authFetch(`/api/plan-templates/${t.id}`, { method: "DELETE" }, getHeaders);
                      setMessage(`Deleted "${t.name}".`);
                      load();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-sm">Nutrition templates</h2>
            <p className="mt-1 text-xs text-white/40">
              Macro programs and bundles with nutrition. Tip blocks are managed under{" "}
              <Link href="/coach/content-blocks" className="text-[var(--brand-diet)] underline">Content blocks</Link>.
            </p>
            {nutritionTemplates.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">No nutrition templates.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {nutritionTemplates.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/coach/plan-templates/${t.id}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <span>{t.name}</span>
                      <span className="text-xs text-white/40">{t.key}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-sm">Built-in training templates</h2>
            {builtIn.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">No built-in templates.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {builtIn.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/coach/plan-templates/${t.id}`}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
                    >
                      <span>{t.name}</span>
                      <span className="text-xs text-white/40">{t.key}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-sm text-white/50">
            <Link href="/coach/plans" className="text-[var(--brand-diet)] underline">
              Back to clients
            </Link>
          </p>
        </div>
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
