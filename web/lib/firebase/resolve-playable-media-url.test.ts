import { describe, expect, it } from "vitest";
import { parseFirebaseStoragePath } from "@/lib/firebase/admin-storage";

describe("parseFirebaseStoragePath", () => {
  it("parses firebasestorage download URLs", () => {
    expect(
      parseFirebaseStoragePath(
        "https://firebasestorage.googleapis.com/v0/b/my-app/o/broadcasts%2Ftenant%2F123.webm?alt=media&token=abc",
      ),
    ).toBe("broadcasts/tenant/123.webm");
  });

  it("parses storage.googleapis.com public URLs", () => {
    expect(
      parseFirebaseStoragePath(
        "https://storage.googleapis.com/my-app.appspot.com/broadcasts/tenant/123.webm",
      ),
    ).toBe("broadcasts/tenant/123.webm");
  });

  it("returns null for dev placeholders", () => {
    expect(parseFirebaseStoragePath("dev://audio/broadcasts/x/1.webm")).toBeNull();
  });
});
