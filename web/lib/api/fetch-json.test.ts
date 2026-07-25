import { afterEach, describe, expect, it, vi } from "vitest";
import { authFetchJson } from "@/lib/api/fetch-json";

describe("authFetchJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed data on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ id: "abc" }),
      }),
    );

    const { data, error } = await authFetchJson<{ id: string }>(
      "/api/test",
      {},
      async () => ({}),
    );
    expect(data).toEqual({ id: "abc" });
    expect(error).toBeNull();
  });

  it("handles empty error body without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "",
      }),
    );

    const { data, error } = await authFetchJson("/api/test", {}, async () => ({}));
    expect(data).toBeNull();
    expect(error).toBe("Request failed (500)");
  });

  it("returns API error message from JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ error: "Forbidden" }),
      }),
    );

    const { data, error } = await authFetchJson("/api/test", {}, async () => ({}));
    expect(data).toBeNull();
    expect(error).toBe("Forbidden");
  });
});
