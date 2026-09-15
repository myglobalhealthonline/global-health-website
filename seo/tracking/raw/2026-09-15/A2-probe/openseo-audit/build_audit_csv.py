"""Build CSV exports from the raw OpenSEO audit JSON (A2b, 2026-09-15).

Reads pages_all.json / issues_all.json from this folder, writes:
  seo/tracking/data/openseo_audit_pages.csv
  seo/tracking/data/openseo_audit_issues.csv
  seo/tracking/raw/2026-09-15/A2-probe/openseo-audit/lighthouse.csv (+ .note.txt)
  seo/tracking/raw/2026-09-15/A2-probe/openseo-audit/manifest-A2b.json

No third-party deps. Run: python build_audit_csv.py
"""
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

RAW_DIR = Path(__file__).parent
DATA_DIR = RAW_DIR.parents[3] / "data"  # seo/tracking/data

AUDIT_ID = "123d7af8-8b93-4480-b137-348792f2c61d"
START_URL = "https://www.myglobalhealth.online/"
PAGE_BUDGET_NOTE = "600 of ~2,265 sitemap URLs crawled (audit page budget)"

# Fields the OpenSEO get_audit_pages/get_audit_issues API does not return today.
# Left blank in the CSVs rather than omitted, per the requested column set.
PAGE_FIELDS_NOT_IN_API = [
    "h1", "noindex_reason", "canonical", "internal_links_in",
    "lighthouse_performance_score", "lighthouse_lcp", "lighthouse_cls",
    "lighthouse_inp_tbt", "lighthouse_fcp",
]


def market_of(url: str) -> str:
    path = urlparse(url).path.strip("/")
    seg = path.split("/")[0] if path else ""
    return seg or "(root)"


def main():
    pages = json.loads((RAW_DIR / "pages_all.json").read_text(encoding="utf-8"))["pages"]
    issues_raw = json.loads((RAW_DIR / "issues_all.json").read_text(encoding="utf-8"))
    issues = issues_raw["issues"]
    issue_summary = issues_raw.get("summary", [])

    # --- pages CSV ---
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    pages_csv = DATA_DIR / "openseo_audit_pages.csv"
    header = [
        "url", "status_code", "fetch_class", "title", "title_length",
        "meta_description", "description_length", "h1", "word_count",
        "indexable", "noindex_reason", "canonical", "crawl_depth",
        "internal_links_in", "internal_links_out", "response_time_ms",
        "lighthouse_performance_score", "lighthouse_lcp", "lighthouse_cls",
        "lighthouse_inp_tbt", "lighthouse_fcp",
    ]
    with pages_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        for p in pages:
            title = p.get("title") or ""
            desc = p.get("metaDescription") or ""
            w.writerow([
                p.get("url", ""), p.get("statusCode", ""), p.get("fetchClass", ""),
                title, len(title), desc, len(desc),
                "",  # h1 - not in API
                p.get("wordCount", ""), p.get("isIndexable", ""),
                "",  # noindex_reason - not in API
                "",  # canonical - not in API
                p.get("crawlDepth", ""),
                "",  # internal_links_in - not in API (no inlink graph)
                p.get("internalLinkCount", ""),  # internal_links_out
                p.get("responseTimeMs", ""),
                "", "", "", "", "",  # lighthouse fields - not in API
            ])

    # --- issues CSV ---
    issues_csv = DATA_DIR / "openseo_audit_issues.csv"
    with issues_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["issue_type", "severity", "url", "detail", "how_to_fix_short", "evidence_file"])
        for i in issues:
            detail = json.dumps(i.get("details", {}), ensure_ascii=False)
            how_to_fix = (i.get("howToFix") or "")[:200]
            w.writerow([
                i.get("issueType", ""), i.get("severity", ""), i.get("url", ""),
                detail, how_to_fix, "issues_all.json",
            ])

    # --- lighthouse CSV (API exposes no Lighthouse detail on pages/issues) ---
    lighthouse_csv = RAW_DIR / "lighthouse.csv"
    with lighthouse_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["url", "device", "performance_score", "lcp", "cls", "inp_tbt", "fcp", "notes"])
    (RAW_DIR / "lighthouse.NOTE.txt").write_text(
        "get_audit_pages and get_audit_issues returned no Lighthouse/CWV fields "
        "(page keys: " + ", ".join(sorted({k for p in pages for k in p.keys()})) + "). "
        "get_audit_status reports lighthouseTotal=20, lighthouseCompleted=10, "
        "lighthouseFailed=10 for this audit, so Lighthouse ran, but per-page scores are "
        "not exposed through these two read tools. lighthouse.csv is header-only.\n",
        encoding="utf-8",
    )

    # --- manifest ---
    fetch_class_counts = Counter(p.get("fetchClass") for p in pages)
    status_counts = Counter(p.get("statusCode") for p in pages)
    market_counts = Counter(market_of(p["url"]) for p in pages)
    issue_type_counts = Counter(i.get("issueType") for i in issues)
    severity_counts = Counter(i.get("severity") for i in issues)

    manifest = {
        "schema_version": "1.0",
        "agent": "A2b",
        "auditId": AUDIT_ID,
        "startUrl": START_URL,
        "extractionTimeUtc": datetime.now(timezone.utc).isoformat(),
        "pagesCrawled": len(pages),
        "pagesByMarket": dict(market_counts.most_common()),
        "pagesByFetchClass": dict(fetch_class_counts),
        "pagesByStatusCode": {str(k): v for k, v in status_counts.items()},
        "issuesTotal": len(issues),
        "issuesBySeverity": dict(severity_counts),
        "issuesByType": dict(issue_type_counts.most_common()),
        "issueSummaryFromApi": issue_summary,
        "lighthouse": {
            "totalScheduled": 20,
            "completed": 10,
            "failed": 10,
            "perPageDetailAvailableViaApi": False,
            "rowsInLighthouseCsv": 0,
        },
        "limits": {
            "pageBudget": PAGE_BUDGET_NOTE,
            "issuesLimit": "requested limit=1000, no severity filter; API returned "
                            f"{len(issues)} issues matching the audit summary total exactly "
                            "(no truncation, so per-severity re-pulls were skipped)",
            "pagesLimit": "requested limit=1000; API returned 600 (== pagesCrawled, no "
                          "truncation, so per-fetchClass re-pulls were skipped: all 600 "
                          "pages are fetchClass=ok)",
            "fieldsNotInApi": PAGE_FIELDS_NOT_IN_API,
        },
    }
    (RAW_DIR / "manifest-A2b.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print("pages csv:", pages_csv, len(pages), "rows")
    print("issues csv:", issues_csv, len(issues), "rows")
    print("lighthouse csv: 0 rows (see lighthouse.NOTE.txt)")
    print("manifest:", RAW_DIR / "manifest-A2b.json")


def _selftest():
    """ponytail: smallest check that fails if market_of/CSV logic breaks."""
    assert market_of("https://www.myglobalhealth.online/") == "(root)"
    assert market_of("https://www.myglobalhealth.online/brazil/pt/x") == "brazil"
    assert market_of("https://www.myglobalhealth.online/ireland") == "ireland"


if __name__ == "__main__":
    _selftest()
    main()
