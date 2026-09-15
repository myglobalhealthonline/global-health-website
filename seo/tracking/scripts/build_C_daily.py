"""Build seo/tracking/data/gsc_query_daily.csv from the A3c-3 daily JSONL pulls.

Source rows: seo/tracking/raw/2026-09-15/A3-gsc/C/C_daily_<date>_r<startRow>.jsonl
Each row is a raw GSC API row: {"keys": [query, page, country, device], "clicks", "impressions", "ctr", "position"}.
date is not in the row (dimensions capped at 4 by the tool) -- it's the call date, taken from the filename.
"""
import csv
import glob
import json
import os
import re

RAW_DIR = "seo/tracking/raw/2026-09-15/A3-gsc/C"
OUT_PATH = "seo/tracking/data/gsc_query_daily.csv"
REFRESH_ID = "R2026-09-15-GSC-C"
TRUNCATION_CAP = 4000

FIELDS = [
    "date", "query", "page", "searcher_country", "device", "search_type",
    "clicks", "impressions", "ctr", "avg_position", "row_key",
    "refresh_id", "data_state", "source_timezone", "data_quality", "source",
]


def day_row_totals():
    totals = {}
    for path in glob.glob(os.path.join(RAW_DIR, "C_daily_*_r*.jsonl")):
        m = re.match(r"C_daily_(\d{4}-\d{2}-\d{2})_r\d+\.jsonl$", os.path.basename(path))
        if not m:
            continue
        date = m.group(1)
        with open(path, encoding="utf-8") as f:
            n = sum(1 for _ in f)
        totals[date] = totals.get(date, 0) + n
    return totals


def main():
    totals = day_row_totals()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    files = sorted(glob.glob(os.path.join(RAW_DIR, "C_daily_*_r*.jsonl")))
    n_written = 0
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as out_f:
        writer = csv.DictWriter(out_f, fieldnames=FIELDS)
        writer.writeheader()
        for path in files:
            m = re.match(r"C_daily_(\d{4}-\d{2}-\d{2})_r\d+\.jsonl$", os.path.basename(path))
            date = m.group(1)
            quality = "truncated at 4000 rows/day" if totals[date] >= TRUNCATION_CAP else ""
            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    row = json.loads(line)
                    query, page, country, device = row["keys"]
                    writer.writerow({
                        "date": date,
                        "query": query,
                        "page": page,
                        "searcher_country": country,
                        "device": device,
                        "search_type": "web",
                        "clicks": row["clicks"],
                        "impressions": row["impressions"],
                        "ctr": row["ctr"],
                        "avg_position": row["position"],
                        "row_key": f"{date}|{query}|{page}|{country}|{device}|web",
                        "refresh_id": REFRESH_ID,
                        "data_state": "final",
                        "source_timezone": "America/Los_Angeles",
                        "data_quality": quality,
                        "source": "openseo:get_search_console_performance",
                    })
                    n_written += 1

    print(f"wrote {n_written} rows to {OUT_PATH}")
    for date in sorted(totals):
        print(f"  {date}: {totals[date]} rows{' (TRUNCATED)' if totals[date] >= TRUNCATION_CAP else ''}")


if __name__ == "__main__":
    main()
