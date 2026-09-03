/**
 * Applies the 2026-09-03 clinical approval to the LOCAL ARTIFACTS only.
 *
 *   node --import tsx scripts/apply-portugal-snippet-trim-approval.ts          # dry run
 *   node --import tsx scripts/apply-portugal-snippet-trim-approval.ts --write  # edit CSVs
 *
 * Touches no database. It edits two files:
 *   - the completion matrix, swapping the eleven live descriptions for the
 *     approved trims (the gated writer parses its drafts from this file);
 *   - the clinical register, updating `approved_sha256` and `reviewed_at` for
 *     those eleven assets to bind the approval to the new copy.
 *
 * Production publication is a separate, explicitly confirmed step through
 * `patch-portugal-seo-metadata.ts`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parsePortugalCsv } from "../src/content/portugal-seo-metadata-drafts.js";
import {
  loadPortugalSeoRemainingDrafts,
  portugalRemainingApprovalSha256,
} from "../src/content/portugal-seo-remaining-drafts.js";

const REVIEWED_AT = "2026-09-03T17:59:00+01:00";
const WRITE = process.argv.includes("--write");
const root = resolve(import.meta.dirname, "../..");
const rel = (p: string) => resolve(root, p);

const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
const serialize = (rows: string[][]) => `${rows.map((r) => r.map(esc).join(",")).join("\n")}\n`;

function load(path: string): { rows: string[][]; header: string[] } {
  const text = readFileSync(rel(path), "utf8");
  const rows = parsePortugalCsv(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
    .filter((r) => r.length > 1);
  return { rows, header: rows[0]!.map((c) => c.trim()) };
}

// The approved trims, keyed by URL. Read from the draft artifact so this script
// cannot drift from the file the reviewer was shown.
const drafts = load("seo/portugal/raw/snippet-trim-drafts-2026-09-03.csv");
const dCol = (name: string) => drafts.header.indexOf(name);
const approvedTrims = new Map<string, { current: string; proposed: string }>();
for (const row of drafts.rows.slice(1)) {
  if (row[dCol("asset_kind")] !== "doctor" || row[dCol("field")] !== "meta description") continue;
  approvedTrims.set(row[dCol("url")]!, {
    current: row[dCol("current_value")]!,
    proposed: row[dCol("proposed_value")]!,
  });
}
if (approvedTrims.size !== 11) throw new Error(`expected 11 approved doctor trims, found ${approvedTrims.size}`);

// 1. Completion matrix — swap the live description for the approved trim.
const matrix = load("seo/portugal/page-by-page-completion-matrix.csv");
const mUrl = matrix.header.indexOf("URL");
const mDesc = matrix.header.indexOf("optimized meta description");
const mOrig = matrix.header.indexOf("original meta description");
let matrixEdits = 0;
for (const row of matrix.rows.slice(1)) {
  const trim = approvedTrims.get(row[mUrl]!);
  if (!trim) continue;
  if (row[mDesc] !== trim.current && row[mDesc] !== trim.proposed) {
    throw new Error(`${row[mUrl]}: matrix description matches neither the recorded current nor proposed value`);
  }
  if (row[mDesc] === trim.proposed) continue;
  // The writer requires live production to equal the matrix's `original`
  // column (patch-portugal-seo-metadata.ts: currentDescription !==
  // originalDescription throws). These rows were already rewritten once, on
  // 2026-09-02, so `original` still holds the PRE-09-02 text while production
  // serves the 191-220 version. Re-point `original` at what is actually live
  // now, so the row describes this round of change rather than the last one.
  row[mOrig] = trim.current;
  row[mDesc] = trim.proposed;
  matrixEdits += 1;
}
if (WRITE) writeFileSync(rel("seo/portugal/page-by-page-completion-matrix.csv"), serialize(matrix.rows), "utf8");

// 2. Recompute the approval hashes from the freshly edited matrix.
if (WRITE) {
  const after = loadPortugalSeoRemainingDrafts().filter((d) => approvedTrims.has(d.url));
  if (after.length !== 11) throw new Error(`expected 11 drafts after the matrix edit, found ${after.length}`);
  const register = load("seo/portugal/clinical-review-register.csv");
  const rAsset = register.header.indexOf("page_or_file");
  const rHash = register.header.indexOf("approved_sha256");
  const rDate = register.header.indexOf("reviewed_at");
  let registerEdits = 0;
  for (const draft of after) {
    const row = register.rows.slice(1).find((r) => r[rAsset] === draft.url);
    if (!row) throw new Error(`no register row for ${draft.url}`);
    row[rHash] = portugalRemainingApprovalSha256(draft);
    row[rDate] = REVIEWED_AT;
    registerEdits += 1;
    console.log(`  ${draft.slug.padEnd(30)} ${row[rHash]}`);
  }
  writeFileSync(rel("seo/portugal/clinical-review-register.csv"), serialize(register.rows), "utf8");
  console.log(`\nmatrix rows updated: ${matrixEdits}\nregister rows updated: ${registerEdits}`);
} else {
  console.log(`DRY RUN — no file written.\nmatrix rows that would change: ${matrixEdits}`);
  for (const [url, t] of approvedTrims) {
    console.log(`  ${url.replace("https://www.myglobalhealth.online", "")}  ${t.current.length} -> ${t.proposed.length}`);
  }
}
console.log("\nNo database connection was opened. Publication is a separate step.");
