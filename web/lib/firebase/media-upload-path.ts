const VOICE_NOTES_PREFIXED = /^voice-notes\/[a-zA-Z0-9_-]+$/;
const BROADCAST_PREFIXED = /^broadcasts\/[a-f0-9-]{36}$/;
const BARE_MEMBER_SCOPE = /^[a-zA-Z0-9_-]{1,64}$/;

/** Normalize client scope to a storage-safe path prefix. */
export function resolveCoachMediaScope(scope: string): string | null {
  const s = scope.trim();
  if (!s) return null;
  if (BROADCAST_PREFIXED.test(s) || VOICE_NOTES_PREFIXED.test(s)) return s;
  if (BARE_MEMBER_SCOPE.test(s)) return `voice-notes/${s}`;
  return null;
}

export function buildCoachMediaStoragePath(scopeKey: string, ext: string): string {
  const path = scopeKey.includes("/")
    ? `${scopeKey}/${Date.now()}.${ext}`
    : `voice-notes/${scopeKey}/${Date.now()}.${ext}`;
  return path;
}

export function isAllowedCoachMediaScope(scope: string): boolean {
  return resolveCoachMediaScope(scope) !== null;
}

export function audioExtensionFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

export function videoExtensionFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

export const COACH_AUDIO_MAX_BYTES = 5 * 1024 * 1024;
export const COACH_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export async function bufferToDataUrl(
  buffer: Buffer,
  mimeType: string,
  devFallback: string,
): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }
  return devFallback;
}
