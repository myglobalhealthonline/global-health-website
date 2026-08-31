# Czechia baseline audit

Date: `2026-08-31`

## Executive diagnosis

Czechia is no longer a missing-page market. The sitemap contains 281 Czechia URLs, including 48 Czech pages, and URL Inspection confirms the core home, GP, service, blog, doctor, and tool routes are live with matching canonicals. The constraint is now commercial query ownership, click-through, and authority.

The strongest near-term opportunities are to make the GP page the unambiguous owner of broad online-doctor intent, keep eNeschopenka service and explainer intent separate, deepen treatment-renewal and specialist service pages, and protect the already-performing English-for-Prague route.

## Search and analytics baseline

| Source | Window/scope | Result |
| --- | --- | ---: |
| GSC pages containing `/czechia/` | 2026-05-29–2026-08-27 | 137 clicks / 7,355 impressions / 189 rows |
| GSC Czech searchers (`country=cze`) | same window | 58 clicks / 2,791 impressions / 644 queries |
| GSC Czech searchers | prior 90 days | 13 clicks / 364 impressions / 62 queries |
| GA4 organic | current 90 days | 24 sessions / 22 users / 16 engaged sessions |
| GA4 key events and revenue | current and prior 90 days | 0 / 0 |
| OpenSEO target estimate | 2203/cs | 12 traffic / 27 ranking keywords |

The GSC increase is directional, not a causal claim. GA4 is too sparse to estimate a dependable conversion rate.

## Highest-signal pages

| URL | Clicks | Impressions | Avg position | Interpretation |
| --- | ---: | ---: | ---: | --- |
| `/czechia/cs/tools/calorie-calculator` | 3 | 899 | 12.00 | high visibility, weak CTR |
| `/czechia/cs/blog/neschopenka-jak-funguje-eneschopenka` | 4 | 682 | 9.91 | informational traction |
| `/czechia/cs/tools/blood-pressure-chart` | 11 | 681 | 10.35 | strongest click generator |
| `/czechia/cs/tools/bmi-calculator` | 0 | 618 | 34.60 | visibility without rank |
| `/czechia/cs` | 15 | 468 | 11.06 | home absorbs broad demand |
| `/czechia/cs/gp-consultation-online` | 3 | 229 | 14.21 | core commercial page underperforms |
| `/czechia/en/services/lekar-online-praha` | 13 | 124 | 5.44 | strongest English commercial route |
| `/czechia/cs/services/detsky-lekar-online` | 4 | 96 | 8.72 | early pediatric fit |
| `/czechia/cs/services/obnoveni-lecby` | 5 | 56 | 6.82 | promising commercial fit |
| `/czechia/cs/services/kozni-konzultace-praha` | 1 | 51 | 16.43 | needs stronger support |
| `/czechia/cs/services/neschopenka-online` | 4 | 43 | 16.74 | service trails explainer |

## Query ownership findings

- `praktický lékař online`: 59 impressions, no clicks, Czech-searcher position 13.34; the GP page is position 15.05.
- `praktik online`: the 24/7 article receives 29 impressions at position 8.21 while the GP page receives 14 at 14.86. This is a real commercial/informational ownership risk, but the article is young; revise internal links and framing before considering consolidation.
- `krevní tlak kalkulačka`: 10 clicks / 381 impressions / position 4.92, owned by the blood-pressure chart.
- `eneschopenka`: the explainer has early visibility, while the service page should own booking-modified terms.
- `kozni online`: the dermatology service has early visibility but limited authority.
- English Czechia demand is real: `/czechia/en/services/lekar-online-praha` already generated 13 clicks at position 5.44.

## Indexation and production state

URL Inspection passed the Czech home, GP, 24/7 article, doctor index, pediatric care, canonical travel page, neschopenka, treatment renewal, dermatology, referrals, Prague doctor, mental health, men's health, and major tool routes. The women’s-health page was discovered but not indexed.

The retired travel URL remains indexed as itself with last crawl `2026-07-18`, even though production already redirects it. This remains Google recrawl lag; do not reopen redirect implementation without new evidence.

## Decision

Maintain the GP and travel observation hold through `2026-09-08`. In the meantime, prepare clinically reviewed content improvements, locale-correct internal links, and measurement segmentation. Do not create substitute location/service pages or change booking logic.
