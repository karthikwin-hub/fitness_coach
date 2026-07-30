import { describe, expect, it } from "vitest";
import {
  contentBlockCategoryGroup,
  filterBlocksByCategoryGroup,
} from "@/lib/content-blocks/category-groups";

describe("content-block category groups", () => {
  const blocks = [
    { category: "nutrition_tips", title: "Tips" },
    { category: "workout_guidelines", title: "Guide" },
    { category: "welcome_letter", title: "Welcome" },
  ];

  it("groups categories", () => {
    expect(contentBlockCategoryGroup("nutrition_tips")).toBe("nutrition");
    expect(contentBlockCategoryGroup("workout_guidelines")).toBe("workout");
    expect(contentBlockCategoryGroup("welcome_letter")).toBe("nutrition");
  });

  it("filters by group", () => {
    expect(filterBlocksByCategoryGroup(blocks, "nutrition")).toHaveLength(2);
    expect(filterBlocksByCategoryGroup(blocks, "all")).toHaveLength(3);
  });
});
