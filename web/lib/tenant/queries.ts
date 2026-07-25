import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { brandingToCssVars, type TenantBranding } from "@/lib/brand";

export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const [row] = await db
    .select({ brandingJson: tenants.brandingJson })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return (row?.brandingJson ?? {}) as TenantBranding;
}

export async function updateTenantBranding(
  tenantId: string,
  branding: TenantBranding,
): Promise<TenantBranding> {
  const [row] = await db
    .update(tenants)
    .set({ brandingJson: branding })
    .where(eq(tenants.id, tenantId))
    .returning({ brandingJson: tenants.brandingJson });
  return (row?.brandingJson ?? {}) as TenantBranding;
}

export function brandingCssVars(branding: TenantBranding) {
  return brandingToCssVars(branding);
}
