import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { nutritionPlans } from "@/lib/db/schema";

export async function cloneNutritionPlan(
  sourcePlanId: string,
  targetMemberId: string,
  weekNumber: number,
) {
  const [source] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.id, sourcePlanId))
    .limit(1);

  if (!source) throw new Error("Source nutrition plan not found");

  const [newPlan] = await db
    .insert(nutritionPlans)
    .values({
      tenantId: source.tenantId,
      memberId: targetMemberId,
      weekNumber,
      caloriesMin: source.caloriesMin,
      caloriesMax: source.caloriesMax,
      proteinMin: source.proteinMin,
      proteinMax: source.proteinMax,
      carbsMax: source.carbsMax,
      fatMin: source.fatMin,
      fatMax: source.fatMax,
      blockIdsJson: source.blockIdsJson,
      status: "draft",
    })
    .returning();

  return newPlan;
}
