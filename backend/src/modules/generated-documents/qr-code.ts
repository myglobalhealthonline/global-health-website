import QRCode from "qrcode";

/**
 * QR helpers for engraving the per-prescription patient-upload link onto
 * generated exams-prescription PDFs (DOCX primary path + HTML fallback).
 */

const QR_OPTS = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  width: 260,
};

/** PNG bytes for embedding into the DOCX (word/media/*). */
export async function qrPngBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...QR_OPTS, type: "png" });
}

/** data: URL for `<img>` in the Handlebars HTML template. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, QR_OPTS);
}
