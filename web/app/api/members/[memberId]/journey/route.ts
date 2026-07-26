import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { resolveCoachMemberAccess, healMemberCoachId } from "@/lib/members/coach-access";
import { buildMemberJourney } from "@/lib/members/journey-queries";
import { getMemberById } from "@/lib/members/queries";
import { isValidMemberId } from "@/lib/members/uuid";

type Params = { params: Promise<{ memberId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await params;
  if (!isValidMemberId(memberId)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const member = await getMemberById(memberId, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await resolveCoachMemberAccess(user, member);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason ?? "Forbidden" },
      { status: 403 },
    );
  }
  if (access.shouldHealCoachId) {
    await healMemberCoachId(member.id, user.tenantId, user.id);
  }

  const windowParam = request.nextUrl.searchParams.get("windowIndex");
  const windowIndex =
    windowParam !== null ? Number.parseInt(windowParam, 10) : undefined;

  const journey = await buildMemberJourney(memberId, user.tenantId, {
    windowIndex: Number.isNaN(windowIndex) ? undefined : windowIndex,
    includeCoachNotes: true,
  });

  if (!journey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(journey);
}
