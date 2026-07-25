import type { CheckInTrendPoint } from "@/lib/coach/trend-alerts";

type SparklineProps = {
  points: CheckInTrendPoint[];
  field: "weightKg" | "sleepHours";
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({
  points,
  field,
  width = 56,
  height = 20,
  color = "var(--brand-workout)",
}: SparklineProps) {
  const values = points.map((p) => p[field]).filter((v): v is number => v != null);
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden className="opacity-30">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
