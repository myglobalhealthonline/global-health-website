# Global Health — master repository, website and international SEO audit (2026-09-15)

**Status: audit recorded, no implementation.** Nothing was published, deployed, changed in Google, submitted for indexing or written to the database. Every action below is a proposal until the owner records a decision in the operational ledger.

| Item | Value |
| --- | --- |
| Audited commit | `f055a9b78a567502051c7c81b9f9313da32cdc4d` on `Dev-hassaan` (Next 16.2.11, React 19.2.8, Fastify 5, Prisma 7) |
| Deployed revision | `451b23e72f7076f53a06364e06f86da74113d568` — the `dpl=` marker on `_next/static` chunks equals commit `451b23e7` (docs-only successor of the audited commit, on `main` and `Dev-hassaan`), so production code = audited code |
| Canonical host | `https://www.myglobalhealth.online` — apex and http variants 301 in one hop; trailing slash 308 in one hop |
| Operational ledger | `docs/plans/seo-control-state-2026-09.md` (new); `docs/plans/seo-control-state.md` frozen |
| Workbook | `seo/tracking/Global_Health_SEO_Tracker.xlsx` (starter template untouched) |
| Data / raw / scripts | `seo/tracking/data/` · `seo/tracking/raw/2026-09-15/` · `seo/tracking/scripts/` (committed except `A2-probe/html-flagged/` 199 MB and `A2-probe/_cache/` 25 MB, kept locally and git-ignored) |
| Coverage statement | §12 of this report |

## 1. Executive summary

**Verified findings that need a decision this week**

1. **P0 — the Ireland lab-tests product line is dead in production while still advertised to Google.** `/ireland/{en,pt,es,cs,ro,de}/lab-tests` and all 14 tests × 6 locales (84 sitemapped, indexed URLs), `/ireland/en/book-a-test` and 40 legacy Wix redirects (`/product-page/*`, `/home-health-tests*/*`) return 404. Cause is data, not code: the admin `health-tests` feature is absent from Ireland's `enabledFeatures` in `/api/countries`, the page honours the flag (`frontend/app/[country]/[lang]/tests/page.tsx:98`), the sitemap loop does not (`frontend/app/sitemap.ts:194-197`). Google last fetched the hub successfully on 2026-09-07; the old ledger §58 noted the 404 on 2026-09-13 as an open operations question. The cluster still earned 101-182 impressions/day through 09-13 from the stale index. Decision: re-enable the flag (one admin change, no deploy) if Irish lab ordering is still sold; otherwise retire deliberately (remove from sitemap, 410 the tests, repoint the 40 legacy rules). Template fix regardless: the sitemap must use the page's gate (issue CPL-012 / TECH-001).
2. **P1 — measurement is restored but not yet trustworthy for conversion claims.** GA4 collects again since 2026-09-09 (260 organic sessions and 27 key events 09-09..09-14; 24 sessions in the only earlier valid window 07-25..08-01). `begin_checkout` fires in code and is still not a key event; `purchase` has never fired (0 in both windows, all channels). `localhost` and `myglobalhealth.up.railway.app` land in the production property, `checkout.stripe.com` and `tagassistant.google.com` pollute referrals, 11.3% of sessions are unattributed, and Pakistan shows 33 sessions from 3 users (developer traffic). The GSC↔GA4 product link cannot be checked from this runtime. No conversion conclusion is possible before these are fixed and a clean 28-day window exists.
3. **P1 — wrong-locale self-cannibalisation across markets.** Romania: 5 of 16 ranked keywords sit on `/spain/ro` or `/ireland/ro`; Brazil: 4 of 11 on `/brazil/es`, `/brazil/en` or legacy `/pt/`; Ireland sick-cert ranks 29/30/43 are held by Spanish and Romanian pages. 591 query clusters rank on two or more own URLs (`seo/tracking/data/cannibalisation.csv`). Same-language copies published under two markets are being folded by Google (4 canonical overrides in URL Inspection).
4. **P1 — one-country code inside shared templates blocks the next market.** 70 real coupling points (39 "content only one market received", 24 legitimate rules written as inline literals, 4 cache/loader special cases, 2 applied-script/draft modules, 1 test-only), 57 of which would silently give a seventh market the generic or wrong path. Three are live defects today: the Ireland home code-copy bundle renders nothing (key casing `IE:en` vs `br:pt`; another session's uncommitted fix targets exactly this), `/czechia/cs/doctors/dr-ahmed-maklad` carries an English seed country name in a Czech title, and the lab-tests sitemap gate above. Recommendation: CMS/database for market content, code only for `Country` behaviour fields and reviewed per-country JSON; 21-27 developer-days; next country drops from ~8-12 days to 2-3. Full model and new-country checklist in §7.
5. **P1 — legacy migration is 60% clean, not finished.** 1,142 legacy URLs live-tested: 691 pass, 219 land on the wrong target (191 lose the requested locale, 28 fall to a hub), 91 have no redirect (the Wix `/team*` family alone: 28 URLs, 296 historical clicks, all 404), 89 dead-end (76 are the lab-tests chain), 9 two-hop chains, 43 retirements verified 410. wix.to still carries 195 links, 128 of them into a generic `/book`.

**Strengths verified on production**

- Technical foundation holds: 2,889 of 3,771 probed rows return 200 (404 = 437, 410 = 44, after re-probing the repaired legacy rows); zero orphans among 2,118 canonical candidates; one H1 per page (4 exceptions); JSON-LD on all but 10 live pages (MedicalOrganization, WebSite, BreadcrumbList, Physician, FAQPage); 14,585 hreflang edges pass with self-reference and x-default correct on every market page; no cross-country data leakage across the 33 combinations (locale QA 33/33 pass after correction); consent gating keeps GA4, Clarity and Meta Pixel unloaded until "accept"; p50 response 660-800 ms, p95 under 820 ms outside Brazil.
- Organic base is growing: 1,008 clicks / 69,925 impressions in the latest complete 28 days (2026-08-15..09-11) vs 761 / 39,935 in the previous 28 (07-18..08-14, includes three pre-launch days). Tools (20.9k impressions) and blog (19.2k) tripled; market homes 11.8k; services 7.3k; doctors 5.3k.
- Content system is real: 30 blog parents with full locale matrices, doctor profiles with substantive bios, clinical-approval receipts per market, and a byline/reviewer contract already enforced.

**Risks and unknowns**

- Lab performance (Lighthouse) is not exposed by the OpenSEO API and there is no CrUX/PageSpeed key: field and lab performance are **unknown**, not failing.
- GSC query rows carry only ~20% of clicks (Google anonymization: 80.6% of clicks and 61.7% of impressions have no query row in W1); page×country×device rows keep only ~35% of impressions. Every page/query table in the workbook states its grain and loss.
- 14 SEO-DOC-006 doctor profiles are still "Excluded by noindex" on crawls dated 2026-07-16..08-06 — five weeks after the fix, Google has not re-evaluated them. That is now a crawl-budget/discovery finding, not a doctor-content one.
- 1,637 sitemap URLs were not inspected today (quota discipline); 91 of the 628 inspected are "Discovered – not indexed".

## 2. Recovery and scope

Read: `AGENTS.md`, `CLAUDE.md` SEO section, `seo/README.md`, `docs/plans/seo-handover-codex.md`, old ledger §0, §6, §7 lists, §27, §41-43, §48-50, §52-59, and the country packages (all six younger than 30 days, reused, no research re-bought). 84 open items were carried forward mechanically into the new ledger §1 (`seo/tracking/raw/2026-09-15/A-ledger/carried_forward.csv`); the old CLOSED list and `seo-indexation-plan-2026-07-28.md` §5 stay binding.

Launch date: evidence supports a cutover on or about **2026-07-17..07-21** (release/go-live merged 07-17; first Next sitemap/robots 07-17; first current-shape impressions 07-20/21; daily impressions 631 → 1,188 → 2,343). No commit records the DNS switch, so the user-reported 21 July is kept as the working date. SEO implementation: first `feat(seo)` commits 2026-07-26, bulk on 2026-07-28 — earlier than "early August".

States are kept apart throughout: code-complete (commit), deployed (build marker), observed (probe/browser), verified (probe + Google's stored state).

## 3. Access and data integrity (03_Data_Access)

| Source | Result | Limits recorded |
| --- | --- | --- |
| OpenSEO connector | working; 10,696 → 9,945 credits (751 spent) | subagents reach it only via explicit ToolSearch; duplicate user-level entry ignored |
| GSC (`sc-domain:myglobalhealth.online`) | working; 16 months pulled; latest row 09-14; last complete day 2026-09-11 | Pacific Time; 1,000 rows/call; anonymized queries; sparse-row filtering with country×device |
| URL Inspection | working; 628 URLs inspected (≈630 of 2,000/day) | remainder queue 1,637 URLs on disk |
| GA4 (`properties/547083375`, `G-SP48D9LJJ5`) | working via fixed reports; Europe/Dublin; EUR | no raw Data API; no daily landing × country × device; outage 2026-08-02..09-08 unmeasured |
| GSC↔GA4 link | unknown via API | owner to confirm in GA4 Admin |
| CrUX / PageSpeed | no key | field data unknown |
| OpenSEO site audit | 600 pages, 0 critical; Lighthouse ran but scores not exposed | Ireland-heavy crawl (430 of 600) |
| Claude Browser | used on 8 representative URLs | verification, not crawl |
| Google plugin scripts | absent since reinstall | not needed |

Sensitive-data review: no emails, tokens, appointment ids or personal query strings in 406 GA4 page paths, page titles or site-search terms; `:id` placeholders come from the app's own sanitizer. Clarity and Meta Pixel are consent-gated and mounted only on allow-listed routes; Clarity masking relies on `data-clarity-mask`. No health or identifying parameter is sent by `frontend/lib/analytics/track.ts` (closed event-name union).

## 4. URL inventory and coverage (04_Page_Inventory, 08_Crawl_History)

| Count | Value |
| --- | --- |
| Known URLs (union of routes, sitemap, CMS, redirects, legacy exports, GSC, backlinks; route patterns excluded) | 3,369 |
| of which canonical candidates / noindex expected / redirect sources / retired / unknown / orphan candidates | 2,118 / 169 / 264 / 36 / 356 / 426 |
| Sitemap `<loc>` entries | 2,265 (lastmod meaningful: 1,036 share 2026-09-14T18:42, the rest vary) |
| Live-tested (HTTP + HTML parser) | 3,771 rows in 08_Crawl_History (4,672 raw probes incl. host/slash variants; 137 repaired legacy URLs re-probed); 200 = 2,889, 404 = 437, 410 = 44 |
| Rendered in the browser | 8 renders over 6 distinct inventory URLs (root, IE home ×2, PT doctors, CZ home, BR pricing, IE book, ES service on a mobile viewport) |
| URL Inspection | 628 (490 indexed, 91 discovered-not-indexed, 19 unknown, 14 noindex, 10 crawled-not-indexed, 4 duplicate) |
| Content reviewed by analyst | see §8 |
| Public API entities | 1,119 (233/233 public endpoints returned 200) |

By market (known / live 200): Ireland 783 / 584 · Portugal 555 / 525 · Spain 498 / 468 · Czechia 417 / 381 · Romania 402 / 378 · Brazil 190 / 168 · non-market (root, legacy, utility) 524 / 287.

Excluded: portal trees `(admin)`, `(doctor)`, `(auth)/account`, `(corporate)` (337 routes listed in `excluded_routes.csv`); `next.config.ts` parameterised sources are kept as `route_pattern_not_url` rows (383) and not counted as URLs. A1's first pass wrote 1,038 malformed legacy rows (unquoted CSV lines); they were repaired and 901 duplicates merged (`inventory-fix-manifest.json`); the ≤140 repaired URLs are re-probed by the workbook build.

## 5. Technical and international SEO (05_Technical_QA, 07_Hreflang)

40 technical checks (44 rows in 05_Technical_QA with the locale-QA rows), 16 failing before reconciliation, 12 after (three were probe artefacts: "canonical mismatch 684" counted redirects without a canonical — only 2 live pages carry a non-self canonical and both are correct; "alternate redirects 2,285" was a join on host variants — 0 after an exact-URL join; "cross-market hreflang 7,416" is the tools family's deliberate global cluster, 7,200 edges reclassified `cross_market_by_design`).

Real fails, with counts: sitemap URLs non-200 84 (all lab-tests); redirects ending 4xx/5xx 223 of 620 (lab-tests chain, team family, services-1/2, product-page); two-hop chains 7-9; duplicate titles within language 412 and descriptions 769 of 2,829 (template families: doctors, legal, tools share titles across locales where translation is missing); missing expected JSON-LD type by family 404 of 1,336 (services without `Service`/`MedicalWebPage`, tools without `WebApplication`/`FAQPage`); soft-404 signals 29; images missing alt 2,069 pages; superlative wording 910 pages; long titles 117 and long descriptions 150 (OpenSEO). robots.txt allows all public routes and the media/OG/availability APIs; AI crawlers are explicitly allowed.

International: every market page emits its own market's locales plus `x-default` → market default (33/33 combinations verified in the rendered DOM and the parsed HTML); `og:locale` uses the host region and alternates their natural region; `<html lang>` matches the URL language on every sampled page; no English fallback detected on non-English market homes; PT-PT (Portugal) and pt-BR (Brazil) are separate bundles (Brazil overlay `brazil-editorial-copy.json`), and the Brazil pricing page shows the pt-BR wording live. Geo/cookie: no geo redirect; `/` is a country picker with links to all 33 combinations; `gh_locale`/`gh-last-country` cookies are cosmetic and do not alter server output for a given URL (probed with conflicting Accept-Language and cookies). Blog fallback-locale variants are `noindex,nofollow` with a cross-canonical by design; the four Google canonical overrides are same-language copies in two markets, not a defect.

Rendering: server-rendered HTML carries the full content; the browser DOM matched the parsed HTML on every representative page; no console errors; mobile viewport has no horizontal overflow but 11 tap targets under 24 px and 10 px minimum text on the Spain service page, and the cookie dialog covers the mobile fold until dismissed.

Performance: p50/p95 first-hop response by market — Ireland 682/795 ms, Czechia 686/818, Portugal 683/807, Spain 678/783, Romania 661/778, Brazil 801/1,516. Lab/field Core Web Vitals: unknown (see §3).

Regression test: `frontend/tests/unit/seo-live-urls.test.ts` against production — 7 passed, 2 failed (both the lab-tests incident). Recommend running it on a daily schedule (proposal only; nothing activated).

## 6. Country-specific data path (06_Locale_Data_QA)

33 combinations tested end to end (routing → proxy → render → public API filters → translation fallback → metadata → cache): data filters pass (doctors, services, plans belong to the market), cache isolation passes (back-to-back countries, conflicting headers/cookies, unsupported combinations 404, bare `/{slug}` and `/{slug}/` 308 in one hop), currency and regulator wording correct per market, doctor counts on page match the public roster, three sampled doctors per market agree on `readyToIndex` vs `noindex`. The two FAILs first reported by the QA agent were redirect-following artefacts: `/prescriptions` 308s to `gp-consultation-online` in every market (the deliberate SEO-RX-001 retirement), and a foreign-market doctor slug 307s to that market's `/doctors` index with a noindex interstitial (correct; a 308 or 404 would be cleaner). The only real feature/route inconsistency is the Ireland lab-tests sitemap/page disagreement (§1).

Cache keys carry the country code (`country-footer:${code}`, `country-trust:${code}`, page-content tags include locale); the locale-bundle module cache keys Romania/Spain/Brazil overlays (`${locale}:ro|es|br`) — correct today, but a seventh market gets the shared bundle silently (coupling TF-04).

## 7. One-country code inside shared templates (27_Country_Coupling)

From 4,137 locator hits, 70 real coupling points after reading the code (39 one-market content, 24 legitimate market rules as inline literals, 4 cache/loader/routing special cases, 2 applied-script/draft modules, 1 test/dead); 44 verified on production; 57 block a new country. Twelve template-level fixes (issues CPL-001…012):

| Fix | What it closes |
| --- | --- |
| TF-01 | home code-copy module + `preferIrelandExtras` precedence (dead for Ireland today) |
| TF-02 | localized country name gated to Brazil (`code === "br" ? countryNames[code] : config.name`) — Czech doctor titles show "Czechia" |
| TF-03 | three per-country static-page-SEO modules with three signatures |
| TF-04 | locale-bundle overlays hardcoded to ro/es/br in `load-locale.ts` |
| TF-05 | tool copy: three named JSON imports + ~1,300 inline Brazil lines |
| TF-06 | clinical-approval gate named for one market but gating three |
| TF-07 | payments/invoicing rules as inline switches |
| TF-08 | identity/tax/address fields and the GA4 `market` map as literals |
| TF-09 | one-market copy across nine mechanisms |
| TF-10 | seed country array and six-locale list duplicated five times |
| TF-11 | 42 country-named modules (17 unreferenced) and 152 scripts (143 outside `applied/`) — cleanup queue only |
| TF-12 | sitemap lab-test loop missing the page's feature gate (P0) |

**Target model (one recommendation):** CMS/database, admin-editable, for everything that is market *content* — home copy, static-page SEO fields, doctor FAQs and their approval state, contact and legal entity, certification logos — behind the existing page-content module with per-locale rows and the single-clinician approval flag; code for `Country` *behaviour* fields (regulator, tax/identity document rules, currency, timezone, feature flags — already data-driven) and for reviewed per-country JSON that ships with the build (tool copy, locale overlays) loaded by ONE shared loader keyed on the country code, never by literal. Reasons: owner edits copy without a deploy; clinical approval gates a CMS row, not a pull request; translation rows are first-class; cache tags already exist per country; the next market becomes data rows plus two JSON files. Effort 21-27 developer-days; order TF-12 → TF-04/TF-10 → TF-01/TF-02/TF-03/TF-09 → TF-05 → TF-06/07/08 → TF-11 cleanup. New-country checklist (from `country-coupling-report.md`): `Country` + `CountryLocale` rows, `enabledFeatures`, plans, services, doctors, legal, footer, trust, page-content (home, doctors index, FAQ), locale JSON keys, images (OG, logos), redirects, sitemap inclusion (automatic once rows exist), hreflang (automatic from `supportedLocales`), GA4 `market` value, admin settings, then run `seo-live-urls.test.ts`, `country-locale-matrix.test.ts`, `check-locale-keys`.

## 8. Content quality (16_Content_Review, 28_Copy_Proposals)

Rule-based scan over 2,826 live pages (`content_scan_summary.csv`): word count, em-dash density by locale, exclamations, superlatives (910 pages), generic intros, FAQ counts, duplicate main-text groups (8 groups, all noindex cart/checkout shells — no indexable duplicates). The 29 soft-404 signals are all false positives of the rule (due-date tool week tables de-space into "404"; the German FAQ opens "Nicht gefunden, was Sie suchen?") — the rule is corrected in 05_Technical_QA, not the pages.

Analyst review: 140 pages (the top 10 per market by impressions plus every strongly flagged page), scanner counts and analyst ratings in separate columns (`content_review.csv`). Classification: Improve 66 · Protect 45 · Consider retirement 15 · Consolidate 13 · Translate/localize 1. Intent: 86 aligned, 50 partial, 4 mismatched. Factual safety: 106 ok, 25 check, 9 risk — the risks are credential or superiority claims ("most experienced paediatric clinician in the world", a psychiatry trainee's meta calling him "Spezialist", "Dr" on a health psychologist, Ireland branding on a Czechia doctor URL, an unsourced "45,332+ consultations").

Systemic patterns and the smallest shared fix (details in `seo/tracking/raw/2026-09-15/A6-content/content-review-notes.md`): (1) blog category labels never localised — 23 of 37 reviewed blog pages show the source-language taxonomy; one label map fixes all; (2) the generic hero "registered with national medical councils across Europe" still on 7 market homes including `/spain/es` (2,012 impressions) and `/brazil/en` where it is factually wrong; (3) the country name renders as the English route slug inside localised copy (`Registrováno v Czechia`, `Colegiados en Spain`, `Autorizat în Romania`) — one trust-ribbon component (coupling TF-02); (4) all five Spain service pages render no clinical reviewer although `seo/spain/clinical-approval*.json` already records the approval (CGCOM 291409735, 2026-09-14) — a display gap, no new approval needed; (5) em-dash density is a locale-typography question, not a ranking one — Czech/Spanish/Portuguese/Romanian pages keep their dashes.

Copy proposals: 25 (Brazil 4, Czechia 4, Ireland 4, Portugal 4, Romania 3, Spain 6) — 12 body sections, 7 titles, 4 descriptions, 2 FAQs; 5 carry a clinical-approval gate; one evidence-backed tool snippet per market. Every proposal deletes an unsupported claim or restates a fact already on the page or in an approval record; none invents a reviewer, date or statistic. They are proposed edits, not approved publication (`copy_proposals.csv`, workbook sheet 28).

Resolved observation: the Ireland home tile "13 consultation languages" is the union of languages spoken by Ireland's GPs (`getGpLanguages`, doctor records), while the FAQ's "six languages" are the six site languages. Both are true in scope; proposals CP-0009 (relabel the tile "Languages our Ireland doctors speak") and CP-0010 (FAQ answer that separates site languages from consultation languages) keep both counts true. No clinical gate; no native review for English.

## 9. Keywords, competitors, backlinks (13, 14, 15)

820 keyword rows (Ireland 152, Czechia/Portugal/Spain/Romania 150 each, Brazil 68; DataForSEO via OpenSEO, observation 2026-09-15; 483 improve, 328 ignore, 9 new-page candidates), 299 competitor rows (business vs SERP competitors separated), 410 backlink rows (380 live, 30 broken; 176 point at legacy targets, 42 spam-suspect) plus 258 prospects (251 from country packages, 7 new, no paid links). Market verdicts: Ireland — sick-cert SERP owned by four specialists on price/turnaround; webdoctor.ie holds `online gp ireland`; win = fix locale leakage, defend illness-benefit and blood-pressure content. Czechia — eNeschopenka post at 17-22 is the best single asset; `normální tlak` takeable. Portugal — SNS24 and dronline.pt wall the commercial core; driving-licence certificates (33-43) and the 77-keyword `baixa médica` cluster are the seam. Spain — `justificante médico online` is a government SERP; `baja por ansiedad` (2,400/mo, KD 0) has no telemedicine incumbent. Romania — smallest demand; calorie calculator #7 is the one asset. Brazil — `declaração de comparecimento` (9,900/mo, KD 0) unclaimed. Across 30 verified head SERPs MGH reaches a top-10 once. Authority: 572 links / 68 domains, 457 from six domains, only 9 genuinely medical — publishing more copy cannot substitute for relevant editorial links.

## 10. Programmatic SEO (17_pSEO_Plan)

Family scoreboard W1 (live URLs / indexed share of inspected / zero-impression share / impressions / clicks / CTR / vs W0): tools 264 / 94% / 0.22 / 20,852 / 160 / 0.77% / +181% — volume without a commercial path; blog 279 / 76% / 0.42 / 19,243 / 132 / 0.69% / +208% — the best assets (sick-note guides at positions 5-13); market homes 55 / 100% / 0.29 / 11,846 / 256 / 2.16% / +98%; services 666 / 87% / 0.38 / 7,253 / 94 / 1.30% / +12% — largest and flattest family; doctors 402 / 78% / 0.56 / 5,134 / 258 / 5.03% / +95% — name navigation; careers 65 with 17% indexed; legal 233 / 81% / 501 impressions; lab-tests 0 impressions after the outage. Full table: `seo/tracking/data/template_family_eval.csv`.

Cannibalisation: 591 clusters, 375 of them wrong-locale (8,066 impressions, 86 clicks); in 157 clusters the winning URL is a non-own locale — Romania 43, Spain 37, Ireland 31, Portugal 24, Brazil 12, Czechia 10. Top: `calculator calorii` 1,604 impressions (`/romania/ro` vs `/spain/ro`), `global health` 306 impressions across 19 URLs, `illness benefit ireland` split across two own Irish posts, `consulta online saúde masculina` won by `/brazil/de/` (a German page for a Portuguese query). Detail: `seo/tracking/data/cannibalisation.csv`.

Candidates (`seo/tracking/data/pseo_plan.csv`, 8 evaluated): PS-08 wrong-locale consolidation — **pilot**; PS-02 condition guides — defer (editorial, no first-party data to template); PS-03 sick-note-per-situation and PS-05 tool result interpretation — reject in favour of improving the existing pages; PS-04 lab-test × condition — blocked by the lab-tests outage; PS-06 doctor × specialty, PS-07 cost pages, PS-01 service × city — reject (city intent is physical-clinic navigation: 35 impressions, 1 click; a doorway pattern for a remote service).

**Pilot (proposed): zero new pages.** Consolidate the 12 highest-impression wrong-locale winners (1,546 impressions, 1 click today) onto their correct market/locale page by internal linking and title intent, never by noindexing the ranking page. Gates: hreflang reciprocity verified per cluster, no locale variant noindexed (frozen §27.5), `/ireland/sick-leave` never 404s, lab-tests triaged first, GSC refreshed pre-batch. Rollback: −20% impressions vs baseline or >10 positions lost on any cluster. Measure 30/60/90 days from the first post-change crawl; target ≥15 clicks/month on the 12 clusters at 90 days. Notes: `seo/tracking/raw/2026-09-15/A9-programmatic/pseo-notes.md`.

## 11. Migration and measurement timeline (18_Migration, 20_Change_Log, 21_Historical_Baselines)

Events: Wix period 2025-05-15..2026-07-16 (GSC property daily, monthly page totals 1,689 pages, 710 legacy shapes); cutover 2026-07-17..21; redirect batches 07-19, 07-28, 08-08, 08-15; 410 batch 08-08; GA4 stream created 07-25; collection outage 08-02..09-08; repair 09-09; content batches 08-25..09-15 (see 20_Change_Log, 31 events). Comparison rule: equal-length, non-overlapping windows only (W1 vs W0 above); the ledger's 861-click and 918-click snapshots overlap and are kept as historical cards, never compared. Correlation is not causation: the W1 growth coincides with the tools/blog long tail and the doctor-indexability fix, not with any single batch. No claim is made about the previous provider.

## 12. Coverage statement

| Measure | Value |
| --- | --- |
| Total known URLs (route patterns excluded) | 3,369 |
| Live-tested | 3,771 crawl rows covering all 3,369 known URLs (100%) plus host/slash variants |
| Rendered in a browser | 8 renders, 6 distinct URLs |
| URL Inspection | 628 (remainder 1,637 queued) |
| Content-reviewed by analyst | 140 (scanner: 2,826) |
| GSC windows | property daily 2025-05-15..2026-09-14 (6 search types); page×date 2026-07-21..09-14 (19,488 rows); page×country×device same window (12,973 sparse rows, side file); query×page 28-day W1 and W0; query daily sample 2026-09-05..09-11 (5,817 rows); Wix monthly pages 2025-05..2026-07 |
| GA4 windows | 2026-07-25..08-01 and 2026-09-09..09-14 only; 08-02..09-08 unmeasured |
| Unresolved access limits | no CrUX/PageSpeed key; Lighthouse scores not exposed; GSC↔GA4 link unknown; no raw GA4 Data API |
| Checks not run | Lighthouse/CWV; penetration or legal review; the 1,637-URL inspection remainder; Search Appearance × page (API rejects the combination) |
| OpenSEO credits spent | 751 (balance 9,945) |
| Workbook rows / QA discrepancies | 64,645 data rows across 30 table sheets (31 sheets with the dashboard); QA: 38 findings — 0 blocking, 26 fix (14 fixed in the workbook via `scripts/qa_fixes.py`, 12 open for the owner: issue statuses/enums, clinical_review_status on 12 gated rows, a third P0 CPL-006), 12 notes; 0 formula errors after Excel recalculation; 30 live spot-checks, 0 mismatches (`seo/tracking/raw/2026-09-15/A11-qa/qa-report.md`) |

Distinction: everything in §§3-7 and 11 is completed, evidence-backed work; §§8-10 proposals and the roadmap in the ledger are proposals; nothing was implemented.

## 13. Decision queue (owner)

1. Ireland lab tests: re-enable `health-tests` or retire deliberately (P0, today).
2. Register `begin_checkout` as a key event; add an internal-traffic filter (Pakistan developer traffic) and exclude dev hosts; confirm or create the GSC↔GA4 link — all in GA4 Admin (P1).
3. Approve the CMS-for-content target model and schedule TF-12 → TF-04/10 before the next market (P1).
4. Redirect rules: `/team*` family, `/services-1/2` family, locale-preserving rules for the 191 Wix locale URLs, bare `/product-page/beauty-focus-multibeauty` 410; per-clinician calls on 13 departed-doctor URLs (P1-P2).
5. Publish the Google OAuth consent screen (carried MANUAL item) only if CrUX/PageSpeed field data is wanted.
6. Confirm the tools cross-market hreflang cluster is intended (P3).
