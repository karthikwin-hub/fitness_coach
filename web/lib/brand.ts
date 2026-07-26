export type AccentMode = "dual" | "single";

export type TenantBranding = {
  name?: string;
  tagline?: string;
  accentMode?: AccentMode;
  primary?: string;
  accentWorkout?: string;
  accentDiet?: string;
  accentPromo?: string;
};

/** Neutral product defaults — tenants override via brandingJson partials. */
export const PLATFORM_DEFAULT_BRANDING: Required<
  Pick<
    TenantBranding,
    "name" | "tagline" | "accentMode" | "primary" | "accentWorkout" | "accentDiet" | "accentPromo"
  >
> = {
  name: "Coach Platform",
  tagline: "White-label coaching, delivered.",
  accentMode: "dual",
  primary: "#1D6468",
  accentWorkout: "#16B1A9",
  accentDiet: "#8AC75B",
  accentPromo: "#1D6468",
};

/** @deprecated Prefer PLATFORM_DEFAULT_BRANDING + Helna tenant overrides. Kept for seed/copy compatibility. */
export const ABSTRACK_BRAND = {
  name: "ABS-TRACK",
  tagline: "Stop Guessing. Start Transforming.",
  colors: {
    turquoise: "#1D6468",
    green: "#8AC75B",
    teal: "#16B1A9",
    dark: "#1E1E1E",
    darkSurface: "#2a2a2a",
  },
} as const;

export function mergeBranding(
  tenantPartial?: TenantBranding | null,
  platform: TenantBranding = PLATFORM_DEFAULT_BRANDING,
): TenantBranding {
  return {
    name: tenantPartial?.name ?? platform.name ?? PLATFORM_DEFAULT_BRANDING.name,
    tagline: tenantPartial?.tagline ?? platform.tagline ?? PLATFORM_DEFAULT_BRANDING.tagline,
    accentMode:
      tenantPartial?.accentMode ?? platform.accentMode ?? PLATFORM_DEFAULT_BRANDING.accentMode,
    primary: tenantPartial?.primary ?? platform.primary ?? PLATFORM_DEFAULT_BRANDING.primary,
    accentWorkout:
      tenantPartial?.accentWorkout ??
      platform.accentWorkout ??
      PLATFORM_DEFAULT_BRANDING.accentWorkout,
    accentDiet:
      tenantPartial?.accentDiet ?? platform.accentDiet ?? PLATFORM_DEFAULT_BRANDING.accentDiet,
    accentPromo:
      tenantPartial?.accentPromo ?? platform.accentPromo ?? PLATFORM_DEFAULT_BRANDING.accentPromo,
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("")}`;
}

/** Muted variant for second accent when accentMode is single. */
export function deriveSecondaryAccent(primary: string): string {
  const rgb = hexToRgb(primary);
  if (!rgb) return PLATFORM_DEFAULT_BRANDING.accentDiet;
  const [r, g, b] = rgb;
  return rgbToHex(r * 0.65 + 40, g * 0.65 + 80, b * 0.65 + 40);
}

export function brandingToCssVars(branding: TenantBranding = {}) {
  const merged = mergeBranding(branding);
  const mode = merged.accentMode ?? "dual";
  const primary = merged.primary ?? PLATFORM_DEFAULT_BRANDING.primary;

  let accentWorkout = merged.accentWorkout ?? PLATFORM_DEFAULT_BRANDING.accentWorkout;
  let accentDiet = merged.accentDiet ?? PLATFORM_DEFAULT_BRANDING.accentDiet;

  if (mode === "single") {
    accentWorkout = primary;
    accentDiet = deriveSecondaryAccent(primary);
  }

  return {
    "--brand-primary": primary,
    "--brand-workout": accentWorkout,
    "--brand-diet": accentDiet,
    "--brand-promo": merged.accentPromo ?? primary,
  } as Record<string, string>;
}
