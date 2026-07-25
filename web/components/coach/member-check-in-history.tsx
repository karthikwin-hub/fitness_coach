"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import { CheckInHistoryList } from "@/components/coach/check-in-history-list";

export function MemberCheckInHistory({ memberId }: { memberId: string }) {
  const getHeaders = useAuthHeaders();
  const [items, setItems] = useState<
    Array<{
      id: string;
      status: string;
      coachNote: string | null;
      createdAt: string;
      weightKg: number | null;
      sleepHours: number | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`/api/check-ins?memberId=${memberId}`, {}, getHeaders)
      .then((r) => r.json())
      .then((payload) => setItems(payload.items ?? payload))
      .finally(() => setLoading(false));
  }, [memberId, getHeaders]);

  if (loading) return <p className="text-sm text-white/50">Loading check-in history…</p>;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-sm text-[var(--brand-workout)]">
          Check-in history ({items.length})
        </h2>
        <Link
          href={`/coach?memberId=${memberId}`}
          className="text-xs text-[var(--brand-diet)] hover:underline"
        >
          Review in command center →
        </Link>
      </div>
      <CheckInHistoryList
        items={items}
        showMemberName={false}
        emptyMessage="No check-ins recorded for this member yet."
      />
    </section>
  );
}
