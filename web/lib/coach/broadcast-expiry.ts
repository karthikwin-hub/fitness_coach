export type BroadcastExpiresPreset = "24h" | "48h" | "custom";

export function computeBroadcastExpiresAt(
  preset: BroadcastExpiresPreset,
  customIso?: string | null,
  from = new Date(),
): Date | null {
  if (preset === "24h") {
    return new Date(from.getTime() + 24 * 60 * 60 * 1000);
  }
  if (preset === "48h") {
    return new Date(from.getTime() + 48 * 60 * 60 * 1000);
  }
  if (preset === "custom" && customIso) {
    const d = new Date(customIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function isBroadcastVisible(
  active: boolean,
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!active) return false;
  if (!expiresAt) return true;
  return expiresAt.getTime() > now.getTime();
}
