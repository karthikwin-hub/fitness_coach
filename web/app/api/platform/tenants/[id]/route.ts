import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requirePlatformAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import {
  getTenantById,
  getTenantMemberCount,
  getTenantBranding,
  getTenantBrandingPartial,
  updateTenantBranding,
} from "@/lib/tenant/queries";
import { publicTenantUrl } from "@/lib/tenant/resolver";
import type { TenantBranding } from "@/lib/brand";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requirePlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const tenant = await getTenantById(id);
  if (!tenant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [memberCount, branding, brandingPartial] = await Promise.all([
    getTenantMemberCount(tenant.id),
    getTenantBranding(tenant.id),
    getTenantBrandingPartial(tenant.id),
  ]);

  return NextResponse.json({
    tenant: {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      publicUrl: publicTenantUrl(tenant),
      memberCount,
    },
    branding,
    brandingPartial,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requirePlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getTenantById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Partial<typeof tenants.$inferInsert> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.status === "active" || body.status === "suspended") {
    updates.status = body.status;
  }
  if (typeof body.calComUrl === "string") {
    updates.calComUrl = body.calComUrl;
  }
  if (typeof body.aiAutoApproveThreshold === "number") {
    updates.aiAutoApproveThreshold = body.aiAutoApproveThreshold;
  }
  if (typeof body.subdomain === "string") {
    updates.subdomain = body.subdomain.trim().toLowerCase() || null;
  }
  if (typeof body.customDomain === "string") {
    updates.customDomain = body.customDomain.trim().toLowerCase() || null;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(tenants).set(updates).where(eq(tenants.id, id));
  }

  let branding = await getTenantBranding(id);
  if (body.branding && typeof body.branding === "object") {
    branding = await updateTenantBranding(id, body.branding as TenantBranding);
  }
  if (body.resetBranding === true) {
    await db.update(tenants).set({ brandingJson: {} }).where(eq(tenants.id, id));
    branding = await getTenantBranding(id);
  }

  const tenant = await getTenantById(id);
  return NextResponse.json({
    tenant: tenant
      ? {
          ...tenant,
          createdAt: tenant.createdAt.toISOString(),
          publicUrl: publicTenantUrl(tenant),
        }
      : null,
    branding,
    brandingPartial: await getTenantBrandingPartial(id),
  });
}
