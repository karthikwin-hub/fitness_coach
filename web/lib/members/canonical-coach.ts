import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, users } from "@/lib/db/schema";

const DEV_COACH_FIREBASE_UID = "dev-local-user";

/** Prefer the live Firebase coach over the dev seed coach when both exist. */
export async function getCanonicalCoachId(tenantId: string): Promise<string | null> {
  const coaches = await db
    .select({
      id: users.id,
      firebaseUid: users.firebaseUid,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, "coach")))
    .orderBy(asc(users.createdAt));

  if (coaches.length === 0) return null;

  const liveCoach = coaches.find((c) => c.firebaseUid !== DEV_COACH_FIREBASE_UID);
  return (liveCoach ?? coaches[0]).id;
}

/** Point all tenant members at the canonical coach (idempotent). */
export async function ensureMemberCoachAssignments(tenantId: string): Promise<number> {
  const coachId = await getCanonicalCoachId(tenantId);
  if (!coachId) return 0;

  const allMembers = await db
    .select({ id: members.id, coachId: members.coachId })
    .from(members)
    .where(eq(members.tenantId, tenantId));

  let changed = 0;
  for (const member of allMembers) {
    if (member.coachId !== coachId) {
      await db.update(members).set({ coachId }).where(eq(members.id, member.id));
      changed += 1;
    }
  }

  return changed;
}

export function isDevSeedCoach(firebaseUid: string): boolean {
  return firebaseUid === DEV_COACH_FIREBASE_UID;
}
