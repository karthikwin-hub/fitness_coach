import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isCoach, requireCoach } from "@/lib/auth/server";
import {
  getActiveBroadcast,
  listBroadcasts,
  upsertActiveBroadcast,
} from "@/lib/coach/broadcasts";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isCoach(user)) {
    const items = await listBroadcasts(user.tenantId);
    return NextResponse.json({ active: items.find((b) => b.active) ?? null, items });
  }

  const active = await getActiveBroadcast(user.tenantId);
  return NextResponse.json(active);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const broadcast = await upsertActiveBroadcast(user!.tenantId, user!.id, {
    body: String(body.body ?? ""),
    audioUrl: body.audioUrl ?? null,
    active: body.active !== false,
  });

  return NextResponse.json(broadcast);
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await upsertActiveBroadcast(user!.tenantId, user!.id, {
    body: "",
    active: false,
  });
  return NextResponse.json({ ok: true });
}
