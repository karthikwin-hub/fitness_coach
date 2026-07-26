import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAuthUser, isCoach, requireCoach } from "@/lib/auth/server";
import { checkInCreateSchema } from "@/lib/check-ins/schemas";
import { enrichCoachCheckIns } from "@/lib/coach/check-in-enrichment";
import { listCheckInsForMember, listCheckInsForTenant } from "@/lib/check-ins/queries";
import { db } from "@/lib/db";
import { checkIns, members, tenants } from "@/lib/db/schema";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";
import { getMemberByUserId } from "@/lib/members/queries";
import { syncMemberStats } from "@/lib/members/sync-stats";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isCoach(user)) {
    const memberId = request.nextUrl.searchParams.get("memberId");
    const items = memberId
      ? await listCheckInsForMember(memberId, user.tenantId)
      : await listCheckInsForTenant(user.tenantId);
    const memberIds = items.map((c) => c.memberId);
    const { trendsByMember } = await enrichCoachCheckIns(user.tenantId, memberIds);
    return NextResponse.json({ items, trendsByMember });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.memberId, member.id))
    .orderBy(desc(checkIns.createdAt))
    .limit(20);

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = checkInCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid check-in payload" }, { status: 400 });
  }
  if (parsed.data._hp) {
    return NextResponse.json({ error: "Invalid check-in payload" }, { status: 400 });
  }

  const body = parsed.data;
  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  const nutrition = await getPublishedNutritionPlan(member.id);
  let aiAnalysis = null;
  let aiConfidence = null;
  let status: "pending" | "approved" | "flagged" = "pending";

  if (body.mealPhotoUrl) {
    try {
      aiAnalysis = await analyzeMealPhoto(body.mealPhotoUrl, {
        caloriesMin: nutrition?.caloriesMin,
        caloriesMax: nutrition?.caloriesMax,
        proteinMin: nutrition?.proteinMin,
        proteinMax: nutrition?.proteinMax,
        carbsMax: nutrition?.carbsMax,
        fatMin: nutrition?.fatMin,
        fatMax: nutrition?.fatMax,
      });
      aiConfidence = aiAnalysis.complianceScore;
      const threshold = tenant?.aiAutoApproveThreshold ?? 0.85;
      if (aiConfidence >= threshold) status = "approved";
      else if (aiConfidence < 0.6) status = "flagged";
    } catch {
      status = "pending";
    }
  }

  const [checkIn] = await db
    .insert(checkIns)
    .values({
      tenantId: user.tenantId,
      memberId: member.id,
      mealPhotoUrl: body.mealPhotoUrl,
      weightKg: body.weightKg,
      sleepHours: body.sleepHours,
      energy: body.energy,
      soreness: body.soreness,
      aiAnalysisJson: aiAnalysis,
      aiConfidence,
      status,
    })
    .returning();

  await syncMemberStats(member.id);

  return NextResponse.json(checkIn, { status: 201 });
}
