import { describe, expect, it } from "vitest";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";

describe("analyzeMealPhoto stub", () => {
  it("auto-approve threshold met with lenient macro targets", async () => {
    const result = await analyzeMealPhoto("https://example.com/meal.jpg", {
      caloriesMin: 400,
      caloriesMax: 600,
      proteinMin: 20,
      proteinMax: 40,
      carbsMax: 50,
    });
    expect(result.complianceScore).toBeGreaterThanOrEqual(0.85);
  });

  it("flags low compliance against strict protein targets", async () => {
    const result = await analyzeMealPhoto("https://example.com/meal.jpg", {
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 60,
      proteinMax: 90,
      carbsMax: 150,
    });
    expect(result.complianceScore).toBeLessThan(0.85);
    expect(result.flags.length).toBeGreaterThan(0);
  });
});
