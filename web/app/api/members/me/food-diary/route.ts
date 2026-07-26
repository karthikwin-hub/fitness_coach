import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";
import {
  addFoodDiaryEntry,
  getFoodDiaryDay,
  localLogDateString,
  scoreDailyCompliance,
} from "@/lib/nutrition/diary";
import type { MealType } from "@/lib/nutrition/types";

const MEALS = new Set(["breakfast", "lunch", "dinner", "snack"]);
const SOURCES = new Set(["search", "manual", "photo_ai"]);

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const logDate =
    request.nextUrl.searchParams.get("date") ?? localLogDateString();

  const [day, nutrition] = await Promise.all([
    getFoodDiaryDay(member.id, logDate),
    getPublishedNutritionPlan(member.id),
  ]);

  const compliance = nutrition
    ? scoreDailyCompliance(day.totals, {
        caloriesMin: nutrition.caloriesMin,
        caloriesMax: nutrition.caloriesMax,
        proteinMin: nutrition.proteinMin,
        proteinMax: nutrition.proteinMax,
        carbsMax: nutrition.carbsMax,
        fatMin: nutrition.fatMin,
        fatMax: nutrition.fatMax,
      })
    : null;

  return NextResponse.json({
    ...day,
    targets: nutrition
      ? {
          caloriesMin: nutrition.caloriesMin,
          caloriesMax: nutrition.caloriesMax,
          proteinMin: nutrition.proteinMin,
          proteinMax: nutrition.proteinMax,
          carbsMax: nutrition.carbsMax,
          fatMin: nutrition.fatMin,
          fatMax: nutrition.fatMax,
        }
      : null,
    compliance,
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json();
  const mealType = body.mealType as MealType | undefined;
  const source = body.source as string | undefined;
  const foodName = (body.foodName as string | undefined)?.trim();

  if (!mealType || !MEALS.has(mealType)) {
    return NextResponse.json({ error: "Invalid mealType" }, { status: 400 });
  }
  if (!source || !SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  if (!foodName) {
    return NextResponse.json({ error: "foodName required" }, { status: 400 });
  }

  const calories = Number(body.calories);
  const proteinG = Number(body.proteinG);
  const carbsG = Number(body.carbsG);
  const fatG = Number(body.fatG);

  if ([calories, proteinG, carbsG, fatG].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "Invalid macros" }, { status: 400 });
  }

  const row = await addFoodDiaryEntry({
    tenantId: user.tenantId,
    memberId: member.id,
    logDate: (body.logDate as string | undefined) ?? localLogDateString(),
    mealType,
    source: source as "search" | "manual" | "photo_ai",
    foodName,
    externalFoodId: body.externalFoodId ?? null,
    externalProvider: body.externalProvider ?? null,
    servingDescription: body.servingDescription ?? null,
    quantity: body.quantity != null ? Number(body.quantity) : 1,
    calories,
    proteinG,
    carbsG,
    fatG,
    photoUrl: body.photoUrl ?? null,
  });

  return NextResponse.json(row, { status: 201 });
}
