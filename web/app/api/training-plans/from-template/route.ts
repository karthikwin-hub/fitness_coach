import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exercises, planTemplates } from "@/lib/db/schema";
import { createTrainingPlanFromInput } from "@/lib/plans/training";
import {
  GYM_W1_TEMPLATE,
  HOME_W21_TEMPLATE,
  parseTrainingTemplateStructure,
  resolveTemplateDays,
} from "@/lib/plans/templates";
import { installTenantPlanDefaults } from "@/lib/plans/install-defaults";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const templateKey = (body.template ?? body.key) as string;
  if (
    templateKey !== "training_gym" &&
    templateKey !== "training_home"
  ) {
    return NextResponse.json(
      { error: "template must be training_gym or training_home" },
      { status: 400 },
    );
  }
  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  // Ensure defaults exist (idempotent) so older tenants get upgraded templates
  await installTenantPlanDefaults(user.tenantId);

  let [tplRow] = await db
    .select()
    .from(planTemplates)
    .where(
      and(
        eq(planTemplates.tenantId, user.tenantId),
        eq(planTemplates.key, templateKey),
      ),
    )
    .limit(1);

  // Fallback to code fixtures if DB row somehow missing
  if (!tplRow) {
    const fixture =
      templateKey === "training_gym" ? GYM_W1_TEMPLATE : HOME_W21_TEMPLATE;
    const [inserted] = await db
      .insert(planTemplates)
      .values({
        tenantId: user.tenantId,
        type: fixture.type,
        key: fixture.key,
        name: fixture.name,
        structureJson: fixture.structure,
      })
      .returning();
    tplRow = inserted;
  }

  let structure;
  try {
    structure = parseTrainingTemplateStructure(tplRow.structureJson);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Invalid template structure: ${err.message}`
            : "Invalid template structure",
      },
      { status: 500 },
    );
  }

  const catalog = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, user.tenantId));

  const exerciseMapBySlug: Record<string, string> = {};
  for (const ex of catalog) {
    if (ex.slug) exerciseMapBySlug[ex.slug] = ex.id;
  }

  let days;
  try {
    days = resolveTemplateDays(structure, exerciseMapBySlug);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Template resolve failed" },
      { status: 400 },
    );
  }

  const plan = await createTrainingPlanFromInput(user.tenantId, body.memberId, {
    weekNumber: body.weekNumber ?? 1,
    stepGoal: structure.stepGoal,
    templateType: templateKey,
    days,
  });

  return NextResponse.json(plan, { status: 201 });
}
