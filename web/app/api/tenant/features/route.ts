import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthUser, requireCoach } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import {
  getTenantFeatures,
  type TenantFeatures,
} from "@/lib/tenant/features";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [tenant] = await db
    .select({ featuresJson: tenants.featuresJson })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  return NextResponse.json({
    features: getTenantFeatures(tenant ?? { featuresJson: {} }),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!requireCoach(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<TenantFeatures>;
  const [tenant] = await db
    .select({ featuresJson: tenants.featuresJson })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  const current = getTenantFeatures(tenant ?? { featuresJson: {} });
  const merged = {
    ...current,
    ...Object.fromEntries(
      Object.entries(body).filter(([, v]) => typeof v === "boolean"),
    ),
  };

  await db
    .update(tenants)
    .set({ featuresJson: merged })
    .where(eq(tenants.id, user.tenantId));

  return NextResponse.json({ features: merged });
}
