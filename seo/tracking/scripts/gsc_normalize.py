#!/usr/bin/env python
"""Flatten raw OpenSEO get_search_console_performance JSON responses into
the tracker's CSV contract for one of three grains:

  A  ->  26_GSC_Property_Daily  (date [+ search_type from filename/flag])
  B  ->  09_GSC_Page_Daily      (date, page, country, device)
  C  ->  10_GSC_Query_Daily     (date, query, page, country, device)

Dimensions are read from each response's own `dimensions` array (not
assumed), so any subset GSC actually returned is handled. GSC's `type`
(web/image/video/discover/news) is a request parameter, not a dimension -
it never appears in `keys`, so it comes from --search-type or is parsed out
of the filename (e.g. "A_web_...json" -> web).

Usage:
  python gsc_normalize.py --raw-dir <dir> --out <csv> --dataset A|B|C
      [--search-type web] [--refresh-id A14-2026-09-15-01]

De-dupes on row_key, keeping the value from whichever file (sorted by name,
so ..._r0 then ..._r1 etc.) was processed last.
"""
from __future__ import annotations

import argparse
import csv
import glob
import json
import os
import re
import sys
from datetime import datetime, timezone

from manifest import injection_safe, data_state, write_manifest

SEARCH_TYPES = ("web", "image", "video", "news", "googleNews", "discover")

DATASET_COLUMNS = {
    "A": ["date", "search_type", "clicks", "impressions", "avg_position", "ctr",
          "refresh_id", "data_state", "source_timezone", "data_quality", "source"],
    "B": ["date", "url_id", "normalized_url", "target_country", "language",
          "searcher_country", "device", "search_type", "clicks", "impressions",
          "avg_position", "ctr", "row_key", "refresh_id", "data_state",
          "source_timezone", "data_quality", "source"],
    "C": ["date", "query", "url_id", "normalized_url", "target_country", "language",
          "searcher_country", "device", "search_type", "clicks", "impressions",
          "avg_position", "ctr", "brand_class", "taxonomy_version", "row_key",
          "refresh_id", "data_quality", "source"],
}


def guess_search_type(filename: str, override: str | None) -> tuple[str, bool]:
    """Returns (search_type, was_defaulted)."""
    if override:
        return override, False
    base = os.path.basename(filename)
    for st in SEARCH_TYPES:
        if re.search(rf"(?:^|[_\-/]){st}(?:[_\-/.]|$)", base, re.IGNORECASE):
            return st.lower(), False
    return "web", True


def row_key_for(dataset: str, fields: dict) -> str:
    if dataset == "A":
        parts = [fields["date"], fields["search_type"]]
    elif dataset == "B":
        parts = [fields["date"], fields["normalized_url"], fields["searcher_country"],
                  fields["device"], fields["search_type"]]
    else:  # C
        parts = [fields["date"], fields["query"], fields["normalized_url"],
                  fields["searcher_country"], fields["device"], fields["search_type"]]
    return "|".join(parts)


def flatten_file(path: str, dataset: str, search_type_override: str | None) -> tuple[list[dict], list[str]]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    dims = payload.get("dimensions") or []
    rows = payload.get("rows") or []
    search_type, defaulted = guess_search_type(path, search_type_override)
    notes = []
    if defaulted:
        notes.append(f"search_type defaulted to '{search_type}' (not in filename or --search-type)")

    out_rows = []
    for r in rows:
        keys = r.get("keys") or []
        by_dim = dict(zip(dims, keys))
        date = by_dim.get("date")
        if not date:
            notes.append("row skipped: no 'date' dimension in response (not daily grain)")
            continue

        row_notes = list(notes)
        position = r.get("position")
        if position is None:
            if search_type == "discover":
                row_notes.append("position blank for discover")
            else:
                row_notes.append("position missing from source row")

        fields = {
            "date": date,
            "search_type": search_type,
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "avg_position": position if position is not None else "",
            "ctr": r.get("ctr", ""),
        }
        if dataset in ("B", "C"):
            fields.update({
                "url_id": "",
                "normalized_url": by_dim.get("page", ""),
                "target_country": "",
                "language": "",
                "searcher_country": by_dim.get("country", ""),
                "device": (by_dim.get("device") or "").lower(),
            })
            if not fields["normalized_url"]:
                row_notes.append("normalized_url missing: 'page' dimension not in response")
            row_notes.append("url_id/target_country/language unresolved (join 04_Page_Inventory separately)")
        if dataset == "C":
            fields["query"] = by_dim.get("query", "")
            fields["brand_class"] = ""
            fields["taxonomy_version"] = ""
            if not fields["query"]:
                row_notes.append("query missing: 'query' dimension not in response")

        if dataset in ("B", "C"):
            fields["row_key"] = row_key_for(dataset, fields)

        fields["data_quality"] = "; ".join(dict.fromkeys(row_notes))  # de-dup, keep order
        out_rows.append(fields)

    site_url = payload.get("siteUrl", "")
    source = f"GSC {payload.get('startDate','')}..{payload.get('endDate','')} {site_url} via OpenSEO connector"
    return out_rows, [source]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--dataset", required=True, choices=["A", "B", "C"])
    ap.add_argument("--search-type", default=None)
    ap.add_argument("--refresh-id", default=None)
    args = ap.parse_args()

    refresh_id = args.refresh_id or f"A14-gsc-{args.dataset}-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}"
    files = sorted(glob.glob(os.path.join(args.raw_dir, "**", "*.json"), recursive=True))
    if not files:
        print(f"no JSON files found under {args.raw_dir}", file=sys.stderr)
        sys.exit(1)

    merged: dict[str, dict] = {}
    sources = []
    all_dates = []
    for path in files:
        rows, srcs = flatten_file(path, args.dataset, args.search_type)
        sources.extend(srcs)
        for fields in rows:
            fields["refresh_id"] = refresh_id
            fields["source_timezone"] = "America/Los_Angeles"
            key = fields.get("row_key") or f"{fields['date']}|{fields['search_type']}"
            merged[key] = fields  # later files (sorted, e.g. r0 then r1) win
            all_dates.append(fields["date"])

    if not merged:
        print("no rows produced (empty or malformed raw files)", file=sys.stderr)
        sys.exit(1)

    latest_received = max(all_dates)
    columns = DATASET_COLUMNS[args.dataset]
    for fields in merged.values():
        if "data_state" in columns:
            fields["data_state"] = data_state(fields["date"], latest_received)
        fields["source"] = sources[-1] if sources else ""

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for fields in sorted(merged.values(), key=lambda r: (r["date"], r.get("row_key", ""))):
            safe = {c: injection_safe(fields.get(c, "")) for c in columns}
            writer.writerow(safe)

    write_manifest(
        args.out,
        source="GSC (OpenSEO get_search_console_performance)",
        query_params={"dataset": args.dataset, "search_type": args.search_type, "raw_dir": args.raw_dir},
        grain={"A": "date+search_type", "B": "date+page+country+device", "C": "date+query+page+country+device"}[args.dataset],
        date_range=(min(all_dates), latest_received),
        timezone_name="America/Los_Angeles",
        completeness=f"final beyond 3-day lag from {latest_received}",
        row_count=len(merged),
    )
    print(f"wrote {len(merged)} rows -> {args.out} (refresh_id={refresh_id})")


if __name__ == "__main__":
    main()
