import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocks = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.tenantId, user.tenantId))
    .orderBy(asc(contentBlocks.sortOrder));

  return NextResponse.json(blocks);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const [block] = await db
    .insert(contentBlocks)
    .values({
      tenantId: user.tenantId,
      slug: body.slug,
      category: body.category,
      title: body.title,
      bodyJson: body.bodyJson ?? {},
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(block, { status: 201 });
}
