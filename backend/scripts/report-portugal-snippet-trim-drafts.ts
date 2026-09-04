/**
 * READ-ONLY reporter for the Portugal snippet-trim drafts (ledger §38 items 11
 * and 12). Touches no database and writes nothing.
 *
 *   node --import tsx scripts/report-portugal-snippet-trim-drafts.ts
 *
 * For each proposed doctor description it re-derives the draft the gated
 * writer would build — same fields, same order — substitutes the trimmed
 * description, and prints the approval SHA-256 and confirmation token that
 * `patch-portugal-seo-metadata.ts --apply` would require. Those hashes are
 * what a clinician has to approve; nothing here grants that approval.
 *
 * Tool rows are reported for length only: `assertPortugalSeoApplyAuthorized`
 * refuses `targetKind === "tool"` outright ("managed in a static runtime
 * source"), so they cannot be published through this writer at all.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parsePortugalCsv } from "../src/content/portugal-seo-metadata-drafts.js";
import {
  loadPortugalSeoRemainingDrafts,
  portugalRemainingApprovalSha256,
  portugalRemainingConfirmationToken,
} from "../src/content/portugal-seo-remaining-drafts.js";

const DRAFTS_CSV = "seo/portugal/raw/snippet-trim-drafts-2026-09-03.csv";
const DISPLAY_BUDGET = { title: 60, description: 160 } as const;

const root = resolve(import.meta.dirname, "../..");
const [header, ...rows] = parsePortugalCsv(readFileSync(resolve(root, DRAFTS_CSV), "utf8"));
if (!header) throw new Error(`${DRAFTS_CSV} is empty`);
const col = (row: string[], name: string) => (row[header.indexOf(name)] ?? "").trim();

const live = new Map(loadPortugalSeoRemainingDrafts().map((draft) => [draft.url, draft]));

let overBudget = 0;
let resolved = 0;

for (const row of rows.filter((r) => r.length > 1)) {
  const url = col(row, "url");
  const field = col(row, "field");
  const current = col(row, "current_value");
  const proposed = col(row, "proposed_value");
  const budget = field === "title" ? DISPLAY_BUDGET.title : DISPLAY_BUDGET.description;

  // The CSV records lengths by hand; recompute them so a typo cannot hide.
  const recordedCurrent = Number(col(row, "current_length"));
  const recordedProposed = Number(col(row, "proposed_length"));
  if (recordedCurrent !== current.length || recordedProposed !== proposed.length) {
    throw new Error(`${url} ${field}: recorded lengths ${recordedCurrent}/${recordedProposed} != ${current.length}/${proposed.length}`);
  }
  if (proposed.length > budget) overBudget += 1;

  console.log(`${url}  [${field}]`);
  console.log(`  current  ${String(current.length).padStart(3)}  ${current.length > budget ? "OVER" : "ok  "}`);
  console.log(`  proposed ${String(proposed.length).padStart(3)}  ${proposed.length > budget ? "OVER" : "ok  "}  ${proposed}`);

  const target = live.get(url);
  if (col(row, "asset_kind") === "tool") {
    console.log("  target   static runtime source — NOT publishable through patch-portugal-seo-metadata.ts\n");
    continue;
  }
  if (!target) throw new Error(`${url} is not an eligible phase-two draft in the completion matrix`);
  if (field !== "meta description") throw new Error(`${url}: only meta description trims are drafted for doctor rows`);
  if (target.proposedDescription !== current) {
    throw new Error(`${url}: current_value does not match the matrix row the writer would read`);
  }
  resolved += 1;

  const next = { ...target, proposedDescription: proposed };
  console.log(`  target   ${target.targetKind}:${target.slug} (${target.assetKind}, locale ${target.locale}) — resolves to 1 record`);
  console.log(`  approval sha256 ${portugalRemainingApprovalSha256(next)}`);
  console.log(`  confirm  token  ${portugalRemainingConfirmationToken(next)}\n`);
}

console.log(`${resolved} doctor drafts resolve to exactly one eligible record each.`);
console.log(`${overBudget} proposed values still exceed the display budget.`);
console.log("No database connection was opened and nothing was written.");
