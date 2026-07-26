import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { createAvailabilityRule } from "@/lib/appointments/queries";
import { syncRuleToGoogle } from "@/lib/appointments/google-calendar";

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const weekday = Number(body?.weekday);
  const startsOn = typeof body?.startsOn === "string" ? body.startsOn : "";
  const endsOn =
    typeof body?.endsOn === "string" && body.endsOn ? body.endsOn : null;
  if (
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) ||
    (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn))
  ) {
    return NextResponse.json({ error: "Invalid recurring block" }, { status: 400 });
  }
  const rule = await createAvailabilityRule({
    tenantId: user.tenantId,
    coachId: user.id,
    weekday,
    startsOn,
    endsOn,
    reason:
      typeof body.reason === "string" ? body.reason.trim() || null : null,
  });
  try {
    await syncRuleToGoogle(rule);
  } catch (error) {
    console.error("[availability] recurring Google sync failed", error);
  }
  return NextResponse.json(rule, { status: 201 });
}
