import { describe, expect, it } from "vitest";
import { parseTenantFeatures } from "@/lib/tenant/features";

describe("parseTenantFeatures", () => {
  it("returns defaults for empty input", () => {
    expect(parseTenantFeatures(null)).toEqual({
      selfServiceSignup: true,
      quizEnabled: true,
      publicLoginEnabled: true,
      ownedYoutubeChannelId: null,
    });
  });

  it("parses explicit flags", () => {
    expect(
      parseTenantFeatures({
        selfServiceSignup: false,
        quizEnabled: false,
        publicLoginEnabled: true,
        ownedYoutubeChannelId: "UCcoach123",
      }),
    ).toEqual({
      selfServiceSignup: false,
      quizEnabled: false,
      publicLoginEnabled: true,
      ownedYoutubeChannelId: "UCcoach123",
    });
  });
});
