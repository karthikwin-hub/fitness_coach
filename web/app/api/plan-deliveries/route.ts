import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planDeliveries } from "@/lib/db/schema";
import { getMemberById } from "@/lib/members/queries";
import { buildDeliverySnapshot } from "@/lib/plans/delivery-snapshot";
import {
  deliveryExpiresAt,
  hashDeliveryToken,
  listDeliveriesForMember,
  mintDeliveryToken,
} from "@/lib/plans/delivery-tokens";
import { deliveryUrls, getAppBaseUrl } from "@/lib/plans/delivery-urls";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const member = await getMemberById(memberId, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deliveries = await listDeliveriesForMember(memberId, user.tenantId);
  return NextResponse.json({ deliveries });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    memberId?: string;
    coachVoiceNoteUrl?: string | null;
    coachVoiceNoteDurationSec?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const member = await getMemberById(body.memberId, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let snapshot;
  try {
    snapshot = await buildDeliverySnapshot(body.memberId, user.tenantId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build snapshot" },
      { status: 400 },
    );
  }

  const token = mintDeliveryToken();
  const tokenHash = hashDeliveryToken(token);
  const expiresAt = deliveryExpiresAt();

  const coachVoiceNoteUrl =
    typeof body.coachVoiceNoteUrl === "string" && body.coachVoiceNoteUrl.trim()
      ? body.coachVoiceNoteUrl.trim()
      : null;
  const coachVoiceNoteDurationSec =
    typeof body.coachVoiceNoteDurationSec === "number" &&
    body.coachVoiceNoteDurationSec > 0
      ? Math.round(body.coachVoiceNoteDurationSec)
      : null;

  const [row] = await db
    .insert(planDeliveries)
    .values({
      tenantId: user.tenantId,
      memberId: body.memberId,
      trainingPlanId: snapshot.training?.id ?? null,
      nutritionPlanId: snapshot.nutrition?.id ?? null,
      weekLabel: snapshot.weekLabel,
      snapshotJson: snapshot,
      tokenHash,
      expiresAt,
      createdBy: user.id,
      coachVoiceNoteUrl,
      coachVoiceNoteDurationSec,
    })
    .returning();

  const baseUrl = getAppBaseUrl(request.nextUrl.origin);
  const urls = deliveryUrls(baseUrl, token);

  return NextResponse.json({
    delivery: {
      id: row.id,
      weekLabel: row.weekLabel,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      trainingPlanId: row.trainingPlanId,
      nutritionPlanId: row.nutritionPlanId,
    },
    token,
    urls,
    snapshot: {
      memberEmail: snapshot.member.email,
      memberPhone: snapshot.member.phone,
      memberFirstName: snapshot.member.firstName,
      brandName: snapshot.branding.name,
      coachName: snapshot.coach.displayName,
      weekLabel: snapshot.weekLabel,
    },
  });
}
