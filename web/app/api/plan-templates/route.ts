import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planTemplates } from "@/lib/db/schema";
import { TRAINING_TEMPLATES } from "@/lib/plans/templates";
import { installTenantPlanDefaults } from "@/lib/plans/install-defaults";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    // Public list of fixture metadata for unauthenticated list UIs
    return NextResponse.json(
      TRAINING_TEMPLATES.map((t) => ({
        key: t.key,
        name: t.name,
        stepGoal: t.structure.stepGoal,
        environment: t.structure.profile.environment,
      })),
    );
  }

  await installTenantPlanDefaults(user.tenantId);

  const rows = await db
    .select({
      id: planTemplates.id,
      key: planTemplates.key,
      type: planTemplates.type,
      name: planTemplates.name,
      structureJson: planTemplates.structureJson,
    })
    .from(planTemplates)
    .where(eq(planTemplates.tenantId, user.tenantId));

  return NextResponse.json(
    rows.map((r) => {
      const structure = r.structureJson as {
        stepGoal?: number;
        profile?: { environment?: string };
      };
      return {
        id: r.id,
        key: r.key ?? r.type,
        name: r.name,
        stepGoal: structure.stepGoal ?? null,
        environment: structure.profile?.environment ?? null,
      };
    }),
  );
}
