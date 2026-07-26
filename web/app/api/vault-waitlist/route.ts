import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, vaultWaitlist } from "@/lib/db/schema";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";
import { isValidEmail } from "@/lib/validation/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, location, _hp } = body as {
    tenantSlug?: string;
    email?: string;
    location?: string;
    _hp?: string;
  };
  let tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug : null;

  if (_hp) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  if (!tenantSlug) {
    const ctx = await resolveTenantFromRequest(request);
    tenantSlug = ctx?.slug ?? null;
  }

  if (!tenantSlug || !email?.trim()) {
    return NextResponse.json({ error: "Missing tenantSlug or email" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (tenant.status === "suspended") {
    return NextResponse.json({ error: "Tenant suspended" }, { status: 503 });
  }

  const [row] = await db
    .insert(vaultWaitlist)
    .values({
      tenantId: tenant.id,
      email: email.trim(),
      location: location ?? null,
    })
    .returning({ id: vaultWaitlist.id });

  return NextResponse.json({ id: row.id });
}
