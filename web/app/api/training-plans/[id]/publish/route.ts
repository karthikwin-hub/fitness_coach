import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { trainingPlans } from "@/lib/db/schema";
import { recordPublication } from "@/lib/plans/queries";
import { unpublishOtherTrainingPlans } from "@/lib/plans/training";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let assemblyDurationSeconds: number | undefined;
  try {
    const body = await request.json();
    assemblyDurationSeconds = body.assemblyDurationSeconds;
  } catch {
    // no body
  }

  const [plan] = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, id))
    .limit(1);

  if (!plan || plan.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await unpublishOtherTrainingPlans(plan.memberId, id);

  const revision = await recordPublication(
    user.tenantId,
    "training",
    id,
    plan.memberId,
    user.id,
    assemblyDurationSeconds,
  );

  return NextResponse.json({
    published: true,
    revisionNumber: revision,
    underTarget:
      assemblyDurationSeconds != null && assemblyDurationSeconds <= 300,
  });
}
