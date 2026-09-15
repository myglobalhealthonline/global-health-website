# A11 QA report — Global_Health_SEO_Tracker.xlsx (2026-09-15)

Object under test: `seo/tracking/Global_Health_SEO_Tracker.xlsx` (31 sheets), built by
`seo/tracking/scripts/build_workbook.py`, build log
`seo/tracking/raw/2026-09-15/A10-workbook/build-log.md`.
Findings table: `qa-findings.csv` (38 rows). Live evidence: `spotcheck-raw.json`.
Fix script: `seo/tracking/scripts/qa_fixes.py` (re-runnable, idempotent, workbook-only).
The starter `seo/Global_Health_SEO_Tracker_Starter.xlsx` was not touched.

## Verdict

| | Count |
| --- | --- |
| Blocking defects | **0** |
| QA discrepancies (severity block or fix) | **26** |
| — fixed in the workbook by `qa_fixes.py` | 14 |
| — left open (source data, analyst judgement, or report/ledger text) | 12 |
| Notes (pass confirmations and explained differences) | 12 |
| Formula-error cells after fixes and Excel recalculation | **0** |
| Live spot-check mismatches | **0 / 30** |

The workbook is fit to ship. Nothing found requires a rebuild before the report is
issued; the twelve open items are three source-CSV defects for A10, four analyst or
owner decisions, and seven number corrections the orchestrator must patch into the
executive report and the ledger.

## 1. Structure

Pass, after the fixes below.

- All 30 table sheets carry exactly one table; `01_Dashboard` is a laid-out sheet with
  no table, as intended.
- Every table ref starts at header row 5 and ends on the last populated row: no data
  below the ref, none to the right of it, and the last non-empty row inside the ref
  equals the ref's last row on all 30 sheets.
- `tableColumns` count equals the ref width and every column name equals the row-5
  header text on all 30 tables. No duplicate table names in the workbook.
- Freeze panes are `A6` (below row 5) on all 30 table sheets.
- Data dictionary: **0 missing rows, 0 blank definitions, 0 orphan rows, 0 duplicates**
  after adding 20 definitions (QA-012). Before the fix, 20 columns were undocumented:
  `00_README` topic/instructions; `04` raw_url, normalized_url, template_file, notes;
  `09` page; `10` page, data_state, source_timezone; `11` landing_page, transactions,
  data_state; and all seven columns of `23_Data_Dictionary` itself.
- Validation lists: `19_Issues` priority and status were already present. Added to
  `16` clinical_review_status and copy_approval_status, `27` status and `28` status;
  widened `16` native_editor_status; removed two lists that could not be satisfied
  (QA-004, QA-007) and repaired one float-formatted list (QA-008).
  `17_pSEO_Plan.launch_decision` is analyst prose, not an enum — see QA-035.
- Validation conformance after fixes: the only off-list values left are five free-text
  statuses in `19_Issues` (QA-018), which are analyst text, not a workbook defect.

## 2. Keys and joins

Pass.

| Check | Result |
| --- | --- |
| `04` url_id unique | 3,752 rows, 3,752 distinct, 0 blank |
| `09` / `10` / `11` row_key unique (recomputed from the dimension columns, not the formula cell) | 19,488 / 5,817 / 204 — all distinct; the stored cells agree |
| every `08` url_id exists in `04` | 3,753 of 3,771 resolve; the 18 exceptions are the deliberate `SYN-*` host, slash, robots and sitemap probes (QA-028) |
| non-blank `09` / `10` / `11` url_id exists in `04` | 17,402 / 5,611 / 185 — **0 unresolved** |
| `04` W1 and W0 sums equal `09` per market | exact, **max deviation 0.0000%** (tolerance 0.5%) |
| `26` W1 web totals | **1,008 clicks / 69,925 impressions** — matches exactly; W0 web 761 / 39,935 |
| `12` monthly clicks/impressions equal `09` per month × market × language | all 99 real groups match exactly (QA-029 records the two structural carve-outs) |
| `19` priority_score formula present | 38 of 38 rows, `=IF(OR(K,L,M=""),"",IFERROR(K*L/M,""))`, 0 null results |
| `19` P0 rows | **three**, not two: CPL-012, TECH-001 and CPL-006 — QA-016 |
| `18` rows | 1,142 ✓ |
| `07` rows | 24,315 ✓ |
| `27` rows | 70 ✓ |
| `16` rows | 141 sheet rows over **140** reviewed URLs — QA-033 explains the build log's 141 |
| `17` rows | 11 sheet rows over **8** candidates — QA-034 explains the build log's 11 |
| `28` rows | 25 ✓ |

Per-market W1 (clicks / impressions), identical in `04` and `09`: Ireland 262 / 19,925 ·
Czechia 174 / 9,630 · Spain 163 / 12,154 · Portugal 150 / 9,449 · Romania 101 / 11,002 ·
Brazil 49 / 7,826.

## 3. Formula errors

**0 error cells** (`#REF!`, `#VALUE!`, `#DIV/0!`, `#NAME?`, `#N/A`, `#NUM!`, `#NULL!`)
across all 31 sheets, verified after `recalc_excel.ps1` — the cached values are live, so
the check is meaningful.

The two dashboard top-10 lists were nevertheless empty: `AGGREGATE` was stored bare
instead of as `_xlfn.AGGREGATE`, Excel resolved it as an unknown user function, and the
wrapping `IFERROR` swallowed the `#NAME?` so no error cell ever appeared. Both lists
populate now (QA-001), and the URL lookup is tie-aware (QA-002) — before that, all ten
decline rows printed the same URL.

## 4. Missing-value discipline

Pass, with one invented zero found and fixed and one wording gap left open.

- `11_GA4_Landing_Daily` holds **no rows** for the documented outage 2026-08-02..09-08 —
  absent, not zeroed, exactly as `ga4_outage_windows.csv` and `25_Config` require.
  `booking_starts` is blank on all 204 rows (not a configured key event) while
  `purchases`, `purchase_revenue` and `transactions` are measured zeros (QA-030).
- `12_Monthly_Summary` currency and revenue are blank on all 113 rows, so no currency
  is mixed; the revenue formula already suppresses the cell when any contributing GA4
  row carries a currency other than `25_Config` reporting_currency (QA-032).
- `12` August quality_status says "Check completeness, gaps and sample size" rather than
  naming the GA4 outage. The GA4 columns themselves are correctly blank, never zero
  (QA-031).
- `25_Config` blanks that must stay blank stay blank. But `content_reviewed` resolved to
  a literal **0** instead of 140, breaking the sheet's own `missing_numeric_rule`
  ("Zero is only valid when the source actually measured zero"): `audit_state` never
  recorded `Content-reviewed` because `content_review.csv` arrived after the inventory
  sheet was written. Fixed (QA-005); `live_tested` was also counting route patterns
  against a denominator that excludes them (QA-006).
- 14 `coverage_state` cells carried mojibake, which silently zeroed the dashboard's
  "Excluded by 'noindex' tag" card (QA-003), and 123 `08` `requested_url` cells carried
  an unquoted-CSV bleed from the GSC export (QA-014). Both are repaired in the workbook;
  both source CSVs still carry the defect and will reintroduce it on the next rebuild.

## 5. Injection safety

Pass. **0 unprotected cells.** 59,376 cells begin with `=` and every one is a genuine
formula cell (`data_type == "f"`). No text cell anywhere in the workbook begins with
`+`, `-`, `@`, tab or CR.

## 6. Dashboard

Pass, after five fixes.

- Every card resolves to a number: markets 6 · market×language 33 · inventory rows 3,752 ·
  audit checks 44 · GSC page rows 19,488 · GA4 rows 204 · issue rows 38 · historical GSC
  clicks 918.
- Coverage block: known URLs 3,369 · live-tested 3,369 · rendered 6 · inspected 628 ·
  content-reviewed **140** (was 0).
- Indexing block: indexed 490 · crawled-not-indexed 10 · discovered-not-indexed 91 ·
  noindex **14** (was 0) · redirect 0 · duplicate 4.
- Market table populated for all six markets with W1/W0 impressions, change %, clicks,
  CTR and weighted position.
- Both top-10 lists populated with ten distinct URLs each.
- P0 banner present and now lists all three P0 issues.
- Freshness dates equal `25_Config` and render as dates: as_of 2026-09-15 ·
  GSC last complete 2026-09-11 · GA4 last complete 2026-09-12 · ledger header 2026-09-15.

## 7. Live spot-checks — 0 mismatches / 30

Re-fetched today, GET, redirects followed manually, ≤2 req/s, UA
`Mozilla/5.0 (compatible; GlobalHealthAudit/1.0)`. Raw responses in `spotcheck-raw.json`.

| Stratum | n | Result |
| --- | --- | --- |
| `08` market pages, final_status 200 | 10 | status, final URL, title and canonical all match |
| `08` redirects (301/308) | 5 | first-hop status, hop count and final URL all match |
| `08` non-200 (404/410) | 5 | status and final URL match |
| `18_Migration` | 5 | observed_status, final_status and final_url match |
| `07_Hreflang` alternates | 5 | alternate_status and alternate_canonical match |

No title drift and no status change since the A2 probe on any sampled row.

## 8. Cross-document consistency

Verified against the workbook and the CSVs. Confirmed correct in the executive report
and the ledger: known URLs **3,369**; inspected **628** (490 indexed / 91
discovered-not-indexed / 19 unknown / 14 noindex / 10 crawled-not-indexed / 4 duplicate);
content-reviewed **140**; W1 **1,008 / 69,925** vs W0 **761 / 39,935**; migration
**691 / 219 / 91 / 89 / 43 / 9**; coupling **70** points and **12** template fixes
(kinds 39 / 24 / 4 / 2 / 1); credits **751**; hreflang **14,585** passing edges;
`29_Country_Modules` 42 modules with 17 unreferenced; `30_Scripts_Cleanup` 152 scripts
with 143 outside `applied/`; 820 keywords, 299 competitors, 410 backlinks + 258 prospects.

Seven corrections for the orchestrator to patch (this agent did not edit either document):

| Where | Says | Should say |
| --- | --- | --- |
| Report §1 and §4 | live probe 200 = 2,791, 404 = 541, 410 = 38 | **200 = 2,889, 404 = 437, 410 = 44** of 3,370 rows. The 2,791/38 are from the raw 4,271-row probe file including host and slash variants; 541 is a residual, not a count (QA-019) |
| Report §5 | "41 checks, 16 failing before reconciliation, 12 after" | **40 technical checks** (44 sheet rows, including 4 carried locale-QA rows); 12 T-checks failing after reconciliation, plus QA-068 and QA-069 (QA-020) |
| Report §4 and §12 | rendered in a browser = 8 | **8 browser renders over 6 distinct inventory URLs** (`04` audit_state and `25_Config` both say 6) (QA-021) |
| Report §11 | "20_Change_Log, 30 events" | **31** (QA-022) |
| Report §1 item 4 | "70 coupling points (39, 24, 4)" — sums to 67 | add the 2 applied-script/draft and 1 test/dead rows, or drop the breakdown (QA-023) |
| Ledger §2 | workbook has "30 sheets" | **31** (30 table sheets + `01_Dashboard`) (QA-024) |
| Report header and ledger §2 | audited commit `f055a9b7…` | `25_Config` and `git rev-parse HEAD` say `451b23e7…`, which is also the build_id on 3,731 of 3,771 crawl rows (40 carry `f055a9b7`). Reconcile (QA-025) |

Note on "live-tested 3,370": `08` holds 3,370 non-route-pattern crawl rows over 3,369
distinct URLs, because url_id `U000001` was probed twice (QA-015). The workbook now
reports the URL count (3,369) in both `25_Config` and the dashboard; the report's
"3,370 rows" phrasing is accurate as written.

## 9. Coverage-statement inputs

Total data rows across the 30 table sheets: **64,645** (`01_Dashboard` is a laid-out
sheet, not a table). Total QA discrepancies (severity block or fix): **26** — 0 blocking,
14 fixed in the workbook, 12 open.

Suggested §12 row: `64,645 data rows across 30 table sheets (31 sheets incl. the
dashboard) · 26 QA discrepancies, 0 blocking, 14 fixed in the workbook, 12 open`.

| Sheet | Rows |
| --- | --- |
| 00_README | 30 |
| 01_Dashboard | 115 (laid-out, no table) |
| 02_Markets_Locales | 33 |
| 03_Data_Access | 14 |
| 04_Page_Inventory | 3,752 |
| 05_Technical_QA | 44 |
| 06_Locale_Data_QA | 33 |
| 07_Hreflang | 24,315 |
| 08_Crawl_History | 3,771 |
| 09_GSC_Page_Daily | 19,488 |
| 10_GSC_Query_Daily | 5,817 |
| 11_GA4_Landing_Daily | 204 |
| 12_Monthly_Summary | 113 |
| 13_Keyword_Map | 820 |
| 14_Competitors | 299 |
| 15_Backlinks | 668 |
| 16_Content_Review | 141 |
| 17_pSEO_Plan | 11 |
| 18_Migration | 1,142 |
| 19_Issues | 38 |
| 20_Change_Log | 31 |
| 21_Historical_Baselines | 21 |
| 22_Refresh_Log | 15 |
| 23_Data_Dictionary | 502 |
| 24_Sources | 96 |
| 25_Config | 30 |
| 26_GSC_Property_Daily | 2,928 |
| 27_Country_Coupling | 70 |
| 28_Copy_Proposals | 25 |
| 29_Country_Modules | 42 |
| 30_Scripts_Cleanup | 152 |

## 10. Open items by owner

**A10 / next rebuild (source CSVs — the workbook fixes are reverted by a rebuild):**
`url_inspection.csv` coverage_state mojibake (QA-003); `crawl_history.csv` unquoted-CSV
bleed on 123 rows plus 6 truncated route-pattern final_urls (QA-014, QA-027); the
duplicate `U000001` crawl row (QA-015); and `build_workbook.py` must write
`_xlfn.AGGREGATE`, a tie-aware top-10 lookup, the `<>route_pattern_not_url` filter on the
`25_Config` coverage counters, and must build `04.audit_state` after `content_review.csv`
has landed.

**Owner / analyst:** the third P0 (CPL-006) — demote or add to the report (QA-016);
12 blank `19_Issues` statuses including two P0 rows (QA-017); 5 free-text statuses to
move into `next_action` (QA-018); `clinical_review_status` on the 12 clinical-gated
`16_Content_Review` rows (QA-026).

**Orchestrator:** the seven report/ledger corrections in §8, plus the §12 coverage row
and the ledger `[A11-PENDING]` marker from §9.

## 11. How to reproduce

```
python seo/tracking/scripts/qa_fixes.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
powershell -File seo/tracking/scripts/recalc_excel.ps1 -Path C:\Github\global-health-website\seo\tracking\Global_Health_SEO_Tracker.xlsx
python seo/tracking/scripts/check_formula_errors.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
```

Always run all three in that order. openpyxl drops every cached formula result on save,
including on a no-op re-run, so a `qa_fixes.py` run that is not followed by
`recalc_excel.ps1` leaves the workbook with blank cards and makes the formula check
meaningless.

`qa_fixes.py` is idempotent: a second run reports 0 changes for every fix. It only ever
writes to the workbook — no CSV and no repository source file is modified, and no value
is invented: every replacement is read back from an existing sheet, from
`content_review.csv`, or is a pure encoding, formula or validation repair.
