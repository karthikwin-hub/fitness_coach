"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuthHeaders, authFetchJson } from "@/lib/api/client";
import type { MemberJourneyPayload } from "@/lib/members/journey-queries";
import type { JourneyEmptyState } from "@/lib/members/journey-empty-state";
import type { JourneyItemKind } from "@/lib/members/journey-item-detail";
import {
  JourneyItemDetailPanel,
  type JourneyItemSelection,
} from "@/components/coach/journey-item-detail-panel";

type Props = {
  mode: "coach" | "member";
  memberId?: string;
  backHref?: string;
  backLabel?: string;
};

export function ProgramJourneyView({
  mode,
  memberId,
  backHref,
  backLabel,
}: Props) {
  const getHeaders = useAuthHeaders();
  const [windowIndex, setWindowIndex] = useState<number | undefined>(undefined);
  const [journey, setJourney] = useState<MemberJourneyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<JourneyItemSelection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs =
      windowIndex !== undefined ? `?windowIndex=${windowIndex}` : "";
    const path =
      mode === "member"
        ? `/api/members/me/journey${qs}`
        : `/api/members/${memberId}/journey${qs}`;

    const { data, error: err } = await authFetchJson<MemberJourneyPayload>(
      path,
      {},
      getHeaders,
    );
    if (err) {
      setError(err);
      setJourney(null);
    } else {
      setJourney(data);
    }
    setLoading(false);
  }, [getHeaders, memberId, mode, windowIndex]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !journey) {
    return <p className="px-4 py-8 text-white/50">Loading program progress…</p>;
  }

  if (error || !journey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-heading text-lg text-white/90">
          {mode === "member" ? "Program progress unavailable" : "Could not load journey"}
        </p>
        <p className="mt-2 text-sm text-white/50">
          {friendlyJourneyError(error, mode)}
        </p>
        {backHref && (
          <Link
            href={backHref}
            className="mt-6 inline-block text-sm text-[var(--brand-diet)] hover:underline"
          >
            ← {backLabel ?? "Back"}
          </Link>
        )}
      </div>
    );
  }

  const { member, window, windowLabel, stats, emptyState } = journey;
  const banner = emptyState ? coachEmptyCopy(emptyState, mode) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {backHref && (
        <Link href={backHref} className="text-xs text-white/50 hover:text-white/80">
          ← {backLabel ?? "Back"}
        </Link>
      )}

      <header className="space-y-2">
        <h1 className="font-heading text-xl">
          {mode === "member" ? "My program progress" : `${member.name}'s journey`}
        </h1>
        <p className="text-sm text-white/60">
          Program{" "}
          {member.programStartDate ?? "—"} – {member.programEndDate ?? "ongoing"}
          {" · "}
          {member.compliancePct}% compliance · {member.streakDays}d streak
        </p>
      </header>

      {banner && (
        <div
          className="rounded-xl border border-[var(--brand-diet)]/30 bg-[var(--brand-diet)]/10 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-[var(--brand-diet)]">{banner.title}</p>
          <p className="mt-1 text-sm text-white/70">{banner.message}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
        <div>
          <p className="text-sm font-medium text-[var(--brand-diet)]">{windowLabel}</p>
          <p className="text-xs text-white/50">
            Period {window.index + 1} of {window.totalWindows}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!window.hasPrev}
            onClick={() => setWindowIndex(window.index - 1)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
          >
            ← Earlier
          </button>
          <button
            type="button"
            disabled={!window.hasNext}
            onClick={() => setWindowIndex(window.index + 1)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
          >
            Later →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Check-ins" value={stats.checkInsInWindow} />
        <StatCard label="Deliveries" value={stats.deliveriesInWindow} />
        <StatCard label="Training weeks" value={stats.trainingPublishedInWindow} />
        <StatCard label="Sessions" value={stats.appointmentsInWindow} />
      </div>

      {member.programPhases.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-heading text-sm text-white/70">Program phases</h2>
          <ul className="space-y-1 text-sm text-white/80">
            {member.programPhases.map((phase) => (
              <li
                key={`${phase.startDate}-${phase.label}`}
                className="rounded-lg border border-white/10 px-3 py-2"
              >
                {phase.label}{" "}
                <span className="text-white/40">
                  {phase.startDate} – {phase.endDate}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PlanSection
        title="Training plans"
        kind="training"
        onSelect={setSelectedItem}
        items={journey.trainingPlans.map((p) => ({
          id: p.id,
          label: `Week ${p.weekNumber}`,
          meta: `${p.status}${p.publishedAt ? ` · ${p.publishedAt.slice(0, 10)}` : ""}`,
        }))}
        empty="No training plans in this period."
      />

      <PlanSection
        title="Nutrition plans"
        kind="nutrition"
        onSelect={setSelectedItem}
        items={journey.nutritionPlans.map((p) => ({
          id: p.id,
          label: `Week ${p.weekNumber}`,
          meta: `${p.status}${p.publishedAt ? ` · ${p.publishedAt.slice(0, 10)}` : ""}`,
        }))}
        empty="No nutrition plans in this period."
      />

      <PlanSection
        title="Plan deliveries"
        kind="delivery"
        onSelect={setSelectedItem}
        items={journey.deliveries.map((d) => ({
          id: d.id,
          label: d.weekLabel,
          meta: `${d.createdAt.slice(0, 10)} · ${d.openCount} opens`,
        }))}
        empty="No deliveries in this period."
      />

      <section className="space-y-2">
        <h2 className="font-heading text-sm text-[var(--brand-workout)]">Check-ins</h2>
        {journey.checkIns.length === 0 ? (
          <p className="text-sm text-white/50">No check-ins in this period.</p>
        ) : (
          <ul className="space-y-2">
            {journey.checkIns.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedItem({ kind: "check-in", id: c.id })}
                  className="w-full rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] px-4 py-3 text-left text-sm transition-colors hover:border-[var(--brand-diet)]/40"
                >
                  <div className="flex justify-between gap-2">
                    <span>{c.createdAt.slice(0, 10)}</span>
                    <span className="text-xs uppercase text-white/40">{c.status}</span>
                  </div>
                  {(c.weightKg != null || c.sleepHours != null) && (
                    <p className="mt-1 text-xs text-white/60">
                      {c.weightKg != null ? `${c.weightKg} kg` : ""}
                      {c.weightKg != null && c.sleepHours != null ? " · " : ""}
                      {c.sleepHours != null ? `${c.sleepHours}h sleep` : ""}
                    </p>
                  )}
                  {c.coachNote && (
                    <p className="mt-1 text-xs text-[var(--brand-diet)]">{c.coachNote}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PlanSection
        title="Appointments"
        kind="appointment"
        onSelect={setSelectedItem}
        items={journey.appointments.map((a) => ({
          id: a.id,
          label: a.title ?? "Coaching session",
          meta: `${a.startsAt.slice(0, 16).replace("T", " ")} · ${a.status}`,
        }))}
        empty="No appointments in this period."
      />

      {mode === "coach" && member.coachNotes && (
        <section className="space-y-2">
          <h2 className="font-heading text-sm text-white/70">Private coach notes</h2>
          <p className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm text-white/80">
            {member.coachNotes}
          </p>
        </section>
      )}

      {selectedItem && (
        <JourneyItemDetailPanel
          mode={mode}
          memberId={memberId}
          kind={selectedItem.kind}
          itemId={selectedItem.id}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-3 text-center">
      <p className="text-xl font-semibold text-[var(--brand-diet)]">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

function friendlyJourneyError(error: string | null, mode: "coach" | "member"): string {
  if (!error) {
    return mode === "member"
      ? "We couldn't load your program timeline. Try again in a moment or contact your coach."
      : "Something went wrong loading this client's journey.";
  }
  if (error === "Member not found" || error === "Not found") {
    return mode === "member"
      ? "Your member profile isn't set up yet. Ask your coach to complete onboarding."
      : "This client record could not be found.";
  }
  if (error === "Forbidden" || error.includes("Forbidden")) {
    return mode === "member"
      ? "You don't have permission to view this page."
      : "You don't have access to this client's journey.";
  }
  if (error.includes("assigned to another coach")) {
    return mode === "coach"
      ? "This client's assignment is out of date. Refresh the page — it should reconnect automatically."
      : error;
  }
  if (error === "Unauthorized") {
    return "Please sign in again to view program progress.";
  }
  return error;
}

function coachEmptyCopy(
  state: JourneyEmptyState,
  mode: "coach" | "member",
): JourneyEmptyState {
  if (mode === "member") return state;

  switch (state.kind) {
    case "no_program":
      return {
        ...state,
        message:
          "Set program start and end dates on the member profile, then publish their first plans.",
      };
    case "waiting_for_plans":
      return {
        ...state,
        message:
          "No published plans yet. Publish training or nutrition from the plan hub to populate this view.",
      };
    case "not_started":
      return {
        ...state,
        title: "Program not started yet",
        message: state.message.replace(/^Your program/, "Their program"),
      };
    case "empty_period":
      return state;
    default:
      return state;
  }
}

function PlanSection({
  title,
  kind,
  items,
  empty,
  onSelect,
}: {
  title: string;
  kind: JourneyItemKind;
  items: Array<{ id: string; label: string; meta: string }>;
  empty: string;
  onSelect: (item: JourneyItemSelection) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-sm text-white/70">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-white/50">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect({ kind, id: item.id })}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm transition-colors hover:border-[var(--brand-diet)]/40 hover:bg-white/[0.03]"
              >
                <span>{item.label}</span>
                <span className="text-xs text-white/40">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
