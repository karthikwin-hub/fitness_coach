import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requirePlatformAdmin } from "@/lib/auth/server";
import {
  createTenant,
  TenantSlugConflictError,
  slugifyTenantName,
} from "@/lib/tenant/create-tenant";
import { listTenants } from "@/lib/tenant/queries";
import { publicTenantUrl } from "@/lib/tenant/resolver";
import type { TenantBranding } from "@/lib/brand";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requirePlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenants = await listTenants();
  return NextResponse.json({
    tenants: tenants.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      publicUrl: publicTenantUrl(t),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requirePlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase()
      : slugifyTenantName(name);

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  try {
    const result = await createTenant({
      name,
      slug,
      coachEmail: typeof body.coachEmail === "string" ? body.coachEmail : undefined,
      coachDisplayName:
        typeof body.coachDisplayName === "string" ? body.coachDisplayName : undefined,
      branding: (body.branding ?? {}) as TenantBranding,
      calComUrl: typeof body.calComUrl === "string" ? body.calComUrl : undefined,
      seedDemoContent: Boolean(body.seedDemoContent),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof TenantSlugConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
