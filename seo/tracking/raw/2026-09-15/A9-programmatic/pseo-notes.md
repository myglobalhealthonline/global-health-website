# A9 — programmatic SEO evaluation, 2026-09-15

Read-only pass: no repo changes outside `seo/tracking/`, no production writes, no
OpenSEO calls. Figures from the A1–A8 exports in `seo/tracking/data/`; W1 = 2026-08-18..09-14.

**Headline: no new programmatic family is recommended this cycle.** The site has no
page-supply problem: 3,752 inventory rows, 2,118 canonical candidates, 6 locales per
market (pt 516, en 512, es 501, cs 441, ro 440, **de 440**) — and only ~955 URLs earn
any impression. Seven of eight candidates are rejected or deferred; the eighth publishes
**zero new pages**.

## 1. Family scoreboard (from `template_family_eval.csv`)

| Family | URLs live | Indexed | Zero-impr share | Impr W1 | Clicks | CTR | vs W0 | Read |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tools | 264 | 94% | 0.22 | 20,852 | 160 | 0.77% | +181% | Volume machine, no commercial path. Ledger DEFERRED stands. |
| blog | 279 | 76% | 0.42 | 19,243 | 132 | 0.69% | +208% | Best content assets live here (sick-note guides rank 5–13). |
| market_home | 55 | 100% | 0.29 | 11,846 | 256 | 2.16% | +98% | 0.51 duplicate-text share; only 33 of 55 in sitemap. |
| services | 666 | 87% | 0.38 | 7,253 | 94 | 1.30% | +12% | Largest family, flattest growth. Cannot absorb a multiplier. |
| other_unknown | 337 | 100% | 0.75 | 5,506 | 49 | 0.89% | −25% | 0.97 duplicate text, 63 of 337 in sitemap. Cleanup, not growth. |
| doctors | 402 | 78% | 0.56 | 5,134 | 258 | **5.03%** | +95% | Best CTR on site — 100% name navigation. |
| corporate_static | 166 | 88% | 0.54 | 1,386 | 29 | 2.09% | +120% | Median 605 words. |
| legal | 233 | 81% | 0.55 | 501 | 4 | 0.80% | −50% | Correctly de-prioritised per the 2026-07-28 plan. |
| careers | 65 | **17%** | 0.59 | 297 | 19 | 6.40% | new | Lowest indexed share of any live family. |
| consult_booking | 226 | 100% | 0.91 | 245 | 2 | 0.82% | +20% | Median 54 words; 33 of 226 in sitemap. Correct — transactional. |
| press | 45 | 63% | 0.47 | 166 | 0 | 0% | new | — |
| health_legacy | 66 | **27%** | 0.61 | 120 | 4 | 3.33% | −68% | But `/ireland/sick-leave` alone holds pos 2 for `sick cert ireland`. |
| lab-tests | **6 of 117** | — | 1.00 | 0 | 0 | — | — | **LIVE REGRESSION — see §4.** |

## 2. Cannibalisation (`cannibalisation.csv`, 591 clusters)

375 of 591 clusters (63%) are wrong-locale — 8,066 impr, 86 clicks. Of those, **157
clusters (1,546 impr, 1 click) have their winning URL on a locale that is not their own
market's**: Romania 43, Spain 37, Ireland 31, Portugal 24, Brazil 12, Czechia 10. This
corroborates A7 finding #1 (RO 5/16, BR 4/11, ES 2/47, IE 4/100) and extends it — the
leak is ~10× wider than the ranked-keyword sample showed. Sections most affected: tools
108, market_home 107, blog 82, services 35. Top 10 by impressions:

| Query | Impr / clicks | Competing own URLs |
| --- | --- | --- |
| `calculator calorii` | 1,604 / 19 | `/romania/ro/tools/calorie-calculator` p8 · `/spain/ro/tools/calorie-calculator` p22 |
| `global health` | 306 / 20 | 19 URLs across all 6 markets and 5 locales |
| `calculator de calorii` | 275 / 2 | `/romania/ro/...calorie-calculator` p8 · `/spain/ro/...` p18 |
| `illness benefit ireland` | 183 / 0 | two IE `en` blog posts split 144/38 · `/ireland/cs/blog/...` |
| `medicos online` | 144 / 0 | `/spain/es` p23 · `/portugal/pt` p46 · `/portugal/es/services/consulta-medica` p79 · `/romania/es` · `/spain/pt` |
| `consulta medica online` | 130 / 0 | `/spain/es` p42 · `/portugal/pt` p58 · `/portugal/es/services/consulta-medica` p89 |
| `my global health` | 120 / 8 | 26 URLs incl. `/privacy` and `/service-page/ie-medical-consultation` |
| `neschopenka` | 104 / 0 | `/czechia/cs/blog/...` p25 · `/czechia/en/...` p1 · `/czechia/de/...` p2 |
| `global health ireland` | 100 / 5 | 5 URLs incl. the non-www `myglobalhealth.online/ie/en/book` |
| `médico online` | 97 / 0 | `/portugal/pt` p58 · `/spain/es` p26 · `/portugal/es/services/consulta-medica` p86 · `/brazil/pt` p26 |

Worst offenders (winner on the wrong locale for its own market): `psiquiatra online`
93 impr won by **`/spain/pt/`**; `consulta online saúde masculina` 52 impr won by
**`/brazil/de/`** (a German page for a Portuguese query); `cita medico` 58 +
`consulta online` 45 won by `/portugal/es/`; five Irish sick-cert queries (243 impr) all
won by the locale-less legacy `/ireland/sick-leave`.

## 3. Ranked candidates (`pseo_plan.csv`, 8 rows)

| ID | Family | Decision | One-line reason |
| --- | --- | --- | --- |
| PS-08 | Wrong-locale consolidation (0 new URLs) | **PILOT** | 1,546 impr / 1 click already held and misrouted. |
| PS-02 | Symptom/condition guides | defer | Real volume (PT 20,750 + 28,710), but no first-party data to template — it is editorial, governed by `editorial-plan-2026-08-19.md` §7. |
| PS-03 | Sick-note guide per employer situation | reject (improve existing) | Guides exist and rank 5–13. Fix `/ireland/en/services/sick-certificate-ireland` (411 impr, 0 clicks, pos 40) instead. |
| PS-05 | Tool result-interpretation | reject (improve existing) | The tool page *is* the interpretation page; put the clinician table into the 4 blood-pressure-chart pages already at pos 26–30. |
| PS-04 | Ireland lab-test × condition | reject (blocked) | Family is 404 as of 2026-09-14. |
| PS-06 | Doctor × specialty | reject | 370 specialty impressions site-wide; the family's 258 clicks are all name navigation. |
| PS-07 | Per-market cost pages | reject | 2 price keywords of 820. The 94 "cost" GSC rows are Irish *state* benefit amounts. |
| PS-01 | Service × city | reject | 35 impr, 1 click; the 12 keyword rows are all physical-clinic navigation in Prague. Doorway pattern. |

## 4. Blocker found while evaluating PS-04

**Ireland lab-tests went 404 on 2026-09-14.** Weekly impressions: 810 (w/c 08-31), 953
(w/c 09-07), then **17** in the partial week from 09-14. `url_inspection.csv` still
records 12 as *Submitted and indexed* (last crawls 2026-08-07..09-07), so Google has not
yet seen the 404s. 6 of 117 inventory rows live, 0 in the sitemap; full-window loss
6,200 impr / 28 clicks. This outranks every growth candidate here and should be triaged
before any A9 work starts.

## 5. The pilot — PS-08, 12 existing URLs, zero new pages

Consolidate the 12 highest-impression clusters whose winner is on the wrong locale
(1,546 impr, 1 click today), five of them Ireland's sick-certificate cluster sitting on
the legacy `/ireland/sick-leave` lander while the `en` service page sits at pos 40. Work
is hreflang/canonical/internal-link correction plus a decision on the legacy lander — no
content is written.

- **Gates.** Verify live serving and hreflang reciprocity on all 12 first (grep
  `hrefLang`, camelCase — a `hreflang` grep returns zero). No locale variant noindexed
  (§27.5). `/ireland/sick-leave` keeps a 200 or a 308, never a 404 — it holds pos 2 for
  `sick cert ireland`. Nothing lands until the §4 lab-tests regression is triaged.
  Refresh GSC for the 12 clusters immediately before the change (CLAUDE.md pre-batch rule).
- **Rollback.** Revert if at 30 days own-locale impressions fall below the 1,546 baseline
  −20%, or any of the 12 loses >10 positions, or `/ireland/sick-leave` loses pos 2.
- **Measurement.** 30/60/90 days from the first post-change crawl in `url_inspection` —
  index state, not deploy date.
- **Success.** ≥15 clicks/month across the 12 clusters at 90 days (today 0); at 60 days
  ≥8 of 12 show their own-locale URL as `top_url` on a re-run of `cannibalisation.csv`.

Proposed pages stay out of `page_inventory.csv` — PS-08 proposes none.

## 6. Explicitly not doing (reconciled with the old ledger)

Carried forward unchanged from `seo-control-state.md` §7 DEFERRED and §27.5 and from
`seo-indexation-plan-2026-07-28.md` §5 — A9 reopens none of these: calculator/tool long
tail (SEO-GROWTH-012, the exact basis for rejecting PS-05); Ireland lab-test copy
rewrite (SEO-GROWTH-016 §6, and the family is offline); homepage query-mix/CTR and
brand-collision queries; non-geo consumer test terms and `stool testing ireland` /
local-pack queries (the direct precedent for rejecting PS-01); prescription content
while the Google Ads trade-off binds (the PT `prescrição` cluster, 24 queries /
8,470 vol, was seen and deliberately not proposed); blanket title/description rewrites;
tool CTA rebuilds without page-level evidence; **mass `noindex` of locale variants** —
PS-08's policy is index-primary-locale with every variant left self-canonical and
indexable, not noindex; Indexing API mass submission; `llms.txt`; SEO-METADATA-005; the
48 orphaned legal pages and the 2 Spain `noindex` legal pages.

New to the list from A9:

- **Service × city, any market** — no per-city first-party data for a remote service;
  35 impressions and 1 click of measured demand.
- **Doctor × specialty landing pages** — 370 non-brand specialty impressions across six
  markets; add filtering to the existing `/doctors` index instead.
- **Per-market cost/pricing pages** — 2 price keywords of 820; the cost demand is for
  the Irish state's benefit figure, which MGH already ranks 4–8 for at 0 clicks.
- **Any new family multiplied across the 6-locale matrix** until the 375 wrong-locale
  clusters are reduced. A seventh locale-multiplied family on a site where 63% of
  clusters already self-compete adds contention, not reach.
