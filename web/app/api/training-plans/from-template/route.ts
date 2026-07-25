import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { createTrainingPlanFromInput } from "@/lib/plans/training";
import {
  GYM_W1_TEMPLATE,
  HOME_W21_TEMPLATE,
  resolveTemplateDays,
} from "@/lib/plans/templates";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const templateKey = body.template as "training_gym" | "training_home";
  const template =
    templateKey === "training_gym" ? GYM_W1_TEMPLATE : HOME_W21_TEMPLATE;

  const catalog = await db
    .select()
    .from(exercises)
    .where(eq(exercises.tenantId, user.tenantId));

  const exerciseMap: Record<string, string> = {};
  for (const ex of catalog) exerciseMap[ex.name] = ex.id;

  const days = resolveTemplateDays(template, exerciseMap);
  const plan = await createTrainingPlanFromInput(user.tenantId, body.memberId, {
    weekNumber: body.weekNumber ?? 1,
    stepGoal: template.stepGoal,
    templateType: template.type,
    days,
  });

  return NextResponse.json(plan, { status: 201 });
}
