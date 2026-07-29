import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { applyPlanBundleTemplate } from "@/lib/plans/apply-template";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  if (!body.memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const [targetMember] = await db
    .select()
    .from(members)
    .where(and(eq(members.id, body.memberId), eq(members.tenantId, user.tenantId)))
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    const result = await applyPlanBundleTemplate(
      user.tenantId,
      id,
      body.memberId,
      body.weekNumber ?? 1,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Apply failed" },
      { status: 400 },
    );
  }
}
