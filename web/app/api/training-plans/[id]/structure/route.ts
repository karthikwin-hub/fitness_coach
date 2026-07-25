import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import { replaceTrainingPlanStructure } from "@/lib/plans/training";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
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

  if (body.stepGoal !== undefined) {
    await db
      .update(trainingPlans)
      .set({ stepGoal: body.stepGoal, updatedAt: new Date() })
      .where(eq(trainingPlans.id, id));
  }

  if (body.days) {
    await replaceTrainingPlanStructure(id, body.days);
  }

  return NextResponse.json({ ok: true });
}
