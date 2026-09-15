"""Flatten raw-set-3.jsonl (URL Inspection API batches) into inspect-set-3.csv.

ponytail: stdlib csv/json only, no pandas -- one pass over ~157 rows doesn't need it.
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw-set-3.jsonl"
OUT = HERE / "inspect-set-3.csv"

COLUMNS = [
    "inspected_at", "url", "verdict", "coverage_state", "indexing_state",
    "robots_txt_state", "page_fetch_state", "last_crawl_time", "crawled_as",
    "google_canonical", "user_canonical", "canonical_match",
    "mobile_usability_verdict", "rich_results_verdict", "rich_results_types",
    "sitemap_listed", "referring_urls_count", "error",
]


def flatten_row(inspected_at: str, url: str, result: dict) -> dict:
    isr = result.get("indexStatusResult", {}) or {}
    mur = result.get("mobileUsabilityResult", {}) or {}
    rrr = result.get("richResultsResult", {}) or {}

    google_canonical = isr.get("googleCanonical", "")
    user_canonical = isr.get("userCanonical", "")
    if google_canonical and user_canonical:
        canonical_match = "yes" if google_canonical == user_canonical else "no"
    else:
        canonical_match = "unknown"

    rich_types = "|".join(
        item.get("richResultType", "") for item in rrr.get("detectedItems", [])
    )

    return {
        "inspected_at": inspected_at,
        "url": url,
        "verdict": isr.get("verdict", ""),
        "coverage_state": isr.get("coverageState", ""),
        "indexing_state": isr.get("indexingState", ""),
        "robots_txt_state": isr.get("robotsTxtState", ""),
        "page_fetch_state": isr.get("pageFetchState", ""),
        "last_crawl_time": isr.get("lastCrawlTime", ""),
        "crawled_as": isr.get("crawledAs", ""),
        "google_canonical": google_canonical,
        "user_canonical": user_canonical,
        "canonical_match": canonical_match,
        "mobile_usability_verdict": mur.get("verdict", ""),
        "rich_results_verdict": rrr.get("verdict", ""),
        "rich_results_types": rich_types,
        "sitemap_listed": "yes" if isr.get("sitemap") else "no",
        "referring_urls_count": len(isr.get("referringUrls", []) or []),
        "error": "",
    }


def main() -> None:
    rows = []
    failed = []
    with RAW.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            batch = json.loads(line)
            inspected_at = batch.get("timestamp_utc", "")
            resp = batch.get("response", {}) or {}
            if not resp.get("ok", True):
                # whole-batch error: no per-url results available
                continue
            for item in resp.get("results", []):
                url = item.get("url", "")
                if "error" in item and "result" not in item:
                    rows.append({c: "" for c in COLUMNS} | {
                        "inspected_at": inspected_at,
                        "url": url,
                        "error": str(item.get("error", "")),
                    })
                    failed.append(url)
                    continue
                result = item.get("result", {}) or {}
                rows.append(flatten_row(inspected_at, url, result))

    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"wrote {len(rows)} rows ({len(failed)} failed) to {OUT}")


def demo() -> None:
    """ponytail: minimal smoke test -- run this file directly to self-check."""
    sample = {
        "indexStatusResult": {
            "verdict": "PASS",
            "coverageState": "Submitted and indexed",
            "googleCanonical": "https://x/a",
            "userCanonical": "https://x/a",
            "sitemap": ["https://x/sitemap.xml"],
            "referringUrls": ["https://x/b"],
        },
        "richResultsResult": {
            "verdict": "PASS",
            "detectedItems": [{"richResultType": "Breadcrumbs"}],
        },
    }
    row = flatten_row("2026-09-15T00:00:00Z", "https://x/a", sample)
    assert row["canonical_match"] == "yes"
    assert row["rich_results_types"] == "Breadcrumbs"
    assert row["sitemap_listed"] == "yes"
    assert row["referring_urls_count"] == 1

    mismatch = flatten_row("2026-09-15T00:00:00Z", "https://x/a", {
        "indexStatusResult": {"googleCanonical": "https://x/b", "userCanonical": "https://x/a"}
    })
    assert mismatch["canonical_match"] == "no"

    no_canon = flatten_row("2026-09-15T00:00:00Z", "https://x/a", {"indexStatusResult": {}})
    assert no_canon["canonical_match"] == "unknown"
    print("demo ok")


if __name__ == "__main__":
    demo()
    main()
