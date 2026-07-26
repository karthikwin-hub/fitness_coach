import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkIns, members } from "@/lib/db/schema";
import {
  computeStreakDays,
  computeWeeklyCompliance,
} from "@/lib/member/stats";

export async function syncMemberStats(memberId: string) {
  const checkInRows = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.memberId, memberId))
    .orderBy(desc(checkIns.createdAt));

  const streakDays = computeStreakDays(checkInRows);
  const compliancePct = computeWeeklyCompliance(checkInRows);

  await db
    .update(members)
    .set({ streakDays, compliancePct })
    .where(eq(members.id, memberId));

  return { streakDays, compliancePct };
}
