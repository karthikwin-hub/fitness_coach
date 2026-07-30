"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Flame, Footprints } from "lucide-react";
import { useState } from "react";
import { NewPlanBanner } from "@/components/member/new-plan-banner";
import { memberCopy } from "@/lib/copy/member-portal";
import type { ProgramPhase } from "@/lib/members/program-phases";
import { currentProgramPhase } from "@/lib/members/program-phases";

type Props = {
  firstName: string;
  memberName: string;
  memberEmail: string | undefined;
  location: string | null;
  programStartDate: string | null;
  programEndDate: string | null;
  programPhases: ProgramPhase[];
  streakDays: number;
  compliancePct: number;
  stepGoal: number;
};

export function MemberDashboardSummary({
  firstName,
  memberName,
  memberEmail,
  location,
  programStartDate,
  programEndDate,
  programPhases,
  streakDays,
  compliancePct,
  stepGoal,
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const currentPhase = currentProgramPhase(programPhases);

  return (
    <section className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90">
            {memberCopy.dashboardGreeting(firstName)}
          </p>
          <p className="truncate text-xs text-white/45">
            {currentPhase?.label ?? "Program"}
            {programEndDate ? ` · ends ${programEndDate}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wide text-white/50"
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? (
            <span className="inline-flex items-center gap-1">
              Less <ChevronUp className="h-3 w-3" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              Details <ChevronDown className="h-3 w-3" />
            </span>
          )}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
          {streakDays}d streak
        </span>
        <span>{compliancePct}% compliance</span>
        <span className="inline-flex items-center gap-1">
          <Footprints className="h-3.5 w-3.5 text-[var(--brand-workout)]" />
          {stepGoal.toLocaleString()} steps
        </span>
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <NewPlanBanner compact />
      </div>

      {detailsOpen && (
        <div className="mt-2 space-y-2 border-t border-white/10 pt-2 text-xs text-white/50">
          <p>
            <span className="font-medium text-white/70">{memberName}</span>
            {memberEmail ? ` · ${memberEmail}` : ""}
            {location ? ` · ${location}` : ""}
          </p>
          {programStartDate && (
            <p>
              Program {programStartDate} – {programEndDate ?? "ongoing"}
            </p>
          )}
          {programPhases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {programPhases.map((phase) => {
                const isCurrent = currentPhase?.label === phase.label;
                return (
                  <span
                    key={`${phase.label}-${phase.startDate}`}
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isCurrent
                        ? "bg-[var(--brand-workout)]/20 text-[var(--brand-workout)]"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {phase.label}
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/member/workouts" className="text-[var(--brand-workout)]">
              Workouts →
            </Link>
            <Link href="/member/nutrition" className="text-[var(--brand-diet)]">
              Nutrition →
            </Link>
            <Link href="/member/progress" className="text-white/60">
              Progress →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
