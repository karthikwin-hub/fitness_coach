import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, vaultWaitlist } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantSlug, email, location } = body as {
    tenantSlug?: string;
    email?: string;
    location?: string;
  };

  if (!tenantSlug || !email?.trim()) {
    return NextResponse.json({ error: "Missing tenantSlug or email" }, { status: 400 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
