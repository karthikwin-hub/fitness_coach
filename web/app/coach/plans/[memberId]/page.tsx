"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

export default function MemberPlanHubPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const getHeaders = useAuthHeaders();
  const [trainingPlans, setTrainingPlans] = useState<Array<{ id: string; weekNumber: number; status: string }>>([]);
  const [nutritionPlans, setNutritionPlans] = useState<Array<{ id: string; weekNumber: number; status: string }>>([]);

  useEffect(() => {
    Promise.all([
      authFetch(`/api/training-plans?memberId=${memberId}`, {}, getHeaders).then((r) => r.json()),
      authFetch(`/api/nutrition-plans?memberId=${memberId}`, {}, getHeaders).then((r) => r.json()),
    ]).then(([t, n]) => {
      setTrainingPlans(t);
      setNutritionPlans(n);
    });
  }, [memberId, getHeaders]);

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <div className="min-h-dvh bg-[var(--brand-dark)] text-white">
        <header className="border-b border-white/10 px-4 py-4">
          <Link href="/coach/plans" className="text-xs text-white/50">
            ← All clients
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-heading text-xl">Client plans</h1>
            <Link
              href={`/coach/members/${memberId}`}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
            >
              View profile
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          <section>
            <h2 className="font-heading text-sm text-[var(--brand-workout)]">Training</h2>
            <ul className="mt-2 space-y-2">
              {trainingPlans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm">
                  <span>Week {p.weekNumber}</span>
                  <span className="text-xs uppercase text-white/40">{p.status}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/coach/plans/${memberId}/training`}
              className="mt-3 inline-block rounded-xl bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Open training builder
            </Link>
          </section>
          <section>
            <h2 className="font-heading text-sm text-[var(--brand-diet)]">Nutrition</h2>
            <ul className="mt-2 space-y-2">
              {nutritionPlans.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-sm">
                  <span>Week {p.weekNumber}</span>
                  <span className="text-xs uppercase text-white/40">{p.status}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/coach/plans/${memberId}/nutrition`}
              className="mt-3 inline-block rounded-xl bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
            >
              Open nutrition builder
            </Link>
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
