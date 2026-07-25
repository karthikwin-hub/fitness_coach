import { describe, expect, it } from "vitest";
import { routeQuizOutcome, scoreIntent } from "@/lib/quiz/scoring";

describe("scoreIntent", () => {
  it("scores high commitment highest", () => {
    expect(
      scoreIntent({
        commitment: "high",
        goal: "fat_loss",
        struggle: "consistency",
        location: "india",
      }),
    ).toBe(80);
  });

  it("adds partial score for medium commitment", () => {
    expect(scoreIntent({ commitment: "medium", goal: "fat_loss" })).toBe(30);
  });
});

describe("routeQuizOutcome", () => {
  it("routes high commitment to coaching", () => {
    const result = routeQuizOutcome({
      commitment: "high",
      goal: "fat_loss",
      struggle: "time",
      location: "us",
      diet: "western",
    });
    expect(result.routedTo).toBe("coaching");
    expect(result.intentScore).toBeGreaterThanOrEqual(40);
  });

  it("routes medium commitment with score >= 50 to coaching", () => {
    const result = routeQuizOutcome({
      commitment: "medium",
      goal: "fat_loss",
      struggle: "consistency",
      location: "india",
      diet: "indian",
    });
    expect(result.intentScore).toBeGreaterThanOrEqual(50);
    expect(result.routedTo).toBe("coaching");
  });

  it("routes low commitment to waitlist", () => {
    const result = routeQuizOutcome({
      commitment: "low",
      goal: "general_health",
      struggle: "time",
      location: "other",
      diet: "hybrid",
    });
    expect(result.routedTo).toBe("waitlist");
  });
});
