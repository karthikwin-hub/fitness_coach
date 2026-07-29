import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  checkIns,
  contentBlocks,
  exercises,
  members,
  nutritionPlans,
  trainingDays,
  trainingPlans,
  trainingSectionExercises,
  trainingSections,
  users,
} from "@/lib/db/schema";

function addSheetWithHeaders(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: unknown[][],
) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  sheet.getRow(1).font = { bold: true };
}

export async function buildMembersWorkbook(
  tenantId: string,
  includePlans = true,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const memberRows = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.tenantId, tenantId))
    .orderBy(asc(members.createdAt));

  addSheetWithHeaders(
    workbook,
    "Members",
    [
      "member_id",
      "import_key",
      "email",
      "first_name",
      "last_name",
      "phone",
      "status",
      "date_of_birth",
      "location",
      "address_line1",
      "city",
      "state_region",
      "postal_code",
      "country",
      "occupation",
      "diet_preference",
      "step_goal",
      "program_start_date",
      "health_issues",
      "allergies",
      "medications",
      "emergency_contact_name",
      "emergency_contact_phone",
      "bio",
      "coach_notes",
      "health_goals",
    ],
    memberRows.map(({ member, user }) => [
      member.id,
      member.importKey ?? "",
      user.email,
      member.firstName ?? "",
      member.lastName ?? "",
      member.phone ?? "",
      member.status,
      member.dateOfBirth ?? "",
      member.location ?? "",
      member.addressLine1 ?? "",
      member.city ?? "",
      member.stateRegion ?? "",
      member.postalCode ?? "",
      member.country ?? "",
      member.occupation ?? "",
      member.dietPreference ?? "",
      member.stepGoal ?? "",
      member.programStartDate ?? "",
      member.healthIssues ?? "",
      member.allergies ?? "",
      member.medications ?? "",
      member.emergencyContactName ?? "",
      member.emergencyContactPhone ?? "",
      member.bio ?? "",
      member.coachNotes ?? "",
      Array.isArray(member.healthGoalsJson)
        ? (member.healthGoalsJson as string[]).join(";")
        : "",
    ]),
  );

  if (includePlans) {
    const blockSlugById = new Map(
      (
        await db
          .select({ id: contentBlocks.id, slug: contentBlocks.slug })
          .from(contentBlocks)
          .where(eq(contentBlocks.tenantId, tenantId))
      ).map((b) => [b.id, b.slug]),
    );

    const trainingRows: unknown[][] = [];
    for (const { member } of memberRows) {
      const plans = await db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.memberId, member.id))
        .orderBy(asc(trainingPlans.weekNumber));

      for (const plan of plans) {
        const days = await db
          .select()
          .from(trainingDays)
          .where(eq(trainingDays.planId, plan.id))
          .orderBy(asc(trainingDays.dayIndex));

        if (days.length === 0) {
          trainingRows.push([
            member.id,
            member.importKey ?? "",
            plan.weekNumber,
            plan.stepGoal ?? "",
            "",
            plan.status,
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ]);
          continue;
        }

        for (const day of days) {
          const sections = await db
            .select()
            .from(trainingSections)
            .where(eq(trainingSections.dayId, day.id))
            .orderBy(asc(trainingSections.sortOrder));

          if (sections.length === 0) {
            trainingRows.push([
              member.id,
              member.importKey ?? "",
              plan.weekNumber,
              plan.stepGoal ?? "",
              "",
              plan.status,
              day.dayIndex,
              day.label,
              "",
              "",
              "",
              "",
              "",
            ]);
            continue;
          }

          for (const section of sections) {
            const exRows = await db
              .select({
                slug: exercises.slug,
                reps: trainingSectionExercises.reps,
                sets: trainingSectionExercises.sets,
                supersetGroup: trainingSectionExercises.supersetGroup,
              })
              .from(trainingSectionExercises)
              .innerJoin(exercises, eq(trainingSectionExercises.exerciseId, exercises.id))
              .where(eq(trainingSectionExercises.sectionId, section.id))
              .orderBy(asc(trainingSectionExercises.sortOrder));

            if (exRows.length === 0) {
              trainingRows.push([
                member.id,
                member.importKey ?? "",
                plan.weekNumber,
                plan.stepGoal ?? "",
                "",
                plan.status,
                day.dayIndex,
                day.label,
                section.type,
                "",
                "",
                "",
                "",
              ]);
              continue;
            }

            for (const ex of exRows) {
              trainingRows.push([
                member.id,
                member.importKey ?? "",
                plan.weekNumber,
                plan.stepGoal ?? "",
                "",
                plan.status,
                day.dayIndex,
                day.label,
                section.type,
                ex.slug ?? "",
                ex.reps,
                ex.sets,
                ex.supersetGroup ?? "",
              ]);
            }
          }
        }
      }
    }

    addSheetWithHeaders(
      workbook,
      "TrainingPlans",
      [
        "member_id",
        "import_key",
        "week_number",
        "step_goal",
        "template_key",
        "status",
        "day_index",
        "day_label",
        "section_type",
        "exercise_slug",
        "reps",
        "sets",
        "superset_group",
      ],
      trainingRows,
    );

    const nutritionRows: unknown[][] = [];
    for (const { member } of memberRows) {
      const plans = await db
        .select()
        .from(nutritionPlans)
        .where(eq(nutritionPlans.memberId, member.id))
        .orderBy(asc(nutritionPlans.weekNumber));

      for (const plan of plans) {
        const blockIds = Array.isArray(plan.blockIdsJson)
          ? (plan.blockIdsJson as string[])
          : [];
        const slugs = blockIds
          .map((id) => blockSlugById.get(id))
          .filter(Boolean)
          .join(",");

        nutritionRows.push([
          member.id,
          member.importKey ?? "",
          plan.weekNumber,
          plan.caloriesMin ?? "",
          plan.caloriesMax ?? "",
          plan.proteinMin ?? "",
          plan.proteinMax ?? "",
          plan.carbsMax ?? "",
          plan.fatMin ?? "",
          plan.fatMax ?? "",
          slugs,
          plan.status,
        ]);
      }
    }

    addSheetWithHeaders(
      workbook,
      "NutritionPlans",
      [
        "member_id",
        "import_key",
        "week_number",
        "calories_min",
        "calories_max",
        "protein_min",
        "protein_max",
        "carbs_max",
        "fat_min",
        "fat_max",
        "content_block_slugs",
        "status",
      ],
      nutritionRows,
    );

    const noteRows: unknown[][] = [];
    for (const { member } of memberRows) {
      if (member.coachNotes?.trim()) {
        noteRows.push([
          member.id,
          member.importKey ?? "",
          "coach_note",
          "",
          member.coachNotes,
        ]);
      }

      const checkInNotes = await db
        .select({ coachNote: checkIns.coachNote, createdAt: checkIns.createdAt })
        .from(checkIns)
        .where(eq(checkIns.memberId, member.id))
        .orderBy(asc(checkIns.createdAt));

      for (const ci of checkInNotes) {
        if (!ci.coachNote?.trim()) continue;
        noteRows.push([
          member.id,
          member.importKey ?? "",
          "check_in_note",
          ci.createdAt.toISOString(),
          ci.coachNote,
        ]);
      }
    }

    addSheetWithHeaders(
      workbook,
      "Notes",
      ["member_id", "import_key", "note_type", "created_at", "body"],
      noteRows,
    );
  }

  workbook.addWorksheet("Instructions").addRow([
    "Use member_id or import_key to join sheets — never email. Export includes both stable keys for round-trip imports.",
  ]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
