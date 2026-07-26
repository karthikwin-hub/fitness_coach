import { describe, expect, it } from "vitest";
import { deriveJourneyEmptyState } from "@/lib/members/journey-empty-state";
import type { WindowMeta } from "@/lib/members/program-journey";

const window: WindowMeta = {
  index: 0,
  from: "2026-01-01",
  to: "2026-03-31",
  totalWindows: 1,
  hasPrev: false,
  hasNext: false,
};

const zeroStats = {
  checkInsInWindow: 0,
  deliveriesInWindow: 0,
  appointmentsInWindow: 0,
  trainingPublishedInWindow: 0,
  nutritionPublishedInWindow: 0,
};

describe("deriveJourneyEmptyState", () => {
  it("returns no_program when nothing is configured", () => {
    const state = deriveJourneyEmptyState({
      programStartDate: null,
      programEndDate: null,
      publishedTrainingCount: 0,
      publishedNutritionCount: 0,
      stats: zeroStats,
      window,
    });
    expect(state?.kind).toBe("no_program");
  });

  it("returns waiting_for_plans when program exists but no published plans", () => {
    const state = deriveJourneyEmptyState({
      programStartDate: "2026-07-01",
      programEndDate: "2026-12-31",
      publishedTrainingCount: 0,
      publishedNutritionCount: 0,
      stats: zeroStats,
      window,
    });
    expect(state?.kind).toBe("waiting_for_plans");
  });

  it("returns empty_period when plans exist but window is empty", () => {
    const state = deriveJourneyEmptyState({
      programStartDate: "2026-07-01",
      programEndDate: "2026-12-31",
      publishedTrainingCount: 1,
      publishedNutritionCount: 1,
      stats: zeroStats,
      window: { ...window, totalWindows: 3, hasNext: true },
    });
    expect(state?.kind).toBe("empty_period");
  });

  it("returns null when the window has activity", () => {
    const state = deriveJourneyEmptyState({
      programStartDate: "2026-07-01",
      programEndDate: "2026-12-31",
      publishedTrainingCount: 1,
      publishedNutritionCount: 1,
      stats: { ...zeroStats, checkInsInWindow: 2 },
      window,
    });
    expect(state).toBeNull();
  });
});
