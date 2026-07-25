import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import {
  cloneTrainingPlan,
  createTrainingPlanFromInput,
  getTrainingPlanWithDays,
} from "@/lib/plans/training";

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
    .from(trainingPlans)
    .where(eq(trainingPlans.memberId, memberId))
    .orderBy(desc(trainingPlans.weekNumber));

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.cloneFromPlanId) {
    const plan = await cloneTrainingPlan(
      body.cloneFromPlanId,
      body.memberId,
      body.weekNumber,
    );
    return NextResponse.json(plan, { status: 201 });
  }

  const plan = await createTrainingPlanFromInput(user.tenantId, body.memberId, {
    weekNumber: body.weekNumber,
    stepGoal: body.stepGoal,
    templateType: body.templateType,
    days: body.days ?? [],
  });

  return NextResponse.json(plan, { status: 201 });
}