import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { buildMembersProgressRoster } from "@/lib/members/journey-queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roster = await buildMembersProgressRoster(user.tenantId);
  return NextResponse.json({ members: roster });
}
