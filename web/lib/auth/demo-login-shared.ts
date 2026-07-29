/** Demo coach email — no Google OAuth required when demo login is enabled. */
export const DEMO_COACH_EMAIL =
  process.env.DEMO_COACH_EMAIL ??
  process.env.NEXT_PUBLIC_DEMO_COACH_EMAIL ??
  "helna@abstrack.com";

/** Default member email shown on login form. */
export const DEMO_MEMBER_EMAIL =
  process.env.DEMO_MEMBER_EMAIL ??
  process.env.NEXT_PUBLIC_DEMO_MEMBER_EMAIL ??
  "sarah@abstrack.com";

/** Bearer token issued after a successful demo coach sign-in. */
export const DEMO_LOGIN_TOKEN = "demo-helna-coach";

/** Legacy bearer token for demo.member@abstrack.com (dev-local-member). */
export const DEMO_MEMBER_LOGIN_TOKEN = "demo-member-hetal";

/** Per-member demo tokens: demo-mbr-{firebaseUid} */
export const DEMO_MEMBER_TOKEN_PREFIX = "demo-mbr-";

const DEMO_STORAGE_KEY = "demoAuthToken";

export function normalizeDemoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDemoCoachEmail(email: string): boolean {
  return normalizeDemoEmail(email) === normalizeDemoEmail(DEMO_COACH_EMAIL);
}

/** @deprecated Any member email is accepted when demo login is enabled. */
export function isDemoMemberEmail(email: string): boolean {
  return normalizeDemoEmail(email) === normalizeDemoEmail(DEMO_MEMBER_EMAIL);
}

export function mintDemoMemberToken(firebaseUid: string): string {
  return `${DEMO_MEMBER_TOKEN_PREFIX}${firebaseUid}`;
}

export function parseDemoMemberToken(token: string): string | null {
  if (!token.startsWith(DEMO_MEMBER_TOKEN_PREFIX)) return null;
  const uid = token.slice(DEMO_MEMBER_TOKEN_PREFIX.length);
  return uid.length > 0 ? uid : null;
}

export function demoTokenForEmail(email: string, firebaseUid?: string): string | null {
  if (isDemoCoachEmail(email)) return DEMO_LOGIN_TOKEN;
  if (firebaseUid) return mintDemoMemberToken(firebaseUid);
  if (isDemoMemberEmail(email)) return DEMO_MEMBER_LOGIN_TOKEN;
  return null;
}

export function isServerDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED === "1";
}

export function isClientDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "1";
}

export function isDemoLoginToken(token: string): boolean {
  return (
    token === DEMO_LOGIN_TOKEN ||
    token === DEMO_MEMBER_LOGIN_TOKEN ||
    token.startsWith(DEMO_MEMBER_TOKEN_PREFIX)
  );
}

export function readDemoAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  return stored && isDemoLoginToken(stored) ? stored : null;
}

/** @deprecated use readDemoAuthToken */
export function readDemoCoachToken(): string | null {
  return readDemoAuthToken();
}

export function storeDemoAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STORAGE_KEY, token);
}

/** @deprecated use storeDemoAuthToken */
export function storeDemoCoachToken() {
  storeDemoAuthToken(DEMO_LOGIN_TOKEN);
}

export function clearDemoAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_STORAGE_KEY);
}

/** @deprecated use clearDemoAuthToken */
export function clearDemoCoachToken() {
  clearDemoAuthToken();
}
