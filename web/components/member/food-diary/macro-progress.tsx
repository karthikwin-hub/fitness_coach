import type { MacroTotals } from "@/lib/nutrition/types";

type Targets = {
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
};

function MacroBar({
  label,
  value,
  min,
  max,
  unit = "",
}: {
  label: string;
  value: number;
  min?: number | null;
  max?: number | null;
  unit?: string;
}) {
  const target = max ?? min ?? 100;
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const range =
    min != null && max != null
      ? `${min}–${max}${unit}`
      : max != null
        ? `≤${max}${unit}`
        : min != null
          ? `≥${min}${unit}`
          : "—";

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="text-white/90">
          {Math.round(value)}
          {unit} <span className="text-white/40">/ {range}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[var(--brand-diet)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroProgress({
  totals,
  targets,
}: {
  totals: MacroTotals;
  targets: Targets | null;
}) {
  if (!targets) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)] p-4 text-sm text-white/60">
        Today: {Math.round(totals.calories)} cal · {Math.round(totals.proteinG)}g protein ·{" "}
        {Math.round(totals.carbsG)}g carbs · {Math.round(totals.fatG)}g fat
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--brand-diet)]/30 bg-[var(--brand-dark-surface)] p-4">
      <p className="text-xs text-white/40">Today&apos;s totals</p>
      <MacroBar
        label="Calories"
        value={totals.calories}
        min={targets.caloriesMin}
        max={targets.caloriesMax}
      />
      <MacroBar
        label="Protein"
        value={totals.proteinG}
        min={targets.proteinMin}
        max={targets.proteinMax}
        unit="g"
      />
      <MacroBar label="Carbs" value={totals.carbsG} max={targets.carbsMax} unit="g" />
      <MacroBar
        label="Fat"
        value={totals.fatG}
        min={targets.fatMin}
        max={targets.fatMax}
        unit="g"
      />
    </div>
  );
}
