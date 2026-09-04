import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertCatalogue,
  assertCatalogueFingerprint,
  canonicalJson,
} from "./correct-published-ie-lab-hub-facts-2026-09.js";
import { assertHistoricalSeedIsDryRun } from "./applied/seed-ireland-labtests-brief.js";

test("Ireland lab hub correction is guarded and matches the live catalogue", () => {
  const updater = readFileSync(
    new URL("./correct-published-ie-lab-hub-facts-2026-09.ts", import.meta.url),
    "utf8",
  );
  const seed = readFileSync(
    new URL("./applied/seed-ireland-labtests-brief.ts", import.meta.url),
    "utf8",
  );

  assert.match(updater, /const APPLY = process\.argv\.includes\("--apply"\)/);
  assert.match(updater, /cmrisftmv0001v4jubuir7v5t/);
  assert.match(updater, /6c710759a26b50dac97ba587332704e9147eadca73e3d41570b6b74a5c6168ae/);
  assert.match(updater, /updatedAt: existing\.updatedAt/);
  assert.match(updater, /isolationLevel: "Serializable"/);
  assert.match(updater, /VERIFIED: Ireland lab hub facts corrected; product catalogue unchanged/);
  assert.match(seed, /from €57/);
  assert.match(seed, /4–6 weeks/);
  assert.doesNotMatch(seed, /const SEO_DESCRIPTION =[\s\S]*?from €89/);
});

test("JSON fingerprints ignore database object-key ordering", () => {
  assert.deepEqual(
    canonicalJson({ question: "Q", answer: "A" }),
    canonicalJson({ answer: "A", question: "Q" }),
  );
});

test("catalogue validation accepts the live range and rejects stale catalogue facts", () => {
  const catalogue = Array.from({ length: 14 }, (_, index) => ({
    priceCents: index === 0 ? 5_700 : 8_900,
    currencyCode: "EUR",
    resultsTimeline: index === 0 ? "2–3 working days" : "4–6 weeks",
  }));

  assert.doesNotThrow(() => assertCatalogue(catalogue));
  assert.throws(
    () => assertCatalogue(catalogue.map((row) => ({ ...row, resultsTimeline: "Up to 10 days" }))),
    /catalogue changed/,
  );
  assert.throws(
    () => assertCatalogueFingerprint(catalogue.map((row, index) => (
      index === 13 ? { ...row, resultsTimeline: "8 weeks" } : row
    ))),
    /fingerprint changed/,
  );
});

test("the historical Ireland lab seed cannot write to production again", () => {
  assert.doesNotThrow(() => assertHistoricalSeedIsDryRun([]));
  assert.throws(() => assertHistoricalSeedIsDryRun(["--apply"]), /retired/i);
});
