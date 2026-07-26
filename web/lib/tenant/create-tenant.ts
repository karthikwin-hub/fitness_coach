import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import type { TenantBranding } from "@/lib/brand";

export class TenantSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Tenant slug already exists: ${slug}`);
    this.name = "TenantSlugConflictError";
  }
}

export function slugifyTenantName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export type CreateTenantInput = {
  name: string;
  slug: string;
  coachEmail?: string;
  coachDisplayName?: string;
  branding?: TenantBranding;
  calComUrl?: string;
  aiAutoApproveThreshold?: number;
  seedDemoContent?: boolean;
};

export async function createTenant(input: CreateTenantInput) {
  const slug = input.slug.trim().toLowerCase();
  if (!input.name.trim() || !slug) {
    throw new Error("name and slug are required");
  }

  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (existing.length > 0) {
    throw new TenantSlugConflictError(slug);
  }

  const brandingPartial = input.branding ?? {};

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: input.name.trim(),
      slug,
      status: "active",
      subdomain: slug,
      brandingJson: brandingPartial,
      aiAutoApproveThreshold: input.aiAutoApproveThreshold ?? 0.85,
      calComUrl: input.calComUrl ?? null,
    })
    .returning();

  let coachUserId: string | null = null;
  if (input.coachEmail?.trim()) {
    const email = input.coachEmail.trim().toLowerCase();
    const firebaseUid = `tenant-coach-${slug}`;
    const [coach] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        firebaseUid,
        email,
        displayName: input.coachDisplayName ?? input.name.trim(),
        role: "coach",
      })
      .returning();
    coachUserId = coach.id;
  }

  // Exercises, training templates, and content blocks so coaches can draft immediately
  const { installTenantPlanDefaults } = await import(
    "@/lib/plans/install-defaults"
  );
  await installTenantPlanDefaults(tenant.id);
  void input.seedDemoContent;

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    coachUserId,
  };
}
