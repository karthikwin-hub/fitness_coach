"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  audioExtensionFromMime,
  buildCoachMediaStoragePath,
  COACH_AUDIO_MAX_BYTES,
  COACH_VIDEO_MAX_BYTES,
  videoExtensionFromMime,
} from "@/lib/firebase/media-upload-path";

export type CoachUploadOptions = {
  authHeaders?: Record<string, string>;
  preferServer?: boolean;
  kind?: "audio" | "video";
};

async function uploadViaCoachApi(
  blob: Blob,
  scopeKey: string,
  authHeaders: Record<string, string>,
  kind: "audio" | "video",
): Promise<string | null> {
  const form = new FormData();
  form.append("file", blob, kind === "video" ? "upload.webm" : "upload.webm");
  form.append("scope", scopeKey);
  form.append("kind", kind);

  const res = await fetch("/api/coach/media-upload", {
    method: "POST",
    headers: authHeaders,
    body: form,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed.");
  }

  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

async function uploadBlobToPath(
  blob: Blob,
  path: string,
  devFallback: string,
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const storage = getClientStorage();
  if (!storage) return null;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || "application/octet-stream" });
  return getDownloadURL(storageRef);
}

async function uploadCoachBlob(
  blob: Blob,
  scopeKey: string,
  kind: "audio" | "video",
  opts?: CoachUploadOptions,
): Promise<string | null> {
  const maxBytes = kind === "video" ? COACH_VIDEO_MAX_BYTES : COACH_AUDIO_MAX_BYTES;
  if (blob.size > maxBytes) {
    throw new Error(
      kind === "video" ? "Video is too large (max 50 MB)." : "Voice note is too large (max 5 MB).",
    );
  }

  const ext =
    kind === "video"
      ? videoExtensionFromMime(blob.type)
      : audioExtensionFromMime(blob.type);
  const path = buildCoachMediaStoragePath(scopeKey, ext);
  const devFallback =
    kind === "video"
      ? `dev://video/${scopeKey}/${Date.now()}.${ext}`
      : `dev://voice-note/${scopeKey}/${Date.now()}.${ext}`;

  if (opts?.preferServer && opts.authHeaders && Object.keys(opts.authHeaders).length > 0) {
    return uploadViaCoachApi(blob, scopeKey, opts.authHeaders, kind);
  }

  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(devFallback);
        reader.readAsDataURL(blob);
      });
    }
    if (opts?.authHeaders && Object.keys(opts.authHeaders).length > 0) {
      return uploadViaCoachApi(blob, scopeKey, opts.authHeaders, kind);
    }
    return null;
  }

  try {
    const clientUrl = await uploadBlobToPath(blob, path, devFallback);
    if (clientUrl) return clientUrl;
  } catch {
    /* fall through to server upload */
  }

  if (opts?.authHeaders && Object.keys(opts.authHeaders).length > 0) {
    return uploadViaCoachApi(blob, scopeKey, opts.authHeaders, kind);
  }

  return null;
}

/** Upload a coach voice note blob for in-app playback. */
export async function uploadCoachAudio(
  blob: Blob,
  scopeKey: string,
  opts?: CoachUploadOptions,
): Promise<string | null> {
  return uploadCoachBlob(blob, scopeKey, "audio", opts);
}

/** Upload meal photo from member check-in. */
export async function uploadMealPhoto(
  file: File,
  memberId: string,
): Promise<string | null> {
  const path = `check-ins/${memberId}/${Date.now()}-${file.name}`;
  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(`dev://meal-photo/${memberId}/${Date.now()}-${file.name}`);
        reader.readAsDataURL(file);
      });
    }
    return null;
  }

  const storage = getClientStorage();
  if (!storage) return null;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Upload coach broadcast or message video. */
export async function uploadCoachVideo(
  blob: Blob,
  scopeKey: string,
  opts?: CoachUploadOptions,
): Promise<string | null> {
  return uploadCoachBlob(blob, scopeKey, "video", opts);
}
