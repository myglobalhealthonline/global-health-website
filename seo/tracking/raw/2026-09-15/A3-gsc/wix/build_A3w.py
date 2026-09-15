"""
A3w: build gsc_page_monthly_wix.csv and gsc_legacy_page_country.csv from the
raw GSC JSON responses saved alongside this script, plus manifest-A3w.json.

Usage: python build_A3w.py   (run from this directory)
"""
import json
import csv
import os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
# HERE = seo/tracking/raw/2026-09-15/A3-gsc/wix -> up 4 to seo/tracking, then /data
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

REFRESH_ID = "R2026-09-15-GSC-W"
SOURCE = "openseo_mcp:get_search_console_performance"
SOURCE_TZ = "America/Los_Angeles"

# (raw filename, month_start for CSV, period, cap_rows_for_truncation_check)
MONTH_FILES = [
    ("pages_2025-05-15_2025-05-31_r1.json", "2025-05-15", "pre_launch"),
    ("pages_2025-06_r1.json", "2025-06-01", "pre_launch"),
    ("pages_2025-07_r1.json", "2025-07-01", "pre_launch"),
    ("pages_2025-08_r1.json", "2025-08-01", "pre_launch"),
    ("pages_2025-09_r1.json", "2025-09-01", "pre_launch"),
    ("pages_2025-10_r1.json", "2025-10-01", "pre_launch"),
    ("pages_2025-11_r1.json", "2025-11-01", "pre_launch"),
    ("pages_2025-12_r1.json", "2025-12-01", "pre_launch"),
    ("pages_2026-01_r1.json", "2026-01-01", "pre_launch"),
    ("pages_2026-02_r1.json", "2026-02-01", "pre_launch"),
    ("pages_2026-03_r1.json", "2026-03-01", "pre_launch"),
    ("pages_2026-04_r1.json", "2026-04-01", "pre_launch"),
    ("pages_2026-05_r1.json", "2026-05-01", "pre_launch"),
    ("pages_2026-06_r1.json", "2026-06-01", "pre_launch"),
    ("pages_2026-07-01_2026-07-20_r1.json", "2026-07-01", "pre_launch"),
    ("pages_2026-07-21_2026-07-31_r1.json", "2026-07-21", "post_launch"),
]
COUNTRY_FILE = "pages_country_2025-05-15_2026-07-20_r1.json"
CURRENT_SHAPE_PREFIXES = (
    "/ireland", "/czechia", "/portugal", "/spain", "/romania", "/brazil",
)


def load(fname):
    with open(os.path.join(HERE, fname), encoding="utf-8") as fh:
        return json.load(fh)


def path_of(url):
    # strip scheme+host to get the path for shape-matching
    for prefix in ("https://www.myglobalhealth.online", "https://myglobalhealth.online"):
        if url.startswith(prefix):
            return url[len(prefix):] or "/"
    return url


def build_monthly_csv():
    out_path = os.path.join(DATA_DIR, "gsc_page_monthly_wix.csv")
    rows_written = 0
    distinct_pages = set()
    non_current_shape = set()
    month_counts = {}

    with open(out_path, "w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)
        writer.writerow([
            "month_start", "page", "clicks", "impressions", "ctr",
            "avg_position", "period", "truncated", "refresh_id",
            "source_timezone", "source",
        ])
        for fname, month_start, period in MONTH_FILES:
            data = load(fname)
            row_count = data["rowCount"]
            truncated = "yes" if (data.get("hasMore") or row_count >= 3000) else "no"
            month_counts[month_start] = len(data["rows"])
            for r in data["rows"]:
                page = r["keys"][0]
                distinct_pages.add(page)
                p = path_of(page)
                if not p.startswith(CURRENT_SHAPE_PREFIXES):
                    non_current_shape.add(page)
                writer.writerow([
                    month_start, page, r["clicks"], r["impressions"],
                    r["ctr"], r["position"], period, truncated,
                    REFRESH_ID, SOURCE_TZ, SOURCE,
                ])
                rows_written += 1

    return {
        "out_path": out_path,
        "rows_written": rows_written,
        "distinct_pages": len(distinct_pages),
        "non_current_shape": len(non_current_shape),
        "month_counts": month_counts,
    }


def build_country_csv():
    out_path = os.path.join(DATA_DIR, "gsc_legacy_page_country.csv")
    data = load(COUNTRY_FILE)
    truncated = "yes" if data.get("hasMore") else "no"
    rows_written = 0
    with open(out_path, "w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)
        writer.writerow([
            "page", "country", "clicks", "impressions", "ctr",
            "avg_position", "truncated", "refresh_id", "source_timezone",
            "source",
        ])
        for r in data["rows"]:
            page, country = r["keys"][0], r["keys"][1]
            writer.writerow([
                page, country, r["clicks"], r["impressions"], r["ctr"],
                r["position"], truncated, REFRESH_ID, SOURCE_TZ, SOURCE,
            ])
            rows_written += 1
    return {
        "out_path": out_path,
        "rows_written": rows_written,
        "row_count_declared": data["rowCount"],
        "hasMore": data.get("hasMore", False),
    }


def build_manifest(monthly_stats, country_stats):
    calls = []
    for fname, month_start, period in MONTH_FILES:
        data = load(fname)
        calls.append({
            "file": fname,
            "params": {
                "type": "web",
                "dimensions": ["page"],
                "rowLimit": 1000,
                "dataState": "all",
                "startDate": data["startDate"],
                "endDate": data["endDate"],
            },
            "month_start": month_start,
            "period": period,
            "rows": data["rowCount"],
            "hasMore": data.get("hasMore", False),
            "truncated": bool(data.get("hasMore") or data["rowCount"] >= 3000),
        })
    country_data = load(COUNTRY_FILE)
    calls.append({
        "file": COUNTRY_FILE,
        "params": {
            "type": "web",
            "dimensions": ["page", "country"],
            "rowLimit": 1000,
            "dataState": "all",
            "startDate": country_data["startDate"],
            "endDate": country_data["endDate"],
        },
        "rows": country_data["rowCount"],
        "hasMore": country_data.get("hasMore", False),
        "truncated": bool(country_data.get("hasMore")),
        "note": "single call per spec (no pagination); hasMore true means "
                "country attribution is incomplete beyond the top 1000 "
                "page x country rows (sorted by clicks desc)",
    })

    manifest = {
        "schema_version": "1.0",
        "refresh_id": REFRESH_ID,
        "extraction_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_timezone": SOURCE_TZ,
        "source": SOURCE,
        "site_url": "sc-domain:myglobalhealth.online",
        "project_id": "7804f362-5891-417e-9c3a-d9e8d4d7dc6b",
        "calls": calls,
        "outputs": {
            "gsc_page_monthly_wix.csv": monthly_stats,
            "gsc_legacy_page_country.csv": country_stats,
        },
    }
    manifest_path = os.path.join(HERE, "manifest-A3w.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, default=str)
    return manifest_path


def demo():
    """Smoke test: assert path_of() shape-matching works as expected."""
    assert path_of("https://www.myglobalhealth.online/ireland/foo") == "/ireland/foo"
    assert path_of("https://www.myglobalhealth.online/home-health-tests/x") == "/home-health-tests/x"
    assert not "/home-health-tests/x".startswith(CURRENT_SHAPE_PREFIXES)
    assert "/ireland/foo".startswith(CURRENT_SHAPE_PREFIXES)
    print("demo() self-check passed")


if __name__ == "__main__":
    demo()
    monthly_stats = build_monthly_csv()
    country_stats = build_country_csv()
    manifest_path = build_manifest(monthly_stats, country_stats)

    print(f"gsc_page_monthly_wix.csv: {monthly_stats['rows_written']} rows, "
          f"{monthly_stats['distinct_pages']} distinct pages, "
          f"{monthly_stats['non_current_shape']} non-current-shape pages")
    print(f"gsc_legacy_page_country.csv: {country_stats['rows_written']} rows "
          f"(declared rowCount={country_stats['row_count_declared']}, "
          f"hasMore={country_stats['hasMore']})")
    print(f"manifest: {manifest_path}")
