# Czechia implementation log

Date: `2026-08-31`

## Implemented

### Locale-correct doctor profile links from blog pages

- Added `frontend/lib/content/doctor-profile-path.ts`.
- Added `frontend/lib/content/doctor-profile-path.test.ts`.
- Updated `frontend/lib/content/blog-post-page.tsx` so both Physician input and the visible clinical-reviewer link use the article locale.

Root cause: the visible reviewer link hardcoded `/{country}/en/doctors/{slug}` while non-English articles and their schema resolved another locale. The shared helper returns no path when the clinician has no market slug and lowercases the locale.

No booking, prescription, patient record, clinical workflow, content database, redirect, sitemap, robots, or analytics behavior was changed.

## Evidence and planning artifacts created

All Czech research deliverables under `seo/czechia/` were created or refreshed: live inventory, raw OpenSEO/GSC/GA4 exports, keyword master, exclusions, SERP validation, competitor landscape, URL ownership, content briefs, clinical register, backlink prospects, audit, measurement plan, and roadmap.

## Deliberately not implemented

- No GP metadata or heading rewrite before the `2026-09-08` ownership gate.
- No redirect change for the retired travel route; the current evidence is Google recrawl lag.
- No new city, condition, or specialty landing page.
- No unsupported claim that a prescription, referral, neschopenka, diagnosis, or 24/7 response is guaranteed.
- No outreach, OpenSEO keyword persistence, deploy, commit, or push.

## Focused final-data refresh

On 2026-08-31, a second read-only refresh used final GSC data through 2026-08-28,
fresh GA4 reports, Czech OpenSEO keyword metrics and SERPs, the existing scope-invalid
cross-market crawl, backlink subfolder totals, and URL Inspection for 12 priority URLs. The exact
parameters, returned metrics, unavailable keyword rows, API validation failure and
scope limits are stored in `raw/focused-refresh-2026-08-31.json`.

The refresh corrected one evidence-attribution error: 24 GA4 organic sessions were
sitewide. Czechia landing pages account for 4 sessions and 2 engaged sessions; a
Czechia-wide unique-user count is unavailable from the landing-page rows. No Czechia
key events or transactions were returned. Eleven of 12 inspected
priority URLs passed as indexed. Nine returned matching declared and Google-selected
canonicals; the neschopenka and referral inspections omitted the declared-canonical
field. The P2 second-opinion URL was unknown to Google and remains a monitoring
exception.

The prior crawl cannot produce a Czech defect count: only the Czech home page was
returned by the URL-filtered page read after the crawler followed cross-market links.
A Czech issue total therefore remains unavailable until a restricted crawl is run.

Follow-up validation passed the Czech artifact checker, JSON parsing and `git diff
--check`. Independent review found no remaining high-severity issue after the raw
call inputs, crawl limitation, GSC privacy threshold and GA4 aggregation scope were
made explicit. The locale-link Vitest rerun was environment-blocked because the
frontend test binary is not installed in this checkout; the existing batch result
above remains the last successful focused code test. TypeScript and security reviews
were not applicable because this follow-up changed evidence files only.

No content or technical SEO change followed. The GP/travel gate remains
`2026-09-08`, all clinically material Czech assets remain pending in the review
register, and production CMS/database writes were not authorized. Because no content
block was rewritten, no deslop pass was applicable in this follow-up.

## Review-gated service drafts — 2026-09-01

Two existing Czech service records now have repository-only, clinically gated copy:

- `/czechia/cs/services/neschopenka-online`, approval SHA-256
  `e181f41e9b632af577fff9be1302c7b80a44da3c47be4ab884eaa4901c538d65`;
- `/czechia/cs/services/obnoveni-lecby`, approval SHA-256
  `d085e67bd02effa715f64236adb7b03c76390fba35b8a110496a8feea0a4c647`.

The drafts update title, description, H1, opening, structured body, CTA and every
existing visible FAQ. Neschopenka keeps transactional assessment intent while the
published eNeschopenka article keeps process intent. Renewal owns `obnovení receptu
online`. The final copy removes same-day promises, guaranteed documents/referrals,
volatile benefit thresholds and automatic prescription language. It adds official
ČSSZ/ePreskripce references, explicit clinical discretion and 155/112 escalation.
The deslop and fact-preservation checks run in the focused content tests.

The updater is dry-run by default and allowlists only those two records. It checks
the exact record ID, locale, `updatedAt`, source SHA-256 and FAQ IDs, preserves
operational fields, and requires a matching approved-copy hash, clinical review
date, verified Czech doctor and exact confirmation token before `--apply`. It
rechecks inside a Serializable transaction and verifies the saved state. Production
dry-runs matched the pinned full six-locale service and FAQ source hashes
`880fd7d374b062af8df380b46b24d1a07c7187f570f2307aba679336203834cc`
and `8bd648915a8dce6651a6be34a161f3948b9d2861c39e41a305a4ed4805e74ad8`.

The final dry-run found an apply blocker: the base CTA and the five non-Czech CTA
translations are all null. Updating the Czech base CTA would therefore make Czech
text available as a fallback on EN/PT/ES/RO/DE routes, while null cannot be stored as
an explicit override. The updater refuses to apply until those locales have verified
CTA values or the reviewed scope is changed without weakening default-locale safety.
Service reviewer/date fields are global across all six locales; the updater therefore
preserves them instead of attributing a CS-only review to untranslated copy. Actual
approval remains an external clinical-review-register gate until review storage is
locale-scoped.

No apply command was run. The review register remains pending, the CTA blocker is
unresolved, and production copy
is unchanged. The GP/24-7 and travel gate remains `2026-09-08`; English Prague,
other services, doctor biographies, routes, redirects, canonicals, sitemap and
schema were not changed. The existing eNeschopenka article was not rewritten; its
public API doctor relations conflict with its visible attribution and require source
verification before a separate CMS correction.

Verification passed: 13 focused content/updater tests, the backend full suite,
backend type-check and build, touched-file ESLint, Czech artifact validation, raw
JSON parsing and `git diff --check`. Independent code, TypeScript and security
reviews reported no remaining findings. The production dry-runs were read-only and
the CTA fallback guard stopped the batch before any transaction could be authorized.

## Page-by-page optimization matrix — 2026-09-01

The local completion package now covers 50 canonical URLs: 48 Czech public pages
and the two English Czechia pages explicitly owned in the URL-keyword map. Each row
records one primary keyword, focused secondary variants, exact live title/meta/H1,
optimized fields, visible-description and FAQ/bio decisions, deslop, clinical gate,
technical verification, CTA/internal-link action and fact comparison.

All 481 keyword-master rows, including low-volume terms, retain owner URLs present
in the matrix. The focused set does not force psychiatrist, free-chat, eye-doctor or
diagnostic-test terms into products the site does not provide. The 2026-09-01 live
check returned 200, self-canonical, `index, follow`, self-hreflang and route-appropriate
structured data on all 50 pages; the timestamped raw result is
`raw/live-page-seo-snapshot-2026-09-01.csv`. The country FAQ schema and tab UI were traced to the
same group source; non-active groups become visible through tab selection.

The package identifies repeated unsupported same-day, instant-confirmation and
automatic-document wording in service/profile copy and provides safe, live-calendar
and clinical-discretion replacements. Verified names, registrations, qualifications,
languages, prices, durations, clinical thresholds, formulas and legal facts remain
unchanged. GP/24-7 and travel recommendations remain measurement holds.

Only the neschopenka and treatment-renewal services have complete guarded repository
drafts and exact FAQ replacements. The other affected FAQ rows are explicitly marked
`no` until page-level old/new copy passes clinical review. The 36 clinically gated
matrix rows all have matching pending entries in `clinical-review-register.csv`.
The rest are matrix-level local drafts or reviewed no-change dispositions. Both full
service drafts remain blocked by null non-Czech CTA fallbacks as well as clinical
review and owner authorization.
No production CMS/database write, legal-body edit, publication change, redirect,
commit, push or deployment was performed.

## Deployment verification

After deployment, open a Czech article with a linked reviewer and verify the visible reviewer URL, Physician JSON-LD URL, canonical, and hreflang all retain `/czechia/cs/`. Then request URL Inspection only if production output differs.

## Local verification

- `node seo/czechia/validate-artifacts.mjs`: pass.
- Focused doctor-path test: 3/3 pass.
- Frontend suite: 1,157 pass, 5 skip.
- Frontend and backend type-check: pass; locale key check passed for six locales and 16 namespaces.
- Focused ESLint on the three changed frontend files: pass. Repository-wide lint is blocked by an unrelated React-purity error in the shared recruitment page.
- Final general and TypeScript reviews: approved with no remaining findings; visible-link and schema URL resolution now share one localized value while preserving the unlinked fallback.
- Backend suite: database-independent tests ran, then the suite failed where PostgreSQL at `127.0.0.1:5433` was unavailable. The documented test-database setup could not run because Docker Desktop was not running.
- Strict production build: frontend compiled and type-checked, then correctly refused to prerender without backend content. A degraded-build attempt also compiled/type-checked but was stopped during 951-page fallback generation after repeated backend retries.
