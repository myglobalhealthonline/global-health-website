import assert from "node:assert/strict";
import { it } from "node:test";
import sharp from "sharp";
import { convertToWebpIfEligible, convertToLosslessWebpIfSmaller } from "./image-webp.js";

it("compresses public uploads without resizing, and skips larger outputs and other formats", async () => {
  const original = await sharp({ create: { width: 2560, height: 1440, channels: 3, background: "#385847" } }).png().toBuffer();
  const result = await convertToWebpIfEligible(original, "image/png");
  assert.ok(result);
  assert.ok(result.buffer.length < original.length);
  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.width, 2560);
  assert.equal(metadata.height, 1440);
  assert.equal(metadata.format, "webp");
  assert.equal(await convertToWebpIfEligible(result.buffer, "image/webp"), null);
  assert.equal(await convertToWebpIfEligible(Buffer.from("unchanged"), "image/gif"), null);
  assert.equal(await convertToWebpIfEligible(Buffer.concat([original, Buffer.from("acTL")]), "image/png"), null);
  const tiny = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  const compressed = await convertToWebpIfEligible(tiny, "image/png");
  assert.ok(compressed === null || compressed.buffer.length < tiny.length);
  const rotated = await sharp(original).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const oriented = await convertToWebpIfEligible(rotated, "image/jpeg");
  assert.ok(oriented);
  const orientation = await sharp(oriented.buffer).metadata();
  assert.equal(orientation.width, 1440);
  assert.equal(orientation.height, 2560);
  assert.equal(orientation.orientation, undefined);
  const panorama = await sharp({ create: { width: 16384, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  assert.equal(await convertToWebpIfEligible(panorama, "image/png"), null);
});

it("only replaces existing images when lossless WebP is smaller with identical pixels", async () => {
  const source = await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 20, g: 100, b: 80, alpha: 0.5 } } }).png({ compressionLevel: 0 }).toBuffer();
  const result = await convertToLosslessWebpIfSmaller(source);
  assert.ok(result && result.buffer.length < source.length);
  assert.deepEqual(await sharp(result.buffer).ensureAlpha().raw().toBuffer(), await sharp(source).ensureAlpha().raw().toBuffer());
  const retry = await convertToLosslessWebpIfSmaller(result.buffer);
  assert.equal(retry, null);
});
