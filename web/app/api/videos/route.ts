import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { videos } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.tenantId, user.tenantId))
    .orderBy(videos.sortOrder);

  return NextResponse.json(rows);
}
