import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { members, planPublications, users } from "@/lib/db/schema";

const TARGET_SECONDS = 300;

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await db
    .select({
      id: planPublications.id,
      planType: planPublications.planType,
      memberId: planPublications.memberId,
      revisionNumber: planPublications.revisionNumber,
      assemblyDurationSeconds: planPublications.assemblyDurationSeconds,
      publishedAt: planPublications.publishedAt,
      memberName: users.displayName,
    })
    .from(planPublications)
    .innerJoin(members, eq(planPublications.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .where(eq(planPublications.tenantId, user.tenantId))
    .orderBy(desc(planPublications.publishedAt))
    .limit(20);

  const withTarget = logs.map((log) => ({
    ...log,
    underTarget:
      log.assemblyDurationSeconds != null &&
      log.assemblyDurationSeconds <= TARGET_SECONDS,
  }));

  const timed = withTarget.filter((l) => l.assemblyDurationSeconds != null);
  const avgSeconds =
    timed.length > 0
      ? Math.round(
          timed.reduce((s, l) => s + (l.assemblyDurationSeconds ?? 0), 0) /
            timed.length,
        )
      : null;

  return NextResponse.json({
    targetSeconds: TARGET_SECONDS,
    averageSeconds: avgSeconds,
    underTargetCount: timed.filter((l) => l.underTarget).length,
    totalTimed: timed.length,
    recent: withTarget,
  });
}
