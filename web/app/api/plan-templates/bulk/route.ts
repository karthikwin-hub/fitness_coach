import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";
import { canDeleteTemplate } from "@/lib/plans/template-management";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = body.action as string;
  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];

  if (!["archive", "restore", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const rows = await db
    .select({ id: planTemplates.id, type: planTemplates.type })
    .from(planTemplates)
    .where(and(eq(planTemplates.tenantId, user.tenantId), inArray(planTemplates.id, ids)));

  if (action === "delete") {
    const deletable = rows.filter((r) => canDeleteTemplate(r.type)).map((r) => r.id);
    if (deletable.length === 0) {
      return NextResponse.json({ error: "No deletable templates in selection" }, { status: 400 });
    }
    await db
      .delete(planTemplates)
      .where(and(eq(planTemplates.tenantId, user.tenantId), inArray(planTemplates.id, deletable)));
    return NextResponse.json({ ok: true, affected: deletable.length, skipped: ids.length - deletable.length });
  }

  const targetIds = rows.map((r) => r.id);
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "No matching templates" }, { status: 404 });
  }

  await db
    .update(planTemplates)
    .set({
      archivedAt: action === "archive" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(planTemplates.tenantId, user.tenantId), inArray(planTemplates.id, targetIds)));

  return NextResponse.json({ ok: true, affected: targetIds.length });
}
