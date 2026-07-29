import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { createInvitedMember } from "@/lib/members/create-invited-member";
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

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    email?: string;
    importKey?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    status?: "invited" | "lead" | "active" | "paused";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  try {
    const { user: createdUser, member } = await createInvitedMember(
      user.tenantId,
      user.id,
      {
        email: body.email,
        importKey: body.importKey,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        status: body.status ?? "invited",
      },
    );

    return NextResponse.json(
      {
        id: member.id,
        importKey: member.importKey,
        status: member.status,
        email: createdUser.email,
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        displayName: formatMemberName({
          firstName: member.firstName,
          lastName: member.lastName,
          displayName: createdUser.displayName,
          email: createdUser.email,
        }),
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create member";
    const status = message.includes("already") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
