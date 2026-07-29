import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  applyNutritionFromTemplateRow,
  getPlanTemplateByKeyOrId,
} from "@/lib/plans/apply-template";
import { installTenantPlanDefaults } from "@/lib/plans/install-defaults";

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

  const template = await getPlanTemplateByKeyOrId(user.tenantId, templateKey);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (template.type !== "nutrition_program" && template.type !== "plan_bundle") {
    return NextResponse.json(
      { error: "Template has no nutrition structure" },
      { status: 400 },
    );
  }

  try {
    const plan = await applyNutritionFromTemplateRow(
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
