import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentBlocks, exercises, planTemplates } from "@/lib/db/schema";

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

export async function buildCatalogWorkbook(tenantId: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const exerciseRows = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId))
    .orderBy(asc(exercises.slug), asc(exercises.name));

  addSheetWithHeaders(
    workbook,
    "Exercises",
    [
      "slug",
      "name",
      "youtube_video_id_or_url",
      "muscle_group",
      "equipment",
      "default_reps",
      "default_sets",
      "notes",
    ],
    exerciseRows.map((ex) => [
      ex.slug ?? "",
      ex.name,
      ex.youtubeVideoId ?? "",
      ex.muscleGroup ?? "",
      ex.equipment ?? "",
      ex.defaultReps ?? "",
      ex.defaultSets ?? "",
      ex.notes ?? "",
    ]),
  );

  const blockRows = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.tenantId, tenantId))
    .orderBy(asc(contentBlocks.slug));

  addSheetWithHeaders(
    workbook,
    "ContentBlocks",
    ["slug", "category", "title", "body_json"],
    blockRows.map((b) => [
      b.slug,
      b.category,
      b.title,
      JSON.stringify(b.bodyJson ?? {}),
    ]),
  );

  const templateRows = await db
    .select()
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, tenantId))
    .orderBy(asc(planTemplates.key), asc(planTemplates.name));

  addSheetWithHeaders(
    workbook,
    "PlanTemplates",
    [
      "key",
      "name",
      "description",
      "tags",
      "training_json",
      "nutrition_json",
      "training_block_slugs",
      "nutrition_block_slugs",
    ],
    templateRows.map((t) => {
      const structure = (t.structureJson ?? {}) as Record<string, unknown>;
      const tags = Array.isArray(t.tagsJson) ? (t.tagsJson as string[]).join(",") : "";
      const trainingBlockSlugs = Array.isArray(structure.trainingBlockSlugs)
        ? (structure.trainingBlockSlugs as string[]).join(",")
        : "";
      const nutritionBlockSlugs = Array.isArray(structure.nutritionBlockSlugs)
        ? (structure.nutritionBlockSlugs as string[]).join(",")
        : "";
      return [
        t.key ?? "",
        t.name,
        t.description ?? "",
        tags,
        structure.training ? JSON.stringify(structure.training) : "",
        structure.nutrition ? JSON.stringify(structure.nutrition) : "",
        trainingBlockSlugs,
        nutritionBlockSlugs,
      ];
    }),
  );

  const instructions = workbook.addWorksheet("Instructions");
  instructions.addRow(["Catalog migration workbook"]);
  instructions.addRow(["Exercises and content blocks are keyed by slug; plan templates by key."]);
  instructions.addRow([
    "Content block categories: nutrition_tips, grocery_list, health_parameters, sweet_cravings, welcome_letter, workout_guidelines, stretching_routine, cardio_finisher, success_strategies",
  ]);
  instructions.addRow([
    "YouTube column accepts a video ID or full URL (watch, youtu.be, embed, shorts).",
  ]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildMemberMigrationTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

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
    [
      [
        "",
        "CLI-001",
        "client@example.com",
        "Jane",
        "Athlete",
        "",
        "invited",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "hybrid",
        "10000",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "fat loss;strength",
      ],
    ],
  );

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
    [
      ["", "CLI-001", 1, 10000, "", "draft", 1, "Day 1", "resistance", "squat", "8-10", 3, ""],
    ],
  );

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
    [
      [
        "",
        "CLI-001",
        1,
        1800,
        2000,
        120,
        150,
        200,
        50,
        70,
        "nutrition_tips,grocery_list",
        "draft",
      ],
    ],
  );

  addSheetWithHeaders(
    workbook,
    "Notes",
    ["member_id", "import_key", "note_type", "created_at", "body"],
    [["", "CLI-001", "coach_note", "", "Initial onboarding note."]],
  );

  const instructions = workbook.addWorksheet("Instructions");
  instructions.addRow(["Member migration template"]);
  instructions.addRow(["Join sheets on member_id (UUID) or import_key — never email."]);
  instructions.addRow(["Leave member_id blank on first import; system assigns UUID + import_key."]);
  instructions.addRow(["status: invited | active | paused | lead"]);
  instructions.addRow(["plan status: draft | published"]);
  instructions.addRow(["section_type: warmup | resistance | core | cardio | stretch"]);
  instructions.addRow(["note_type: coach_note | check_in_note"]);
  instructions.addRow(["health_goals: semicolon-separated list"]);
  instructions.addRow(["Import exercise catalog before training plans that reference exercise_slug."]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function buildCatalogMigrationTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  addSheetWithHeaders(
    workbook,
    "Exercises",
    [
      "slug",
      "name",
      "youtube_video_id_or_url",
      "muscle_group",
      "equipment",
      "default_reps",
      "default_sets",
      "notes",
    ],
    [
      [
        "squat",
        "Barbell Squat",
        "https://www.youtube.com/watch?v=ultWZbUMPL8",
        "legs",
        "barbell",
        "8-10",
        3,
        "",
      ],
    ],
  );

  addSheetWithHeaders(
    workbook,
    "ContentBlocks",
    ["slug", "category", "title", "body_json"],
    [
      [
        "nutrition_tips",
        "nutrition_tips",
        "Weekly nutrition tips",
        JSON.stringify({ items: ["Drink 3L water daily", "Protein at every meal"] }),
      ],
    ],
  );

  addSheetWithHeaders(
    workbook,
    "PlanTemplates",
    [
      "key",
      "name",
      "description",
      "tags",
      "training_json",
      "nutrition_json",
      "training_block_slugs",
      "nutrition_block_slugs",
    ],
    [
      [
        "athlete_gym_v1",
        "Athlete Gym Week 1",
        "Starter gym template",
        "athlete,gym",
        JSON.stringify({ days: [] }),
        JSON.stringify({ blockSlugs: ["nutrition_tips"] }),
        "workout_guidelines",
        "nutrition_tips",
      ],
    ],
  );

  const instructions = workbook.addWorksheet("Instructions");
  instructions.addRow(["Catalog migration template"]);
  instructions.addRow(["slug and key must be lowercase alphanumeric with underscores/hyphens."]);
  instructions.addRow([
    "Content block categories: nutrition_tips, grocery_list, health_parameters, sweet_cravings, welcome_letter, workout_guidelines, stretching_routine, cardio_finisher, success_strategies",
  ]);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export type TemplateName = "member-migration" | "catalog-migration";

export async function buildTemplateWorkbook(name: TemplateName): Promise<Buffer> {
  if (name === "member-migration") return buildMemberMigrationTemplate();
  if (name === "catalog-migration") return buildCatalogMigrationTemplate();
  throw new Error(`Unknown template: ${name}`);
}
