import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";
import { parsePlanBundleStructure } from "@/lib/plans/template-bundle";
import { TRAINING_TEMPLATES } from "@/lib/plans/templates";
import { installTenantPlanDefaults } from "@/lib/plans/install-defaults";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json(
      TRAINING_TEMPLATES.map((t) => ({
        key: t.key,
        name: t.name,
        stepGoal: t.structure.stepGoal,
        environment: t.structure.profile.environment,
      })),
    );
  }

  await installTenantPlanDefaults(user.tenantId);

  const rows = await db
    .select({
      id: planTemplates.id,
      key: planTemplates.key,
      type: planTemplates.type,
      name: planTemplates.name,
      description: planTemplates.description,
      tagsJson: planTemplates.tagsJson,
      sourceMemberId: planTemplates.sourceMemberId,
      structureJson: planTemplates.structureJson,
      createdAt: planTemplates.createdAt,
      updatedAt: planTemplates.updatedAt,
    })
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, user.tenantId));

  return NextResponse.json(
    rows.map((r) => {
      let stepGoal: number | null = null;
      let environment: string | null = null;
      let hasTraining = false;
      let hasNutrition = false;

      if (r.type === "plan_bundle") {
        try {
          const bundle = parsePlanBundleStructure(r.structureJson);
          hasTraining = Boolean(bundle.training);
          hasNutrition = Boolean(bundle.nutrition);
          stepGoal = bundle.training?.stepGoal ?? null;
          environment = bundle.training?.profile.environment ?? null;
        } catch {
          /* ignore malformed */
        }
      } else if (
        r.type === "training_gym" ||
        r.type === "training_home"
      ) {
        hasTraining = true;
        const structure = r.structureJson as {
          stepGoal?: number;
          profile?: { environment?: string };
        };
        stepGoal = structure.stepGoal ?? null;
        environment = structure.profile?.environment ?? null;
      } else if (r.type === "nutrition_program") {
        hasNutrition = true;
      }

      return {
        id: r.id,
        key: r.key ?? r.type,
        type: r.type,
        name: r.name,
        description: r.description,
        tags: (r.tagsJson as string[]) ?? [],
        sourceMemberId: r.sourceMemberId,
        stepGoal,
        environment,
        hasTraining,
        hasNutrition,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!body.key?.trim()) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  if (!body.structureJson) {
    return NextResponse.json({ error: "structureJson required" }, { status: 400 });
  }

  const type = body.type ?? "plan_bundle";
  let structureJson = body.structureJson;
  if (type === "plan_bundle") {
    try {
      structureJson = parsePlanBundleStructure(body.structureJson);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error ? err.message : "Invalid plan bundle structure",
        },
        { status: 400 },
      );
    }
  }

  try {
    const [template] = await db
      .insert(planTemplates)
      .values({
        tenantId: user.tenantId,
        type,
        key: body.key.trim(),
        name: body.name.trim(),
        description: body.description ?? null,
        tagsJson: body.tags ?? [],
        sourceMemberId: body.sourceMemberId ?? null,
        structureJson,
      })
      .returning();

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ error: "Template key already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
