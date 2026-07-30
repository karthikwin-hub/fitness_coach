import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";
import { generateTemplateCode } from "@/lib/plans/template-code";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const nameOverride = body.name ? String(body.name).trim() : null;

  const [existing] = await db
    .select()
    .from(planTemplates)
    .where(and(eq(planTemplates.id, id), eq(planTemplates.tenantId, user.tenantId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newKey = await generateTemplateCode(user.tenantId);
  const duplicateName = nameOverride || `${existing.name} (copy)`;

  const [created] = await db
    .insert(planTemplates)
    .values({
      tenantId: user.tenantId,
      type: existing.type === "plan_bundle" ? "plan_bundle" : "plan_bundle",
      key: newKey,
      name: duplicateName,
      description: existing.description,
      tagsJson: existing.tagsJson,
      sourceMemberId: existing.sourceMemberId,
      structureJson: existing.structureJson,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
