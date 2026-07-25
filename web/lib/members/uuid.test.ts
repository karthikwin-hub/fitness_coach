import { describe, expect, it } from "vitest";
import { isValidMemberId } from "@/lib/members/uuid";

describe("isValidMemberId", () => {
  it("accepts valid UUIDs", () => {
    expect(isValidMemberId("2fd069b2-d19b-46e1-85ce-e7083b6244c5")).toBe(true);
  });

  it("rejects undefined string", () => {
    expect(isValidMemberId("undefined")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidMemberId("")).toBe(false);
  });
});
