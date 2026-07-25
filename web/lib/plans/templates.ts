type SectionType = "warmup" | "resistance" | "core" | "cardio" | "stretch";

export type TemplateExercise = {
  exerciseName: string;
  reps: string;
  sets: number;
  supersetGroup?: string;
};

export type TemplateDay = {
  dayIndex: number;
  label: string;
  muscleGroup?: string;
  sections: Array<{
    type: SectionType;
    restNote?: string;
    exercises: TemplateExercise[];
  }>;
};

export type TrainingTemplate = {
  type: "training_gym" | "training_home";
  name: string;
  stepGoal: number;
  days: TemplateDay[];
};

export const GYM_W1_TEMPLATE: TrainingTemplate = {
  type: "training_gym",
  name: "Gym Split Week (Avinash W1)",
  stepGoal: 10000,
  days: [
    {
      dayIndex: 0,
      label: "Mon — Back & Biceps",
      muscleGroup: "back",
      sections: [
        {
          type: "warmup",
          exercises: [{ exerciseName: "Plank Hold", reps: "30s", sets: 2 }],
        },
        {
          type: "resistance",
          restNote: "Rest 60–90s after superset",
          exercises: [
            { exerciseName: "Lat Pulldown", reps: "12", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Seated Cable Row", reps: "12", sets: 3, supersetGroup: "1B" },
            { exerciseName: "Barbell Curl", reps: "10", sets: 3, supersetGroup: "1C" },
          ],
        },
        { type: "stretch", exercises: [] },
      ],
    },
    {
      dayIndex: 1,
      label: "Tue — Chest & Triceps",
      muscleGroup: "chest",
      sections: [
        {
          type: "resistance",
          exercises: [
            { exerciseName: "Incline Push-Up", reps: "15", sets: 3, supersetGroup: "1A" },
          ],
        },
      ],
    },
    {
      dayIndex: 2,
      label: "Wed — Legs",
      muscleGroup: "legs",
      sections: [
        {
          type: "resistance",
          exercises: [
            { exerciseName: "Bodyweight Squat", reps: "15", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Walking Lunges", reps: "12", sets: 3, supersetGroup: "1B" },
          ],
        },
      ],
    },
    {
      dayIndex: 3,
      label: "Thu — Shoulders",
      muscleGroup: "shoulders",
      sections: [
        {
          type: "resistance",
          exercises: [
            { exerciseName: "Incline Push-Up", reps: "12", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Plank Hold", reps: "45s", sets: 3, supersetGroup: "1B" },
          ],
        },
      ],
    },
    {
      dayIndex: 4,
      label: "Fri — Full Body",
      muscleGroup: "full",
      sections: [
        {
          type: "resistance",
          restNote: "Superset 1A→1B→1C, rest 60s",
          exercises: [
            { exerciseName: "Bodyweight Squat", reps: "12", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Lat Pulldown", reps: "12", sets: 3, supersetGroup: "1B" },
            { exerciseName: "Plank Hold", reps: "30s", sets: 3, supersetGroup: "1C" },
          ],
        },
        {
          type: "cardio",
          exercises: [{ exerciseName: "Mountain Climbers", reps: "30s", sets: 3 }],
        },
      ],
    },
    { dayIndex: 5, label: "Sat — Active Rest", muscleGroup: "cardio", sections: [] },
    { dayIndex: 6, label: "Sun — Rest", muscleGroup: "rest", sections: [] },
  ],
};

export const HOME_W21_TEMPLATE: TrainingTemplate = {
  type: "training_home",
  name: "Home Circuit Week (Shruti W21)",
  stepGoal: 10000,
  days: [
    {
      dayIndex: 0,
      label: "Mon — Full Circuit",
      muscleGroup: "full",
      sections: [
        {
          type: "warmup",
          exercises: [{ exerciseName: "Plank Hold", reps: "30s", sets: 2 }],
        },
        {
          type: "resistance",
          restNote: "Circuit — minimal rest between 1A–1D",
          exercises: [
            { exerciseName: "Bodyweight Squat", reps: "15", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Incline Push-Up", reps: "12", sets: 3, supersetGroup: "1B" },
            { exerciseName: "Glute Bridge", reps: "15", sets: 3, supersetGroup: "1C" },
            { exerciseName: "Mountain Climbers", reps: "30s", sets: 3, supersetGroup: "1D" },
          ],
        },
        {
          type: "cardio",
          exercises: [{ exerciseName: "Home Circuit Burpees", reps: "10", sets: 3 }],
        },
      ],
    },
    {
      dayIndex: 1,
      label: "Tue — Core",
      muscleGroup: "core",
      sections: [
        {
          type: "core",
          exercises: [
            { exerciseName: "Plank Hold", reps: "45s", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Mountain Climbers", reps: "30s", sets: 3, supersetGroup: "1B" },
          ],
        },
      ],
    },
    {
      dayIndex: 2,
      label: "Wed — Legs",
      muscleGroup: "legs",
      sections: [
        {
          type: "resistance",
          exercises: [
            { exerciseName: "Walking Lunges", reps: "12", sets: 3, supersetGroup: "1A" },
            { exerciseName: "Glute Bridge", reps: "15", sets: 3, supersetGroup: "1B" },
          ],
        },
      ],
    },
    {
      dayIndex: 3,
      label: "Thu — Upper Body",
      muscleGroup: "upper",
      sections: [
        {
          type: "resistance",
          exercises: [
            { exerciseName: "Incline Push-Up", reps: "15", sets: 4, supersetGroup: "1A" },
            { exerciseName: "Plank Hold", reps: "30s", sets: 3, supersetGroup: "1B" },
          ],
        },
      ],
    },
    {
      dayIndex: 4,
      label: "Fri — Cardio",
      muscleGroup: "cardio",
      sections: [
        {
          type: "cardio",
          exercises: [
            { exerciseName: "Mountain Climbers", reps: "45s", sets: 4 },
            { exerciseName: "Home Circuit Burpees", reps: "10", sets: 4 },
          ],
        },
      ],
    },
    { dayIndex: 5, label: "Sat — Active Rest (5k walk)", muscleGroup: "cardio", sections: [] },
    { dayIndex: 6, label: "Sun — Rest", muscleGroup: "rest", sections: [] },
  ],
};

export function resolveTemplateDays(
  template: TrainingTemplate,
  exerciseMap: Record<string, string>,
): Array<{
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
}> {
  return template.days.map((day) => ({
    dayIndex: day.dayIndex,
    label: day.label,
    muscleGroup: day.muscleGroup,
    sections: day.sections.map((section) => ({
      type: section.type,
      restNote: section.restNote,
      exercises: section.exercises
        .map((ex) => {
          const exerciseId = exerciseMap[ex.exerciseName];
          if (!exerciseId) return null;
          return {
            exerciseId,
            reps: ex.reps,
            sets: ex.sets,
            supersetGroup: ex.supersetGroup,
          };
        })
        .filter(Boolean) as Array<{
        exerciseId: string;
        reps: string;
        sets: number;
        supersetGroup?: string;
      }>,
    })),
  }));
}

export const TRAINING_TEMPLATES = [GYM_W1_TEMPLATE, HOME_W21_TEMPLATE];
