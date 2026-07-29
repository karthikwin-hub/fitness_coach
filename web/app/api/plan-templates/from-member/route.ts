import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { saveMemberWeekAsTemplate } from "@/lib/plans/save-as-template";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (body.weekNumber == null && !body.trainingPlanId && !body.nutritionPlanId) {
    return NextResponse.json(
      { error: "weekNumber or trainingPlanId/nutritionPlanId required" },
      { status: 400 },
    );
  }

  try {
    const template = await saveMemberWeekAsTemplate(user.tenantId, {
      memberId: body.memberId,
      weekNumber: body.weekNumber,
      trainingPlanId: body.trainingPlanId,
      nutritionPlanId: body.nutritionPlanId,
      name: body.name.trim(),
      key: body.key,
      description: body.description,
      tags: body.tags,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 },
    );
  }
}
