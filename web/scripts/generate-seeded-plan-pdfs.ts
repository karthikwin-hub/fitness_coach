/**
 * Generate sample plan-pack PDFs from canonical training fixtures (offline — no DB).
 *
 * Run: npm run plans:pdf
 * Output: docs/plan-samples/
 */
import fs from "fs";
import path from "path";
import { ABSTRACK_BRAND } from "../lib/brand";
import { contentBlockSeeds } from "../lib/db/content-block-seeds";
import { EXERCISE_CATALOG } from "../lib/plans/exercise-catalog";
import type {
  PlanDeliverySnapshot,
  SnapshotDay,
} from "../lib/plans/delivery-snapshot";
import {
  GYM_W1_STRUCTURE,
  HOME_W21_STRUCTURE,
  type TrainingTemplateStructure,
} from "../lib/plans/templates";
import {
  buildHealthConsiderationsBlock,
  buildMemberTemplateVars,
  resolveTemplateString,
} from "../lib/plans/template-vars";
import { renderPlanPackPdf } from "../lib/pdf/plan-pack";

const BASE =
  process.env.APP_BASE_URL ??
  process.env.GUIDE_BASE_URL ??
  "https://abstrack.duckdns.org";
const OUT_DIR = path.resolve(__dirname, "../../docs/plan-samples");

const nutritionSlugs = [
  "welcome-letter",
  "success-strategies",
  "myfitnesspal",
  "week-macros-guide",
  "sample-dishes",
  "nutrition-tips-core",
  "grocery-list",
];

const trainingGuidelineSlugs = [
  "workout-guidelines",
  "stretching-routine",
  "cardio-finisher",
];

const catalogBySlug = Object.fromEntries(
  EXERCISE_CATALOG.map((e) => [e.slug, e]),
);

function structureToSnapshotDays(
  structure: TrainingTemplateStructure,
): SnapshotDay[] {
  return structure.days.map((d) => ({
    dayIndex: d.dayIndex,
    label: d.label,
    muscleGroup: d.muscleGroup ?? null,
    sections: d.sections.map((s) => ({
      type: s.type,
      restNote: s.restNote ?? null,
      exercises: s.exercises.map((e, i) => {
        const cat = catalogBySlug[e.exerciseSlug];
        if (!cat) {
          throw new Error(`Missing catalog exercise: ${e.exerciseSlug}`);
        }
        return {
          id: `${d.dayIndex}-${s.type}-${i}`,
          name: cat.name,
          youtubeVideoId: cat.youtubeVideoId,
          reps: e.reps,
          sets: e.sets,
          supersetGroup: e.supersetGroup ?? null,
        };
      }),
    })),
  }));
}

type Pilot = {
  slug: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  programStart: string;
  programEnd: string;
  healthGoals: string[];
  healthIssues: string;
  allergies: string;
  medications: string;
  dietPreference: string;
  location: string;
  trainingWeek: number;
  stepGoal: number;
  trainingType: "training_gym" | "training_home";
  nutrition: {
    weekNumber: number;
    caloriesMin: number;
    caloriesMax: number;
    proteinMin: number;
    proteinMax: number;
    carbsMax: number;
    fatMin: number;
    fatMax: number;
  };
};

const pilots: Pilot[] = [
  {
    slug: "hetal",
    firstName: "Hetal",
    lastName: "Patel",
    displayName: "Hetal",
    email: "hetal@abstrack.local",
    phone: "+1 415 555 0142",
    programStart: "2026-07-01",
    programEnd: "2026-10-31",
    healthGoals: ["Reduce inflammation", "Osteoporosis support", "Iron intake"],
    healthIssues: "Osteoporosis (early stage), mild knee discomfort on long walks",
    allergies: "Lactose intolerant",
    medications: "Vitamin D, calcium supplement",
    dietPreference: "hybrid",
    location: "USA",
    trainingWeek: 21,
    stepGoal: 8000,
    trainingType: "training_home",
    nutrition: {
      weekNumber: 1,
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 60,
      proteinMax: 90,
      carbsMax: 150,
      fatMin: 40,
      fatMax: 45,
    },
  },
  {
    slug: "avinash",
    firstName: "Avinash",
    lastName: "Mehta",
    displayName: "Dr. Avinash",
    email: "avinash@abstrack.local",
    phone: "+91 98765 43210",
    programStart: "2026-07-01",
    programEnd: "2026-12-31",
    healthGoals: ["Fat loss", "Strength"],
    healthIssues: "Previous shoulder impingement (2024) - avoid overhead pressing without clearance",
    allergies: "None reported",
    medications: "None",
    dietPreference: "indian",
    location: "India",
    trainingWeek: 1,
    stepGoal: 10000,
    trainingType: "training_gym",
    nutrition: {
      weekNumber: 1,
      caloriesMin: 1600,
      caloriesMax: 1800,
      proteinMin: 120,
      proteinMax: 140,
      carbsMax: 180,
      fatMin: 50,
      fatMax: 60,
    },
  },
  {
    slug: "shruti",
    firstName: "Shruti",
    lastName: "Kapoor",
    displayName: "Shruti",
    email: "shruti@abstrack.local",
    phone: "+61 412 345 678",
    programStart: "2026-07-01",
    programEnd: "2026-12-31",
    healthGoals: ["Tone", "Consistency"],
    healthIssues: "None reported",
    allergies: "None",
    medications: "None",
    dietPreference: "vegetarian",
    location: "Australia",
    trainingWeek: 21,
    stepGoal: 10000,
    trainingType: "training_home",
    nutrition: {
      weekNumber: 21,
      caloriesMin: 1400,
      caloriesMax: 1500,
      proteinMin: 70,
      proteinMax: 90,
      carbsMax: 140,
      fatMin: 40,
      fatMax: 50,
    },
  },
];

function resolveDeep(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value === "string") {
    if (!value.includes("{{")) return value;
    return resolveTemplateString(value, vars);
  }
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, vars));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDeep(v, vars);
    }
    return out;
  }
  return value;
}

function blocksFor(slugs: string[], vars: Record<string, string>) {
  return contentBlockSeeds
    .filter((b) => slugs.includes(b.slug) && b.slug !== "health-parameters")
    .map((b) => ({
      id: b.slug,
      title: b.title.includes("{{")
        ? resolveTemplateString(b.title, vars)
        : b.title,
      category: b.category,
      bodyJson: resolveDeep(b.bodyJson, vars) as Record<string, unknown>,
    }));
}

function buildSnapshot(pilot: Pilot): PlanDeliverySnapshot {
  const structure =
    pilot.trainingType === "training_gym"
      ? GYM_W1_STRUCTURE
      : HOME_W21_STRUCTURE;
  const days = structureToSnapshotDays(structure);
  const weekLabel =
    pilot.trainingWeek === pilot.nutrition.weekNumber
      ? `Week ${pilot.trainingWeek}`
      : `Week ${Math.min(pilot.trainingWeek, pilot.nutrition.weekNumber)}-${Math.max(pilot.trainingWeek, pilot.nutrition.weekNumber)}`;

  const vars = buildMemberTemplateVars({
    firstName: pilot.firstName,
    lastName: pilot.lastName,
    displayName: pilot.displayName,
    email: pilot.email,
    programStartDate: pilot.programStart,
    programEndDate: pilot.programEnd,
    healthGoals: pilot.healthGoals,
    healthIssues: pilot.healthIssues,
    allergies: pilot.allergies,
    location: pilot.location,
  });

  const healthBlock = buildHealthConsiderationsBlock({
    firstName: pilot.firstName,
    displayName: pilot.displayName,
    healthIssues: pilot.healthIssues,
    allergies: pilot.allergies,
    medications: pilot.medications,
    healthGoals: pilot.healthGoals,
    dietPreference: pilot.dietPreference,
  });

  return {
    branding: {
      name: ABSTRACK_BRAND.name,
      tagline: ABSTRACK_BRAND.tagline,
      accentMode: "dual",
      primary: ABSTRACK_BRAND.colors.turquoise,
      accentWorkout: ABSTRACK_BRAND.colors.teal,
      accentDiet: ABSTRACK_BRAND.colors.green,
      accentPromo: ABSTRACK_BRAND.colors.turquoise,
    },
    member: {
      id: pilot.slug,
      firstName: pilot.firstName,
      lastName: pilot.lastName,
      displayName: pilot.displayName,
      email: pilot.email,
      phone: pilot.phone,
    },
    coach: {
      displayName: "Helna",
      email: "coach@abstrack.local",
    },
    weekLabel,
    deliveredAt: new Date().toISOString(),
    training: {
      id: `training-${pilot.slug}`,
      weekNumber: pilot.trainingWeek,
      stepGoal: pilot.stepGoal,
      blocks: blocksFor(trainingGuidelineSlugs, vars),
      days,
    },
    nutrition: {
      id: `nutrition-${pilot.slug}`,
      weekNumber: pilot.nutrition.weekNumber,
      caloriesMin: pilot.nutrition.caloriesMin,
      caloriesMax: pilot.nutrition.caloriesMax,
      proteinMin: pilot.nutrition.proteinMin,
      proteinMax: pilot.nutrition.proteinMax,
      carbsMax: pilot.nutrition.carbsMax,
      fatMin: pilot.nutrition.fatMin,
      fatMax: pilot.nutrition.fatMax,
      blocks: [...blocksFor(nutritionSlugs, vars), healthBlock],
    },
  };
}

async function writePdf(
  filename: string,
  snapshot: PlanDeliverySnapshot,
  token: string,
) {
  const base = BASE.replace(/\/$/, "");
  const urls = {
    baseUrl: base,
    viewerUrl: `${base}/p/${token}`,
    pdfUrl: `${base}/p/${token}/plan.pdf`,
  };
  const buffer = await renderPlanPackPdf(snapshot, urls, token);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const pilot of pilots) {
    await writePdf(
      `${pilot.slug}-week-plan.pdf`,
      buildSnapshot(pilot),
      `sample-${pilot.slug}`,
    );
  }
  await writePdf(
    "demo-member-hetal-week-plan.pdf",
    buildSnapshot({
      ...pilots[0],
      slug: "demo-hetal",
      displayName: "Demo Member (Hetal)",
    }),
    "sample-demo-hetal",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
