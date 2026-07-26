import { describe, expect, it } from "vitest";
import { requirePlatformAdmin, requireCoach, type AuthUser } from "@/lib/auth/server";

function user(role: AuthUser["role"]): AuthUser {
  return {
    id: "1",
    firebaseUid: "u",
    email: "a@b.c",
    displayName: "T",
    role,
    tenantId: "t1",
    tenantSlug: "abstrack",
  };
}

describe("requirePlatformAdmin", () => {
  it("rejects null", () => {
    expect(requirePlatformAdmin(null)).toBe(false);
  });

  it("rejects coach", () => {
    expect(requirePlatformAdmin(user("coach"))).toBe(false);
  });

  it("accepts platform_admin", () => {
    expect(requirePlatformAdmin(user("platform_admin"))).toBe(true);
  });
});

describe("requireCoach vs platform admin", () => {
  it("treats platform_admin as coach for coach gates", () => {
    expect(requireCoach(user("platform_admin"))).toBe(true);
    expect(requireCoach(user("coach"))).toBe(true);
    expect(requireCoach(user("member"))).toBe(false);
  });
});
