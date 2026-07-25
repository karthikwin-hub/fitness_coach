import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  exercises,
  trainingDays,
  trainingPlans,
  trainingSectionExercises,
  trainingSections,
} from "@/lib/db/schema";

type DayInput = {
  dayIndex: number;
  label: string;
  muscleGroup?: string;
  sections: Array<{
    type: "warmup" | "resistance" | "core" | "cardio" | "stretch";
    restNote?: string;
    sortOrder?: number;
    exercises: Array<{
      exerciseId: string;
      supersetGroup?: string;
      reps: string;
      sets?: number;
      sortOrder?: number;
    }>;
  }>;
};

export async function cloneTrainingPlan(
  sourcePlanId: string,
  memberId: string,
  weekNumber: number,
) {
  const [source] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, sourcePlanId))
    .limit(1);

  if (!source) throw new Error("Source plan not found");

  const full = await getTrainingPlanWithDays(sourcePlanId);
  if (!full) throw new Error("Source plan not found");

  const [newPlan] = await db
    .insert(trainingPlans)
    .values({
      tenantId: source.tenantId,
      memberId,
      weekNumber,
      stepGoal: source.stepGoal,
      blockIdsJson: source.blockIdsJson,
      templateType: source.templateType,
      status: "draft",
    })
    .returning();

  await createTrainingDays(newPlan.id, full.days);
  return newPlan;
}

export async function createTrainingDays(planId: string, days: DayInput[]) {
  for (const day of days) {
    const [newDay] = await db
      .insert(trainingDays)
      .values({
        planId,
        dayIndex: day.dayIndex,
        label: day.label,
        muscleGroup: day.muscleGroup,
      })
      .returning();

    for (const [si, section] of day.sections.entries()) {
      const [newSection] = await db
        .insert(trainingSections)
        .values({
          dayId: newDay.id,
          type: section.type,
          restNote: section.restNote,
          sortOrder: section.sortOrder ?? si,
        })
        .returning();

      if (section.exercises.length > 0) {
        await db.insert(trainingSectionExercises).values(
          section.exercises.map((ex, ei) => ({
            sectionId: newSection.id,
            exerciseId: ex.exerciseId,
            supersetGroup: ex.supersetGroup,
            reps: ex.reps,
            sets: ex.sets ?? 3,
            sortOrder: ex.sortOrder ?? ei,
          })),
        );
      }
    }
  }
}

export async function getTrainingPlanWithDays(planId: string) {
  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  const days = await db
    .select()
    .from(trainingDays)
    .where(eq(trainingDays.planId, planId));

  const daysWithSections: DayInput[] = [];

  for (const day of days) {
    const sections = await db
      .select()
      .from(trainingSections)
      .where(eq(trainingSections.dayId, day.id));

    const sectionInputs: DayInput["sections"] = [];

    for (const section of sections) {
      const exRows = await db
        .select({
          exerciseId: trainingSectionExercises.exerciseId,
          supersetGroup: trainingSectionExercises.supersetGroup,
          reps: trainingSectionExercises.reps,
          sets: trainingSectionExercises.sets,
          sortOrder: trainingSectionExercises.sortOrder,
        })
        .from(trainingSectionExercises)
        .where(eq(trainingSectionExercises.sectionId, section.id));

      sectionInputs.push({
        type: section.type,
        restNote: section.restNote ?? undefined,
        sortOrder: section.sortOrder,
        exercises: exRows.map((r) => ({
          exerciseId: r.exerciseId,
          supersetGroup: r.supersetGroup ?? undefined,
          reps: r.reps,
          sets: r.sets,
          sortOrder: r.sortOrder,
        })),
      });
    }

    daysWithSections.push({
      dayIndex: day.dayIndex,
      label: day.label,
      muscleGroup: day.muscleGroup ?? undefined,
      sections: sectionInputs,
    });
  }

  return { ...plan, days: daysWithSections };
}

export async function createTrainingPlanFromInput(
  tenantId: string,
  memberId: string,
  input: {
    weekNumber: number;
    stepGoal?: number;
    templateType?: "training_gym" | "training_home";
    days: DayInput[];
  },
) {
  const [plan] = await db
    .insert(trainingPlans)
    .values({
      tenantId,
      memberId,
      weekNumber: input.weekNumber,
      stepGoal: input.stepGoal,
      templateType: input.templateType,
      status: "draft",
    })
    .returning();

  await createTrainingDays(plan.id, input.days);
  return plan;
}

export async function unpublishOtherTrainingPlans(
  memberId: string,
  exceptPlanId: string,
) {
  await db
    .update(trainingPlans)
    .set({ status: "draft" })
    .where(
      and(
        eq(trainingPlans.memberId, memberId),
        eq(trainingPlans.status, "published"),
      ),
    );
  await db
    .update(trainingPlans)
    .set({ status: "published" })
    .where(eq(trainingPlans.id, exceptPlanId));
}

export async function unpublishOtherNutritionPlans(
  memberId: string,
  exceptPlanId: string,
) {
  const { nutritionPlans } = await import("@/lib/db/schema");
  await db
    .update(nutritionPlans)
    .set({ status: "draft" })
    .where(
      and(
        eq(nutritionPlans.memberId, memberId),
        eq(nutritionPlans.status, "published"),
      ),
    );
  await db
    .update(nutritionPlans)
    .set({ status: "published" })
    .where(eq(nutritionPlans.id, exceptPlanId));
}

export async function getExerciseCatalog(tenantId: string) {
  return db.select().from(exercises).where(eq(exercises.tenantId, tenantId));
}

export async function deleteTrainingPlanDays(planId: string) {
  const days = await db
    .select({ id: trainingDays.id })
    .from(trainingDays)
    .where(eq(trainingDays.planId, planId));

  for (const day of days) {
    const sections = await db
      .select({ id: trainingSections.id })
      .from(trainingSections)
      .where(eq(trainingSections.dayId, day.id));

    for (const section of sections) {
      await db
        .delete(trainingSectionExercises)
        .where(eq(trainingSectionExercises.sectionId, section.id));
    }
    await db.delete(trainingSections).where(eq(trainingSections.dayId, day.id));
  }
  await db.delete(trainingDays).where(eq(trainingDays.planId, planId));
}

export async function replaceTrainingPlanStructure(
  planId: string,
  days: DayInput[],
) {
  await deleteTrainingPlanDays(planId);
  await createTrainingDays(planId, days);
  await db
    .update(trainingPlans)
    .set({ updatedAt: new Date() })
    .where(eq(trainingPlans.id, planId));
}
