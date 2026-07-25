import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getFoodDiaryDay,
  localLogDateString,
  scoreDailyCompliance,
} from "@/lib/nutrition/diary";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";
import { isValidMemberId } from "@/lib/members/uuid";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await params;
  if (!isValidMemberId(memberId)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.tenantId, user.tenantId)))
    .limit(1);

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
