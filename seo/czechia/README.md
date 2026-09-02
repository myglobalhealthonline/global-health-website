# Czechia SEO evidence pack

Evidence date: `2026-08-31`

This directory is the reproducible Czechia research and implementation package. It is not the operational SEO ledger: decisions, holds, and next-review dates remain canonical in [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).

## Scope and settings

- Target: `https://www.myglobalhealth.online/czechia/`
- Search Console property: `sc-domain:myglobalhealth.online`
- GA4 site: `https://www.myglobalhealth.online`
- OpenSEO project: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`
- Czech location: `2203`
- Czech language: `cs`
- Locale: `cs-CZ`
- Current window: `2026-05-29`–`2026-08-27`
- Comparison window: `2026-02-28`–`2026-05-28`

## Evidence retained

- `10,051` raw keyword-research rows in six provider exports
- `6,593` normalized unique terms across research, GSC, and target rankings
- `481` service-relevant keyword records in `03-keyword-master.csv`
- `1,414` reviewed candidate exclusions with reasons
- `600` organic results across 30 Czech SERPs
- `281` current Czechia sitemap URLs
- `360` observed competitor pages
- `207` deduplicated backlink prospects; none contacted
- full GSC, GA4, URL Inspection, audit, SERP, call-log, and source-log evidence under `raw/`

Missing provider metrics are blank, never converted to zero. Accented and unaccented forms remain separate keyword rows with an ASCII companion field. No keyword data was persisted back into OpenSEO.

## Deliverables

The numbered files cover baseline, competitors, keyword universe, gaps, ownership, architecture, technical audit, backlink prospects, implementation, measurement, and roadmap. Supporting inventories, clinical review register, SERP validation, content briefs, and raw exports sit beside them.

The 2026-09-01 page-level package is documented in
[`11-page-by-page-optimization.md`](11-page-by-page-optimization.md). Its
[`page-by-page-completion-matrix.csv`](page-by-page-completion-matrix.csv)
covers all 50 in-scope URLs and is validated against all 481 keyword-owner rows.
The exact live technical inputs are preserved in
[`raw/live-page-seo-snapshot-2026-09-01.csv`](raw/live-page-seo-snapshot-2026-09-01.csv).

The 31 eligible clinical recommendations have source-pinned guarded payloads for
PageContent, services, doctor/profile metadata, one blog and seven tools. Eighteen
distinct pages are now clinically approved and live: 17 from the 2026-09-01 rollout
and the dermatology service approved on 2026-09-02. Thirteen eligible pages remain
pending the reviewer role stated in `clinical-review-register.csv`. The register
remains the promotion authority, and English targets still require native review.

Run the lightweight integrity check after editing any generated CSV:

```powershell
node seo/czechia/validate-artifacts.mjs
```

## Known limits

- OpenSEO returned Czech keyword data for `2203/cs`; its English keyword-research endpoint did not return a supported language combination. English-for-Czechia demand therefore comes from live Czechia SERPs, GSC, target rankings, and reviewed competitor pages, not invented English volume.
- GA4 organic conversion data is sparse: the overview has 24 sitewide sessions, while Czechia organic landing pages have 4 sessions and no key events in the final-data refresh. A Czechia-wide unique-user count is unavailable from the landing-page rows. GSC is the primary performance baseline.
- The 100-page technical crawl followed cross-market links into Ireland after the Czech start URL. Its Lighthouse coverage is useful, but its issue totals are not a Czech-only defect count.
- Backlink exports contain provider anomalies and noisy sources. Every prospect requires manual relevance, editorial, and spam review before outreach.

## How to compare a matrix row against the live page

The matrices record the title as it is **stored**, not as it is **served**.
`frontend/lib/seo/page-seo.ts` (`compactSearchTitle`) appends ` · Global Health`
when the result still fits Google's ~60-character budget and drops it when it does
not, so 40 of the 125 live Czechia and Portugal pages serve a title 16 characters
longer than their matrix cell. A live title is correct when it equals the recorded
title either exactly or with that one suffix added. Meta descriptions are served
verbatim and must match exactly.

Recorded 2026-09-02 by `CZ-PT-BATCH-REVIEW-001` (ledger §38) after an independent
re-fetch of all 125 matrix URLs; without this rule the comparison reports 40 false
mismatches.
