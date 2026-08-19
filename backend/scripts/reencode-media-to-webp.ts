/**
 * Re-encode legacy PNG/JPEG media objects in place to WebP.
 *
 * New uploads have gone through `convertToWebpIfEligible()`
 * (admin-media-upload.route.ts / doctor-photo.route.ts) since that util
 * landed, but every object stored before it — and everything written to S3
 * by the seed/import scripts — is still a full-size PNG or JPEG master.
 * Some service-image masters are 1.8 MB.
 *
 * Real browsers never download those bytes: next/image content-negotiates
 * and serves a 18-50 KB AVIF/WebP variant. The masters only cost optimizer
 * cold-start time and, for any client that does NOT send `Accept:
 * image/webp` (curl, some SEO crawlers), a raw ~500 KB passthrough.
 *
 * Strategy — overwrite the SAME key, do not touch the database:
 *   - `Asset.key` / `Asset.path`, blog bodies and page content all reference
 *     these keys as strings; renaming `.png` to `.webp` would need every one
 *     of those references rewritten. The public media route
 *     (media-public.route.ts) serves `Content-Type` from the stored S3
 *     object metadata, not from the key's extension, so a `.png` key holding
 *     WebP bytes is served — and optimized — correctly.
 *   - The original bytes are copied to `media-original/<key>` first, so the
 *     lossy re-encode is reversible. Existing backups are never overwritten,
 *     which keeps re-runs idempotent.
 *
 * Matches new-upload behaviour exactly (quality 82, max width 1920), so a
 * master wider than 1920px is downscaled. Nothing on the site renders wider.
 *
 * Dry run (default):
 *   node --env-file=.env --import tsx scripts/reencode-media-to-webp.ts
 * Apply:
 *   node --env-file=.env --import tsx scripts/reencode-media-to-webp.ts --apply
 *
 * Options: --prefix=media/  --limit=N  --concurrency=N
 *
 * Keep --concurrency at or below 4. Higher values ran sharp/libvips wide
 * enough to kill the process mid-list (silent exit, no summary printed) on
 * the 1.8 MB masters; the run is I/O-bound on S3 anyway.
 */
import { convertToWebpIfEligible } from "../src/utils/image-webp.js";
import {
  getObject,
  headObject,
  isMediaStorageConfigured,
  listObjects,
  putObject,
  readObjectBodyToBuffer,
} from "../src/services/object-storage.js";

const BACKUP_PREFIX = "media-original/";
const CONVERTIBLE = new Set(["image/jpeg", "image/png"]);

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const APPLY = process.argv.includes("--apply");
const PREFIX = arg("prefix", "media/");
const LIMIT = Number(arg("limit", "0")) || Infinity;
const CONCURRENCY = Math.max(1, Number(arg("concurrency", "4")) || 4);

type Result = { key: string; before: number; after: number; note?: string };

async function processKey(key: string): Promise<Result | null> {
  const obj = await getObject(key);
  const contentType = (obj.ContentType ?? "").toLowerCase();
  if (!CONVERTIBLE.has(contentType)) return null;

  const original = await readObjectBodyToBuffer(obj.Body);
  if (!original) return { key, before: 0, after: 0, note: "unreadable body" };

  const converted = await convertToWebpIfEligible(original, contentType);
  if (!converted) return { key, before: original.length, after: original.length, note: "no converter" };
  if (converted.buffer.length >= original.length) {
    return { key, before: original.length, after: original.length, note: "webp not smaller — skipped" };
  }

  if (APPLY) {
    const backupKey = `${BACKUP_PREFIX}${key}`;
    if (!(await headObject(backupKey))) {
      await putObject(backupKey, original, contentType);
    }
    await putObject(key, converted.buffer, converted.mimetype);
  }
  return { key, before: original.length, after: converted.buffer.length };
}

async function main() {
  if (!isMediaStorageConfigured()) throw new Error("Media storage is not configured");

  const objects = (await listObjects(PREFIX))
    .filter((o) => !o.key.startsWith(BACKUP_PREFIX))
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${objects.length} object(s) under "${PREFIX}"\n`);

  const results: Result[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, objects.length) }, async () => {
      while (cursor < objects.length) {
        const { key } = objects[cursor++]!;
        try {
          const res = await processKey(key);
          if (res) {
            results.push(res);
            const pct = res.before ? Math.round((1 - res.after / res.before) * 100) : 0;
            console.log(
              `  ${key}\n    ${res.before} -> ${res.after} bytes (-${pct}%)${res.note ? ` [${res.note}]` : ""}`,
            );
          }
        } catch (error) {
          console.error(`  ${key}\n    FAILED: ${(error as Error).message}`);
        }
      }
    }),
  );

  const before = results.reduce((sum, r) => sum + r.before, 0);
  const after = results.reduce((sum, r) => sum + r.after, 0);
  console.log(
    `\n${results.length} convertible object(s): ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB` +
      (before ? ` (-${Math.round((1 - after / before) * 100)}%)` : ""),
  );
  if (!APPLY) console.log("Dry run — nothing written. Re-run with --apply.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
