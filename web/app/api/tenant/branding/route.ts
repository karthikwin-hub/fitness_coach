import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  brandingCssVars,
  getTenantBranding,
  updateTenantBranding,
} from "@/lib/tenant/queries";
import type { TenantBranding } from "@/lib/brand";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branding = await getTenantBranding(user.tenantId);
  return NextResponse.json({
    branding,
    cssVars: brandingCssVars(branding),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as TenantBranding;
  const current = await getTenantBranding(user!.tenantId);
  const merged: TenantBranding = { ...current, ...body };
  const branding = await updateTenantBranding(user!.tenantId, merged);

  return NextResponse.json({
    branding,
    cssVars: brandingCssVars(branding),
  });
}
