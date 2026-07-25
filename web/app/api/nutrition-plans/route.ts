import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { nutritionPlans } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const plans = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.memberId, memberId))
    .orderBy(desc(nutritionPlans.weekNumber));

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.cloneFromPlanId) {
    const [source] = await db
      .select()
      .from(nutritionPlans)
      .where(eq(nutritionPlans.id, body.cloneFromPlanId))
      .limit(1);

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const [plan] = await db
      .insert(nutritionPlans)
      .values({
        tenantId: user.tenantId,
        memberId: source.memberId,
        weekNumber: body.weekNumber ?? source.weekNumber + 1,
        caloriesMin: body.caloriesMin ?? source.caloriesMin,
        caloriesMax: body.caloriesMax ?? source.caloriesMax,
        proteinMin: body.proteinMin ?? source.proteinMin,
        proteinMax: body.proteinMax ?? source.proteinMax,
        carbsMax: body.carbsMax ?? source.carbsMax,
        fatMin: body.fatMin ?? source.fatMin,
        fatMax: body.fatMax ?? source.fatMax,
        blockIdsJson: body.blockIdsJson ?? source.blockIdsJson,
        status: "draft",
      })
      .returning();

    return NextResponse.json(plan, { status: 201 });
  }

  const [plan] = await db
    .insert(nutritionPlans)
    .values({
      tenantId: user.tenantId,
      memberId: body.memberId,
      weekNumber: body.weekNumber,
      caloriesMin: body.caloriesMin,
      caloriesMax: body.caloriesMax,
      proteinMin: body.proteinMin,
      proteinMax: body.proteinMax,
      carbsMax: body.carbsMax,
      fatMin: body.fatMin,
      fatMax: body.fatMax,
      blockIdsJson: body.blockIdsJson ?? [],
      status: "draft",
    })
    .returning();

  return NextResponse.json(plan, { status: 201 });
}
