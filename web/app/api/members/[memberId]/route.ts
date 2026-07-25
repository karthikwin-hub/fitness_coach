import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import {
  getMemberProfile,
  updateMemberProfile,
  type MemberProfileUpdate,
} from "@/lib/members/profile";
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

  const profile = await getMemberProfile(memberId, user!.tenantId);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { memberId } = await params;
  if (!isValidMemberId(memberId)) {
    return NextResponse.json({ error: "Invalid member id" }, { status: 400 });
  }

  const body = (await request.json()) as MemberProfileUpdate;
  const profile = await updateMemberProfile(memberId, user!.tenantId, body);

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
