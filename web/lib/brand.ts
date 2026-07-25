export type AccentMode = "dual" | "single";

export type TenantBranding = {
  name?: string;
  accentMode?: AccentMode;
  primary?: string;
  accentWorkout?: string;
  accentDiet?: string;
  accentPromo?: string;
};

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
  if (!rgb) return ABSTRACK_BRAND.colors.green;
  const [r, g, b] = rgb;
  return rgbToHex(r * 0.65 + 40, g * 0.65 + 80, b * 0.65 + 40);
}

export function brandingToCssVars(branding: TenantBranding = {}) {
  const mode = branding.accentMode ?? "dual";
  const primary = branding.primary ?? ABSTRACK_BRAND.colors.turquoise;
  const workoutDefault = ABSTRACK_BRAND.colors.teal;
  const dietDefault = ABSTRACK_BRAND.colors.green;

  let accentWorkout = branding.accentWorkout ?? workoutDefault;
  let accentDiet = branding.accentDiet ?? dietDefault;

  if (mode === "single") {
    accentWorkout = primary;
    accentDiet = deriveSecondaryAccent(primary);
  }

  return {
    "--brand-primary": primary,
    "--brand-workout": accentWorkout,
    "--brand-diet": accentDiet,
    "--brand-promo": branding.accentPromo ?? primary,
  } as Record<string, string>;
}
