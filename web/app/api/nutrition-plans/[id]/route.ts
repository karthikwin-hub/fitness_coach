import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { nutritionPlans } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.id, id))
    .limit(1);

  if (!existing || existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [plan] = await db
    .update(nutritionPlans)
    .set({
      weekNumber: body.weekNumber ?? existing.weekNumber,
      caloriesMin: body.caloriesMin ?? existing.caloriesMin,
      caloriesMax: body.caloriesMax ?? existing.caloriesMax,
      proteinMin: body.proteinMin ?? existing.proteinMin,
      proteinMax: body.proteinMax ?? existing.proteinMax,
      carbsMax: body.carbsMax ?? existing.carbsMax,
      fatMin: body.fatMin ?? existing.fatMin,
      fatMax: body.fatMax ?? existing.fatMax,
      blockIdsJson: body.blockIdsJson ?? existing.blockIdsJson,
      effectiveFrom: body.effectiveFrom ?? existing.effectiveFrom,
      updatedAt: new Date(),
    })
    .where(eq(nutritionPlans.id, id))
    .returning();

  return NextResponse.json(plan);
}
