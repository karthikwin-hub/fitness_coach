export function validateBroadcastPublishBody(body: Record<string, unknown>): string | null {
  const text = String(body.body ?? "").trim();
  const audioUrl = body.audioUrl ? String(body.audioUrl).trim() : "";
  const videoUrl = body.videoUrl ? String(body.videoUrl).trim() : "";
  if (body.active === false) return null;
  if (!text && !audioUrl && !videoUrl) {
    return "Add text, audio, or video before publishing.";
  }
  return null;
}

export function formatBroadcastActiveBadge(expiresAt: string | null): string | null {
  if (!expiresAt) return "Active";
  return `Active · expires ${new Date(expiresAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
