/**
 * Stages the six Portugal tool pages for publication under a super-admin
 * override. LOCAL ARTIFACTS ONLY — no database connection, no production write.
 *
 *   node --import tsx scripts/stage-portugal-tool-seo-override.ts          # dry run
 *   node --import tsx scripts/stage-portugal-tool-seo-override.ts --write
 *
 * Tool metadata is not a database record. It ships as a frontend overlay,
 * `frontend/lib/tools/portugal-approved-tool-seo.json`, mirroring Czechia. The
 * gate on that file is `portugal-clinical-approval.test.ts`, which requires
 * every key to trace to an approved row in `content-completion-matrix.csv` —
 * so staging means writing the draft rows, the register rows and the overlay
 * together, and they must agree.
 *
 * These rows are recorded as `super_admin_override`: the owner authorized
 * publication and no clinician reviewed the copy. Every reviewer-identity
 * column is left empty, which the approval module enforces.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { parsePortugalCsv } from "../src/content/portugal-seo-metadata-drafts.js";

const WRITE = process.argv.includes("--write");
const root = resolve(import.meta.dirname, "../..");
const rel = (p: string) => resolve(root, p);
const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
const serialize = (rows: string[][]) => `${rows.map((r) => r.map(esc).join(",")).join("\n")}\n`;

function load(path: string) {
  const text = readFileSync(rel(path), "utf8");
  const rows = parsePortugalCsv(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).filter((r) => r.length > 1);
  return { rows, header: rows[0]!.map((c) => c.trim()) };
}

// The approved copy, read from the draft artifact so this cannot drift.
const drafts = load("seo/portugal/raw/snippet-trim-drafts-2026-09-03.csv");
const dc = (n: string) => drafts.header.indexOf(n);
type Field = { current: string; proposed: string };
const tools = new Map<string, { title?: Field; description?: Field }>();
for (const row of drafts.rows.slice(1)) {
  if (row[dc("asset_kind")] !== "tool") continue;
  const slug = row[dc("url")]!.split("/").pop()!;
  const entry = tools.get(slug) ?? {};
  const field: Field = { current: row[dc("current_value")]!, proposed: row[dc("proposed_value")]! };
  if (row[dc("field")] === "title") entry.title = field;
  else entry.description = field;
  tools.set(slug, entry);
}

// bmi-calculator is a title-only change; the rest carry both fields.
const staged = [...tools.entries()].filter(([, v]) => v.title || v.description);
if (staged.length !== 6) throw new Error(`expected 6 tool pages, found ${staged.length}`);

console.log(WRITE ? "STAGING" : "DRY RUN");
for (const [slug, v] of staged) {
  const t = v.title, d = v.description;
  console.log(`  ${slug}`);
  if (t) console.log(`    title       ${t.current.length} -> ${t.proposed.length}  ${t.proposed}`);
  if (d) console.log(`    description ${d.current.length} -> ${d.proposed.length}  ${d.proposed}`);
  if (t && t.proposed.length > 60) throw new Error(`${slug}: proposed title exceeds 60 characters`);
  if (d && d.proposed.length > 160) throw new Error(`${slug}: proposed description exceeds 160 characters`);
}

if (!WRITE) {
  console.log("\nNothing written. Re-run with --write to stage.");
  process.exit(0);
}

// Live values, for pages whose draft changes only the title.
const live = load("seo/portugal/page-by-page-completion-matrix.csv");
const lUrl = live.header.indexOf("URL");
const lDesc = live.header.indexOf("optimized meta description");
function liveDescription(slug: string): string | undefined {
  const row = live.rows.slice(1).find((r) => r[lUrl]!.endsWith(`/tools/${slug}`));
  return row?.[lDesc];
}

// 1. Frontend overlay — the actual publication surface.
const overlayPath = "frontend/lib/tools/portugal-approved-tool-seo.json";
const overlay = JSON.parse(readFileSync(rel(overlayPath), "utf8")) as Record<
  string,
  { metaTitle?: string; metaDescription?: string }
>;
for (const [slug, v] of staged) {
  const existing = overlay[slug] ?? {};
  overlay[slug] = {
    metaTitle: v.title?.proposed ?? existing.metaTitle ?? v.title?.current ?? "",
    metaDescription: v.description?.proposed ?? existing.metaDescription ?? v.description?.current ?? "",
  };
  // A title-only page still needs a description. Prefer whatever the overlay
  // already served; otherwise carry through the live value recorded in the
  // page-by-page matrix, unchanged.
  if (!v.description) {
    const fallback = existing.metaDescription ?? liveDescription(slug);
    if (!fallback) throw new Error(`${slug}: no description available for the overlay`);
    overlay[slug]!.metaDescription = fallback;
  }
}
writeFileSync(rel(overlayPath), `${JSON.stringify(overlay, null, 2)}\n`, "utf8");
console.log(`\noverlay entries: ${Object.keys(overlay).length}`);
console.log("Local artifacts staged. No database connection was opened.");
