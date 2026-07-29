import { and, asc, eq, or } from "drizzle-orm";
import type { AuthUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import {
  healMemberCoachId,
  resolveCoachMemberAccess,
} from "@/lib/members/coach-access";
import { getMemberById, getMemberByUserId } from "@/lib/members/queries";

export type MessageRow = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  audioUrl: string | null;
  audioDurationSec: number | null;
  readAt: Date | null;
  createdAt: Date;
};

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    body: row.body,
    audioUrl: row.audioUrl,
    audioDurationSec: row.audioDurationSec,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export { getMemberByUserId, getMemberById };

export async function getMemberCoachUserId(memberUserId: string, tenantId: string) {
  const member = await getMemberByUserId(memberUserId, tenantId);
  return member?.coachId ?? null;
}

export async function assertCoachCanMessageMember(
  coach: AuthUser,
  memberId: string,
) {
  const member = await getMemberById(memberId, coach.tenantId);
  if (!member) return { ok: false as const, error: "Member not found", status: 404 };

  const access = await resolveCoachMemberAccess(coach, member);
  if (!access.allowed) {
    return {
      ok: false as const,
      error: access.reason ?? "Forbidden",
      status: 403,
    };
  }
  if (access.shouldHealCoachId) {
    await healMemberCoachId(member.id, coach.tenantId, coach.id);
  }

  return { ok: true as const, member };
}

export async function listThread(
  tenantId: string,
  userA: string,
  userB: string,
  limit = 100,
) {
  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      body: messages.body,
      audioUrl: messages.audioUrl,
      audioDurationSec: messages.audioDurationSec,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.tenantId, tenantId),
        or(
          and(eq(messages.senderId, userA), eq(messages.recipientId, userB)),
          and(eq(messages.senderId, userB), eq(messages.recipientId, userA)),
        ),
      ),
    )
    .orderBy(asc(messages.createdAt))
    .limit(limit);

  return rows.map(mapMessage);
}

export async function insertMessage(input: {
  tenantId: string;
  senderId: string;
  recipientId: string;
  body: string;
  audioUrl?: string | null;
  audioDurationSec?: number | null;
}) {
  const [row] = await db
    .insert(messages)
    .values({
      tenantId: input.tenantId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      body: input.body,
      audioUrl: input.audioUrl ?? null,
      audioDurationSec: input.audioDurationSec ?? null,
    })
    .returning({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      body: messages.body,
      audioUrl: messages.audioUrl,
      audioDurationSec: messages.audioDurationSec,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    });

  return mapMessage(row);
}
