import { describe, expect, it } from "vitest";
import { e164Digits, normalizeToE164 } from "@/lib/notify/phone";

describe("normalizeToE164", () => {
  it("normalizes seeded US phone", () => {
    expect(normalizeToE164("+1 415 555 0142")).toBe("+14155550142");
  });

  it("normalizes seeded India phone", () => {
    expect(normalizeToE164("+91 98765 43210")).toBe("+919876543210");
  });

  it("normalizes seeded Australia phone", () => {
    expect(normalizeToE164("+61 412 345 678")).toBe("+61412345678");
  });

  it("rejects numbers without country code", () => {
    expect(normalizeToE164("415 555 0142")).toBeNull();
    expect(normalizeToE164("9876543210")).toBeNull();
  });

  it("rejects empty or too-short values", () => {
    expect(normalizeToE164(null)).toBeNull();
    expect(normalizeToE164("")).toBeNull();
    expect(normalizeToE164("+123")).toBeNull();
  });
});

describe("e164Digits", () => {
  it("strips the plus for wa.me", () => {
    expect(e164Digits("+14155550142")).toBe("14155550142");
  });
});
