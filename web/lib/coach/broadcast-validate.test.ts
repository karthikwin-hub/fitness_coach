import { describe, expect, it } from "vitest";
import {
  formatBroadcastActiveBadge,
  validateBroadcastPublishBody,
} from "@/lib/coach/broadcast-validate";

describe("broadcast-validate", () => {
  it("requires at least one content type when publishing", () => {
    expect(validateBroadcastPublishBody({ active: true, body: "" })).toMatch(
      /before publishing/i,
    );
    expect(validateBroadcastPublishBody({ active: true, body: "Hello" })).toBeNull();
    expect(
      validateBroadcastPublishBody({ active: true, audioUrl: "https://x.test/a.webm" }),
    ).toBeNull();
  });

  it("allows clear when inactive", () => {
    expect(validateBroadcastPublishBody({ active: false, body: "" })).toBeNull();
  });

  it("formats active badge with expiry", () => {
    expect(formatBroadcastActiveBadge(null)).toBe("Active");
    expect(formatBroadcastActiveBadge("2026-08-01T12:00:00.000Z")).toMatch(/Active · expires/);
  });
});
