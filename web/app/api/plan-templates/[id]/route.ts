import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";
import { parsePlanBundleStructure } from "@/lib/plans/template-bundle";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [row] = await db
    .select()
    .from(planTemplates)
    .where(and(eq(planTemplates.id, id), eq(planTemplates.tenantId, user.tenantId)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...row,
    tags: (row.tagsJson as string[]) ?? [],
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(planTemplates)
    .where(and(eq(planTemplates.id, id), eq(planTemplates.tenantId, user.tenantId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let structureJson = existing.structureJson;
  if (body.structureJson != null) {
    if ((body.type ?? existing.type) === "plan_bundle") {
      try {
        structureJson = parsePlanBundleStructure(body.structureJson);
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error ? err.message : "Invalid plan bundle structure",
          },
          { status: 400 },
        );
      }
    } else {
      structureJson = body.structureJson;
    }
  }

  const [updated] = await db
    .update(planTemplates)
    .set({
      name: body.name ?? existing.name,
      key: body.key ?? existing.key,
      description: body.description ?? existing.description,
      tagsJson: body.tags ?? existing.tagsJson,
      structureJson,
      archivedAt:
        body.archived === true
          ? new Date()
          : body.archived === false
            ? null
            : existing.archivedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(planTemplates.id, id), eq(planTemplates.tenantId, user.tenantId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(planTemplates)
    .where(and(eq(planTemplates.id, id), eq(planTemplates.tenantId, user.tenantId)))
    .returning({ id: planTemplates.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
