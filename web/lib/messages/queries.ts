import { and, asc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { getMemberById, getMemberByUserId } from "@/lib/members/queries";

export type MessageRow = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    senderId: row.senderId,
    recipientId: row.recipientId,
    body: row.body,
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
  coachUserId: string,
  memberId: string,
  tenantId: string,
  isPlatformAdmin: boolean,
) {
  const member = await getMemberById(memberId, tenantId);
  if (!member) return { ok: false as const, error: "Member not found", status: 404 };

  if (!isPlatformAdmin && member.coachId !== coachUserId) {
    return { ok: false as const, error: "Forbidden", status: 403 };
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
}) {
  const [row] = await db
    .insert(messages)
    .values({
      tenantId: input.tenantId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      body: input.body,
    })
    .returning({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      body: messages.body,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    });

  return mapMessage(row);
}
