import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertCzechiaDoctorCountryCode,
  assertExclusiveCzechiaBlogCountries,
} from "./patch-czechia-profile-blog-tool-seo-drafts.js";

const source = readFileSync(
  new URL("./patch-czechia-profile-blog-tool-seo-drafts.ts", import.meta.url),
  "utf8",
);

test("promotion script preserves bios, bodies, credentials, FAQs and tool runtime copy", () => {
  assert.doesNotMatch(source, /doctorFaq\.(update|create|delete)/);
  assert.doesNotMatch(source, /faqReplacements\s*:/);
  assert.doesNotMatch(source, /writeFile|renameSync|copyFile/);
  assert.match(source, /doctorMarketTranslation\.updateMany/);
  assert.match(source, /blogPost\.updateMany/);
  assert.match(source, /assertCzechiaDoctorMetadataReadback\(draft, saved\.translations\[0\]\)/);
  assert.match(source, /assertCzechiaBlogMetadataReadback\(draft, saved\)/);
});

test("promotion script uses the register, exact source hashes and serializable transactions", () => {
  assert.match(source, /clinical-review-register\.csv/);
  assert.match(source, /findCzechiaClinicalRegisterRow/);
  assert.match(source, /assertCzechiaClinicalApproval/);
  assert.match(source, /expectedSourceSha256/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
  assert.match(source, /reviewer-doctor-id/);
  assert.match(source, /approved-sha256/);
  assert.match(source, /credentials: source\.doctor\.credentials/);
  assert.match(source, /assignments: source\.doctor\.assignedServices/);
  assert.match(source, /availabilities: source\.doctor\.availabilities/);
  assert.match(source, /editorialChecklist: source\.editorialChecklist/);
});

test("tool drafts remain preview-only because the Czech JSON source is shared by other markets", () => {
  assert.match(source, /country-scoped frontend overlay/i);
  assert.match(source, /assetKind === "tool"/);
});

test("doctor promotion rejects a DoctorCountry row outside Czechia", () => {
  assert.match(source, /country: \{ select: \{ code: true \} \}/);
  assert.match(source, /assertCzechiaDoctorCountryCode\(source\.country\)/);
  assert.doesNotThrow(() => assertCzechiaDoctorCountryCode({ code: "CZ" }));
  assert.throws(
    () => assertCzechiaDoctorCountryCode({ code: "ie" }),
    /doctor market must belong exclusively to Czechia/i,
  );
});

test("global blog metadata promotion rejects posts shared with another country", () => {
  assert.match(source, /assertExclusiveCzechiaBlogCountries\(source\.countries\)/);
  assert.doesNotThrow(() => assertExclusiveCzechiaBlogCountries([{ country: { code: "cz" } }]));
  assert.throws(
    () =>
      assertExclusiveCzechiaBlogCountries([
        { country: { code: "cz" } },
        { country: { code: "ie" } },
      ]),
    /blog must be mapped exclusively to Czechia/i,
  );
  assert.throws(
    () => assertExclusiveCzechiaBlogCountries([{ country: { code: "ie" } }]),
    /blog must be mapped exclusively to Czechia/i,
  );
});
