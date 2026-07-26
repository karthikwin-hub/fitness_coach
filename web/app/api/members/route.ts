import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { getMembersWithUsers } from "@/lib/plans/queries";
import { formatMemberName } from "@/lib/members/types";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await getMembersWithUsers(user.tenantId);

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
    })),
  );
}
