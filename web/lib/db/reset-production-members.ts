export const KEEP_MEMBER_EMAILS = [
  "hetal@abstrack.local",
  "avinash@abstrack.local",
  "shruti@abstrack.local",
] as const;

export function normalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function shouldKeepMemberEmail(
  email: string,
  keepList: readonly string[] = KEEP_MEMBER_EMAILS,
): boolean {
  const normalized = normalizeMemberEmail(email);
  return keepList.some((k) => normalizeMemberEmail(k) === normalized);
}

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}
