"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";

type MemberRow = {
  id: string;
  displayName: string | null;
  email: string;
  location: string | null;
  compliancePct: number;
  streakDays: number;
};

export function CoachPlansList() {
  const getHeaders = useAuthHeaders();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/members", {}, getHeaders)
      .then((r) => r.json())
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [getHeaders]);

  if (loading) return <p className="text-white/50">Loading clients…</p>;

  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li key={m.id}>
          <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
            <div className="flex items-center justify-between">
              <Link
                href={`/coach/members/${m.id}`}
                className="font-medium hover:text-[var(--brand-workout)]"
              >
                {m.displayName ?? m.email}
              </Link>
              <span className="text-xs text-white/40">{m.location ?? "—"}</span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Compliance {m.compliancePct}% · Streak {m.streakDays}d
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/coach/members/${m.id}`}
                className="text-[var(--brand-workout)] hover:underline"
              >
                View profile →
              </Link>
              <Link
                href={`/coach/plans/${m.id}`}
                className="text-[var(--brand-diet)] hover:underline"
              >
                Plan delivery →
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
