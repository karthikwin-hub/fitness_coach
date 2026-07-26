import { describe, expect, it } from "vitest";
import {
  DELIVERY_EXPIRY_DAYS,
  deliveryExpiresAt,
  hashDeliveryToken,
  isDeliveryExpired,
  isDeliveryRevoked,
  mintDeliveryToken,
} from "@/lib/plans/delivery-tokens";

describe("delivery tokens", () => {
  it("mints a base64url token of sufficient length", () => {
    const token = mintDeliveryToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("hashes deterministically and differently from raw token", () => {
    const token = mintDeliveryToken();
    const hash = hashDeliveryToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashDeliveryToken(token));
    expect(hash).not.toBe(token);
  });

  it("expires after DELIVERY_EXPIRY_DAYS", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const expires = deliveryExpiresAt(from);
    expect(expires.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(DELIVERY_EXPIRY_DAYS).toBe(120);
    expect(isDeliveryExpired(expires, new Date("2026-05-01T00:00:00.000Z"))).toBe(
      true,
    );
    expect(isDeliveryExpired(expires, new Date("2026-04-30T23:59:59.000Z"))).toBe(
      false,
    );
  });

  it("detects revoke", () => {
    expect(isDeliveryRevoked(null)).toBe(false);
    expect(isDeliveryRevoked(new Date())).toBe(true);
  });
});
