import {
  parseNutritionTemplate,
  parsePlanBundleStructure,
  type NutritionTemplate,
} from "@/lib/plans/template-bundle";
import {
  parseTrainingTemplateStructure,
  type TrainingTemplateStructure,
} from "@/lib/plans/templates";

export type TemplateStructurePreview = {
  training: {
    stepGoal: number;
    environment: string;
    dayCount: number;
    exerciseCount: number;
    days: Array<{
      label: string;
      muscleGroup?: string;
      exercises: Array<{ slug: string; sets: number; reps: string }>;
    }>;
  } | null;
  nutrition: {
    caloriesMin: number | null;
    caloriesMax: number | null;
    proteinMin: number | null;
    proteinMax: number | null;
    blockSlugs: string[];
  } | null;
  trainingBlockSlugs: string[];
};

function summarizeTraining(structure: TrainingTemplateStructure): TemplateStructurePreview["training"] {
  const days = structure.days.map((d) => ({
    label: d.label,
    muscleGroup: d.muscleGroup,
    exercises: d.sections.flatMap((s) =>
      s.exercises.map((e) => ({
        slug: e.exerciseSlug,
        sets: e.sets,
        reps: e.reps,
      })),
    ),
  }));
  const exerciseCount = days.reduce((n, d) => n + d.exercises.length, 0);
  return {
    stepGoal: structure.stepGoal,
    environment: structure.profile.environment,
    dayCount: structure.days.length,
    exerciseCount,
    days,
  };
}

function summarizeNutrition(n: NutritionTemplate): TemplateStructurePreview["nutrition"] {
  return {
    caloriesMin: n.caloriesMin ?? null,
    caloriesMax: n.caloriesMax ?? null,
    proteinMin: n.proteinMin ?? null,
    proteinMax: n.proteinMax ?? null,
    blockSlugs: n.blockSlugs ?? [],
  };
}

export function summarizeTemplateStructure(
  type: string,
  structureJson: unknown,
): TemplateStructurePreview {
  if (type === "plan_bundle") {
    const bundle = parsePlanBundleStructure(structureJson);
    return {
      training: bundle.training ? summarizeTraining(bundle.training) : null,
      nutrition: bundle.nutrition ? summarizeNutrition(bundle.nutrition) : null,
      trainingBlockSlugs: bundle.trainingBlockSlugs ?? [],
    };
  }

  if (type === "training_gym" || type === "training_home") {
    const training = parseTrainingTemplateStructure(structureJson);
    return {
      training: summarizeTraining(training),
      nutrition: null,
      trainingBlockSlugs: [],
    };
  }

  if (type === "nutrition_program") {
    const nutrition = parseNutritionTemplate(structureJson);
    return {
      training: null,
      nutrition: summarizeNutrition(nutrition),
      trainingBlockSlugs: [],
    };
  }

  return { training: null, nutrition: null, trainingBlockSlugs: [] };
}
