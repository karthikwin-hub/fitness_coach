import { describe, expect, it } from "vitest";
import { computeMacroTotals, scoreDailyCompliance } from "@/lib/nutrition/diary";

describe("computeMacroTotals", () => {
  it("sums calories and macros across entries", () => {
    const totals = computeMacroTotals([
      { calories: 300, proteinG: 20, carbsG: 30, fatG: 10 },
      { calories: 450, proteinG: 35, carbsG: 40, fatG: 15 },
    ]);

    expect(totals).toEqual({
      calories: 750,
      proteinG: 55,
      carbsG: 70,
      fatG: 25,
    });
  });

  it("returns zeros for empty diary", () => {
    expect(computeMacroTotals([])).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  });
});

describe("scoreDailyCompliance", () => {
  it("flags high carbs against plan targets", () => {
    const { flags, score } = scoreDailyCompliance(
      { calories: 1800, proteinG: 120, carbsG: 200, fatG: 55 },
      {
        caloriesMin: 1600,
        caloriesMax: 2000,
        proteinMin: 100,
        proteinMax: 140,
        carbsMax: 150,
        fatMin: 45,
        fatMax: 70,
      },
    );

    expect(score).toBeLessThan(1);
    expect(flags.some((f) => f.includes("Carbs"))).toBe(true);
  });
});
