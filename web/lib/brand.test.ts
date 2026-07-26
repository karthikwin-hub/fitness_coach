import { describe, expect, it } from "vitest";
import {
  brandingToCssVars,
  deriveSecondaryAccent,
  mergeBranding,
  PLATFORM_DEFAULT_BRANDING,
} from "@/lib/brand";

describe("mergeBranding", () => {
  it("returns platform defaults for empty partial", () => {
    const merged = mergeBranding({});
    expect(merged.name).toBe(PLATFORM_DEFAULT_BRANDING.name);
    expect(merged.primary).toBe(PLATFORM_DEFAULT_BRANDING.primary);
    expect(merged.accentDiet).toBe(PLATFORM_DEFAULT_BRANDING.accentDiet);
  });

  it("overrides only provided fields", () => {
    const merged = mergeBranding({ primary: "#ff0000" });
    expect(merged.primary).toBe("#ff0000");
    expect(merged.name).toBe(PLATFORM_DEFAULT_BRANDING.name);
    expect(merged.accentWorkout).toBe(PLATFORM_DEFAULT_BRANDING.accentWorkout);
  });

  it("applies Helna-style partial overrides", () => {
    const merged = mergeBranding({
      name: "ABS-TRACK",
      primary: "#1D6468",
      accentWorkout: "#16B1A9",
      accentDiet: "#8AC75B",
    });
    expect(merged.name).toBe("ABS-TRACK");
    expect(merged.tagline).toBe(PLATFORM_DEFAULT_BRANDING.tagline);
    expect(merged.primary).toBe("#1D6468");
  });
});

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
