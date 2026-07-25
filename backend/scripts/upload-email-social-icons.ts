import "dotenv/config";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Rasterises the social icons used in the doctor announcement email footer and
 * uploads them to the media bucket under `email-icons/`.
 *
 * Email clients (Gmail in particular) strip inline SVG and refuse `data:` image
 * URIs, so footer icons have to be real hosted PNGs. They are served by the
 * already-deployed public media route, so no frontend deploy is needed.
 *
 * Keys use the `media/<uuid>-<file>` shape that `isSafeMediaKey` already
 * accepts — deliberately NOT a new prefix, so publishing these icons requires
 * no change to that security allowlist. The generated keys are recorded in
 * scripts/data/email-social-icons.json and reused on every later run, so the
 * URLs baked into already-sent emails keep resolving.
 *
 *   node --import tsx scripts/upload-email-social-icons.ts          (dry run)
 *   node --import tsx scripts/upload-email-social-icons.ts --upload
 */

const FG = "#FFFFFF";
const BG = "#15382A"; // deep-night forest, matches the email header
const SIZE = 96; // 2x the 48px display size, for retina

/** Simple, hand-authored glyphs on a filled circle — recognisable at 24px
 *  without reproducing any brand's proprietary artwork. */
const ICONS: Record<string, string> = {
  instagram: `
    <rect x="26" y="26" width="44" height="44" rx="13" fill="none" stroke="${FG}" stroke-width="6"/>
    <circle cx="48" cy="48" r="11" fill="none" stroke="${FG}" stroke-width="6"/>
    <circle cx="61.5" cy="34.5" r="3.6" fill="${FG}"/>`,

  facebook: `
    <path d="M54.5 76V50.5h8.6l1.3-10h-9.9v-6.4c0-2.9.8-4.9 5-4.9h5.3v-8.9c-.9-.1-4.1-.4-7.8-.4-7.7 0-13 4.7-13 13.3v7.3h-8.7v10h8.7V76z" fill="${FG}"/>`,

  tiktok: `
    <path d="M58 20v30.5a9.5 9.5 0 1 1-7.6-9.3v9.9a2 2 0 1 0 2 2V20z" fill="${FG}"/>
    <path d="M58 20c1.2 6.4 5.6 10.6 12 11.3v9.4c-5-.3-9.1-2.1-12-5z" fill="${FG}"/>`,

  linkedin: `
    <rect x="24" y="40" width="10" height="32" fill="${FG}"/>
    <circle cx="29" cy="29" r="6" fill="${FG}"/>
    <path d="M42 40h9.6v4.4h.2c1.4-2.5 4.7-5.2 9.7-5.2 10.4 0 12.3 6.5 12.3 15V72H64V56.3c0-3.8-.1-8.6-5.4-8.6-5.4 0-6.2 4.1-6.2 8.3V72H42z" fill="${FG}"/>`,

  youtube: `
    <rect x="18" y="30" width="60" height="36" rx="11" fill="${FG}"/>
    <path d="M42 40l16 8-16 8z" fill="${BG}"/>`,

  wikidata: `
    <rect x="20" y="34" width="5" height="28" fill="${FG}"/>
    <rect x="30" y="34" width="5" height="28" fill="${FG}"/>
    <rect x="40" y="34" width="5" height="28" fill="${FG}"/>
    <rect x="50" y="26" width="5" height="44" fill="${FG}"/>
    <rect x="60" y="34" width="5" height="28" fill="${FG}"/>
    <rect x="70" y="26" width="5" height="44" fill="${FG}"/>`,
};

function svgFor(glyph: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 96 96">
    <circle cx="48" cy="48" r="48" fill="${BG}"/>
    ${glyph}
  </svg>`;
}

const MANIFEST = join(dirname(fileURLToPath(import.meta.url)), "data", "email-social-icons.json");
const MEDIA_ORIGIN = process.env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "") ?? "";

function loadManifest(): Record<string, string> {
  if (!existsSync(MANIFEST)) return {};
  return JSON.parse(readFileSync(MANIFEST, "utf-8")) as Record<string, string>;
}

async function main() {
  const doUpload = process.argv.includes("--upload");
  const sharp = (await import("sharp")).default;
  const { putObject, isMediaStorageConfigured } = await import(
    "../src/services/object-storage.js"
  );

  if (doUpload && !isMediaStorageConfigured()) {
    console.error("Media storage is not configured — check S3_* env vars.");
    process.exit(1);
  }

  const manifest = loadManifest();

  console.log("");
  console.log(`  ${doUpload ? "UPLOADING" : "DRY RUN"} — ${Object.keys(ICONS).length} icons`);
  console.log("");

  for (const [name, glyph] of Object.entries(ICONS)) {
    const png = await sharp(Buffer.from(svgFor(glyph))).png().toBuffer();
    // Reuse the existing key so URLs already sent in emails keep working.
    const key = manifest[name] ?? `media/${randomUUID()}-${name}.png`;
    manifest[name] = key;

    if (doUpload) {
      await putObject(key, png, "image/png");
      console.log(`  uploaded  ${key}  (${png.length} bytes)`);
    } else {
      console.log(`  would upload  ${key}  (${png.length} bytes)`);
    }
  }

  if (doUpload) {
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
    console.log(`\n  manifest written: ${MANIFEST}`);
  }

  console.log("");
  console.log("  Public URLs:");
  for (const [name, key] of Object.entries(manifest)) {
    console.log(`    ${name.padEnd(10)} ${MEDIA_ORIGIN}/api/media/${key}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
