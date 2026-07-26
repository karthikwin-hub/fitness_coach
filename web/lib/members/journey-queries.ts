import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  checkIns,
  members,
  nutritionPlans,
  planDeliveries,
  planPublications,
  trainingPlans,
  users,
} from "@/lib/db/schema";
import { formatMemberName } from "@/lib/members/types";
import { normalizeProgramPhases } from "@/lib/members/program-phases";
import {
  computeProgramWindows,
  formatWindowLabel,
  resolveWindowIndex,
  windowBounds,
  windowRangeIso,
  type WindowMeta,
} from "@/lib/members/program-journey";
import { deriveJourneyEmptyState, type JourneyEmptyState } from "@/lib/members/journey-empty-state";

export type JourneyOptions = {
  windowIndex?: number;
  includeCoachNotes?: boolean;
};

export type MemberJourneyPayload = {
  member: {
    id: string;
    name: string;
    email: string;
    status: string;
    programStartDate: string | null;
    programEndDate: string | null;
    programPhases: ReturnType<typeof normalizeProgramPhases>;
    compliancePct: number;
    streakDays: number;
    coachNotes?: string | null;
  };
  window: WindowMeta;
  windowLabel: string;
  stats: {
    checkInsInWindow: number;
    deliveriesInWindow: number;
    appointmentsInWindow: number;
    trainingPublishedInWindow: number;
    nutritionPublishedInWindow: number;
  };
  trainingPlans: Array<{
    id: string;
    weekNumber: number;
    status: string;
    publishedAt: string | null;
  }>;
  nutritionPlans: Array<{
    id: string;
    weekNumber: number;
    status: string;
    publishedAt: string | null;
  }>;
  deliveries: Array<{
    id: string;
    weekLabel: string;
    createdAt: string;
    emailSentAt: string | null;
    openCount: number;
  }>;
  checkIns: Array<{
    id: string;
    createdAt: string;
    status: string;
    weightKg: number | null;
    sleepHours: number | null;
    coachNote: string | null;
  }>;
  appointments: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    title: string | null;
  }>;
  emptyState: JourneyEmptyState | null;
};

export async function buildMemberJourney(
  memberId: string,
  tenantId: string,
  options: JourneyOptions = {},
): Promise<MemberJourneyPayload | null> {
  const [row] = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1);

  if (!row) return null;

  const { member, user } = row;
  const windows = computeProgramWindows(
    member.programStartDate,
    member.programEndDate,
  );
  const idx = resolveWindowIndex(windows, options.windowIndex);
  const window = windowBounds(windows, idx)!;
  const range = windowRangeIso(window);

  const [
    trainingRows,
    nutritionRows,
    trainingPubs,
    nutritionPubs,
    deliveryRows,
    checkInRows,
    appointmentRows,
  ] = await Promise.all([
    db
      .select()
      .from(trainingPlans)
      .where(
        and(eq(trainingPlans.memberId, memberId), eq(trainingPlans.tenantId, tenantId)),
      )
      .orderBy(desc(trainingPlans.weekNumber)),
    db
      .select()
      .from(nutritionPlans)
      .where(
        and(eq(nutritionPlans.memberId, memberId), eq(nutritionPlans.tenantId, tenantId)),
      )
      .orderBy(desc(nutritionPlans.weekNumber)),
    db
      .select()
      .from(planPublications)
      .where(
        and(
          eq(planPublications.memberId, memberId),
          eq(planPublications.tenantId, tenantId),
          eq(planPublications.planType, "training"),
        ),
      ),
    db
      .select()
      .from(planPublications)
      .where(
        and(
          eq(planPublications.memberId, memberId),
          eq(planPublications.tenantId, tenantId),
          eq(planPublications.planType, "nutrition"),
        ),
      ),
    db
      .select()
      .from(planDeliveries)
      .where(
        and(
          eq(planDeliveries.memberId, memberId),
          eq(planDeliveries.tenantId, tenantId),
          gte(planDeliveries.createdAt, range.from),
          lte(planDeliveries.createdAt, range.to),
        ),
      )
      .orderBy(desc(planDeliveries.createdAt)),
    db
      .select({
        id: checkIns.id,
        createdAt: checkIns.createdAt,
        status: checkIns.status,
        weightKg: checkIns.weightKg,
        sleepHours: checkIns.sleepHours,
        coachNote: checkIns.coachNote,
      })
      .from(checkIns)
      .where(
        and(
          eq(checkIns.memberId, memberId),
          eq(checkIns.tenantId, tenantId),
          gte(checkIns.createdAt, range.from),
          lte(checkIns.createdAt, range.to),
        ),
      )
      .orderBy(desc(checkIns.createdAt)),
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        title: appointments.title,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.memberId, memberId),
          eq(appointments.tenantId, tenantId),
          gte(appointments.startsAt, range.from),
          lte(appointments.startsAt, range.to),
        ),
      )
      .orderBy(desc(appointments.startsAt)),
  ]);

  const trainingPubMap = new Map(trainingPubs.map((p) => [p.planId, p.publishedAt]));
  const nutritionPubMap = new Map(nutritionPubs.map((p) => [p.planId, p.publishedAt]));
  const publishedTrainingCount = trainingRows.filter((p) => p.status === "published").length;
  const publishedNutritionCount = nutritionRows.filter((p) => p.status === "published").length;

  const trainingPlansOut = trainingRows
    .map((p) => {
      const pub = trainingPubMap.get(p.id);
      return {
        id: p.id,
        weekNumber: p.weekNumber,
        status: p.status,
        publishedAt: pub ? pub.toISOString() : null,
      };
    })
    .filter((p) => {
      if (!p.publishedAt) return p.status === "published";
      const d = new Date(p.publishedAt);
      return d >= range.from && d <= range.to;
    });

  const nutritionPlansOut = nutritionRows
    .map((p) => {
      const pub = nutritionPubMap.get(p.id);
      return {
        id: p.id,
        weekNumber: p.weekNumber,
        status: p.status,
        publishedAt: pub ? pub.toISOString() : null,
      };
    })
    .filter((p) => {
      if (!p.publishedAt) return p.status === "published";
      const d = new Date(p.publishedAt);
      return d >= range.from && d <= range.to;
    });

  const name = formatMemberName({
    firstName: member.firstName,
    lastName: member.lastName,
    displayName: user.displayName,
    email: user.email,
  });

  const stats = {
    checkInsInWindow: checkInRows.length,
    deliveriesInWindow: deliveryRows.length,
    appointmentsInWindow: appointmentRows.length,
    trainingPublishedInWindow: trainingPlansOut.filter((p) => p.status === "published")
      .length,
    nutritionPublishedInWindow: nutritionPlansOut.filter((p) => p.status === "published")
      .length,
  };

  const emptyState = deriveJourneyEmptyState({
    programStartDate: member.programStartDate,
    programEndDate: member.programEndDate,
    publishedTrainingCount,
    publishedNutritionCount,
    stats,
    window,
  });

  return {
    member: {
      id: member.id,
      name,
      email: user.email,
      status: member.status,
      programStartDate: member.programStartDate,
      programEndDate: member.programEndDate,
      programPhases: normalizeProgramPhases(
        member.programPhasesJson,
        member.programStartDate,
        member.programEndDate,
      ),
      compliancePct: member.compliancePct,
      streakDays: member.streakDays,
      ...(options.includeCoachNotes ? { coachNotes: member.coachNotes } : {}),
    },
    window,
    windowLabel: formatWindowLabel(window),
    stats,
    emptyState,
    trainingPlans: trainingPlansOut,
    nutritionPlans: nutritionPlansOut,
    deliveries: deliveryRows.map((d) => ({
      id: d.id,
      weekLabel: d.weekLabel,
      createdAt: d.createdAt.toISOString(),
      emailSentAt: d.emailSentAt?.toISOString() ?? null,
      openCount: d.openCount,
    })),
    checkIns: checkInRows.map((c) => ({
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      status: c.status,
      weightKg: c.weightKg,
      sleepHours: c.sleepHours,
      coachNote:
        options.includeCoachNotes === false
          ? c.coachNote && c.status === "approved"
            ? c.coachNote
            : null
          : c.coachNote,
    })),
    appointments: appointmentRows.map((a) => ({
      id: a.id,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      title: a.title,
    })),
  };
}

export type MemberProgressRow = {
  memberId: string;
  name: string;
  email: string;
  status: string;
  programStartDate: string | null;
  programEndDate: string | null;
  compliancePct: number;
  streakDays: number;
  windowLabel: string;
  checkInsInWindow: number;
  latestTrainingWeek: number | null;
  latestNutritionWeek: number | null;
  lastDeliveryAt: string | null;
};

export async function buildMembersProgressRoster(
  tenantId: string,
): Promise<MemberProgressRow[]> {
  const rows = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.tenantId, tenantId));

  const results: MemberProgressRow[] = [];

  for (const { member, user } of rows) {
    if (member.status === "lead") continue;

    const journey = await buildMemberJourney(member.id, tenantId, {
      includeCoachNotes: false,
    });
    if (!journey) continue;

    const latestTraining = journey.trainingPlans.find((p) => p.status === "published");
    const latestNutrition = journey.nutritionPlans.find((p) => p.status === "published");

    results.push({
      memberId: member.id,
      name: journey.member.name,
      email: user.email,
      status: member.status,
      programStartDate: member.programStartDate,
      programEndDate: member.programEndDate,
      compliancePct: member.compliancePct,
      streakDays: member.streakDays,
      windowLabel: journey.windowLabel,
      checkInsInWindow: journey.stats.checkInsInWindow,
      latestTrainingWeek: latestTraining?.weekNumber ?? null,
      latestNutritionWeek: latestNutrition?.weekNumber ?? null,
      lastDeliveryAt: journey.deliveries[0]?.createdAt ?? null,
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}
