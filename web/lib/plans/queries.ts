import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contentBlocks,
  exercises,
  members,
  nutritionPlans,
  planPublications,
  tenants,
  trainingDays,
  trainingPlans,
  trainingSectionExercises,
  trainingSections,
  users,
} from "@/lib/db/schema";

export async function getTenantIdBySlug(slug: string) {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return tenant?.id;
}

async function hydratePlanBlocks(blockIds: string[]) {
  if (blockIds.length === 0) return [];
  const blocks = await db
    .select()
    .from(contentBlocks)
    .where(inArray(contentBlocks.id, blockIds));
  blocks.sort(
    (a, b) =>
      blockIds.indexOf(a.id) - blockIds.indexOf(b.id) || a.sortOrder - b.sortOrder,
  );
  return blocks;
}

type SectionExerciseRow = {
  sectionId: string;
  id: string;
  supersetGroup: string | null;
  reps: string | null;
  sets: number | null;
  sortOrder: number;
  exercise: typeof exercises.$inferSelect;
};

async function hydrateTrainingPlanStructure(planId: string) {
  const days = await db
    .select()
    .from(trainingDays)
    .where(eq(trainingDays.planId, planId))
    .orderBy(asc(trainingDays.dayIndex));

  if (days.length === 0) return [];

  const dayIds = days.map((day) => day.id);
  const sections = await db
    .select()
    .from(trainingSections)
    .where(inArray(trainingSections.dayId, dayIds))
    .orderBy(asc(trainingSections.sortOrder));

  const sectionIds = sections.map((section) => section.id);
  let exerciseRows: SectionExerciseRow[] = [];

  if (sectionIds.length > 0) {
    exerciseRows = await db
      .select({
        sectionId: trainingSectionExercises.sectionId,
        id: trainingSectionExercises.id,
        supersetGroup: trainingSectionExercises.supersetGroup,
        reps: trainingSectionExercises.reps,
        sets: trainingSectionExercises.sets,
        sortOrder: trainingSectionExercises.sortOrder,
        exercise: exercises,
      })
      .from(trainingSectionExercises)
      .innerJoin(exercises, eq(trainingSectionExercises.exerciseId, exercises.id))
      .where(inArray(trainingSectionExercises.sectionId, sectionIds))
      .orderBy(asc(trainingSectionExercises.sortOrder));
  }

  const exercisesBySection = new Map<string, SectionExerciseRow[]>();
  for (const row of exerciseRows) {
    const list = exercisesBySection.get(row.sectionId) ?? [];
    list.push(row);
    exercisesBySection.set(row.sectionId, list);
  }

  const sectionsByDay = new Map<
    string,
    Array<(typeof sections)[number] & { exercises: SectionExerciseRow[] }>
  >();
  for (const section of sections) {
    const list = sectionsByDay.get(section.dayId) ?? [];
    list.push({
      ...section,
      exercises: exercisesBySection.get(section.id) ?? [],
    });
    sectionsByDay.set(section.dayId, list);
  }

  return days.map((day) => ({
    ...day,
    sections: sectionsByDay.get(day.id) ?? [],
  }));
}

export async function getPublishedTrainingPlan(memberId: string) {
  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(
      and(
        eq(trainingPlans.memberId, memberId),
        eq(trainingPlans.status, "published"),
      ),
    )
    .orderBy(desc(trainingPlans.weekNumber))
    .limit(1);

  if (!plan) return null;

  const blockIds = (plan.blockIdsJson as string[]) ?? [];
  const blocks = await hydratePlanBlocks(blockIds);
  const days = await hydrateTrainingPlanStructure(plan.id);

  return { ...plan, blocks, days };
}

export async function getTrainingPlanById(planId: string) {
  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  const blockIds = (plan.blockIdsJson as string[]) ?? [];
  const blocks = await hydratePlanBlocks(blockIds);
  const days = await hydrateTrainingPlanStructure(plan.id);
  return { ...plan, blocks, days };
}

export async function getNutritionPlanById(planId: string) {
  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  const blockIds = (plan.blockIdsJson as string[]) ?? [];
  const blocks = await hydratePlanBlocks(blockIds);
  return { ...plan, blocks };
}

export async function getPublishedNutritionPlan(memberId: string) {
  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(
      and(
        eq(nutritionPlans.memberId, memberId),
        eq(nutritionPlans.status, "published"),
      ),
    )
    .orderBy(desc(nutritionPlans.weekNumber))
    .limit(1);

  if (!plan) return null;

  const blockIds = (plan.blockIdsJson as string[]) ?? [];
  let blocks: (typeof contentBlocks.$inferSelect)[] = [];
  if (blockIds.length > 0) {
    blocks = await hydratePlanBlocks(blockIds);
  }

  return { ...plan, blocks };
}

export async function getMembersWithUsers(tenantId: string) {
  return db
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.tenantId, tenantId));
}

export async function recordPublication(
  tenantId: string,
  planType: "training" | "nutrition",
  planId: string,
  memberId: string,
  publishedBy: string,
  assemblyDurationSeconds?: number,
) {
  const existing = await db
    .select()
    .from(planPublications)
    .where(
      and(
        eq(planPublications.planType, planType),
        eq(planPublications.memberId, memberId),
      ),
    )
    .orderBy(desc(planPublications.revisionNumber))
    .limit(1);

  const revisionNumber = (existing[0]?.revisionNumber ?? 0) + 1;

  await db.insert(planPublications).values({
    tenantId,
    planType,
    planId,
    memberId,
    publishedBy,
    revisionNumber,
    assemblyDurationSeconds,
  });

  return revisionNumber;
}
