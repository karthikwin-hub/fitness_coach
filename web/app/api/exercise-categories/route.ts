import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exerciseCategories } from "@/lib/db/schema";
import { installExerciseCategoryDefaults } from "@/lib/plans/exercise-categories";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await installExerciseCategoryDefaults(user.tenantId);

  const items = await db
    .select()
    .from(exerciseCategories)
    .where(eq(exerciseCategories.tenantId, user.tenantId))
    .orderBy(asc(exerciseCategories.sortOrder), asc(exerciseCategories.name));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const name = String(body.name ?? "").trim();
  if (!slug || !name) {
    return NextResponse.json({ error: "slug and name required" }, { status: 400 });
  }

  const [item] = await db
    .insert(exerciseCategories)
    .values({
      tenantId: user.tenantId,
      slug,
      name,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 50,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
