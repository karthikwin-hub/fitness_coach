import { and, eq } from "drizzle-orm";
import type { DecodedIdToken } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { members, tenants, users } from "@/lib/db/schema";
import type { AuthUser } from "./server";

function resolveRole(email: string | undefined): "coach" | "member" {
  const coachEmails = (process.env.COACH_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && coachEmails.includes(email.toLowerCase())) return "coach";
  return "member";
}

export async function provisionFirebaseUser(
  decoded: DecodedIdToken,
): Promise<AuthUser | null> {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "abstrack";
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) return null;

  const role = resolveRole(decoded.email);
  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      firebaseUid: decoded.uid,
      email: decoded.email ?? `${decoded.uid}@firebase.local`,
      displayName: decoded.name ?? null,
      role,
    })
    .returning();

  if (role === "member") {
    const coachRows = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenant.id), eq(users.role, "coach")))
      .limit(1);

    await db.insert(members).values({
      tenantId: tenant.id,
      userId: user.id,
      coachId: coachRows[0]?.id,
      status: "active",
    });
  }

  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  };
}
