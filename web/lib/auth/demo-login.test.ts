import { describe, expect, it } from "vitest";
import {
  DEMO_COACH_EMAIL,
  DEMO_LOGIN_TOKEN,
  DEMO_MEMBER_EMAIL,
  DEMO_MEMBER_LOGIN_TOKEN,
  isDemoCoachEmail,
  isDemoLoginToken,
  isDemoMemberEmail,
  mintDemoMemberToken,
  normalizeDemoEmail,
  parseDemoMemberToken,
} from "@/lib/auth/demo-login-shared";

describe("demo login helpers", () => {
  it("normalizes demo coach email", () => {
    expect(normalizeDemoEmail("  Helna@Abstrack.COM ")).toBe("helna@abstrack.com");
  });

  it("accepts the configured demo coach email", () => {
    expect(isDemoCoachEmail(DEMO_COACH_EMAIL)).toBe(true);
    expect(isDemoCoachEmail("coach@abstrack.local")).toBe(false);
  });

  it("accepts the configured demo member email", () => {
    expect(isDemoMemberEmail(DEMO_MEMBER_EMAIL)).toBe(true);
    expect(isDemoMemberEmail(DEMO_COACH_EMAIL)).toBe(false);
  });

  it("recognizes demo bearer tokens", () => {
    expect(isDemoLoginToken(DEMO_LOGIN_TOKEN)).toBe(true);
    expect(isDemoLoginToken(DEMO_MEMBER_LOGIN_TOKEN)).toBe(true);
    expect(isDemoLoginToken("demo-mbr-demo-sarah")).toBe(true);
    expect(isDemoLoginToken("dev-local-token")).toBe(false);
  });

  it("mints per-member demo tokens", () => {
    const token = mintDemoMemberToken("demo-sarah");
    expect(token).toBe("demo-mbr-demo-sarah");
    expect(parseDemoMemberToken(token)).toBe("demo-sarah");
  });
});
