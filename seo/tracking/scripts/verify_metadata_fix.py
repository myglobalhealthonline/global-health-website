"""Re-probe the 2026-09-15 OpenSEO metadata issues on production.

Reads the audit export, GETs each flagged URL (<=4 req/s), measures the served
<title> and <meta name="description"> with lxml, and writes
seo/tracking/data/metadata_fix_verification.csv.

Usage (from repo root, after deploy):  python seo/tracking/scripts/verify_metadata_fix.py
"""
import csv
import json
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

from lxml import html

ROOT = Path(__file__).resolve().parents[3]
EXPORT = ROOT / "seo/tracking/raw/2026-09-15/A2-probe/openseo-audit/audit-issues-export-2026-09-15.json"
OUT = ROOT / "seo/tracking/data/metadata_fix_verification.csv"
UA = "Mozilla/5.0 (compatible; GlobalHealthAudit/1.0)"
TITLE_MAX, DESC_MIN, DESC_MAX = 60, 70, 160


def fetch(url):
    started = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r:
            doc = html.fromstring(r.read())
        title = doc.findtext(".//title") or ""
        desc = (doc.xpath('//meta[@name="description"]/@content') or [""])[0]
        robots = (doc.xpath('//meta[@name="robots"]/@content') or [""])[0]
        words = len(" ".join(doc.xpath("//body//text()[not(ancestor::script) and not(ancestor::style)]")).split())
        page = {"title": title, "desc": desc, "robots": robots, "words": words}
    except Exception as exc:  # recorded as unresolved, never raised
        page = {"error": str(exc)[:80]}
    time.sleep(max(0.0, 0.25 - (time.time() - started)))
    return page


def main():
    issues = json.loads(EXPORT.read_text(encoding="utf-8"))
    pages = {url: fetch(url) for url in sorted({i["url"] for i in issues})}

    groups = defaultdict(set)  # served value -> urls, for the duplicate checks
    for url, page in pages.items():
        groups[("title", page.get("title"))].add(url)
        groups[("desc", page.get("desc"))].add(url)

    rows = []
    for issue in issues:
        page, kind, det = pages[issue["url"]], issue["issueType"], issue["details"]
        before = det.get("length", det.get("groupSize", det.get("wordCount", "")))
        title, desc = page.get("title", ""), page.get("desc", "")
        if "error" in page:
            after, resolved = page["error"], False
        elif kind == "title-too-long":
            after, resolved = len(title), len(title) <= TITLE_MAX
        elif kind == "meta-description-too-long":
            after, resolved = len(desc), len(desc) <= DESC_MAX
        elif kind == "meta-description-too-short":
            after, resolved = len(desc), DESC_MIN <= len(desc) <= DESC_MAX or "no-change-by-design"
        elif kind == "duplicate-title":
            same = groups[("title", title)]
            after, resolved = len(same), not same.intersection(det.get("otherUrls", []))
        elif kind == "duplicate-meta-description":
            same = groups[("desc", desc)]
            after, resolved = len(same), not same.intersection(det.get("otherUrls", []))
        elif kind == "noindex-page":
            after, resolved = page["robots"], "no-change-by-design"
        else:  # thin-content
            after, resolved = page["words"], "no-change-by-design"
        if isinstance(resolved, bool):
            resolved = "yes" if resolved else "no"
        rows.append({"url": issue["url"], "issueType": kind, "before_length": before,
                     "after_length": after, "resolved": resolved})

    with OUT.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["url", "issueType", "before_length", "after_length", "resolved"])
        writer.writeheader()
        writer.writerows(rows)
    summary = defaultdict(lambda: defaultdict(int))
    for row in rows:
        summary[row["issueType"]][row["resolved"]] += 1
    for kind, counts in sorted(summary.items()):
        print(kind, dict(counts))


if __name__ == "__main__":
    main()
