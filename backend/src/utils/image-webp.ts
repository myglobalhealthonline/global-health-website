import sharp from "sharp";

/** High-quality WebP for public photos; original pixel dimensions are retained. */
const WEBP_QUALITY = 82;

const CONVERTIBLE_MIME = new Set(["image/jpeg", "image/png"]);

export type ConvertedImage = {
  buffer: Buffer;
  mimetype: string;
  extension: string;
};

/**
 * Convert JPEG/PNG uploads to WebP before they're stored. WebP itself,
 * AVIF, GIF (incl. animated), and any other type pass through untouched —
 * GIF animation and non-photo formats are excluded by design, not oversight.
 */
export async function convertToWebpIfEligible(
  buffer: Buffer,
  mimetype: string,
): Promise<ConvertedImage | null> {
  if (!CONVERTIBLE_MIME.has(mimetype)) return null;
  // libvips does not expose APNG frames. Conservatively preserve files with
  // an animation-control marker instead of flattening them to one frame.
  if (mimetype === "image/png" && buffer.includes(Buffer.from("acTL"))) return null;
  const metadata = await sharp(buffer).metadata();
  if ((metadata.pages ?? 1) > 1) return null;
  // WebP's format limit must not force a resize or reject a valid original.
  if ((metadata.width ?? 0) > 16383 || (metadata.height ?? 0) > 16383) return null;
  const webpBuffer = await sharp(buffer)
    .autoOrient()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  if (webpBuffer.length >= buffer.length) return null;
  return { buffer: webpBuffer, mimetype: "image/webp", extension: "webp" };
}

export function replaceExtension(filename: string, extension: string): string {
  return filename.replace(/\.[a-zA-Z0-9]+$/, `.${extension}`);
}
