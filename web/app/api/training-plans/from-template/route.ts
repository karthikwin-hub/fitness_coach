import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  applyTrainingFromTemplateRow,
  getPlanTemplateByKeyOrId,
} from "@/lib/plans/apply-template";
import {
  GYM_W1_TEMPLATE,
  HOME_W21_TEMPLATE,
} from "@/lib/plans/templates";
import { installTenantPlanDefaults } from "@/lib/plans/install-defaults";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const templateKey = (body.template ?? body.key ?? body.templateId) as string;
  if (!templateKey) {
    return NextResponse.json({ error: "template key or id required" }, { status: 400 });
  }
  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  await installTenantPlanDefaults(user.tenantId);

  let template = await getPlanTemplateByKeyOrId(user.tenantId, templateKey);

  if (!template) {
    const fixture =
      templateKey === "training_gym"
        ? GYM_W1_TEMPLATE
        : templateKey === "training_home"
          ? HOME_W21_TEMPLATE
          : null;

    if (fixture) {
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
      template = inserted;
    }
  }

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (
    template.type !== "training_gym" &&
    template.type !== "training_home" &&
    template.type !== "plan_bundle"
  ) {
    return NextResponse.json(
      { error: "Template has no training structure" },
      { status: 400 },
    );
  }

  try {
    const plan = await applyTrainingFromTemplateRow(
      user.tenantId,
      template,
      body.memberId,
      body.weekNumber ?? 1,
    );

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Template apply failed" },
      { status: 400 },
    );
  }
}
