import { describe, expect, it } from "vitest";
import { parseFirebaseStoragePath } from "@/lib/firebase/admin-storage";
import {
  computeRetentionCutoff,
  isExternalMediaUrl,
} from "@/lib/maintenance/retention-helpers";

describe("retention-helpers", () => {
  it("computes cutoff from retention days", () => {
    const now = new Date("2026-07-29T12:00:00.000Z");
    const cutoff = computeRetentionCutoff({ retentionDays: 30, now });
    expect(cutoff.toISOString()).toBe("2026-06-29T12:00:00.000Z");
  });

  it("detects external/dev media URLs", () => {
    expect(isExternalMediaUrl("dev://voice/x")).toBe(true);
    expect(isExternalMediaUrl("data:audio/webm;base64,abc")).toBe(true);
    expect(
      isExternalMediaUrl(
        "https://firebasestorage.googleapis.com/v0/b/app/o/check-ins%2Fa%2Fb.jpg?alt=media",
      ),
    ).toBe(false);
    expect(
      isExternalMediaUrl(
        "https://storage.googleapis.com/my-app.appspot.com/broadcasts/tenant/123.webm",
      ),
    ).toBe(false);
  });

  it("parses Firebase storage path from download URL", () => {
    expect(
      parseFirebaseStoragePath(
        "https://firebasestorage.googleapis.com/v0/b/my-app/o/voice-notes%2Fm1%2F123.webm?alt=media",
      ),
    ).toBe("voice-notes/m1/123.webm");
    expect(parseFirebaseStoragePath("dev://x")).toBeNull();
  });
});
