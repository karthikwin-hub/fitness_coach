"use client";

import { useState } from "react";
import { CoachPageShell } from "@/components/coach/coach-page-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import type { ImportSummary, RowIssue, ValidationResult } from "@/lib/import/types";

type ImportKind = "members" | "catalog";

function SummaryCard({ label, counts }: { label: string; counts?: { create: number; update: number } }) {
  if (!counts) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {counts.create} new · {counts.update} update
      </p>
    </div>
  );
}

function CreateOnlyCard({ label, count }: { label: string; count?: number }) {
  if (count == null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{count} rows</p>
    </div>
  );
}

export function CoachImportView() {
  const getHeaders = useAuthHeaders();
  const [kind, setKind] = useState<ImportKind>("members");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [commitSummary, setCommitSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runPreview() {
    if (!file) {
      setMessage("Choose an .xlsx file first.");
      return;
    }
    setLoading(true);
    setMessage("");
    setCommitSummary(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const headers = await getHeaders();
      const res = await authFetch("/api/import/preview", { method: "POST", body: form }, () =>
        Promise.resolve(headers),
      );
      const body = await res.json();
      if (!res.ok) {
        setPreview(null);
        setMessage(body.error ?? "Preview failed");
        if (body.issues) setPreview(body as ValidationResult);
        return;
      }
      setPreview(body as ValidationResult);
      setMessage(body.valid ? "Preview OK — review counts below, then commit." : "Fix validation errors before committing.");
    } catch {
      setMessage("Preview request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runCommit() {
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const headers = await getHeaders();
      const res = await authFetch("/api/import/commit", { method: "POST", body: form }, () =>
        Promise.resolve(headers),
      );
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Import failed");
        if (body.issues) setPreview(body as ValidationResult);
        return;
      }
      setCommitSummary(body.summary as ImportSummary);
      setMessage("Import completed successfully.");
      setPreview(null);
    } catch {
      setMessage("Commit request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadExport(path: string, filename: string) {
    const headers = await getHeaders();
    const res = await fetch(path, { headers });
    if (!res.ok) {
      setMessage("Export download failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const issues: RowIssue[] = preview?.issues ?? [];

  return (
    <CoachPageShell
      eyebrow="Settings"
      title="Import & export"
      description={
        <>
          Bulk migrate clients and catalog using Excel workbooks. Join sheets on{" "}
          <code className="text-[var(--brand-diet)]">member_id</code> or{" "}
          <code className="text-[var(--brand-diet)]">import_key</code> — never email.
        </>
      }
      backLink={{ href: "/coach/settings", label: "← Settings" }}
      maxWidth="3xl"
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-heading text-sm text-white/70">Templates</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadExport("/api/import/templates/member-migration", "member-migration.xlsx")}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Member migration template
            </button>
            <button
              type="button"
              onClick={() => downloadExport("/api/import/templates/catalog-migration", "catalog-migration.xlsx")}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Catalog migration template
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-sm text-white/70">Export current data</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadExport("/api/export/members", "members-export.xlsx")}
              className="rounded-lg border border-[var(--brand-diet)]/40 px-4 py-2 text-sm text-[var(--brand-diet)] hover:bg-[var(--brand-diet)]/10"
            >
              Export members + plans
            </button>
            <button
              type="button"
              onClick={() => downloadExport("/api/export/catalog", "catalog-export.xlsx")}
              className="rounded-lg border border-[var(--brand-diet)]/40 px-4 py-2 text-sm text-[var(--brand-diet)] hover:bg-[var(--brand-diet)]/10"
            >
              Export catalog
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-5">
          <h2 className="font-heading text-sm text-white/70">Import workbook</h2>
          <div className="flex flex-wrap gap-2">
            {(["members", "catalog"] as ImportKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setPreview(null);
                  setCommitSummary(null);
                }}
                className={`rounded-lg border px-3 py-2 text-xs capitalize ${
                  kind === k
                    ? "border-[var(--brand-diet)]/50 text-[var(--brand-diet)]"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
              setCommitSummary(null);
            }}
            className="block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !file}
              onClick={runPreview}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
            >
              {loading ? "Working…" : "Preview import"}
            </button>
            <button
              type="button"
              disabled={loading || !file || !preview?.valid}
              onClick={runCommit}
              className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-medium text-[var(--brand-dark)] hover:opacity-90 disabled:opacity-40"
            >
              Commit import
            </button>
          </div>
          {message && <p className="text-sm text-white/70">{message}</p>}
        </section>

        {preview && (
          <section className="space-y-4">
            <h2 className="font-heading text-sm text-white/70">Preview summary</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Members" counts={preview.summary.members} />
              <SummaryCard label="Training plans" counts={preview.summary.trainingPlans} />
              <SummaryCard label="Nutrition plans" counts={preview.summary.nutritionPlans} />
              <CreateOnlyCard label="Notes" count={preview.summary.notes?.create} />
              <SummaryCard label="Exercises" counts={preview.summary.exercises} />
              <SummaryCard label="Content blocks" counts={preview.summary.contentBlocks} />
              <SummaryCard label="Plan templates" counts={preview.summary.planTemplates} />
            </div>
            {issues.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-red-500/30 bg-red-950/20">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="px-3 py-2">Sheet</th>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((issue, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-3 py-2">{issue.sheet}</td>
                        <td className="px-3 py-2">{issue.row}</td>
                        <td className="px-3 py-2">{issue.column ?? "—"}</td>
                        <td className="px-3 py-2 text-red-200">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {commitSummary && (
          <section className="space-y-4">
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">Import result</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Members" counts={commitSummary.members} />
              <SummaryCard label="Training plans" counts={commitSummary.trainingPlans} />
              <SummaryCard label="Nutrition plans" counts={commitSummary.nutritionPlans} />
              <CreateOnlyCard label="Notes" count={commitSummary.notes?.create} />
              <SummaryCard label="Exercises" counts={commitSummary.exercises} />
              <SummaryCard label="Content blocks" counts={commitSummary.contentBlocks} />
              <SummaryCard label="Plan templates" counts={commitSummary.planTemplates} />
            </div>
          </section>
        )}
      </div>
    </CoachPageShell>
  );
}
