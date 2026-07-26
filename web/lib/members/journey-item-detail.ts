import { and, asc, eq, gte, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  members,
  messages,
  planDeliveries,
  planPublications,
  users,
} from "@/lib/db/schema";
import { getCheckInById } from "@/lib/check-ins/queries";
import { getNutritionPlanById, getTrainingPlanById } from "@/lib/plans/queries";
import type { PlanDeliverySnapshot } from "@/lib/plans/delivery-snapshot";

export type JourneyItemKind =
  | "training"
  | "nutrition"
  | "delivery"
  | "check-in"
  | "appointment";

export type JourneyCommunication = {
  role: "coach" | "member" | "system";
  label: string;
  body: string;
  at?: string;
};

export type JourneyPlannedSection = {
  heading: string;
  lines: string[];
};

export type JourneyItemDetail = {
  kind: JourneyItemKind;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  planned: JourneyPlannedSection[];
  communications: JourneyCommunication[];
};

function blockText(bodyJson: Record<string, unknown>): string | null {
  if (typeof bodyJson.text === "string") return bodyJson.text;
  if (typeof bodyJson.content === "string") return bodyJson.content;
  if (Array.isArray(bodyJson.paragraphs)) {
    return bodyJson.paragraphs.filter((p) => typeof p === "string").join("\n\n");
  }
  return null;
}

async function messagesOnDay(
  tenantId: string,
  memberUserId: string,
  coachUserId: string,
  dayIso: string,
): Promise<JourneyCommunication[]> {
  const from = new Date(`${dayIso}T00:00:00`);
  const to = new Date(`${dayIso}T23:59:59.999`);
  const rows = await db
    .select({
      body: messages.body,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(
      and(
        eq(messages.tenantId, tenantId),
        gte(messages.createdAt, from),
        lte(messages.createdAt, to),
        or(
          and(eq(messages.senderId, memberUserId), eq(messages.recipientId, coachUserId)),
          and(eq(messages.senderId, coachUserId), eq(messages.recipientId, memberUserId)),
        ),
      ),
    )
    .orderBy(asc(messages.createdAt));

  return rows.map((m) => ({
    role: m.senderId === coachUserId ? ("coach" as const) : ("member" as const),
    label: m.senderId === coachUserId ? "Coach message" : "Member message",
    body: m.body,
    at: m.createdAt.toISOString(),
  }));
}

async function memberContext(memberId: string, tenantId: string) {
  const [row] = await db
    .select({
      member: members,
      memberUserId: users.id,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1);
  return row ?? null;
}

async function planPublicationNote(
  planType: "training" | "nutrition",
  planId: string,
  memberId: string,
): Promise<JourneyCommunication | null> {
  const [pub] = await db
    .select({ publishedAt: planPublications.publishedAt })
    .from(planPublications)
    .where(
      and(
        eq(planPublications.planType, planType),
        eq(planPublications.planId, planId),
        eq(planPublications.memberId, memberId),
      ),
    )
    .orderBy(planPublications.publishedAt)
    .limit(1);
  if (!pub) return null;
  return {
    role: "system",
    label: "Published",
    body: "Plan published to the member portal.",
    at: pub.publishedAt.toISOString(),
  };
}

export async function buildJourneyItemDetail(
  kind: JourneyItemKind,
  itemId: string,
  memberId: string,
  tenantId: string,
): Promise<JourneyItemDetail | null> {
  const ctx = await memberContext(memberId, tenantId);
  if (!ctx) return null;
  const coachUserId = ctx.member.coachId;

  switch (kind) {
    case "training": {
      const plan = await getTrainingPlanById(itemId);
      if (!plan || plan.memberId !== memberId || plan.tenantId !== tenantId) return null;

      const planned: JourneyPlannedSection[] = [
        {
          heading: "Overview",
          lines: [
            `Week ${plan.weekNumber} · ${plan.status}`,
            plan.stepGoal ? `Daily step goal: ${plan.stepGoal.toLocaleString()}` : "",
            plan.templateType ? `Template: ${plan.templateType.replace(/_/g, " ")}` : "",
          ].filter(Boolean),
        },
      ];

      if (plan.days?.length) {
        planned.push({
          heading: "Workouts",
          lines: plan.days.flatMap((day) => {
            const exercises = day.sections.flatMap((s) =>
              s.exercises.map(
                (ex) =>
                  `${day.label}: ${ex.exercise.name}${ex.sets ? ` · ${ex.sets}×${ex.reps ?? "—"}` : ""}`,
              ),
            );
            return exercises.length > 0 ? exercises : [`${day.label} — (no exercises listed)`];
          }),
        });
      }

      if (plan.blocks?.length) {
        planned.push({
          heading: "Guidance blocks",
          lines: plan.blocks.map((b) => {
            const text = blockText((b.bodyJson as Record<string, unknown>) ?? {});
            return text
              ? `${b.title}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
              : b.title;
          }),
        });
      }

      const communications: JourneyCommunication[] = [];
      const pub = await planPublicationNote("training", plan.id, memberId);
      if (pub) communications.push(pub);

      return {
        kind,
        id: plan.id,
        title: `Training · Week ${plan.weekNumber}`,
        status: plan.status,
        planned,
        communications,
      };
    }

    case "nutrition": {
      const plan = await getNutritionPlanById(itemId);
      if (!plan || plan.memberId !== memberId || plan.tenantId !== tenantId) return null;

      const macroLine = [
        plan.caloriesMin != null && plan.caloriesMax != null
          ? `${plan.caloriesMin}–${plan.caloriesMax} kcal`
          : null,
        plan.proteinMin != null && plan.proteinMax != null
          ? `Protein ${plan.proteinMin}–${plan.proteinMax}g`
          : null,
        plan.carbsMax != null ? `Carbs ≤ ${plan.carbsMax}g` : null,
        plan.fatMin != null && plan.fatMax != null
          ? `Fat ${plan.fatMin}–${plan.fatMax}g`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const planned: JourneyPlannedSection[] = [
        {
          heading: "Macros",
          lines: macroLine ? [macroLine] : ["No macro targets set"],
        },
      ];

      if (plan.blocks?.length) {
        planned.push({
          heading: "Nutrition content",
          lines: plan.blocks.map((b) => {
            const text = blockText((b.bodyJson as Record<string, unknown>) ?? {});
            return text
              ? `${b.title}: ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}`
              : b.title;
          }),
        });
      }

      const communications: JourneyCommunication[] = [];
      const pub = await planPublicationNote("nutrition", plan.id, memberId);
      if (pub) communications.push(pub);

      return {
        kind,
        id: plan.id,
        title: `Nutrition · Week ${plan.weekNumber}`,
        status: plan.status,
        planned,
        communications,
      };
    }

    case "delivery": {
      const [row] = await db
        .select()
        .from(planDeliveries)
        .where(
          and(
            eq(planDeliveries.id, itemId),
            eq(planDeliveries.memberId, memberId),
            eq(planDeliveries.tenantId, tenantId),
          ),
        )
        .limit(1);
      if (!row) return null;

      const snapshot = row.snapshotJson as PlanDeliverySnapshot;
      const planned: JourneyPlannedSection[] = [];

      if (snapshot.training) {
        planned.push({
          heading: "Training in this delivery",
          lines: [
            `Week ${snapshot.training.weekNumber}`,
            ...snapshot.training.days.map(
              (d) =>
                `${d.label}${d.muscleGroup ? ` (${d.muscleGroup})` : ""} — ${d.sections.reduce((n, s) => n + s.exercises.length, 0)} exercises`,
            ),
          ],
        });
      }
      if (snapshot.nutrition) {
        const n = snapshot.nutrition;
        planned.push({
          heading: "Nutrition in this delivery",
          lines: [
            `Week ${n.weekNumber}`,
            `${n.caloriesMin ?? "—"}–${n.caloriesMax ?? "—"} kcal · Protein ${n.proteinMin ?? "—"}–${n.proteinMax ?? "—"}g`,
            ...n.blocks.map((b) => b.title),
          ],
        });
      }

      const communications: JourneyCommunication[] = [
        {
          role: "system",
          label: "Delivery",
          body: `Plan pack sent · opened ${row.openCount} time${row.openCount === 1 ? "" : "s"}`,
          at: row.createdAt.toISOString(),
        },
      ];
      if (row.emailSentAt) {
        communications.push({
          role: "system",
          label: "Email",
          body: "Plan delivery email sent to member.",
          at: row.emailSentAt.toISOString(),
        });
      }

      const day = row.createdAt.toISOString().slice(0, 10);
      if (coachUserId) {
        communications.push(
          ...(await messagesOnDay(tenantId, ctx.memberUserId, coachUserId, day)),
        );
      }

      return {
        kind,
        id: row.id,
        title: snapshot.weekLabel,
        subtitle: day,
        planned,
        communications,
      };
    }

    case "check-in": {
      const checkIn = await getCheckInById(itemId, tenantId);
      if (!checkIn || checkIn.memberId !== memberId) return null;

      const planned: JourneyPlannedSection[] = [
        {
          heading: "Member submission",
          lines: [
            checkIn.weightKg != null ? `Weight: ${checkIn.weightKg} kg` : null,
            checkIn.sleepHours != null ? `Sleep: ${checkIn.sleepHours} hours` : null,
            checkIn.energy != null ? `Energy: ${checkIn.energy}/10` : null,
            checkIn.soreness != null ? `Soreness: ${checkIn.soreness}/10` : null,
            checkIn.mealPhotoUrl ? "Meal photo attached" : null,
          ].filter((line): line is string => Boolean(line)),
        },
      ];

      const analysis = checkIn.aiAnalysisJson as { summary?: string } | null;
      if (analysis?.summary) {
        planned.push({
          heading: "AI meal review",
          lines: [analysis.summary],
        });
      }

      const communications: JourneyCommunication[] = [];
      if (checkIn.coachNote) {
        communications.push({
          role: "coach",
          label: "Coach note",
          body: checkIn.coachNote,
        });
      }

      const day = checkIn.createdAt.slice(0, 10);
      if (coachUserId) {
        communications.push(
          ...(await messagesOnDay(tenantId, ctx.memberUserId, coachUserId, day)),
        );
      }

      return {
        kind,
        id: checkIn.id,
        title: `Check-in · ${day}`,
        status: checkIn.status,
        planned,
        communications,
      };
    }

    case "appointment": {
      const [appt] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, itemId),
            eq(appointments.memberId, memberId),
            eq(appointments.tenantId, tenantId),
          ),
        )
        .limit(1);
      if (!appt) return null;

      const planned: JourneyPlannedSection[] = [
        {
          heading: "Session",
          lines: [
            `${appt.startsAt.toISOString().slice(0, 16).replace("T", " ")} – ${appt.endsAt.toISOString().slice(11, 16)}`,
            appt.meetingType !== "none"
              ? `Format: ${appt.meetingType.replace(/_/g, " ")}`
              : "Format: not specified",
            appt.location ? `Location: ${appt.location}` : null,
            appt.joinUrl ? `Link: ${appt.joinUrl}` : null,
          ].filter((line): line is string => Boolean(line)),
        },
      ];

      const communications: JourneyCommunication[] = [];
      if (appt.notes) {
        communications.push({
          role: "coach",
          label: "Session notes",
          body: appt.notes,
        });
      }

      const day = appt.startsAt.toISOString().slice(0, 10);
      if (coachUserId) {
        communications.push(
          ...(await messagesOnDay(tenantId, ctx.memberUserId, coachUserId, day)),
        );
      }

      return {
        kind,
        id: appt.id,
        title: appt.title ?? "Coaching session",
        status: appt.status,
        subtitle: day,
        planned,
        communications,
      };
    }

    default:
      return null;
  }
}

export function isJourneyItemKind(value: string): value is JourneyItemKind {
  return (
    value === "training" ||
    value === "nutrition" ||
    value === "delivery" ||
    value === "check-in" ||
    value === "appointment"
  );
}
