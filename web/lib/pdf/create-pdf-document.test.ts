import { describe, expect, it } from "vitest";
import { createPdfDocument } from "@/lib/pdf/create-pdf-document";

describe("createPdfDocument", () => {
  it("creates a PDF with valid header", async () => {
    const doc = createPdfDocument({ size: "A4", margin: 48 });
    doc.fontSize(12).text("Test");
    doc.end();

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
