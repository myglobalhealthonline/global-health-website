"""Build seo/tracking/data/gsc_page_daily.csv (page x date grain, ALL country/device)
from every B2_web_*.jsonl in this folder plus the probeA page x date envelopes for
2026-09-08..09-14. De-dupes on (date, page). Renames any pre-existing
gsc_page_daily.csv (country/device grain) to gsc_page_daily_country_device.csv first.

Run from repo root: python seo/tracking/raw/2026-09-15/A3-gsc/B2/build_B2.py
"""
import csv
import glob
import json
import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", ".."))
B2_DIR = os.path.dirname(os.path.abspath(__file__))
A3_DIR = os.path.dirname(B2_DIR)
DATA_DIR = os.path.join(REPO_ROOT, "seo", "tracking", "data")

OLD_CSV = os.path.join(DATA_DIR, "gsc_page_daily.csv")
RENAMED_CSV = os.path.join(DATA_DIR, "gsc_page_daily_country_device.csv")
OUT_CSV = os.path.join(DATA_DIR, "gsc_page_daily.csv")

REFRESH_ID = "R2026-09-15-GSC-B2"
SOURCE = "openseo:get_search_console_performance"
DATA_QUALITY = (
    "page×date grain; country/device detail in "
    "gsc_page_daily_country_device.csv is sparse-filtered by Google"
)
FINAL_CUTOFF = "2026-09-11"  # <= this date is 'final', after is 'incomplete'

PROBEA_FILES = [
    os.path.join(A3_DIR, f"probeA_pagedate_2026-09-08_2026-09-14_r{n}.json")
    for n in (0, 1000, 2000)
]


def rows_from_jsonl(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def rows_from_envelope(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    return d.get("rows", [])


def main():
    # Step 1: protect the existing country/device-grain file before we overwrite it.
    if os.path.exists(OLD_CSV) and not os.path.exists(RENAMED_CSV):
        os.rename(OLD_CSV, RENAMED_CSV)
        print(f"renamed {OLD_CSV} -> {RENAMED_CSV}")

    dedup = {}  # (date, page) -> row dict

    jsonl_files = sorted(glob.glob(os.path.join(B2_DIR, "B2_web_*.jsonl")))
    for path in jsonl_files:
        for r in rows_from_jsonl(path):
            page, date = r["keys"][0], r["keys"][1]
            dedup[(date, page)] = r

    for path in PROBEA_FILES:
        if not os.path.exists(path):
            print(f"WARNING: missing probeA file {path}")
            continue
        for r in rows_from_envelope(path):
            page, date = r["keys"][0], r["keys"][1]
            dedup[(date, page)] = r

    fieldnames = [
        "date", "page", "searcher_country", "device", "search_type",
        "clicks", "impressions", "ctr", "avg_position", "row_key",
        "refresh_id", "data_state", "source_timezone", "data_quality", "source",
    ]

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for (date, page), r in sorted(dedup.items()):
            row_key = f"{date}|{page}|ALL|ALL|web"
            data_state = "final" if date <= FINAL_CUTOFF else "incomplete"
            w.writerow({
                "date": date,
                "page": page,
                "searcher_country": "ALL",
                "device": "ALL",
                "search_type": "web",
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": r.get("ctr", 0),
                "avg_position": r.get("position", ""),
                "row_key": row_key,
                "refresh_id": REFRESH_ID,
                "data_state": data_state,
                "source_timezone": "America/Los_Angeles",
                "data_quality": DATA_QUALITY,
                "source": SOURCE,
            })

    print(f"wrote {len(dedup)} rows to {OUT_CSV}")


if __name__ == "__main__":
    main()
