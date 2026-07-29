import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./index";
import {
  appointments,
  checkIns,
  members,
  nutritionPlans,
  planDeliveries,
  planPublications,
  trainingPlans,
} from "./schema";
import {
  computeProgramWindows,
  resolveWindowIndex,
  windowBounds,
  windowRangeIso,
} from "../members/program-journey";
import { defaultProgramPhases } from "../members/program-phases";
import { buildDeliverySnapshot } from "../plans/delivery-snapshot";
import {
  deliveryExpiresAt,
  hashDeliveryToken,
  mintDeliveryToken,
} from "../plans/delivery-tokens";

const JOURNEY_SEED_TAG = "journey-demo-v1";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(15, 0, 0, 0);
  return d;
}

/** Idempotent demo data so program journey pages show realistic content. */
export async function ensureJourneyDemoData(
  tenantId: string,
  coachId: string,
  skipImportKeys: readonly string[] = [],
): Promise<void> {
  const memberRows = await db
    .select()
    .from(members)
    .where(and(eq(members.tenantId, tenantId), eq(members.status, "active")));

  let refreshed = 0;

  for (const member of memberRows) {
    if (member.importKey && skipImportKeys.includes(member.importKey)) {
      continue;
    }
    const [trainingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingPlans)
      .where(
        and(
          eq(trainingPlans.memberId, member.id),
          eq(trainingPlans.tenantId, tenantId),
          eq(trainingPlans.status, "published"),
        ),
      );
    const [nutritionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(nutritionPlans)
      .where(
        and(
          eq(nutritionPlans.memberId, member.id),
          eq(nutritionPlans.tenantId, tenantId),
          eq(nutritionPlans.status, "published"),
        ),
      );

    const hasPlans = trainingCount.count > 0 || nutritionCount.count > 0;
    if (!hasPlans) continue;

    if (
      member.programStartDate &&
      member.programEndDate &&
      (!Array.isArray(member.programPhasesJson) ||
        (member.programPhasesJson as unknown[]).length === 0)
    ) {
      await db
        .update(members)
        .set({
          programPhasesJson: defaultProgramPhases(
            member.programStartDate,
            member.programEndDate,
          ),
        })
        .where(eq(members.id, member.id));
    }

    const windows = computeProgramWindows(
      member.programStartDate,
      member.programEndDate,
    );
    const idx = resolveWindowIndex(windows, undefined);
    const bounds = windowBounds(windows, idx)!;
    const range = windowRangeIso(bounds);
    const anchor = daysAgo(5);
    if (anchor < range.from) {
      anchor.setTime(range.from.getTime() + 3600_000);
    }

    await db
      .update(planPublications)
      .set({ publishedAt: anchor })
      .where(
        and(
          eq(planPublications.memberId, member.id),
          eq(planPublications.tenantId, tenantId),
        ),
      );

    const [{ count: checkInsInWindow }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.memberId, member.id),
          eq(checkIns.tenantId, tenantId),
          gte(checkIns.createdAt, range.from),
          lte(checkIns.createdAt, range.to),
        ),
      );

    if (checkInsInWindow < 3) {
      const templates = [
        {
          status: "approved" as const,
          weightKg: 72.5,
          sleepHours: 7,
          energy: 8,
          soreness: 2,
          coachNote: "Great consistency this week — keep protein at lunch.",
          aiConfidence: 0.88,
        },
        {
          status: "pending" as const,
          weightKg: 72.1,
          sleepHours: 6.5,
          energy: 7,
          soreness: 3,
          coachNote: null,
          aiConfidence: 0.74,
        },
        {
          status: "approved" as const,
          weightKg: 71.8,
          sleepHours: 8,
          energy: 9,
          soreness: 1,
          coachNote: "Sleep looks excellent. Stay the course.",
          aiConfidence: 0.92,
        },
      ];

      for (let i = 0; i < templates.length; i++) {
        const createdAt = new Date(anchor);
        createdAt.setDate(createdAt.getDate() - i * 2);
        await db.insert(checkIns).values({
          tenantId,
          memberId: member.id,
          ...templates[i],
          aiAnalysisJson: { summary: "Seeded journey demo check-in", proteinG: 85 },
          createdAt,
        });
      }
    }

    const existingDelivery = await db
      .select({ id: planDeliveries.id })
      .from(planDeliveries)
      .where(
        and(
          eq(planDeliveries.memberId, member.id),
          eq(planDeliveries.tenantId, tenantId),
          gte(planDeliveries.createdAt, range.from),
          lte(planDeliveries.createdAt, range.to),
        ),
      )
      .limit(1);

    if (existingDelivery.length === 0) {
      try {
        const snapshot = await buildDeliverySnapshot(member.id, tenantId);
        const token = mintDeliveryToken();
        await db.insert(planDeliveries).values({
          tenantId,
          memberId: member.id,
          trainingPlanId: snapshot.training?.id ?? null,
          nutritionPlanId: snapshot.nutrition?.id ?? null,
          weekLabel: snapshot.weekLabel,
          snapshotJson: { ...snapshot, seedTag: JOURNEY_SEED_TAG },
          tokenHash: hashDeliveryToken(token),
          expiresAt: deliveryExpiresAt(),
          emailSentAt: anchor,
          openCount: 2,
          firstOpenedAt: anchor,
          createdBy: coachId,
          createdAt: anchor,
        });
      } catch {
        // Member may lack publishable plans — skip delivery seed
      }
    }

    const existingAppt = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.memberId, member.id),
          eq(appointments.tenantId, tenantId),
          gte(appointments.startsAt, range.from),
          lte(appointments.startsAt, range.to),
        ),
      )
      .limit(1);

    if (existingAppt.length === 0) {
      const startsAt = daysFromNow(3);
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      await db.insert(appointments).values({
        tenantId,
        coachId,
        memberId: member.id,
        title: "Coaching check-in",
        startsAt,
        endsAt,
        status: "booked",
        meetingType: "none",
        createdBy: coachId,
      });
    }

    refreshed += 1;
  }

  console.log(`Journey demo data ensured for ${refreshed} active member(s).`);
}
