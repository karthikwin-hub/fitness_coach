import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import {
  getOwnedYoutubeChannelId,
  parseYoutubeVideoIdInput,
  resolveExerciseVideoSource,
} from "@/lib/plans/exercise-video-source";

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

  const parsedYoutube = parseYoutubeVideoIdInput(body.youtubeVideoId);
  if (body.youtubeVideoId !== undefined && body.youtubeVideoId && parsedYoutube === null) {
    return NextResponse.json({ error: "Invalid YouTube URL or video ID" }, { status: 400 });
  }

  const youtubeVideoId =
    parsedYoutube !== undefined ? parsedYoutube : existing.youtubeVideoId;
  const ownedChannelId = await getOwnedYoutubeChannelId(user.tenantId);
  const videoSource =
    body.videoSource !== undefined || body.youtubeVideoId !== undefined
      ? resolveExerciseVideoSource(body, youtubeVideoId, ownedChannelId)
      : existing.videoSource;

  const [item] = await db
    .update(exercises)
    .set({
      name: body.name ?? existing.name,
      youtubeVideoId,
      muscleGroup: body.muscleGroup ?? existing.muscleGroup,
      equipment: body.equipment ?? existing.equipment,
      defaultReps: body.defaultReps ?? existing.defaultReps,
      defaultSets: body.defaultSets ?? existing.defaultSets,
      notes: body.notes ?? existing.notes,
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      videoSource,
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
