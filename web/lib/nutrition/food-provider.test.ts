import { describe, expect, it } from "vitest";
import { searchFoods } from "@/lib/nutrition/food-provider";

describe("searchFoods dev stub", () => {
  it("returns matching dev foods without API keys", async () => {
    const results = await searchFoods("chicken");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.foodName.toLowerCase()).toContain("chicken");
  });

  it("returns empty for blank query", async () => {
    expect(await searchFoods("")).toEqual([]);
    expect(await searchFoods("  ")).toEqual([]);
  });
});
