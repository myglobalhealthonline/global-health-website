# Czechia measurement plan

Date: `2026-08-31`

## Baseline sources

- GSC property: `sc-domain:myglobalhealth.online`
- GA4 site: `https://www.myglobalhealth.online`
- Reporting split: Czechia URL prefix, Czech searcher country, Czech (`cs`) and English (`en`) routes
- Baseline: current `2026-05-29`–`2026-08-27`; prior `2026-02-28`–`2026-05-28`

## Weekly scorecard

| KPI | Source | Segment | Rule |
| --- | --- | --- | --- |
| Organic clicks/impressions/CTR/position | GSC | `/czechia/`, `country=cze` | complete data only |
| Non-brand performance | GSC | exclude Global Health spellings | save the exact filter with report |
| Competitor-brand traffic | GSC | MEDDI, EUC, uLékaře, ZnámýLékař, Canadian | report separately, not non-brand |
| Top-3/10/20 keywords | GSC/OpenSEO | cluster and owner URL | blanks remain unavailable |
| Organic sessions/engagement | GA4 | landing path starts `/czechia/` | split cs/en |
| Organic bookings/consultations | GA4 | configured key event | currently zero; validate event firing before interpreting |
| Organic conversion rate | GA4 | key events ÷ organic sessions | suppress or label unstable at low volume |
| Indexed priority pages | GSC inspection/sitemap | mapped P0/P1 URLs | inspect exceptions, not all URLs weekly |
| Crawl/index errors | GSC + focused crawl | Czech prefix | avoid cross-market issue totals |
| Referring domains | OpenSEO/backlink source | target domain | compare quality and relevance, not raw count |

## Cluster watchlist

- GP: `praktický lékař online`, `praktik online`, `online konzultace s lékařem`
- Neschopenka: service-modified queries versus eNeschopenka/process queries
- Renewal: `obnovení receptu online`, `eRecept online`
- Prague/expat: `lékař online Praha`, `english speaking doctor prague`, `doctor for foreigners prague`
- Specialists: pediatric, dermatology, referrals, second opinion
- Tools: blood pressure, calories, BMI

Track query × page, not query alone, so ownership shifts are visible.

## Decision gates

1. On or after `2026-09-08`, compare GP and 24/7 article ownership. If the article continues to outrank the GP page for transaction modifiers, adjust internal anchors and page framing first.
2. Verify booking and consultation events in GA4 with a privacy-safe test transaction before reporting conversion impact.
3. Escalate indexing only when a live, canonical, sitemap-eligible priority page remains excluded across repeated checks.
4. Re-run a focused Czech-only audit using crawl restrictions before treating issue counts as market defects.
