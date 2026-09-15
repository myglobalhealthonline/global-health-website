#!/usr/bin/env python
"""Runnable self-check for the refresh scripts, no framework: builds a tiny
fake GSC raw response (one row with a CSV-injection payload as the query,
one duplicate row_key across two "refresh" files to prove de-dup keeps the
newer one), runs gsc_normalize.py for real, then workbook_upsert.py
--dry-run against a temp copy of the starter workbook. Asserts row_key
uniqueness, injection-safe escaping, de-dup-keeps-newest, and that
--dry-run never touches the workbook file.

Usage: python selftest.py
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STARTER = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "Global_Health_SEO_Tracker_Starter.xlsx"))


def run(*args):
    result = subprocess.run([sys.executable, *args], capture_output=True, text=True)
    assert result.returncode == 0, f"command failed ({result.returncode}): {args}\nSTDOUT:{result.stdout}\nSTDERR:{result.stderr}"
    return result.stdout


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    tmp = tempfile.mkdtemp(prefix="seo_tracker_selftest_")
    raw_dir = os.path.join(tmp, "raw")
    os.makedirs(raw_dir, exist_ok=True)

    # File 1 (older, "r0"): a normal row and one with an injection payload
    # as the query - the exact reason the escaping rule exists.
    file1 = {
        "ok": True, "siteUrl": "sc-domain:test", "startDate": "2026-09-01", "endDate": "2026-09-01",
        "dimensions": ["date", "query", "page", "country", "device"], "hasMore": False,
        "rows": [
            {"keys": ["2026-09-01", "normal query", "https://example.com/page1", "usa", "DESKTOP"],
             "clicks": 1, "impressions": 10, "ctr": 0.1, "position": 5.0},
            {"keys": ["2026-09-01", "=cmd|/c calc", "https://example.com/page1", "usa", "DESKTOP"],
             "clicks": 2, "impressions": 20, "ctr": 0.1, "position": 4.0},
        ],
    }
    # File 2 (newer, "r1"): same first row's key, different clicks - proves
    # de-dup keeps the later file's value.
    file2 = {
        "ok": True, "siteUrl": "sc-domain:test", "startDate": "2026-09-01", "endDate": "2026-09-01",
        "dimensions": ["date", "query", "page", "country", "device"], "hasMore": False,
        "rows": [
            {"keys": ["2026-09-01", "normal query", "https://example.com/page1", "usa", "DESKTOP"],
             "clicks": 99, "impressions": 10, "ctr": 0.1, "position": 5.0},
        ],
    }
    with open(os.path.join(raw_dir, "C_web_2026-09-01_r0.json"), "w", encoding="utf-8") as f:
        json.dump(file1, f)
    with open(os.path.join(raw_dir, "C_web_2026-09-01_r1.json"), "w", encoding="utf-8") as f:
        json.dump(file2, f)

    out_csv = os.path.join(tmp, "gsc_query_daily.csv")
    run(os.path.join(SCRIPT_DIR, "gsc_normalize.py"),
        "--raw-dir", raw_dir, "--out", out_csv, "--dataset", "C", "--refresh-id", "SELFTEST")

    with open(out_csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    assert len(rows) == 2, f"expected 2 rows after de-dup, got {len(rows)}"
    row_keys = [r["row_key"] for r in rows]
    assert len(set(row_keys)) == len(row_keys), f"row_key not unique: {row_keys}"

    normal = next(r for r in rows if "normal query" in r["query"])
    assert normal["clicks"] == "99", f"de-dup did not keep the newer file's value: {normal}"

    injected = next(r for r in rows if r["query"] != "normal query")
    assert injected["query"] == "'=cmd|/c calc", f"injection-safe prefix missing: {injected['query']!r}"
    print("OK: row_key unique, de-dup keeps newest, injection-safe escaping applied")

    # --dry-run against a temp copy of the starter workbook must never touch the file.
    wb_copy = os.path.join(tmp, "workbook.xlsx")
    shutil.copy2(STARTER, wb_copy)
    before_hash = sha256(wb_copy)

    stdout = run(os.path.join(SCRIPT_DIR, "workbook_upsert.py"),
                 "--workbook", wb_copy, "--sheet", "10_GSC_Query_Daily", "--table", "T10GSCQueryDaily",
                 "--csv", out_csv, "--key", "row_key", "--backfill-days", "14", "--dry-run")
    assert "2 appended" in stdout, f"expected 2 appended rows in dry-run output:\n{stdout}"
    after_hash = sha256(wb_copy)
    assert before_hash == after_hash, "--dry-run modified the workbook file on disk"
    print("OK: workbook_upsert --dry-run reports the right counts and leaves the file untouched")

    shutil.rmtree(tmp, ignore_errors=True)
    print("SELFTEST PASSED")


if __name__ == "__main__":
    main()
