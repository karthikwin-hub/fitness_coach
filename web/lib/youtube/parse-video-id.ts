/**
 * Extract a YouTube video ID from a URL or bare ID string.
 * Returns null for playlists, channels, or invalid input.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.slice("/embed/".length).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.slice("/shorts/".length).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.pathname.startsWith("/v/")) {
      const id = url.pathname.slice("/v/".length).split("/")[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
  }

  return null;
}

export function normalizeYoutubeVideoId(
  input: string | null | undefined,
): string | null {
  if (input == null || input === "") return null;
  return parseYoutubeVideoId(input);
}
