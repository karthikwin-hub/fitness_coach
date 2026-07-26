import { describe, expect, it } from "vitest";
import { assertAllowedPhotoUrl } from "@/lib/gemini/photo-url";

describe("assertAllowedPhotoUrl", () => {
  it("allows Firebase Storage URLs", () => {
    expect(() =>
      assertAllowedPhotoUrl(
        "https://firebasestorage.googleapis.com/v0/b/demo/o/check-ins%2Fmeal.jpg?alt=media",
      ),
    ).not.toThrow();
  });

  it("rejects internal IP addresses", () => {
    expect(() => assertAllowedPhotoUrl("https://169.254.169.254/latest/meta-data")).toThrow(
      "Photo URL not allowed",
    );
  });

  it("rejects unknown external hosts", () => {
    expect(() => assertAllowedPhotoUrl("https://example.com/meal.jpg")).toThrow(
      "Photo URL not allowed",
    );
  });

  it("allows data URLs in development", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    expect(() => assertAllowedPhotoUrl("data:image/jpeg;base64,abc")).not.toThrow();
    process.env.NODE_ENV = prev;
  });
});
