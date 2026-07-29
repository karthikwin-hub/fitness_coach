import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { planTemplates } from "./schema";
import {
  type NutritionTemplate,
  type PlanBundleStructure,
  serializePlanBundleStructure,
} from "../plans/template-bundle";
import {
  GYM_W1_STRUCTURE,
  HOME_W21_STRUCTURE,
  type TrainingTemplateStructure,
} from "../plans/templates";

const DEMO_TEMPLATES: Array<{
  key: string;
  name: string;
  description: string;
  tags: string[];
  training: TrainingTemplateStructure;
  nutrition: NutritionTemplate;
  trainingBlockSlugs: string[];
}> = [
  {
    key: "1001",
    name: "40's Athlete",
    description: "Gym performance block with higher protein for masters athletes.",
    tags: ["gym", "performance", "40s"],
    training: {
      ...GYM_W1_STRUCTURE,
      stepGoal: 10000,
      profile: { environment: "gym", level: "advanced" },
    },
    nutrition: {
      caloriesMin: 2200,
      caloriesMax: 2400,
      proteinMin: 140,
      proteinMax: 160,
      carbsMax: 220,
      fatMin: 55,
      fatMax: 65,
      blockSlugs: [
        "welcome-letter",
        "success-strategies",
        "week-macros-guide",
        "nutrition-tips-core",
        "grocery-list",
      ],
    },
    trainingBlockSlugs: ["workout-guidelines", "stretching-routine", "cardio-finisher"],
  },
  {
    key: "1002",
    name: "Busy Working Mom",
    description: "Time-efficient home training with quick-prep nutrition.",
    tags: ["home", "time-efficient"],
    training: {
      ...HOME_W21_STRUCTURE,
      stepGoal: 8000,
      profile: { environment: "home", level: "intermediate" },
    },
    nutrition: {
      caloriesMin: 1350,
      caloriesMax: 1450,
      proteinMin: 70,
      proteinMax: 90,
      carbsMax: 140,
      fatMin: 40,
      fatMax: 50,
      blockSlugs: [
        "welcome-letter",
        "success-strategies",
        "myfitnesspal",
        "sample-dishes",
        "nutrition-tips-core",
      ],
    },
    trainingBlockSlugs: ["workout-guidelines", "stretching-routine"],
  },
  {
    key: "1003",
    name: "Lose Weight",
    description: "Home deficit plan with cardio emphasis.",
    tags: ["fat-loss", "home"],
    training: {
      ...HOME_W21_STRUCTURE,
      stepGoal: 9000,
      profile: { environment: "home", level: "beginner" },
    },
    nutrition: {
      caloriesMin: 1250,
      caloriesMax: 1400,
      proteinMin: 80,
      proteinMax: 100,
      carbsMax: 120,
      fatMin: 35,
      fatMax: 45,
      blockSlugs: [
        "welcome-letter",
        "success-strategies",
        "week-macros-guide",
        "nutrition-tips-core",
      ],
    },
    trainingBlockSlugs: ["workout-guidelines", "cardio-finisher"],
  },
  {
    key: "1004",
    name: "Build Muscle",
    description: "Gym hypertrophy split with surplus protein.",
    tags: ["hypertrophy", "gym"],
    training: {
      ...GYM_W1_STRUCTURE,
      stepGoal: 8000,
      profile: { environment: "gym", level: "intermediate" },
    },
    nutrition: {
      caloriesMin: 2400,
      caloriesMax: 2600,
      proteinMin: 150,
      proteinMax: 170,
      carbsMax: 280,
      fatMin: 60,
      fatMax: 75,
      blockSlugs: [
        "welcome-letter",
        "success-strategies",
        "week-macros-guide",
        "sample-dishes",
        "grocery-list",
      ],
    },
    trainingBlockSlugs: ["workout-guidelines", "stretching-routine", "cardio-finisher"],
  },
];

export async function seedDemoPlanTemplates(tenantId: string): Promise<void> {
  for (const tpl of DEMO_TEMPLATES) {
    const structureJson = serializePlanBundleStructure({
      version: 1,
      training: tpl.training,
      nutrition: tpl.nutrition,
      trainingBlockSlugs: tpl.trainingBlockSlugs,
    } satisfies PlanBundleStructure);

    const existing = await db
      .select({ id: planTemplates.id })
      .from(planTemplates)
      .where(and(eq(planTemplates.tenantId, tenantId), eq(planTemplates.key, tpl.key)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(planTemplates)
        .set({
          name: tpl.name,
          description: tpl.description,
          tagsJson: tpl.tags,
          structureJson,
        })
        .where(eq(planTemplates.id, existing[0].id));
    } else {
      await db.insert(planTemplates).values({
        tenantId,
        type: "plan_bundle",
        key: tpl.key,
        name: tpl.name,
        description: tpl.description,
        tagsJson: tpl.tags,
        structureJson,
      });
    }
  }
  console.log(`Demo plan templates seeded (${DEMO_TEMPLATES.length} bundles).`);
}
