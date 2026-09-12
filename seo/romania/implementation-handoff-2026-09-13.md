# Romania SEO implementation handoff

Historical preparation brief. The approved implementation is complete in commit
`a560643b`; all 20 groups covering 114 pages are live and publicly verified.
See `09-implementation-log.md` and canonical ledger §55.3 for completion evidence,
remaining dependencies and measurement dates. Do not repeat the rollout below.

Continue from research commit `39656572` (`docs(seo): complete Romania research
and FAQ draft package`). The commit is verified in Git. This handoff is a dated
execution brief; `docs/plans/seo-control-state.md` section 55 remains the operational
source of truth. Preparation is complete. Production implementation is not recorded.

## Objective and read order

Implement the prepared Romania service metadata and FAQ changes across ro, en, cs,
de, es and pt, plus targeted doctor FAQ/name corrections. Prioritize staffed care.
The owner authorized completing the work; proceed with reversible implementation
and preflight without repeating the discovery interview. This handoff does not
constitute clinical sign-off or prove that any production write has happened.

Read `CLAUDE.md`, `seo/README.md`, `docs/plans/seo-handover-codex.md`, ledger section
55, then these country artifacts:

- [Country index](README.md) and [technical findings](07-technical-audit.md).
- [Completion matrix](page-by-page-completion-matrix.csv) and [review register](clinical-review-register.csv).
- [Service drafts](content-briefs/service-drafts.json) and [doctor drafts](content-briefs/doctor-drafts.json).
- [Supply matrix](doctor-service-language-matrix.csv), [facts](doctor-profile-fact-register.csv) and [FAQ coverage](faq-coverage.csv).
- [Architecture/link decisions](06-proposed-site-architecture.md), [preparation receipt](09-implementation-log.md) and [measurement method](10-measurement-plan.md).

Use the repository deslop skill for changed prose. Preserve precise clinical scope;
do not claim human authorship. The numbered artifacts match prior country structure,
but their existence does not mean Romania has been deployed or medically approved.

## Established facts; refresh before writes

There are 327 discovered URLs: 317 sitemap pages, nine working noindexed legal
translations and one broken linked destination. The matrix gives every URL a
disposition; retained bodies have not all been rewritten or clinically certified.

All 102 service variants lack native ServiceFaq rows. However, 22 have embedded
FAQ sections containing 187 questions; only 80 have no visible FAQs. All 18 doctor
variants already have six native FAQs. Do not build a new FAQ renderer.

Prepared candidates: 96 staffed service variants with four FAQs each (384 answers),
18 doctor variants with 24 targeted FAQ corrections and five Palaga title typo fixes.
The smaller replacement FAQ sets deliberately omit unsupported old claims; inspect
the saved removed sections before applying. Non-FAQ service bodies are retained.

Public roster at collection: Palaga provides specialist pediatrics, Bica neurology,
and Brindus 14 GENERAL services. All list Romanian/English consultation languages.
Page locale must never imply a doctor speaks that language. Appointment dates in
snapshots are transient evidence, not evergreen copy.

## Execute in this order

1. Check current Git status/log and ledger for intervening implementation. Preserve
   concurrent changes; stage only explicit task paths. No unprompted merge/push.
   At handoff, `.claude/launch.json` and `frontend/next-env.d.ts` are unrelated edits.
2. Verify OpenSEO free connection reads and refresh only the relevant GSC/production
   evidence required by repository rules. Use Romania location 2642 / ro, not the
   project's Ireland default. Existing keyword research is sufficient to start;
   do not rerun a full-site audit or buy another broad research batch.
3. Obtain authenticated read-only storage access through the established secret
   configuration. `backend/.env` was absent during research; recheck availability.
   Never request credentials in chat or commit them. Public API evidence came from
   `https://api.myglobalhealth.online`, using country code ro and uppercase locales.
4. Compare current source records with each draft's before-values and public-source
   fingerprint. Export the actual stored rows, IDs, base language, locale fallback,
   hidden/unpublished translations, FAQ associations and cross-country usage.
   A public projection hash is not a complete database snapshot. Stop affected rows
   on drift; reconcile them explicitly instead of overwriting newer work.
5. Reuse `backend/scripts/patch-czechia-seo-service-drafts.ts` as the guarded-updater
   pattern. Trace `backend/src/services/service-faq.service.ts`, the service/doctor
   resolvers and Prisma models before selecting the mutation. Extend existing
   ownership where practical; do not introduce a new CMS or FAQ abstraction.
6. Produce a dry-run manifest and rollback snapshot with exact field/row changes.
   Review changed clinical and document-eligibility claims using actual applicable
   publication rules. Record real approvals against exact draft hashes when required;
   never manufacture reviewer identity or review dates. Article-specific byline rules
   are not automatically service/profile rules: establish applicability. If a gate
   needs user action, present the concrete diff and exact rule after finishing all
   independent preparation; keep other eligible work moving.
7. First batch: `consultatie-pediatrie`, `consultatie-neurologie`, and the Palaga/Bica
   profile corrections, across all six locales. Then the 14 staffed GENERAL services
   and Brindus's booking-language corrections. Preserve prices, duration, assignments,
   credentials, slugs, publication/indexation state and booking behavior.
8. For each service, migrate all six locale candidates coherently. Remove only the
   exact recorded terminal embedded FAQ block while inserting corresponding native
   ServiceFaq/ServiceFaqTranslation data in the same transaction. Preserve unaffected
   rows. Do not duplicate embedded/native answers, blindly replace whole relations,
   or assume the base FAQ language from the page locale. Verify the resolved locale.
9. DoctorFaq is shared by doctor+locale across countries. Recheck associations before
   editing IDs in `faqPatches`. Preserve all untouched questions. If a country-specific
   answer would affect another market, assess the existing overlay precedent in
   `frontend/lib/content/czechia-approved-doctor-faqs.ts` before choosing a solution.
10. Correct the obsolete English `medic-online-romania` body offer/link pointing to
    `/romania/en/services/sick-note-romania` (404). This fix is a separate exact diff:
    it is not already removed by the service FAQ drafts. Remove the unsupported
    offer/link; do not recreate it or redirect to unrelated care. Prepare contextual
    service/profile/hub links from the architecture decisions, verifying each target
    and clinician assignment. These link edits also require implementation diffs.
11. Assess remaining matrix rows by their recorded evidence and disposition. Retention
    is valid; do not rewrite legal copy, expand blog cohorts or manufacture six-locale
    hreflang clusters to make every row look changed. Verify the six booking routes
    in a browser if investigating their missing server-shell H1; no booking defect
    has been demonstrated. Do not create a real paid appointment for testing.

## Holds and boundaries

- `evaluare-durere`: all six variants lack an assigned approved doctor. Hold promotion
  and new bookable copy. Existing same-day specialist wording needs an explicit,
  evidence-based operational disposition; do not silently unpublish or change routing.
- Brindus: Romanian family-doctor title conflicts with anesthetist descriptions.
  Obtain authoritative specialty evidence before harmonizing titles/credentials.
- Untouched biographies, training and publication claims are not independently
  verified by `registrationVerified=true`. Do not certify or expand them.
- No named clinical approvals were obtained during research. No guaranteed same-day
  care, Spanish consultation, prescription, sick leave or reimbursement claims.
- Keep intentional legal noindex and actual alternate clusters. No outreach, paid
  placements, recurring trackers or ordinary-page Indexing API submissions.

## Proof and completion

Existing offline checks, run from the repository root:

```powershell
node seo/romania/collect-public-inventory.mjs --check
node seo/romania/build-package.mjs
git diff --check
```

The build regenerates derived evidence from saved snapshots; it does not update
production. Do not rerun it over newly maintained rollout status without inspecting
what it overwrites. Add the smallest runnable check for the actual updater: prove
drift refusal, locale/row preservation, atomic migration and safe repeat behavior.
Run relevant package checks for product code changes using pnpm per package.

After each applied batch, save the mutation/rollback receipt and verify public
HTTP status, title/meta/H1, intended FAQs, visible FAQ/schema equivalence, absence
of old embedded duplicates, real alternates and unchanged supply/pricing. A database
success is not public-render proof. Store only appropriately redacted evidence.

Update the canonical ledger and dated implementation receipt before proceeding to
the next batch. Mark each matrix row applied/verified, retained with reason, or held
with its concrete dependency. Only mark complete when readback succeeds. Record
commit/deployment identifiers where relevant; database changes need their own receipts.

At actual publication, register cohort dates and 30/60/90-day measurement gates in
the ledger; retain the September 24 global inspection cadence unless newer ledger
evidence supersedes it. Use complete matched GSC windows and separate commercial
service/profile outcomes from tools/articles. Current baseline: service 7 clicks /
332 impressions versus 4 / 416 in the preceding 28 days. Ranking/booking gains are
not guaranteed. End with what is live, proof, holds and the next concrete action.
