import { describe, expect, it, afterEach } from "vitest";
import { isDevAuthEnabled, isServerDevAuthEnabled } from "@/lib/auth/dev-auth-enabled";

describe("dev auth flags", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublic = process.env.NEXT_PUBLIC_E2E_DEV_AUTH;
  const originalServer = process.env.E2E_DEV_AUTH;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_E2E_DEV_AUTH = originalPublic;
    process.env.E2E_DEV_AUTH = originalServer;
  });

  it("enables client dev auth in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_E2E_DEV_AUTH;
    expect(isDevAuthEnabled()).toBe(true);
  });

  it("enables client dev auth when NEXT_PUBLIC_E2E_DEV_AUTH=1", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_E2E_DEV_AUTH = "1";
    expect(isDevAuthEnabled()).toBe(true);
  });

  it("enables server dev tokens when E2E_DEV_AUTH=1", () => {
    process.env.NODE_ENV = "production";
    process.env.E2E_DEV_AUTH = "1";
    expect(isServerDevAuthEnabled()).toBe(true);
  });

  it("disables dev auth in production without E2E flags", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_E2E_DEV_AUTH;
    delete process.env.E2E_DEV_AUTH;
    expect(isDevAuthEnabled()).toBe(false);
    expect(isServerDevAuthEnabled()).toBe(false);
  });
});
