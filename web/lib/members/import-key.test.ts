import { describe, expect, it } from "vitest";
import { generateImportKey, isValidImportKey } from "@/lib/members/import-key";

describe("import key helpers", () => {
  it("generates numeric keys", () => {
    expect(generateImportKey()).toMatch(/^[0-9]{5}$/);
  });

  it("validates import key format", () => {
    expect(isValidImportKey("10001")).toBe(true);
    expect(isValidImportKey("DEMO-MEMBER-001")).toBe(true);
    expect(isValidImportKey("ab")).toBe(false);
    expect(isValidImportKey("")).toBe(false);
  });
});
