# Google SEO API Findings — myglobalhealth.online

Collected: 2026-08-03 | Source: Google API (field data) unless noted

## Credential status (read this first)

Declared tier: **2** (API key + service account + GA4), confirmed by `google_auth.py --check`.

**Actual working tier at run time: 0.** The OAuth `refresh_token` is invalid
(`HTTP 400: invalid_grant` on every refresh attempt). This blocks all three
OAuth-backed services:

| Service | Auth method | Status |
|---|---|---|
| PageSpeed Insights | API key | OK (not used — CrUX History preferred per convention) |
| CrUX / CrUX History | API key | **Working** |
| Search Console (query, sitemaps, URL Inspection) | OAuth | **FAILED** — `invalid_grant` |
| Indexing API | OAuth | **FAILED** — `invalid_grant` |
| GA4 Data API | OAuth | **FAILED** — `invalid_grant` |

**Action needed:** re-run `claude-seo run google_auth.py --auth` to
re-authenticate the OAuth client (refresh token has expired or been revoked
server-side). Until then, items 2, 3, and 4 of the requested scope
(GSC performance, GSC indexation/URL inspection, GA4 traffic) are
**data unavailable**, not zero — do not read the "unavailable" rows below as
"no traffic."

Everything below is CrUX field data (item 1), the only tier that authenticated
successfully.

## 1. CrUX field Core Web Vitals

### Origin-level, all devices (latest 28-day window: 2026-06-28 to 2026-07-25)

| Metric | Value | Rating |
|---|---|---|
| LCP | 1,539 ms | 🟢 Good |
| INP | 137 ms | 🟢 Good |
| CLS | 0.00 | 🟢 Good |
| TTFB (experimental) | 534 ms | 🟢 Good |
| FCP | 1,115 ms | 🟢 Good |

All-devices origin data is currently **passing all Core Web Vitals
thresholds**. Note: the URL-level CrUX query for the homepage
(`https://www.myglobalhealth.online/`) returned identical numbers to the
origin query — CrUX is very likely bucketing homepage traffic together with
origin traffic (common for a site whose homepage is the dominant URL), so
treat homepage and origin as the same data point here.

### By device (latest available week per segment — see note)

Note: the most recent single week (period ending 2026-07-25) returned null
for phone/desktop breakdowns specifically (small-sample suppression is
common right after a collection period rolls). Values below are the latest
week each segment actually reported data for, from the 25-week history.

| Metric | Phone | Rating | Desktop | Rating |
|---|---|---|---|---|
| LCP | 3,098 ms | 🟡 Needs Improvement | 3,097 ms | 🟡 Needs Improvement |
| INP | 134 ms | 🟢 Good | 59 ms | 🟢 Good |
| CLS | 0.00 | 🟢 Good | 0.00 | 🟢 Good |
| TTFB | 2,618 ms | 🔴 Poor | 1,985 ms | 🟡 Needs Improvement |
| FCP | 2,794 ms | — | 2,504 ms | — |

Phone and desktop LCP both sit in "Needs Improvement," and TTFB is a clear
weak point on both, worst on phone (poor). This is consistent with the
combined all-device figures being pulled down disproportionately by
phone/desktop while a large "tablet+other" or newer-collection-period share
is pulling the blended origin number down to "good" — the divergence between
the origin-level 534ms TTFB and the phone TTFB of 2,618ms is the single
most notable finding here and worth investigating (server response time /
edge caching for mobile UA, or a stale week's data — recommend re-running
`crux_history.py --form-factor PHONE` once the environment refreshes past
this collection period to confirm it isn't a data lag artifact).

### 25-week trend (origin, all devices)

| Metric | Direction | Change | Earliest avg | Latest avg |
|---|---|---|---|---|
| LCP | Improving | -27.5% | 3,352 ms | 2,431 ms |
| INP | **Degrading** | +33.9% | 91 ms | 122 ms |
| CLS | Improving | -100% | 0.007 | 0.000 |
| TTFB | Improving | -36.9% | 2,544 ms | 1,606 ms |
| FCP | Improving | -29.6% | 2,911 ms | 2,050 ms |

INP is the one metric trending the wrong way over the 25-week window
(+33.9%, still well within "Good" territory at 122–137ms, but worth watching).
Everything else — including the historically weak TTFB — has been steadily
improving over the past ~6 months.

### 25-week trend by device

| Metric | Phone | Desktop |
|---|---|---|
| LCP | Improving (-12.3%) | Stable (+3.0%) |
| INP | Stable (-4.1%) | **Degrading (+16.9%)** |
| CLS | Improving (-100%) | Stable (0%) |
| TTFB | **Degrading (+23.3%)** | Improving (-19.7%) |
| FCP | Improving (-6.1%) | Stable (-4.5%) |

Desktop INP degrading and phone TTFB degrading are the two device-specific
regressions to flag, even though both remain in "Good"/"Needs Improvement"
bands rather than "Poor."

## 2. GSC search performance (28d vs prior 28d)

**Data unavailable** — OAuth failure (see credential status above). No
clicks/impressions/CTR/position, no top queries, no top pages, no country
breakdown could be retrieved this run.

## 3. GSC indexation (sitemap + URL Inspection)

**Data unavailable** — same OAuth failure. No sitemap submitted/indexed
counts and no URL Inspection results (homepage, /ireland/en, a service page,
a doctor page, a /health/ article) could be retrieved this run.

## 4. GA4 organic traffic (90d vs prior 90d)

**Data unavailable** — same OAuth failure. No organic traffic trend, landing
pages, or conversions could be retrieved this run.

## Data freshness notes

- CrUX: 28-day rolling window, ~2-3 day processing lag from Google.
- GSC: normally 2-3 day lag — not applicable this run (unavailable).
- GA4: normally ~1 day lag — not applicable this run (unavailable).

## Priority

- **High**: Re-authenticate OAuth (`google_auth.py --auth`) to restore GSC,
  GA4, and Indexing API access — three of the four requested data areas are
  currently blind without it.
- **Medium**: Investigate the phone TTFB discrepancy (2,618ms mobile vs
  534ms blended origin) — confirm whether it's a genuine mobile server-response
  problem or a stale/small-sample CrUX week.
- **Low**: Desktop and origin-level INP are both trending upward over 25
  weeks (still "Good," not yet actionable, worth a watch-item).
