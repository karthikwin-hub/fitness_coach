import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { leads, tenants } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantSlug, email, responses, intentScore, routedTo } = body;

  if (!tenantSlug || !routedTo || !responses) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: tenant.id,
      email: email ?? null,
      quizResponsesJson: responses,
      intentScore: intentScore ?? 0,
      routedTo,
    })
    .returning({ id: leads.id });

  return NextResponse.json({ id: lead.id });
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, user.tenantId));
  return NextResponse.json(rows);
}
