import { describe, expect, it } from "vitest";
import { checkInCreateSchema } from "@/lib/check-ins/schemas";

describe("checkInCreateSchema", () => {
  it("accepts valid check-in payload", () => {
    const parsed = checkInCreateSchema.safeParse({
      weightKg: 72,
      sleepHours: 7,
      energy: 8,
      soreness: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects out-of-range energy", () => {
    const parsed = checkInCreateSchema.safeParse({ energy: 99 });
    expect(parsed.success).toBe(false);
  });

  it("rejects honeypot field when populated", () => {
    const parsed = checkInCreateSchema.safeParse({ _hp: "bot" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?._hp).toBe("bot");
  });
});
