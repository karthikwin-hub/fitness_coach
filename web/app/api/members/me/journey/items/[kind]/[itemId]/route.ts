import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import {
  buildJourneyItemDetail,
  isJourneyItemKind,
} from "@/lib/members/journey-item-detail";
import { getMemberByUserId } from "@/lib/members/queries";

type Params = { params: Promise<{ kind: string; itemId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const { kind, itemId } = await params;
  if (!isJourneyItemKind(kind)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const detail = await buildJourneyItemDetail(kind, itemId, member.id, user.tenantId);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
