import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  checkIns,
  contentBlocks,
  exercises,
  leads,
  members,
  messages,
  nutritionPlans,
  planTemplates,
  tenants,
  trainingPlans,
  users,
  videos,
} from "./schema";
import { ABSTRACK_BRAND, type TenantBranding } from "../brand";
import { createTrainingDays } from "../plans/training";
import { recordPublication } from "../plans/queries";
import { installTenantPlanDefaults } from "../plans/install-defaults";
import { ensureJourneyDemoData } from "./seed-journey-demo";
import { seedVaultDemoCatalog, seedVaultCatalogMarketing } from "./seed-vault";
import { ensureMemberCoachAssignments, getCanonicalCoachId } from "../members/canonical-coach";
import {
  GYM_W1_STRUCTURE,
  HOME_W21_STRUCTURE,
  resolveTemplateDays,
} from "../plans/templates";

const branding: TenantBranding = {
  name: ABSTRACK_BRAND.name,
  accentMode: "dual",
  primary: ABSTRACK_BRAND.colors.turquoise,
  accentWorkout: ABSTRACK_BRAND.colors.teal,
  accentDiet: ABSTRACK_BRAND.colors.green,
  accentPromo: ABSTRACK_BRAND.colors.turquoise,
};

const videoSeeds = [
  { title: "Incline Push-Up", muscleGroup: "chest", equipment: "bodyweight", skillLevel: "beginner", youtubeVideoId: "IODxDxX7oi4", sortOrder: 0 },
  { title: "Bodyweight Squat", muscleGroup: "legs", equipment: "bodyweight", skillLevel: "beginner", youtubeVideoId: "aclHkVaku9U", sortOrder: 1 },
  { title: "Walking Lunges", muscleGroup: "legs", equipment: "bodyweight", skillLevel: "intermediate", youtubeVideoId: "L8fvypPrzzs", sortOrder: 2 },
  { title: "Plank Hold", muscleGroup: "core", equipment: "bodyweight", skillLevel: "beginner", youtubeVideoId: "pSHjTRCgFw4", sortOrder: 3 },
  { title: "Home Circuit Burpees", muscleGroup: "home", equipment: "bodyweight", skillLevel: "intermediate", youtubeVideoId: "ml6cT4AZdqI", sortOrder: 4 },
  { title: "Lat Pulldown", muscleGroup: "back", equipment: "cable", skillLevel: "beginner", youtubeVideoId: "CAwf7n6Luuc", sortOrder: 5 },
  { title: "Glute Bridge", muscleGroup: "legs", equipment: "bodyweight", skillLevel: "beginner", youtubeVideoId: "wPM8ic2hhAw", sortOrder: 6 },
];

const pilotClients = [
  {
    uid: "pilot-hetal",
    email: "hetal@abstrack.local",
    displayName: "Hetal",
    firstName: "Hetal",
    lastName: "Patel",
    phone: "+1 415 555 0142",
    addressLine1: "1200 Market Street",
    city: "San Francisco",
    stateRegion: "CA",
    postalCode: "94102",
    country: "United States",
    dateOfBirth: "1972-03-18",
    occupation: "Marketing Director",
    bio: "Busy professional balancing travel and family. Prefers home workouts with minimal equipment.",
    healthIssues: "Osteoporosis (early stage), mild knee discomfort on long walks",
    allergies: "Lactose intolerant",
    medications: "Vitamin D, calcium supplement",
    emergencyContactName: "Raj Patel",
    emergencyContactPhone: "+1 415 555 0199",
    coachNotes: "Responds well to protein-forward meal plans. Check in on iron intake weekly.",
    location: "USA",
    dietPreference: "hybrid" as const,
    healthGoals: ["Reduce inflammation", "Osteoporosis support", "Iron intake"],
    programStart: "2026-07-01",
    programEnd: "2026-10-31",
    stepGoal: 8000,
    nutrition: { weekNumber: 1, caloriesMin: 1350, caloriesMax: 1450, proteinMin: 60, proteinMax: 90, carbsMax: 150, fatMin: 40, fatMax: 45 },
    trainingType: "training_home" as const,
    trainingWeek: 21,
  },
  {
    uid: "pilot-avinash",
    email: "avinash@abstrack.local",
    displayName: "Dr. Avinash",
    firstName: "Avinash",
    lastName: "Mehta",
    phone: "+91 98765 43210",
    addressLine1: "14 Residency Road",
    city: "Bangalore",
    stateRegion: "Karnataka",
    postalCode: "560025",
    country: "India",
    dateOfBirth: "1985-11-02",
    occupation: "Physician",
    bio: "Gym-based training 4–5 days per week. Wants structured fat loss while maintaining muscle.",
    healthIssues: "Previous shoulder impingement (2024) — avoid overhead pressing without clearance",
    allergies: "None reported",
    medications: "None",
    emergencyContactName: "Anita Mehta",
    emergencyContactPhone: "+91 98765 43211",
    coachNotes: "High compliance when macros are clear. Likes Indian lunch options.",
    location: "India",
    dietPreference: "indian" as const,
    healthGoals: ["Fat loss", "Strength"],
    programStart: "2026-07-01",
    programEnd: "2026-12-31",
    stepGoal: 10000,
    nutrition: { weekNumber: 1, caloriesMin: 1600, caloriesMax: 1800, proteinMin: 120, proteinMax: 140, carbsMax: 180, fatMin: 50, fatMax: 60 },
    trainingType: "training_gym" as const,
    trainingWeek: 1,
  },
  {
    uid: "pilot-shruti",
    email: "shruti@abstrack.local",
    displayName: "Shruti",
    firstName: "Shruti",
    lastName: "Kapoor",
    phone: "+61 412 345 678",
    addressLine1: "88 George Street",
    city: "Sydney",
    stateRegion: "NSW",
    postalCode: "2000",
    country: "Australia",
    dateOfBirth: "1990-07-25",
    occupation: "Software Engineer",
    bio: "Works from home. Wants consistent home circuits and vegetarian meal ideas.",
    healthIssues: "Lower back tightness after long desk sessions",
    allergies: "Nuts",
    medications: "None",
    emergencyContactName: "Vik Kapoor",
    emergencyContactPhone: "+61 412 345 679",
    coachNotes: "Strong on check-ins; needs reminders for stretching on rest days.",
    location: "Australia",
    dietPreference: "vegetarian" as const,
    healthGoals: ["Home workout consistency", "Core strength"],
    programStart: "2026-06-01",
    programEnd: "2026-12-31",
    stepGoal: 10000,
    nutrition: { weekNumber: 21, caloriesMin: 1400, caloriesMax: 1500, proteinMin: 70, proteinMax: 90, carbsMax: 140, fatMin: 40, fatMax: 50 },
    trainingType: "training_home" as const,
    trainingWeek: 21,
  },
];

async function seed() {
  console.log("Seeding Abs-Track tenant...");

  let tenantId: string;
  const existing = await db.select().from(tenants).where(eq(tenants.slug, "abstrack")).limit(1);

  if (existing.length > 0) {
    tenantId = existing[0].id;
    await db
      .update(tenants)
      .set({
        status: "active",
        subdomain: "abstrack",
        brandingJson: branding,
      })
      .where(eq(tenants.id, tenantId));
    console.log("Tenant abstrack exists.");
  } else {
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: "Abs-Track by Helna",
        slug: "abstrack",
        status: "active",
        subdomain: "abstrack",
        brandingJson: branding,
        aiAutoApproveThreshold: 0.85,
        calComUrl: process.env.NEXT_PUBLIC_CAL_COM_URL ?? "",
      })
      .returning();
    tenantId = tenant.id;
  }

  const adminUid = "dev-platform-admin";
  const adminRows = await db.select().from(users).where(eq(users.firebaseUid, adminUid)).limit(1);
  if (adminRows.length === 0) {
    await db.insert(users).values({
      tenantId,
      firebaseUid: adminUid,
      email: "admin@platform.local",
      displayName: "Platform Admin",
      role: "platform_admin",
    });
  } else if (adminRows[0].role !== "platform_admin") {
    await db
      .update(users)
      .set({ role: "platform_admin" })
      .where(eq(users.id, adminRows[0].id));
  }

  const coachUid = "dev-local-user";
  let coachId: string;
  const coachRows = await db.select().from(users).where(eq(users.firebaseUid, coachUid)).limit(1);
  if (coachRows.length === 0) {
    const [coach] = await db.insert(users).values({
      tenantId,
      firebaseUid: coachUid,
      email: "helna@abstrack.com",
      displayName: "Helna",
      role: "coach",
    }).returning();
    coachId = coach.id;
  } else {
    coachId = coachRows[0].id;
    await db
      .update(users)
      .set({ email: "helna@abstrack.com", displayName: "Helna" })
      .where(eq(users.id, coachId));
  }

  const memberUid = "dev-local-member";
  const memberUserRows = await db.select().from(users).where(eq(users.firebaseUid, memberUid)).limit(1);
  if (memberUserRows.length === 0) {
    const [memberUser] = await db.insert(users).values({
      tenantId,
      firebaseUid: memberUid,
      email: "member@abstrack.local",
      displayName: "Demo Member (Hetal)",
      role: "member",
    }).returning();

    await db.insert(members).values({
      tenantId,
      userId: memberUser.id,
      coachId,
      status: "active",
      location: "USA",
      compliancePct: 82,
      streakDays: 5,
      programStartDate: "2026-07-01",
      programEndDate: "2026-10-31",
      dietPreference: "hybrid",
      healthGoalsJson: ["Reduce inflammation", "Osteoporosis support"],
      stepGoal: 8000,
    });
  }

  const installed = await installTenantPlanDefaults(tenantId);
  console.log(
    `Installed plan defaults: ${installed.exercises} exercises, templates ${installed.templates.join(", ")}.`,
  );

  // Prefer catalog by slug for template resolution
  const allExercises = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, tenantId));
  const exerciseMapBySlug: Record<string, string> = {};
  for (const ex of allExercises) {
    if (ex.slug) exerciseMapBySlug[ex.slug] = ex.id;
  }

  const existingVideos = await db.select().from(videos).where(eq(videos.tenantId, tenantId)).limit(1);
  if (existingVideos.length === 0) {
    await db.insert(videos).values(videoSeeds.map((v) => ({ tenantId, ...v })));
    console.log(`Inserted ${videoSeeds.length} videos.`);
  }

  // Nutrition template stub (macros only) — separate from training structure templates
  const existingNutritionTpl = await db
    .select()
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, tenantId));
  if (!existingNutritionTpl.some((t) => t.type === "nutrition_program")) {
    await db.insert(planTemplates).values({
      tenantId,
      type: "nutrition_program",
      key: "nutrition_program",
      name: "Default Nutrition Macros",
      structureJson: {
        caloriesMin: 1350,
        caloriesMax: 1450,
        proteinMin: 60,
        proteinMax: 90,
        carbsMax: 150,
      },
    });
  }

  async function applyMemberProfile(memberId: string, client: (typeof pilotClients)[0]) {
    await db
      .update(members)
      .set({
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        addressLine1: client.addressLine1,
        city: client.city,
        stateRegion: client.stateRegion,
        postalCode: client.postalCode,
        country: client.country,
        dateOfBirth: client.dateOfBirth,
        occupation: client.occupation,
        bio: client.bio,
        healthIssues: client.healthIssues,
        allergies: client.allergies,
        medications: client.medications,
        emergencyContactName: client.emergencyContactName,
        emergencyContactPhone: client.emergencyContactPhone,
        coachNotes: client.coachNotes,
        location: client.location,
        dietPreference: client.dietPreference,
        healthGoalsJson: client.healthGoals,
        stepGoal: client.stepGoal,
        programStartDate: client.programStart,
        programEndDate: client.programEnd,
      })
      .where(eq(members.id, memberId));
  }

  async function ensurePilotClient(client: (typeof pilotClients)[0]) {
    const userRows = await db.select().from(users).where(eq(users.firebaseUid, client.uid)).limit(1);
    let memberId: string;

    if (userRows.length === 0) {
      const [u] = await db.insert(users).values({
        tenantId,
        firebaseUid: client.uid,
        email: client.email,
        displayName: client.displayName,
        role: "member",
      }).returning();

      const [m] = await db.insert(members).values({
        tenantId,
        userId: u.id,
        coachId,
        status: "active",
        location: client.location,
        firstName: client.firstName,
        lastName: client.lastName,
        phone: client.phone,
        addressLine1: client.addressLine1,
        city: client.city,
        stateRegion: client.stateRegion,
        postalCode: client.postalCode,
        country: client.country,
        dateOfBirth: client.dateOfBirth,
        occupation: client.occupation,
        bio: client.bio,
        healthIssues: client.healthIssues,
        allergies: client.allergies,
        medications: client.medications,
        emergencyContactName: client.emergencyContactName,
        emergencyContactPhone: client.emergencyContactPhone,
        coachNotes: client.coachNotes,
        programStartDate: client.programStart,
        programEndDate: client.programEnd,
        dietPreference: client.dietPreference,
        healthGoalsJson: client.healthGoals,
        stepGoal: client.stepGoal,
        compliancePct: 75,
        streakDays: 3,
      }).returning();
      memberId = m.id;
    } else {
      const [m] = await db.select().from(members).where(eq(members.userId, userRows[0].id)).limit(1);
      memberId = m.id;
      await applyMemberProfile(memberId, client);
    }

    const existingNutrition = await db.select().from(nutritionPlans).where(eq(nutritionPlans.memberId, memberId)).limit(1);
    if (existingNutrition.length === 0) {
      const nutritionSlugs = new Set([
        "welcome-letter",
        "success-strategies",
        "myfitnesspal",
        "week-macros-guide",
        "sample-dishes",
        "nutrition-tips-core",
        "grocery-list",
      ]);
      const allBlocksForAttach = await db
        .select()
        .from(contentBlocks)
        .where(eq(contentBlocks.tenantId, tenantId));
      const attachedBlocks = allBlocksForAttach
        .filter((b) => nutritionSlugs.has(b.slug))
        .map((b) => b.id);
      const [nPlan] = await db.insert(nutritionPlans).values({
        tenantId,
        memberId,
        ...client.nutrition,
        blockIdsJson: attachedBlocks,
        status: "published",
      }).returning();

      await recordPublication(tenantId, "nutrition", nPlan.id, memberId, coachId);
    }

    const existingTraining = await db.select().from(trainingPlans).where(eq(trainingPlans.memberId, memberId)).limit(1);
    if (existingTraining.length === 0) {
      const structure =
        client.trainingType === "training_gym"
          ? GYM_W1_STRUCTURE
          : HOME_W21_STRUCTURE;
      const days = resolveTemplateDays(structure, exerciseMapBySlug);

      const trainingBlockIds = (
        await db
          .select()
          .from(contentBlocks)
          .where(eq(contentBlocks.tenantId, tenantId))
      )
        .filter((b) =>
          ["workout-guidelines", "stretching-routine", "cardio-finisher"].includes(
            b.slug,
          ),
        )
        .map((b) => b.id);

      const [tPlan] = await db.insert(trainingPlans).values({
        tenantId,
        memberId,
        weekNumber: client.trainingWeek,
        stepGoal: client.stepGoal,
        templateType: client.trainingType,
        blockIdsJson: trainingBlockIds,
        status: "published",
      }).returning();

      await createTrainingDays(tPlan.id, days);
      await recordPublication(tenantId, "training", tPlan.id, memberId, coachId);
    }
  }

  for (const client of pilotClients) {
    await ensurePilotClient(client);
  }

  const existingCheckIns = await db
    .select()
    .from(checkIns)
    .where(eq(checkIns.tenantId, tenantId))
    .limit(1);

  if (existingCheckIns.length === 0) {
    const memberRows = await db
      .select({
        id: members.id,
        displayName: users.displayName,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.tenantId, tenantId));

    const checkInTemplates = [
      {
        status: "pending" as const,
        weightKg: 62.4,
        sleepHours: 6.5,
        energy: 6,
        soreness: 3,
        aiConfidence: 0.72,
        aiAnalysisJson: {
          summary: "Balanced plate with dal and rice. Protein slightly below target.",
          proteinG: 52,
          flags: ["Below protein target"],
        },
      },
      {
        status: "flagged" as const,
        weightKg: 78.1,
        sleepHours: 5,
        energy: 4,
        soreness: 6,
        aiConfidence: 0.48,
        aiAnalysisJson: {
          summary: "High-carb meal detected. Consider reducing portion size.",
          proteinG: 35,
          flags: ["Low protein", "High carbs"],
        },
      },
      {
        status: "approved" as const,
        weightKg: 58.2,
        sleepHours: 7.5,
        energy: 8,
        soreness: 2,
        aiConfidence: 0.91,
        aiAnalysisJson: {
          summary: "Excellent macro alignment with vegetarian home meal.",
          proteinG: 78,
          flags: [] as string[],
        },
      },
      {
        status: "pending" as const,
        weightKg: 61.9,
        sleepHours: 7,
        energy: 7,
        soreness: 4,
        aiConfidence: 0.68,
        aiAnalysisJson: {
          summary: "Breakfast check-in — yogurt and fruit bowl.",
          proteinG: 28,
          flags: ["Add protein source"],
        },
      },
    ];

    const dayMs = 86_400_000;
    let inserted = 0;
    for (let i = 0; i < memberRows.length; i++) {
      const member = memberRows[i];
      const template = checkInTemplates[i % checkInTemplates.length];
      await db.insert(checkIns).values({
        tenantId,
        memberId: member.id,
        weightKg: template.weightKg,
        sleepHours: template.sleepHours,
        energy: template.energy,
        soreness: template.soreness,
        aiConfidence: template.aiConfidence,
        aiAnalysisJson: template.aiAnalysisJson,
        status: template.status,
        createdAt: new Date(Date.now() - (i + 1) * dayMs),
      });
      inserted += 1;
    }
    console.log(`Inserted ${inserted} sample check-ins.`);
  } else {
    console.log("Check-ins already exist.");
  }

  const demoMemberUser = await db.select().from(users).where(eq(users.firebaseUid, memberUid)).limit(1);
  if (demoMemberUser.length > 0) {
    const [demoMember] = await db.select().from(members).where(eq(members.userId, demoMemberUser[0].id)).limit(1);
    if (demoMember) {
      await applyMemberProfile(demoMember.id, {
        ...pilotClients[0],
        uid: memberUid,
        displayName: "Demo Member (Hetal)",
        email: "member@abstrack.local",
      });
      await db
        .update(users)
        .set({ displayName: "Demo Member (Hetal)" })
        .where(eq(users.id, demoMemberUser[0].id));

      const hasPlans = await db.select().from(nutritionPlans).where(eq(nutritionPlans.memberId, demoMember.id)).limit(1);
      if (hasPlans.length === 0) {
        await ensurePilotClient({
          ...pilotClients[0],
          uid: memberUid,
          displayName: "Demo Member (Hetal)",
          email: "member@abstrack.local",
        });
      }
    }
  }

  const newMemberUid = "dev-local-new-member";
  const newMemberRows = await db.select().from(users).where(eq(users.firebaseUid, newMemberUid)).limit(1);
  if (newMemberRows.length === 0) {
    const [newUser] = await db.insert(users).values({
      tenantId,
      firebaseUid: newMemberUid,
      email: "newmember@abstrack.local",
      displayName: "New Member (Priya)",
      role: "member",
    }).returning();

    await db.insert(members).values({
      tenantId,
      userId: newUser.id,
      coachId,
      status: "active",
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+91 98765 00001",
      location: "India",
      bio: "Just signed up — waiting for first plan from coach.",
      healthGoalsJson: ["Fat loss", "Build consistency"],
      healthIssues: "None reported",
      dietPreference: "indian",
      stepGoal: 8000,
      compliancePct: 0,
      streakDays: 0,
      programStartDate: "2026-07-24",
    });
    console.log("Inserted new member dev persona (no plans).");
  } else {
    const [newMember] = await db.select().from(members).where(eq(members.userId, newMemberRows[0].id)).limit(1);
    if (newMember) {
      await db
        .update(members)
        .set({
          firstName: "Priya",
          lastName: "Sharma",
          phone: "+91 98765 00001",
          location: "India",
          bio: "Just signed up — waiting for first plan from coach.",
          healthGoalsJson: ["Fat loss", "Build consistency"],
          healthIssues: "None reported",
          dietPreference: "indian",
          stepGoal: 8000,
        })
        .where(eq(members.id, newMember.id));
    }
  }

  const existingLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.tenantId, tenantId))
    .limit(1);

  if (existingLeads.length === 0) {
    await db.insert(leads).values([
      {
        tenantId,
        email: "priya.sharma@example.com",
        quizResponsesJson: { goal: "Fat loss", location: "India", timeline: "3 months" },
        intentScore: 92,
        routedTo: "cal_booking",
      },
      {
        tenantId,
        email: "james.wong@example.com",
        quizResponsesJson: { goal: "Strength", location: "Australia", timeline: "6 months" },
        intentScore: 68,
        routedTo: "vault_waitlist",
      },
    ]);
    console.log("Inserted sample quiz enquiries.");
  }

  const pausedUid = "pilot-paused-demo";
  const pausedRows = await db.select().from(users).where(eq(users.firebaseUid, pausedUid)).limit(1);
  if (pausedRows.length === 0) {
    const [u] = await db.insert(users).values({
      tenantId,
      firebaseUid: pausedUid,
      email: "paused@abstrack.local",
      displayName: "Former Client (paused)",
      role: "member",
    }).returning();
    await db.insert(members).values({
      tenantId,
      userId: u.id,
      coachId,
      status: "paused",
      location: "USA",
      compliancePct: 45,
      streakDays: 0,
      programStartDate: "2025-01-01",
      programEndDate: "2025-06-30",
      dietPreference: "western",
      healthGoalsJson: ["Maintenance"],
      stepGoal: 6000,
    });
    console.log("Inserted paused member demo.");
  }

  const demoMemberForMessages = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.firebaseUid, "dev-local-member"))
    .limit(1);

  if (demoMemberForMessages.length > 0) {
    const memberUserId = demoMemberForMessages[0].id;
    const welcomeSeed = await db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.body, "Welcome to Abs-Track! Message me here anytime — this replaces our WhatsApp threads."))
      .limit(1);

    if (welcomeSeed.length === 0) {
      await db.insert(messages).values([
        {
          tenantId,
          senderId: coachId,
          recipientId: memberUserId,
          body: "Welcome to Abs-Track! Message me here anytime — this replaces our WhatsApp threads.",
        },
        {
          tenantId,
          senderId: memberUserId,
          recipientId: coachId,
          body: "Thanks Coach Helna! Excited to get started.",
        },
        {
          tenantId,
          senderId: coachId,
          recipientId: memberUserId,
          body: "Great — check your dashboard for today's plan and send your first meal check-in when ready.",
        },
      ]);
      console.log("Inserted sample messages.");
    }
  }

  console.log("Seed complete.");
  const reassigned = await ensureMemberCoachAssignments(tenantId);
  if (reassigned > 0) {
    console.log(`Reassigned ${reassigned} member(s) to canonical coach.`);
  }
  const journeyCoachId = (await getCanonicalCoachId(tenantId)) ?? coachId;
  await ensureJourneyDemoData(tenantId, journeyCoachId);
  await seedVaultDemoCatalog(tenantId);
  await seedVaultCatalogMarketing(tenantId);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
