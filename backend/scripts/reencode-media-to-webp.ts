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
 *   - The original bytes are copied to a unique `media-original/<key>.<uuid>`
 *     first, so every replacement is reversible. A conditional write refuses
 *     to overwrite a newer upload made while this script was working.
 *
 * Matches new-upload behaviour (quality 82, original pixel dimensions).
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
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import sharp from "sharp";
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

export async function processKey(key: string, apply = APPLY): Promise<Result | null> {
  // Avoid opening unread GET streams for already optimized objects: enough
  // unconsumed bodies exhaust the SDK socket pool and stall the entire audit.
  const metadata = await headObject(key);
  if (!CONVERTIBLE.has((metadata?.contentType ?? "").toLowerCase())) return null;
  const obj = await getObject(key);
  const contentType = (obj.ContentType ?? "").toLowerCase();
  const original = await readObjectBodyToBuffer(obj.Body);
  if (!CONVERTIBLE.has(contentType)) return null;
  if (!original) return { key, before: 0, after: 0, note: "unreadable body" };

  const converted = await convertToWebpIfEligible(original, contentType);
  if (!converted) return { key, before: original.length, after: original.length, note: "animation or no size saving — skipped" };
  if (converted.buffer.length >= original.length) {
    return { key, before: original.length, after: original.length, note: "webp not smaller — skipped" };
  }

  if (apply) {
    if (!obj.ETag) throw new Error("Missing ETag; cannot safely replace this object");
    const source = await sharp(original).metadata();
    const output = await sharp(converted.buffer).metadata();
    const rotated = (source.orientation ?? 1) >= 5;
    assert.equal(output.width, rotated ? source.height : source.width);
    assert.equal(output.height, rotated ? source.width : source.height);
    const backupKey = `${BACKUP_PREFIX}${key}.${randomUUID()}`;
    await putObject(backupKey, original, contentType);
    const backup = await getObject(backupKey);
    const backupBytes = await readObjectBodyToBuffer(backup.Body);
    assert.ok(backupBytes?.equals(original), "Original backup verification failed");
    console.log(`  Backup: ${backupKey}`);
    await putObject(key, converted.buffer, converted.mimetype, obj.ETag);
    const saved = await getObject(key);
    const savedBytes = await readObjectBodyToBuffer(saved.Body);
    assert.ok(savedBytes?.equals(converted.buffer), "Saved image verification failed");
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
  let checked = 0;
  let failed = 0;
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
          failed++;
          console.error(`  ${key}\n    FAILED: ${(error as Error).message}`);
        } finally {
          checked++;
          if (checked % 50 === 0) console.log(`Checked ${checked}/${objects.length} objects`);
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
  console.log(`${checked} checked; ${failed} failed`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
