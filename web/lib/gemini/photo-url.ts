const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
];

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(lower));
}

function allowedPhotoHosts(): string[] {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const hosts = ["firebasestorage.googleapis.com", "storage.googleapis.com"];
  if (bucket) {
    hosts.push(`${bucket}.firebasestorage.app`);
  }
  return hosts;
}

export function assertAllowedPhotoUrl(url: string): void {
  if (process.env.NODE_ENV === "development" && url.startsWith("data:")) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Photo URL not allowed");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Photo URL not allowed");
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Photo URL not allowed");
  }

  const allowed = allowedPhotoHosts();
  const host = parsed.hostname.toLowerCase();
  if (!allowed.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`))) {
    throw new Error("Photo URL not allowed");
  }
}
