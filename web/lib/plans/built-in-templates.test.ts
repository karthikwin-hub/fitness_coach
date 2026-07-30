import { describe, expect, it } from "vitest";
import { NUTRITION_PROGRAM_TEMPLATE } from "@/lib/plans/built-in-templates";
import { GYM_W1_TEMPLATE, HOME_W21_TEMPLATE } from "@/lib/plans/templates";

describe("built-in templates", () => {
  it("uses tenant-neutral training names", () => {
    expect(GYM_W1_TEMPLATE.name).not.toMatch(/Avinash|Shruti/i);
    expect(HOME_W21_TEMPLATE.name).not.toMatch(/Avinash|Shruti/i);
    expect(GYM_W1_TEMPLATE.name).toContain("Gym");
    expect(HOME_W21_TEMPLATE.name).toContain("Home");
  });

  it("defines nutrition program with block slugs", () => {
    expect(NUTRITION_PROGRAM_TEMPLATE.key).toBe("nutrition_program");
    expect(NUTRITION_PROGRAM_TEMPLATE.structure.blockSlugs.length).toBeGreaterThan(0);
    expect(NUTRITION_PROGRAM_TEMPLATE.structure.proteinMin).toBeGreaterThan(0);
  });
});
