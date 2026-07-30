import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { getMemberByUserId } from "@/lib/members/queries";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";
import { resolveOptionalMediaUrl } from "@/lib/firebase/resolve-media-fields";

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
  const mealPhotoUrl = body.mealPhotoUrl as string | undefined;
  if (!mealPhotoUrl) {
    return NextResponse.json({ error: "mealPhotoUrl required" }, { status: 400 });
  }

  const nutrition = await getPublishedNutritionPlan(member.id);
  const playablePhotoUrl = await resolveOptionalMediaUrl(mealPhotoUrl);
  if (!playablePhotoUrl) {
    return NextResponse.json({ error: "Photo URL unavailable" }, { status: 400 });
  }

  const analysis = await analyzeMealPhoto(playablePhotoUrl, {
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
