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

The final deslop pass covered every rewritten title and meta-description. It removed repetitive booking language, static Medicare claims, volatile same-day/price language and unsupported specialist wording. Comparison against the original confirms that no visible clinical or doctor-profile facts changed. Formal factual verification remains `no` for all 28 rows because every page still requires the named clinical, credential or official-source review in `clinical-review-register.csv`; publication remains blocked.

The live 28-URL verification returned HTTP 200 with the exact canonical, `pt-PT` hreflang, index/follow state, structured data and Portugal booking CTA on every page. No technical SEO change was justified. Historical bulk service and doctor import inputs were deliberately left unchanged because their importers rewrite wider clinical/profile surfaces and are unsafe for narrow metadata publication. Neither importer nor the guarded homepage updater was executed.

Validation passed: 28 matrix rows with the requested 16 columns; 24 synchronized briefs; 24 unique map primaries; 28 unique matrix primaries; 28 blocked clinical-review rows; frontend and backend package type-checks; locale-key validation for six locales across 16 namespaces; and focused tool registry/market tests (24/24). No push, deploy, production write or remote publication occurred; repository changes were committed only after completion and review.

## 2026-09-01 Portugal content-owner approval and publication gate

The Portugal content owner approved repository implementation for all 28 eligible pages in the Codex task. The reviewer name was not supplied. This approval covers the editorial recommendations; it does not satisfy the clinical, credential or official-source reviews listed in `clinical-review-register.csv`.

All 28 rows remain `blocked_pending_review`, with factual verification recorded as `no`. The proposed metadata and copy remain in the existing briefs and completion matrix. No second manifest or publisher was added. The pt-PT blood-pressure title in `frontend/locales/pt/tools.json` was restored to its pre-optimization value so an unrelated deployment cannot publish an unapproved recommendation. The guarded homepage CTA updater was not run.

No CMS write, production write, deployment, push or remote publication occurred.

## 2026-09-01 Ireland-parity implementation pass

The Ireland workflow was used as the operational reference: complete public-page inventory, one primary owner per URL, explicit current/proposed copy, guarded production targeting, clinical sign-off, readback verification and a canonical ledger update.

The live Portugal scope now contains 75 canonical pt-PT sitemap URLs: 23 services, 16 doctor profiles, seven tools, four health guides, seven health articles and 18 hub, static or legal pages. `page-by-page-completion-matrix.csv` records all 75 with one unique primary keyword, focused secondary variants, live title, meta description and H1, final title/meta disposition, deslop status, factual and clinical status, plus measured HTTP, canonical, `pt-PT` hreflang, robots/indexability, HTML/OG locale, valid page-applicable JSON-LD and Portuguese booking-CTA checks. The final matrix has no duplicate primary or optimized title and no `online online` or `Portugal Portugal` variants. The older 28-row matrix remains the approved clinical-draft manifest so its reviewed hashes do not drift.

Repository implementation added Portugal-only title, description and H1 overrides for pricing and FAQ. These correct the live pricing contradiction and the FAQ heading without altering another market or locale; the pricing unavailability copy is conditional on a successfully loaded, genuinely empty plan catalogue. Transport or malformed catalogue data fails closed. They are local changes pending deployment. Other static and legal pages were reviewed and retained where the current copy and technical signals were sound.

The clinical publication route is now one-record-only and dry-run-first. It targets the existing PT `PageContentTranslation`, `ServiceTranslation` or `DoctorMarketTranslation`, preserves all other fields, and refuses apply unless the live title and description still equal the audited originals. It requires three distinct dated clinical, compliance and content-owner approvals; an active verified Portugal clinician whose database name, professional body and active Portugal specialty match the register; allowlisted HTTPS official sources; an exact approved-copy SHA-256; source fingerprint; confirmation token; and credential-free database identity confirmation covering protocol, host, effective port and database name. Compliance and content-owner identities must match active email-verified authorized database users. Doctor writes additionally require the subject doctor or a recorded delegation and an officially verified, hash-bound fact-register row whose canonical URL, doctor ID, slug, normalized name, professional body and registration number match the live listing. The writer verifies the saved record in a Serializable transaction. Read-only production dry runs resolved all 27 database-owned rows. The frontend-owned tool cannot enter that writer, and the driving-certificate row cannot enter a write transaction.

The clinical register gained explicit approval fields without opening any gate. All 28 rows remain `blocked_pending_review`, and all 16 live doctor profiles remain `pending_official_verification` in `doctor-profile-fact-register.csv`. No service metadata, doctor metadata, biography, FAQ, visible clinical description, credential, qualification, specialty, registration, language, price, booking state or availability claim was published. The Portugal hand-foot-mouth article's Ireland/HSE wording is explicitly held for clinical correction.

The authorized non-clinical homepage CTA patch was the only production content write. Its dry run matched the reviewed source and confirmed production hostname; it changed the PT HOME CTA from the English source value to `Marcar consulta`. Immediate readback passed, the post-write dry run returned an idempotent skip, and public HTML returned HTTP 200 with `Marcar consulta`, no old English CTA, the self-canonical and `pt-PT` hreflang. A sanitized source-controlled receipt is stored at `raw/production-write-receipt-2026-09-01-home-cta.json`.

The former mutation-heavy `reconcile-artifacts.ps1` is now a read-only validator. It verifies the 28-row draft set, 75-row live matrix, 28 blocked reviews, 16 pending doctor fact records, unique URL/keyword ownership, technical checks, deslop completion and absence of same-day or guarantee wording in rewritten metadata.

Final verification passed the read-only 75-page reconciliation, backend production build, backend and frontend package typechecks, 12 focused backend tests, five focused frontend tests, production dependency audit and staged-diff checks. Independent code, TypeScript and security reviews reported no remaining actionable findings. The full frontend build compiled and passed TypeScript, but static prerendering remained environment-blocked by the unavailable local content backend; the degraded retry run was stopped after fallback behavior was established. No deployment or push was performed.

## 2026-09-01 production readback and empty-catalogue follow-up

Fresh cache-busted reads returned HTTP 200 for `/portugal/pt/faq` and `/portugal/pt/pricing` on deployment `b0cebff87d49540ce3205c41adf45f65bf2dfa45`. Both routes matched the approved title, meta description, H1 and visible lede, plus their self-canonical, `pt-PT` hreflang, `pt` HTML language, `pt_PT` Open Graph locale, applicable JSON-LD and Portuguese booking path. The two-row receipt is `raw/static-page-production-readback-2026-09-01.csv`.

The pricing readback also reproduced a residual contradiction: the empty catalogue page still rendered the plan CTA, plan-selection heading, flexible-plan trust claim and five-step subscription onboarding copy. The repository follow-up now hides catalogue-only sections when the successfully loaded plan list is empty. The same path also reused the existing public-content failure policy so catalogue failures cannot become a false 404 after the subscriptions feature gate has passed. Configured runtime failures throw for retry; build and no-API fallbacks keep the unavailable state.

URL Inspection passed for both URLs, but Google's stored crawls predate the deployed copy: 2026-08-15 for FAQ and 2026-07-19 for pricing. A finalized 2026-08-01 to 2026-08-29 GSC refresh returned no query rows for either URL. Google recrawl and post-deployment query measurement remain pending.

No clinical, service, profile, credential, availability, price, FAQ-answer or booking-state record changed. All 28 clinical rows and all 16 doctor verification rows remain closed.

Final verification passed the 75-page read-only reconciliation, frontend typecheck and touched-file lint, seven focused frontend tests, 11 focused Portugal backend tests, backend production build, dependency-override drift check, production dependency audit and `git diff --check`. Independent code, TypeScript and security reviews found no remaining actionable issue. The backend package test script expands file arguments to the full suite; that broader local run reached unrelated database tests and failed because the test database at `127.0.0.1:5433` was unavailable. The direct Portugal test run had no failure or skip.

Commit `48832d9cf493ba7a9006cde322fbe5f317af6b54` was pushed to `Dev-hassaan`. Railway reported successful frontend and backend deployments in its Development environment. At 2026-09-01T16:25:59Z the Railway frontend URL returned HTTP 200 from that commit with no plan CTA, plan-selection heading or subscription onboarding copy, and with the empty-state H2. The public custom domain still returned deployment `b0cebff87d49540ce3205c41adf45f65bf2dfa45` and the old lower-page copy. Production promotion remains pending; no `main` push, merge or manual Railway action was performed.
