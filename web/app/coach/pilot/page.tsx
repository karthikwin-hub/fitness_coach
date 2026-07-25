"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type PilotMetrics = {
  targetSeconds: number;
  averageSeconds: number | null;
  underTargetCount: number;
  totalTimed: number;
  recent: Array<{
    id: string;
    planType: string;
    memberName: string | null;
    revisionNumber: number;
    assemblyDurationSeconds: number | null;
    publishedAt: string;
    underTarget: boolean;
  }>;
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PilotPage() {
  const getHeaders = useAuthHeaders();
  const [metrics, setMetrics] = useState<PilotMetrics | null>(null);

  useEffect(() => {
    authFetch("/api/pilot-metrics", {}, getHeaders)
      .then((r) => r.json())
      .then(setMetrics);
  }, [getHeaders]);

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <Link href="/coach/plans" className="text-xs text-white/50">← Plan delivery</Link>
          <h1 className="font-heading text-xl">Helna pilot metrics</h1>
          <p className="text-sm text-white/60">
            Target: publish a client plan in under 5 minutes
          </p>
        </header>

        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          {metrics && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--brand-diet)]">
                    {metrics.underTargetCount}/{metrics.totalTimed || "—"}
                  </p>
                  <p className="text-xs text-white/50">Under 5 min</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-center">
                  <p className="text-2xl font-bold">
                    {metrics.averageSeconds != null
                      ? formatDuration(metrics.averageSeconds)
                      : "—"}
                  </p>
                  <p className="text-xs text-white/50">Avg assembly</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-center">
                  <p className="text-2xl font-bold">5:00</p>
                  <p className="text-xs text-white/50">Target</p>
                </div>
              </div>

              <section>
                <h2 className="font-heading text-sm text-white/70">Recent publishes</h2>
                <ul className="mt-3 space-y-2">
                  {metrics.recent.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{log.memberName ?? "Client"}</p>
                        <p className="text-xs text-white/40">
                          {log.planType} · rev {log.revisionNumber} ·{" "}
                          {new Date(log.publishedAt).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-xs ${
                          log.underTarget
                            ? "text-[var(--brand-diet)]"
                            : log.assemblyDurationSeconds
                              ? "text-amber-300"
                              : "text-white/30"
                        }`}
                      >
                        {log.assemblyDurationSeconds != null
                          ? formatDuration(log.assemblyDurationSeconds)
                          : "no timer"}
                      </span>
                    </li>
                  ))}
                  {metrics.recent.length === 0 && (
                    <p className="text-sm text-white/40">
                      No publishes yet. Clone a plan in the training builder — the timer starts automatically.
                    </p>
                  )}
                </ul>
              </section>

              <div className="rounded-xl border border-[var(--brand-workout)]/30 bg-[var(--brand-workout)]/10 p-4 text-sm">
                <p className="font-medium">Pilot workflow</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-white/70">
                  <li>Select client → Open training or nutrition builder</li>
                  <li>Clone last week (timer starts) or create from template</li>
                  <li>Adjust macros / exercises inline</li>
                  <li>Save → Publish (timer stops and logs duration)</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
