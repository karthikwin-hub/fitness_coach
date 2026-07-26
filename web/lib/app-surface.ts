export type AppSurface = "coaching" | "vault" | "shared";

const SHARED_PREFIXES = ["/api/", "/login", "/p/", "/_next"];

const VAULT_PREFIXES = ["/programs", "/vault"];

const COACHING_ONLY_PREFIXES = ["/coach", "/member", "/philosophy", "/quiz", "/platform"];

function hostInList(hostHeader: string | null, envKey: string): boolean {
  const list = (process.env[envKey] ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return false;
  const host = hostHeader?.split(":")[0]?.toLowerCase() ?? "";
  return list.includes(host);
}

export function resolveAppSurface(
  hostHeader: string | null,
  pathname: string,
): AppSurface {
  if (SHARED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return "shared";
  }
  if (pathname === "/" || pathname === "/favicon.ico") {
    if (hostInList(hostHeader, "VAULT_HOSTS")) return "vault";
    if (hostInList(hostHeader, "COACHING_HOSTS")) return "coaching";
    return "coaching";
  }

  if (hostInList(hostHeader, "VAULT_HOSTS")) return "vault";
  if (hostInList(hostHeader, "COACHING_HOSTS")) return "coaching";

  if (VAULT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "vault";
  }
  if (COACHING_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "coaching";
  }

  return "shared";
}

export function isVaultPublicPath(pathname: string): boolean {
  return VAULT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isCoachingOnlyPath(pathname: string): boolean {
  return COACHING_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
