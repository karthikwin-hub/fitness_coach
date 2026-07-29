import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { normalizeYoutubeVideoId } from "@/lib/youtube/parse-video-id";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, user.tenantId))
    .orderBy(asc(exercises.name));

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const youtubeVideoId =
    body.youtubeVideoId != null
      ? normalizeYoutubeVideoId(String(body.youtubeVideoId))
      : null;
  if (body.youtubeVideoId && !youtubeVideoId) {
    return NextResponse.json({ error: "Invalid YouTube URL or video ID" }, { status: 400 });
  }

  const [item] = await db
    .insert(exercises)
    .values({
      tenantId: user.tenantId,
      name: body.name,
      youtubeVideoId,
      muscleGroup: body.muscleGroup,
      equipment: body.equipment ?? "bodyweight",
      defaultReps: body.defaultReps,
      defaultSets: body.defaultSets ?? 3,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
