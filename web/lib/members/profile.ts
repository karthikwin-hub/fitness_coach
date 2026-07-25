import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { members, users } from "@/lib/db/schema";
import {
  formatMemberName,
  type MemberProfile,
  type MemberProfileUpdate,
} from "@/lib/members/types";
import { normalizeProgramPhases } from "@/lib/members/program-phases";

export type { MemberProfile, MemberProfileUpdate };
export { formatMemberName };

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function getMemberProfile(
  memberId: string,
  tenantId: string,
): Promise<MemberProfile | null> {
  const [row] = await db
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1);

  if (!row) return null;

  const { member, user } = row;
  return {
    id: member.id,
    status: member.status,
    email: user.email,
    displayName: user.displayName,
    firstName: member.firstName,
    lastName: member.lastName,
    phone: member.phone,
    addressLine1: member.addressLine1,
    addressLine2: member.addressLine2,
    city: member.city,
    stateRegion: member.stateRegion,
    postalCode: member.postalCode,
    country: member.country,
    location: member.location,
    dateOfBirth: member.dateOfBirth,
    bio: member.bio,
    occupation: member.occupation,
    healthGoals: toStringArray(member.healthGoalsJson),
    healthIssues: member.healthIssues,
    allergies: member.allergies,
    medications: member.medications,
    emergencyContactName: member.emergencyContactName,
    emergencyContactPhone: member.emergencyContactPhone,
    coachNotes: member.coachNotes,
    dietPreference: member.dietPreference,
    stepGoal: member.stepGoal,
    programStartDate: member.programStartDate,
    programEndDate: member.programEndDate,
    programPhases: normalizeProgramPhases(
      member.programPhasesJson,
      member.programStartDate,
      member.programEndDate,
    ),
    compliancePct: member.compliancePct,
    streakDays: member.streakDays,
    createdAt: member.createdAt.toISOString(),
  };
}

export async function updateMemberProfile(
  memberId: string,
  tenantId: string,
  body: MemberProfileUpdate,
): Promise<MemberProfile | null> {
  const [existing] = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1);

  if (!existing) return null;

  const memberUpdate: Record<string, unknown> = {};
  const assign = <K extends keyof MemberProfileUpdate>(key: K, column: string) => {
    if (body[key] !== undefined) memberUpdate[column] = body[key];
  };

  assign("status", "status");
  assign("firstName", "firstName");
  assign("lastName", "lastName");
  assign("phone", "phone");
  assign("addressLine1", "addressLine1");
  assign("addressLine2", "addressLine2");
  assign("city", "city");
  assign("stateRegion", "stateRegion");
  assign("postalCode", "postalCode");
  assign("country", "country");
  assign("location", "location");
  assign("dateOfBirth", "dateOfBirth");
  assign("bio", "bio");
  assign("occupation", "occupation");
  assign("healthIssues", "healthIssues");
  assign("allergies", "allergies");
  assign("medications", "medications");
  assign("emergencyContactName", "emergencyContactName");
  assign("emergencyContactPhone", "emergencyContactPhone");
  assign("coachNotes", "coachNotes");
  assign("dietPreference", "dietPreference");
  assign("stepGoal", "stepGoal");
  assign("programStartDate", "programStartDate");
  assign("programEndDate", "programEndDate");
  if (body.programPhases !== undefined) {
    memberUpdate.programPhasesJson = body.programPhases;
  }
  if (body.healthGoals !== undefined) {
    memberUpdate.healthGoalsJson = body.healthGoals;
  }

  if (Object.keys(memberUpdate).length > 0) {
    await db.update(members).set(memberUpdate).where(eq(members.id, memberId));
  }

  const displayName = [body.firstName, body.lastName]
    .filter((part) => part && part.trim())
    .join(" ")
    .trim();

  if (displayName) {
    await db
      .update(users)
      .set({ displayName })
      .where(eq(users.id, existing.user.id));
  }

  return getMemberProfile(memberId, tenantId);
}
