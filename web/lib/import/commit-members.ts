import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkIns,
  contentBlocks,
  exercises,
  members,
  nutritionPlans,
  trainingPlans,
  users,
} from "@/lib/db/schema";
import { createInvitedMember } from "@/lib/members/create-invited-member";
import type {
  CommitResult,
  ImportSummary,
  MemberImportRow,
  ParsedMemberWorkbook,
  TrainingPlanImportRow,
} from "@/lib/import/types";
import {
  createTrainingPlanFromInput,
  replaceTrainingPlanStructure,
} from "@/lib/plans/training";

type MemberStatus = "invited" | "active" | "paused" | "lead";
type PlanStatus = "draft" | "published";
type SectionType = "warmup" | "resistance" | "core" | "cardio" | "stretch";

function memberFields(row: MemberImportRow) {
  return {
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    phone: row.phone ?? null,
    status: (row.status as MemberStatus | undefined) ?? "invited",
    dateOfBirth: row.dateOfBirth ?? null,
    location: row.location ?? null,
    addressLine1: row.addressLine1 ?? null,
    city: row.city ?? null,
    stateRegion: row.stateRegion ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? null,
    occupation: row.occupation ?? null,
    dietPreference: row.dietPreference as
      | "indian"
      | "western"
      | "hybrid"
      | "vegetarian"
      | null
      | undefined,
    stepGoal: row.stepGoal ?? undefined,
    programStartDate: row.programStartDate ?? null,
    healthIssues: row.healthIssues ?? null,
    allergies: row.allergies ?? null,
    medications: row.medications ?? null,
    emergencyContactName: row.emergencyContactName ?? null,
    emergencyContactPhone: row.emergencyContactPhone ?? null,
    bio: row.bio ?? null,
    coachNotes: row.coachNotes ?? null,
    healthGoalsJson: row.healthGoals ?? [],
  };
}

async function upsertMemberRow(
  tenantId: string,
  coachUserId: string,
  row: MemberImportRow,
  existingById: Map<string, { userId: string }>,
  existingByImportKey: Map<string, string>,
): Promise<{ memberId: string; created: boolean }> {
  const fields = memberFields(row);
  const email = row.email?.trim().toLowerCase();

  if (row.memberId && existingById.has(row.memberId)) {
    const { userId } = existingById.get(row.memberId)!;
    await db
      .update(members)
      .set({
        firstName: fields.firstName,
        lastName: fields.lastName,
        phone: fields.phone,
        status: fields.status,
        dateOfBirth: fields.dateOfBirth,
        location: fields.location,
        addressLine1: fields.addressLine1,
        city: fields.city,
        stateRegion: fields.stateRegion,
        postalCode: fields.postalCode,
        country: fields.country,
        occupation: fields.occupation,
        dietPreference: fields.dietPreference ?? null,
        stepGoal: fields.stepGoal,
        programStartDate: fields.programStartDate,
        healthIssues: fields.healthIssues,
        allergies: fields.allergies,
        medications: fields.medications,
        emergencyContactName: fields.emergencyContactName,
        emergencyContactPhone: fields.emergencyContactPhone,
        bio: fields.bio,
        coachNotes: fields.coachNotes ?? undefined,
        healthGoalsJson: fields.healthGoalsJson,
      })
      .where(eq(members.id, row.memberId));

    if (email) {
      await db.update(users).set({ email }).where(eq(users.id, userId));
      const displayName = [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim();
      if (displayName) {
        await db.update(users).set({ displayName }).where(eq(users.id, userId));
      }
    }
    return { memberId: row.memberId, created: false };
  }

  if (row.importKey) {
    const existingId = existingByImportKey.get(row.importKey.toLowerCase());
    if (existingId) {
      const { userId } = existingById.get(existingId)!;
      await db
        .update(members)
        .set({
          firstName: fields.firstName,
          lastName: fields.lastName,
          phone: fields.phone,
          status: fields.status,
          dateOfBirth: fields.dateOfBirth,
          location: fields.location,
          addressLine1: fields.addressLine1,
          city: fields.city,
          stateRegion: fields.stateRegion,
          postalCode: fields.postalCode,
          country: fields.country,
          occupation: fields.occupation,
          dietPreference: fields.dietPreference ?? null,
          stepGoal: fields.stepGoal,
          programStartDate: fields.programStartDate,
          healthIssues: fields.healthIssues,
          allergies: fields.allergies,
          medications: fields.medications,
          emergencyContactName: fields.emergencyContactName,
          emergencyContactPhone: fields.emergencyContactPhone,
          bio: fields.bio,
          coachNotes: fields.coachNotes ?? undefined,
          healthGoalsJson: fields.healthGoalsJson,
        })
        .where(eq(members.id, existingId));

      if (email) {
        await db.update(users).set({ email }).where(eq(users.id, userId));
      }
      return { memberId: existingId, created: false };
    }
  }

  if (!email) throw new Error(`Row ${row.row}: email required for new member`);

  const { member, user } = await createInvitedMember(tenantId, coachUserId, {
    email,
    importKey: row.importKey,
    firstName: fields.firstName,
    lastName: fields.lastName,
    phone: fields.phone,
    status: fields.status,
  });

  existingById.set(member.id, { userId: user.id });

  await db
    .update(members)
    .set({
      dateOfBirth: fields.dateOfBirth,
      location: fields.location,
      addressLine1: fields.addressLine1,
      city: fields.city,
      stateRegion: fields.stateRegion,
      postalCode: fields.postalCode,
      country: fields.country,
      occupation: fields.occupation,
      dietPreference: fields.dietPreference ?? null,
      stepGoal: fields.stepGoal,
      programStartDate: fields.programStartDate,
      healthIssues: fields.healthIssues,
      allergies: fields.allergies,
      medications: fields.medications,
      emergencyContactName: fields.emergencyContactName,
      emergencyContactPhone: fields.emergencyContactPhone,
      bio: fields.bio,
      coachNotes: fields.coachNotes,
      healthGoalsJson: fields.healthGoalsJson,
    })
    .where(eq(members.id, member.id));

  return { memberId: member.id, created: true };
}

function resolveMemberIdFromRef(
  ref: { memberId?: string; importKey?: string },
  memberIdMap: Map<string, string>,
): string | null {
  if (ref.memberId) return memberIdMap.get(`id:${ref.memberId}`) ?? ref.memberId;
  if (ref.importKey) return memberIdMap.get(`key:${ref.importKey.toLowerCase()}`) ?? null;
  return null;
}

function buildTrainingDays(
  rows: TrainingPlanImportRow[],
  exerciseIdBySlug: Map<string, string>,
) {
  const dayMap = new Map<
    number,
    {
      dayIndex: number;
      label: string;
      sections: Map<
        string,
        {
          type: SectionType;
          exercises: Array<{
            exerciseId: string;
            supersetGroup?: string;
            reps: string;
            sets?: number;
            sortOrder: number;
          }>;
        }
      >;
    }
  >();

  for (const row of rows) {
    if (row.dayIndex == null) continue;
    const dayKey = row.dayIndex;
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        dayIndex: row.dayIndex,
        label: row.dayLabel ?? `Day ${row.dayIndex}`,
        sections: new Map(),
      });
    }
    const day = dayMap.get(dayKey)!;
    const sectionType = (row.sectionType ?? "resistance") as SectionType;
    const sectionKey = sectionType;
    if (!day.sections.has(sectionKey)) {
      day.sections.set(sectionKey, { type: sectionType, exercises: [] });
    }
    if (row.exerciseSlug) {
      const exerciseId = exerciseIdBySlug.get(row.exerciseSlug);
      if (!exerciseId) continue;
      const section = day.sections.get(sectionKey)!;
      section.exercises.push({
        exerciseId,
        supersetGroup: row.supersetGroup,
        reps: row.reps ?? "10",
        sets: row.sets ?? 3,
        sortOrder: section.exercises.length,
      });
    }
  }

  return [...dayMap.values()]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((day) => ({
      dayIndex: day.dayIndex,
      label: day.label,
      sections: [...day.sections.values()].map((section, si) => ({
        type: section.type,
        sortOrder: si,
        exercises: section.exercises,
      })),
    }));
}

export async function commitMemberWorkbook(
  tenantId: string,
  coachUserId: string,
  workbook: ParsedMemberWorkbook,
): Promise<CommitResult> {
  const summary: ImportSummary = {
    members: { create: 0, update: 0 },
    trainingPlans: { create: 0, update: 0 },
    nutritionPlans: { create: 0, update: 0 },
    notes: { create: 0 },
  };

  const allMemberIds = workbook.members
    .map((m) => m.memberId)
    .filter((id): id is string => Boolean(id));

  const existingById = new Map<string, { userId: string }>();
  if (allMemberIds.length > 0) {
    const rows = await db
      .select({ id: members.id, userId: members.userId })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), inArray(members.id, allMemberIds)));
    for (const row of rows) existingById.set(row.id, { userId: row.userId });
  }

  const allImportKeys = [
    ...workbook.members.map((m) => m.importKey),
    ...workbook.trainingPlans.map((r) => r.importKey),
    ...workbook.nutritionPlans.map((r) => r.importKey),
    ...workbook.notes.map((r) => r.importKey),
  ].filter((k): k is string => Boolean(k));

  const existingByImportKey = new Map<string, string>();
  if (allImportKeys.length > 0) {
    const unique = [...new Set(allImportKeys)];
    const rows = await db
      .select({ id: members.id, importKey: members.importKey, userId: members.userId })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), inArray(members.importKey, unique)));
    for (const row of rows) {
      if (row.importKey) existingByImportKey.set(row.importKey.toLowerCase(), row.id);
      existingById.set(row.id, { userId: row.userId });
    }
  }

  const memberIdMap = new Map<string, string>();

  for (const row of workbook.members) {
    const result = await upsertMemberRow(
      tenantId,
      coachUserId,
      row,
      existingById,
      existingByImportKey,
    );
    if (result.created) summary.members!.create += 1;
    else summary.members!.update += 1;

    if (row.memberId) memberIdMap.set(`id:${row.memberId}`, result.memberId);
    if (row.importKey) {
      memberIdMap.set(`key:${row.importKey.toLowerCase()}`, result.memberId);
      existingByImportKey.set(row.importKey.toLowerCase(), result.memberId);
    }
    memberIdMap.set(`id:${result.memberId}`, result.memberId);
  }

  const exerciseRows = await db
    .select({ id: exercises.id, slug: exercises.slug })
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId));
  const exerciseIdBySlug = new Map<string, string>();
  for (const ex of exerciseRows) {
    if (ex.slug) exerciseIdBySlug.set(ex.slug, ex.id);
  }

  const blockRows = await db
    .select({ id: contentBlocks.id, slug: contentBlocks.slug })
    .from(contentBlocks)
    .where(eq(contentBlocks.tenantId, tenantId));
  const blockIdBySlug = new Map(blockRows.map((b) => [b.slug, b.id]));

  const trainingGroups = new Map<string, TrainingPlanImportRow[]>();
  for (const row of workbook.trainingPlans) {
    const memberId = resolveMemberIdFromRef(row, memberIdMap);
    if (!memberId || row.weekNumber == null) continue;
    const key = `${memberId}:${row.weekNumber}`;
    if (!trainingGroups.has(key)) trainingGroups.set(key, []);
    trainingGroups.get(key)!.push(row);
  }

  for (const [key, rows] of trainingGroups) {
    const [memberId, weekStr] = key.split(":");
    const weekNumber = Number(weekStr);
    const meta = rows[0];
    const status = (meta.status as PlanStatus | undefined) ?? "draft";
    const days = buildTrainingDays(rows, exerciseIdBySlug);

    const [existing] = await db
      .select({ id: trainingPlans.id })
      .from(trainingPlans)
      .where(
        and(
          eq(trainingPlans.tenantId, tenantId),
          eq(trainingPlans.memberId, memberId),
          eq(trainingPlans.weekNumber, weekNumber),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(trainingPlans)
        .set({
          stepGoal: meta.stepGoal ?? undefined,
          status,
          updatedAt: new Date(),
        })
        .where(eq(trainingPlans.id, existing.id));
      if (days.length > 0) {
        await replaceTrainingPlanStructure(existing.id, days);
      }
      summary.trainingPlans!.update += 1;
    } else {
      const plan = await createTrainingPlanFromInput(tenantId, memberId, {
        weekNumber,
        stepGoal: meta.stepGoal,
        days,
      });
      if (status === "published") {
        await db
          .update(trainingPlans)
          .set({ status: "published" })
          .where(eq(trainingPlans.id, plan.id));
      }
      summary.trainingPlans!.create += 1;
    }
  }

  for (const row of workbook.nutritionPlans) {
    const memberId = resolveMemberIdFromRef(row, memberIdMap);
    if (!memberId || row.weekNumber == null) continue;

    const blockIds = (row.contentBlockSlugs ?? [])
      .map((slug) => blockIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    const status = (row.status as PlanStatus | undefined) ?? "draft";

    const [existing] = await db
      .select({ id: nutritionPlans.id })
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.tenantId, tenantId),
          eq(nutritionPlans.memberId, memberId),
          eq(nutritionPlans.weekNumber, row.weekNumber),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(nutritionPlans)
        .set({
          caloriesMin: row.caloriesMin ?? null,
          caloriesMax: row.caloriesMax ?? null,
          proteinMin: row.proteinMin ?? null,
          proteinMax: row.proteinMax ?? null,
          carbsMax: row.carbsMax ?? null,
          fatMin: row.fatMin ?? null,
          fatMax: row.fatMax ?? null,
          blockIdsJson: blockIds,
          status,
          updatedAt: new Date(),
        })
        .where(eq(nutritionPlans.id, existing.id));
      summary.nutritionPlans!.update += 1;
    } else {
      await db.insert(nutritionPlans).values({
        tenantId,
        memberId,
        weekNumber: row.weekNumber,
        caloriesMin: row.caloriesMin ?? null,
        caloriesMax: row.caloriesMax ?? null,
        proteinMin: row.proteinMin ?? null,
        proteinMax: row.proteinMax ?? null,
        carbsMax: row.carbsMax ?? null,
        fatMin: row.fatMin ?? null,
        fatMax: row.fatMax ?? null,
        blockIdsJson: blockIds,
        status,
      });
      summary.nutritionPlans!.create += 1;
    }
  }

  for (const row of workbook.notes) {
    const memberId = resolveMemberIdFromRef(row, memberIdMap);
    if (!memberId || !row.body?.trim()) continue;

    const noteType = row.noteType ?? "coach_note";
    if (noteType === "check_in_note") {
      await db.insert(checkIns).values({
        tenantId,
        memberId,
        coachNote: row.body,
        status: "approved",
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
      });
    } else {
      const [current] = await db
        .select({ coachNotes: members.coachNotes })
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);
      const prior = current?.coachNotes?.trim();
      const next = prior ? `${prior}\n\n${row.body}` : row.body;
      await db.update(members).set({ coachNotes: next }).where(eq(members.id, memberId));
    }
    summary.notes!.create += 1;
  }

  return { success: true, issues: [], summary };
}
