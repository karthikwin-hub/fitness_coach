/**
 * Normalize free-text phone numbers to E.164 digits (leading + required).
 * Returns null when a country code cannot be determined — refuse rather than
 * guess and send to the wrong number.
 */
export function normalizeToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;

  // Require an explicit country code (leading +) so we never invent one.
  if (!hasPlus) return null;

  return `+${digits}`;
}

/** Digits only (no +) for wa.me URLs. */
export function e164Digits(e164: string): string {
  return e164.replace(/\D/g, "");
}
