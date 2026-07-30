const NUTRITION_CATEGORIES = new Set([
  "nutrition_tips",
  "grocery_list",
  "health_parameters",
  "sweet_cravings",
  "welcome_letter",
  "success_strategies",
]);

const WORKOUT_CATEGORIES = new Set([
  "workout_guidelines",
  "stretching_routine",
  "cardio_finisher",
]);

export type ContentBlockCategoryGroup = "all" | "nutrition" | "workout" | "other";

export function contentBlockCategoryGroup(category: string): ContentBlockCategoryGroup {
  if (NUTRITION_CATEGORIES.has(category)) return "nutrition";
  if (WORKOUT_CATEGORIES.has(category)) return "workout";
  return "other";
}

export const CONTENT_BLOCK_FILTER_CHIPS: { id: ContentBlockCategoryGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "nutrition", label: "Nutrition" },
  { id: "workout", label: "Workout" },
  { id: "other", label: "Other" },
];

export function filterBlocksByCategoryGroup<
  T extends { category: string },
>(blocks: T[], group: ContentBlockCategoryGroup): T[] {
  if (group === "all") return blocks;
  return blocks.filter((b) => contentBlockCategoryGroup(b.category) === group);
}
