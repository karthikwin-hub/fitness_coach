import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);

  if (!existing || existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [item] = await db
    .update(exercises)
    .set({
      name: body.name ?? existing.name,
      youtubeVideoId: body.youtubeVideoId ?? existing.youtubeVideoId,
      muscleGroup: body.muscleGroup ?? existing.muscleGroup,
      equipment: body.equipment ?? existing.equipment,
      defaultReps: body.defaultReps ?? existing.defaultReps,
      defaultSets: body.defaultSets ?? existing.defaultSets,
      notes: body.notes ?? existing.notes,
    })
    .where(eq(exercises.id, id))
    .returning();

  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);

  if (!existing || existing.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(exercises).where(eq(exercises.id, id));
  return NextResponse.json({ ok: true });
}
