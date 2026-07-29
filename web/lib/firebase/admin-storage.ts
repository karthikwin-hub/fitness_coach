import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";

/** Extract Firebase Storage object path from a download URL, or null if not Firebase-hosted. */
export function parseFirebaseStoragePath(url: string): string | null {
  if (!url || url.startsWith("dev://") || url.startsWith("data:")) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("firebasestorage.googleapis.com")) {
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
    if (parsed.pathname.includes("/v0/b/")) {
      const parts = parsed.pathname.split("/o/");
      if (parts[1]) return decodeURIComponent(parts[1].split("?")[0] ?? "");
    }
  } catch {
    return null;
  }
  return null;
}

export async function deleteFirebaseStorageUrl(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  const path = parseFirebaseStoragePath(url);
  if (!path) return false;

  const app = getFirebaseAdminApp();
  if (!app) return false;

  try {
    const bucket = getStorage(app).bucket();
    await bucket.file(path).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFirebaseStorageUrls(urls: Iterable<string | null | undefined>): Promise<number> {
  let deleted = 0;
  for (const url of urls) {
    if (await deleteFirebaseStorageUrl(url)) deleted += 1;
  }
  return deleted;
}
