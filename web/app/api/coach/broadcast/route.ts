import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, isCoach, requireCoach } from "@/lib/auth/server";
import type { BroadcastExpiresPreset } from "@/lib/coach/broadcast-expiry";
import { validateBroadcastPublishBody } from "@/lib/coach/broadcast-validate";
import {
  getActiveBroadcast,
  listBroadcasts,
  upsertActiveBroadcast,
} from "@/lib/coach/broadcasts";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { mergeBranding, PLATFORM_DEFAULT_BRANDING, type TenantBranding } from "@/lib/brand";
import { notifyBroadcastViaWhatsApp } from "@/lib/notify/whatsapp-notifications";

function parsePreset(value: unknown): BroadcastExpiresPreset | undefined {
  if (value === "24h" || value === "48h" || value === "custom") return value;
  return undefined;
}

function validatePublishBody(body: Record<string, unknown>): string | null {
  const baseError = validateBroadcastPublishBody(body);
  if (baseError) return baseError;

  const preset = parsePreset(body.expiresPreset);
  if (preset === "custom") {
    const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
      return "Custom expiry requires a valid date and time.";
    }
    if (expiresAt.getTime() <= Date.now()) {
      return "Expiry must be in the future.";
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isCoach(user)) {
    const items = await listBroadcasts(user.tenantId);
    const activeRow = items.find((b) => b.active) ?? null;
    return NextResponse.json({
      tenantId: user.tenantId,
      active: activeRow,
      items,
    });
  }

  const active = await getActiveBroadcast(user.tenantId);
  return NextResponse.json(active);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const validationError = validatePublishBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const broadcast = await upsertActiveBroadcast(user!.tenantId, user!.id, {
    body: String(body.body ?? ""),
    audioUrl: body.audioUrl != null ? String(body.audioUrl) || null : undefined,
    videoUrl: body.videoUrl != null ? String(body.videoUrl) || null : undefined,
    active: body.active !== false,
    expiresPreset: parsePreset(body.expiresPreset),
    expiresAt: body.expiresAt != null ? String(body.expiresAt) : undefined,
  });

  let whatsapp: Awaited<ReturnType<typeof notifyBroadcastViaWhatsApp>> | undefined;
  if (body.notifyWhatsApp === true && broadcast.active) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user!.tenantId))
      .limit(1);
    const branding = mergeBranding((tenant?.brandingJson ?? {}) as TenantBranding);
    whatsapp = await notifyBroadcastViaWhatsApp({
      tenantId: user!.tenantId,
      brandName: branding.name ?? PLATFORM_DEFAULT_BRANDING.name,
      coachName: user!.displayName,
      body: broadcast.body,
      audioUrl: broadcast.audioUrl,
      videoUrl: broadcast.videoUrl,
      requestOrigin: request.nextUrl.origin,
    });
  }

  return NextResponse.json({ ...broadcast, whatsapp });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await upsertActiveBroadcast(user!.tenantId, user!.id, {
    body: "",
    active: false,
  });
  return NextResponse.json({ ok: true });
}
