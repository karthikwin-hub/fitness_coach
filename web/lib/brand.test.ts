import { describe, expect, it } from "vitest";
import { brandingToCssVars, deriveSecondaryAccent } from "@/lib/brand";

describe("brandingToCssVars", () => {
  it("uses dual accents by default", () => {
    const vars = brandingToCssVars({
      accentMode: "dual",
      accentWorkout: "#16b1a9",
      accentDiet: "#8ac75b",
    });
    expect(vars["--brand-workout"]).toBe("#16b1a9");
    expect(vars["--brand-diet"]).toBe("#8ac75b");
  });

  it("derives secondary accent in single mode", () => {
    const vars = brandingToCssVars({
      accentMode: "single",
      primary: "#1d6468",
    });
    expect(vars["--brand-workout"]).toBe("#1d6468");
    expect(vars["--brand-diet"]).toBe(deriveSecondaryAccent("#1d6468"));
  });
});
