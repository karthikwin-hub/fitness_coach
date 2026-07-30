import type { NutritionTemplate } from "@/lib/plans/template-bundle";

/** Tenant-neutral built-in nutrition program (refreshed on install). */
export const NUTRITION_PROGRAM_TEMPLATE = {
  type: "nutrition_program" as const,
  key: "nutrition_program",
  name: "Default nutrition program",
  description: "Starter macro ranges with core nutrition tip blocks.",
  structure: {
    caloriesMin: 1350,
    caloriesMax: 1450,
    proteinMin: 70,
    proteinMax: 90,
    carbsMax: 140,
    fatMin: 40,
    fatMax: 50,
    blockSlugs: ["nutrition-tips-core", "grocery-list", "week-macros-guide"],
  } satisfies NutritionTemplate,
};
