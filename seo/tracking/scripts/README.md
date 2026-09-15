# SEO tracker refresh scripts

Tooling for `seo/tracking/Global_Health_SEO_Tracker.xlsx` (copied from
`seo/Global_Health_SEO_Tracker_Starter.xlsx` - never edit the starter).
Every data sheet has its header on row 5 (title row 1, scope note row 2)
and is backed by an Excel table.

**The OpenSEO connector (GSC, GA4, URL Inspection) only works inside a live
Claude Code session - it cannot be scripted or scheduled.** These scripts
only normalize and upsert raw JSON a session already saved; the three files
in `prompts/` are what you paste into a session to actually pull data.

## Run order

1. In a Claude Code session, run the relevant prompt in `prompts/`
   (`daily-refresh.md`, `weekly-review.md`, or `monthly-close.md`). It saves
   raw connector responses to `seo/tracking/raw/<YYYY-MM-DD>/<agent>/`.
2. `gsc_normalize.py` / `ga4_normalize.py` flatten that raw JSON into
   `seo/tracking/data/*.csv`.
3. `workbook_upsert.py` upserts each CSV into its sheet's Excel table,
   snapshotting the workbook to `seo/tracking/archive/<date>/` first and
   appending a row to `22_Refresh_Log`.
4. `recalc_excel.ps1` forces Excel to recalculate and save (openpyxl never
   evaluates formulas).
5. `check_formula_errors.py` scans the recalculated workbook for
   `#REF!`/`#VALUE!`/etc. before you trust it.

`manifest.py` is a shared helper (injection-safe escaping, data_state,
manifest sidecar) imported by both normalizers - not a script you run
directly. `selftest.py` is the one runnable proof (see below).

## Scripts

- **gsc_normalize.py** - `get_search_console_performance` raw JSON ->
  `26_GSC_Property_Daily` (`--dataset A`), `09_GSC_Page_Daily`
  (`--dataset B`), or `10_GSC_Query_Daily` (`--dataset C`) CSV. Reads each
  response's own `dimensions` array rather than assuming column order, so
  any subset GSC returns is handled. GSC's search `type` (web/image/video/
  news/discover/googleNews) is a request parameter, never a response
  dimension - pass `--search-type` or let it parse the filename (matches
  the `A_web_...json` convention already used under
  `seo/tracking/raw/2026-09-15/A3-gsc/`).
- **ga4_normalize.py** - one `get_google_analytics_organic_landing_pages`
  JSON per day -> `11_GA4_Landing_Daily` CSV. Field mapping is a small dict
  at the top of the file (edit there, not the logic, if a pull returns
  different metric names). `--exclude-ranges` (default
  `2026-08-02:2026-09-08`, the documented GA4 collection outage) routes
  those dates to `<out>.outage.csv` instead of writing zeros into the main
  file.
- **workbook_upsert.py** - upserts one CSV into one sheet's table by
  natural key, only touching rows inside `--backfill-days` of the CSV's
  own max date or brand-new keys; every other existing row is left alone.
  Never reads a formula cell to find a key (openpyxl can't see a computed
  value without a prior Excel save) - keys are rebuilt from the literal
  dimension columns. Formula columns (`ctr`, `row_key`,
  `engagement_rate`, ...) always get the row-6 template formula shifted to
  their row; every other value that would start with `= + - @` tab/CR is
  quote-prefixed first. `--dry-run` does everything except snapshot, save,
  and the refresh-log append.
- **recalc_excel.ps1** - Excel COM `CalculateFullRebuild` + save.
- **check_formula_errors.py** - scans a (recalculated) workbook for
  formula-error strings; exit 1 if any are found.
- **manifest.py** - `write_manifest()`, `injection_safe()`, `data_state()`.
- **selftest.py** - the one runnable check (see below).

## Natural keys (never the row_key formula cell)

| Table | Key |
| --- | --- |
| `T26GSCPropertyDaily` | `date + search_type` |
| `T09GSCPageDaily` | `date \| normalized_url \| searcher_country \| device \| search_type` |
| `T10GSCQueryDaily` | `date \| query \| normalized_url \| searcher_country \| device \| search_type` |
| `T11GA4LandingDaily` | `date \| normalized_landing_url \| visitor_country \| device \| session_source_medium` |
| `T08CrawlHistory` | `checked_at + url_id` |

## Backfill semantics

`workbook_upsert.py --backfill-days N` only overwrites an *existing* sheet
row if its date is within the last N days of the CSV's own max date. A row
whose key doesn't exist in the sheet yet is always appended regardless of
date - so a first load of an empty sheet writes every historical row, and
later refreshes only touch the recent window plus any genuinely new key.

## Proposed alert thresholds (not wired to anything - informational only)

- impressions down ≥30% week-over-week for a market
- clicks == 0 for 3 days on a page that previously averaged ≥5 clicks/day
- any page whose `coverage_state` moves from indexed to excluded
- GA4 sessions == 0 on a day outside the documented outage window
- key events == 0 for 7 consecutive days on a market with prior bookings
- sitemap URL count changes >5% between checks

## No automation was activated

These scripts and prompts are run by hand (or pasted into a session) each
time. No GitHub workflow, cron job, Windows scheduled task, or Claude Code
scheduled task was created by this work, and none should be - the
OpenSEO connector requires a live session and cannot run unattended
(`25_Config!scheduled_refresh_active` stays `No`).

## Self-check

```
python selftest.py
```

Builds a tiny fake GSC raw response (including a CSV-injection payload as
a query, and a duplicate key across two "refresh" files), runs
`gsc_normalize.py` for real, then `workbook_upsert.py --dry-run` against a
temp copy of the starter workbook. Asserts `row_key` uniqueness, that
de-dup keeps the newer file's value, that the injection payload got
quote-prefixed, and that `--dry-run` never touches the workbook file on
disk.
