"""Build seo/tracking/data/gsc_page_daily_country_device.csv from B_web_*.jsonl files in this folder.

ponytail: no argparse/config, this script has exactly one job and one output path.
"""
import csv
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "..", "..", "..", "..", "data", "gsc_page_daily_country_device.csv")
REFRESH_ID = "R2026-09-15-GSC-B"
FINAL_CUTOFF = "2026-09-11"  # date <= cutoff -> final, else incomplete

FIELDS = [
    "date", "page", "searcher_country", "device", "search_type",
    "clicks", "impressions", "ctr", "avg_position", "row_key",
    "refresh_id", "data_state", "source_timezone", "data_quality", "source",
]


def rows_from_file(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            page, date, country, device = row["keys"]
            yield {
                "date": date,
                "page": page,
                "searcher_country": country,
                "device": device,
                "search_type": "web",
                "clicks": row["clicks"],
                "impressions": row["impressions"],
                "ctr": row["ctr"],
                "avg_position": row["position"],
                "row_key": f"{date}|{page}|{country}|{device}|web",
                "refresh_id": REFRESH_ID,
                "data_state": "final" if date <= FINAL_CUTOFF else "incomplete",
                "source_timezone": "America/Los_Angeles",
                "data_quality": "ok",
                "source": "openseo:get_search_console_performance",
            }


def main():
    files = sorted(glob.glob(os.path.join(HERE, "B_web_*.jsonl")))
    all_rows = []
    for path in files:
        all_rows.extend(rows_from_file(path))
    all_rows.sort(key=lambda r: (r["date"], r["page"]))

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(all_rows)

    print(f"files={len(files)} rows={len(all_rows)} -> {os.path.abspath(OUT_PATH)}")


def demo():
    """ponytail self-check: row_key format and data_state cutoff."""
    sample = {"keys": ["https://x/", "2026-09-11", "usa", "MOBILE"],
              "clicks": 1, "impressions": 2, "ctr": 0.5, "position": 3.0}
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as tf:
        tf.write(json.dumps(sample) + "\n")
        tmp_path = tf.name
    try:
        out = list(rows_from_file(tmp_path))
        assert len(out) == 1
        r = out[0]
        assert r["row_key"] == "2026-09-11|https://x/|usa|MOBILE|web"
        assert r["data_state"] == "final"
        r2 = dict(r)
        r2["date"] = "2026-09-12"
        assert ("final" if r2["date"] <= FINAL_CUTOFF else "incomplete") == "incomplete"
    finally:
        os.unlink(tmp_path)
    print("demo ok")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        demo()
    else:
        main()
