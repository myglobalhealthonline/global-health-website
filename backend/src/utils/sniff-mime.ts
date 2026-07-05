/**
 * Sniff the real file type from leading bytes. The client-supplied
 * Content-Type is not trusted — an attacker can label an HTML/SVG/script
 * payload as image/jpeg or application/pdf. Returns the detected MIME or
 * null if the buffer doesn't match any recognized signature.
 */
export function sniffFileMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PDF: %PDF (25 50 44 46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" / "GIF89a"
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") {
    return "image/gif";
  }
  // RIFF container: "RIFF" .... "WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  // ISO-BMFF (AVIF): bytes 4-7 "ftyp", brand at 8-11 is "avif"/"avis"
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * Validate an uploaded buffer's declared MIME against its sniffed magic
 * bytes. Returns the verified MIME on success, or null when the content
 * doesn't match an allowed type or doesn't match what the client declared.
 */
export function verifySniffedMime(
  buf: Buffer,
  declaredMime: string,
  allowed: ReadonlySet<string>,
): string | null {
  if (!allowed.has(declaredMime)) return null;
  const sniffed = sniffFileMime(buf);
  if (!sniffed || !allowed.has(sniffed)) return null;
  if (sniffed !== declaredMime) return null;
  return sniffed;
}
