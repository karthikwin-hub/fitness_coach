import type { ProgramPhase } from "@/lib/members/program-phases";
import { currentProgramPhase } from "@/lib/members/program-phases";
import { memberCopy } from "@/lib/copy/member-portal";

export function ProgramPhaseStrip({ phases }: { phases: ProgramPhase[] }) {
  if (phases.length === 0) return null;

  const current = currentProgramPhase(phases);

  return (
    <section className="rounded-2xl border border-white/10 bg-[var(--brand-dark-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">
        {memberCopy.phaseStripLabel}
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {phases.map((phase) => {
          const isCurrent = current?.label === phase.label;
          return (
            <div
              key={`${phase.label}-${phase.startDate}`}
              className={`min-w-[8rem] shrink-0 rounded-xl border px-3 py-2 ${
                isCurrent
                  ? "border-[var(--brand-workout)] bg-[var(--brand-workout)]/10"
                  : "border-white/10 bg-[var(--brand-dark)]/40"
              }`}
            >
              <p className={`text-sm font-medium ${isCurrent ? "text-[var(--brand-workout)]" : ""}`}>
                {phase.label}
              </p>
              <p className="mt-1 text-[10px] text-white/40">
                {phase.startDate} – {phase.endDate}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
