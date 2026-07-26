import { describe, expect, it } from "vitest";
import { slugifyTenantName, TenantSlugConflictError } from "@/lib/tenant/create-tenant";
import { subdomainFromHost, publicTenantUrl } from "@/lib/tenant/resolver";

describe("slugifyTenantName", () => {
  it("slugifies display names", () => {
    expect(slugifyTenantName("Demo Gym!")).toBe("demo-gym");
  });
});

describe("TenantSlugConflictError", () => {
  it("includes slug in message", () => {
    expect(new TenantSlugConflictError("abstrack").message).toContain("abstrack");
  });
});

describe("subdomainFromHost", () => {
  it("returns first label for multi-part hosts", () => {
    expect(subdomainFromHost("abstrack.localhost")).toBe("abstrack");
    expect(subdomainFromHost("demo-gym.example.com")).toBe("demo-gym");
  });

  it("returns null for bare localhost", () => {
    expect(subdomainFromHost("localhost:3010")).toBeNull();
  });

  it("uses PLATFORM_BASE_DOMAIN when set", () => {
    const prev = process.env.PLATFORM_BASE_DOMAIN;
    process.env.PLATFORM_BASE_DOMAIN = "coachplatform.com";
    expect(subdomainFromHost("helna.coachplatform.com")).toBe("helna");
    expect(subdomainFromHost("coachplatform.com")).toBeNull();
    process.env.PLATFORM_BASE_DOMAIN = prev;
  });
});

describe("publicTenantUrl", () => {
  it("prefers custom domain", () => {
    expect(
      publicTenantUrl({
        slug: "x",
        subdomain: "x",
        customDomain: "brand.com",
      }),
    ).toBe("https://brand.com");
  });
});
