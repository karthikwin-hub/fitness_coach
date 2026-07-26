/** Demo coach email — no Google OAuth required when demo login is enabled. */
export const DEMO_COACH_EMAIL =
  process.env.DEMO_COACH_EMAIL ??
  process.env.NEXT_PUBLIC_DEMO_COACH_EMAIL ??
  "helna@abstrack.com";

/** Bearer token issued after a successful demo email sign-in. */
export const DEMO_LOGIN_TOKEN = "demo-helna-coach";

const DEMO_STORAGE_KEY = "demoCoachToken";

export function normalizeDemoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDemoCoachEmail(email: string): boolean {
  return normalizeDemoEmail(email) === normalizeDemoEmail(DEMO_COACH_EMAIL);
}

export function isServerDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED === "1";
}

export function isClientDemoLoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "1";
}

export function isDemoLoginToken(token: string): boolean {
  return token === DEMO_LOGIN_TOKEN;
}

export function readDemoCoachToken(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  return stored === DEMO_LOGIN_TOKEN ? stored : null;
}

export function storeDemoCoachToken() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STORAGE_KEY, DEMO_LOGIN_TOKEN);
}

export function clearDemoCoachToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_STORAGE_KEY);
}
