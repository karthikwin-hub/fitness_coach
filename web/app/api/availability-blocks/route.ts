import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { createBlock, listBlocks } from "@/lib/appointments/queries";
import { syncBlockToGoogle } from "@/lib/appointments/google-calendar";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(from.getTime() + 14 * 86400_000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const blocks = await listBlocks(user.tenantId, user.id, from, to);
  return NextResponse.json({ blocks });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() || null : null;

  const block = await createBlock({
    tenantId: user.tenantId,
    coachId: user.id,
    reason,
    startsAt,
    endsAt,
  });
  try {
    await syncBlockToGoogle(block);
  } catch (error) {
    console.error("[availability] Google sync failed", error);
  }

  return NextResponse.json(block, { status: 201 });
}
