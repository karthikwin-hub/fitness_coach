import { describe, expect, it } from "vitest";
import {
  isCoachingOnlyPath,
  isVaultPublicPath,
  resolveAppSurface,
} from "@/lib/app-surface";

describe("resolveAppSurface", () => {
  it("treats /programs as vault on localhost", () => {
    expect(resolveAppSurface("localhost:3010", "/programs")).toBe("vault");
    expect(resolveAppSurface("localhost:3010", "/vault/stay-fit-busy-professionals")).toBe(
      "vault",
    );
  });

  it("treats coach paths as coaching on localhost", () => {
    expect(resolveAppSurface("localhost:3010", "/coach/vault")).toBe("coaching");
    expect(resolveAppSurface("localhost:3010", "/member")).toBe("coaching");
  });

  it("treats API as shared", () => {
    expect(resolveAppSurface("localhost:3010", "/api/vault/catalog")).toBe("shared");
  });

  it("uses VAULT_HOSTS when configured", () => {
    process.env.VAULT_HOSTS = "programs.example.com";
    expect(resolveAppSurface("programs.example.com", "/coach")).toBe("vault");
    delete process.env.VAULT_HOSTS;
  });

  it("uses COACHING_HOSTS when configured", () => {
    process.env.COACHING_HOSTS = "coach.example.com";
    expect(resolveAppSurface("coach.example.com", "/programs")).toBe("coaching");
    delete process.env.COACHING_HOSTS;
  });
});

describe("path helpers", () => {
  it("detects vault public paths", () => {
    expect(isVaultPublicPath("/programs")).toBe(true);
    expect(isVaultPublicPath("/vault/foo")).toBe(true);
    expect(isVaultPublicPath("/coach")).toBe(false);
  });

  it("detects coaching-only paths", () => {
    expect(isCoachingOnlyPath("/coach/vault")).toBe(true);
    expect(isCoachingOnlyPath("/quiz")).toBe(true);
    expect(isCoachingOnlyPath("/programs")).toBe(false);
  });
});
