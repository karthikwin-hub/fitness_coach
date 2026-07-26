import { NextRequest, NextResponse } from "next/server";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";
import { brandingToCssVars } from "@/lib/brand";

/** Public branding for pre-auth pages (quiz, landing) — resolved from Host / fallback. */
export async function GET(request: NextRequest) {
  const ctx = await resolveTenantFromRequest(request);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (ctx.status === "suspended") {
    return NextResponse.json({ error: "Tenant suspended" }, { status: 503 });
  }

  return NextResponse.json({
    slug: ctx.slug,
    branding: ctx.branding,
    cssVars: brandingToCssVars(ctx.branding),
  });
}
