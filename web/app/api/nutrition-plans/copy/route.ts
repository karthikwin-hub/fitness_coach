import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { members, nutritionPlans } from "@/lib/db/schema";
import { cloneNutritionPlan } from "@/lib/plans/nutrition-clone";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const sourcePlanId = body.sourcePlanId ?? body.planId;

  if (!sourcePlanId) {
    return NextResponse.json({ error: "sourcePlanId required" }, { status: 400 });
  }
  if (!body.targetMemberId) {
    return NextResponse.json({ error: "targetMemberId required" }, { status: 400 });
  }

  const [source] = await db
    .select()
    .from(nutritionPlans)
    .where(
      and(eq(nutritionPlans.id, sourcePlanId), eq(nutritionPlans.tenantId, user.tenantId)),
    )
    .limit(1);

  if (!source) {
    return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
  }

  const [targetMember] = await db
    .select({ id: members.id })
    .from(members)
    .where(
      and(eq(members.id, body.targetMemberId), eq(members.tenantId, user.tenantId)),
    )
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ error: "Target member not found" }, { status: 404 });
  }

  const weekNumber = body.weekNumber ?? source.weekNumber;

  try {
    const newPlan = await cloneNutritionPlan(
      sourcePlanId,
      body.targetMemberId,
      weekNumber,
    );
    return NextResponse.json(newPlan, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Copy failed" },
      { status: 400 },
    );
  }
}
