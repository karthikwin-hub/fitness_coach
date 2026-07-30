import { z } from "zod";

export const sectionTypeSchema = z.enum([
  "warmup",
  "resistance",
  "core",
  "cardio",
  "stretch",
]);

export type SectionType = z.infer<typeof sectionTypeSchema>;

export const templateExerciseSchema = z.object({
  /** Stable slug into the tenant exercise catalog. */
  exerciseSlug: z.string().min(1),
  reps: z.string().min(1),
  sets: z.number().int().positive(),
  supersetGroup: z.string().optional(),
});

export type TemplateExercise = z.infer<typeof templateExerciseSchema>;

export const templateDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  label: z.string().min(1),
  muscleGroup: z.string().optional(),
  sections: z.array(
    z.object({
      type: sectionTypeSchema,
      restNote: z.string().optional(),
      exercises: z.array(templateExerciseSchema),
    }),
  ),
});

export type TemplateDay = z.infer<typeof templateDaySchema>;

export const trainingTemplateStructureSchema = z.object({
  version: z.literal(1),
  stepGoal: z.number().int().positive(),
  profile: z.object({
    environment: z.enum(["gym", "home"]),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  }),
  days: z.array(templateDaySchema).min(1),
});

export type TrainingTemplateStructure = z.infer<
  typeof trainingTemplateStructureSchema
>;

/** @deprecated Prefer exerciseSlug-based fixtures. Kept for name-resolution helpers. */
export type LegacyTemplateExercise = {
  exerciseName: string;
  reps: string;
  sets: number;
  supersetGroup?: string;
};

export type TrainingTemplate = {
  type: "training_gym" | "training_home";
  key: string;
  name: string;
  structure: TrainingTemplateStructure;
};

function day(
  dayIndex: number,
  label: string,
  muscleGroup: string,
  sections: TemplateDay["sections"],
): TemplateDay {
  return { dayIndex, label, muscleGroup, sections };
}

function ex(
  exerciseSlug: string,
  reps: string,
  sets: number,
  supersetGroup?: string,
): TemplateExercise {
  return { exerciseSlug, reps, sets, ...(supersetGroup ? { supersetGroup } : {}) };
}

/** ASIS-depth gym week (Avinash-style). */
export const GYM_W1_STRUCTURE: TrainingTemplateStructure = {
  version: 1,
  stepGoal: 10000,
  profile: { environment: "gym", level: "intermediate" },
  days: [
    day(0, "Mon — Back & Biceps", "back & biceps", [
      {
        type: "warmup",
        exercises: [
          ex("full-body-stretch", "—", 1),
          ex("treadmill-warmup-10", "10 min", 1),
          ex("pushups", "10", 3),
        ],
      },
      {
        type: "resistance",
        restNote: "rest 40-90 secs after each set",
        exercises: [
          ex("lat-pulldown-wide", "8-12", 3),
          ex("seated-cable-row", "8-12", 3),
          ex("db-single-arm-row", "8-12", 3),
          ex("db-bicep-curl", "8-12", 3),
          ex("db-hammer-curl", "8-12", 3),
          ex("cable-bicep-curl", "8-12", 3),
        ],
      },
      {
        type: "core",
        exercises: [
          ex("high-knees", "20", 3),
          ex("deadbug", "20", 3, "2A"),
          ex("russian-twist", "20", 3, "2B"),
          ex("glute-bridge", "15", 3, "2C"),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(1, "Tue — Legs & Shoulders", "legs & shoulders", [
      {
        type: "warmup",
        exercises: [
          ex("full-body-stretch", "—", 1),
          ex("treadmill-warmup-10", "10 min", 1),
          ex("bodyweight-squat", "12", 2),
        ],
      },
      {
        type: "resistance",
        restNote: "rest 40-90 secs after each set",
        exercises: [
          ex("goblet-squat", "8-12", 3),
          ex("walking-lunges", "10/leg", 3),
          ex("cossack-squat", "8/side", 3),
          ex("db-shoulder-press", "8-12", 3, "1A"),
          ex("arnold-press", "8-12", 3, "1B"),
          ex("lateral-raise", "12", 3),
        ],
      },
      {
        type: "core",
        exercises: [
          ex("plank-hold", "45s", 3),
          ex("mountain-climbers", "30s", 3),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(2, "Wed — Chest & Triceps", "chest & triceps", [
      {
        type: "warmup",
        exercises: [
          ex("full-body-stretch", "—", 1),
          ex("treadmill-warmup-10", "10 min", 1),
          ex("incline-push-up", "12", 2),
        ],
      },
      {
        type: "resistance",
        restNote: "rest 40-90 secs after each set",
        exercises: [
          ex("incline-push-up", "12-15", 3, "1A"),
          ex("cable-fly", "10-12", 3, "1B"),
          ex("pushups", "10-12", 3),
          ex("triceps-pushdown", "10-12", 3, "2A"),
          ex("overhead-triceps-ext", "10-12", 3, "2B"),
        ],
      },
      {
        type: "core",
        exercises: [
          ex("plank-hold", "45s", 3, "1A"),
          ex("mountain-climbers", "30s", 3, "1B"),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(3, "Thu — Active Rest", "liss cardio", [
      {
        type: "cardio",
        exercises: [ex("walk-run-5k", "5 km", 1)],
      },
      {
        type: "core",
        exercises: [ex("plank-hold", "45s", 2), ex("glute-bridge", "15", 2)],
      },
      { type: "stretch", exercises: [] },
    ]),
    day(4, "Fri — Full Body Circuit 1", "full body", [
      {
        type: "warmup",
        exercises: [
          ex("full-body-stretch", "—", 1),
          ex("treadmill-warmup-10", "10 min", 1),
        ],
      },
      {
        type: "resistance",
        restNote: "circuit - rest 30-40 secs",
        exercises: [
          ex("bodyweight-squat", "12", 3, "1A"),
          ex("lat-pulldown-wide", "12", 3, "1B"),
          ex("plank-hold", "30s", 3, "1C"),
          ex("skier-swing", "20", 3, "1D"),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(5, "Sat — Full Body Circuit 2", "full body", [
      {
        type: "warmup",
        exercises: [ex("treadmill-warmup-10", "10 min", 1)],
      },
      {
        type: "resistance",
        restNote: "circuit - rest 30-40 secs",
        exercises: [
          ex("walking-lunges", "12", 3, "1A"),
          ex("incline-push-up", "12", 3, "1B"),
          ex("mountain-climbers", "30s", 3, "1C"),
          ex("burpees", "10", 3, "1D"),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(6, "Sun — Rest", "rest", []),
  ],
};

/** ASIS-depth home week (Shruti-style). */
export const HOME_W21_STRUCTURE: TrainingTemplateStructure = {
  version: 1,
  stepGoal: 10000,
  profile: { environment: "home", level: "intermediate" },
  days: [
    day(0, "Mon — Full Circuit", "full", [
      {
        type: "warmup",
        exercises: [
          ex("full-body-stretch", "—", 1),
          ex("plank-hold", "30s", 2),
        ],
      },
      {
        type: "resistance",
        restNote: "circuit - minimal rest between 1A-1D",
        exercises: [
          ex("bodyweight-squat", "15", 3, "1A"),
          ex("incline-push-up", "12", 3, "1B"),
          ex("glute-bridge", "15", 3, "1C"),
          ex("mountain-climbers", "30s", 3, "1D"),
        ],
      },
      {
        type: "cardio",
        exercises: [ex("burpees", "10", 3)],
      },
      { type: "stretch", exercises: [] },
    ]),
    day(1, "Tue — Core", "core", [
      {
        type: "core",
        exercises: [
          ex("plank-hold", "45s", 3, "1A"),
          ex("mountain-climbers", "30s", 3, "1B"),
          ex("deadbug", "20", 3, "1C"),
          ex("glute-bridge", "15", 3, "1D"),
        ],
      },
      { type: "stretch", exercises: [] },
    ]),
    day(2, "Wed — Legs", "legs", [
      {
        type: "warmup",
        exercises: [ex("full-body-stretch", "—", 1)],
      },
      {
        type: "resistance",
        restNote: "rest 45-60 secs",
        exercises: [
          ex("walking-lunges", "12", 3, "1A"),
          ex("glute-bridge", "15", 3, "1B"),
          ex("bodyweight-squat", "15", 3, "1C"),
          ex("cossack-squat", "8/side", 2),
        ],
      },
      { type: "cardio", exercises: [] },
      { type: "stretch", exercises: [] },
    ]),
    day(3, "Thu — Active Rest", "walk", [
      {
        type: "cardio",
        exercises: [ex("walk-run-5k", "5 km", 1)],
      },
      { type: "stretch", exercises: [] },
    ]),
    day(4, "Fri — Upper Body", "upper", [
      {
        type: "warmup",
        exercises: [ex("plank-hold", "30s", 2)],
      },
      {
        type: "resistance",
        exercises: [
          ex("incline-push-up", "15", 4, "1A"),
          ex("plank-hold", "30s", 3, "1B"),
          ex("mountain-climbers", "30s", 3, "1C"),
          ex("skier-swing", "20", 3),
        ],
      },
      { type: "cardio", exercises: [ex("burpees", "10", 3)] },
      { type: "stretch", exercises: [] },
    ]),
    day(5, "Sat — Cardio", "cardio", [
      {
        type: "cardio",
        exercises: [
          ex("mountain-climbers", "45s", 4),
          ex("burpees", "10", 4),
          ex("high-knees", "30s", 3),
        ],
      },
      { type: "stretch", exercises: [] },
    ]),
    day(6, "Sun — Rest", "rest", []),
  ],
};

export const GYM_W1_TEMPLATE: TrainingTemplate = {
  type: "training_gym",
  key: "training_gym",
  name: "Gym — 4-day split",
  structure: GYM_W1_STRUCTURE,
};

export const HOME_W21_TEMPLATE: TrainingTemplate = {
  type: "training_home",
  key: "training_home",
  name: "Home — circuit week",
  structure: HOME_W21_STRUCTURE,
};

export const TRAINING_TEMPLATES = [GYM_W1_TEMPLATE, HOME_W21_TEMPLATE];

export type ResolvedTemplateDay = {
  dayIndex: number;
  label: string;
  muscleGroup?: string;
  sections: Array<{
    type: SectionType;
    restNote?: string;
    exercises: Array<{
      exerciseId: string;
      reps: string;
      sets: number;
      supersetGroup?: string;
    }>;
  }>;
};

/**
 * Resolve template days against a slug->id exercise map.
 * Throws if any referenced exercise is missing (never silently drops).
 */
export function resolveTemplateDays(
  structure: TrainingTemplateStructure,
  exerciseMapBySlug: Record<string, string>,
): ResolvedTemplateDay[] {
  const missing = new Set<string>();
  for (const d of structure.days) {
    for (const s of d.sections) {
      for (const e of s.exercises) {
        if (!exerciseMapBySlug[e.exerciseSlug]) missing.add(e.exerciseSlug);
      }
    }
  }
  if (missing.size > 0) {
    throw new Error(
      `Template references missing exercises: ${[...missing].sort().join(", ")}`,
    );
  }

  return structure.days.map((d) => ({
    dayIndex: d.dayIndex,
    label: d.label,
    muscleGroup: d.muscleGroup,
    sections: d.sections.map((section) => ({
      type: section.type,
      restNote: section.restNote,
      exercises: section.exercises.map((e) => ({
        exerciseId: exerciseMapBySlug[e.exerciseSlug]!,
        reps: e.reps,
        sets: e.sets,
        ...(e.supersetGroup ? { supersetGroup: e.supersetGroup } : {}),
      })),
    })),
  }));
}

export function parseTrainingTemplateStructure(
  raw: unknown,
): TrainingTemplateStructure {
  return trainingTemplateStructureSchema.parse(raw);
}
