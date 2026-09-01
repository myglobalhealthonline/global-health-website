import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  PORTUGAL_DISCLAIMER_SAFETY_PATCH,
  PORTUGAL_FAQ_SAFETY_PATCHES,
  PORTUGAL_SAFETY_PATCHES,
  portugalFaqSafetyPatchSha256,
  portugalFaqSafetyPatchToken,
} from "./portugal-faq-safety-patches.js";

test("Portugal FAQ safety patches replace only deprecated crisis contacts", () => {
  assert.equal(PORTUGAL_FAQ_SAFETY_PATCHES.length, 5);
  assert.equal(PORTUGAL_SAFETY_PATCHES.length, 6);
  assert.equal(
    new Set(PORTUGAL_FAQ_SAFETY_PATCHES.map((patch) => patch.id)).size,
    PORTUGAL_FAQ_SAFETY_PATCHES.length,
  );

  for (const patch of PORTUGAL_FAQ_SAFETY_PATCHES) {
    assert.match(patch.originalAnswer, /1024|808 200 204/);
    assert.doesNotMatch(patch.proposedAnswer, /1024|808 200 204/);
    assert.match(patch.proposedAnswer, /1411/);
    assert.match(patch.proposedAnswer, /112/);
    assert.deepEqual(patch.evidenceUrls, [
      "https://portugal.gov.pt/gc25/comunicacao/noticias/nova-linha-de-prevencao-do-suicidio-entra-em-funcionamento",
    ]);
    assert.match(portugalFaqSafetyPatchSha256(patch), /^[a-f0-9]{64}$/);
    assert.match(portugalFaqSafetyPatchToken(patch), /^PT-FAQ-SAFETY-[A-F0-9]{12}$/);
  }
});

test("Portugal disclaimer safety patch replaces the three retired contacts", () => {
  assert.equal(PORTUGAL_DISCLAIMER_SAFETY_PATCH.fragments.length, 3);
  assert.equal(
    PORTUGAL_DISCLAIMER_SAFETY_PATCH.fragments.slice(0, 2).reduce(
      (total, fragment) => total + fragment.expectedOccurrences,
      0,
    ),
    3,
  );
  for (const fragment of PORTUGAL_DISCLAIMER_SAFETY_PATCH.fragments.slice(0, 2)) {
    assert.match(fragment.original, /808 200 204/);
    assert.doesNotMatch(fragment.proposed, /808 200 204|Linha de Vida Segura/);
    assert.match(fragment.proposed, /1411/);
  }
  assert.deepEqual(PORTUGAL_DISCLAIMER_SAFETY_PATCH.publication, {
    expectedVersion: 1,
    proposedVersion: 2,
    expectedPublishedAt: "2026-07-01T17:39:29.439Z",
    proposedPublishedAt: "2026-09-01T17:58:44.337Z",
  });
});

test("Portugal crisis-copy sources do not reintroduce deprecated contacts", () => {
  const root = process.cwd().endsWith("backend") ? resolve(process.cwd(), "..") : process.cwd();
  const doctorSource = readFileSync(
    resolve(root, "backend/scripts/data/portugal-doctors-datasheet.ts"),
    "utf8",
  );
  const heldBiographyContacts = doctorSource.match(
    /<p><strong>Nota importante:<\/strong>[^<]+SNS24 através do 1024[^<]+<\/p>/g,
  ) ?? [];
  assert.equal(heldBiographyContacts.length, 4);
  assert.equal(doctorSource.match(/1024/g)?.length, 4);
  assert.doesNotMatch(doctorSource, /Linha de Vida Segura|808 200 204|SNS24 \(1024\)/);

  const source = [
    "backend/scripts/data/portugal-service-content.json",
    "backend/scripts/import-portugal-disclaimer.ts",
  ].map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");

  assert.doesNotMatch(source, /Linha de Vida Segura|808 200 204|1024/);
  assert.match(source, /1411/);
});
