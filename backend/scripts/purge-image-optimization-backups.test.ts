import assert from "node:assert/strict";
import { it, mock } from "node:test";

it("deletes only manifested backups after checking live images, and keeps dry runs read-only", async () => {
  const key = "media/photo.png";
  const backupKey = `media-original/${key}.11111111-1111-1111-1111-111111111111`;
  const deleted: string[] = [];
  let liveSize = 50;
  const objects = () => [{ key: backupKey, size: 100 }, { key: "media-original/unrelated.png", size: 500 }].filter((row) => !deleted.includes(row.key));
  mock.module("node:fs/promises", { namedExports: {
    readFile: async () => JSON.stringify({ failures: 0, replacements: [{ key, backupKey, before: 100, after: 50 }] }),
    writeFile: async () => {},
  } });
  mock.module("../src/services/object-storage.js", { namedExports: {
    listObjects: async () => objects(),
    headObject: async (name: string) => name === key ? { contentLength: liveSize, contentType: "image/webp" } : objects().find((row) => row.key === name) ?? null,
    deleteObject: async (name: string) => { deleted.push(name); },
  } });
  const originalArgs = [...process.argv];
  try {
    process.argv.push("--manifest=test.json");
    const { main } = await import("./purge-image-optimization-backups.js");
    await main();
    assert.equal(deleted.length, 0);
    process.argv.push("--apply");
    liveSize = 70;
    await assert.rejects(main(), /Live image differs/);
    assert.equal(deleted.length, 0);
    liveSize = 50;
    await main();
    assert.deepEqual(deleted, [backupKey]);
    assert.deepEqual(objects(), [{ key: "media-original/unrelated.png", size: 500 }]);
  } finally {
    process.argv.splice(0, process.argv.length, ...originalArgs);
    mock.restoreAll();
  }
});
