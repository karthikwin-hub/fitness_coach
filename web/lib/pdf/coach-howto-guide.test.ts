import { describe, expect, it } from "vitest";
import { renderCoachHowtoGuidePdf } from "@/lib/pdf/coach-howto-guide";

describe("renderCoachHowtoGuidePdf", () => {
  it("renders a non-empty PDF", async () => {
    const buf = await renderCoachHowtoGuidePdf();
    expect(buf.length).toBeGreaterThan(800);
    expect(buf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
