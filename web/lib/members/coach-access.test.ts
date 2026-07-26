import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth/server";

const coachUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: "coach-1",
  firebaseUid: "dev-local-user",
  email: "coach@abstrack.local",
  displayName: "Coach",
  role: "coach",
  tenantId: "tenant-1",
  tenantSlug: "abstrack",
  ...overrides,
});

const memberRow = (overrides: Record<string, unknown> = {}) => ({
  id: "member-1",
  tenantId: "tenant-1",
  userId: "user-1",
  coachId: "coach-1" as string | null,
  status: "active" as const,
  location: null,
  compliancePct: 80,
  streakDays: 3,
  programStartDate: "2026-01-01",
  programEndDate: "2026-12-31",
  dietPreference: null,
  healthGoalsJson: [],
  stepGoal: null,
  firstName: "Test",
  lastName: "Member",
  phone: null,
  addressLine1: null,
  city: null,
  stateRegion: null,
  postalCode: null,
  country: null,
  dateOfBirth: null,
  occupation: null,
  bio: null,
  healthIssues: null,
  allergies: null,
  medications: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  coachNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("resolveCoachMemberAccess", () => {
  it("allows coach when member coachId matches", async () => {
    const { resolveCoachMemberAccess } = await import("@/lib/members/coach-access");
    const result = await resolveCoachMemberAccess(
      coachUser(),
      memberRow({ coachId: "coach-1" }) as never,
    );
    expect(result.allowed).toBe(true);
    expect(result.shouldHealCoachId).toBe(false);
  });

  it("allows platform admin for any tenant member", async () => {
    const { resolveCoachMemberAccess } = await import("@/lib/members/coach-access");
    const result = await resolveCoachMemberAccess(
      coachUser({ role: "platform_admin", id: "admin-1" }),
      memberRow({ coachId: "other-coach" }) as never,
    );
    expect(result.allowed).toBe(true);
  });

  it("rejects member role", async () => {
    const { resolveCoachMemberAccess } = await import("@/lib/members/coach-access");
    const result = await resolveCoachMemberAccess(
      coachUser({ role: "member" }),
      memberRow() as never,
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects cross-tenant access", async () => {
    const { resolveCoachMemberAccess } = await import("@/lib/members/coach-access");
    const result = await resolveCoachMemberAccess(
      coachUser({ tenantId: "tenant-2" }),
      memberRow() as never,
    );
    expect(result.allowed).toBe(false);
  });
});
