import { count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, tenants } from "@/lib/db/schema";
import {
  brandingToCssVars,
  mergeBranding,
  type TenantBranding,
} from "@/lib/brand";

export async function getTenantBrandingPartial(
  tenantId: string,
): Promise<TenantBranding> {
  const [row] = await db
    .select({ brandingJson: tenants.brandingJson })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return (row?.brandingJson ?? {}) as TenantBranding;
}

/** Effective branding = platform defaults merged with tenant partial. */
export async function getTenantBranding(tenantId: string): Promise<TenantBranding> {
  const partial = await getTenantBrandingPartial(tenantId);
  return mergeBranding(partial);
}

export async function updateTenantBranding(
  tenantId: string,
  brandingPartial: TenantBranding,
): Promise<TenantBranding> {
  const current = await getTenantBrandingPartial(tenantId);
  const nextPartial: TenantBranding = { ...current, ...brandingPartial };
  const [row] = await db
    .update(tenants)
    .set({ brandingJson: nextPartial })
    .where(eq(tenants.id, tenantId))
    .returning({ brandingJson: tenants.brandingJson });
  return mergeBranding((row?.brandingJson ?? {}) as TenantBranding);
}

export function brandingCssVars(branding: TenantBranding) {
  return brandingToCssVars(branding);
}

export type TenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  subdomain: string | null;
  customDomain: string | null;
  createdAt: Date;
  memberCount: number;
};

export async function listTenants(): Promise<TenantListItem[]> {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      status: tenants.status,
      subdomain: tenants.subdomain,
      customDomain: tenants.customDomain,
      createdAt: tenants.createdAt,
      memberCount: sql<number>`coalesce(count(${members.id}), 0)::int`,
    })
    .from(tenants)
    .leftJoin(members, eq(members.tenantId, tenants.id))
    .groupBy(tenants.id)
    .orderBy(tenants.createdAt);

  return rows.map((r) => ({
    ...r,
    memberCount: Number(r.memberCount),
  }));
}

export async function getTenantById(tenantId: string) {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return row ?? null;
}

export async function getTenantBySlug(slug: string) {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return row ?? null;
}

export async function getTenantMemberCount(tenantId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(members)
    .where(eq(members.tenantId, tenantId));
  return Number(row?.value ?? 0);
}
