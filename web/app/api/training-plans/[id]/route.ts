import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, isCoach, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import { getMemberByUserId } from "@/lib/members/queries";
import { getTrainingPlanById } from "@/lib/plans/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await getTrainingPlanById(id);
  if (!plan || plan.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isCoach(user)) {
    const member = await getMemberByUserId(user.id, user.tenantId);
    if (!member || member.id !== plan.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(plan);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(trainingPlans)
    .where(and(eq(trainingPlans.id, id), eq(trainingPlans.tenantId, user.tenantId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [plan] = await db
    .update(trainingPlans)
    .set({
      weekNumber: body.weekNumber ?? existing.weekNumber,
      stepGoal: body.stepGoal ?? existing.stepGoal,
      blockIdsJson: body.blockIdsJson ?? existing.blockIdsJson,
      effectiveFrom: body.effectiveFrom ?? existing.effectiveFrom,
      templateType: body.templateType ?? existing.templateType,
      updatedAt: new Date(),
    })
    .where(and(eq(trainingPlans.id, id), eq(trainingPlans.tenantId, user.tenantId)))
    .returning();

  return NextResponse.json(plan);
}
