# Portugal SEO measurement plan

## Baseline

Primary baseline: final GSC data through 2026-08-28. Use both Portugal searcher country and canonical `/portugal/pt` page filters; neither alone is a complete market view.

- Portugal country: 359 clicks, 8,962 impressions, 4.0% CTR, position 15.9.
- Device-complete current window: 350 clicks, 8,862 impressions.
- Query-visible current window: 811 rows, 45 clicks, 2,939 impressions.
- Query/page current window: 1,022 rows, 45 clicks, 3,229 impressions.

GSC query totals are privacy-thresholded. Never reconcile them to device totals by inventing “missing keywords.”

## KPI definitions

| KPI | Definition | Source | Cadence |
|---|---|---|---|
| Portugal organic clicks/impressions | Searcher country = PRT, web search | GSC | Weekly pulse; finalized 28-day monthly |
| Portugal canonical page clicks | Page contains `/portugal/pt` | GSC | Weekly/monthly |
| Non-brand clicks | Exclude Global Health and clinician-name regex list | GSC export | Monthly |
| Competitor-brand clicks | DrOnline, Knok, CUF, Médis, Multicare, etc. | GSC export | Monthly |
| CTR | Clicks / impressions, query-page and device segmented | GSC | Monthly |
| Top 3/10/20 count | Latest rank snapshot by approved keyword set | OpenSEO/manual GSC | Monthly; no recurring paid tracker created |
| Cluster visibility | Clicks, impressions, average position by `cluster_id` mapping | GSC + URL map | Monthly |
| Indexed pages | Submitted/indexed and canonical match for approved URL sample | URL Inspection + sitemap | Monthly/watchlist |
| Crawl errors | 4xx/5xx, blocked, canonical conflict, noindex | route-contained audit/logs | Monthly |
| Referring domains | Quality-filtered referring-domain count, new/lost | OpenSEO backlinks | Monthly/quarterly |
| Organic landings | Sessions/engaged sessions on canonical Portugal URLs | GA4 | Weekly after data validation |
| Organic booking conversion | Generic booking-start and completion events attributed to organic landing/session | GA4/backend aggregate | Monthly |
| Organic conversion rate | completed bookings / organic eligible sessions | Approved analytics model | Monthly |

## Segment rules

- Brand: `global health`, `globalhealth`, `my global health` and confirmed misspellings.
- Clinician brand: verified public clinician names; report separately.
- Competitor brand: explicit competitor names, never mixed with non-brand demand.
- Public-system intent: SNS/SNS24/Segurança Social/centro de saúde; do not report as commercial service opportunity.
- Language: `pt-PT` canonical pages separate from Portugal English routes.
- Device: mobile, desktop, tablet.
- Cluster: use `05-url-keyword-map.csv`.

## Conversion privacy

Use the existing generic booking architecture. Allowed concepts include `begin_booking`, `purchase`, or a repository-consistent generic equivalent. Do not send symptoms, diagnoses, medications, specialty-sensitive text, free-form consultation details, clinician notes or patient identifiers in URLs, event names, parameters, pixels or referrers.

Validate:

1. event fires once;
2. landing page and session source/medium persist;
3. consent behavior works;
4. no health detail appears in payload;
5. `begin_booking` and completed booking semantics are documented;
6. test/internal traffic can be excluded;
7. organic and paid are not conflated.

## Experiment protocol

For a page change:

1. Record current title/description/H1/content hash, canonical and deployment date.
2. Save the target query cluster and hypothesis.
3. Avoid overlapping page changes during the window.
4. Confirm deployment and recrawl.
5. Wait at least 28 complete days plus GSC final-data lag.
6. Compare matched weekday windows and query mix.
7. Judge clicks, impressions, CTR, position and conversion together.
8. Revert only on evidence; do not rewrite repeatedly during crawl lag.

Driving certificate: no new on-page experiment until authority work or a materially different SERP diagnosis exists. Pedro Santos: indexation watch, not a content experiment.

## Reporting tables

Monthly report should include:

- page/cluster;
- current and prior clicks/impressions/CTR/position;
- non-brand share;
- top-3/10/20 terms;
- indexed state/canonical;
- organic landings/bookings/conversion rate;
- new/lost quality referring domains;
- deployed change and maturity date;
- decision: wait, retain, iterate, revert, or escalate.

## Data quality alerts

Escalate when:

- GA4 remains empty while GSC clicks continue;
- key-event volume is zero despite verified production bookings;
- another locale owns Portuguese queries for two finalized 28-day windows;
- an indexable canonical remains stored as noindex after a fresh post-fix crawl;
- sitemap and canonical owners disagree;
- a 14-day finalized click loss ≥20% affects a mature unchanged cluster;
- analytics payload includes health information.
