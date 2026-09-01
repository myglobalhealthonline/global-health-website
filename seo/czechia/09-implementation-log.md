# Czechia implementation log

Date: `2026-08-31`

## Owner implementation authorization — 2026-09-01

Owner implementation authorization recorded: 2026-09-01, approved baseline `8af7a7e7`.
The authorization covers all 50 eligible URLs in the page-by-page matrix. It permits
local implementation and a repository commit; it does not authorize deployment or a
production CMS/database write.

The 14 non-clinical static pages may use the approved metadata and H1 copy in code.
For the 31 clinical draft pages, the matrix remains the exact review source and the
clinical register remains `pending`; no runtime source consumes those proposals.
The two full service drafts remain protected by their existing exact-copy hash,
reviewer, date, confirmation-token and cross-locale fallback gates. The three
measurement holds remain binding, the two reviewed articles remain unchanged, and
doctor biographies and unsupported FAQ replacements remain unchanged.

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
  `9d4b1ad095dab37b716d794301ca0607fab21940391da7f43df72020b91d0a0e`;
- `/czechia/cs/services/obnoveni-lecby`, approval SHA-256
  `a02d12a3e9aada7f106233841bc55ec6b268805561660020734306e054ff5106`.

The drafts update title, description, H1, opening, structured body, CTA and every
existing visible FAQ. Neschopenka keeps transactional assessment intent while the
published eNeschopenka article keeps process intent. Renewal owns `obnovení receptu
online`. The final copy removes same-day promises, guaranteed documents/referrals,
volatile benefit thresholds and automatic prescription language. It adds official
ČSSZ/ePreskripce references, explicit clinical discretion and 155/112 escalation.
The deslop and fact-preservation checks run in the focused content tests.
Three vague FAQ questions now name their exact topic naturally: eNeschopenka,
obnovení receptu and obnovení léčby. The other ten questions remain unchanged to
avoid repetitive keyword stuffing. The seven Czech tool metadata/H1 payloads remain
preview-only until their exact clinical-register rows are approved; adding them to
the frontend before then would publish unapproved clinical copy on the next deploy.

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
the pending clinical register stopped the batch before any transaction could be authorized.

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
service drafts preserve non-Czech CTA fallbacks and remain blocked by clinical review;
owner implementation authorization was recorded on 2026-09-01.
No production CMS/database write, legal-body edit, publication change, redirect,
push or deployment was performed.

## Approved static-page implementation — 2026-09-01

The 14 non-clinical Czechia rows now use their approved title and description in
frontend code. Blog, booking, contact, FAQ, legal hub and pricing also use the exact
approved H1. A Czechia-only overlay returns copy only for country `cz` and locale
`cs`; Ireland keeps its existing override and every other country-locale pair keeps
its previous generated metadata and headings. Legal bodies and unchanged H1s remain
source-owned.

The page-by-page matrix initially recorded those 14 rows as
`implemented_in_code_pending_deployment`. The remaining 36 clinically gated rows
stay unpublished: 31 exact matrix-level drafts await clinical review, three remain
measurement holds and two remain reviewed with no source change. Doctor biographies
and unsupported FAQ replacements were not changed.

Current verification passed the 16 route/output isolation tests, locale-key check,
frontend TypeScript check, focused ESLint, Czech artifact validator and
`git diff --check`. Independent code, TypeScript and security/clinical-gate reviews
approved the final diff with no findings. The strict and degraded builds both compiled and type-checked;
static generation could not finish while the local content API was unavailable, so
the degraded run was stopped during repeated fallback fetches.

## Clinical rollout package prepared — 2026-09-01

The 31 eligible clinical recommendations now have source-pinned guarded payloads:
three PageContent records, 15 service locale targets, five doctor-profile metadata
records, one existing blog record and seven tool metadata/H1 records. This follows
the Ireland operational pattern of an exact manifest, immutable source pins,
dry-run-first output, narrow writes, protected-field comparison and exact readback.
Doctor biographies, clinical algorithms and unsupported FAQs remain unchanged.

The production entry points now require a matching approved row in
`clinical-review-register.csv`. The row must contain the reviewer identity, an
RFC 3339 review timestamp and the exact approved-copy SHA-256; English targets also
require native-review identity and date. The command reviewer data must match the
recorded approval. All 37 register rows remain `pending`, so the gate fails before a
transaction opens and no production write was attempted.

Production read-only dry-runs matched all 31 intended targets. Focused tests passed
51/51, including exact scope, source drift, protected operational and cross-market
fields, approval-register validation, transaction behavior and exact readback.
Backend type-check, Czech artifact validation and `git diff --check` passed. Focused
backend ESLint was unavailable because this checkout does not have its configured
executable installed.

The apply guards also prove Czech ownership for PageContent and doctor records,
reject a blog shared with another country, and require the complete CS/EN/PT/ES/RO/DE
service translation inventory before changing Czech fallback fields. The doctor
directory consumes its approved PageContent H1/lede only for `cz`/`cs` and only when
both live fields exactly match the approved pair; otherwise its existing i18n hero
remains active. Focused frontend tests passed 19/19 and frontend type-check passed.

The completion matrix now records the 31 targets as source-pinned guarded drafts
pending clinical approval. The 14 non-clinical rows are deployed and publicly
verified; three measurement holds and two reviewed-no-change rows remain
unchanged. No CMS/database apply or clinical publication occurred.

## Deployment verification

Cache-bypassed public readback on 2026-09-01 verified all 14 non-clinical static
URLs. Every page returned HTTP 200 and matched its approved title, meta description
and H1, self-canonical, `index, follow`, self-hreflang and route-appropriate JSON-LD.
The booking flow still exposed live service choices; the other routes retained their
existing route-appropriate CTA and internal-link behavior without a new commercial
CTA. The matrix status for these 14 rows is `live_verified_2026-09-01`; exact replay
evidence is `raw/static-page-production-readback-2026-09-01.csv`.

The first cache-busting probe used an unknown query parameter on `/book`; its
workflow guard correctly returned `noindex, follow` and removed hreflang. A clean
request with `Cache-Control: no-cache` returned `index, follow` and all seven
alternates, so this was probe behavior rather than a production defect.

No clinical PageContent, service, profile, blog or tool payload was applied. All 37
clinical-review-register rows remain pending, including the two English targets that
also require native review.

Representative live readback across PageContent, doctor directory, service, doctor,
blog and tool targets still matched the recorded original title and H1. The Czechia
English route and one `about` route in each of the other five markets returned 200
without the Czech static overlay title, confirming the market/locale isolation path
in production.

## Local verification

- `node seo/czechia/validate-artifacts.mjs`: pass.
- Focused doctor-path test: 3/3 pass.
- Frontend suite: 1,157 pass, 5 skip.
- Frontend and backend type-check: pass; locale key check passed for six locales and 16 namespaces.
- Focused ESLint on the three changed frontend files: pass. Repository-wide lint is blocked by an unrelated React-purity error in the shared recruitment page.
- Final general and TypeScript reviews: approved with no remaining findings; visible-link and schema URL resolution now share one localized value while preserving the unlinked fallback.
- Backend suite: database-independent tests ran, then the suite failed where PostgreSQL at `127.0.0.1:5433` was unavailable. The documented test-database setup could not run because Docker Desktop was not running.
- Strict production build: frontend compiled and type-checked, then correctly refused to prerender without backend content. A degraded-build attempt also compiled/type-checked but was stopped during 951-page fallback generation after repeated backend retries.

## Approved clinical rollout — 2026-09-01

MUDr. Ahmed Maklad approved 17 exact Czech payloads at
`2026-09-01T18:30:00+02:00`. The register records his existing doctor ID and the
exact SHA-256 for each approved page. The approval was limited to rows requiring a
Czech-licensed physician; specialist, native-English and governance-owner rows were
not widened.

Production writes updated the Czech home PageContent, 11 Czech service pages and the
existing diabetes article. Neschopenka kept its seven FAQ records and treatment
renewal kept its six FAQ records; other services retained their FAQ sets. Prices,
durations, assignments, availability, booking state, doctor biographies,
credentials, tool logic and non-Czech locales were protected and read back after the
transactions. The updater transaction timeout was raised to 30 seconds after one
five-second timeout rolled back cleanly; the bounded timeout is covered by a focused
test.

The four approved tool metadata/H1 payloads are served from a `cz`/`cs`-only
frontend overlay. The exact served JSON is hashed in the artifact validator against
the clinical register. Railway deployment
`52843a4c-059c-4441-9baf-510020683f70` used final production base `6c0c7fcf` plus
only the two Czech runtime files from commit `04b98cdc`; no unrelated branch work was
included.

Public readback passed 17/17 for HTTP 200, approved title/meta/H1, self-canonical,
`index, follow`, self-hreflang, JSON-LD and internal links. A seven-route isolation
check kept the three pending Czech tools unchanged and confirmed no Czech copy on
Czechia English, Ireland, Brazil or Portugal. Evidence is in
`raw/clinical-production-readback-2026-09-01.csv` and
`raw/production-write-receipt-2026-09-01-clinical-seo.json`.

Current matrix totals are 31 live, 14 source-pinned clinical drafts pending review,
three measurement holds and two reviewed-no-change pages. The register totals are
17 approved and 20 pending; the extra pending row covers Czech forms and analytics
privacy rather than a matrix page.

## Remaining published-copy remediation prepared — 2026-09-02

A second production comparison found unsafe wording below the already deployed
metadata layer. Exact source-pinned replacements are now prepared for the Czech GP
PageContent record; Czech paediatric, mental-health, dermatology, travel-medicine and
Prague service records; the English Prague service translation; and five Czech doctor
profiles. The service drafts replace the complete existing FAQ sets by immutable ID.
The profile FAQ candidates are source-pinned by immutable ID, but production
`DoctorFaq` rows are shared across countries. The writer therefore keeps all doctor
profiles preview-only and performs no doctor or FAQ write until a country-scoped FAQ
overlay exists and separate profile/credential plus clinical-governance approvals can
be recorded. Biographies, titles, qualifications, credentials, registrations,
languages, assignments and availability remain unchanged.

The Czech doctor directory also has a `cz`/`cs`-only copy overlay that removes
same-day and 24-hour promises while leaving every other market and language on its
existing bundle. The Czech GP hero availability card uses the same country-only
fallback, while other countries retain their existing localized copy. Keywords are
used naturally in relevant FAQ questions; no keyword is repeated mechanically where
it would make the answer less useful.

Read-only production dry-runs matched all six service source hashes, all five doctor
source hashes and the GP PageContent hash. The expanded Czech Prague service draft
has a new exact approval hash, so its previous metadata-only approval cannot authorize
the expanded copy; the CLI rejects the hash mismatch before applying. No production
database write occurred. Specialist, profile-governance and native-English review
requirements remain unchanged, and the 24/7 article remains on its measurement hold.
The production writers now also preserve Czech default FAQs during an English-only
update, structurally verify JSONB regardless of object-key order, and require reviewed
PageContent HTML to pass the application sanitizer byte-for-byte before apply.
The matrix now tallies 30 fully live pages, 15 source-pinned guarded drafts pending
clinical review (including two that also require native-English review), three
measurement holds and two reviewed-no-change pages. The GP and travel rows remain
measurement holds but now record their exact prepared full-copy scope; the Czech
Prague service is no longer counted fully live because its expanded body/FAQ payload
has a new approval hash.
