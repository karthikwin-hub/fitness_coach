"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type PlanTemplate = {
  id: string;
  key: string;
  type: string;
  name: string;
  description: string | null;
  tags: string[];
  stepGoal: number | null;
  environment: string | null;
  hasTraining: boolean;
  hasNutrition: boolean;
  updatedAt: string;
};

export default function PlanTemplatesPage() {
  const getHeaders = useAuthHeaders();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const data = await authFetch("/api/plan-templates", {}, getHeaders).then((r) =>
      r.json(),
    );
    setTemplates(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    setDeletingId(id);
    const res = await authFetch(`/api/plan-templates/${id}`, { method: "DELETE" }, getHeaders);
    setDeletingId(null);
    if (res.ok) {
      setMessage(`Deleted "${name}".`);
      load();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Delete failed.");
    }
  }

  const customTemplates = templates.filter((t) => t.type === "plan_bundle");
  const builtIn = templates.filter((t) => t.type !== "plan_bundle");

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Plan templates"
        title="Plan templates"
        description="Reusable training + nutrition bundles saved from client plans"
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {message && (
            <p className="rounded-lg bg-[var(--brand-diet)]/20 px-3 py-2 text-sm">{message}</p>
          )}

          <section>
            <h2 className="font-heading text-sm">Custom bundles</h2>
            <p className="mt-1 text-xs text-white/40">
              Save from a client&apos;s plan builder, then apply to new members.
            </p>
            {customTemplates.length === 0 ? (
              <p className="mt-4 text-sm text-white/50">
                No custom templates yet. Use &quot;Save as template&quot; on a client training or
                nutrition plan.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {customTemplates.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-white/40">
                          Code {t.key}
                          {t.hasTraining && t.hasNutrition
                            ? " · training + nutrition"
                            : t.hasTraining
                              ? " · training"
                              : t.hasNutrition
                                ? " · nutrition"
                                : ""}
                        </p>
                        {t.description && (
                          <p className="mt-1 text-sm text-white/60">{t.description}</p>
                        )}
                        {t.tags.length > 0 && (
                          <p className="mt-2 text-xs text-white/40">
                            {t.tags.join(" · ")}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(t.id, t.name)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-400 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-sm">Built-in training templates</h2>
            <ul className="mt-4 space-y-2">
              {builtIn.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <span>
                    {t.name}
                    {t.environment && (
                      <span className="ml-2 text-xs text-white/40">{t.environment}</span>
                    )}
                  </span>
                  <span className="text-xs text-white/40">{t.key}</span>
                </li>
              ))}
            </ul>
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
