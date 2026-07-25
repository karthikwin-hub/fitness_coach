import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [block] = await db
    .update(contentBlocks)
    .set({
      slug: body.slug,
      category: body.category,
      title: body.title,
      bodyJson: body.bodyJson,
      sortOrder: body.sortOrder,
    })
    .where(eq(contentBlocks.id, id))
    .returning();

  if (!block || block.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(block);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [block] = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.id, id))
    .limit(1);

  if (!block || block.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(contentBlocks).where(eq(contentBlocks.id, id));
  return NextResponse.json({ ok: true });
}
