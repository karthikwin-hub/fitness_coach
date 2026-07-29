import { createHash } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  appointments,
  checkIns,
  contentBlocks,
  members,
  messages,
  nutritionPlans,
  planDeliveries,
  planPublications,
  trainingPlans,
  users,
} from "./schema";
import { defaultProgramPhases } from "../members/program-phases";
import { buildDeliverySnapshot } from "../plans/delivery-snapshot";
import {
  deliveryExpiresAt,
  hashDeliveryToken,
} from "../plans/delivery-tokens";
import { recordPublication } from "../plans/queries";
import { createTrainingDays } from "../plans/training";
import {
  GYM_W1_STRUCTURE,
  HOME_W21_STRUCTURE,
  resolveTemplateDays,
} from "../plans/templates";

export const DEMO_VOICE_SAMPLE_URL = "/demo/coach-voice-sample.mp3";
export const DEMO_VOICE_DURATION_SEC = 12;

export const DEMO_HISTORY_IMPORT_KEYS = ["10001", "10002"] as const;

export function mintDemoDeliveryToken(importKey: string, week: number): string {
  const raw = `demo-delivery-${importKey}-w${week}`;
  return createHash("sha256").update(raw, "utf8").digest("base64url").slice(0, 43);
}

const PROGRAM_WEEKS = 39;
const MS_DAY = 86_400_000;

type DemoProfile = {
  importKey: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  bio: string;
  location: string;
  dietPreference: "hybrid" | "indian" | "vegetarian";
  healthGoals: string[];
  trainingType: "training_gym" | "training_home";
  stepGoal: number;
  weightStart: number;
  weightEnd: number;
  nutritionBase: {
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    carbsMax: number;
    fatMin: number;
    fatMax: number;
  };
};

const DEMO_PROFILES: DemoProfile[] = [
  {
    importKey: "10001",
    firebaseUid: "demo-gautam",
    email: "gautam@abstrack.com",
    displayName: "Gautam Rao",
    firstName: "Gautam",
    lastName: "Rao",
    bio: "Masters athlete balancing gym performance with recovery. Trains 4–5 days per week.",
    location: "USA",
    dietPreference: "hybrid",
    healthGoals: ["Performance", "Strength maintenance", "Mobility"],
    trainingType: "training_gym",
    stepGoal: 10000,
    weightStart: 82,
    weightEnd: 80,
    nutritionBase: {
      caloriesMin: 2200,
      caloriesMax: 2400,
      proteinMin: 140,
      proteinMax: 160,
      carbsMax: 220,
      fatMin: 55,
      fatMax: 65,
    },
  },
  {
    importKey: "10002",
    firebaseUid: "demo-sarah",
    email: "sarah@abstrack.com",
    displayName: "Sarah Mitchell",
    firstName: "Sarah",
    lastName: "Mitchell",
    bio: "Working mom of two — needs efficient home workouts and family-friendly meals.",
    location: "USA",
    dietPreference: "hybrid",
    healthGoals: ["Fat loss", "Energy", "Consistency"],
    trainingType: "training_home",
    stepGoal: 8000,
    weightStart: 68,
    weightEnd: 63,
    nutritionBase: {
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 70,
      proteinMax: 90,
      carbsMax: 140,
      fatMin: 40,
      fatMax: 50,
    },
  },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function interpolateWeight(start: number, end: number, progress: number): number {
  return Math.round((start + (end - start) * progress) * 10) / 10;
}

export async function seedDemoMemberHistory(
  tenantId: string,
  coachId: string,
  exerciseMapBySlug: Record<string, string>,
): Promise<void> {
  const programEnd = new Date();
  programEnd.setHours(12, 0, 0, 0);
  const programStart = addDays(programEnd, -(PROGRAM_WEEKS * 7));

  const allBlocks = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.tenantId, tenantId));

  const blockIdBySlug = new Map(allBlocks.map((b) => [b.slug, b.id]));

  const nutritionSlugs = [
    "welcome-letter",
    "success-strategies",
    "myfitnesspal",
    "week-macros-guide",
    "sample-dishes",
    "nutrition-tips-core",
    "grocery-list",
  ];
  const trainingSlugs = ["workout-guidelines", "stretching-routine", "cardio-finisher"];
  const nutritionBlockIds = nutritionSlugs
    .map((s) => blockIdBySlug.get(s))
    .filter(Boolean) as string[];
  const trainingBlockIds = trainingSlugs
    .map((s) => blockIdBySlug.get(s))
    .filter(Boolean) as string[];

  const structureFor = (type: DemoProfile["trainingType"]) =>
    type === "training_gym" ? GYM_W1_STRUCTURE : HOME_W21_STRUCTURE;

  for (const profile of DEMO_PROFILES) {
    const existingMember = await db
      .select({ id: members.id, userId: members.userId })
      .from(members)
      .where(
        and(eq(members.tenantId, tenantId), eq(members.importKey, profile.importKey)),
      )
      .limit(1);

    let memberId: string;
    let memberUserId: string;

    if (existingMember.length === 0) {
      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.firebaseUid, profile.firebaseUid))
        .limit(1);

      let userId: string;
      if (userRows.length === 0) {
        const [u] = await db
          .insert(users)
          .values({
            tenantId,
            firebaseUid: profile.firebaseUid,
            email: profile.email,
            displayName: profile.displayName,
            role: "member",
          })
          .returning();
        userId = u.id;
      } else {
        userId = userRows[0].id;
        await db
          .update(users)
          .set({ email: profile.email, displayName: profile.displayName })
          .where(eq(users.id, userId));
      }

      const [m] = await db
        .insert(members)
        .values({
          tenantId,
          userId,
          coachId,
          status: "active",
          importKey: profile.importKey,
          firstName: profile.firstName,
          lastName: profile.lastName,
          bio: profile.bio,
          location: profile.location,
          dietPreference: profile.dietPreference,
          healthGoalsJson: profile.healthGoals,
          stepGoal: profile.stepGoal,
          programStartDate: formatDate(programStart),
          programEndDate: formatDate(programEnd),
          programPhasesJson: defaultProgramPhases(
            formatDate(programStart),
            formatDate(programEnd),
          ),
          compliancePct: profile.importKey === "10001" ? 84 : 78,
          streakDays: 12,
        })
        .returning();
      memberId = m.id;
      memberUserId = userId;
    } else {
      memberId = existingMember[0].id;
      memberUserId = existingMember[0].userId;
      await db
        .update(members)
        .set({
          firstName: profile.firstName,
          lastName: profile.lastName,
          bio: profile.bio,
          programStartDate: formatDate(programStart),
          programEndDate: formatDate(programEnd),
          programPhasesJson: defaultProgramPhases(
            formatDate(programStart),
            formatDate(programEnd),
          ),
          compliancePct: profile.importKey === "10001" ? 84 : 78,
          streakDays: 12,
        })
        .where(eq(members.id, memberId));
    }

    const [{ count: checkInCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(checkIns)
      .where(eq(checkIns.memberId, memberId));

    if (checkInCount >= 50) {
      console.log(`Demo history for ${profile.displayName} already seeded (${checkInCount} check-ins).`);
      continue;
    }

    const [{ count: planCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingPlans)
      .where(eq(trainingPlans.memberId, memberId));

    if (planCount < PROGRAM_WEEKS) {
      const days = resolveTemplateDays(structureFor(profile.trainingType), exerciseMapBySlug);
      for (let week = 1; week <= PROGRAM_WEEKS; week++) {
        const weekDate = addDays(programStart, (week - 1) * 7);

        const [tPlan] = await db
          .insert(trainingPlans)
          .values({
            tenantId,
            memberId,
            weekNumber: week,
            stepGoal: profile.stepGoal,
            templateType: profile.trainingType,
            blockIdsJson: trainingBlockIds,
            status: "published",
            createdAt: weekDate,
            updatedAt: weekDate,
          })
          .returning();

        await createTrainingDays(tPlan.id, days);
        await recordPublication(tenantId, "training", tPlan.id, memberId, coachId);
        await db
          .update(planPublications)
          .set({ publishedAt: weekDate })
          .where(
            and(
              eq(planPublications.planId, tPlan.id),
              eq(planPublications.memberId, memberId),
            ),
          );

        const nBase = profile.nutritionBase;
        const [nPlan] = await db
          .insert(nutritionPlans)
          .values({
            tenantId,
            memberId,
            weekNumber: week,
            caloriesMin: nBase.caloriesMin,
            caloriesMax: nBase.caloriesMax,
            proteinMin: nBase.proteinMin,
            proteinMax: nBase.proteinMax,
            carbsMax: nBase.carbsMax,
            fatMin: nBase.fatMin,
            fatMax: nBase.fatMax,
            blockIdsJson: nutritionBlockIds,
            status: "published",
            createdAt: weekDate,
            updatedAt: weekDate,
          })
          .returning();

        await recordPublication(tenantId, "nutrition", nPlan.id, memberId, coachId);
        await db
          .update(planPublications)
          .set({ publishedAt: weekDate })
          .where(
            and(
              eq(planPublications.planId, nPlan.id),
              eq(planPublications.memberId, memberId),
            ),
          );
      }
    }

    const checkInTemplates = [
      { status: "approved" as const, energy: 8, soreness: 2, note: "Solid week — keep protein at lunch." },
      { status: "pending" as const, energy: 7, soreness: 4, note: null },
      { status: "approved" as const, energy: 9, soreness: 1, note: "Great sleep — stay the course." },
      { status: "flagged" as const, energy: 5, soreness: 6, note: "Travel week — let's simplify meals." },
    ];

    let checkInIdx = 0;
    for (let week = 0; week < PROGRAM_WEEKS; week++) {
      for (let ci = 0; ci < 2; ci++) {
        const dayOffset = week * 7 + ci * 3 + 1;
        const createdAt = addDays(programStart, dayOffset);
        const progress = dayOffset / (PROGRAM_WEEKS * 7);
        const tpl = checkInTemplates[checkInIdx % checkInTemplates.length];
        checkInIdx += 1;
        const withVoice = checkInIdx % 8 === 0;

        await db.insert(checkIns).values({
          tenantId,
          memberId,
          weightKg: interpolateWeight(profile.weightStart, profile.weightEnd, progress),
          sleepHours: tpl.status === "flagged" ? 5.5 : 6.5 + (checkInIdx % 3) * 0.5,
          energy: tpl.energy,
          soreness: tpl.soreness,
          status: tpl.status,
          coachNote: tpl.note,
          coachVoiceNoteUrl: withVoice ? DEMO_VOICE_SAMPLE_URL : null,
          coachVoiceNoteDurationSec: withVoice ? DEMO_VOICE_DURATION_SEC : null,
          aiConfidence: tpl.status === "flagged" ? 0.52 : 0.78 + (checkInIdx % 5) * 0.03,
          aiAnalysisJson: {
            summary:
              tpl.status === "flagged"
                ? "High-carb meal detected — consider smaller portions."
                : "Balanced plate with adequate protein.",
            proteinG: 55 + (checkInIdx % 30),
            flags: tpl.status === "flagged" ? ["Low protein"] : [],
          },
          createdAt,
        });
      }
    }

    const messageScript: Array<{
      fromCoach: boolean;
      body: string;
      dayOffset: number;
      voice?: boolean;
    }> = [
      { fromCoach: true, body: `Welcome ${profile.firstName}! Message me here anytime — this is our coaching thread.`, dayOffset: 2 },
      { fromCoach: false, body: "Thanks Coach! Excited to get started.", dayOffset: 2 },
      { fromCoach: true, body: "Your Week 1 plan is published — check your dashboard and send your first check-in when ready.", dayOffset: 5, voice: true },
      { fromCoach: false, body: "Quick question — can I swap rice for quinoa on busy days?", dayOffset: 21 },
      { fromCoach: true, body: "Absolutely — same portion size, slightly higher protein. I've noted it in your plan notes.", dayOffset: 22 },
      { fromCoach: false, body: "Traveling next week — any gym alternatives?", dayOffset: 45 },
      { fromCoach: true, body: "Use the home circuit in your plan — I'll check in when you're back.", dayOffset: 46 },
      { fromCoach: true, body: "Week 12 plan is live — new progression block. Listen to the voice note on your plan link.", dayOffset: 84, voice: true },
      { fromCoach: false, body: "Feeling stronger! Sleep has been better this month.", dayOffset: 120 },
      { fromCoach: true, body: "Love the consistency — keep protein steady on rest days too.", dayOffset: 121 },
      { fromCoach: false, body: "Hit a plateau on weight — any macro tweaks?", dayOffset: 160 },
      { fromCoach: true, body: "Small deficit adjustment in Week 24 nutrition — review the updated targets.", dayOffset: 161 },
      { fromCoach: true, body: "Month 6 check-in — proud of your streak. PDF plan pack sent to your email.", dayOffset: 180, voice: true },
      { fromCoach: false, body: "Received it — the voice note before the PDF was helpful!", dayOffset: 181 },
      { fromCoach: false, body: "Can we add a short mobility day?", dayOffset: 210 },
      { fromCoach: true, body: "Added stretching emphasis in Week 31 — see training day Thu.", dayOffset: 212 },
      { fromCoach: true, body: "Week 36 plan published — final push before program review.", dayOffset: 250 },
      { fromCoach: false, body: "Thank you — this program has been exactly what I needed.", dayOffset: 255 },
    ];

    for (const msg of messageScript) {
      const createdAt = addDays(programStart, msg.dayOffset);
      await db.insert(messages).values({
        tenantId,
        senderId: msg.fromCoach ? coachId : memberUserId,
        recipientId: msg.fromCoach ? memberUserId : coachId,
        body: msg.body,
        audioUrl: msg.voice ? DEMO_VOICE_SAMPLE_URL : null,
        audioDurationSec: msg.voice ? DEMO_VOICE_DURATION_SEC : null,
        readAt: msg.fromCoach ? createdAt : addDays(createdAt, 1),
        createdAt,
      });
    }

    const deliveryWeeks = [4, 8, 12, 16, 20, 24, 28, 32, 36];
    for (const week of deliveryWeeks) {
      const createdAt = addDays(programStart, week * 7);
      const token = mintDemoDeliveryToken(profile.importKey, week);
      try {
        const snapshot = await buildDeliverySnapshot(memberId, tenantId);
        const month = Math.ceil(week / 4);
        await db.insert(planDeliveries).values({
          tenantId,
          memberId,
          trainingPlanId: snapshot.training?.id ?? null,
          nutritionPlanId: snapshot.nutrition?.id ?? null,
          weekLabel: `Month ${month} · Week ${week}`,
          snapshotJson: { ...snapshot, seedTag: "demo-history-v1" },
          tokenHash: hashDeliveryToken(token),
          expiresAt: deliveryExpiresAt(createdAt),
          emailSentAt: createdAt,
          openCount: week < 32 ? 2 + (week % 3) : 0,
          firstOpenedAt: week < 32 ? addDays(createdAt, 1) : null,
          coachVoiceNoteUrl: week % 8 === 0 ? DEMO_VOICE_SAMPLE_URL : null,
          coachVoiceNoteDurationSec: week % 8 === 0 ? DEMO_VOICE_DURATION_SEC : null,
          createdBy: coachId,
          createdAt,
        });
        const baseUrl =
          process.env.APP_BASE_URL ??
          process.env.NEXT_PUBLIC_APP_BASE_URL ??
          "http://localhost:3010";
        console.log(
          `${profile.firstName} Week ${week} PDF: ${baseUrl.replace(/\/$/, "")}/p/${token}/plan.pdf`,
        );
      } catch {
        console.warn(`Skipped delivery seed for ${profile.firstName} week ${week}`);
      }
    }

    for (let month = 1; month <= 5; month++) {
      const startsAt = addDays(programStart, month * 30);
      const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
      await db.insert(appointments).values({
        tenantId,
        coachId,
        memberId,
        title: "Coaching check-in",
        startsAt,
        endsAt,
        status: month <= 4 ? "completed" : "booked",
        meetingType: "none",
        createdBy: coachId,
      });
    }

    const upcomingStart = addDays(programEnd, 3);
    await db.insert(appointments).values({
      tenantId,
      coachId,
      memberId,
      title: "Coaching check-in",
      startsAt: upcomingStart,
      endsAt: new Date(upcomingStart.getTime() + 60 * 60_000),
      status: "booked",
      meetingType: "none",
      createdBy: coachId,
    });

    console.log(`Demo history seeded for ${profile.displayName} (${profile.importKey}).`);
  }
}
