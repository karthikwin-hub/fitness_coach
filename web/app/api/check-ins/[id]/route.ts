import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getCheckInById } from "@/lib/check-ins/queries";
import { db } from "@/lib/db";
import { checkIns, tenants } from "@/lib/db/schema";
import { resolveMediaFields } from "@/lib/firebase/resolve-media-fields";
import { resolveOptionalMediaUrl } from "@/lib/firebase/resolve-media-fields";
import { analyzeMealPhoto } from "@/lib/gemini/meal-analysis";
import { mergeBranding, PLATFORM_DEFAULT_BRANDING, type TenantBranding } from "@/lib/brand";
import { notifyCheckInFeedbackViaWhatsApp } from "@/lib/notify/whatsapp-notifications";
import { getPublishedNutritionPlan } from "@/lib/plans/queries";

type Params = { params: Promise<{ id: string }> };

function shouldNotifyCheckInFeedback(
  existing: typeof checkIns.$inferSelect,
  updated: typeof checkIns.$inferSelect,
  body: Record<string, unknown>,
): boolean {
  const hasFeedback = Boolean(updated.coachNote?.trim() || updated.coachVoiceNoteUrl?.trim());
  if (!hasFeedback || updated.status !== "approved") return false;

  const feedbackChanged =
    (body.coachNote !== undefined && body.coachNote !== existing.coachNote) ||
    (body.coachVoiceNoteUrl !== undefined &&
      body.coachVoiceNoteUrl !== existing.coachVoiceNoteUrl);
  const approvedNow = body.status === "approved" && existing.status !== "approved";

  return feedbackChanged || approvedNow;
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.id, id), eq(checkIns.tenantId, user.tenantId)))
    .limit(1);

  if (!checkIn) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!checkIn.mealPhotoUrl) {
    return NextResponse.json({ error: "No meal photo" }, { status: 400 });
  }

  const nutrition = await getPublishedNutritionPlan(checkIn.memberId);
  const playablePhotoUrl = await resolveOptionalMediaUrl(checkIn.mealPhotoUrl);
  if (!playablePhotoUrl) {
    return NextResponse.json({ error: "Meal photo URL unavailable" }, { status: 400 });
  }

  const analysis = await analyzeMealPhoto(playablePhotoUrl, {
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
    .where(and(eq(checkIns.id, id), eq(checkIns.tenantId, user.tenantId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const enriched = await getCheckInById(updated.id, user.tenantId);
  const resolved = enriched
    ? await resolveMediaFields(enriched, ["mealPhotoUrl", "coachVoiceNoteUrl"])
    : null;
  return NextResponse.json(resolved ?? updated);
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
    .from(checkIns)
    .where(and(eq(checkIns.id, id), eq(checkIns.tenantId, user.tenantId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: {
    status?: "pending" | "approved" | "flagged";
    coachNote?: string | null;
    coachVoiceNoteUrl?: string | null;
    coachVoiceNoteDurationSec?: number | null;
  } = {};
  if (body.status !== undefined) {
    updates.status = body.status as "pending" | "approved" | "flagged";
  }
  if (body.coachNote !== undefined) updates.coachNote = body.coachNote;
  if (body.coachVoiceNoteUrl !== undefined) {
    updates.coachVoiceNoteUrl =
      typeof body.coachVoiceNoteUrl === "string" && body.coachVoiceNoteUrl.trim()
        ? body.coachVoiceNoteUrl.trim()
        : null;
  }
  if (body.coachVoiceNoteDurationSec !== undefined) {
    updates.coachVoiceNoteDurationSec =
      typeof body.coachVoiceNoteDurationSec === "number" &&
      body.coachVoiceNoteDurationSec > 0
        ? Math.round(body.coachVoiceNoteDurationSec)
        : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(checkIns)
    .set(updates)
    .where(and(eq(checkIns.id, id), eq(checkIns.tenantId, user.tenantId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let whatsapp: Awaited<ReturnType<typeof notifyCheckInFeedbackViaWhatsApp>> | undefined;
  if (shouldNotifyCheckInFeedback(existing, updated, body)) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);
    const branding = mergeBranding((tenant?.brandingJson ?? {}) as TenantBranding);
    whatsapp = await notifyCheckInFeedbackViaWhatsApp({
      tenantId: user.tenantId,
      memberId: updated.memberId,
      brandName: branding.name ?? PLATFORM_DEFAULT_BRANDING.name,
      coachName: user.displayName,
      coachNote: updated.coachNote,
      coachVoiceNoteUrl: updated.coachVoiceNoteUrl,
      requestOrigin: request.nextUrl.origin,
    });
  }

  const enriched = await getCheckInById(updated.id, user.tenantId);
  const resolved = enriched
    ? await resolveMediaFields(enriched, ["mealPhotoUrl", "coachVoiceNoteUrl"])
    : null;

  return NextResponse.json({
    ...(resolved ?? updated),
    whatsapp,
  });
}
