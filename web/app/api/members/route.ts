import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getMemberAlertFlags } from "@/lib/coach/check-in-enrichment";
import { getMembersWithUsers } from "@/lib/plans/queries";
import { formatMemberName } from "@/lib/members/types";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rows, trendsByMember] = await Promise.all([
    getMembersWithUsers(user!.tenantId),
    getMemberAlertFlags(user!.tenantId),
  ]);

  return NextResponse.json(
    rows.map((r) => ({
      ...r.member,
      displayName: formatMemberName({
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        displayName: r.user.displayName,
        email: r.user.email,
      }),
      email: r.user.email,
      trendAlerts: trendsByMember[r.member.id]?.alerts ?? [],
    })),
  );
}
