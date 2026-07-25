export const WORKOUT_GUIDELINE_CATEGORIES = [
  "workout_guidelines",
  "stretching_routine",
  "cardio_finisher",
] as const;

export function isWorkoutGuidelineCategory(category: string): boolean {
  return (WORKOUT_GUIDELINE_CATEGORIES as readonly string[]).includes(category);
}
