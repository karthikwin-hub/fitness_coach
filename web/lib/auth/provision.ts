import { and, eq } from "drizzle-orm";
import type { DecodedIdToken } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { members, tenants, users } from "@/lib/db/schema";
import { isInviteFirebaseUid } from "@/lib/auth/invite-uid";
import { getTenantFeatures } from "@/lib/tenant/features";
import type { AuthUser } from "./server";

function resolveRole(email: string | undefined): "coach" | "member" {
  const coachEmails = (process.env.COACH_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (email && coachEmails.includes(email.toLowerCase())) return "coach";
  return "member";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function provisionFirebaseUser(
  decoded: DecodedIdToken,
  options?: { tenantSlug?: string },
): Promise<AuthUser | null> {
  const tenantSlug =
    options?.tenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "abstrack";
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) return null;
  if (tenant.status === "suspended") return null;

  const email = normalizeEmail(decoded.email ?? `${decoded.uid}@firebase.local`);
  const features = getTenantFeatures(tenant);

  const [existingByUid] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, decoded.uid))
    .limit(1);

  if (existingByUid) {
    return {
      id: existingByUid.id,
      firebaseUid: existingByUid.firebaseUid,
      email: existingByUid.email,
      displayName: existingByUid.displayName,
      role: existingByUid.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
  }

  const [invitedUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.email, email)))
    .limit(1);

  if (invitedUser && isInviteFirebaseUid(invitedUser.firebaseUid)) {
    const [linked] = await db
      .update(users)
      .set({
        firebaseUid: decoded.uid,
        displayName: decoded.name ?? invitedUser.displayName,
      })
      .where(eq(users.id, invitedUser.id))
      .returning();

    await db
      .update(members)
      .set({ status: "active" })
      .where(
        and(
          eq(members.userId, invitedUser.id),
          eq(members.tenantId, tenant.id),
          eq(members.status, "invited"),
        ),
      );

    return {
      id: linked.id,
      firebaseUid: linked.firebaseUid,
      email: linked.email,
      displayName: linked.displayName,
      role: linked.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
  }

  if (invitedUser) {
    return {
      id: invitedUser.id,
      firebaseUid: invitedUser.firebaseUid,
      email: invitedUser.email,
      displayName: invitedUser.displayName,
      role: invitedUser.role,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
  }

  const role = resolveRole(decoded.email);
  if (role === "member" && !features.selfServiceSignup) {
    return null;
  }

  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      firebaseUid: decoded.uid,
      email,
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
