import type { MacroTargets } from "./meal-analysis";

export function scoreCompliance(
  estimated: { calories: number; proteinG: number; carbsG: number; fatG: number },
  targets: MacroTargets,
): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 1;

  if (targets.proteinMin && estimated.proteinG < targets.proteinMin * 0.85) {
    flags.push(`Protein low (${estimated.proteinG}g vs min ${targets.proteinMin}g)`);
    score -= 0.2;
  }
  if (targets.proteinMax && estimated.proteinG > targets.proteinMax * 1.15) {
    flags.push(`Protein high (${estimated.proteinG}g vs max ${targets.proteinMax}g)`);
    score -= 0.1;
  }
  if (targets.carbsMax && estimated.carbsG > targets.carbsMax * 1.15) {
    flags.push(`Carbs high (${estimated.carbsG}g vs max ${targets.carbsMax}g)`);
    score -= 0.2;
  }
  if (targets.caloriesMax && estimated.calories > targets.caloriesMax * 1.1) {
    flags.push(`Calories high (${estimated.calories} vs max ${targets.caloriesMax})`);
    score -= 0.15;
  }
  if (targets.caloriesMin && estimated.calories < targets.caloriesMin * 0.85) {
    flags.push(`Calories low (${estimated.calories} vs min ${targets.caloriesMin})`);
    score -= 0.1;
  }

  return { score: Math.max(0, Math.min(1, score)), flags };
}
