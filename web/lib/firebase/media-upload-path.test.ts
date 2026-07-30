import { describe, expect, it } from "vitest";
import {
  audioExtensionFromMime,
  buildCoachMediaStoragePath,
  isAllowedCoachMediaScope,
  resolveCoachMediaScope,
  videoExtensionFromMime,
} from "@/lib/firebase/media-upload-path";

describe("media-upload-path", () => {
  it("builds voice-notes path from member scope key", () => {
    const path = buildCoachMediaStoragePath("member-abc", "webm");
    expect(path).toMatch(/^voice-notes\/member-abc\/\d+\.webm$/);
  });

  it("builds broadcasts path when scope contains slash", () => {
    const path = buildCoachMediaStoragePath(
      "broadcasts/550e8400-e29b-41d4-a716-446655440000",
      "webm",
    );
    expect(path).toMatch(
      /^broadcasts\/550e8400-e29b-41d4-a716-446655440000\/\d+\.webm$/,
    );
  });

  it("validates allowed scopes", () => {
    expect(isAllowedCoachMediaScope("voice-notes/abc-123")).toBe(true);
    expect(isAllowedCoachMediaScope("broadcasts/550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
    expect(isAllowedCoachMediaScope("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isAllowedCoachMediaScope("member-abc")).toBe(true);
    expect(isAllowedCoachMediaScope("check-ins/x")).toBe(false);
    expect(isAllowedCoachMediaScope("")).toBe(false);
  });

  it("normalizes bare member id to voice-notes prefix", () => {
    expect(resolveCoachMediaScope("member-abc")).toBe("voice-notes/member-abc");
    expect(resolveCoachMediaScope("voice-notes/member-abc")).toBe("voice-notes/member-abc");
  });

  it("maps audio mime to extension", () => {
    expect(audioExtensionFromMime("audio/mpeg")).toBe("mp3");
    expect(audioExtensionFromMime("audio/webm")).toBe("webm");
  });

  it("maps video mime to extension", () => {
    expect(videoExtensionFromMime("video/mp4")).toBe("mp4");
    expect(videoExtensionFromMime("video/webm")).toBe("webm");
  });
});
