import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);

function csvRows(text) {
  const clean = text.trim();
  let quoted = false;
  let rows = 0;
  for (let index = 0; index < clean.length; index += 1) {
    if (clean[index] === '"') {
      if (quoted && clean[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (clean[index] === "\n" && !quoted) rows += 1;
  }
  return rows;
}

const read = (path) => readFile(new URL(path, root), "utf8");
const keywordFiles = (await readdir(new URL("raw/keywords/", root))).filter((name) =>
  name.startsWith("openseo-keyword-research-batch-"),
);
const rawKeywordRows = (
  await Promise.all(keywordFiles.map(async (name) => csvRows(await read(`raw/keywords/${name}`))))
).reduce((total, rows) => total + rows, 0);

assert.equal(keywordFiles.length, 6);
assert.equal(rawKeywordRows, 10_051);
assert.equal(csvRows(await read("03-keyword-master.csv")), 481);
assert.equal(csvRows(await read("serp-validation.csv")), 30);
assert.equal(csvRows(await read("competitor-domain-summary.csv")), 10);
assert.equal(csvRows(await read("competitor-page-inventory.csv")), 360);
assert.equal((await read("raw/live-sitemap-czechia-2026-08-31.txt")).trim().split(/\r?\n/).length, 281);
assert.equal((await readdir(new URL("content-briefs/", root))).filter((name) => name.endsWith(".md")).length, 9);

const ownership = `${await read("05-url-keyword-map.csv")}\n${await read("06-proposed-site-architecture.md")}`;
for (const obsolete of [
  "kozni-konzultace-online",
  "doporuceni-ke-specialistovi-a-zadanky",
  "druhy-lekarsky-nazor",
  "blood-pressure-calculator",
]) {
  assert.ok(!ownership.includes(obsolete), `obsolete slug found: ${obsolete}`);
}

console.log("Czechia SEO artifacts: OK");
