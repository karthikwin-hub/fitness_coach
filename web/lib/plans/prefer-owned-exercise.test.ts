import { describe, expect, it } from "vitest";
import {
  buildExerciseMapBySlugWithOwnedPreference,
  classifyVideoSourceFromChannel,
  formatExerciseOptionLabel,
  preferOwnedExerciseId,
  sortCatalogForPicker,
} from "@/lib/plans/prefer-owned-exercise";

describe("prefer-owned-exercise", () => {
  const catalog = [
    { id: "a", name: "Squat", slug: "squat", videoSource: "third_party" as const },
    { id: "b", name: "Squat", slug: null, videoSource: "owned" as const },
    { id: "c", name: "Deadlift", slug: "deadlift", videoSource: "third_party" as const },
  ];

  it("prefers owned duplicate by normalized name", () => {
    expect(preferOwnedExerciseId(catalog, "a")).toBe("b");
    expect(preferOwnedExerciseId(catalog, "c")).toBe("c");
  });

  it("builds slug map with owned preference", () => {
    expect(buildExerciseMapBySlugWithOwnedPreference(catalog)).toEqual({
      squat: "b",
      deadlift: "c",
    });
  });

  it("sorts owned first and labels source in picker", () => {
    const sorted = sortCatalogForPicker(catalog);
    expect(sorted[0]?.videoSource).toBe("owned");
    expect(formatExerciseOptionLabel(catalog[0]!)).toBe("Squat (Third party)");
    expect(formatExerciseOptionLabel(catalog[1]!)).toBe("Squat (Coach)");
  });

  it("classifies video source from channel id substring", () => {
    expect(classifyVideoSourceFromChannel("UCabc123_video", "UCabc123")).toBe("owned");
    expect(classifyVideoSourceFromChannel("dQw4w9WgXcQ", "UCabc123")).toBe("third_party");
    expect(classifyVideoSourceFromChannel(null, "UCabc123")).toBe("third_party");
  });
});
