export type ImportWorkbookKind = "members" | "catalog";

export type RowIssue = {
  sheet: string;
  row: number;
  column?: string;
  message: string;
  severity: "error" | "warning";
};

export type MemberImportRow = {
  row: number;
  memberId?: string;
  importKey?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: string;
  dateOfBirth?: string;
  location?: string;
  addressLine1?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  country?: string;
  occupation?: string;
  dietPreference?: string;
  stepGoal?: number;
  programStartDate?: string;
  healthIssues?: string;
  allergies?: string;
  medications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bio?: string;
  coachNotes?: string;
  healthGoals?: string[];
};

export type TrainingPlanImportRow = {
  row: number;
  memberId?: string;
  importKey?: string;
  weekNumber?: number;
  stepGoal?: number;
  templateKey?: string;
  status?: string;
  dayIndex?: number;
  dayLabel?: string;
  sectionType?: string;
  exerciseSlug?: string;
  reps?: string;
  sets?: number;
  supersetGroup?: string;
};

export type NutritionPlanImportRow = {
  row: number;
  memberId?: string;
  importKey?: string;
  weekNumber?: number;
  caloriesMin?: number;
  caloriesMax?: number;
  proteinMin?: number;
  proteinMax?: number;
  carbsMax?: number;
  fatMin?: number;
  fatMax?: number;
  contentBlockSlugs?: string[];
  status?: string;
};

export type NoteImportRow = {
  row: number;
  memberId?: string;
  importKey?: string;
  noteType?: string;
  createdAt?: string;
  body?: string;
};

export type ExerciseImportRow = {
  row: number;
  slug?: string;
  name?: string;
  youtubeVideoIdOrUrl?: string;
  muscleGroup?: string;
  equipment?: string;
  defaultReps?: string;
  defaultSets?: number;
  notes?: string;
  categorySlug?: string;
  videoSource?: "owned" | "third_party";
};

export type ContentBlockImportRow = {
  row: number;
  slug?: string;
  category?: string;
  title?: string;
  bodyJson?: string;
};

export type PlanTemplateImportRow = {
  row: number;
  key?: string;
  name?: string;
  description?: string;
  tags?: string[];
  trainingJson?: string;
  nutritionJson?: string;
  trainingBlockSlugs?: string[];
  nutritionBlockSlugs?: string[];
};

export type ParsedMemberWorkbook = {
  kind: "members";
  members: MemberImportRow[];
  trainingPlans: TrainingPlanImportRow[];
  nutritionPlans: NutritionPlanImportRow[];
  notes: NoteImportRow[];
};

export type ParsedCatalogWorkbook = {
  kind: "catalog";
  exercises: ExerciseImportRow[];
  contentBlocks: ContentBlockImportRow[];
  planTemplates: PlanTemplateImportRow[];
};

export type ParsedWorkbook = ParsedMemberWorkbook | ParsedCatalogWorkbook;

export type ImportSummary = {
  members?: { create: number; update: number };
  trainingPlans?: { create: number; update: number };
  nutritionPlans?: { create: number; update: number };
  notes?: { create: number };
  exercises?: { create: number; update: number };
  contentBlocks?: { create: number; update: number };
  planTemplates?: { create: number; update: number };
};

export type ValidationResult = {
  valid: boolean;
  issues: RowIssue[];
  summary: ImportSummary;
  workbook: ParsedWorkbook;
};

export type CommitResult = {
  success: boolean;
  issues: RowIssue[];
  summary: ImportSummary;
};
