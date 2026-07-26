import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentBlocks, exercises, planTemplates } from "@/lib/db/schema";
import { contentBlockSeeds } from "@/lib/db/content-block-seeds";
import { EXERCISE_CATALOG } from "@/lib/plans/exercise-catalog";
import {
  GYM_W1_TEMPLATE,
  HOME_W21_TEMPLATE,
  TRAINING_TEMPLATES,
} from "@/lib/plans/templates";

/**
 * Install default exercise catalog, training templates, and content blocks
 * for a tenant. Idempotent — skips rows that already exist by slug/key.
 */
export async function installTenantPlanDefaults(tenantId: string) {
  // Exercises by slug
  const existingExercises = await db
    .select({ slug: exercises.slug, name: exercises.name })
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId));
  const existingSlugs = new Set(
    existingExercises.map((e) => e.slug).filter(Boolean) as string[],
  );
  const existingNames = new Set(existingExercises.map((e) => e.name));

  for (const seed of EXERCISE_CATALOG) {
    if (existingSlugs.has(seed.slug)) continue;

    // Backfill slug onto legacy name-matched rows
    if (existingNames.has(seed.name)) {
      await db
        .update(exercises)
        .set({
          slug: seed.slug,
          youtubeVideoId: seed.youtubeVideoId,
          muscleGroup: seed.muscleGroup,
          equipment: seed.equipment,
          defaultReps: seed.defaultReps,
          defaultSets: seed.defaultSets,
        })
        .where(
          and(
            eq(exercises.tenantId, tenantId),
            eq(exercises.name, seed.name),
            isNull(exercises.slug),
          ),
        );
      existingSlugs.add(seed.slug);
      continue;
    }

    await db.insert(exercises).values({
      tenantId,
      slug: seed.slug,
      name: seed.name,
      youtubeVideoId: seed.youtubeVideoId,
      muscleGroup: seed.muscleGroup,
      equipment: seed.equipment,
      defaultReps: seed.defaultReps,
      defaultSets: seed.defaultSets,
    });
    existingSlugs.add(seed.slug);
  }

  // Training templates by key
  const existingTemplates = await db
    .select({ key: planTemplates.key, type: planTemplates.type })
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, tenantId));
  const existingKeys = new Set(
    existingTemplates.map((t) => t.key).filter(Boolean) as string[],
  );

  for (const tpl of TRAINING_TEMPLATES) {
    if (existingKeys.has(tpl.key)) {
      // Refresh structure for known keys so seed upgrades apply
      await db
        .update(planTemplates)
        .set({
          name: tpl.name,
          structureJson: tpl.structure,
        })
        .where(
          and(
            eq(planTemplates.tenantId, tenantId),
            eq(planTemplates.key, tpl.key),
          ),
        );
      continue;
    }

    // Migrate legacy type-only rows (no key)
    const legacy = existingTemplates.find(
      (t) => !t.key && t.type === tpl.type,
    );
    if (legacy) {
      await db
        .update(planTemplates)
        .set({
          key: tpl.key,
          name: tpl.name,
          structureJson: tpl.structure,
        })
        .where(
          and(
            eq(planTemplates.tenantId, tenantId),
            eq(planTemplates.type, tpl.type),
            isNull(planTemplates.key),
          ),
        );
      continue;
    }

    await db.insert(planTemplates).values({
      tenantId,
      type: tpl.type,
      key: tpl.key,
      name: tpl.name,
      structureJson: tpl.structure,
    });
  }

  // Content blocks by slug (skip health-parameters — member-specific at delivery)
  const existingBlocks = await db
    .select({ slug: contentBlocks.slug })
    .from(contentBlocks)
    .where(eq(contentBlocks.tenantId, tenantId));
  const blockSlugs = new Set(existingBlocks.map((b) => b.slug));

  for (const seed of contentBlockSeeds) {
    if (seed.slug === "health-parameters") continue; // replaced by dynamic health block
    if (blockSlugs.has(seed.slug)) {
      await db
        .update(contentBlocks)
        .set({
          title: seed.title,
          bodyJson: seed.bodyJson,
          category: seed.category,
          sortOrder: seed.sortOrder,
        })
        .where(
          and(
            eq(contentBlocks.tenantId, tenantId),
            eq(contentBlocks.slug, seed.slug),
          ),
        );
      continue;
    }
    await db.insert(contentBlocks).values({
      tenantId,
      slug: seed.slug,
      category: seed.category,
      title: seed.title,
      bodyJson: seed.bodyJson,
      sortOrder: seed.sortOrder,
    });
  }

  return {
    exercises: EXERCISE_CATALOG.length,
    templates: [GYM_W1_TEMPLATE.key, HOME_W21_TEMPLATE.key],
  };
}
