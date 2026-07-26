import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";

export async function getMemberByUserId(userId: string, tenantId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.tenantId, tenantId)))
    .limit(1);
  return member ?? null;
}

export async function getMemberById(memberId: string, tenantId: string) {
  const [member] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1);
  return member ?? null;
}
