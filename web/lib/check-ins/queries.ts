import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkIns, members, users } from "@/lib/db/schema";

const checkInSelect = {
  id: checkIns.id,
  tenantId: checkIns.tenantId,
  memberId: checkIns.memberId,
  mealPhotoUrl: checkIns.mealPhotoUrl,
  weightKg: checkIns.weightKg,
  sleepHours: checkIns.sleepHours,
  energy: checkIns.energy,
  soreness: checkIns.soreness,
  aiAnalysisJson: checkIns.aiAnalysisJson,
  aiConfidence: checkIns.aiConfidence,
  status: checkIns.status,
  coachNote: checkIns.coachNote,
  coachVoiceNoteUrl: checkIns.coachVoiceNoteUrl,
  coachVoiceNoteDurationSec: checkIns.coachVoiceNoteDurationSec,
  createdAt: checkIns.createdAt,
  memberDisplayName: users.displayName,
  memberEmail: users.email,
};

export type CheckInRow = {
  id: string;
  tenantId: string;
  memberId: string;
  mealPhotoUrl: string | null;
  weightKg: number | null;
  sleepHours: number | null;
  energy: number | null;
  soreness: number | null;
  aiAnalysisJson: unknown;
  aiConfidence: number | null;
  status: string;
  coachNote: string | null;
  coachVoiceNoteUrl: string | null;
  coachVoiceNoteDurationSec: number | null;
  createdAt: Date;
  memberDisplayName: string | null;
  memberEmail: string;
};

function mapRow(row: CheckInRow) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCheckInsForTenant(tenantId: string, limit = 50) {
  const rows = await db
    .select(checkInSelect)
    .from(checkIns)
    .innerJoin(members, eq(checkIns.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(checkIns.tenantId, tenantId))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);

  return rows.map(mapRow);
}

export async function listCheckInsForMember(
  memberId: string,
  tenantId: string,
  limit = 100,
) {
  const rows = await db
    .select(checkInSelect)
    .from(checkIns)
    .innerJoin(members, eq(checkIns.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(checkIns.tenantId, tenantId), eq(checkIns.memberId, memberId)))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);

  return rows.map(mapRow);
}

export async function getCheckInById(id: string, tenantId: string) {
  const [row] = await db
    .select(checkInSelect)
    .from(checkIns)
    .innerJoin(members, eq(checkIns.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(checkIns.id, id))
    .limit(1);

  if (!row || row.tenantId !== tenantId) return null;
  return mapRow(row);
}
