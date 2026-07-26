import { describe, expect, it } from "vitest";
import {
  DEMO_COACH_EMAIL,
  DEMO_LOGIN_TOKEN,
  isDemoCoachEmail,
  isDemoLoginToken,
  normalizeDemoEmail,
} from "@/lib/auth/demo-login-shared";

describe("demo login helpers", () => {
  it("normalizes demo coach email", () => {
    expect(normalizeDemoEmail("  Helna@Abstrack.COM ")).toBe("helna@abstrack.com");
  });

  it("accepts the configured demo coach email", () => {
    expect(isDemoCoachEmail(DEMO_COACH_EMAIL)).toBe(true);
    expect(isDemoCoachEmail("coach@abstrack.local")).toBe(false);
  });

  it("recognizes the demo bearer token", () => {
    expect(isDemoLoginToken(DEMO_LOGIN_TOKEN)).toBe(true);
    expect(isDemoLoginToken("dev-local-token")).toBe(false);
  });
});
