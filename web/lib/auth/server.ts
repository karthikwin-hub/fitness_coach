import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { isDevToken, DEV_TOKEN_TO_UID } from "@/lib/auth/dev-personas";
import { isServerDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";
import { db } from "@/lib/db";
import { users, tenants } from "@/lib/db/schema";

export type AuthUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "platform_admin" | "coach" | "member";
  tenantId: string;
  tenantSlug: string;
};

async function resolveDevUser(token: string): Promise<AuthUser | null> {
  if (!isServerDevAuthEnabled()) return null;

  const uid = DEV_TOKEN_TO_UID[token];
  if (!uid) return null;

  const [row] = await db
    .select({
      id: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      tenantId: users.tenantId,
      tenantSlug: tenants.slug,
      tenantStatus: tenants.status,
    })
    .from(users)
    .innerJoin(tenants, eq(users.tenantId, tenants.id))
    .where(eq(users.firebaseUid, uid))
    .limit(1);

  if (!row) return null;
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

async function verifyFirebaseToken(token: string): Promise<AuthUser | null> {
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const { getFirebaseAdminApp } = await import("@/lib/firebase/admin");
    const { provisionFirebaseUser } = await import("@/lib/auth/provision");
    const app = getFirebaseAdminApp();
    if (!app) {
      if (process.env.NODE_ENV === "production") {
        console.error("[auth] Firebase Admin is not configured in production");
      }
      return null;
    }

    const decoded = await getAuth(app).verifyIdToken(token);
    const [row] = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        tenantId: users.tenantId,
        tenantSlug: tenants.slug,
        tenantStatus: tenants.status,
      })
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    if (row) {
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

    return provisionFirebaseUser(decoded);
  } catch (err) {
    console.error("[auth] Firebase token verification failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (isServerDevAuthEnabled() && isDevToken(token)) {
    return resolveDevUser(token);
  }

  return verifyFirebaseToken(token);
}

export function isCoach(user: AuthUser): boolean {
  return user.role === "coach" || user.role === "platform_admin";
}

export function requireCoach(user: AuthUser | null): user is AuthUser {
  return user !== null && isCoach(user);
}

export function isPlatformAdmin(user: AuthUser): boolean {
  return user.role === "platform_admin";
}

export function requirePlatformAdmin(user: AuthUser | null): user is AuthUser {
  return user !== null && isPlatformAdmin(user);
}
