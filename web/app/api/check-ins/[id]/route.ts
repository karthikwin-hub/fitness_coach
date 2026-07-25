import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getCheckInById } from "@/lib/check-ins/queries";
import { db } from "@/lib/db";
import { checkIns, tenants } from "@/lib/db/schema";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.id, id))
    .limit(1);

  if (!checkIn || checkIn.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!checkIn.mealPhotoUrl) {
    return NextResponse.json({ error: "No meal photo" }, { status: 400 });
  }

  const nutrition = await getPublishedNutritionPlan(checkIn.memberId);
  const analysis = await analyzeMealPhoto(checkIn.mealPhotoUrl, {
    caloriesMin: nutrition?.caloriesMin,
    caloriesMax: nutrition?.caloriesMax,
    proteinMin: nutrition?.proteinMin,
    proteinMax: nutrition?.proteinMax,
    carbsMax: nutrition?.carbsMax,
    fatMin: nutrition?.fatMin,
    fatMax: nutrition?.fatMax,
  });

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  const threshold = tenant?.aiAutoApproveThreshold ?? 0.85;
  const status =
    analysis.complianceScore >= threshold
      ? "approved"
      : analysis.complianceScore < 0.6
        ? "flagged"
        : "pending";

  const [updated] = await db
    .update(checkIns)
    .set({
      aiAnalysisJson: analysis,
      aiConfidence: analysis.complianceScore,
      status,
    })
    .where(eq(checkIns.id, id))
    .returning();

  const enriched = await getCheckInById(updated.id, user.tenantId);
  return NextResponse.json(enriched ?? updated);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates: {
    status?: "pending" | "approved" | "flagged";
    coachNote?: string | null;
  } = {};
  if (body.status !== undefined) {
    updates.status = body.status as "pending" | "approved" | "flagged";
  }
  if (body.coachNote !== undefined) updates.coachNote = body.coachNote;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(checkIns)
    .set(updates)
    .where(eq(checkIns.id, id))
    .returning();

  if (!updated || updated.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enriched = await getCheckInById(updated.id, user.tenantId);
  return NextResponse.json(enriched ?? updated);
}
