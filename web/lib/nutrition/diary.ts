import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodDiaryEntries, type FoodDiaryEntry } from "@/lib/db/schema";
import { scoreCompliance } from "@/lib/gemini/compliance";
import type { MacroTargets } from "@/lib/gemini/meal-analysis";
import type { DiaryEntryDto, MacroTotals, MealType } from "@/lib/nutrition/types";

export function localLogDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDiaryEntryDto(row: FoodDiaryEntry): DiaryEntryDto {
  return {
    id: row.id,
    logDate: row.logDate,
    mealType: row.mealType,
    source: row.source,
    foodName: row.foodName,
    externalFoodId: row.externalFoodId,
    externalProvider: row.externalProvider,
    servingDescription: row.servingDescription,
    quantity: row.quantity,
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    photoUrl: row.photoUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

export function computeMacroTotals(entries: Pick<FoodDiaryEntry, "calories" | "proteinG" | "carbsG" | "fatG">[]): MacroTotals {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      proteinG: acc.proteinG + entry.proteinG,
      carbsG: acc.carbsG + entry.carbsG,
      fatG: acc.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function scoreDailyCompliance(totals: MacroTotals, targets: MacroTargets) {
  return scoreCompliance(
    {
      calories: totals.calories,
      proteinG: totals.proteinG,
      carbsG: totals.carbsG,
      fatG: totals.fatG,
    },
    targets,
  );
}

export async function listFoodDiaryEntries(memberId: string, logDate: string) {
  return db
    .select()
    .from(foodDiaryEntries)
    .where(and(eq(foodDiaryEntries.memberId, memberId), eq(foodDiaryEntries.logDate, logDate)))
    .orderBy(asc(foodDiaryEntries.createdAt));
}

export async function addFoodDiaryEntry(input: {
  tenantId: string;
  memberId: string;
  logDate: string;
  mealType: MealType;
  source: FoodDiaryEntry["source"];
  foodName: string;
  externalFoodId?: string | null;
  externalProvider?: string | null;
  servingDescription?: string | null;
  quantity?: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoUrl?: string | null;
}) {
  const quantity = input.quantity ?? 1;
  const [row] = await db
    .insert(foodDiaryEntries)
    .values({
      tenantId: input.tenantId,
      memberId: input.memberId,
      logDate: input.logDate,
      mealType: input.mealType,
      source: input.source,
      foodName: input.foodName,
      externalFoodId: input.externalFoodId ?? null,
      externalProvider: input.externalProvider ?? null,
      servingDescription: input.servingDescription ?? null,
      quantity,
      calories: Math.round(input.calories * quantity),
      proteinG: input.proteinG * quantity,
      carbsG: input.carbsG * quantity,
      fatG: input.fatG * quantity,
      photoUrl: input.photoUrl ?? null,
    })
    .returning();

  return row;
}

export async function deleteFoodDiaryEntry(memberId: string, entryId: string) {
  const [deleted] = await db
    .delete(foodDiaryEntries)
    .where(and(eq(foodDiaryEntries.id, entryId), eq(foodDiaryEntries.memberId, memberId)))
    .returning();

  return deleted ?? null;
}

export async function getFoodDiaryDay(memberId: string, logDate: string) {
  const entries = await listFoodDiaryEntries(memberId, logDate);
  const totals = computeMacroTotals(entries);
  return {
    logDate,
    entries: entries.map(toDiaryEntryDto),
    totals,
  };
}
