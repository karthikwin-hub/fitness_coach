import type { NextRequest } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { mergeBranding, type TenantBranding } from "@/lib/brand";

export type TenantContext = {
  tenantId: string;
  slug: string;
  status: "active" | "suspended";
  subdomain: string | null;
  customDomain: string | null;
  branding: TenantBranding;
  brandingPartial: TenantBranding;
};

function defaultTenantSlug(): string {
  return process.env.DEFAULT_TENANT_SLUG ?? "abstrack";
}

function platformBaseDomain(): string | null {
  return process.env.PLATFORM_BASE_DOMAIN?.toLowerCase() ?? null;
}

/** Extract tenant slug from Host: helna.example.com → helna */
export function subdomainFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (!host || host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const base = platformBaseDomain();
  if (base && (host === base || host.endsWith(`.${base}`))) {
    if (host === base) return null;
    const sub = host.slice(0, -(base.length + 1));
    if (!sub || sub.includes(".")) return null;
    return sub;
  }

  // Local / duckdns style: abstrack.localhost, demo.abstrack.duckdns.org (first label)
  const parts = host.split(".");
  if (parts.length >= 2 && parts[0] && parts[0] !== "www") {
    // Prefer matching known tenant slugs via first label when not on platform base
    return parts[0];
  }
  return null;
}

async function loadTenantContext(
  row: typeof tenants.$inferSelect,
): Promise<TenantContext> {
  const brandingPartial = (row.brandingJson ?? {}) as TenantBranding;
  return {
    tenantId: row.id,
    slug: row.slug,
    status: row.status,
    subdomain: row.subdomain,
    customDomain: row.customDomain,
    brandingPartial,
    branding: mergeBranding(brandingPartial),
  };
}

export async function resolveTenantBySlug(slug: string): Promise<TenantContext | null> {
  const [row] = await db
    .select()
    .from(tenants)
    .where(or(eq(tenants.slug, slug), eq(tenants.subdomain, slug)))
    .limit(1);
  if (!row) return null;
  return loadTenantContext(row);
}

export async function resolveTenantFromRequest(
  request: NextRequest,
): Promise<TenantContext | null> {
  const host = request.headers.get("host");
  const customHost = host?.split(":")[0]?.toLowerCase() ?? null;

  if (customHost) {
    const [byCustom] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.customDomain, customHost))
      .limit(1);
    if (byCustom) {
      return loadTenantContext(byCustom);
    }
  }

  const sub = subdomainFromHost(host);
  if (sub) {
    const [bySub] = await db
      .select()
      .from(tenants)
      .where(
        and(
          or(eq(tenants.subdomain, sub), eq(tenants.slug, sub)),
        ),
      )
      .limit(1);
    if (bySub) {
      return loadTenantContext(bySub);
    }
  }

  // Explicit header for tests / future proxy
  const headerSlug = request.headers.get("x-tenant-slug");
  if (headerSlug) {
    return resolveTenantBySlug(headerSlug.toLowerCase());
  }

  return resolveTenantBySlug(defaultTenantSlug());
}

export function publicTenantUrl(ctx: {
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
}): string {
  if (ctx.customDomain) return `https://${ctx.customDomain}`;
  const base = platformBaseDomain();
  const sub = ctx.subdomain ?? ctx.slug;
  if (base) return `https://${sub}.${base}`;
  return `https://${sub}.localhost`;
}
