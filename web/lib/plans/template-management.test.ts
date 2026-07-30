import { describe, expect, it } from "vitest";
import {
  canDeleteTemplate,
  filterActiveTemplates,
  isBuiltInTemplateType,
  listNutritionTemplates,
} from "@/lib/plans/template-management";

describe("template-management", () => {
  it("identifies built-in types", () => {
    expect(isBuiltInTemplateType("training_gym")).toBe(true);
    expect(isBuiltInTemplateType("plan_bundle")).toBe(false);
  });

  it("allows delete only for plan bundles", () => {
    expect(canDeleteTemplate("plan_bundle")).toBe(true);
    expect(canDeleteTemplate("training_gym")).toBe(false);
  });

  it("filters archived templates", () => {
    const rows = [
      { id: "1", type: "plan_bundle", archivedAt: null },
      { id: "2", type: "plan_bundle", archivedAt: "2026-01-01" },
    ];
    expect(filterActiveTemplates(rows)).toHaveLength(1);
    expect(filterActiveTemplates(rows)[0].id).toBe("1");
  });

  it("lists nutrition templates", () => {
    const rows = [
      { id: "1", type: "nutrition_program" },
      { id: "2", type: "plan_bundle", hasNutrition: true },
      { id: "3", type: "training_gym" },
    ];
    expect(listNutritionTemplates(rows).map((r) => r.id)).toEqual(["1", "2"]);
  });
});
