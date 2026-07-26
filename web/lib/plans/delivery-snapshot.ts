import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, tenants, users } from "@/lib/db/schema";
import { mergeBranding, type TenantBranding } from "@/lib/brand";
import {
  getPublishedNutritionPlan,
  getPublishedTrainingPlan,
} from "@/lib/plans/queries";
import {
  buildHealthConsiderationsBlock,
  buildMemberTemplateVars,
  resolveTemplateString,
  type TemplateVars,
} from "@/lib/plans/template-vars";

export type SnapshotBlock = {
  id: string;
  title: string;
  category: string;
  bodyJson: Record<string, unknown>;
};

export type SnapshotExercise = {
  id: string;
  name: string;
  youtubeVideoId: string | null;
  reps: string | null;
  sets: number | null;
  supersetGroup: string | null;
};

export type SnapshotSection = {
  type: string;
  restNote: string | null;
  exercises: SnapshotExercise[];
};

export type SnapshotDay = {
  dayIndex: number;
  label: string;
  muscleGroup: string | null;
  sections: SnapshotSection[];
};

export type SnapshotTraining = {
  id: string;
  weekNumber: number;
  stepGoal: number | null;
  blocks: SnapshotBlock[];
  days: SnapshotDay[];
};

export type SnapshotNutrition = {
  id: string;
  weekNumber: number;
  caloriesMin: number | null;
  caloriesMax: number | null;
  proteinMin: number | null;
  proteinMax: number | null;
  carbsMax: number | null;
  fatMin: number | null;
  fatMax: number | null;
  blocks: SnapshotBlock[];
};

export type PlanDeliverySnapshot = {
  branding: Required<
    Pick<
      TenantBranding,
      | "name"
      | "tagline"
      | "accentMode"
      | "primary"
      | "accentWorkout"
      | "accentDiet"
      | "accentPromo"
    >
  >;
  member: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string;
    phone: string | null;
  };
  coach: {
    displayName: string | null;
    email: string | null;
  };
  weekLabel: string;
  deliveredAt: string;
  training: SnapshotTraining | null;
  nutrition: SnapshotNutrition | null;
};

function resolveDeepStrings(
  value: unknown,
  vars: TemplateVars,
): unknown {
  if (typeof value === "string") {
    if (!value.includes("{{")) return value;
    return resolveTemplateString(value, vars);
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveDeepStrings(v, vars));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDeepStrings(v, vars);
    }
    return out;
  }
  return value;
}

function mapBlocksResolved(
  blocks: Array<{
    id: string;
    title: string;
    category: string;
    bodyJson: unknown;
  }>,
  vars: TemplateVars,
): SnapshotBlock[] {
  return blocks
    .filter((b) => b.category !== "health_parameters")
    .map((b) => ({
      id: b.id,
      title: b.title.includes("{{")
        ? resolveTemplateString(b.title, vars)
        : b.title,
      category: b.category,
      bodyJson: resolveDeepStrings(b.bodyJson ?? {}, vars) as Record<
        string,
        unknown
      >,
    }));
}

function buildWeekLabel(
  training: { weekNumber: number } | null,
  nutrition: { weekNumber: number } | null,
): string {
  const weeks = new Set<number>();
  if (training) weeks.add(training.weekNumber);
  if (nutrition) weeks.add(nutrition.weekNumber);
  if (weeks.size === 0) return "Plan";
  if (weeks.size === 1) return `Week ${[...weeks][0]}`;
  return `Week ${Math.min(...weeks)}-${Math.max(...weeks)}`;
}

/** Build an immutable snapshot of currently published plans for delivery. */
export async function buildDeliverySnapshot(
  memberId: string,
  tenantId: string,
): Promise<PlanDeliverySnapshot> {
  const [memberRow] = await db
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(members.id, memberId))
    .limit(1);

  if (!memberRow || memberRow.member.tenantId !== tenantId) {
    throw new Error("Member not found");
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) throw new Error("Tenant not found");

  let coach: PlanDeliverySnapshot["coach"] = {
    displayName: null,
    email: null,
  };
  if (memberRow.member.coachId) {
    const [coachUser] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, memberRow.member.coachId))
      .limit(1);
    if (coachUser) {
      coach = {
        displayName: coachUser.displayName,
        email: coachUser.email,
      };
    }
  }

  const [training, nutrition] = await Promise.all([
    getPublishedTrainingPlan(memberId),
    getPublishedNutritionPlan(memberId),
  ]);

  if (!training && !nutrition) {
    throw new Error("No published plans to deliver");
  }

  const branding = mergeBranding(
    (tenant.brandingJson ?? {}) as TenantBranding,
  ) as PlanDeliverySnapshot["branding"];

  const healthGoals = Array.isArray(memberRow.member.healthGoalsJson)
    ? (memberRow.member.healthGoalsJson as string[])
    : [];

  const vars = buildMemberTemplateVars({
    firstName: memberRow.member.firstName,
    lastName: memberRow.member.lastName,
    displayName: memberRow.user.displayName,
    email: memberRow.user.email,
    programStartDate: memberRow.member.programStartDate,
    programEndDate: memberRow.member.programEndDate,
    healthGoals,
    healthIssues: memberRow.member.healthIssues,
    allergies: memberRow.member.allergies,
    location: memberRow.member.location,
  });

  const healthBlock = buildHealthConsiderationsBlock({
    firstName: memberRow.member.firstName,
    displayName: memberRow.user.displayName,
    healthIssues: memberRow.member.healthIssues,
    allergies: memberRow.member.allergies,
    medications: memberRow.member.medications,
    healthGoals,
    dietPreference: memberRow.member.dietPreference,
  });

  const weekLabel = buildWeekLabel(training, nutrition);

  let trainingBlocks: SnapshotBlock[] = training
    ? mapBlocksResolved(training.blocks, vars)
    : [];
  let nutritionBlocks: SnapshotBlock[] = nutrition
    ? mapBlocksResolved(nutrition.blocks, vars)
    : [];

  // Inject member-specific health considerations into nutrition pack
  if (nutrition) {
    nutritionBlocks = [...nutritionBlocks, healthBlock];
  }

  return {
    branding,
    member: {
      id: memberRow.member.id,
      firstName: memberRow.member.firstName,
      lastName: memberRow.member.lastName,
      displayName: memberRow.user.displayName,
      email: memberRow.user.email,
      phone: memberRow.member.phone,
    },
    coach,
    weekLabel,
    deliveredAt: new Date().toISOString(),
    training: training
      ? {
          id: training.id,
          weekNumber: training.weekNumber,
          stepGoal: training.stepGoal,
          blocks: trainingBlocks,
          days: training.days.map((day) => ({
            dayIndex: day.dayIndex,
            label: day.label,
            muscleGroup: day.muscleGroup,
            sections: day.sections.map((section) => ({
              type: section.type,
              restNote: section.restNote,
              exercises: section.exercises.map((ex) => ({
                id: ex.exercise.id,
                name: ex.exercise.name,
                youtubeVideoId: ex.exercise.youtubeVideoId,
                reps: ex.reps,
                sets: ex.sets,
                supersetGroup: ex.supersetGroup,
              })),
            })),
          })),
        }
      : null,
    nutrition: nutrition
      ? {
          id: nutrition.id,
          weekNumber: nutrition.weekNumber,
          caloriesMin: nutrition.caloriesMin,
          caloriesMax: nutrition.caloriesMax,
          proteinMin: nutrition.proteinMin,
          proteinMax: nutrition.proteinMax,
          carbsMax: nutrition.carbsMax,
          fatMin: nutrition.fatMin,
          fatMax: nutrition.fatMax,
          blocks: nutritionBlocks,
        }
      : null,
  };
}

export function memberDisplayName(snapshot: PlanDeliverySnapshot): string {
  const { firstName, lastName, displayName } = snapshot.member;
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || displayName || snapshot.member.email;
}
