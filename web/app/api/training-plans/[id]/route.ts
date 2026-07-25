import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import { getTrainingPlanById } from "@/lib/plans/queries";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const plan = await getTrainingPlanById(id);
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    .where(eq(trainingPlans.id, id))
    .limit(1);

  if (!existing || existing.tenantId !== user.tenantId) {
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
    .where(eq(trainingPlans.id, id))
    .returning();

  return NextResponse.json(plan);
}
