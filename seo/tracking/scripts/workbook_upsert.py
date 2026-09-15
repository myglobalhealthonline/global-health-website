#!/usr/bin/env python
"""Idempotent CSV -> Excel-table upsert for the SEO tracker workbook.

  python workbook_upsert.py --workbook <xlsx> --sheet 09_GSC_Page_Daily \
      --table T09GSCPageDaily --csv <csv> --key row_key --backfill-days 14 \
      [--preserve owner,notes] [--dry-run]

Matching never trusts a formula cell's text (openpyxl can't read a formula's
computed value without a prior Excel recalculation + data_only save) - keys
are reconstructed from the literal dimension columns using the natural-key
spec documented in the audit brief, not by reading the row_key column.

Only rows whose date falls in the last --backfill-days (relative to the
CSV's own max date), or whose key is new to the sheet, are touched; every
other existing sheet row is left exactly as it was. Formula columns
(ctr, row_key, engagement_rate, ...) always get the row-6 template formula
shifted to their row, never the CSV's literal value. Any other value
starting with = + - @ tab/CR is quote-prefixed before it's written.

Before saving, the current workbook is copied to
seo/tracking/archive/<today>/<same filename>, and a row is appended to
22_Refresh_Log. --dry-run does everything except copy/save/append.
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import shutil
import sys
from datetime import date, datetime, timedelta, timezone

import openpyxl
from openpyxl.utils import get_column_letter, range_boundaries

from manifest import injection_safe

HEADER_ROW = 5          # every data sheet: title row1, scope row2, header row5
TEMPLATE_ROW = 6        # starter ships one example/formula row here
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ARCHIVE_DIR = os.path.join(REPO_ROOT, "seo", "tracking", "archive")
REFRESH_LOG_SHEET = "22_Refresh_Log"
REFRESH_LOG_TABLE = "T22RefreshLog"
REFRESH_LOG_COLUMNS = ["refresh_id", "started_at", "source", "scope", "requested_start",
                        "requested_end", "last_complete_date", "rows_received", "status",
                        "pagination_or_limit", "data_quality", "evidence_path", "next_action"]

# Natural keys as documented for the audit (task brief), reconstructed from
# literal dimension columns - never from the row_key formula cell.
KEY_SPEC = {
    "T26GSCPropertyDaily": ["date", "search_type"],
    "T09GSCPageDaily": ["date", "normalized_url", "searcher_country", "device", "search_type"],
    "T10GSCQueryDaily": ["date", "query", "normalized_url", "searcher_country", "device", "search_type"],
    "T11GA4LandingDaily": ["date", "normalized_landing_url", "visitor_country", "device", "session_source_medium"],
    "T08CrawlHistory": ["checked_at", "url_id"],
}
DEFAULT_FORMULA_COLS = {
    "T26GSCPropertyDaily": ["ctr"],
    "T09GSCPageDaily": ["ctr", "row_key"],
    "T10GSCQueryDaily": ["ctr", "row_key"],
    "T11GA4LandingDaily": ["engagement_rate", "row_key"],
    "T08CrawlHistory": [],
}


def resolve_key_columns(key_arg: str, table: str) -> list[str]:
    if "," in key_arg:
        return [c.strip() for c in key_arg.split(",")]
    if key_arg == "row_key" and table in KEY_SPEC:
        return KEY_SPEC[table]
    return [key_arg]


def shift_formula(formula: str, old_row: int, new_row: int) -> str:
    """Rewrite every `<col letters><old_row>` reference to `<col letters><new_row>`.
    Safe here because these sheets' formulas only ever reference cells in
    their own row."""
    return re.sub(rf"([A-Z]{{1,3}}){old_row}\b", rf"\g<1>{new_row}", formula)


def load_table(ws, table_name: str):
    table = ws.tables[table_name]
    min_col, min_row, max_col, max_row = range_boundaries(table.ref)
    headers = [ws.cell(row=HEADER_ROW, column=c).value for c in range(min_col, max_col + 1)]
    return table, min_col, max_col, max_row, headers


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--workbook", required=True)
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--table", required=True)
    ap.add_argument("--csv", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--backfill-days", type=int, default=14)
    ap.add_argument("--preserve", default="")
    ap.add_argument("--formula-cols", default=None, help="comma list; defaults to a known set per table")
    ap.add_argument("--refresh-id", default=None)
    ap.add_argument("--source", default=None)
    ap.add_argument("--scope", default=None)
    ap.add_argument("--status", default="success")
    ap.add_argument("--pagination-or-limit", default="")
    ap.add_argument("--evidence-path", default="")
    ap.add_argument("--next-action", default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(args.csv, newline="", encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))
    if not csv_rows:
        print("CSV has no rows - nothing to upsert", file=sys.stderr)
        sys.exit(1)

    key_cols = resolve_key_columns(args.key, args.table)
    formula_cols = (args.formula_cols.split(",") if args.formula_cols
                     else DEFAULT_FORMULA_COLS.get(args.table, []))
    preserve_cols = [c.strip() for c in args.preserve.split(",") if c.strip()]

    csv_dates = [r["date"] for r in csv_rows if r.get("date")]
    max_csv_date = max(csv_dates) if csv_dates else None
    window_start = None
    if max_csv_date:
        window_start = (datetime.strptime(max_csv_date, "%Y-%m-%d").date()
                          - timedelta(days=args.backfill_days - 1))

    wb = openpyxl.load_workbook(args.workbook, data_only=False)
    ws = wb[args.sheet]
    table, min_col, max_col, max_row, headers = load_table(ws, args.table)
    col_index = {name: min_col + i for i, name in enumerate(headers)}
    for kc in key_cols:
        if kc not in col_index:
            print(f"key column '{kc}' not found in {args.sheet} headers: {headers}", file=sys.stderr)
            sys.exit(1)

    formula_templates = {}
    for col_name in formula_cols:
        if col_name not in col_index:
            continue
        tpl = ws.cell(row=TEMPLATE_ROW, column=col_index[col_name]).value
        if isinstance(tpl, str) and tpl.startswith("="):
            formula_templates[col_name] = tpl

    # Existing rows: key tuple (from literal dimension cells, never a
    # formula cell) -> row number. Skip the still-blank template row.
    existing = {}
    last_used_row = HEADER_ROW
    for r in range(TEMPLATE_ROW, max_row + 1):
        date_cell = ws.cell(row=r, column=col_index[key_cols[0]]).value
        if date_cell in (None, ""):
            continue
        last_used_row = max(last_used_row, r)
        key_vals = []
        for kc in key_cols:
            v = ws.cell(row=r, column=col_index[kc]).value
            if hasattr(v, "strftime"):
                v = v.strftime("%Y-%m-%d")
            key_vals.append("" if v is None else str(v))
        existing[tuple(key_vals)] = r

    updated = appended = skipped = 0
    next_row = last_used_row + 1
    for row in csv_rows:
        key_tuple = tuple(row.get(kc, "") for kc in key_cols)
        is_new = key_tuple not in existing
        in_window = True
        row_date = row.get("date")
        if window_start and row_date:
            in_window = datetime.strptime(row_date, "%Y-%m-%d").date() >= window_start
        if not (is_new or in_window):
            skipped += 1
            continue

        target_row = existing[key_tuple] if not is_new else next_row
        if is_new:
            existing[key_tuple] = target_row
            next_row += 1
            appended += 1
        else:
            updated += 1

        for col_name, c in col_index.items():
            if col_name in formula_templates:
                ws.cell(row=target_row, column=c).value = shift_formula(
                    formula_templates[col_name], TEMPLATE_ROW, target_row)
                continue
            if not is_new and col_name in preserve_cols:
                continue  # leave the sheet's current value untouched
            ws.cell(row=target_row, column=c).value = injection_safe(row.get(col_name, ""))

    new_last_row = max(last_used_row, next_row - 1, TEMPLATE_ROW)
    table.ref = f"{get_column_letter(min_col)}{HEADER_ROW}:{get_column_letter(max_col)}{new_last_row}"

    # Refresh-log row.
    refresh_id = args.refresh_id or (csv_rows[0].get("refresh_id") or f"A14-upsert-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}")
    quality_notes = sorted({r.get("data_quality", "") for r in csv_rows if r.get("data_quality")})
    log_row = {
        "refresh_id": refresh_id,
        "started_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": args.source or (csv_rows[0].get("source") or ""),
        "scope": args.scope or f"{args.table} upsert from {os.path.basename(args.csv)}",
        "requested_start": min(csv_dates) if csv_dates else "",
        "requested_end": max(csv_dates) if csv_dates else "",
        "last_complete_date": max([r["date"] for r in csv_rows if r.get("data_state") == "final" and r.get("date")], default=""),
        "rows_received": len(csv_rows),
        "status": args.status,
        "pagination_or_limit": args.pagination_or_limit,
        "data_quality": "; ".join(quality_notes)[:500],
        "evidence_path": args.evidence_path,
        "next_action": args.next_action,
    }

    print(f"{args.table}: {updated} updated, {appended} appended, {skipped} skipped (outside backfill window, already present)")
    print(f"table ref -> {table.ref}")
    print(f"refresh log row: {log_row}")

    if args.dry_run:
        print("--dry-run: no snapshot taken, workbook not saved, refresh log not written")
        return

    os.makedirs(os.path.join(ARCHIVE_DIR, date.today().isoformat()), exist_ok=True)
    snapshot_path = os.path.join(ARCHIVE_DIR, date.today().isoformat(), os.path.basename(args.workbook))
    shutil.copy2(args.workbook, snapshot_path)

    log_ws = wb[REFRESH_LOG_SHEET]
    log_table, lmin_col, lmax_col, lmax_row, _ = load_table(log_ws, REFRESH_LOG_TABLE)
    log_row_num = lmax_row + 1
    # if the template row (6) is still blank, reuse it instead of leaving a gap
    if all(log_ws.cell(row=TEMPLATE_ROW, column=lmin_col + i).value in (None, "") for i in range(len(REFRESH_LOG_COLUMNS))):
        log_row_num = TEMPLATE_ROW if lmax_row < TEMPLATE_ROW else lmax_row + 1
    for i, col_name in enumerate(REFRESH_LOG_COLUMNS):
        log_ws.cell(row=log_row_num, column=lmin_col + i).value = injection_safe(log_row[col_name])
    log_table.ref = f"{get_column_letter(lmin_col)}{HEADER_ROW}:{get_column_letter(lmax_col)}{max(log_row_num, lmax_row)}"

    wb.save(args.workbook)
    print(f"snapshot -> {snapshot_path}")
    print(f"saved -> {args.workbook}")


if __name__ == "__main__":
    main()
