import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { buildMemberJourney } from "@/lib/members/journey-queries";
import { getMemberByUserId } from "@/lib/members/queries";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getMemberByUserId(user.id, user.tenantId);
  if (!member) {
    return NextResponse.json(
      {
        error: "Member not found",
        message:
          "Your member profile isn't set up yet. Ask your coach to complete onboarding.",
      },
      { status: 404 },
    );
  }

  const windowParam = request.nextUrl.searchParams.get("windowIndex");
  const windowIndex =
    windowParam !== null ? Number.parseInt(windowParam, 10) : undefined;

  const journey = await buildMemberJourney(member.id, user.tenantId, {
    windowIndex: Number.isNaN(windowIndex) ? undefined : windowIndex,
    includeCoachNotes: false,
  });

  if (!journey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(journey);
}
