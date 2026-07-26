import { describe, expect, it } from "vitest";
import { DEMO_CATALOG_MARKETING } from "@/lib/vault/demo-marketing";
import {
  DEFAULT_VAULT_CATALOG_MARKETING,
  type VaultCatalogMarketing,
} from "@/lib/vault/types";

describe("DEFAULT_VAULT_CATALOG_MARKETING", () => {
  it("has required storefront fields", () => {
    expect(DEFAULT_VAULT_CATALOG_MARKETING.heroHeadline).toBeTruthy();
    expect(DEFAULT_VAULT_CATALOG_MARKETING.heroCtaLabel).toBeTruthy();
    expect(DEFAULT_VAULT_CATALOG_MARKETING.whyChoose.length).toBeGreaterThan(0);
    expect(DEFAULT_VAULT_CATALOG_MARKETING.journeySteps.length).toBe(3);
  });

  it("matches VaultCatalogMarketing shape", () => {
    const m: VaultCatalogMarketing = DEFAULT_VAULT_CATALOG_MARKETING;
    expect(m.coachStory.title).toBeTruthy();
    expect(m.journeyCta.buttonLabel).toBeTruthy();
  });
});

describe("DEMO_CATALOG_MARKETING", () => {
  it("includes FitMoms-style testimonials and press sections", () => {
    expect(DEMO_CATALOG_MARKETING.testimonials.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_CATALOG_MARKETING.pressFeatures.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_CATALOG_MARKETING.whyChoose.length).toBeGreaterThanOrEqual(5);
  });
});
