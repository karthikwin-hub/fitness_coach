import { z } from "zod";
import {
  trainingTemplateStructureSchema,
  type TrainingTemplateStructure,
} from "@/lib/plans/templates";

export const nutritionTemplateSchema = z.object({
  caloriesMin: z.number().int().nullable().optional(),
  caloriesMax: z.number().int().nullable().optional(),
  proteinMin: z.number().int().nullable().optional(),
  proteinMax: z.number().int().nullable().optional(),
  carbsMax: z.number().int().nullable().optional(),
  fatMin: z.number().int().nullable().optional(),
  fatMax: z.number().int().nullable().optional(),
  blockSlugs: z.array(z.string()).default([]),
});

export type NutritionTemplate = z.infer<typeof nutritionTemplateSchema>;

export const planBundleStructureSchema = z.object({
  version: z.literal(1),
  training: trainingTemplateStructureSchema.optional(),
  nutrition: nutritionTemplateSchema.optional(),
  trainingBlockSlugs: z.array(z.string()).default([]),
});

export type PlanBundleStructure = z.infer<typeof planBundleStructureSchema>;

export function parsePlanBundleStructure(raw: unknown): PlanBundleStructure {
  return planBundleStructureSchema.parse(raw);
}

export function serializePlanBundleStructure(
  bundle: PlanBundleStructure,
): PlanBundleStructure {
  return planBundleStructureSchema.parse(bundle);
}

export function deserializePlanBundleStructure(raw: unknown): PlanBundleStructure {
  return parsePlanBundleStructure(raw);
}

export function parseNutritionTemplate(raw: unknown): NutritionTemplate {
  return nutritionTemplateSchema.parse(raw);
}

export function extractTrainingFromTemplate(
  type: string,
  structureJson: unknown,
): TrainingTemplateStructure | null {
  if (type === "plan_bundle") {
    const bundle = parsePlanBundleStructure(structureJson);
    return bundle.training ?? null;
  }
  try {
    return trainingTemplateStructureSchema.parse(structureJson);
  } catch {
    return null;
  }
}

export function extractNutritionFromTemplate(
  type: string,
  structureJson: unknown,
): NutritionTemplate | null {
  if (type === "plan_bundle") {
    const bundle = parsePlanBundleStructure(structureJson);
    return bundle.nutrition ?? null;
  }
  try {
    return nutritionTemplateSchema.parse(structureJson);
  } catch {
    return null;
  }
}

export function extractTrainingBlockSlugsFromTemplate(
  type: string,
  structureJson: unknown,
): string[] {
  if (type === "plan_bundle") {
    const bundle = parsePlanBundleStructure(structureJson);
    return bundle.trainingBlockSlugs;
  }
  return [];
}
