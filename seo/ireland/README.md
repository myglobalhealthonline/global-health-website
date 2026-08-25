# Ireland organic SEO programme

**Status:** research package plus reviewed GP/specialist repository batch, updated 2026-08-25
**Canonical operational source:** `docs/plans/seo-control-state.md`
**Market:** Republic of Ireland, Google, English, DataForSEO location 2372
**Domains:** `www.myglobalhealth.online` and competitor `www.webdoctor.ie`

This directory is a derived Ireland research package. It does not replace the canonical SEO ledger. If a recommendation here conflicts with the dated ledger, the ledger wins.

## Outcome

Fresh evidence supports an authority-and-intent programme, not a broad technical rewrite. OpenSEO's latest 100-page audit completed with no critical issues, one thin-root warning and informational length flags. The target's organic footprint is materially smaller than WebDoctor's, and the five sampled SERPs are competitive commercial or mixed-health results.

A focused follow-up review found two safe code defects outside the frozen lab cluster: the GP hub did not restrict its clinician cards to reciprocal assignments on active GP services, and the specialist hub could emit fallback FAQ/service structured data that differed from its visible authored content. Both are corrected in the repository with focused tests. No CMS record, price, duration, credential, clinical flow, booking logic, route, title, meta description or H1 was changed, and nothing has been deployed by this batch.

## Key evidence

- OpenSEO Ireland estimates: Global Health 217 organic visits / 112 ranking keywords; WebDoctor 80,967 / 3,036.
- Domain-scope filtered backlink summaries: Global Health 36 referring domains; WebDoctor 117. Trend data includes subdomains and is therefore not directly comparable to the filtered snapshot.
- GSC Ireland, final data:
  - 2026-05-25 to 2026-08-22: 119 clicks and 7,283 impressions across 1,851 query-page rows.
  - 2026-02-24 to 2026-05-24: 72 clicks and 1,176 impressions across 338 rows.
  - Change: clicks +65.3%; impressions +519.3%. The increase reflects rapid index expansion and must not be presented as a stable conversion trend.
  - A conservative name/brand filter leaves 29 clicks and 6,453 impressions. This is a working analytical filter, not an authoritative branded-query taxonomy.
- OpenSEO GA4 organic overview for the current period returned only 24 sessions, 22 active users and zero key events; the previous comparison was unavailable. This conflicts with GSC scale and indicates incomplete analytics coverage or a short effective GA4 history.
- Research collection: 519 raw keyword rows, 510 initially deduplicated, 152 retained after brand, relevance, service-fit and unsafe-expectation filtering.
- OpenSEO credit balance: 16,807 before and 16,327 after, a 480-credit delta.

## Directory map

- `01-baseline-audit.md` — repository, production and first-party baseline.
- `target-page-inventory.csv` — 27 priority target URLs with live status, metadata, H1, schema, link and conversion fields.
- `02-webdoctor-competitor-audit.md` and `webdoctor-page-inventory.csv` — all 282 sitemap URLs inventoried, with a bounded 20-page deep template analysis.
- `03-keyword-master.csv` — clustered and scored Ireland keyword set.
- `04-content-gap.csv` — target-versus-competitor gaps and exclusions.
- `05-url-keyword-map.csv` — one primary intent per priority URL.
- `06-proposed-site-architecture.md` — keep-first hub-and-spoke architecture.
- `07-technical-audit.md` — verified technical findings and implementation status.
- `08-backlink-opportunities.csv` — legitimate authority opportunities and exclusions.
- `09-implementation-log.md` — changes and deliberate non-changes.
- `10-measurement-plan.md` — privacy-safe KPIs and gates.
- `11-30-60-90-day-roadmap.md` — owners, dependencies and dates.
- `clinical-review-register.csv` — medical/legal publication gates.
- `content-briefs/` — page-level briefs.
- `raw/openseo-call-log.jsonl` — sanitised call ledger.

## Opportunity score

The 0–100 score uses:

- business fit 25%
- intent/conversion fit 20%
- attainability 15%
- relative demand percentile 15%
- competitor/content gap 15%
- SERP/page-type fit 10%

Attainability uses returned keyword difficulty plus a striking-distance uplift where the Ireland GSC query was already in positions 4–20. Missing difficulty uses a neutral midpoint, not zero. The score prioritises research; it does not predict rankings.

## Evidence rules

- “Observed” means verified in repository code, rendered production, XML or public competitor pages.
- “OpenSEO” means tool-returned data for location 2372 / English unless noted.
- “GSC” and “GA4” are first-party connector outputs.
- “Inference” is clearly labelled and is not a fact.
- Blank or `Unavailable` values were not estimated.
- WebDoctor-branded terms were excluded from targeting.
- No keyword was saved/tagged and no rank tracker was created.

## Connected MCP surface

Enumerated server namespaces were: `21st`, `codex_apps`, `context7`, `github`, `memory`, `node_repl`, `openseo`, `playwright` and `sequential_thinking`. OpenSEO exposed 44 tools covering projects/context, audits, domain and ranked-keyword research, keyword metrics/research, SERPs, backlinks, rank tracking, local search, GSC, GA4 and Google Business data. Only the read-only/focused tools recorded in `raw/openseo-call-log.jsonl` were used.
