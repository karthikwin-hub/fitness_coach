"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";

const COACH_AUDIO_MAX_BYTES = 5 * 1024 * 1024;
const COACH_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

async function uploadBlobToPath(
  blob: Blob,
  path: string,
  devFallback: string,
): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(devFallback);
        reader.readAsDataURL(blob);
      });
    }
    return null;
  }

  const storage = getClientStorage();
  if (!storage) return null;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || "application/octet-stream" });
  return getDownloadURL(storageRef);
}

function audioExtension(blob: Blob): string {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("mpeg")) return "mp3";
  return "webm";
}

function videoExtension(blob: Blob): string {
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("quicktime")) return "mov";
  return "webm";
}

/** Upload a coach voice note blob for in-app playback. */
export async function uploadCoachAudio(
  blob: Blob,
  scopeKey: string,
): Promise<string | null> {
  if (blob.size > COACH_AUDIO_MAX_BYTES) {
    throw new Error("Voice note is too large (max 5 MB).");
  }

  const ext = audioExtension(blob);
  const path = scopeKey.includes("/")
    ? `${scopeKey}/${Date.now()}.${ext}`
    : `voice-notes/${scopeKey}/${Date.now()}.${ext}`;
  return uploadBlobToPath(blob, path, `dev://voice-note/${scopeKey}/${Date.now()}.${ext}`);
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
): Promise<string | null> {
  if (blob.size > COACH_VIDEO_MAX_BYTES) {
    throw new Error("Video is too large (max 50 MB).");
  }

  const ext = videoExtension(blob);
  const path = scopeKey.includes("/")
    ? `${scopeKey}/${Date.now()}.${ext}`
    : `broadcasts/${scopeKey}/${Date.now()}.${ext}`;
  return uploadBlobToPath(blob, path, `dev://video/${scopeKey}/${Date.now()}.${ext}`);
}
