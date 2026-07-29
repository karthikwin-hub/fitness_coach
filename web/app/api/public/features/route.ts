import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { getTenantFeatures } from "@/lib/tenant/features";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";

export async function GET(request: NextRequest) {
  const ctx = await resolveTenantFromRequest(request);
  const slug = ctx?.slug ?? process.env.DEFAULT_TENANT_SLUG ?? "abstrack";

  const [tenant] = await db
    .select({ featuresJson: tenants.featuresJson, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json({
    features: getTenantFeatures(tenant),
    status: tenant.status,
  });
}
