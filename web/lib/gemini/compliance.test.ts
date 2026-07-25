import { describe, expect, it } from "vitest";
import { scoreCompliance } from "@/lib/gemini/compliance";

describe("scoreCompliance", () => {
  it("returns perfect score when within targets", () => {
    const { score, flags } = scoreCompliance(
      { calories: 500, proteinG: 30, carbsG: 40, fatG: 15 },
      {
        caloriesMin: 450,
        caloriesMax: 550,
        proteinMin: 25,
        proteinMax: 35,
        carbsMax: 50,
      },
    );
    expect(score).toBe(1);
    expect(flags).toHaveLength(0);
  });

  it("flags low protein and reduces score", () => {
    const { score, flags } = scoreCompliance(
      { calories: 500, proteinG: 10, carbsG: 40, fatG: 15 },
      { proteinMin: 25, caloriesMax: 600 },
    );
    expect(score).toBeLessThan(1);
    expect(flags.some((f) => f.includes("Protein low"))).toBe(true);
  });

  it("flags high calories", () => {
    const { flags } = scoreCompliance(
      { calories: 900, proteinG: 30, carbsG: 40, fatG: 15 },
      { caloriesMax: 600 },
    );
    expect(flags.some((f) => f.includes("Calories high"))).toBe(true);
  });
});
