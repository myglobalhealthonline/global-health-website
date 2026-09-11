/** Delete only backups named by a completed optimization manifest. Dry run by default. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { deleteObject, headObject, listObjects } from "../src/services/object-storage.js";

export async function main() {
  const manifestPath = process.argv.find((arg) => arg.startsWith("--manifest="))?.slice(11);
  assert.ok(manifestPath, "--manifest is required");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.failures, 0);
  const replacements = manifest.replacements as { key: string; backupKey: string; before: number; after: number }[];
  assert.ok(Array.isArray(replacements) && replacements.length > 0);
  assert.equal(new Set(replacements.map((row) => row.backupKey)).size, replacements.length);
  const apply = process.argv.includes("--apply");
  const objects = await listObjects("media-original/");
  const eligible: typeof replacements = [];
  for (let offset = 0; offset < replacements.length; offset += 4) {
    await Promise.all(replacements.slice(offset, offset + 4).map(async (row) => {
      assert.ok(row.key.startsWith("media/") && !row.key.includes(".."));
      assert.ok(row.backupKey.startsWith(`media-original/${row.key}.`));
      assert.match(row.backupKey.slice(`media-original/${row.key}.`.length), /^[0-9a-f-]{36}$/);
      const backup = objects.find((object) => object.key === row.backupKey);
      if (!backup) return;
      assert.equal(backup.size, row.before, `Unexpected backup size: ${row.backupKey}`);
      const live = await headObject(row.key);
      assert.ok(live && live.contentLength === row.after && live.contentType?.startsWith("image/"), `Live image differs from verified manifest: ${row.key}`);
      eligible.push(row);
    }));
  }
  const bytes = eligible.reduce((sum, row) => sum + row.before, 0);
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${eligible.length} exact manifest backups, ${bytes} bytes; all live replacements verified`);
  if (!apply) return;
  let deleted = 0;
  for (let offset = 0; offset < eligible.length; offset += 4) {
    await Promise.all(eligible.slice(offset, offset + 4).map(async (row) => {
      await deleteObject(row.backupKey);
      assert.equal(await headObject(row.backupKey), null, `Backup still exists: ${row.backupKey}`);
      deleted++;
      if (deleted % 50 === 0) console.log(`Deleted ${deleted}/${eligible.length}`);
    }));
  }
  const after = await listObjects("media-original/");
  const report = { completedAt: new Date().toISOString(), deleted, deletedBytes: bytes, backupBytesBefore: objects.reduce((n, row) => n + row.size, 0), backupBytesAfter: after.reduce((n, row) => n + row.size, 0), keys: eligible.map((row) => row.backupKey) };
  await writeFile(`${manifestPath}.backup-cleanup.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ...report, keys: undefined }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
