# Monthly close prompt (Fable orchestrating, Opus judgment for the roadmap call)

Paste this whole file into a new Claude Code session in this repo. Requires
the OpenSEO connector authorized in that session - it cannot be scripted or
scheduled to call itself. This is the only one of the three refresh prompts
that spends meaningful OpenSEO credits (~50 for backlinks + ~150 for
competitor SERPs, ~200 total) - if the actual scope grows past 2,000
credits, stop and confirm with the user first (standing OpenSEO server
rule).

**Guardrails - do not deviate:** no Search Console / GA4 / site settings
changes, no Indexing API submissions, no publishing or editing of any page
on myglobalhealth.online, no `git push`. Read-only data pull plus local
workbook/CSV updates under `seo/tracking/`.

## 0. Setup

Only run this once the just-finished calendar month is fully "final" - every
date in it must be ≥3 days old (GSC finality lag). If today is before the
3rd of the month, the prior month isn't fully final yet; wait or narrow
scope and say so.

```
month = the completed calendar month, e.g. 2026-08
raw_dir = seo/tracking/raw/<today>/monthly-close/
mkdir -p <raw_dir>
```

projectId for every OpenSEO call: `7804f362-5891-417e-9c3a-d9e8d4d7dc6b`.
Site: `sc-domain:myglobalhealth.online`.

## 1. Confirm the month is closeable

Read `seo/tracking/Global_Health_SEO_Tracker.xlsx` sheets `26_GSC_Property_Daily`
and `11_GA4_Landing_Daily`: every date in `month` must have `data_state ==
"final"` (GSC) and must not fall inside the documented GA4 outage window
(`25_Config!historical_GA4_gap_start/end`) unless already backfilled. If
data is missing or still `incomplete`, run the relevant daily-refresh steps
first (see `daily-refresh.md`) rather than closing on partial data.

## 2. Backlinks overview refresh (~50 credits, once)

```
mcp__<openseo>__get_backlinks_overview
  projectId: 7804f362-5891-417e-9c3a-d9e8d4d7dc6b
  target: myglobalhealth.online
```

Save to `<raw_dir>/backlinks_overview_<month>.json`.

## 3. Competitor SERPs, ≤5 head terms per market (~150 credits)

For each market with an existing keyword master
(`seo/<country>/03-keyword-master.csv`), pick the top 5 head terms by
volume/priority already recorded there - do not research new terms here.

```
mcp__<openseo>__get_serp_results
  projectId: 7804f362-5891-417e-9c3a-d9e8d4d7dc6b
  keyword: <head term>
  location: <market>
```

Save each to `<raw_dir>/serp_<market>_<term-slug>.json`. Stop and confirm
with the user before exceeding 5 terms x 6 markets = 30 calls.

## 4. Compare eligible non-overlapping windows

Using only `data_state == "final"` rows, compare `month` against the prior
full month (or the same month last year if the series is long enough) -
never compare a partial window against a full one, and never fill a gap
with an invented zero (`25_Config!missing_numeric_rule`).

## 5. Roadmap adjustment (Opus judgment)

Given the month's GSC/GA4/backlinks/SERP deltas, propose concrete additions
or edits to the growth roadmap in `docs/plans/seo-control-state.md` /
`seo-control-state-2026-09.md` - this is a judgment call on priority, not a
mechanical rollup. State the reasoning, not just the numbers.

## 6. Normalize, archive, and check

If step 1 required a catch-up pull, run the matching `gsc_normalize.py` /
`ga4_normalize.py` / `workbook_upsert.py` commands from `daily-refresh.md`
first. Then:

```
pwsh -File seo/tracking/scripts/recalc_excel.ps1 -Path seo/tracking/Global_Health_SEO_Tracker.xlsx
python seo/tracking/scripts/check_formula_errors.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
```

`workbook_upsert.py` already writes a dated snapshot to
`seo/tracking/archive/<today>/` before saving - no separate archive step is
needed.

## 7. Close out

Update `docs/plans/seo-control-state-2026-09.md`: month closed, backlinks
delta, competitor SERP findings per market, the non-overlapping-window
comparison, credits spent (~200 target), and the roadmap adjustment with
reasoning. No settings changes, no indexing requests, no publishing, no
`git push` happened or should happen from this prompt.
