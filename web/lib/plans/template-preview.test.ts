import { describe, expect, it } from "vitest";
import { summarizeTemplateStructure } from "@/lib/plans/template-preview";

describe("template-preview", () => {
  it("summarizes nutrition_program macros", () => {
    const preview = summarizeTemplateStructure("nutrition_program", {
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 60,
      proteinMax: 90,
      carbsMax: 150,
      blockSlugs: ["grocery-list"],
    });
    expect(preview.nutrition?.caloriesMin).toBe(1350);
    expect(preview.nutrition?.blockSlugs).toEqual(["grocery-list"]);
    expect(preview.training).toBeNull();
  });

  it("summarizes plan bundle with training days", () => {
    const preview = summarizeTemplateStructure("plan_bundle", {
      version: 1,
      trainingBlockSlugs: ["workout-guidelines"],
      training: {
        version: 1,
        stepGoal: 10000,
        profile: { environment: "gym" },
        days: [
          {
            dayIndex: 0,
            label: "Day 1",
            muscleGroup: "chest",
            sections: [
              {
                type: "resistance",
                exercises: [{ exerciseSlug: "bench-press", reps: "8", sets: 3 }],
              },
            ],
          },
        ],
      },
    });
    expect(preview.training?.dayCount).toBe(1);
    expect(preview.training?.exerciseCount).toBe(1);
    expect(preview.trainingBlockSlugs).toEqual(["workout-guidelines"]);
  });
});
