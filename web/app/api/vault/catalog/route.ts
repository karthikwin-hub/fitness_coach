import { NextRequest, NextResponse } from "next/server";
import { listPublishedVaultCatalog } from "@/lib/vault/queries";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenantFromRequest(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const families = await listPublishedVaultCatalog(tenant.tenantId);
  return NextResponse.json({ families });
}
