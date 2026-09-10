// Lossless only: preserve filenames, dimensions and every decoded RGBA pixel.
// Run: node scripts/optimize-public-images.mjs [--apply]
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";

const root = new URL("../public/", import.meta.url);
const apply = process.argv.includes("--apply");
const files = (await readdir(root, { recursive: true }))
  .filter((file) => /\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(file));
let before = 0;
let saved = 0;
let changed = 0;
for (const file of files) {
  const url = new URL(file.split(path.sep).join("/"), root);
  const original = await readFile(url);
  before += original.length;
  if (!/\.(png|webp)$/i.test(file)) continue;
  const metadata = await sharp(original).metadata();
  // Some legacy .png filenames contain JPEG bytes. Leave these to next/image.
  if ((metadata.pages ?? 1) > 1 || !["png", "webp"].includes(metadata.format)) continue;
  const pipeline = sharp(original).keepMetadata();
  const candidate = await (metadata.format === "png"
    ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    : pipeline.webp({ lossless: true, effort: 6 })).toBuffer();
  if (candidate.length >= original.length) continue;
  const decode = (buffer) => sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const source = await decode(original);
  const output = await decode(candidate);
  assert.deepEqual(output.info, source.info, `${file}: dimensions changed`);
  assert.ok(output.data.equals(source.data), `${file}: decoded pixels changed`);
  if (apply) await writeFile(url, candidate);
  changed++;
  saved += original.length - candidate.length;
  console.log(`${file}: ${original.length} -> ${candidate.length} bytes`);
}
console.log(JSON.stringify({ mode: apply ? "applied" : "dry-run", audited: files.length, changed, before, after: before - saved, saved }));
