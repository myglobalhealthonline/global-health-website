import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  TEAM_BYLINE,
  normalizeEmbeddedAuthorByline,
} from "./set-blog-authors-to-medical-team-2026-08.js";

const SCRIPT_URL = new URL("./set-blog-authors-to-medical-team-2026-08.ts", import.meta.url);

test("the production byline migration preserves clinical relationships", async () => {
  const source = await readFile(SCRIPT_URL, "utf8");

  assert.equal(TEAM_BYLINE, "Global Health Medical Team");
  assert.match(source, /data:\s*{\s*authorDisplayName:\s*TEAM_BYLINE\s*}/);
  assert.match(source, /embeddedUpdates\.length > EXPECTED_MAX_EMBEDDED_AUTHOR_CARDS/);
  assert.doesNotMatch(source, /data:\s*{[^}]*authorDoctorId/s);
  assert.doesNotMatch(source, /data:\s*{[^}]*reviewerDoctorId/s);
  assert.match(source, /authorDoctorId:\s*true/);
  assert.match(source, /reviewerDoctorId:\s*true/);
  assert.match(source, /clinical relationships changed/i);
});

test("embedded article author cards use the team without changing review copy", () => {
  const original =
    '<div class="hero-author"><div aria-hidden="true" class="hero-author-mark">TF</div>' +
    '<div><strong>Dr Tiago Figueira</strong><span>Medical Council 12345</span></div></div>' +
    '<span class="hero-review-line">Clinically reviewed by Dr Reviewer</span>';

  const normalized = normalizeEmbeddedAuthorByline(original);

  assert.match(normalized, /<strong>Global Health Medical Team<\/strong>/);
  assert.match(normalized, /hero-author-mark">GH<\/div>/);
  assert.doesNotMatch(normalized, /Dr Tiago Figueira|Medical Council 12345/);
  assert.match(normalized, /Clinically reviewed by Dr Reviewer/);
  assert.equal(normalizeEmbeddedAuthorByline(normalized), normalized);
});
