import { createRequire } from "module";
import type PDFKit from "pdfkit";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit") as typeof import("pdfkit");

/** Create a PDFKit document using Node's module resolution (avoids Turbopack path bugs). */
export function createPdfDocument(options?: PDFKit.PDFDocumentOptions): PDFKit.PDFDocument {
  return new PDFDocument(options);
}
