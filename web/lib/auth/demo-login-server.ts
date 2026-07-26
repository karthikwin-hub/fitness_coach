import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import {
  DEMO_COACH_EMAIL,
  isServerDemoLoginEnabled,
  normalizeDemoEmail,
} from "@/lib/auth/demo-login-shared";

const DEV_COACH_FIREBASE_UID = "dev-local-user";

export async function resolveDemoCoachUser(): Promise<{
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "platform_admin" | "coach" | "member";
  tenantId: string;
  tenantSlug: string;
} | null> {
  if (!isServerDemoLoginEnabled()) return null;

  const email = normalizeDemoEmail(DEMO_COACH_EMAIL);
  const select = {
    id: users.id,
    firebaseUid: users.firebaseUid,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    tenantId: users.tenantId,
    tenantSlug: tenants.slug,
    tenantStatus: tenants.status,
  };

  let [row] = await db
    .select(select)
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.email, email))
    .limit(1);

  if (!row) {
    [row] = await db
      .select(select)
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(
        and(eq(users.firebaseUid, DEV_COACH_FIREBASE_UID), eq(users.role, "coach")),
      )
      .limit(1);
  }

  if (!row) return null;
  if (row.role !== "coach" && row.role !== "platform_admin") return null;
  if (row.tenantStatus === "suspended" && row.role !== "platform_admin") {
    return null;
  }

  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    tenantId: row.tenantId,
    tenantSlug: row.tenantSlug,
  };
}
