import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EXPECTED_DRAFT_IDS,
  TEAM_BYLINE,
  inspectDraftAuthorRows,
  parseApplyFlag,
} from "./clear-draft-blog-author-doctors-2026-08.js";

test("draft author contract uses the exact six Week 2 records and team byline", () => {
  assert.equal(TEAM_BYLINE, "Global Health Medical Team");
  assert.equal(EXPECTED_DRAFT_IDS.size, 6);
});

test("draft author preflight accepts the team byline and reports linked author doctors", () => {
  const rows = [...EXPECTED_DRAFT_IDS].map(([id, slug]) => ({
    id,
    slug,
    status: "DRAFT",
    authorDisplayName: TEAM_BYLINE,
    authorDoctorId: `${id}-doctor`,
    reviewerDoctorId: `${id}-reviewer`,
  }));

  assert.deepEqual(inspectDraftAuthorRows(rows), []);
  assert.match(
    inspectDraftAuthorRows([{ ...rows[0]!, authorDisplayName: "Named Doctor" }, ...rows.slice(1)]).join("\n"),
    /author display name/i,
  );
  assert.match(
    inspectDraftAuthorRows([{ ...rows[0]!, status: "PUBLISHED" }, ...rows.slice(1)]).join("\n"),
    /not DRAFT/i,
  );
});

test("draft author migration is dry-run by default and mutates only author fields", () => {
  assert.equal(parseApplyFlag([]), false);
  assert.equal(parseApplyFlag(["--apply"]), true);

  const source = readFileSync("scripts/clear-draft-blog-author-doctors-2026-08.ts", "utf8");
  assert.match(source, /authorDisplayName: TEAM_BYLINE/);
  assert.match(source, /authorDoctorId: null/);
  assert.match(source, /FOR UPDATE/);
  assert.match(source, /assertSnapshotsPreserved/);
  assert.doesNotMatch(source, /reviewerDoctorId:\s*null/);
  assert.doesNotMatch(source, /blogTranslation\.(update|updateMany)/);
  assert.doesNotMatch(source, /status:\s*"PUBLISHED"/);
});
