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

  const days = await db
    .select()
    .from(trainingDays)
    .where(eq(trainingDays.planId, plan.id))
    .orderBy(asc(trainingDays.dayIndex));

  const daysWithSections = await Promise.all(
    days.map(async (day) => {
      const sections = await db
        .select()
        .from(trainingSections)
        .where(eq(trainingSections.dayId, day.id))
        .orderBy(asc(trainingSections.sortOrder));

      const sectionsWithExercises = await Promise.all(
        sections.map(async (section) => {
          const rows = await db
            .select({
              id: trainingSectionExercises.id,
              supersetGroup: trainingSectionExercises.supersetGroup,
              reps: trainingSectionExercises.reps,
              sets: trainingSectionExercises.sets,
              sortOrder: trainingSectionExercises.sortOrder,
              exercise: exercises,
            })
            .from(trainingSectionExercises)
            .innerJoin(
              exercises,
              eq(trainingSectionExercises.exerciseId, exercises.id),
            )
            .where(eq(trainingSectionExercises.sectionId, section.id))
            .orderBy(asc(trainingSectionExercises.sortOrder));

          return { ...section, exercises: rows };
        }),
      );

      return { ...day, sections: sectionsWithExercises };
    }),
  );

  return { ...plan, blocks, days: daysWithSections };
}

export async function getTrainingPlanById(planId: string) {
  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  const days = await db
    .select()
    .from(trainingDays)
    .where(eq(trainingDays.planId, plan.id))
    .orderBy(asc(trainingDays.dayIndex));

  const daysWithSections = await Promise.all(
    days.map(async (day) => {
      const sections = await db
        .select()
        .from(trainingSections)
        .where(eq(trainingSections.dayId, day.id))
        .orderBy(asc(trainingSections.sortOrder));

      const sectionsWithExercises = await Promise.all(
        sections.map(async (section) => {
          const rows = await db
            .select({
              id: trainingSectionExercises.id,
              supersetGroup: trainingSectionExercises.supersetGroup,
              reps: trainingSectionExercises.reps,
              sets: trainingSectionExercises.sets,
              sortOrder: trainingSectionExercises.sortOrder,
              exercise: exercises,
            })
            .from(trainingSectionExercises)
            .innerJoin(
              exercises,
              eq(trainingSectionExercises.exerciseId, exercises.id),
            )
            .where(eq(trainingSectionExercises.sectionId, section.id))
            .orderBy(asc(trainingSectionExercises.sortOrder));

          return { ...section, exercises: rows };
        }),
      );

      return { ...day, sections: sectionsWithExercises };
    }),
  );

  return { ...plan, days: daysWithSections };
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

export async function getMemberByUserId(userId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);
  return member ?? null;
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
