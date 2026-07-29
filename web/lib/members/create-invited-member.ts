import { and, eq } from "drizzle-orm";
import { mintInviteFirebaseUid } from "@/lib/auth/invite-uid";
import { db } from "@/lib/db";
import { members, users } from "@/lib/db/schema";
import {
  generateImportKey,
  isValidImportKey,
  normalizeImportKey,
} from "@/lib/members/import-key";

export type CreateInvitedMemberInput = {
  email: string;
  importKey?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  status?: "invited" | "lead" | "active" | "paused";
  coachId?: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createInvitedMember(
  tenantId: string,
  coachUserId: string,
  input: CreateInvitedMemberInput,
) {
  const email = normalizeEmail(input.email);
  if (!email.includes("@")) {
    throw new Error("Valid email required");
  }

  let importKey = input.importKey
    ? normalizeImportKey(input.importKey)
    : generateImportKey();
  if (input.importKey && !isValidImportKey(importKey)) {
    throw new Error("Invalid import key format");
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
    .limit(1);
  if (existingEmail) {
    throw new Error("A user with this email already exists");
  }

  if (input.importKey) {
    const [existingKey] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), eq(members.importKey, importKey)))
      .limit(1);
    if (existingKey) {
      throw new Error("Import key already in use");
    }
  } else {
    for (let attempt = 0; attempt < 5; attempt++) {
      const [existingKey] = await db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.tenantId, tenantId), eq(members.importKey, importKey)))
        .limit(1);
      if (!existingKey) break;
      importKey = generateImportKey();
    }
  }

  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || null;

  const [user] = await db
    .insert(users)
    .values({
      tenantId,
      firebaseUid: mintInviteFirebaseUid(),
      email,
      displayName,
      role: "member",
    })
    .returning();

  const [member] = await db
    .insert(members)
    .values({
      tenantId,
      userId: user.id,
      coachId: input.coachId ?? coachUserId,
      status: input.status ?? "invited",
      importKey,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
    })
    .returning();

  return { user, member };
}
