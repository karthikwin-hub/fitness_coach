import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentBlocks,
  exercises,
  planTemplates,
} from "@/lib/db/schema";
import { installExerciseCategoryDefaults } from "@/lib/plans/exercise-categories";
import {
  getOwnedYoutubeChannelId,
  resolveExerciseVideoSource,
} from "@/lib/plans/exercise-video-source";
import { normalizeYoutubeVideoId } from "@/lib/youtube/parse-video-id";
import type { CommitResult, ImportSummary, ParsedCatalogWorkbook } from "@/lib/import/types";

export async function commitCatalogWorkbook(
  tenantId: string,
  workbook: ParsedCatalogWorkbook,
): Promise<CommitResult> {
  const summary: ImportSummary = {
    exercises: { create: 0, update: 0 },
    contentBlocks: { create: 0, update: 0 },
    planTemplates: { create: 0, update: 0 },
  };

  const categoryIds = await installExerciseCategoryDefaults(tenantId);
  const ownedChannelId = await getOwnedYoutubeChannelId(tenantId);

  for (const row of workbook.exercises) {
    if (!row.slug || !row.name) continue;

    const youtubeVideoId = row.youtubeVideoIdOrUrl
      ? normalizeYoutubeVideoId(row.youtubeVideoIdOrUrl)
      : null;
    const categoryId = row.categorySlug
      ? categoryIds.get(row.categorySlug.toLowerCase()) ?? null
      : null;
    const videoSource = resolveExerciseVideoSource(
      { videoSource: row.videoSource },
      youtubeVideoId,
      ownedChannelId,
    );

    const [existing] = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.tenantId, tenantId), eq(exercises.slug, row.slug)))
      .limit(1);

    if (existing) {
      await db
        .update(exercises)
        .set({
          name: row.name,
          youtubeVideoId,
          muscleGroup: row.muscleGroup ?? null,
          equipment: row.equipment ?? "bodyweight",
          defaultReps: row.defaultReps ?? null,
          defaultSets: row.defaultSets ?? 3,
          notes: row.notes ?? null,
          categoryId: categoryId ?? undefined,
          videoSource,
        })
        .where(eq(exercises.id, existing.id));
      summary.exercises!.update += 1;
    } else {
      await db.insert(exercises).values({
        tenantId,
        slug: row.slug,
        name: row.name,
        youtubeVideoId,
        muscleGroup: row.muscleGroup ?? null,
        equipment: row.equipment ?? "bodyweight",
        defaultReps: row.defaultReps ?? null,
        defaultSets: row.defaultSets ?? 3,
        notes: row.notes ?? null,
        categoryId,
        videoSource,
      });
      summary.exercises!.create += 1;
    }
  }

  for (const row of workbook.contentBlocks) {
    if (!row.slug || !row.category || !row.title) continue;

    const bodyJson = row.bodyJson ? JSON.parse(row.bodyJson) : {};

    const [existing] = await db
      .select({ id: contentBlocks.id })
      .from(contentBlocks)
      .where(and(eq(contentBlocks.tenantId, tenantId), eq(contentBlocks.slug, row.slug)))
      .limit(1);

    if (existing) {
      await db
        .update(contentBlocks)
        .set({
          category: row.category as typeof contentBlocks.$inferInsert.category,
          title: row.title,
          bodyJson,
        })
        .where(eq(contentBlocks.id, existing.id));
      summary.contentBlocks!.update += 1;
    } else {
      await db.insert(contentBlocks).values({
        tenantId,
        slug: row.slug,
        category: row.category as typeof contentBlocks.$inferInsert.category,
        title: row.title,
        bodyJson,
      });
      summary.contentBlocks!.create += 1;
    }
  }

  for (const row of workbook.planTemplates) {
    if (!row.key || !row.name) continue;

    const structureJson: Record<string, unknown> = {};
    if (row.trainingJson) structureJson.training = JSON.parse(row.trainingJson);
    if (row.nutritionJson) structureJson.nutrition = JSON.parse(row.nutritionJson);
    if (row.trainingBlockSlugs?.length) {
      structureJson.trainingBlockSlugs = row.trainingBlockSlugs;
    }
    if (row.nutritionBlockSlugs?.length) {
      structureJson.nutritionBlockSlugs = row.nutritionBlockSlugs;
    }

    const [existing] = await db
      .select({ id: planTemplates.id })
      .from(planTemplates)
      .where(and(eq(planTemplates.tenantId, tenantId), eq(planTemplates.key, row.key)))
      .limit(1);

    if (existing) {
      await db
        .update(planTemplates)
        .set({
          name: row.name,
          description: row.description ?? null,
          tagsJson: row.tags ?? [],
          structureJson,
          updatedAt: new Date(),
        })
        .where(eq(planTemplates.id, existing.id));
      summary.planTemplates!.update += 1;
    } else {
      await db.insert(planTemplates).values({
        tenantId,
        type: "plan_bundle",
        key: row.key,
        name: row.name,
        description: row.description ?? null,
        tagsJson: row.tags ?? [],
        structureJson,
      });
      summary.planTemplates!.create += 1;
    }
  }

  return { success: true, issues: [], summary };
}
