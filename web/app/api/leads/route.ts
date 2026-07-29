import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { leads, tenants } from "@/lib/db/schema";
import { resolveTenantFromRequest } from "@/lib/tenant/resolver";
import { getTenantFeatures } from "@/lib/tenant/features";
import { isValidEmail } from "@/lib/validation/email";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, responses, intentScore, routedTo, _hp } = body;
  let tenantSlug = typeof body.tenantSlug === "string" ? body.tenantSlug : null;

  if (_hp) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  if (!tenantSlug) {
    const ctx = await resolveTenantFromRequest(request);
    tenantSlug = ctx?.slug ?? null;
  }

  if (!tenantSlug || !routedTo || !responses) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (email && !isValidEmail(String(email))) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const score = Number(intentScore ?? 0);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: "Invalid intent score" }, { status: 400 });
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

  const features = getTenantFeatures(tenant);
  if (!features.quizEnabled) {
    return NextResponse.json({ error: "Quiz submissions are disabled" }, { status: 403 });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: tenant.id,
      email: email ?? null,
      quizResponsesJson: responses,
      intentScore: score,
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
