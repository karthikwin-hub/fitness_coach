import { describe, expect, it } from "vitest";
import { parseYoutubeVideoId } from "@/lib/youtube/parse-video-id";

describe("parseYoutubeVideoId", () => {
  it("accepts bare video id", () => {
    expect(parseYoutubeVideoId("CAwf7n6Luuc")).toBe("CAwf7n6Luuc");
  });

  it("parses watch URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/watch?v=CAwf7n6Luuc")).toBe(
      "CAwf7n6Luuc",
    );
  });

  it("parses youtu.be URL", () => {
    expect(parseYoutubeVideoId("https://youtu.be/CAwf7n6Luuc")).toBe("CAwf7n6Luuc");
  });

  it("parses shorts URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/shorts/CAwf7n6Luuc")).toBe(
      "CAwf7n6Luuc",
    );
  });

  it("rejects playlist URL", () => {
    expect(parseYoutubeVideoId("https://www.youtube.com/playlist?list=abc")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseYoutubeVideoId("")).toBeNull();
  });
});
