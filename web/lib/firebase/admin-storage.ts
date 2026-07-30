import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseAdminApp } from "@/lib/firebase/admin";

const PLAYABLE_URL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function buildFirebaseDownloadUrl(bucketName: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Extract Firebase Storage object path from a download URL, or null if not Firebase-hosted. */
export function parseFirebaseStoragePath(url: string): string | null {
  if (!url || url.startsWith("dev://") || url.startsWith("data:")) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "storage.googleapis.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length >= 2) {
        return segments.slice(1).join("/");
      }
    }
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

function hasFirebaseDownloadToken(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.has("token");
  } catch {
    return false;
  }
}

/** Upload buffer to Firebase Storage; returns tokenized download URL or null if Admin SDK unavailable. */
export async function uploadBufferToFirebaseStorage(
  buffer: Buffer,
  path: string,
  contentType: string,
): Promise<string | null> {
  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    const bucket = getStorage(app).bucket();
    const file = bucket.file(path);
    const downloadToken = randomUUID();
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
      resumable: false,
    });
    return buildFirebaseDownloadUrl(bucket.name, path, downloadToken);
  } catch {
    return null;
  }
}

/** Return a URL that HTML media elements can load without Firebase client auth. */
export async function resolvePlayableMediaUrl(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith("dev://")) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("data:")) return trimmed;
  if (!trimmed.startsWith("http")) return null;

  if (hasFirebaseDownloadToken(trimmed)) {
    return trimmed;
  }

  const path = parseFirebaseStoragePath(trimmed);
  if (!path) {
    return trimmed;
  }

  const app = getFirebaseAdminApp();
  if (!app) return trimmed;

  try {
    const bucket = getStorage(app).bucket();
    const file = bucket.file(path);
    const [metadata] = await file.getMetadata().catch(() => [null]);
    const existingToken = metadata?.metadata?.firebaseStorageDownloadTokens;
    if (typeof existingToken === "string" && existingToken.trim()) {
      return buildFirebaseDownloadUrl(bucket.name, path, existingToken.trim());
    }

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + PLAYABLE_URL_TTL_MS,
    });
    return signedUrl;
  } catch {
    return trimmed;
  }
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
