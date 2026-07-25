import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "platform_admin",
  "coach",
  "member",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "lead",
  "active",
  "paused",
]);

export const checkInStatusEnum = pgEnum("check_in_status", [
  "pending",
  "approved",
  "flagged",
]);

export const planStatusEnum = pgEnum("plan_status", ["draft", "published"]);

export const planTypeEnum = pgEnum("plan_type", ["training", "nutrition"]);

export const contentBlockCategoryEnum = pgEnum("content_block_category", [
  "nutrition_tips",
  "grocery_list",
  "health_parameters",
  "sweet_cravings",
  "welcome_letter",
  "workout_guidelines",
  "stretching_routine",
  "cardio_finisher",
  "success_strategies",
]);

export const sectionTypeEnum = pgEnum("section_type", [
  "warmup",
  "resistance",
  "core",
  "cardio",
  "stretch",
]);

export const planTemplateTypeEnum = pgEnum("plan_template_type", [
  "nutrition_program",
  "training_gym",
  "training_home",
]);

export const dietPreferenceEnum = pgEnum("diet_preference", [
  "indian",
  "western",
  "hybrid",
  "vegetarian",
]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const foodEntrySourceEnum = pgEnum("food_entry_source", [
  "search",
  "manual",
  "photo_ai",
]);

export const nutritionTrackingModeEnum = pgEnum("nutrition_tracking_mode", [
  "native",
  "external_mfp",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brandingJson: jsonb("branding_json").notNull().default({}),
  aiAutoApproveThreshold: doublePrecision("ai_auto_approve_threshold")
    .notNull()
    .default(0.85),
  calComUrl: text("cal_com_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  coachId: uuid("coach_id").references(() => users.id),
  status: memberStatusEnum("status").notNull().default("active"),
  location: text("location"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  stateRegion: text("state_region"),
  postalCode: text("postal_code"),
  country: text("country"),
  dateOfBirth: date("date_of_birth"),
  bio: text("bio"),
  healthIssues: text("health_issues"),
  allergies: text("allergies"),
  medications: text("medications"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  occupation: text("occupation"),
  coachNotes: text("coach_notes"),
  compliancePct: integer("compliance_pct").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  programStartDate: date("program_start_date"),
  programEndDate: date("program_end_date"),
  programPhasesJson: jsonb("program_phases_json").notNull().default([]),
  dietPreference: dietPreferenceEnum("diet_preference"),
  healthGoalsJson: jsonb("health_goals_json").default([]),
  stepGoal: integer("step_goal").default(10000),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email"),
  quizResponsesJson: jsonb("quiz_responses_json").notNull().default({}),
  intentScore: integer("intent_score").notNull().default(0),
  routedTo: text("routed_to").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const vaultWaitlist = pgTable("vault_waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  equipment: text("equipment").notNull().default("none"),
  skillLevel: text("skill_level").notNull().default("beginner"),
  youtubeVideoId: text("youtube_video_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const contentBlocks = pgTable("content_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  category: contentBlockCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  bodyJson: jsonb("body_json").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const exercises = pgTable("exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  youtubeVideoId: text("youtube_video_id"),
  muscleGroup: text("muscle_group"),
  equipment: text("equipment").default("bodyweight"),
  defaultReps: text("default_reps"),
  defaultSets: integer("default_sets").default(3),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const planTemplates = pgTable("plan_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  type: planTemplateTypeEnum("type").notNull(),
  name: text("name").notNull(),
  structureJson: jsonb("structure_json").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trainingPlans = pgTable("training_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  stepGoal: integer("step_goal"),
  blockIdsJson: jsonb("block_ids_json").notNull().default([]),
  effectiveFrom: date("effective_from"),
  status: planStatusEnum("status").notNull().default("draft"),
  templateType: planTemplateTypeEnum("template_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trainingDays = pgTable("training_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  dayIndex: integer("day_index").notNull(),
  label: text("label").notNull(),
  muscleGroup: text("muscle_group"),
});

export const trainingSections = pgTable("training_sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id")
    .notNull()
    .references(() => trainingDays.id, { onDelete: "cascade" }),
  type: sectionTypeEnum("type").notNull(),
  restNote: text("rest_note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const trainingSectionExercises = pgTable("training_section_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => trainingSections.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  supersetGroup: text("superset_group"),
  reps: text("reps").notNull(),
  sets: integer("sets").notNull().default(3),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const nutritionPlans = pgTable("nutrition_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  caloriesMin: integer("calories_min"),
  caloriesMax: integer("calories_max"),
  proteinMin: integer("protein_min"),
  proteinMax: integer("protein_max"),
  carbsMax: integer("carbs_max"),
  fatMin: integer("fat_min"),
  fatMax: integer("fat_max"),
  blockIdsJson: jsonb("block_ids_json").notNull().default([]),
  status: planStatusEnum("status").notNull().default("draft"),
  effectiveFrom: date("effective_from"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const planPublications = pgTable("plan_publications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  planType: planTypeEnum("plan_type").notNull(),
  planId: uuid("plan_id").notNull(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  publishedBy: uuid("published_by").references(() => users.id),
  revisionNumber: integer("revision_number").notNull().default(1),
  assemblyDurationSeconds: integer("assembly_duration_seconds"),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const checkIns = pgTable("check_ins", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  mealPhotoUrl: text("meal_photo_url"),
  weightKg: doublePrecision("weight_kg"),
  sleepHours: doublePrecision("sleep_hours"),
  energy: integer("energy"),
  soreness: integer("soreness"),
  aiAnalysisJson: jsonb("ai_analysis_json"),
  aiConfidence: doublePrecision("ai_confidence"),
  status: checkInStatusEnum("status").notNull().default("pending"),
  coachNote: text("coach_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workoutSetLogs = pgTable(
  "workout_set_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    workoutDate: date("workout_date").notNull(),
    setNumber: integer("set_number").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    memberExerciseSetDay: unique().on(
      table.memberId,
      table.exerciseId,
      table.workoutDate,
      table.setNumber,
    ),
  }),
);

export const foodDiaryEntries = pgTable("food_diary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  source: foodEntrySourceEnum("source").notNull(),
  foodName: text("food_name").notNull(),
  externalFoodId: text("external_food_id"),
  externalProvider: text("external_provider"),
  servingDescription: text("serving_description"),
  quantity: doublePrecision("quantity").notNull().default(1),
  calories: integer("calories").notNull().default(0),
  proteinG: doublePrecision("protein_g").notNull().default(0),
  carbsG: doublePrecision("carbs_g").notNull().default(0),
  fatG: doublePrecision("fat_g").notNull().default(0),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const memberNutritionSettings = pgTable("member_nutrition_settings", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  trackingMode: nutritionTrackingModeEnum("tracking_mode")
    .notNull()
    .default("native"),
  externalNotes: text("external_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const coachBroadcasts = pgTable("coach_broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id),
  body: text("body").notNull(),
  audioUrl: text("audio_url"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type ContentBlock = typeof contentBlocks.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type NutritionPlan = typeof nutritionPlans.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type FoodDiaryEntry = typeof foodDiaryEntries.$inferSelect;
export type MemberNutritionSettings = typeof memberNutritionSettings.$inferSelect;
export type CoachBroadcast = typeof coachBroadcasts.$inferSelect;
