import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import { cloneTrainingPlan } from "@/lib/plans/training";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [source] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, id))
    .limit(1);

  if (!source || source.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newPlan = await cloneTrainingPlan(
    id,
    source.memberId,
    body.weekNumber ?? source.weekNumber + 1,
  );

  return NextResponse.json(newPlan, { status: 201 });
}
