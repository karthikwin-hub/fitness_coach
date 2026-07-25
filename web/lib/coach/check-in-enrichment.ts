import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkIns, contentBlocks, foodDiaryEntries, members, nutritionPlans } from "@/lib/db/schema";
import {
  buildMemberTrendSnapshot,
  type MemberTrendSnapshot,
} from "@/lib/coach/trend-alerts";

export type CoachCheckInEnrichment = {
  trendsByMember: Record<string, MemberTrendSnapshot>;
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function enrichCoachCheckIns(
  tenantId: string,
  memberIds: string[],
): Promise<CoachCheckInEnrichment> {
  if (memberIds.length === 0) return { trendsByMember: {} };

  const uniqueIds = [...new Set(memberIds)];
  const since = daysAgoIso(14);

  const [checkInRows, diaryRows, nutritionRows] = await Promise.all([
    db
      .select({
        memberId: checkIns.memberId,
        createdAt: checkIns.createdAt,
        weightKg: checkIns.weightKg,
        sleepHours: checkIns.sleepHours,
      })
      .from(checkIns)
      .where(
        and(eq(checkIns.tenantId, tenantId), inArray(checkIns.memberId, uniqueIds)),
      )
      .orderBy(desc(checkIns.createdAt)),
    db
      .select({
        memberId: foodDiaryEntries.memberId,
        logDate: foodDiaryEntries.logDate,
        proteinG: foodDiaryEntries.proteinG,
      })
      .from(foodDiaryEntries)
      .where(
        and(
          eq(foodDiaryEntries.tenantId, tenantId),
          inArray(foodDiaryEntries.memberId, uniqueIds),
          gte(foodDiaryEntries.logDate, since),
        ),
      ),
    db
      .select({
        memberId: nutritionPlans.memberId,
        proteinMin: nutritionPlans.proteinMin,
        weekNumber: nutritionPlans.weekNumber,
      })
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.tenantId, tenantId),
          inArray(nutritionPlans.memberId, uniqueIds),
          eq(nutritionPlans.status, "published"),
        ),
      ),
  ]);

  const proteinMinByMember = new Map<string, number>();
  const weekByMember = new Map<string, number>();
  for (const plan of nutritionRows) {
    const week = plan.weekNumber ?? 0;
    const prevWeek = weekByMember.get(plan.memberId) ?? -1;
    if (week >= prevWeek) {
      weekByMember.set(plan.memberId, week);
      proteinMinByMember.set(plan.memberId, plan.proteinMin ?? 60);
    }
  }

  const trendsByMember: Record<string, MemberTrendSnapshot> = {};
  for (const memberId of uniqueIds) {
    const memberCheckIns = checkInRows.filter((c) => c.memberId === memberId);
    const memberDiary = diaryRows.filter((d) => d.memberId === memberId);
    trendsByMember[memberId] = buildMemberTrendSnapshot(memberId, memberCheckIns, {
      proteinMin: proteinMinByMember.get(memberId),
      diaryDays: memberDiary.map((d) => ({
        logDate: d.logDate,
        proteinG: d.proteinG,
      })),
    });
  }

  return { trendsByMember };
}

export type RecipeItem = {
  name: string;
  proteinG: number;
  calories: number;
  tags: string[];
  note?: string;
};

export async function getCoachRecipes(tenantId: string): Promise<RecipeItem[]> {
  const [block] = await db
    .select({ bodyJson: contentBlocks.bodyJson })
    .from(contentBlocks)
    .where(and(eq(contentBlocks.tenantId, tenantId), eq(contentBlocks.slug, "coach-recipes")))
    .limit(1);

  const body = block?.bodyJson as { recipes?: RecipeItem[] } | null;
  return body?.recipes ?? [];
}

export async function getMemberAlertFlags(
  tenantId: string,
): Promise<Record<string, MemberTrendSnapshot>> {
  const memberRows = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.tenantId, tenantId), eq(members.status, "active")));
  const enrichment = await enrichCoachCheckIns(
    tenantId,
    memberRows.map((m) => m.id),
  );
  return enrichment.trendsByMember;
}
