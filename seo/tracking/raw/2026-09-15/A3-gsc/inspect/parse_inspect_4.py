"""Flatten raw-set-4.jsonl (URL Inspection API responses) to inspect-set-4.csv.

Usage: python parse_inspect_4.py
Reads raw-set-4.jsonl and writes inspect-set-4.csv in the same folder.
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw-set-4.jsonl"
OUT = HERE / "inspect-set-4.csv"

COLUMNS = [
    "inspected_at", "url", "verdict", "coverage_state", "indexing_state",
    "robots_txt_state", "page_fetch_state", "last_crawl_time", "crawled_as",
    "google_canonical", "user_canonical", "canonical_match",
    "mobile_usability_verdict", "rich_results_verdict", "rich_results_types",
    "sitemap_listed", "referring_urls_count", "error",
]


def flatten_entry(inspected_at: str, url: str, result: dict) -> dict:
    idx = result.get("indexStatusResult", {})
    mob = result.get("mobileUsabilityResult", {})
    rich = result.get("richResultsResult", {})

    google_canonical = idx.get("googleCanonical", "")
    user_canonical = idx.get("userCanonical", "")
    if google_canonical and user_canonical:
        canonical_match = "yes" if google_canonical == user_canonical else "no"
    else:
        canonical_match = "unknown"

    rich_types = "|".join(
        sorted({item.get("richResultType", "") for item in rich.get("detectedItems", []) if item.get("richResultType")})
    )

    return {
        "inspected_at": inspected_at,
        "url": url,
        "verdict": idx.get("verdict", ""),
        "coverage_state": idx.get("coverageState", ""),
        "indexing_state": idx.get("indexingState", ""),
        "robots_txt_state": idx.get("robotsTxtState", ""),
        "page_fetch_state": idx.get("pageFetchState", ""),
        "last_crawl_time": idx.get("lastCrawlTime", ""),
        "crawled_as": idx.get("crawledAs", ""),
        "google_canonical": google_canonical,
        "user_canonical": user_canonical,
        "canonical_match": canonical_match,
        "mobile_usability_verdict": mob.get("verdict", ""),
        "rich_results_verdict": rich.get("verdict", ""),
        "rich_results_types": rich_types,
        "sitemap_listed": "yes" if idx.get("sitemap") else "no",
        "referring_urls_count": len(idx.get("referringUrls", [])),
        "error": "",
    }


def main() -> None:
    rows = []
    with RAW.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            call = json.loads(line)
            inspected_at = call.get("timestamp", "")
            response = call.get("response", {})

            if not response.get("ok", False):
                # whole batch failed - record one error row per intended URL if we have none
                rows.append({c: "" for c in COLUMNS} | {
                    "inspected_at": inspected_at,
                    "error": response.get("error", "batch call failed"),
                })
                continue

            for item in response.get("results", []):
                url = item.get("url", "")
                if "result" in item and item["result"] is not None:
                    rows.append(flatten_entry(inspected_at, url, item["result"]))
                else:
                    row = {c: "" for c in COLUMNS}
                    row["inspected_at"] = inspected_at
                    row["url"] = url
                    row["error"] = item.get("error", "no result returned")
                    rows.append(row)

    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
