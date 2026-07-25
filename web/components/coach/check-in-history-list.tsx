"use client";

import type { MemberTrendSnapshot } from "@/lib/coach/trend-alerts";
import { coachCopy } from "@/lib/copy/coach-portal";
import { Sparkline } from "@/components/coach/sparkline";
import { MiniComplianceRing } from "@/components/coach/mini-compliance-ring";

type CheckInSummary = {
  id: string;
  memberId?: string;
  status: string;
  coachNote: string | null;
  createdAt: string;
  weightKg: number | null;
  sleepHours: number | null;
  memberDisplayName?: string | null;
  memberEmail?: string;
};

function statusColor(status: string) {
  if (status === "approved") return "text-[var(--brand-diet)]";
  if (status === "flagged") return "text-red-300";
  return "text-amber-200";
}

function checkInCompliancePct(trend?: MemberTrendSnapshot): number {
  if (!trend) return 0;
  const logged = trend.history.filter(
    (h) => h.weightKg != null || h.sleepHours != null,
  ).length;
  return Math.round((logged / 7) * 100);
}

export function CheckInHistoryList({
  items,
  selectedId,
  onSelect,
  showMemberName = false,
  emptyMessage = "No check-ins yet.",
  trendsByMember = {},
}: {
  items: CheckInSummary[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  showMemberName?: boolean;
  emptyMessage?: string;
  trendsByMember?: Record<string, MemberTrendSnapshot>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-white/40">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((c) => {
        const trend = c.memberId ? trendsByMember[c.memberId] : undefined;
        const hasAlerts = (trend?.alerts.length ?? 0) > 0;
        const row = (
          <CheckInHistoryRow
            checkIn={c}
            showMemberName={showMemberName}
            trend={trend}
          />
        );

        return (
          <li key={c.id}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedId === c.id
                    ? "border-[var(--brand-diet)] bg-[var(--brand-diet)]/10"
                    : hasAlerts
                      ? "border-amber-400/40 bg-[var(--brand-dark-surface)]"
                      : "border-white/10 bg-[var(--brand-dark-surface)]"
                }`}
              >
                {row}
              </button>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-3">
                {row}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CheckInHistoryRow({
  checkIn,
  showMemberName,
  trend,
}: {
  checkIn: CheckInSummary;
  showMemberName: boolean;
  trend?: MemberTrendSnapshot;
}) {
  const compliance = checkInCompliancePct(trend);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {trend && (
            <MiniComplianceRing pct={compliance} />
          )}
          {showMemberName && (
            <span className="truncate text-sm font-semibold">
              {checkIn.memberDisplayName ?? checkIn.memberEmail}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {trend && trend.alerts.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] uppercase text-amber-200">
              {coachCopy.atRiskBadge}
            </span>
          )}
          <span className={`text-xs uppercase ${statusColor(checkIn.status)}`}>
            {checkIn.status}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-xs text-white/50">
          {new Date(checkIn.createdAt).toLocaleDateString()}
          {checkIn.weightKg != null && ` · ${checkIn.weightKg}kg`}
          {checkIn.sleepHours != null && ` · ${checkIn.sleepHours}h sleep`}
        </p>
        {trend && (
          <div className="flex gap-1">
            <Sparkline points={trend.history} field="weightKg" color="var(--brand-workout)" />
            <Sparkline points={trend.history} field="sleepHours" color="var(--brand-diet)" />
          </div>
        )}
      </div>
      {trend?.alerts[0] && (
        <p className="mt-1 text-[10px] text-amber-200/90">{trend.alerts[0].message}</p>
      )}
      {checkIn.coachNote && (
        <p className="mt-2 text-xs text-white/70 italic">&ldquo;{checkIn.coachNote}&rdquo;</p>
      )}
    </>
  );
}
