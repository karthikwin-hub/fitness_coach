import { describe, expect, it } from "vitest";
import {
  computeBroadcastExpiresAt,
  isBroadcastVisible,
} from "@/lib/coach/broadcast-expiry";

describe("broadcast-expiry", () => {
  const base = new Date("2026-07-29T12:00:00.000Z");

  it("computes 24h and 48h presets", () => {
    expect(computeBroadcastExpiresAt("24h", null, base)?.toISOString()).toBe(
      "2026-07-30T12:00:00.000Z",
    );
    expect(computeBroadcastExpiresAt("48h", null, base)?.toISOString()).toBe(
      "2026-07-31T12:00:00.000Z",
    );
  });

  it("uses custom ISO when preset is custom", () => {
    expect(
      computeBroadcastExpiresAt("custom", "2026-08-01T09:00:00.000Z", base)?.toISOString(),
    ).toBe("2026-08-01T09:00:00.000Z");
  });

  it("visibility respects active flag and expiry", () => {
    expect(isBroadcastVisible(false, null, base)).toBe(false);
    expect(isBroadcastVisible(true, null, base)).toBe(true);
    expect(
      isBroadcastVisible(true, new Date("2026-07-30T12:00:00.000Z"), base),
    ).toBe(true);
    expect(
      isBroadcastVisible(true, new Date("2026-07-28T12:00:00.000Z"), base),
    ).toBe(false);
  });
});
