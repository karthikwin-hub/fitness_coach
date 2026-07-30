import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { exerciseCategories, exercises } from "@/lib/db/schema";

export const DEFAULT_EXERCISE_CATEGORIES = [
  { slug: "legs", name: "Legs", sortOrder: 0 },
  { slug: "back", name: "Back", sortOrder: 1 },
  { slug: "shoulders", name: "Shoulders", sortOrder: 2 },
  { slug: "uncategorized", name: "Uncategorized", sortOrder: 99 },
] as const;

const MUSCLE_GROUP_TO_CATEGORY: Record<string, string> = {
  legs: "legs",
  back: "back",
  shoulders: "shoulders",
};

export async function installExerciseCategoryDefaults(tenantId: string) {
  const existing = await db
    .select({ id: exerciseCategories.id, slug: exerciseCategories.slug })
    .from(exerciseCategories)
    .where(eq(exerciseCategories.tenantId, tenantId));

  const idBySlug = new Map(existing.map((r) => [r.slug, r.id]));

  for (const seed of DEFAULT_EXERCISE_CATEGORIES) {
    if (idBySlug.has(seed.slug)) continue;
    const [inserted] = await db
      .insert(exerciseCategories)
      .values({
        tenantId,
        slug: seed.slug,
        name: seed.name,
        sortOrder: seed.sortOrder,
      })
      .returning({ id: exerciseCategories.id, slug: exerciseCategories.slug });
    if (inserted) idBySlug.set(inserted.slug, inserted.id);
  }

  const uncategorizedId = idBySlug.get("uncategorized");
  if (!uncategorizedId) return idBySlug;

  const rows = await db
    .select({
      id: exercises.id,
      muscleGroup: exercises.muscleGroup,
      categoryId: exercises.categoryId,
    })
    .from(exercises)
    .where(and(eq(exercises.tenantId, tenantId), isNull(exercises.categoryId)));

  for (const row of rows) {
    const slug = row.muscleGroup
      ? MUSCLE_GROUP_TO_CATEGORY[row.muscleGroup.toLowerCase()] ?? "uncategorized"
      : "uncategorized";
    const categoryId = idBySlug.get(slug) ?? uncategorizedId;
    await db
      .update(exercises)
      .set({ categoryId })
      .where(eq(exercises.id, row.id));
  }

  return idBySlug;
}
