# Weekly review prompt (Sonnet)

Paste this whole file into a new Claude Code session in this repo. Requires
the OpenSEO connector authorized in that session - it cannot be scripted or
scheduled to call itself.

**Guardrails - do not deviate:** no Search Console / GA4 / site settings
changes, no Indexing API submissions, no publishing or editing of any page
on myglobalhealth.online, no `git push`. Read-only data pull plus local
workbook/CSV updates under `seo/tracking/`.

## 0. Setup

```
today = current date
raw_dir = seo/tracking/raw/<today>/weekly-review/
mkdir -p <raw_dir>
```

projectId for every OpenSEO call: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
Site: `sc-domain:myglobalhealth.online`.

## 1. Query-level pull (dataset C) - last complete 7 days

GSC finalizes a date roughly 3 days after it occurs (see
`25_Config!gsc_last_complete_date` and the workbook's `data_state` rule).
Pick the most recent 7-day window whose latest day is already ≥3 days old:

```
mcp__<openseo>__get_search_console_performance
  siteUrl: sc-domain:myglobalhealth.online
  startDate: <7 days before the window end>
  endDate: <today - 3 days or later, whichever is most recent complete day>
  dimensions: ["date", "query", "page", "country", "device"]
  type: web
  rowLimit: 25000
```

Paginate on `hasMore`/`startRow` as needed. Save each page to
`<raw_dir>/C_web_<startDate>_<endDate>_r<startRow>.json`.

## 2. Market/locale opportunity read

Using the query-level pull (or `get_search_opportunities` /
`get_domain_keyword_suggestions` if a lighter targeted call covers it),
identify per-market (URL path prefix: `/ireland/`, `/romania/`, `/spain/`,
`/portugal/`, `/czechia/`, `/brazil/`) queries with high impressions, low
CTR, and position 5-20 - the "close but not converting" opportunity band.
Save any additional raw tool responses to `<raw_dir>/`.

## 3. Measurement-health check

```
mcp__<openseo>__get_google_analytics_measurement_health
  projectId: 7804f362-5891-417e-9c3a-d9e8d4d7dc6b
```

Save to `<raw_dir>/ga4_measurement_health_<today>.json`. Flag any reported
issue, and flag key events == 0 for 7 consecutive days on a market that
previously had bookings.

## 4. Recrawl watchlist inspection

Pull the current watchlist from the workbook's `19_Issues` sheet (any open
issue whose area implies indexability/crawl risk) plus any URL whose
`coverage_state` changed in a prior daily-refresh run. Cap at 20 URLs:

```
mcp__<openseo>__inspect_urls
  siteUrl: sc-domain:myglobalhealth.online
  urls: [<watchlist URLs>]
```

Save to `<raw_dir>/inspect_<today>.json`. Read
`result.indexStatusResult.coverageState` (nested), not a flat `verdict`.

## 5. Normalize and upsert

```
python seo/tracking/scripts/gsc_normalize.py --raw-dir <raw_dir> --out seo/tracking/data/gsc_query_daily.csv --dataset C
python seo/tracking/scripts/workbook_upsert.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx --sheet 10_GSC_Query_Daily --table T10GSCQueryDaily --csv seo/tracking/data/gsc_query_daily.csv --key row_key --backfill-days 14
pwsh -File seo/tracking/scripts/recalc_excel.ps1 -Path seo/tracking/Global_Health_SEO_Tracker.xlsx
python seo/tracking/scripts/check_formula_errors.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
```

If `check_formula_errors.py` exits non-zero, stop and report before
continuing.

## 6. Close out

Update `docs/plans/seo-control-state-2026-09.md`: query-level row counts,
the opportunity list found in step 2, measurement-health findings, and the
recrawl watchlist's inspect_urls results. No settings changes, no indexing
requests, no publishing, no `git push` happened or should happen from this
prompt.
