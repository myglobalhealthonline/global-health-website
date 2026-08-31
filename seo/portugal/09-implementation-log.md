# Portugal implementation log

> **Dated evidence, not current operational status.** The canonical global ledger at
> `docs/plans/seo-control-state.md` owns current status, priorities and next actions.

Date: 2026-08-31.

## Implemented

### Localized shared doctor-card strings

Root cause: `frontend/components/cards/DoctorCard.tsx` contained two English literals used across every public locale: the crawlable overlay link text and the credentials heading.

Implementation:

- extended `DoctorCardI18n` with `viewProfileAria` and `credentialsLabel`;
- reused the existing `common.doctors.viewProfileAria` locale key;
- added one `credentialsLabel` key to all six common locale bundles;
- resolved `{name}` in the shared component;
- kept caller-provided `viewProfileAriaLabel` as the override;
- added a focused static-render test that failed before and passed after the fix;
- updated affected typed test fixtures.

No new dependency, helper layer or framework file was added.

## Research artifacts

Created the complete `seo/portugal/` package: 8,106 raw keyword rows, a 1,647-row normalized/relevance-gated master, 177 business-fit gaps, URL map, competitor inventories, SERP export, backlink opportunities, 24 briefs, technical/measurement/roadmap documents and a 24-row page/file clinical review register. The final gate removed 143 non-medical, unsupported, non-Portugal administrative or employment terms that had collided with `receita`/`consulta` seeds; the removals are preserved in `raw/keyword-exclusions-final.csv`.

## Deliberately not implemented

- No title/H1 rewrite on the driving-certificate page: fresh indexing and SERP evidence points to an authority wall.
- No new page, city page, doorway page, mass FAQ or thin programmatic route.
- No redirect/noindex/canonical/robots/sitemap change without a reproduced defect.
- No production database write. `backend/.env` points to production; hero CTA, roles, image metadata and registration divisions need reviewed content-data changes.
- No prescribing, booking, patient, clinician-credential or service-availability logic changed.
- No rank tracker or recurring paid OpenSEO job created.

## Data changes still requiring approval/review

1. Portugal homepage CTA → verified pt-PT label.
2. Missing Portuguese clinician role/specialty translations.
3. Missing Portuguese image title/description/alt source values.
4. Missing Portuguese registration-division translations.
5. Certificate/leave/prescription content claims listed in `clinical-review-register.csv`.

## Verification

- RED: focused DoctorCard test failed on English `View profile for …`.
- GREEN: DoctorCard + DoctorTeamTemplate focused tests passed (5/5).
- Locale-key validation passed for six locales across 16 namespaces.
- Frontend typecheck initially exposed one typed test fixture missing the new key; after that fixture was fixed, frontend and backend package typechecks passed.
- Touched TypeScript/React files passed the frontend ESLint script.
- Full frontend suite passed: 96 files, 1,136 tests passed and 5 skipped.
- The production build compiled and completed its TypeScript phase. Static generation could not complete because the configured content backend was unreachable; even the explicit degraded-build path repeatedly retried `/api/countries`, `/api/assets` and `/api/public/reviews-config`. It was stopped at 52/951 pages after fallback behavior was proven. The strict baseline build fails on the same external dependency by design.
- No formatter script exists in the frontend or backend package; no formatter result is claimed.

## 2026-08-31 follow-up evidence refresh

Added `seo/portugal/raw/focused-refresh-2026-08-31-followup.json` and appended matching OpenSEO call-log rows. The refresh reconfirmed the active holds instead of expanding implementation scope:

- driving-certificate page remains submitted/indexed and recrawled on 2026-08-31, so no metadata rewrite was authorized;
- the remaining English Portugal homepage CTA is still production content, not a repository fallback;
- GA4 measurement health still exposes only `purchase` and `begin_booking` as key events;
- no new redirect, canonical, robots, sitemap or hreflang change was justified.

The existing `backend/scripts/patch-portugal-home-hero-language.ts` now targets the remaining `PageContentTranslation.ctaLabel` gap through `backend/src/content/portugal-home-cta-patch.ts`. It defaults to dry-run, requires `--apply --confirm=PT-HOME-CTA-2026-08-31 --confirm-host=<database-host>`, checks active Portugal plus the published HOME/PT row, matches the exact old CTA, uses an `updatedAt` optimistic guard in a Serializable transaction and verifies the saved value. `backend/scripts/patch-portugal-home-hero-language.test.ts` recorded RED before implementation and then passed behavior checks for dry-run, confirmation and host rejection, target mismatch, optimistic conflict, failed readback and the exact write predicate. The updater was not run against production.

The Portugal route-contained crawl fetched 75 sitemap URLs with 75 HTTP 200 responses and no missing title, canonical, hreflang or single-H1 checks in the bounded result. README counts were corrected from the reconciled files to 14 P0, 60 P1, 853 P2, 720 P3, 1,598 pt-PT and 49 en-PT rows. The market-hub brief was aligned with the existing URL map so `/portugal/pt` owns brand/market intent while `/services/consulta-medica` retains generic online-consultation intent.

The final deslop pass covered every rewritten market-hub field and the CTA. The original brief assigned `médico online Portugal` to the hub; the SEO draft reassigned the hub to the existing brand cluster and kept generic consultation intent on its service URL; the final copy removed filler, a broken competitor sentence and an over-broad H1. Fact comparison found no changed credential, specialty, registration, language, location, medical term, care limitation or clinical claim. The hub draft scored 44/50: directness 9, rhythm 8, reader trust 9, authenticity 9 and density 9. It remains an editorial brief pending clinical/content approval, not published page copy.

Final validation passed the behavioral updater test (1/1), targeted TypeScript check, touched-file ESLint, backend package type-check and backend production build. The first source-text-only test was rejected during review and replaced before completion. Code, TypeScript and security re-reviews reported no remaining actionable findings; the TypeScript review's pool-cleanup finding was fixed by using the repository's `disconnectDb()` helper. No integration or E2E database test ran because the production updater was deliberately not executed.

## 2026-09-01 page-by-page Portugal optimization

Reviewed the complete approved ownership set: 24 mapped public pages with content briefs plus four canonical public doctor profiles. The 28-row `content-completion-matrix.csv` records the original live metadata, one unique primary keyword per URL, focused secondary terms, final editorial metadata, retained content fields, review state and implementation state. Low-volume terms remain in the map or supporting brief where relevant. Inventory rows outside this set are aliases, legacy/noncanonical URLs, booking/legal/system pages or pages without approved Portugal keyword ownership; none was converted into a new service or location page.

All 24 briefs now carry exactly one primary keyword. The completion matrix and briefs are synchronized, except that the driving-certificate brief deliberately uses a retain-current sentinel: its IMT and Group 1/2 claims need official verification before any rewrite. The four doctor-profile titles were retained and concise meta-description drafts were prepared from the existing profile records. No biography, qualification, registration, specialty, location, language, visible service description, FAQ, internal link, H1 or CTA was changed.

The final deslop pass covered every rewritten title and meta-description. It removed repetitive booking language, static Medicare claims, volatile same-day/price language and unsupported specialist wording. Comparison against the original confirms that the implemented locale-title change introduces no factual claim and that no visible clinical or doctor-profile facts changed. Formal factual verification remains `no` for all 28 rows because every page still requires the named clinical, credential or official-source review in `clinical-review-register.csv`; publication remains blocked.

The live 28-URL verification returned HTTP 200 with the exact canonical, `pt-PT` hreflang, index/follow state, structured data and Portugal booking CTA on every page. No technical SEO change was justified. The only page-copy implementation is the pt-PT blood-pressure tool title in `frontend/locales/pt/tools.json`; it is not deployed. Historical bulk service and doctor import inputs were deliberately left unchanged because their importers rewrite wider clinical/profile surfaces and are unsafe for narrow metadata publication. Neither importer nor the guarded homepage updater was executed.

Validation passed: 28 matrix rows with the requested 16 columns; 24 synchronized briefs; 24 unique map primaries; 28 unique matrix primaries; 28 blocked clinical-review rows; frontend and backend package type-checks; locale-key validation for six locales across 16 namespaces; and focused tool registry/market tests (24/24). No push, deploy, production write or remote publication occurred; repository changes were committed only after completion and review.
