# Ireland SEO measurement plan

## Baseline

- Date: 2026-08-25.
- Complete GSC period: 2026-05-25 to 2026-08-22.
- Comparison: 2026-02-24 to 2026-05-24.
- Ireland GSC current: 119 clicks, 7,283 impressions.
- Working non-brand current: 29 clicks, 6,453 impressions.
- OpenSEO domain estimate: 217 organic visits, 112 ranking keywords.
- GA4 organic: 24 sessions and zero key events, with incomplete comparison coverage.

## KPI definitions

| KPI | Definition | Source | Cadence | Guardrail |
| --- | --- | --- | --- | --- |
| Ireland organic clicks | GSC web clicks with country `irl` | GSC via OpenSEO/admin endpoint | Weekly, 28-day rolling | End 3 days back |
| Non-brand organic clicks | Ireland clicks excluding approved brand/clinician taxonomy | GSC | Monthly | Version the filter; report unknown names separately |
| Ireland impressions | GSC web impressions, country `irl` | GSC | Weekly | Do not treat impression growth as conversions |
| Top 3 / top 10 counts | Tracked priority keywords in positions 1–3 / 1–10 | OpenSEO manual research or approved tracker | Monthly | No recurring tracker without approval |
| Cluster visibility | Median/weighted position for cluster terms | GSC + OpenSEO | Monthly | Keep commercial and informational intent separate |
| Organic booking conversions | `purchase` events attributed to eligible organic landing sessions; reconcile against privacy-safe backend aggregate | GA4/backend aggregate | Monthly | Never send service, symptom, test or questionnaire details |
| Organic conversion rate | Organic-attributed `purchase` events / eligible organic sessions | GA4 | Monthly | Do not publish until tag coverage is reconciled |
| Organic booking funnel | Counts and step-through rates for `begin_booking` → `begin_checkout` → `purchase` | GA4 | Monthly | Use only these verified event names and aggregate dimensions |
| Priority-page CTR | GSC clicks/impressions by canonical URL and query class | GSC | Fortnightly for P0 | Compare like-for-like query mix |
| Indexed-page count | Sitemap URLs indexed/eligible | GSC URL inspection + sitemap | Monthly | Separate served 200 from indexable |
| Crawl errors | 4xx/5xx, chains, loops and broken links | OpenSEO audit + CI | Monthly/after deploy | Do not rerun full crawl for a single page |
| Referring-domain growth | Filtered legitimate domain count | OpenSEO | Monthly | Separate filtered snapshot from subdomain-inclusive trend |
| Page performance | LCP, INP, CLS and TTFB | Search Console CWV / Lighthouse | After UI deploy + monthly | Test representative templates |
| Content quality gate | Source date, reviewer, visible safety and CTA | Clinical register | Before publish | No automatic review-date bump |

## Branded versus non-branded

Maintain an explicit, versioned regex/list for:

- Global Health / My Global Health spelling variants.
- Current verified clinician names.
- Known legacy brand routes where branded intent persists.

Competitor brands, other healthcare brands and generic clinician terms are not automatically “brand”. Store only aggregate query classifications in reports.

## Privacy and health-data exclusion

Verified production conversion events:

- `begin_booking`
- `begin_checkout`
- `purchase`

These names are the repository source of truth as of 2026-08-25. Do not introduce parallel SEO-only aliases. Any future account/contact events must be verified in implementation before appearing in reporting.

Disallowed parameters include service/condition names, medication, symptoms, test names, questionnaire answers, consultation notes, patient identifiers or free text. URLs and referrers must remain sanitised. Analytics stays consent-gated.

## Decision gates

1. **~2026-09-08:** remeasure Ireland lab hub/detail pages. Change only if the canonical ledger threshold is met.
2. **After sick-cert recrawl:** compare current canonical/service/article query attribution before snippet or copy changes.
3. **Before conversion optimisation:** reconcile GA4 coverage and confirm that the verified `begin_booking`, `begin_checkout` and `purchase` events are collected and classified correctly; use `purchase` as the completed-booking conversion.
4. **Before page creation:** confirm service exists, SERP expects that page type, intent is not already owned and clinical reviewer is assigned.
5. **After every deploy:** focused live URL, canonical, robots, H1, JSON-LD, CTA and redirect checks.

## Reporting

- Weekly: watchlist exceptions and deploy checks.
- Monthly: cluster scorecard, GSC/GA4 reconciliation and backlinks.
- Quarterly: content pruning/refresh, authority programme and architecture review.
- Annotate every deploy, clinical approval and redirect change.
