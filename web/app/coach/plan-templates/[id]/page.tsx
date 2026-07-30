"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { canDeleteTemplate, isBuiltInTemplateType } from "@/lib/plans/template-management";
import { summarizeTemplateStructure } from "@/lib/plans/template-preview";

type TemplateDetail = {
  id: string;
  key: string;
  type: string;
  name: string;
  description: string | null;
  tagsJson: string[];
  structureJson: unknown;
  archivedAt: string | null;
  updatedAt: string;
};

type BlockTitle = { slug: string; title: string };

export default function PlanTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const getHeaders = useAuthHeaders();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [blockTitles, setBlockTitles] = useState<BlockTitle[]>([]);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [tpl, blocks] = await Promise.all([
      authFetch(`/api/plan-templates/${params.id}`, {}, getHeaders).then((r) => r.json()),
      authFetch("/api/content-blocks", {}, getHeaders).then((r) => r.json()),
    ]);
    if (tpl.error) {
      setMessage(tpl.error);
      return;
    }
    setTemplate(tpl);
    setEditName(tpl.name);
    setEditDescription(tpl.description ?? "");
    setEditTags(((tpl.tagsJson as string[]) ?? tpl.tags ?? []).join(", "));
    setBlockTitles(
      (blocks as { slug: string; title: string }[]).map((b) => ({
        slug: b.slug,
        title: b.title,
      })),
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (!template && !message) {
    return (
      <RequireAuth roles={["coach", "platform_admin"]}>
        <CoachPlanDeliveryShell title="Plan template" maxWidth="2xl">
          <p className="text-sm text-white/50">Loading…</p>
        </CoachPlanDeliveryShell>
      </RequireAuth>
    );
  }

  if (!template) {
    return (
      <RequireAuth roles={["coach", "platform_admin"]}>
        <CoachPlanDeliveryShell title="Plan template" maxWidth="2xl">
          <p className="text-sm text-red-300">{message}</p>
          <Link href="/coach/plan-templates" className="mt-4 inline-block text-sm text-[var(--brand-diet)] underline">
            Back to templates
          </Link>
        </CoachPlanDeliveryShell>
      </RequireAuth>
    );
  }

  const preview = summarizeTemplateStructure(template.type, template.structureJson);
  const builtIn = isBuiltInTemplateType(template.type);
  const tags = editTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  function blockLabel(slug: string) {
    return blockTitles.find((b) => b.slug === slug)?.title ?? slug;
  }

  async function saveMetadata() {
    setBusy(true);
    const res = await authFetch(`/api/plan-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim() || null,
        tags,
      }),
    }, getHeaders);
    setBusy(false);
    if (res.ok) {
      setMessage("Saved.");
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Save failed.");
    }
  }

  async function setArchived(archived: boolean) {
    setBusy(true);
    await authFetch(`/api/plan-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    }, getHeaders);
    setBusy(false);
    setMessage(archived ? "Archived." : "Restored.");
    load();
  }

  async function duplicateTemplate() {
    setBusy(true);
    const res = await authFetch(`/api/plan-templates/${template.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }, getHeaders);
    setBusy(false);
    if (res.ok) {
      const created = await res.json();
      router.push(`/coach/plan-templates/${created.id}`);
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Duplicate failed.");
    }
  }

  async function deleteTemplate() {
    if (!confirm(`Delete "${template.name}"?`)) return;
    setBusy(true);
    const res = await authFetch(`/api/plan-templates/${template.id}`, { method: "DELETE" }, getHeaders);
    setBusy(false);
    if (res.ok) router.push("/coach/plan-templates");
    else {
      const data = await res.json();
      setMessage(data.error ?? "Delete failed.");
    }
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Plan template"
        title={template.name}
        description={`Code ${template.key} · ${template.type.replace(/_/g, " ")}`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {message && (
            <p className="rounded-lg bg-[var(--brand-diet)]/20 px-3 py-2 text-sm">{message}</p>
          )}

          {!builtIn ? (
            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              <h2 className="font-heading text-sm">Edit metadata</h2>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Description"
                className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              />
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveMetadata()}
                className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              Built-in template — view only. Duplicate to create an editable copy.
            </p>
          )}

          {preview.training && (
            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="font-heading text-sm">Training</h2>
              <p className="mt-1 text-xs text-white/40">
                {preview.training.dayCount} days · {preview.training.exerciseCount} exercises ·{" "}
                {preview.training.environment} · {preview.training.stepGoal} steps
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {preview.training.days.map((d) => (
                  <li key={d.label} className="rounded-lg bg-black/20 p-2">
                    <p className="font-medium">{d.label}</p>
                    <p className="text-xs text-white/40">{d.exercises.length} exercises</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.nutrition && (
            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="font-heading text-sm">Nutrition</h2>
              <p className="mt-1 text-xs text-white/40">
                {preview.nutrition.caloriesMin}–{preview.nutrition.caloriesMax} cal · protein{" "}
                {preview.nutrition.proteinMin}–{preview.nutrition.proteinMax}g
              </p>
              {preview.nutrition.blockSlugs.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {preview.nutrition.blockSlugs.map((slug) => (
                    <li key={slug} className="text-white/70">
                      {blockLabel(slug)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-white/40">
                <Link href="/coach/content-blocks" className="text-[var(--brand-diet)] underline">
                  Manage nutrition blocks →
                </Link>
              </p>
            </section>
          )}

          {preview.trainingBlockSlugs.length > 0 && (
            <section className="rounded-xl border border-white/10 p-4">
              <h2 className="font-heading text-sm">Workout guideline blocks</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {preview.trainingBlockSlugs.map((slug) => (
                  <li key={slug}>{blockLabel(slug)}</li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void duplicateTemplate()}
              className="rounded-lg border border-[var(--brand-diet)]/40 px-4 py-2 text-sm text-[var(--brand-diet)]"
            >
              Duplicate
            </button>
            {!builtIn && canDeleteTemplate(template.type) && (
              <>
                {template.archivedAt ? (
                  <button type="button" disabled={busy} onClick={() => void setArchived(false)} className="rounded-lg border border-white/20 px-4 py-2 text-sm">
                    Restore
                  </button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => void setArchived(true)} className="rounded-lg border border-white/20 px-4 py-2 text-sm">
                    Archive
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => void deleteTemplate()} className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-300">
                  Delete
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-white/40">
            Last updated {new Date(template.updatedAt).toLocaleString()}
          </p>

          <Link href="/coach/plan-templates" className="inline-block text-sm text-[var(--brand-diet)] underline">
            ← Back to templates
          </Link>
        </div>
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
