#!/usr/bin/env python
"""Scan every cell in a workbook for a formula-error value. Requires the
workbook to have been recalculated and saved by Excel first (run
recalc_excel.ps1) - openpyxl with data_only=True only ever sees a formula's
last *cached* result, never a live recalculation.

Usage: python check_formula_errors.py --workbook <xlsx>
Exit code 1 if any error cell is found, 0 otherwise.
"""
from __future__ import annotations

import argparse
import sys

import openpyxl

ERROR_VALUES = {"#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#N/A", "#NUM!", "#NULL!"}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workbook", required=True)
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.workbook, data_only=True)
    hits = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                v = cell.value
                if isinstance(v, str) and v in ERROR_VALUES:
                    hits.append(f"{ws.title}!{cell.coordinate}: {v}")

    for h in hits:
        print(h)

    if not hits:
        # data_only=True with no prior Excel save reads every formula cell
        # as blank, which looks identical to "no errors" - remind the
        # caller this check only means something after recalc_excel.ps1.
        print("no formula-error cells found (meaningful only if recalc_excel.ps1 "
              "already ran - uncalculated formulas read as blank here, not as an error)")

    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
