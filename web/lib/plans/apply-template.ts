import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { exercises, nutritionPlans, planTemplates, trainingPlans } from "@/lib/db/schema";
import {
  extractNutritionFromTemplate,
  extractTrainingBlockSlugsFromTemplate,
  extractTrainingFromTemplate,
} from "@/lib/plans/template-bundle";
import { resolveBlockSlugsToIds } from "@/lib/plans/template-bundle-db";
import { buildExerciseMapBySlugWithOwnedPreference } from "@/lib/plans/prefer-owned-exercise";
import { resolveTemplateDays } from "@/lib/plans/templates";
import { createTrainingPlanFromInput } from "@/lib/plans/training";

export async function getPlanTemplateByKeyOrId(
  tenantId: string,
  keyOrId: string,
) {
  const [row] = await db
    .select()
    .from(planTemplates)
    .where(
      and(
        eq(planTemplates.tenantId, tenantId),
        or(eq(planTemplates.id, keyOrId), eq(planTemplates.key, keyOrId)),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function applyPlanBundleTemplate(
  tenantId: string,
  templateId: string,
  memberId: string,
  weekNumber: number,
) {
  const template = await getPlanTemplateByKeyOrId(tenantId, templateId);
  if (!template) throw new Error("Template not found");

  const result: {
    trainingPlanId?: string;
    nutritionPlanId?: string;
  } = {};

  const trainingStructure = extractTrainingFromTemplate(
    template.type,
    template.structureJson,
  );

  if (trainingStructure) {
    const catalog = await db
      .select()
      .from(exercises)
      .where(eq(exercises.tenantId, tenantId));

    const exerciseMapBySlug = buildExerciseMapBySlugWithOwnedPreference(catalog);

    const days = resolveTemplateDays(trainingStructure, exerciseMapBySlug);
    const trainingBlockSlugs = extractTrainingBlockSlugsFromTemplate(
      template.type,
      template.structureJson,
    );
    const trainingBlockIds = await resolveBlockSlugsToIds(
      tenantId,
      trainingBlockSlugs,
    );

    const templateType =
      trainingStructure.profile.environment === "home"
        ? "training_home"
        : "training_gym";

    const plan = await createTrainingPlanFromInput(tenantId, memberId, {
      weekNumber,
      stepGoal: trainingStructure.stepGoal,
      templateType,
      days,
    });

    if (trainingBlockIds.length > 0) {
      await db
        .update(trainingPlans)
        .set({ blockIdsJson: trainingBlockIds })
        .where(eq(trainingPlans.id, plan.id));
    }

    result.trainingPlanId = plan.id;
  }

  const nutritionStructure = extractNutritionFromTemplate(
    template.type,
    template.structureJson,
  );

  if (nutritionStructure) {
    const blockIds = await resolveBlockSlugsToIds(
      tenantId,
      nutritionStructure.blockSlugs ?? [],
    );

    const [plan] = await db
      .insert(nutritionPlans)
      .values({
        tenantId,
        memberId,
        weekNumber,
        caloriesMin: nutritionStructure.caloriesMin ?? null,
        caloriesMax: nutritionStructure.caloriesMax ?? null,
        proteinMin: nutritionStructure.proteinMin ?? null,
        proteinMax: nutritionStructure.proteinMax ?? null,
        carbsMax: nutritionStructure.carbsMax ?? null,
        fatMin: nutritionStructure.fatMin ?? null,
        fatMax: nutritionStructure.fatMax ?? null,
        blockIdsJson: blockIds,
        status: "draft",
      })
      .returning();

    result.nutritionPlanId = plan.id;
  }

  return result;
}

/** Apply training-only portion from any template row (training_* or plan_bundle). */
export async function applyTrainingFromTemplateRow(
  tenantId: string,
  template: typeof planTemplates.$inferSelect,
  memberId: string,
  weekNumber: number,
) {
  const structure = extractTrainingFromTemplate(
    template.type,
    template.structureJson,
  );
  if (!structure) {
    throw new Error("Template has no training structure");
  }

  const catalog = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId));

  const exerciseMapBySlug = buildExerciseMapBySlugWithOwnedPreference(catalog);

  const days = resolveTemplateDays(structure, exerciseMapBySlug);
  const trainingBlockSlugs = extractTrainingBlockSlugsFromTemplate(
    template.type,
    template.structureJson,
  );
  const trainingBlockIds = await resolveBlockSlugsToIds(
    tenantId,
    trainingBlockSlugs,
  );

  const templateKey = template.key ?? template.type;
  const templateType =
    templateKey === "training_home" || structure.profile.environment === "home"
      ? "training_home"
      : "training_gym";

  const plan = await createTrainingPlanFromInput(tenantId, memberId, {
    weekNumber,
    stepGoal: structure.stepGoal,
    templateType,
    days,
  });

  if (trainingBlockIds.length > 0) {
    await db
      .update(trainingPlans)
      .set({ blockIdsJson: trainingBlockIds })
      .where(eq(trainingPlans.id, plan.id));
  }

  return plan;
}

/** Apply nutrition portion from nutrition_program or plan_bundle template. */
export async function applyNutritionFromTemplateRow(
  tenantId: string,
  template: typeof planTemplates.$inferSelect,
  memberId: string,
  weekNumber: number,
) {
  const nutrition = extractNutritionFromTemplate(
    template.type,
    template.structureJson,
  );
  if (!nutrition) {
    throw new Error("Template has no nutrition structure");
  }

  const blockIds = await resolveBlockSlugsToIds(
    tenantId,
    nutrition.blockSlugs ?? [],
  );

  const [plan] = await db
    .insert(nutritionPlans)
    .values({
      tenantId,
      memberId,
      weekNumber,
      caloriesMin: nutrition.caloriesMin ?? null,
      caloriesMax: nutrition.caloriesMax ?? null,
      proteinMin: nutrition.proteinMin ?? null,
      proteinMax: nutrition.proteinMax ?? null,
      carbsMax: nutrition.carbsMax ?? null,
      fatMin: nutrition.fatMin ?? null,
      fatMax: nutrition.fatMax ?? null,
      blockIdsJson: blockIds,
      status: "draft",
    })
    .returning();

  return plan;
}
