import type { tenants } from "@/lib/db/schema";

export type TenantFeatures = {
  selfServiceSignup: boolean;
  quizEnabled: boolean;
  publicLoginEnabled: boolean;
};

const DEFAULTS: TenantFeatures = {
  selfServiceSignup: true,
  quizEnabled: true,
  publicLoginEnabled: true,
};

export function parseTenantFeatures(
  featuresJson: unknown,
): TenantFeatures {
  if (!featuresJson || typeof featuresJson !== "object") return { ...DEFAULTS };
  const f = featuresJson as Record<string, unknown>;
  return {
    selfServiceSignup:
      typeof f.selfServiceSignup === "boolean"
        ? f.selfServiceSignup
        : DEFAULTS.selfServiceSignup,
    quizEnabled:
      typeof f.quizEnabled === "boolean" ? f.quizEnabled : DEFAULTS.quizEnabled,
    publicLoginEnabled:
      typeof f.publicLoginEnabled === "boolean"
        ? f.publicLoginEnabled
        : DEFAULTS.publicLoginEnabled,
  };
}

export function getTenantFeatures(
  tenant: Pick<typeof tenants.$inferSelect, "featuresJson">,
): TenantFeatures {
  return parseTenantFeatures(tenant.featuresJson);
}
