import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { purgeTenantRetention } from "@/lib/maintenance/retention-purge";

const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 3650;

function clampRetentionDays(value: number): number {
  return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, Math.round(value)));
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tenant] = await db
    .select({
      retentionDays: tenants.retentionDays,
      lastPurgeAt: tenants.lastPurgeAt,
    })
    .from(tenants)
    .where(eq(tenants.id, user!.tenantId))
    .limit(1);

  return NextResponse.json({
    retentionDays: tenant?.retentionDays ?? 90,
    lastPurgeAt: tenant?.lastPurgeAt?.toISOString() ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { retentionDays?: number };
  if (typeof body.retentionDays !== "number" || !Number.isFinite(body.retentionDays)) {
    return NextResponse.json({ error: "retentionDays is required" }, { status: 400 });
  }

  const retentionDays = clampRetentionDays(body.retentionDays);
  await db
    .update(tenants)
    .set({ retentionDays })
    .where(eq(tenants.id, user!.tenantId));

  return NextResponse.json({ retentionDays });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { confirm?: boolean };
  if (body.confirm !== true) {
    return NextResponse.json({ error: "confirm: true is required" }, { status: 400 });
  }

  const [tenant] = await db
    .select({ retentionDays: tenants.retentionDays })
    .from(tenants)
    .where(eq(tenants.id, user!.tenantId))
    .limit(1);

  const summary = await purgeTenantRetention(
    user!.tenantId,
    tenant?.retentionDays ?? 90,
  );

  return NextResponse.json({ ok: true, summary });
}
