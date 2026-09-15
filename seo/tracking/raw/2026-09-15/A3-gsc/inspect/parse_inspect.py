#!/usr/bin/env python3
"""Flatten inspect_urls raw JSONL (one line per batch call) into a CSV.

Usage: python parse_inspect.py <input.jsonl> <output.csv>

Reusable across A3i-* URL-inspection agents/batches - just point it at a
different raw-set-N.jsonl / inspect-set-N.csv pair.
"""
import csv
import json
import sys

FIELDS = [
    "inspected_at", "url", "verdict", "coverage_state", "indexing_state",
    "robots_txt_state", "page_fetch_state", "last_crawl_time", "crawled_as",
    "google_canonical", "user_canonical", "canonical_match",
    "mobile_usability_verdict", "rich_results_verdict", "rich_results_types",
    "sitemap_listed", "referring_urls_count", "error",
]


def canonical_match(google, user):
    if not google or not user:
        return "unknown"
    return "yes" if google == user else "no"


def flatten_entry(url, result, inspected_at, error):
    if error and not result:
        return {
            "inspected_at": inspected_at, "url": url, "error": error,
        }

    idx = (result or {}).get("indexStatusResult", {}) or {}
    mobile = (result or {}).get("mobileUsabilityResult", {}) or {}
    rich = (result or {}).get("richResultsResult", {}) or {}

    rich_types = "|".join(
        dict.fromkeys(
            item.get("richResultType", "")
            for item in rich.get("detectedItems", [])
            if item.get("richResultType")
        )
    )
    sitemap = idx.get("sitemap") or []
    google_can = idx.get("googleCanonical", "")
    user_can = idx.get("userCanonical", "")

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
        "google_canonical": google_can,
        "user_canonical": user_can,
        "canonical_match": canonical_match(google_can, user_can),
        "mobile_usability_verdict": mobile.get("verdict", ""),
        "rich_results_verdict": rich.get("verdict", ""),
        "rich_results_types": rich_types,
        "sitemap_listed": "|".join(sitemap),
        "referring_urls_count": len(idx.get("referringUrls") or []),
        "error": error or "",
    }


def main(in_path, out_path):
    rows = []
    with open(in_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            call = json.loads(line)
            inspected_at = call.get("fetched_at_utc", "")
            for item in call.get("results", []):
                rows.append(flatten_entry(
                    item.get("url", ""),
                    item.get("result"),
                    inspected_at,
                    item.get("error"),
                ))

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    print(f"wrote {len(rows)} rows to {out_path}")


def _demo():
    """Smallest self-check: canonical_match + rich_results_types flattening."""
    r = flatten_entry(
        "https://example.com/x",
        {"indexStatusResult": {
            "verdict": "PASS",
            "coverageState": "Submitted and indexed",
            "googleCanonical": "https://example.com/x",
            "userCanonical": "https://example.com/x",
            "sitemap": ["https://example.com/sitemap.xml"],
            "referringUrls": ["a", "b"],
        }},
        "2026-09-15T00:00:00Z",
        None,
    )
    assert r["canonical_match"] == "yes", r
    assert r["referring_urls_count"] == 2, r

    mismatch = flatten_entry(
        "https://example.com/y",
        {"indexStatusResult": {
            "googleCanonical": "https://example.com/y2", "userCanonical": "https://example.com/y",
        }},
        "2026-09-15T00:00:00Z",
        None,
    )
    assert mismatch["canonical_match"] == "no", mismatch

    unknown = flatten_entry("https://example.com/z", {"indexStatusResult": {}}, "2026-09-15T00:00:00Z", None)
    assert unknown["canonical_match"] == "unknown", unknown

    errored = flatten_entry("https://example.com/e", None, "2026-09-15T00:00:00Z", "quota exceeded")
    assert errored["error"] == "quota exceeded", errored
    print("demo self-check passed")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--demo":
        _demo()
    elif len(sys.argv) != 3:
        print("usage: python parse_inspect.py <input.jsonl> <output.csv>", file=sys.stderr)
        sys.exit(1)
    else:
        main(sys.argv[1], sys.argv[2])
