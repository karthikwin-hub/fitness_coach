import { and, eq, sql } from "drizzle-orm";
import type { AuthUser } from "@/lib/auth/server";
import { isCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { members, users } from "@/lib/db/schema";
import { isDevSeedCoach } from "@/lib/members/canonical-coach";

export type CoachMemberAccess = {
  allowed: boolean;
  shouldHealCoachId: boolean;
  reason?: string;
};

type MemberRow = typeof members.$inferSelect;

/** Whether a coach may act on behalf of / view a member in their tenant. */
export async function resolveCoachMemberAccess(
  coach: AuthUser,
  member: MemberRow,
): Promise<CoachMemberAccess> {
  if (!isCoach(coach)) {
    return { allowed: false, shouldHealCoachId: false, reason: "Not a coach" };
  }

  if (coach.role === "platform_admin") {
    return { allowed: true, shouldHealCoachId: false };
  }

  if (member.tenantId !== coach.tenantId) {
    return { allowed: false, shouldHealCoachId: false, reason: "Member not in tenant" };
  }

  if (member.coachId === coach.id) {
    return { allowed: true, shouldHealCoachId: false };
  }

  if (!member.coachId) {
    return { allowed: true, shouldHealCoachId: true };
  }

  const [assignedCoach] = await db
    .select({ id: users.id, role: users.role, firebaseUid: users.firebaseUid })
    .from(users)
    .where(and(eq(users.id, member.coachId), eq(users.tenantId, coach.tenantId)))
    .limit(1);

  if (!assignedCoach || assignedCoach.role !== "coach") {
    return { allowed: true, shouldHealCoachId: true };
  }

  // Member still on dev seed coach but coach signed in with Firebase — reassign.
  if (
    isDevSeedCoach(assignedCoach.firebaseUid) &&
    !isDevSeedCoach(coach.firebaseUid)
  ) {
    return { allowed: true, shouldHealCoachId: true };
  }

  // Local dev persona viewing members assigned to the live Firebase coach.
  if (
    isDevSeedCoach(coach.firebaseUid) &&
    !isDevSeedCoach(assignedCoach.firebaseUid)
  ) {
    return { allowed: true, shouldHealCoachId: false };
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.tenantId, coach.tenantId), eq(users.role, "coach")));

  if (count === 1) {
    return { allowed: true, shouldHealCoachId: true };
  }

  return {
    allowed: false,
    shouldHealCoachId: false,
    reason: "This client is assigned to another coach",
  };
}

export async function healMemberCoachId(
  memberId: string,
  tenantId: string,
  coachId: string,
): Promise<void> {
  await db
    .update(members)
    .set({ coachId })
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)));
}
