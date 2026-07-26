import { describe, expect, it } from "vitest";
import {
  buildHealthConsiderationsBlock,
  buildMemberTemplateVars,
  collectPlaceholders,
  resolveTemplateString,
  toPdfSafeText,
} from "@/lib/plans/template-vars";
import {
  GYM_W1_STRUCTURE,
  resolveTemplateDays,
} from "@/lib/plans/templates";
import { EXERCISE_CATALOG } from "@/lib/plans/exercise-catalog";

describe("resolveTemplateString", () => {
  it("substitutes known placeholders", () => {
    const out = resolveTemplateString(
      "Welcome {{client_name}}! Starts {{start_date}}.",
      { client_name: "Hetal", start_date: "2026-07-01" },
    );
    expect(out).toBe("Welcome Hetal! Starts 2026-07-01.");
  });

  it("throws on unresolved placeholders", () => {
    expect(() =>
      resolveTemplateString("Hi {{client_name}} and {{missing}}", {
        client_name: "A",
      }),
    ).toThrow(/Unresolved template placeholders: missing/);
  });

  it("collectPlaceholders finds unique keys", () => {
    expect(
      collectPlaceholders("{{a}} {{b}} {{a}}"),
    ).toEqual(["a", "b"]);
  });
});

describe("toPdfSafeText", () => {
  it("converts ≤ and en-dashes to ASCII", () => {
    expect(toPdfSafeText("≤150 — rest")).toBe("<=150 - rest");
  });
});

describe("buildMemberTemplateVars / health block", () => {
  it("builds client_name from first+last", () => {
    const vars = buildMemberTemplateVars({
      firstName: "Hetal",
      lastName: "Patel",
      displayName: null,
      email: "h@x.com",
      programStartDate: "2026-07-01",
      programEndDate: "2026-10-31",
      healthGoals: ["Iron intake"],
      healthIssues: null,
      allergies: null,
      location: "USA",
    });
    expect(vars.client_name).toBe("Hetal Patel");
    expect(vars.health_goals).toBe("Iron intake");
  });

  it("builds member-specific health title (not Hetal Focus)", () => {
    const block = buildHealthConsiderationsBlock({
      firstName: "Avinash",
      displayName: "Dr. Avinash",
      healthIssues: "Shoulder note",
      allergies: null,
      medications: null,
      healthGoals: ["Fat loss"],
      dietPreference: "indian",
    });
    expect(block.title).toContain("Avinash");
    expect(block.title).not.toMatch(/Hetal Focus/i);
    expect((block.bodyJson.items as string[]).some((i) => i.includes("Shoulder"))).toBe(
      true,
    );
  });
});

describe("resolveTemplateDays", () => {
  it("resolves gym template against full catalog", () => {
    const map = Object.fromEntries(
      EXERCISE_CATALOG.map((e) => [e.slug, `id-${e.slug}`]),
    );
    const days = resolveTemplateDays(GYM_W1_STRUCTURE, map);
    expect(days.length).toBeGreaterThan(3);
    expect(days[0].sections[0].exercises[0].exerciseId).toMatch(/^id-/);
  });

  it("throws when an exercise slug is missing", () => {
    expect(() => resolveTemplateDays(GYM_W1_STRUCTURE, {})).toThrow(
      /missing exercises/,
    );
  });
});
