"""Flatten raw-set-2.jsonl (URL Inspection batch results) into inspect-set-2.csv."""
import json
import csv
from pathlib import Path

HERE = Path(__file__).parent
IN_FILE = HERE / "raw-set-2.jsonl"
OUT_FILE = HERE / "inspect-set-2.csv"

FIELDS = [
    "inspected_at", "url", "verdict", "coverage_state", "indexing_state",
    "robots_txt_state", "page_fetch_state", "last_crawl_time", "crawled_as",
    "google_canonical", "user_canonical", "canonical_match",
    "mobile_usability_verdict", "rich_results_verdict", "rich_results_types",
    "sitemap_listed", "referring_urls_count", "error",
]


def flatten_entry(url, result, fetched_at, error=None):
    row = {f: "" for f in FIELDS}
    row["inspected_at"] = fetched_at
    row["url"] = url
    if error:
        row["error"] = error
        return row

    idx = result.get("indexStatusResult", {}) or {}
    mob = result.get("mobileUsabilityResult", {}) or {}
    rich = result.get("richResultsResult", {}) or {}

    row["verdict"] = idx.get("verdict", "")
    row["coverage_state"] = idx.get("coverageState", "")
    row["indexing_state"] = idx.get("indexingState", "")
    row["robots_txt_state"] = idx.get("robotsTxtState", "")
    row["page_fetch_state"] = idx.get("pageFetchState", "")
    row["last_crawl_time"] = idx.get("lastCrawlTime", "")
    row["crawled_as"] = idx.get("crawledAs", "")

    g_canon = idx.get("googleCanonical", "")
    u_canon = idx.get("userCanonical", "")
    row["google_canonical"] = g_canon
    row["user_canonical"] = u_canon
    if not g_canon or not u_canon:
        row["canonical_match"] = "unknown"
    else:
        row["canonical_match"] = "yes" if g_canon == u_canon else "no"

    row["mobile_usability_verdict"] = mob.get("verdict", "")
    row["rich_results_verdict"] = rich.get("verdict", "")
    types = [item.get("richResultType", "") for item in rich.get("detectedItems", [])]
    row["rich_results_types"] = "|".join(t for t in types if t)

    sitemap = idx.get("sitemap") or []
    row["sitemap_listed"] = "yes" if sitemap else "no"
    row["referring_urls_count"] = len(idx.get("referringUrls") or [])

    return row


def main():
    rows = []
    requested_urls = set()
    with open(IN_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            batch = json.loads(line)
            fetched_at = batch.get("fetched_at_utc", "")
            if not batch.get("ok", True):
                # whole-batch error: record the requested urls of this batch as errored
                for u in batch.get("urls", []):
                    rows.append(flatten_entry(u, {}, fetched_at, error=batch.get("error", "batch failed")))
                    requested_urls.add(u)
                continue
            for item in batch.get("results", []):
                url = item.get("url", "")
                requested_urls.add(url)
                if "error" in item:
                    rows.append(flatten_entry(url, {}, fetched_at, error=str(item["error"])))
                else:
                    rows.append(flatten_entry(url, item.get("result", {}), fetched_at))

    with open(OUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"wrote {len(rows)} rows ({len(requested_urls)} unique URLs) to {OUT_FILE}")


def demo():
    """ponytail: smallest self-check — flatten a PASS entry and a noindex entry, assert key fields."""
    fetched_at = "2026-09-15T00:00:00Z"
    ok_result = {
        "indexStatusResult": {
            "verdict": "PASS", "coverageState": "Submitted and indexed",
            "googleCanonical": "https://x/a", "userCanonical": "https://x/a",
            "sitemap": ["https://x/sitemap.xml"], "referringUrls": ["https://x/b"],
        },
        "mobileUsabilityResult": {"verdict": "VERDICT_UNSPECIFIED"},
        "richResultsResult": {"verdict": "PASS", "detectedItems": [{"richResultType": "Breadcrumbs"}]},
    }
    row = flatten_entry("https://x/a", ok_result, fetched_at)
    assert row["verdict"] == "PASS"
    assert row["canonical_match"] == "yes"
    assert row["sitemap_listed"] == "yes"
    assert row["referring_urls_count"] == 1
    assert row["rich_results_types"] == "Breadcrumbs"

    noindex_result = {
        "indexStatusResult": {
            "verdict": "NEUTRAL", "coverageState": "Excluded by ‘noindex’ tag",
            "indexingState": "BLOCKED_BY_META_TAG",
        },
        "mobileUsabilityResult": {"verdict": "VERDICT_UNSPECIFIED"},
    }
    row2 = flatten_entry("https://x/b", noindex_result, fetched_at)
    assert row2["coverage_state"] == "Excluded by ‘noindex’ tag"
    assert row2["canonical_match"] == "unknown"
    assert row2["sitemap_listed"] == "no"

    err_row = flatten_entry("https://x/c", {}, fetched_at, error="timeout")
    assert err_row["error"] == "timeout"

    print("demo() self-check passed")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        demo()
    else:
        main()
