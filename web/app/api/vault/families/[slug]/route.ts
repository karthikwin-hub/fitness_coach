import { NextRequest, NextResponse } from "next/server";
import { getPublishedVaultFamilyBySlug } from "@/lib/vault/queries";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { slug } = await params;
  const family = await getPublishedVaultFamilyBySlug(tenant.tenantId, slug);
  if (!family) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  return NextResponse.json(family);
}
