import { describe, expect, it } from "vitest";
import {
  isLocalDatabaseUrl,
  KEEP_MEMBER_EMAILS,
  normalizeMemberEmail,
  shouldKeepMemberEmail,
} from "@/lib/db/reset-production-members";

describe("reset-production-members helpers", () => {
  it("normalizes email case and whitespace", () => {
    expect(normalizeMemberEmail("  Hetal@Abstrack.local ")).toBe("hetal@abstrack.local");
  });

  it("keeps allowlisted production members", () => {
    for (const email of KEEP_MEMBER_EMAILS) {
      expect(shouldKeepMemberEmail(email)).toBe(true);
      expect(shouldKeepMemberEmail(email.toUpperCase())).toBe(true);
    }
  });

  it("does not keep members outside allowlist", () => {
    expect(shouldKeepMemberEmail("gautam@abstrack.com")).toBe(false);
    expect(shouldKeepMemberEmail("paused@abstrack.local")).toBe(false);
    expect(shouldKeepMemberEmail("member@abstrack.local")).toBe(false);
  });

  it("detects local database URLs", () => {
    expect(isLocalDatabaseUrl("postgresql://fitness:fitness@localhost:5435/fitness_coach")).toBe(
      true,
    );
    expect(isLocalDatabaseUrl("postgresql://fitness:fitness@127.0.0.1:5432/fitness_coach")).toBe(
      true,
    );
    expect(isLocalDatabaseUrl("postgresql://fitness:fitness@129.154.47.155:5432/fitness_coach")).toBe(
      false,
    );
  });
});
