import { randomInt } from "crypto";

const IMPORT_KEY_MIN = 10000;
const IMPORT_KEY_MAX = 99999;

/** Opaque numeric import key — never derived from member name. */
export function generateImportKey(): string {
  return String(randomInt(IMPORT_KEY_MIN, IMPORT_KEY_MAX + 1));
}

export function normalizeImportKey(key: string): string {
  return key.trim();
}

export function isValidImportKey(key: string): boolean {
  if (/^[0-9]{4,6}$/.test(key)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(key);
}
