#!/usr/bin/env python
"""A11 QA fixes for seo/tracking/Global_Health_SEO_Tracker.xlsx.

Re-runnable and idempotent: every fix checks the current state first and is a
no-op once applied. Workbook-only - it never writes to seo/tracking/data/*.csv
or any repository source file, and it never invents a value: every replacement
is either read back from an existing sheet, from content_review.csv, or is a
pure encoding/formula/validation repair.

Usage:
  python seo/tracking/scripts/qa_fixes.py --workbook seo/tracking/Global_Health_SEO_Tracker.xlsx
  pwsh -File seo/tracking/scripts/recalc_excel.ps1 -Path <same path>
  python seo/tracking/scripts/check_formula_errors.py --workbook <same path>
"""
from __future__ import annotations

import argparse
import csv
import pathlib
import sys

import openpyxl
from openpyxl.utils import range_boundaries, get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

REPO = pathlib.Path(__file__).resolve().parents[3]
CONTENT_REVIEW = REPO / "seo" / "tracking" / "data" / "content_review.csv"

# The literal Google actually returns; the CSV (and therefore the workbook)
# carried its UTF-8 bytes re-decoded as cp1252.
NOINDEX_GOOD = "Excluded by ‘noindex’ tag"
NOINDEX_MOJI = "Excluded by â€˜noindexâ€™ tag"

# Canonical status vocabulary already used by 19_Issues / 05_Technical_QA.
STATUS_VOCAB = ("Not tested,Proposed,Needs recheck,In progress,Blocked,"
                "Awaiting review,Approved,Implemented,Verified,Closed,Not applicable")

log: list[str] = []


def note(msg: str) -> None:
    log.append(msg)
    print(msg)


def header_col(ws, name: str) -> int | None:
    for c in range(1, ws.max_column + 1):
        if ws.cell(row=5, column=c).value == name:
            return c
    return None


def table_rows(ws) -> tuple[int, int, int, int]:
    ref = ws.tables[list(ws.tables)[0]].ref
    return range_boundaries(ref)  # min_col, min_row, max_col, max_row


def add_list_dv(ws, col_letter: str, last_row: int, values: str, tag: str) -> None:
    sqref = f"{col_letter}6:{col_letter}{last_row}"
    for dv in ws.data_validations.dataValidation:
        if str(dv.sqref) == sqref:
            if dv.formula1 != f'"{values}"':
                dv.formula1 = f'"{values}"'
                note(f"  updated validation list on {tag} ({sqref})")
            return
    dv = DataValidation(type="list", formula1=f'"{values}"', allow_blank=True,
                        showDropDown=False)
    ws.add_data_validation(dv)
    dv.add(sqref)
    note(f"  added validation list on {tag} ({sqref})")


def fix_dashboard_aggregate(wb) -> None:
    """F1 - the top-10 gain/decline lists render blank.

    AGGREGATE is an Excel 2010+ function, so the file format requires it to be
    stored as `_xlfn.AGGREGATE`. It was stored bare, Excel resolved it as an
    unknown user function (`_xludf.AGGREGATE` -> #NAME?), and the surrounding
    IFERROR turned every cell into "". Writing the bare name back does not
    help: Excel re-mangles it on the next save.
    """
    ws = wb["01_Dashboard"]
    n = 0
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if not isinstance(v, str) or "AGGREGATE(" not in v:
                continue
            new = v.replace("_xludf.AGGREGATE(", "AGGREGATE(")
            new = new.replace("_xlfn.AGGREGATE(", "AGGREGATE(")
            new = new.replace("AGGREGATE(", "_xlfn.AGGREGATE(")
            if new != v:
                cell.value = new
                n += 1
    note(f"F1 dashboard: {n} AGGREGATE cells stored as _xlfn.AGGREGATE")
    fix_top10_ties(ws)


def fix_top10_ties(ws) -> None:
    """F12 - the top-10 URL lookup collapses on ties.

    MATCH always returns the first row holding the value, so every tied rank
    printed the same URL (all ten decline rows read -100% / /book-online).
    Take the n-th matching row instead, n = how many times this value has
    already been listed above.
    """
    col = "T04PageInventory[impressions_change_pct]"
    n = 0
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if not isinstance(v, str) or "MATCH(" not in v or col not in v:
                continue
            b = f"B{cell.row}"
            first = 76 if cell.row < 87 else 89
            new = (f'=IFERROR(INDEX(T04PageInventory[documented_url],'
                   f'_xlfn.AGGREGATE(15,6,(ROW({col})-5)/({col}={b}),'
                   f'COUNTIF($B${first}:{b},{b}))),"")')
            if new != v:
                cell.value = new
                n += 1
    note(f"F12 dashboard: {n} top-10 URL lookups made tie-aware")


def fix_noindex_encoding(wb) -> None:
    """F2 - 14 coverage_state cells carry mojibake; the dashboard card reads 0."""
    ws = wb["04_Page_Inventory"]
    col = header_col(ws, "coverage_state")
    _, _, _, last = table_rows(ws)
    n = 0
    for r in range(6, last + 1):
        cell = ws.cell(row=r, column=col)
        if cell.value == NOINDEX_MOJI:
            cell.value = NOINDEX_GOOD
            n += 1
    note(f"F2 04_Page_Inventory: repaired {n} mojibake coverage_state cells")

    # The inline validation list cannot express this enum at all: one member
    # ("Duplicate, Google chose different canonical than user") contains the
    # comma Excel uses as the list delimiter, so 4 valid cells read as invalid.
    # coverage_state is a read-only Google API enum, not analyst input - the
    # enum stays documented in 23_Data_Dictionary.
    letter = get_column_letter(col)
    keep = [dv for dv in ws.data_validations.dataValidation
            if not str(dv.sqref).startswith(f"{letter}6:")]
    if len(keep) != len(ws.data_validations.dataValidation):
        ws.data_validations.dataValidation = keep
        note("F2 04_Page_Inventory: dropped the unusable coverage_state list "
             "(comma inside a member splits the inline list)")

    # Dashboard card: match on a wildcard so no quote character can break it.
    dash = wb["01_Dashboard"]
    for row in dash.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and "coverage_state]" in v and "noindex" in v:
                new = ('=COUNTIFS(T04PageInventory[coverage_state],'
                       '"Excluded by*noindex*tag")')
                if v != new:
                    cell.value = new
                    note(f"F2 dashboard {cell.coordinate}: noindex card now "
                         "matches by wildcard")


def fix_audit_state(wb) -> None:
    """F3 - audit_state never records Content-reviewed, so two cards read 0.

    content_review.csv landed after the inventory sheet was written; its 140
    url_ids all exist in 04_Page_Inventory.
    """
    if not CONTENT_REVIEW.exists():
        note("F3 SKIPPED: content_review.csv not found")
        return
    with CONTENT_REVIEW.open(encoding="utf-8-sig", newline="") as fh:
        ids = {r["url_id"].strip() for r in csv.DictReader(fh) if r.get("url_id")}
    ws = wb["04_Page_Inventory"]
    uid = header_col(ws, "url_id")
    aud = header_col(ws, "audit_state")
    _, _, _, last = table_rows(ws)
    n = 0
    for r in range(6, last + 1):
        if str(ws.cell(row=r, column=uid).value).strip() not in ids:
            continue
        cell = ws.cell(row=r, column=aud)
        cur = str(cell.value or "")
        if "Content-reviewed" in cur:
            continue
        cell.value = "Content-reviewed" if cur in ("", "Not checked") else cur + "|Content-reviewed"
        n += 1
    note(f"F3 04_Page_Inventory: marked {n} rows Content-reviewed "
         f"({len(ids)} url_ids in content_review.csv)")


def fix_config_denominator(wb) -> None:
    """F4 - 25_Config live_tested counts route patterns, urls_known does not."""
    ws = wb["25_Config"]
    _, _, _, last = table_rows(ws)
    n = 0
    for r in range(6, last + 1):
        v = ws.cell(row=r, column=2).value
        if (isinstance(v, str) and v.startswith("=COUNTIFS(T04PageInventory[audit_state]")
                and "route_pattern_not_url" not in v):
            ws.cell(row=r, column=2).value = (
                v[:-1] + ',T04PageInventory[inventory_state],"<>route_pattern_not_url")')
            n += 1
    note(f"F4 25_Config: aligned {n} coverage counters to the urls_known "
         "denominator (route patterns excluded)")


def fix_stray_validations(wb) -> None:
    """F5/F6 - a mis-targeted list on 05 and a float-formatted list on 15."""
    ws = wb["05_Technical_QA"]
    _, _, _, last = table_rows(ws)
    keep = []
    for dv in ws.data_validations.dataValidation:
        _, _, _, r2 = range_boundaries(str(dv.sqref).split()[0])
        if r2 > last and "Needs recheck" in (dv.formula1 or ""):
            note("F5 05_Technical_QA: removed the 19_Issues status list wrongly "
                 f"applied to {dv.sqref} (real list is pass/fail/partial...)")
            continue
        keep.append(dv)
    ws.data_validations.dataValidation = keep

    ws = wb["15_Backlinks"]
    for dv in ws.data_validations.dataValidation:
        if dv.formula1 and "200.0" in dv.formula1:
            dv.formula1 = dv.formula1.replace("200.0", "200").replace("404.0", "404")
            note("F6 15_Backlinks: resolved_http_status list 200.0/404.0 -> 200/404")


def fix_date_formats(wb) -> None:
    """F7 - the dashboard freshness cards render as date serial numbers."""
    ws = wb["01_Dashboard"]
    n = 0
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if (isinstance(v, str) and v.startswith("='25_Config'!B")
                    and cell.number_format == "General"):
                cell.number_format = "yyyy-mm-dd"
                n += 1
    note(f"F7 dashboard: {n} freshness cards formatted as dates, not serials")


def fix_missing_validations(wb) -> None:
    """F8/F9 - status and classification columns without a list.

    Every list is the union of the values already present in that column plus
    the workbook's own 19_Issues status vocabulary; nothing new is invented.
    """
    ws = wb["16_Content_Review"]
    _, _, _, last = table_rows(ws)
    add_list_dv(ws, get_column_letter(header_col(ws, "clinical_review_status")), last,
                "Not assessed," + STATUS_VOCAB, "16 clinical_review_status")
    add_list_dv(ws, get_column_letter(header_col(ws, "native_editor_status")), last,
                "needed,not needed,Not assessed", "16 native_editor_status")
    add_list_dv(ws, get_column_letter(header_col(ws, "copy_approval_status")), last,
                "proposed,Not approved,Approved,Rejected", "16 copy_approval_status")

    for sheet in ("27_Country_Coupling", "28_Copy_Proposals"):
        ws = wb[sheet]
        _, _, _, last = table_rows(ws)
        add_list_dv(ws, get_column_letter(header_col(ws, "status")), last,
                    "proposed," + STATUS_VOCAB, f"{sheet} status")


def fix_p0_banner(wb) -> None:
    """F11 - the banner names two P0 issues; 19_Issues carries three."""
    iss = wb["19_Issues"]
    _, _, _, last = table_rows(iss)
    idc, pc = header_col(iss, "issue_id"), header_col(iss, "priority")
    p0 = [str(iss.cell(row=r, column=idc).value) for r in range(6, last + 1)
          if iss.cell(row=r, column=pc).value == "P0"]
    if not p0:
        return
    text = f"P0 ({len(p0)}): " + ", ".join(p0) + " - see 19_Issues"
    ws = wb["01_Dashboard"]
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and "are P0 - see 19_Issues" in cell.value:
                if cell.value != text:
                    cell.value = text
                    note(f"F11 dashboard {cell.coordinate}: P0 banner now lists "
                         f"all {len(p0)} P0 issues ({', '.join(p0)})")
                return


# A bled tail is a GSC export row, not a URL: it always carries the refresh id,
# the source timezone and the connector name. Route-pattern rows legitimately
# contain a comma inside a regex quantifier ({3,}) and must never be truncated.
BLEED_MARKERS = ("openseo_mcp:", "America/Los_Angeles", "R2026-09-15-GSC")


def fix_bled_url(wb) -> None:
    """F13 - crawl rows whose requested_url carries an unquoted-CSV tail."""
    ws = wb["08_Crawl_History"]
    req = header_col(ws, "requested_url")
    _, _, _, last = table_rows(ws)
    n = 0
    for r in range(6, last + 1):
        cell = ws.cell(row=r, column=req)
        v = cell.value
        if not isinstance(v, str) or "," not in v:
            continue
        head, tail = v.split(",", 1)
        if not any(m in tail for m in BLEED_MARKERS):
            continue
        cell.value = head
        n += 1
        note(f"F13 08_Crawl_History!{cell.coordinate}: stripped GSC CSV bleed "
             "from requested_url")
    if not n:
        note("F13 08_Crawl_History: no bled requested_url found (already fixed)")


DICT_ROWS = [
    ("00_README", "topic", "Section heading of the README row.",
     "Text", "One row per README instruction", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("00_README", "instructions", "Instruction text for that README topic.",
     "Text", "One row per README instruction", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("04_Page_Inventory", "raw_url",
     "URL exactly as the discovery source emitted it, before normalization.",
     "Text", "One row per discovered URL identity", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("04_Page_Inventory", "normalized_url",
     "Absolute canonical-host form of raw_url used as the join key across sheets.",
     "Text", "One row per discovered URL identity", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("04_Page_Inventory", "template_file",
     "Repository route or template file that renders the URL, where one was resolved.",
     "Text", "One row per discovered URL identity", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("04_Page_Inventory", "notes",
     "Free-text analyst note about this URL; never a status or a metric.",
     "Text", "One row per discovered URL identity", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("09_GSC_Page_Daily", "page",
     "Page URL exactly as Search Console reported it, before url_id resolution.",
     "Text", "Date x URL x searcher country x device x search type",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("10_GSC_Query_Daily", "page",
     "Page URL exactly as Search Console reported it, before url_id resolution.",
     "Text", "Date x query x URL x searcher country x device x search type",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("10_GSC_Query_Daily", "data_state",
     "Source finality for the row: final, or incomplete while the day can still change.",
     "Text", "Date x query x URL x searcher country x device x search type",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("10_GSC_Query_Daily", "source_timezone",
     "Timezone the source reported the date in; GSC and GA4 differ.",
     "Text", "Date x query x URL x searcher country x device x search type",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("11_GA4_Landing_Daily", "landing_page",
     "Landing page path exactly as GA4 reported it, before url_id resolution.",
     "Text", "Date x landing URL x visitor country x device x session source/medium",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("11_GA4_Landing_Daily", "transactions",
     "GA4 transaction count for the row; 0 only where GA4 measured zero.",
     "Number", "Date x landing URL x visitor country x device x session source/medium",
     "Sum within a window", "Blank numeric + explicit quality; never invented zero"),
    ("11_GA4_Landing_Daily", "data_state",
     "Source finality for the row: complete, or latest_received_possibly_incomplete.",
     "Text", "Date x landing URL x visitor country x device x session source/medium",
     "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "sheet", "Workbook sheet the documented field belongs to.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "field", "Column header as it appears on row 5 of that sheet.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "definition", "What the column means and how it was derived.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "type", "Value type: Text, Number, Date / timestamp or Rate.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "grain", "Row grain of the sheet the column lives on.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "aggregation",
     "Whether the column may be summed, averaged or only read as a dimension.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
    ("23_Data_Dictionary", "missing_rule",
     "How an unknown value is written for this column; zero is never invented.",
     "Text", "One row per sheet column", "Dimension / evidence; do not sum",
     "Blank numeric + explicit quality; never invented zero"),
]


def fix_dictionary(wb) -> None:
    """F10 - 20 table columns have no 23_Data_Dictionary row."""
    ws = wb["23_Data_Dictionary"]
    c1, r1, c2, last = table_rows(ws)
    have = {(str(ws.cell(row=r, column=1).value).strip(),
             str(ws.cell(row=r, column=2).value).strip()) for r in range(6, last + 1)}
    src = ws.cell(row=6, column=1)
    added = 0
    for row in DICT_ROWS:
        if (row[0], row[1]) in have:
            continue
        last += 1
        for i, val in enumerate(row, start=1):
            cell = ws.cell(row=last, column=i, value=val)
            cell._style = ws.cell(row=6, column=i)._style
        added += 1
    if added:
        ws.tables[list(ws.tables)[0]].ref = f"A5:{get_column_letter(c2)}{last}"
        note(f"F10 23_Data_Dictionary: added {added} missing column definitions "
             f"(table ref now A5:{get_column_letter(c2)}{last})")
    else:
        note("F10 23_Data_Dictionary: no missing column definitions")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workbook", required=True)
    args = ap.parse_args()
    path = pathlib.Path(args.workbook).resolve()

    wb = openpyxl.load_workbook(path, data_only=False)
    fix_dashboard_aggregate(wb)
    fix_noindex_encoding(wb)
    fix_audit_state(wb)
    fix_config_denominator(wb)
    fix_stray_validations(wb)
    fix_date_formats(wb)
    fix_missing_validations(wb)
    fix_p0_banner(wb)
    fix_bled_url(wb)
    fix_dictionary(wb)
    wb.save(path)
    print(f"\nsaved {path}\n"
          "openpyxl drops every cached formula result on save, including on a\n"
          "no-op re-run. ALWAYS run recalc_excel.ps1 next, then\n"
          "check_formula_errors.py - otherwise the workbook ships with blank cards.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
