import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { healMemberCoachId, resolveCoachMemberAccess } from "@/lib/members/coach-access";
import { getMemberById } from "@/lib/members/queries";
import {
  buildJourneyItemDetail,
  isJourneyItemKind,
} from "@/lib/members/journey-item-detail";
import { isValidMemberId } from "@/lib/members/uuid";

type Params = { params: Promise<{ memberId: string; kind: string; itemId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId, kind, itemId } = await params;
  if (!isValidMemberId(memberId) || !isJourneyItemKind(kind)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  const detail = await buildJourneyItemDetail(kind, itemId, memberId, user.tenantId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
