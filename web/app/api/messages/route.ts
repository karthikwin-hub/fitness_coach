import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, isCoach } from "@/lib/auth/server";
import {
  assertCoachCanMessageMember,
  getMemberByUserId,
  getMemberCoachUserId,
  insertMessage,
  listThread,
} from "@/lib/messages/queries";

const MAX_BODY_LENGTH = 2000;

function withIsMine<T extends { senderId: string }>(
  items: T[],
  authUserId: string,
) {
  return items.map((item) => ({
    ...item,
    isMine: item.senderId === authUserId,
  }));
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isCoach(user)) {
    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const access = await assertCoachCanMessageMember(user, memberId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const thread = await listThread(user.tenantId, user.id, access.member.userId);
    return NextResponse.json({ messages: withIsMine(thread, user.id) });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.coachId) {
    return NextResponse.json({ error: "No coach assigned" }, { status: 404 });
  }

  const thread = await listThread(user.tenantId, user.id, member.coachId);
  return NextResponse.json({ messages: withIsMine(thread, user.id) });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }
  if (text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  if (isCoach(user)) {
    const memberId = typeof body.memberId === "string" ? body.memberId : null;
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const access = await assertCoachCanMessageMember(user, memberId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const message = await insertMessage({
      tenantId: user.tenantId,
      senderId: user.id,
      recipientId: access.member.userId,
      body: text,
    });

    return NextResponse.json(
      { ...message, isMine: true },
      { status: 201 },
    );
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const coachUserId = await getMemberCoachUserId(user.id, user.tenantId);
  if (!coachUserId) {
    return NextResponse.json({ error: "No coach assigned" }, { status: 404 });
  }

  const message = await insertMessage({
    tenantId: user.tenantId,
    senderId: user.id,
    recipientId: coachUserId,
    body: text,
  });

  return NextResponse.json(
    { ...message, isMine: true },
    { status: 201 },
  );
}
