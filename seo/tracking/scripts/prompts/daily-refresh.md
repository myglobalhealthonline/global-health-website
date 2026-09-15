# Daily refresh prompt (Sonnet, ~zero OpenSEO credits)

Paste this whole file into a new Claude Code session in this repo to run the
daily GSC + GA4 + anomaly-triggered URL Inspection refresh. It only works
inside a Claude Code session with the OpenSEO connector authorized — the
connector cannot be scripted or scheduled to call itself.

**Guardrails - do not deviate:** no Search Console / GA4 / site settings
changes, no Indexing API submissions, no publishing or editing of any page
on myglobalhealth.online, no `git push`. This is a read-only data pull plus
local workbook/CSV updates under `seo/tracking/`.

## 0. Setup

```
today = current date, e.g. 2026-09-16
raw_dir = seo/tracking/raw/<today>/daily-refresh/
mkdir -p <raw_dir>
```

projectId for every OpenSEO call below: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
Site: `sc-domain:myglobalhealth.online`.

## 1. GSC property daily (dataset A) - last 14 days, all search types

For each `type` in `web, image, video, news, discover, googleNews`, call:

```
mcp__<openseo>__get_search_console_performance
  siteUrl: sc-domain:myglobalhealth.online
  startDate: today - 14 days
  endDate: today - 1 day        # GSC lags ~2-3 days; do not request "today"
  dimensions: ["date"]
  type: <search type>
  rowLimit: 25000
```

Save each raw response verbatim to
`<raw_dir>/A_<type>_<startDate>_<endDate>.json` (matches the naming other
agents already used under `seo/tracking/raw/2026-09-15/A3-gsc/` - keep the
convention so gsc_normalize.py's filename-based search-type fallback keeps
working even without `--search-type`).

## 2. GSC page daily (dataset B) - last 14 days, web only

```
mcp__<openseo>__get_search_console_performance
  siteUrl: sc-domain:myglobalhealth.online
  startDate: today - 14 days
  endDate: today - 1 day
  dimensions: ["date", "page", "country", "device"]
  type: web
  rowLimit: 25000
```

If the response has `hasMore: true`, repeat with `startRow` advanced by the
row count already received, saving each page as
`<raw_dir>/B_web_<startDate>_<endDate>_r<startRow>.json`.

## 3. GA4 organic landing pages - one call per complete day, last 14 days

GA4 for "today" is still accumulating - only pull complete days
(`today - 14` through `today - 1`). One call per day:

```
mcp__<openseo>__get_google_analytics_organic_landing_pages
  projectId: 7804f362-5891-417e-9c3a-d9e8d4d7dc6b
  reportKind: landing_pages
  breakdown: landing_page
  dimensions: ["hostName", "landingPage"]
  channel: organic_search
  requestedDateRange: {startDate: <day>, endDate: <day>}
```

Save each as `<raw_dir>/ga4_landing_pages_<YYYYMMDD>.json`.

## 4. Normalize

```
python seo/tracking/scripts/gsc_normalize.py --raw-dir <raw_dir> --out seo/tracking/data/gsc_property_daily.csv --dataset A
python seo/tracking/scripts/gsc_normalize.py --raw-dir <raw_dir> --out seo/tracking/data/gsc_page_daily.csv --dataset B
python seo/tracking/scripts/ga4_normalize.py --raw-dir <raw_dir> --out seo/tracking/data/ga4_landing_daily.csv
```

## 5. Anomaly check (drives step 6, otherwise informational only)

From the freshly written CSVs, flag:
- impressions down ≥30% week-over-week for any market (URL path prefix,
  e.g. `/ireland/`, `/romania/`) - compare the trailing 7 final days vs the
  7 before that
- clicks == 0 for 3 consecutive days on a page/query that averaged ≥5
  clicks/day over the prior 14 days
- GA4 sessions == 0 on any complete day that isn't in the documented
  historical outage window (`25_Config!historical_GA4_gap_start/end`)

## 6. URL Inspection for flagged URLs only

Cap at 20 URLs (quota is ~7.5s/URL, 2,000/day - this must stay small):

```
mcp__<openseo>__inspect_urls
  siteUrl: sc-domain:myglobalhealth.online
  urls: [<flagged URLs>]
```

Save to `<raw_dir>/inspect_<today>.json`. Read
`result.indexStatusResult.coverageState` (nested) - there is no top-level
`verdict` field to read flat.

## 7. Upsert into the workbook

```
python seo/tracking/scripts/workbook_upsert.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx --sheet 26_GSC_Property_Daily --table T26GSCPropertyDaily --csv seo/tracking/data/gsc_property_daily.csv --key row_key --backfill-days 14
python seo/tracking/scripts/workbook_upsert.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx --sheet 09_GSC_Page_Daily --table T09GSCPageDaily --csv seo/tracking/data/gsc_page_daily.csv --key row_key --backfill-days 14
python seo/tracking/scripts/workbook_upsert.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx --sheet 11_GA4_Landing_Daily --table T11GA4LandingDaily --csv seo/tracking/data/ga4_landing_daily.csv --key row_key --backfill-days 14
```

Then:

```
pwsh -File seo/tracking/scripts/recalc_excel.ps1 -Path seo/tracking/Global_Health_SEO_Tracker.xlsx
python seo/tracking/scripts/check_formula_errors.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
```

If `check_formula_errors.py` exits non-zero, stop and report the error
cells - do not continue to step 8 with a broken workbook.

## 8. Close out

Update `docs/plans/seo-control-state-2026-09.md`: what ran, row counts per
CSV, refresh_id(s), any anomalies flagged and their inspect_urls verdicts,
and next action if any. No settings changes, no indexing requests, no
publishing, no `git push` happened or should happen from this prompt.
