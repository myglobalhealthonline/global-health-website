"""
Build normalized CSVs for A3a (GSC data) from raw JSON pages saved in this folder.
Run with: python build_A3a.py
"""
import json
import csv
import os
from glob import glob

RAW_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(RAW_DIR, "..", "..", "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

REFRESH_ID = "R2026-09-15-GSC-A"
TZ = "America/Los_Angeles"
SOURCE = "openseo:get_search_console_performance"
LATEST_COMPLETE_DATE = "2026-09-11"  # dates <= this are "final"; later dates are "incomplete"


def load_pages(pattern):
    """Load and concatenate rows from all raw json page files matching a glob pattern."""
    rows = []
    for path in sorted(glob(os.path.join(RAW_DIR, pattern))):
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        rows.extend(d["rows"])
    return rows


def data_state(date_str):
    return "final" if date_str <= LATEST_COMPLETE_DATE else "incomplete"


# ---- Dataset A: property/day/search-type ----
TYPES = ["web", "image", "video", "news", "discover", "googleNews"]
out_path = os.path.join(DATA_DIR, "gsc_property_daily.csv")
with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow([
        "date", "search_type", "clicks", "impressions", "ctr", "avg_position",
        "data_state", "source_timezone", "refresh_id", "data_quality", "source",
    ])
    total_a = 0
    for t in TYPES:
        rows = load_pages(f"A_{t}_2025-05-15_2026-09-14_r*.json")
        for r in rows:
            date_str = r["keys"][0]
            pos = r.get("position", "")
            w.writerow([
                date_str, t, r["clicks"], r["impressions"], r["ctr"], pos,
                data_state(date_str), TZ, REFRESH_ID, "", SOURCE,
            ])
            total_a += 1
print("gsc_property_daily.csv rows:", total_a)

# ---- Dataset B: web date+country, date+device ----
out_path = os.path.join(DATA_DIR, "gsc_date_country.csv")
with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow([
        "date", "search_type", "searcher_country", "clicks", "impressions", "ctr",
        "avg_position", "data_state", "source_timezone", "refresh_id", "data_quality", "source",
    ])
    rows = load_pages("B_web_datecountry_2026-07-21_2026-09-14_r*.json")
    for r in rows:
        date_str, country = r["keys"]
        w.writerow([
            date_str, "web", country, r["clicks"], r["impressions"], r["ctr"],
            r.get("position", ""), data_state(date_str), TZ, REFRESH_ID, "", SOURCE,
        ])
    print("gsc_date_country.csv rows:", len(rows))

out_path = os.path.join(DATA_DIR, "gsc_date_device.csv")
with open(out_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow([
        "date", "search_type", "device", "clicks", "impressions", "ctr",
        "avg_position", "data_state", "source_timezone", "refresh_id", "data_quality", "source",
    ])
    rows = load_pages("B_web_datedevice_2026-07-21_2026-09-14_r*.json")
    for r in rows:
        date_str, device = r["keys"]
        w.writerow([
            date_str, "web", device, r["clicks"], r["impressions"], r["ctr"],
            r.get("position", ""), data_state(date_str), TZ, REFRESH_ID, "", SOURCE,
        ])
    print("gsc_date_device.csv rows:", len(rows))


def demo():
    """Smallest runnable self-check: verify row counts and data_state boundary logic."""
    assert data_state("2026-09-11") == "final"
    assert data_state("2026-09-12") == "incomplete"
    assert data_state("2025-05-15") == "final"
    # sanity: each output CSV must exist and have a header + at least 1 row
    for fname in ["gsc_property_daily.csv", "gsc_date_country.csv", "gsc_date_device.csv"]:
        p = os.path.join(DATA_DIR, fname)
        with open(p, encoding="utf-8") as f:
            lines = f.readlines()
        assert len(lines) > 1, f"{fname} has no data rows"
    print("demo() self-check passed")


if __name__ == "__main__":
    demo()
