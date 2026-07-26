"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CoachPlanDeliveryNav } from "@/components/coach/coach-plan-delivery-nav";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { formatMemberName } from "@/lib/members/types";

export function useCoachClientName(memberId: string) {
  const getHeaders = useAuthHeaders();
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/members/${memberId}`, {}, getHeaders)
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (cancelled || !profile) return;
        setClientName(
          formatMemberName({
            firstName: profile.firstName ?? null,
            lastName: profile.lastName ?? null,
            displayName: profile.displayName ?? null,
            email: profile.email ?? "",
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setClientName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, getHeaders]);

  return clientName;
}

export function CoachClientPlanHeader({
  memberId,
  title,
  children,
}: {
  memberId: string;
  title: string;
  children?: React.ReactNode;
}) {
  const clientName = useCoachClientName(memberId);

  return (
    <header className="border-b border-white/10 px-4 py-4">
      <p className="text-xs text-[var(--brand-diet)]">
        Plan delivery for {clientName ?? "client"}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl">{title}</h1>
          {clientName && (
            <p className="text-sm text-white/60">
              Working on {clientName}&apos;s plan
            </p>
          )}
        </div>
        <Link
          href={`/coach/plans/${memberId}`}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70"
        >
          Back to client plans
        </Link>
      </div>
      <div className="mt-4">
        <CoachPlanDeliveryNav />
      </div>
      {children}
    </header>
  );
}
