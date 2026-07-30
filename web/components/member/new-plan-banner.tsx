"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import { PlanPdfDownloadButton } from "@/components/member/plan-pdf-download-button";

type DeliveryMeta = {
  id: string;
  weekLabel: string;
  createdAt: string;
  coachVoiceNoteUrl: string | null;
  coachVoiceNoteDurationSec: number | null;
};

export function NewPlanBanner({ compact = false }: { compact?: boolean }) {
  const getHeaders = useAuthHeaders();
  const [delivery, setDelivery] = useState<DeliveryMeta | null>(null);

  useEffect(() => {
    authFetchJson<{ delivery: DeliveryMeta | null }>(
      "/api/members/me/plan-delivery",
      {},
      getHeaders,
    ).then(({ data }) => {
      setDelivery(data?.delivery ?? null);
    });
  }, [getHeaders]);

  if (!delivery) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-white/55">
          <span className="font-medium text-[var(--brand-primary)]">{delivery.weekLabel}</span>
          {" · "}
          {new Date(delivery.createdAt).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Link href="/member/workouts" className="text-[var(--brand-workout)]">
            Workouts
          </Link>
          <Link href="/member/nutrition" className="text-[var(--brand-diet)]">
            Nutrition
          </Link>
          <PlanPdfDownloadButton
            label="PDF"
            className="text-white/60 underline-offset-2 hover:underline disabled:opacity-50"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/15 p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">New plan</p>
      <h2 className="font-heading mt-1 text-lg">{delivery.weekLabel} is ready</h2>
      <p className="mt-1 text-xs text-white/50">
        Delivered {new Date(delivery.createdAt).toLocaleDateString()}
      </p>
      {delivery.coachVoiceNoteUrl && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-white/50">Voice from your coach</p>
          <audio controls className="mt-2 w-full" src={delivery.coachVoiceNoteUrl}>
            <track kind="captions" />
          </audio>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/member/workouts"
          className="rounded-xl bg-[var(--brand-workout)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]"
        >
          Open workouts
        </Link>
        <Link
          href="/member/nutrition"
          className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/80"
        >
          Open nutrition
        </Link>
        <PlanPdfDownloadButton label="Download PDF" />
      </div>
    </div>
  );
}
