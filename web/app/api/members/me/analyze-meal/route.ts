import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId, getPublishedNutritionPlan } from "@/lib/plans/queries";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await getMemberByUserId(user.id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json();
  const mealPhotoUrl = body.mealPhotoUrl as string | undefined;
  if (!mealPhotoUrl) {
    return NextResponse.json({ error: "mealPhotoUrl required" }, { status: 400 });
  }

  const nutrition = await getPublishedNutritionPlan(member.id);
  const analysis = await analyzeMealPhoto(mealPhotoUrl, {
    caloriesMin: nutrition?.caloriesMin,
    caloriesMax: nutrition?.caloriesMax,
    proteinMin: nutrition?.proteinMin,
    proteinMax: nutrition?.proteinMax,
    carbsMax: nutrition?.carbsMax,
    fatMin: nutrition?.fatMin,
    fatMax: nutrition?.fatMax,
  });

  return NextResponse.json(analysis);
}
