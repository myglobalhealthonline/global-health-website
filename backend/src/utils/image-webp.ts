import sharp from "sharp";

/** Photo-quality WebP setting — visually lossless, ~25-35% smaller than source JPEG/PNG. */
const WEBP_QUALITY = 82;

/** No rendered image on the site is wider than this — caps byte size on
 *  camera-resolution uploads without visible quality loss. */
const MAX_WIDTH = 1920;

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
  const webpBuffer = await sharp(buffer, { animated: false })
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { buffer: webpBuffer, mimetype: "image/webp", extension: "webp" };
}

export function replaceExtension(filename: string, extension: string): string {
  return filename.replace(/\.[a-zA-Z0-9]+$/, `.${extension}`);
}
