import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertPortugalClinicalApproval,
  readPortugalClinicalReviewRecord,
} from "./portugal-clinical-approval.js";
import {
  parsePortugalSeoRemainingDrafts,
  portugalRemainingApprovalSha256,
} from "./portugal-seo-remaining-drafts.js";

const matrix = readFileSync(
  resolve(__dirname, "../../../seo/portugal/page-by-page-completion-matrix.csv"),
  "utf8",
);
const clinicalRegister = readFileSync(
  resolve(__dirname, "../../../seo/portugal/clinical-review-register.csv"),
  "utf8",
);
const factRegister = readFileSync(
  resolve(__dirname, "../../../seo/portugal/doctor-profile-fact-register.csv"),
  "utf8",
);

const expectedAssets = [
  "/portugal/pt/blog/doenca-mao-pe-boca-sinais-e-tratamento",
  "/portugal/pt/doctors",
  "/portugal/pt/doctors/beatriz-carvalho",
  "/portugal/pt/doctors/dr-ana-leal-neto",
  "/portugal/pt/doctors/dr-egas-moura",
  "/portugal/pt/doctors/dr-joana-branco-maia",
  "/portugal/pt/doctors/dr-joao-de-oliveira-e-silva",
  "/portugal/pt/doctors/dr-lucas-alvarenga-berto",
  "/portugal/pt/doctors/dr-margarida-andrade",
  "/portugal/pt/doctors/dr-pedro-santos",
  "/portugal/pt/doctors/dr-ruben-pereira",
  "/portugal/pt/doctors/dr-rui-diogo-rodrigues",
  "/portugal/pt/doctors/dra-ana-varges-gomes",
  "/portugal/pt/doctors/dra-nadia-cavaco",
  "/portugal/pt/gp-consultation-online",
  "/portugal/pt/health/infecoes-respiratorias",
  "/portugal/pt/see-a-specialist",
] as const;

test("parses exactly the 17 phase-two Portugal targets from the completion matrix", () => {
  const drafts = parsePortugalSeoRemainingDrafts(matrix);

  assert.deepEqual(drafts.map(({ assetPath }) => assetPath), expectedAssets);
  assert.equal(new Set(drafts.map(({ assetPath }) => assetPath)).size, 17);
  assert.deepEqual(
    Object.fromEntries(
      ["doctor", "page_content", "seo_landing", "blog"].map((kind) => [
        kind,
        drafts.filter(({ assetKind }) => assetKind === kind).length,
      ]),
    ),
    { doctor: 12, page_content: 3, seo_landing: 1, blog: 1 },
  );
});

test("keeps every proposed title and description free of unsafe availability promises", () => {
  const drafts = parsePortugalSeoRemainingDrafts(matrix);

  for (const draft of drafts) {
    const copy = `${draft.proposedTitle} ${draft.proposedDescription}`;
    assert.ok(draft.primaryKeyword.trim(), draft.assetPath);
    assert.ok(draft.proposedTitle.trim(), draft.assetPath);
    assert.ok(draft.proposedDescription.trim(), draft.assetPath);
    assert.doesNotMatch(
      copy,
      /mesmo dia|no próprio dia|ainda hoje|consulta imediata|sem espera|disponibilidade garantida|garantid[ao]|\bcura\b|diagnóstico definitivo|100%|sem risco/i,
      draft.assetPath,
    );
  }
});

test("approval hashes bind the exact proposed copy and target", () => {
  const drafts = parsePortugalSeoRemainingDrafts(matrix);
  const hashes = drafts.map(portugalRemainingApprovalSha256);
  const draft = drafts[0]!;
  const approvedHash = hashes[0]!;

  assert.equal(new Set(hashes).size, 17);
  assert.ok(hashes.every((hash) => /^[a-f0-9]{64}$/.test(hash)));
  assert.notEqual(
    portugalRemainingApprovalSha256({
      ...draft,
      proposedTitle: `${draft.proposedTitle} alterado`,
    }),
    approvedHash,
  );
  assert.notEqual(
    portugalRemainingApprovalSha256({
      ...draft,
      proposedDescription: `${draft.proposedDescription} alterado`,
    }),
    approvedHash,
  );
  assert.notEqual(
    portugalRemainingApprovalSha256({
      ...draft,
      assetPath: "/portugal/pt/blog/outro-artigo",
    }),
    approvedHash,
  );
});

/**
 * The register records these rows across two review sessions by the same
 * clinician, not one: the 2026-09-02 phase-two metadata review, and the
 * 2026-09-03 snippet-trim batch that re-approved the eleven doctor profiles
 * with their shortened meta descriptions (ledger §41.2, §42.4).
 *
 * Both timestamps are pinned on purpose. Asserting the register against itself
 * would prove nothing; pinning means a third review session has to be a
 * deliberate edit here rather than something a register change slips past.
 */
const PHASE_TWO_REVIEW = "2026-09-02T01:58:00+02:00";
const SNIPPET_TRIM_REVIEW = "2026-09-03T17:59:00+01:00";
/** Any instant after the most recent pinned session; bump it when one is added. */
const reviewComparisonTime = new Date("2026-09-04T00:00:00.000Z");

test("clinical register approves 16 exact hashes and keeps the conflicted profile blocked", () => {
  for (const draft of parsePortugalSeoRemainingDrafts(matrix)) {
    const record = readPortugalClinicalReviewRecord(clinicalRegister, draft.asset);
    const approvedHash = portugalRemainingApprovalSha256(draft);
    if (draft.assetPath.endsWith("/doctors/beatriz-carvalho")) {
      assert.equal(record.publish_status, "blocked_pending_review", draft.assetPath);
      assert.match(record.notes, new RegExp(`Candidate SHA-256: ${approvedHash}\\.`));
      assert.equal(record.approved_sha256, "", draft.assetPath);
      continue;
    }
    const approved = assertPortugalClinicalApproval(clinicalRegister, {
      asset: draft.asset,
      approvedSha256: approvedHash,
      factRegisterCsv: factRegister,
      now: reviewComparisonTime,
    });
    assert.equal(approved.reviewer_name, "Dr Tiago Miguel Figueira", draft.assetPath);
    assert.equal(approved.reviewer_doctor_id, "cmp5r0if3002kssjug743x0p6", draft.assetPath);
    // Only the doctor profiles went through the snippet-trim batch; the blog,
    // landing and page-content rows still carry the phase-two approval.
    assert.equal(
      approved.reviewed_at,
      draft.assetKind === "doctor" ? SNIPPET_TRIM_REVIEW : PHASE_TWO_REVIEW,
      draft.assetPath,
    );
  }
});
