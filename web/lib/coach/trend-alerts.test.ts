import { describe, expect, it } from "vitest";
import {
  buildCheckInHistory,
  computeTrendAlerts,
} from "@/lib/coach/trend-alerts";

describe("computeTrendAlerts", () => {
  it("flags missed check-ins", () => {
    const alerts = computeTrendAlerts({ checkIns: [] });
    expect(alerts.some((a) => a.code === "missed_checkins")).toBe(true);
  });

  it("builds 7-day history", () => {
    const history = buildCheckInHistory(
      [{ createdAt: new Date().toISOString(), weightKg: 72, sleepHours: 7 }],
      7,
    );
    expect(history).toHaveLength(7);
    expect(history.some((h) => h.weightKg === 72)).toBe(true);
  });
});
