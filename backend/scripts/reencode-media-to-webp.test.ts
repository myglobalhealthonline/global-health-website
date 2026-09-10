import assert from "node:assert/strict";
import { it, mock } from "node:test";
import sharp from "sharp";

it("skips optimized objects without opening streams and verifies conditional replacements and backups", async () => {
  const original = await sharp({ create: { width: 2560, height: 1440, channels: 3, background: "green" } }).png().toBuffer();
  const data = new Map<string, Buffer>([["media/photo.png", original]]);
  const writes: { key: string; ifMatch?: string }[] = [];
  let gets = 0;
  let conflict = false;
  mock.module("../src/services/object-storage.js", { namedExports: {
    headObject: async (key: string) => ({ contentType: key.endsWith(".webp") ? "image/webp" : "image/png" }),
    getObject: async (key: string) => { gets++; return { Body: data.get(key), ContentType: "image/png", ETag: '"original"' }; },
    readObjectBodyToBuffer: async (body: Buffer) => body,
    putObject: async (key: string, body: Buffer, _type: string, ifMatch?: string) => {
      if (key === "media/photo.png") {
        assert.equal(ifMatch, '"original"');
        if (conflict) throw new Error("PreconditionFailed");
      }
      writes.push({ key, ifMatch });
      data.set(key, body);
    },
    isMediaStorageConfigured: () => true,
    listObjects: async () => [],
  } });
  try {
    const { processKey } = await import("./reencode-media-to-webp.js");
    assert.equal(await processKey("media/already.webp", true), null);
    assert.equal(gets, 0);
    await processKey("media/photo.png", false);
    assert.equal(writes.length, 0);
    await processKey("media/photo.png", true);
    assert.equal(writes.length, 2);
    assert.ok(writes[0]!.key.startsWith("media-original/media/photo.png."));
    assert.deepEqual(data.get(writes[0]!.key), original);
    assert.ok(data.get("media/photo.png")!.length < original.length);
    data.set("media/photo.png", original);
    conflict = true;
    await assert.rejects(processKey("media/photo.png", true), /PreconditionFailed/);
    assert.deepEqual(data.get("media/photo.png"), original);
  } finally {
    mock.restoreAll();
  }
});
