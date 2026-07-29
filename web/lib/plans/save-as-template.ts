import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  exercises,
  nutritionPlans,
  planTemplates,
  trainingPlans,
} from "@/lib/db/schema";
import {
  blockIdsToSlugs,
  type NutritionTemplate,
  type PlanBundleStructure,
  serializePlanBundleStructure,
} from "@/lib/plans/template-bundle";
import {
  type TrainingTemplateStructure,
  type TemplateDay,
} from "@/lib/plans/templates";
import { generateTemplateCode } from "@/lib/plans/template-code";
import { getTrainingPlanWithDays } from "@/lib/plans/training";

async function trainingPlanToStructure(
  tenantId: string,
  planId: string,
): Promise<TrainingTemplateStructure> {
  const full = await getTrainingPlanWithDays(planId);
  if (!full) throw new Error("Training plan not found");

  const catalog = await db
    .select({ id: exercises.id, slug: exercises.slug })
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId));

  const slugById: Record<string, string> = {};
  for (const ex of catalog) {
    if (ex.slug) slugById[ex.id] = ex.slug;
  }

  const missing = new Set<string>();
  const days: TemplateDay[] = full.days.map((day) => ({
    dayIndex: day.dayIndex,
    label: day.label,
    muscleGroup: day.muscleGroup,
    sections: day.sections.map((section) => ({
      type: section.type,
      restNote: section.restNote,
      exercises: section.exercises.map((row) => {
        const slug = slugById[row.exerciseId];
        if (!slug) missing.add(row.exerciseId);
        return {
          exerciseSlug: slug ?? row.exerciseId,
          reps: row.reps,
          sets: row.sets ?? 3,
          ...(row.supersetGroup ? { supersetGroup: row.supersetGroup } : {}),
        };
      }),
    })),
  }));

  if (missing.size > 0) {
    throw new Error(
      "Some exercises are missing slugs — add slugs in the exercise catalog before saving as template",
    );
  }

  const environment =
    full.templateType === "training_home"
      ? "home"
      : full.templateType === "training_gym"
        ? "gym"
        : "gym";

  return {
    version: 1,
    stepGoal: full.stepGoal ?? 10000,
    profile: { environment },
    days,
  };
}

async function nutritionPlanToTemplate(
  tenantId: string,
  planId: string,
): Promise<NutritionTemplate> {
  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.id, planId))
    .limit(1);

  if (!plan) throw new Error("Nutrition plan not found");

  const blockIds = (plan.blockIdsJson as string[]) ?? [];
  const blockSlugs = await blockIdsToSlugs(tenantId, blockIds);

  return {
    caloriesMin: plan.caloriesMin,
    caloriesMax: plan.caloriesMax,
    proteinMin: plan.proteinMin,
    proteinMax: plan.proteinMax,
    carbsMax: plan.carbsMax,
    fatMin: plan.fatMin,
    fatMax: plan.fatMax,
    blockSlugs,
  };
}

export async function saveMemberWeekAsTemplate(
  tenantId: string,
  input: {
    memberId: string;
    weekNumber?: number;
    trainingPlanId?: string;
    nutritionPlanId?: string;
    name: string;
    key?: string;
    description?: string;
    tags?: string[];
  },
) {
  let trainingPlanId = input.trainingPlanId;
  let nutritionPlanId = input.nutritionPlanId;

  if (!trainingPlanId && input.weekNumber != null) {
    const [row] = await db
      .select({ id: trainingPlans.id })
      .from(trainingPlans)
      .where(
        and(
          eq(trainingPlans.tenantId, tenantId),
          eq(trainingPlans.memberId, input.memberId),
          eq(trainingPlans.weekNumber, input.weekNumber),
        ),
      )
      .limit(1);
    trainingPlanId = row?.id;
  }

  if (!nutritionPlanId && input.weekNumber != null) {
    const [row] = await db
      .select({ id: nutritionPlans.id })
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.tenantId, tenantId),
          eq(nutritionPlans.memberId, input.memberId),
          eq(nutritionPlans.weekNumber, input.weekNumber),
        ),
      )
      .limit(1);
    nutritionPlanId = row?.id;
  }

  if (!trainingPlanId && !nutritionPlanId) {
    throw new Error("No training or nutrition plan found for this member/week");
  }

  const bundle: PlanBundleStructure = {
    version: 1,
    trainingBlockSlugs: [],
  };

  if (trainingPlanId) {
    const [trainingRow] = await db
      .select()
      .from(trainingPlans)
      .where(
        and(
          eq(trainingPlans.id, trainingPlanId),
          eq(trainingPlans.tenantId, tenantId),
          eq(trainingPlans.memberId, input.memberId),
        ),
      )
      .limit(1);

    if (!trainingRow) throw new Error("Training plan not found for member");

    bundle.training = await trainingPlanToStructure(tenantId, trainingPlanId);
    const blockIds = (trainingRow.blockIdsJson as string[]) ?? [];
    bundle.trainingBlockSlugs = await blockIdsToSlugs(tenantId, blockIds);
  }

  if (nutritionPlanId) {
    const [nutritionRow] = await db
      .select()
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.id, nutritionPlanId),
          eq(nutritionPlans.tenantId, tenantId),
          eq(nutritionPlans.memberId, input.memberId),
        ),
      )
      .limit(1);

    if (!nutritionRow) throw new Error("Nutrition plan not found for member");

    bundle.nutrition = await nutritionPlanToTemplate(tenantId, nutritionPlanId);
  }

  const key = input.key?.trim() || (await generateTemplateCode(tenantId));
  const structureJson = serializePlanBundleStructure(bundle);

  const [template] = await db
    .insert(planTemplates)
    .values({
      tenantId,
      type: "plan_bundle",
      key,
      name: input.name,
      description: input.description ?? null,
      tagsJson: input.tags ?? [],
      sourceMemberId: input.memberId,
      structureJson,
    })
    .returning();

  return template;
}
