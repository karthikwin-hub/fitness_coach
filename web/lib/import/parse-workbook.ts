import ExcelJS from "exceljs";
import type {
  ContentBlockImportRow,
  ExerciseImportRow,
  ImportWorkbookKind,
  MemberImportRow,
  NoteImportRow,
  NutritionPlanImportRow,
  ParsedCatalogWorkbook,
  ParsedMemberWorkbook,
  ParsedWorkbook,
  PlanTemplateImportRow,
  TrainingPlanImportRow,
} from "@/lib/import/types";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value && value.text) {
    return String(value.text).trim();
  }
  if (typeof value === "object" && "result" in value && value.result != null) {
    return cellToString(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function cellToNumber(value: ExcelJS.CellValue): number | undefined {
  const raw = cellToString(value);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function splitList(value: ExcelJS.CellValue, separator: RegExp): string[] {
  const raw = cellToString(value);
  if (!raw) return [];
  return raw
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
}

type RowRecord = Record<string, ExcelJS.CellValue>;

function readSheetRows(
  worksheet: ExcelJS.Worksheet,
): Array<{ row: number; data: RowRecord }> {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = normalizeHeader(cell.value);
  });

  const rows: Array<{ row: number; data: RowRecord }> = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data: RowRecord = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col - 1];
      if (!key) return;
      const value = cell.value;
      if (value != null && cellToString(value) !== "") hasValue = true;
      data[key] = value;
    });
    if (hasValue) rows.push({ row: rowNumber, data });
  });
  return rows;
}

function getStr(data: RowRecord, key: string): string | undefined {
  const value = cellToString(data[key]);
  return value || undefined;
}

function getNum(data: RowRecord, key: string): number | undefined {
  return cellToNumber(data[key]);
}

function parseMembersSheet(rows: Array<{ row: number; data: RowRecord }>): MemberImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    memberId: getStr(data, "member_id"),
    importKey: getStr(data, "import_key"),
    email: getStr(data, "email"),
    firstName: getStr(data, "first_name"),
    lastName: getStr(data, "last_name"),
    phone: getStr(data, "phone"),
    status: getStr(data, "status"),
    dateOfBirth: getStr(data, "date_of_birth"),
    location: getStr(data, "location"),
    addressLine1: getStr(data, "address_line1"),
    city: getStr(data, "city"),
    stateRegion: getStr(data, "state_region"),
    postalCode: getStr(data, "postal_code"),
    country: getStr(data, "country"),
    occupation: getStr(data, "occupation"),
    dietPreference: getStr(data, "diet_preference"),
    stepGoal: getNum(data, "step_goal"),
    programStartDate: getStr(data, "program_start_date"),
    healthIssues: getStr(data, "health_issues"),
    allergies: getStr(data, "allergies"),
    medications: getStr(data, "medications"),
    emergencyContactName: getStr(data, "emergency_contact_name"),
    emergencyContactPhone: getStr(data, "emergency_contact_phone"),
    bio: getStr(data, "bio"),
    coachNotes: getStr(data, "coach_notes"),
    healthGoals: splitList(data.health_goals, /;/),
  }));
}

function parseTrainingPlansSheet(
  rows: Array<{ row: number; data: RowRecord }>,
): TrainingPlanImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    memberId: getStr(data, "member_id"),
    importKey: getStr(data, "import_key"),
    weekNumber: getNum(data, "week_number"),
    stepGoal: getNum(data, "step_goal"),
    templateKey: getStr(data, "template_key"),
    status: getStr(data, "status"),
    dayIndex: getNum(data, "day_index"),
    dayLabel: getStr(data, "day_label"),
    sectionType: getStr(data, "section_type"),
    exerciseSlug: getStr(data, "exercise_slug"),
    reps: getStr(data, "reps"),
    sets: getNum(data, "sets"),
    supersetGroup: getStr(data, "superset_group"),
  }));
}

function parseNutritionPlansSheet(
  rows: Array<{ row: number; data: RowRecord }>,
): NutritionPlanImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    memberId: getStr(data, "member_id"),
    importKey: getStr(data, "import_key"),
    weekNumber: getNum(data, "week_number"),
    caloriesMin: getNum(data, "calories_min"),
    caloriesMax: getNum(data, "calories_max"),
    proteinMin: getNum(data, "protein_min"),
    proteinMax: getNum(data, "protein_max"),
    carbsMax: getNum(data, "carbs_max"),
    fatMin: getNum(data, "fat_min"),
    fatMax: getNum(data, "fat_max"),
    contentBlockSlugs: splitList(data.content_block_slugs, /,/),
    status: getStr(data, "status"),
  }));
}

function parseNotesSheet(rows: Array<{ row: number; data: RowRecord }>): NoteImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    memberId: getStr(data, "member_id"),
    importKey: getStr(data, "import_key"),
    noteType: getStr(data, "note_type"),
    createdAt: getStr(data, "created_at"),
    body: getStr(data, "body"),
  }));
}

function parseExercisesSheet(
  rows: Array<{ row: number; data: RowRecord }>,
): ExerciseImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    slug: getStr(data, "slug"),
    name: getStr(data, "name"),
    youtubeVideoIdOrUrl: getStr(data, "youtube_video_id_or_url"),
    muscleGroup: getStr(data, "muscle_group"),
    equipment: getStr(data, "equipment"),
    defaultReps: getStr(data, "default_reps"),
    defaultSets: getNum(data, "default_sets"),
    notes: getStr(data, "notes"),
    categorySlug: getStr(data, "category_slug"),
    videoSource:
      getStr(data, "video_source") === "owned"
        ? "owned"
        : getStr(data, "video_source") === "third_party"
          ? "third_party"
          : undefined,
  }));
}

function parseContentBlocksSheet(
  rows: Array<{ row: number; data: RowRecord }>,
): ContentBlockImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    slug: getStr(data, "slug"),
    category: getStr(data, "category"),
    title: getStr(data, "title"),
    bodyJson: getStr(data, "body_json"),
  }));
}

function parsePlanTemplatesSheet(
  rows: Array<{ row: number; data: RowRecord }>,
): PlanTemplateImportRow[] {
  return rows.map(({ row, data }) => ({
    row,
    key: getStr(data, "key"),
    name: getStr(data, "name"),
    description: getStr(data, "description"),
    tags: splitList(data.tags, /,/),
    trainingJson: getStr(data, "training_json"),
    nutritionJson: getStr(data, "nutrition_json"),
    trainingBlockSlugs: splitList(data.training_block_slugs, /,/),
    nutritionBlockSlugs: splitList(data.nutrition_block_slugs, /,/),
  }));
}

function sheetNames(workbook: ExcelJS.Workbook): Set<string> {
  return new Set(workbook.worksheets.map((ws) => ws.name.trim().toLowerCase()));
}

function findSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  const target = name.toLowerCase();
  return workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === target);
}

export function detectWorkbookKind(workbook: ExcelJS.Workbook): ImportWorkbookKind | null {
  const names = sheetNames(workbook);
  if (names.has("members")) return "members";
  if (names.has("exercises")) return "catalog";
  return null;
}

export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

export function parseMemberWorkbook(workbook: ExcelJS.Workbook): ParsedMemberWorkbook {
  const membersSheet = findSheet(workbook, "Members");
  const trainingSheet = findSheet(workbook, "TrainingPlans");
  const nutritionSheet = findSheet(workbook, "NutritionPlans");
  const notesSheet = findSheet(workbook, "Notes");

  return {
    kind: "members",
    members: membersSheet ? parseMembersSheet(readSheetRows(membersSheet)) : [],
    trainingPlans: trainingSheet ? parseTrainingPlansSheet(readSheetRows(trainingSheet)) : [],
    nutritionPlans: nutritionSheet
      ? parseNutritionPlansSheet(readSheetRows(nutritionSheet))
      : [],
    notes: notesSheet ? parseNotesSheet(readSheetRows(notesSheet)) : [],
  };
}

export function parseCatalogWorkbook(workbook: ExcelJS.Workbook): ParsedCatalogWorkbook {
  const exercisesSheet = findSheet(workbook, "Exercises");
  const blocksSheet = findSheet(workbook, "ContentBlocks");
  const templatesSheet = findSheet(workbook, "PlanTemplates");

  return {
    kind: "catalog",
    exercises: exercisesSheet ? parseExercisesSheet(readSheetRows(exercisesSheet)) : [],
    contentBlocks: blocksSheet ? parseContentBlocksSheet(readSheetRows(blocksSheet)) : [],
    planTemplates: templatesSheet
      ? parsePlanTemplatesSheet(readSheetRows(templatesSheet))
      : [],
  };
}

export async function parseWorkbookBuffer(
  buffer: Buffer,
  kind?: ImportWorkbookKind,
): Promise<ParsedWorkbook> {
  const workbook = await loadWorkbook(buffer);
  const detected = kind ?? detectWorkbookKind(workbook);
  if (!detected) {
    throw new Error(
      "Unrecognized workbook: include a Members sheet (member migration) or Exercises sheet (catalog migration)",
    );
  }
  return detected === "members"
    ? parseMemberWorkbook(workbook)
    : parseCatalogWorkbook(workbook);
}
