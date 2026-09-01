import assert from "node:assert/strict";
import test from "node:test";

import {
  loadPortugalSeoMetadataDrafts,
  portugalSeoApprovalSha256,
  portugalSeoConfirmationToken,
} from "./portugal-seo-metadata-drafts.js";

test("Portugal SEO metadata drafts match the reviewed 28-row matrix", () => {
  const drafts = loadPortugalSeoMetadataDrafts();

  assert.equal(drafts.length, 28);
  assert.equal(new Set(drafts.map(({ url }) => url)).size, drafts.length);
  assert.equal(new Set(drafts.map(({ primaryKeyword }) => primaryKeyword)).size, drafts.length);
  assert.equal(drafts.filter(({ targetKind }) => targetKind === "home").length, 1);
  assert.equal(drafts.filter(({ targetKind }) => targetKind === "service").length, 22);
  assert.equal(drafts.filter(({ targetKind }) => targetKind === "doctor").length, 4);
  assert.equal(drafts.filter(({ targetKind }) => targetKind === "tool").length, 1);

  for (const draft of drafts) {
    assert.equal(draft.locale, "PT");
    assert.match(draft.url, /^https:\/\/www\.myglobalhealth\.online\/portugal\/pt(?:\/|$)/);
    assert.ok(draft.primaryKeyword.trim());
    assert.equal(draft.secondaryKeywords.includes(draft.primaryKeyword), false);
    assert.match(portugalSeoApprovalSha256(draft), /^[a-f0-9]{64}$/);
    assert.match(portugalSeoConfirmationToken(draft), /^PT-SEO-[A-F0-9]{12}$/);

    if (draft.disposition === "proposed") {
      assert.ok(draft.proposedTitle);
      assert.ok(draft.proposedDescription);
      assert.doesNotMatch(
        `${draft.proposedTitle} ${draft.proposedDescription}`,
        /mesmo dia|disponibilidade garantida|garantid[ao]|consulta imediata/i,
      );
    } else {
      assert.equal(draft.proposedTitle, null);
      assert.equal(draft.proposedDescription, null);
    }
  }
});

test("approval hashes bind the exact URL, target and proposed copy", () => {
  const draft = loadPortugalSeoMetadataDrafts().find(
    ({ url }) => url.endsWith("/services/consulta-medica"),
  );
  assert.ok(draft);

  const currentHash = portugalSeoApprovalSha256(draft);
  const changedCopy = { ...draft, proposedTitle: `${draft.proposedTitle} alterado` };
  const changedTarget = { ...draft, targetKind: "home" as const };

  assert.notEqual(portugalSeoApprovalSha256(changedCopy), currentHash);
  assert.notEqual(portugalSeoApprovalSha256(changedTarget), currentHash);
});
