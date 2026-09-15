"""Build gsc_query_page/country/device/search_appearance W1 CSVs from raw JSONL.

Agent A3c-1, dataset C (query x page), window W1 = 2026-08-15..2026-09-11.
Reads seo/tracking/raw/2026-09-15/A3-gsc/C/*.jsonl, writes seo/tracking/data/*.csv.
"""
import csv
import glob
import json
import os

RAW_DIR = os.path.join("seo", "tracking", "raw", "2026-09-15", "A3-gsc", "C")
OUT_DIR = os.path.join("seo", "tracking", "data")

WINDOW_START = "2026-08-15"
WINDOW_END = "2026-09-11"
REFRESH_ID = "R2026-09-15-GSC-C"
DATA_STATE = "final"
SOURCE_TZ = "America/Los_Angeles"
DATA_QUALITY = "28-day aggregate; anonymized queries omitted by Google"
SOURCE = "search_console"

COMMON_TAIL = ["row_key", "refresh_id", "data_state", "source_timezone", "data_quality", "source"]


def load_rows(pattern):
    rows = []
    for fp in sorted(glob.glob(os.path.join(RAW_DIR, pattern))):
        with open(fp, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    return rows


def write_csv(out_name, dim_names, rows):
    header = ["window_start", "window_end"] + dim_names + ["clicks", "impressions", "ctr", "avg_position"] + COMMON_TAIL
    out_path = os.path.join(OUT_DIR, out_name)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for row in rows:
            keys = row["keys"]
            row_key = "W1|" + "|".join(keys)
            w.writerow(
                [WINDOW_START, WINDOW_END]
                + keys
                + [row.get("clicks", 0), row.get("impressions", 0), row.get("ctr", ""), row.get("position", "")]
                + [row_key, REFRESH_ID, DATA_STATE, SOURCE_TZ, DATA_QUALITY, SOURCE]
            )
    print(f"{out_name}: {len(rows)} rows")
    return len(rows)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    qp_rows = load_rows("C_W1_querypage_r*.jsonl")
    qc_rows = load_rows("C_W1_querycountry_r*.jsonl")
    qd_rows = load_rows("C_W1_querydevice_r*.jsonl")
    sa_rows = load_rows("C_W1_appearance_r*.jsonl")

    write_csv("gsc_query_page_W1.csv", ["query", "page"], qp_rows)
    write_csv("gsc_query_country_W1.csv", ["query", "country"], qc_rows)
    write_csv("gsc_query_device_W1.csv", ["query", "device"], qd_rows)
    write_csv("gsc_search_appearance_W1.csv", ["searchAppearance"], sa_rows)


if __name__ == "__main__":
    main()
