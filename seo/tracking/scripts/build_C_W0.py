"""Build GSC dataset C (query x page, query x country, query x device,
search appearance) CSVs for window W0 (2026-07-18..2026-08-14) from the raw
JSONL pulled by agent A3c-2.

Read-only against the raw/ tree; writes CSVs under tracking/data/.
"""
import csv
import glob
import json
import os

RAW = os.path.join(os.path.dirname(__file__), "raw", "2026-09-15", "A3-gsc", "C")
OUT = os.path.join(os.path.dirname(__file__), "data")

WINDOW_START = "2026-07-18"
WINDOW_END = "2026-08-14"
REFRESH_ID = "R2026-09-15-GSC-C"
DATA_STATE = "final"
SOURCE_TZ = "America/Los_Angeles"
DATA_QUALITY = "28-day aggregate; includes 3 pre-launch days; anonymized queries omitted by Google"
SOURCE = "Search Console (openseo MCP get_search_console_performance)"

COMMON_TAIL = [
    "row_key", "refresh_id", "data_state", "source_timezone", "data_quality", "source",
]


def load_rows(pattern):
    rows = []
    for path in sorted(glob.glob(os.path.join(RAW, pattern))):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    return rows


def write_csv(filename, header, records):
    path = os.path.join(OUT, filename)
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(records)
    print(f"wrote {path} ({len(records)} rows)")


def common_tail(row_key):
    return [row_key, REFRESH_ID, DATA_STATE, SOURCE_TZ, DATA_QUALITY, SOURCE]


def build_query_page():
    rows = load_rows("C_W0_querypage_r*.jsonl")
    header = ["window_start", "window_end", "query", "page", "clicks", "impressions",
              "ctr", "avg_position"] + COMMON_TAIL
    records = []
    for r in rows:
        query, page = r["keys"]
        row_key = f"W0|{query}|{page}"
        records.append([
            WINDOW_START, WINDOW_END, query, page, r["clicks"], r["impressions"],
            r["ctr"], r.get("position"),
        ] + common_tail(row_key))
    write_csv("gsc_query_page_W0.csv", header, records)
    return rows


def build_query_country():
    rows = load_rows("C_W0_querycountry_r*.jsonl")
    header = ["window_start", "window_end", "query", "country", "clicks", "impressions",
              "ctr", "avg_position"] + COMMON_TAIL
    records = []
    for r in rows:
        query, country = r["keys"]
        row_key = f"W0|{query}|{country}"
        records.append([
            WINDOW_START, WINDOW_END, query, country, r["clicks"], r["impressions"],
            r["ctr"], r.get("position"),
        ] + common_tail(row_key))
    write_csv("gsc_query_country_W0.csv", header, records)
    return rows


def build_query_device():
    rows = load_rows("C_W0_querydevice_r*.jsonl")
    header = ["window_start", "window_end", "query", "device", "clicks", "impressions",
              "ctr", "avg_position"] + COMMON_TAIL
    records = []
    for r in rows:
        query, device = r["keys"]
        row_key = f"W0|{query}|{device}"
        records.append([
            WINDOW_START, WINDOW_END, query, device, r["clicks"], r["impressions"],
            r["ctr"], r.get("position"),
        ] + common_tail(row_key))
    write_csv("gsc_query_device_W0.csv", header, records)
    return rows


def build_search_appearance():
    rows = load_rows("C_W0_appearance.jsonl")
    header = ["window_start", "window_end", "search_appearance", "clicks", "impressions",
              "ctr", "avg_position"] + COMMON_TAIL
    records = []
    for r in rows:
        (appearance,) = r["keys"]
        row_key = f"W0|{appearance}"
        records.append([
            WINDOW_START, WINDOW_END, appearance, r["clicks"], r["impressions"],
            r["ctr"], r.get("position"),
        ] + common_tail(row_key))
    write_csv("gsc_search_appearance_W0.csv", header, records)
    return rows


def main():
    os.makedirs(OUT, exist_ok=True)
    qp = build_query_page()
    qc = build_query_country()
    qd = build_query_device()
    build_search_appearance()

    date_rows = load_rows("C_W0_date.jsonl")
    total_clicks = sum(r["clicks"] for r in date_rows)
    total_impr = sum(r["impressions"] for r in date_rows)
    qp_clicks = sum(r["clicks"] for r in qp)
    qp_impr = sum(r["impressions"] for r in qp)

    print(f"property total (date dim): clicks={total_clicks} impressions={total_impr}")
    print(f"query x page sums: clicks={qp_clicks} impressions={qp_impr}")
    if total_clicks:
        print(f"anonymized click share: {100 * (1 - qp_clicks / total_clicks):.2f}%")
    if total_impr:
        print(f"anonymized impression share: {100 * (1 - qp_impr / total_impr):.2f}%")
    print(f"query x country rows: {len(qc)}  query x device rows: {len(qd)}")


if __name__ == "__main__":
    main()
