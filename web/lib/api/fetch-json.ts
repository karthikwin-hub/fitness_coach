export async function authFetch(
  url: string,
  init: RequestInit,
  getHeaders: () => Promise<Record<string, string>>,
) {
  const authHeaders = await getHeaders();
  return fetch(url, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers ?? {}),
    },
  });
}

export async function authFetchJson<T>(
  url: string,
  init: RequestInit,
  getHeaders: () => Promise<Record<string, string>>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await authFetch(url, init, getHeaders);
    const text = await res.text();
    if (!text.trim()) {
      return {
        data: null,
        error: res.ok ? null : `Request failed (${res.status})`,
      };
    }
    const parsed = JSON.parse(text) as T & { error?: string };
    if (!res.ok) {
      return { data: null, error: parsed.error ?? `Request failed (${res.status})` };
    }
    return { data: parsed, error: null };
  } catch {
    return { data: null, error: "Could not reach the server." };
  }
}
