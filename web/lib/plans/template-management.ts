export const BUILT_IN_TEMPLATE_TYPES = new Set([
  "training_gym",
  "training_home",
  "nutrition_program",
]);

export function isBuiltInTemplateType(type: string): boolean {
  return BUILT_IN_TEMPLATE_TYPES.has(type);
}

export function canDeleteTemplate(type: string): boolean {
  return type === "plan_bundle";
}

export type TemplateListRow = {
  id: string;
  type: string;
  archivedAt?: Date | string | null;
  hasNutrition?: boolean;
};

export function filterActiveTemplates<T extends TemplateListRow>(rows: T[]): T[] {
  return rows.filter((r) => !r.archivedAt);
}

export function filterArchivedTemplates<T extends TemplateListRow>(rows: T[]): T[] {
  return rows.filter((r) => Boolean(r.archivedAt));
}

export function listNutritionTemplates<
  T extends { type: string; hasNutrition?: boolean },
>(templates: T[]): T[] {
  return templates.filter(
    (t) => t.type === "nutrition_program" || (t.type === "plan_bundle" && t.hasNutrition),
  );
}

export function listCustomBundles<T extends { type: string }>(templates: T[]): T[] {
  return templates.filter((t) => t.type === "plan_bundle");
}

export function listBuiltInTrainingTemplates<T extends { type: string }>(templates: T[]): T[] {
  return templates.filter((t) => t.type === "training_gym" || t.type === "training_home");
}
