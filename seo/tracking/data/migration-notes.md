# A8 — Wix → Next.js migration reconstruction (2026-09-15)

Universe **1,142** legacy URLs (union of non-current-shape GSC pages, concrete `next.config.ts`
rule sources, on-domain backlink targets, repo legacy lists, retired list; de-duplicated on
normalized path). **1,142 probed live** — no family reached the ≥50-consecutive-identical
early-stop threshold, so nothing was sampled. Raw log:
`seo/tracking/raw/2026-09-15/A8-migration/probe.jsonl`. Full table: `migration.csv`.

Universe carries **2,163 historical clicks / 70,780 impressions** (GSC 2025-05-15..2026-07-31)
and **262 referring domains** across 230 URLs.

## Counts by test_status

| test_status | URLs | hist. clicks | hist. impressions |
| --- | ---: | ---: | ---: |
| pass | 691 | 1,290 | — |
| wrong_target | 219 | 185 | — |
| missing_redirect | 91 | 388 | 8,784 |
| dead_end | 89 | 103 | 14,474 |
| retired_ok | 43 | 117 | — |
| chain | 9 | 97 | — |
| loop | 0 | — | — |
| untested | 0 | — | — |

Priority: P0 19 · P1 65 · P2 58 · P3 1,000.
Mapping source: 1,000 rows resolve through a `next.config.ts` rule, 43 through the 410 path,
22 by analyst entity match, 77 have no mapping at all.

Content equivalence: related_hub 494 · same_intent 222 · none 180 · same_entity 142 ·
homepage_fallback 61 · retired_intentionally 43.

## Top 20 legacy URLs by value, with disposition

| # | legacy path | clicks | impr | ref.dom | test_status | equivalence |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 1 | `/pt/portugal-doctors/dr-telmo-coelho` | 82 | 1174 | 0 | pass | same_entity |
| 2 | `/ireland-doctors/dr-grainne-ahern` | 77 | 540 | 0 | retired_ok | retired_intentionally |
| 3 | `/home-pt` | 69 | 1083 | 0 | pass | homepage_fallback |
| 4 | `/team/dra-andra-cristea` | 58 | 550 | 0 | **missing_redirect** | none |
| 5 | `/pt/portugal-doctors/dr-tiago-miguel-figueira` | 53 | 323 | 0 | pass | same_entity |
| 6 | `/ireland-team` | 49 | 588 | 0 | pass | related_hub |
| 7 | `/es/czechia-doctors/mudr-jana-cyplinska` | 51 | 163 | 0 | wrong_target | related_hub |
| 8 | `/ireland-doctors/dr-tiago-miguel-figueira` | 45 | 792 | 0 | pass | same_entity |
| 9 | `/pt/portugal-doctors/dr-vitor-pais` | 47 | 308 | 0 | pass | same_intent |
| 10 | `/home-cz` | 45 | 678 | 0 | pass | homepage_fallback |
| 11 | `/portugal/medical-certificate-for-driving-license` | 28 | 2826 | 0 | pass | same_intent |
| 12 | `/about` | 29 | 1956 | 0 | pass | related_hub |
| 13 | `/ireland-doctors/dr-mohammed-omar` | 35 | 731 | 0 | pass | same_entity |
| 14 | `/home` | 29 | 943 | 3 | pass | homepage_fallback |
| 15 | `/cs/czechia-doctors/mudr-vojtěch-černý` | 37 | 241 | 0 | **chain** (2 hops) | same_entity |
| 16 | `/team-1/dr-tiago-miguel-figueira` | 35 | 390 | 0 | **missing_redirect** | none |
| 17 | `/team/dr-tiago-miguel-figueira` | 33 | 684 | 0 | **missing_redirect** | none |
| 18 | `/ireland-doctors/dr-fatima-ali` | 33 | 660 | 0 | pass | same_entity |
| 19 | `/pt/portugal-doctors/dr-pedro-santos` | 28 | 376 | 0 | pass | same_entity |
| 20 | `/ireland-doctors/dr-yousif-mohamed` | 28 | 203 | 0 | pass | same_entity |

## Families that need rules

1. **`/team`, `/team-1`, `/team-2`, `/team-3` (+ `/team/{slug}`) — 28 URLs, 296 clicks,
   4,305 impressions, zero rules.** `next.config.ts` has `/{country}-team` and its
   locale-prefixed variants (lines 1065–1088, 1305–1376) but nothing for the bare Wix
   `team*` shapes. 20 of these resolve by name to a clinician who is live today
   (`/team/dr-fahad-farooq` → `dr-fahad-farooq`, `/team/dra-fatima-ali` → `dr-fatima-ali`,
   `/team/physiotherapeut-priscila-figueiredo` → `priscila-figueiredo`,
   `/team/dr.-mohamed-fadzly-mustafar` → `dr-mohamed-fadzly-bin-mohamed`,
   `/team-2/dr-ahmed-maklad` → Czechia). The rest (`dra-andra-cristea`, `dra-julieta-janik`,
   `dr-rosa-mora-ferrer`) match nobody on any roster and need an owner disposition, not a guess.
2. **`/services-1`, `/services-2`, `/services-1-1`, `/services-1-2` (+ locale prefixes) —
   43 URLs, 60 clicks, 1,083 impressions, all 404.** Only `/services-1-4` has a rule (line 727).
3. **Ireland lab-tests chain — 76 URLs, 35 clicks, 13,835 impressions, 15 referring domains,
   all 308 → 404.** `/product-page/*`, `/home-health-tests*/*`, `/home-delivery`,
   `/home-health-test`. Cause is the admin `health-tests` country feature being off for
   Ireland — already recorded as P0 in
   `seo/tracking/raw/2026-09-15/A2-probe/incident-ireland-lab-tests-404-2026-09-15.md`.
   Not re-diagnosed here; the redirects themselves are correct and become correct again the
   moment the flag is restored. This single family is 96% of all dead-end impressions.
4. **`/product-page/beauty-focus-multibeauty` — 10 clicks, 1,289 impressions, 404.** The
   broad `/product-page/:slug` rule (index 179) explicitly *excludes* this slug, and
   `gone-content.ts` `RETIRED_LEGACY_URLS` lists `/es/`, `/pt/`, `/cs/`, `/ro/` variants but
   **not the bare path** — so the highest-impression retired product answers 404 instead of
   410. A one-line omission, not a policy question.
5. **Departed-clinician dead ends — 13 URLs, 68 clicks.** The broad `{country}-doctors/:slug`
   rules rewrite the slug unchanged, so `dr-ariana-gonzalvez-garcia`, `dra-ana-jerónimo`,
   `dr-rui-diogo-rodrigues`, `dr-julieta-janik`, `dr-rosa-mora-ferrer`,
   `dr-pablo-esteban-martinez` return a healthy 308 onto a 404. Same mechanism the
   2026-08-08 recovery batch closed for an earlier cohort; it re-opens whenever a clinician
   leaves. Needs an owner call per clinician (410 vs 308 to the market doctors hub) — no
   substitute clinician should be invented.
6. **Locale not preserved — 191 URLs, ~150 clicks.** Wix multilingual URLs
   (`/{cs|es|pt|ro}/…`) redirect to the market's *default* language even where the requested
   locale exists in the sitemap: `/cs/ireland-doctors/dr-ahmed-maklad` → `/ireland/en/…`
   though `/ireland/cs/doctors/dr-ahmed-maklad` is live and sitemapped. Low per-URL value,
   coherent as one rule change (carry `:locale` into the destination).
7. **Hub/home fallback where a specific page exists — 28 URLs.** `/careers` and `/pt/careers`
   → `/ireland/en/about` although `/ireland/{en,pt}/careers` are live and sitemapped (21 clicks
   / 752 impressions on `/careers` alone); `/{lang}/about` → `/ireland/en/about`;
   `/pt/portugal-specialist-consultations/consulta-de-cardiologia` → the specialist hub
   although `/portugal/pt/services/consulta-cardiologia` exists.
8. **Chains — 9 URLs, 97 clicks.** All diacritic doctor slugs: the percent-encoded Wix slug
   308s to the percent-encoded current slug, which 308s again to the ASCII slug
   (`/cs/czechia-doctors/mudr-vojtěch-černý` → `…/mudr-vojt%C4%9Bch-%C4%8Dern%C3%BD` →
   `…/mudr-vojtech-cerny`). Collapse to one hop. No loops found.

## Intentionally retired — do not revive

43 URLs answer 410 and every one of the 36 paths in `A1-inventory/retired.csv` was verified
to answer 410 in one hop with no `Location`. Two clinicians in `GONE_DOCTORS`
(`dr-grainne-ahern`, `dr-mala-vili-rajan`) plus the 22 `RETIRED_LEGACY_URLS` paths
(dead doctor aliases, Wix CMS placeholders, `gift-card`, `beauty-focus-multibeauty` locale
variants, `telemedicine-kit`). The live 410 set is *wider* than `retired.csv` because
`gone-content.ts` generates locale variants from the slug — e.g.
`/ireland-doctors/dr-mirza-aun-mohammad` (15 clicks) and `/ro/ireland-doctors/dr-andra-cristea`
answer 410 without appearing in the CSV. No recovery is proposed for any of them.

## Obsolete internal links — not assessed

`seo/tracking/data/internal_links.csv` existed at check time but was still being written (78 rows from 2
source pages at the last check, zero legacy-shaped targets among them). That is not enough coverage
to test the 20 highest-value legacy URLs, so the internal-link check is **skipped**, not passed.
Re-run it against A2's completed crawl.

## Data defect found in an input

`A1-inventory/legacy_urls.csv` is malformed: 1,036 of its 1,133 `raw_url` values contain an
entire unquoted source-CSV line (`"/post/x,https://…,nofollow,live,2026-08-21,…"`). This pass
recovered the URL by truncating at the first comma; A1's builder should quote the field. Without
the fix the file inflates any de-duplicated universe by roughly 1,000 phantom rows.

## Launch-date verdict

**The evidence supports cutover on or about 2026-07-17, with Google's discovery step visible
2026-07-20 → 2026-07-21. It does not support 2026-07-21 as the deploy date.**

- Current-shape `/{country}/{lang}/…` URLs already earned **1,081 impressions across 289
  pages inside the 2026-07-01..07-20 GSC bucket** — before the 07-21 boundary the monthly pull
  labels `post_launch`.
- Commit `c602219e` (2026-07-19) is *"301 legacy Wix URLs that Google still indexes (were
  soft-404s)"* — the new stack was already serving production traffic and already soft-404ing
  Wix URLs by 19 July. `ab0fe717` (2026-07-17) ships the first complete Next.js sitemap +
  robots, matching the stated 2026-07-17 release-branch merge.
- Property-level daily impressions step from a 344–631/day baseline to **631 (07-19) → 1,188
  (07-20) → 2,343 (07-21)** — a crawl/indexing response, which lags a deploy by days.
- No commit in the repo announces a DNS or hosting cutover, so the deploy date itself is
  inferred from code and traffic, not observed directly. Stated as such.

## Comparison-window guidance

- Compare **equal-length, non-overlapping** windows anchored on the launch evidence above —
  e.g. 2026-06-19..2026-07-16 (pre) vs 2026-07-18..2026-08-14 (post). Never compare two
  rolling 28-day snapshots that share days; the overlap manufactures both "growth" and
  "decline".
- Exclude **2026-08-02..2026-09-08** from any GA4 comparison: collection was dead, and the
  rows are absent rather than zero (`ga4_outage_windows.csv`). GSC is unaffected by that
  outage and remains the series to trend.
- Legacy-URL clicks are **not** a loss. GSC attributes to the redirect *source* for weeks after
  a 308 lands; ledger §22.3 measured 48% of clicks still entering through legacy URLs five
  weeks post-launch. Treat that share as a consolidation-progress measure, not duplication.
- A step change that coincides with a deploy is **correlation**. The one causal claim in this
  pass — the Ireland lab-tests 404s — rests on code plus a live API read, not on timing.
- Nothing here attributes anything to the previous provider. The Wix-era corpus is the
  measurement baseline; every defect above is in the current redirect map or the current
  feature flags, and is fixable here.
