import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, users } from "@/lib/db/schema";
import {
  DEMO_COACH_EMAIL,
  DEMO_LOGIN_TOKEN,
  DEMO_MEMBER_EMAIL,
  DEMO_MEMBER_LOGIN_TOKEN,
  isServerDemoLoginEnabled,
  normalizeDemoEmail,
  parseDemoMemberToken,
} from "@/lib/auth/demo-login-shared";

const DEV_COACH_FIREBASE_UID = "dev-local-user";
const DEV_MEMBER_FIREBASE_UID = "dev-local-member";

type DemoUser = {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: "platform_admin" | "coach" | "member";
  tenantId: string;
  tenantSlug: string;
};

async function resolveByEmail(
  email: string,
  allowedRoles: Array<"coach" | "platform_admin" | "member">,
  fallbackUid?: string,
): Promise<DemoUser | null> {
  if (!isServerDemoLoginEnabled()) return null;

  const normalized = normalizeDemoEmail(email);
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
    .where(eq(users.email, normalized))
    .limit(1);

  if (!row && fallbackUid) {
    [row] = await db
      .select(select)
      .from(users)
      .innerJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.firebaseUid, fallbackUid))
      .limit(1);
  }

  if (!row) return null;
  if (!allowedRoles.includes(row.role)) return null;
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

export async function resolveDemoCoachUser(): Promise<DemoUser | null> {
  return resolveByEmail(DEMO_COACH_EMAIL, ["coach", "platform_admin"], DEV_COACH_FIREBASE_UID);
}

export async function resolveDemoMemberUser(): Promise<DemoUser | null> {
  return resolveByEmail(DEMO_MEMBER_EMAIL, ["member"], DEV_MEMBER_FIREBASE_UID);
}

export async function resolveDemoMemberByEmail(email: string): Promise<DemoUser | null> {
  return resolveByEmail(email, ["member"]);
}

export async function resolveDemoUserByFirebaseUid(
  firebaseUid: string,
): Promise<DemoUser | null> {
  if (!isServerDemoLoginEnabled()) return null;

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
    .where(eq(users.firebaseUid, firebaseUid))
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

export async function resolveDemoUserByEmail(email: string): Promise<DemoUser | null> {
  const normalized = normalizeDemoEmail(email);
  if (normalized === normalizeDemoEmail(DEMO_COACH_EMAIL)) {
    return resolveDemoCoachUser();
  }
  const member = await resolveDemoMemberByEmail(email);
  if (member) return member;
  if (normalized === "demo.member@abstrack.com") {
    return resolveByEmail("demo.member@abstrack.com", ["member"], DEV_MEMBER_FIREBASE_UID);
  }
  return null;
}

export async function resolveDemoUserByToken(token: string): Promise<DemoUser | null> {
  if (!isServerDemoLoginEnabled()) return null;
  if (token === DEMO_LOGIN_TOKEN) {
    return resolveDemoCoachUser();
  }
  if (token === DEMO_MEMBER_LOGIN_TOKEN) {
    return resolveDemoUserByFirebaseUid(DEV_MEMBER_FIREBASE_UID);
  }
  const uid = parseDemoMemberToken(token);
  if (uid) {
    return resolveDemoUserByFirebaseUid(uid);
  }
  return null;
}
