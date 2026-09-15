#!/usr/bin/env python
"""Flatten raw OpenSEO get_google_analytics_organic_landing_pages JSON
responses (one file per day) into the 11_GA4_Landing_Daily CSV contract.

Observed shape (seo/tracking/raw/2026-09-15/A4-ga4/ga4_landing_pages_*.json):
  {request: {reportKind, dimensions, requestedDateRange{start,end}, currencyCode, channel, ...},
   rows: [{hostName, landingPage, sessions, activeUsers, engagedSessions,
           engagementRate, keyEvents, sessionKeyEventRate, transactions,
           purchaseRevenue}, ...]}

Only per-day files (requestedDateRange.startDate == endDate) are daily
grain; window/overview files are skipped with a note. Field names are kept
in one small dict below so a differently-shaped pull only needs an edit
here, not a rewrite.

Usage:
  python ga4_normalize.py --raw-dir <dir> --out <csv>
      [--exclude-ranges 2026-08-02:2026-09-08,...] [--refresh-id ...]

Rows whose date falls inside an excluded (outage) range are written to
<out>.outage.csv instead of <out> - never as zeros in the main file.
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

from manifest import injection_safe, write_manifest

# GA4 raw field -> sheet column. Edit here if a pull returns different names.
FIELD_MAP = {
    "sessions": "sessions",
    "engagedSessions": "engaged_sessions",
    "keyEvents": "key_events",
    "transactions": "purchases",
    "purchaseRevenue": "purchase_revenue",
    "activeUsers": "total_users",
    "sessionKeyEventRate": "session_key_event_rate",
    "engagementRate": "engagement_rate",
}
# Sheet metric columns with no equivalent in this API pull - left blank.
NO_SOURCE_METRIC = ["booking_starts"]

COLUMNS = [
    "date", "url_id", "normalized_landing_url", "target_country", "language",
    "visitor_country", "device", "session_source_medium", "session_channel",
    "sessions", "engaged_sessions", "key_events", "booking_starts", "purchases",
    "purchase_revenue", "currency", "total_users", "session_key_event_rate",
    "engagement_rate", "row_key", "refresh_id", "data_quality", "source",
]


def parse_ranges(spec: str) -> list[tuple[str, str]]:
    out = []
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        start, end = part.split(":")
        out.append((start.strip(), end.strip()))
    return out


def in_excluded(date: str, ranges: list[tuple[str, str]]) -> bool:
    return any(start <= date <= end for start, end in ranges)


def file_date(payload: dict, path: str) -> str | None:
    m = re.search(r"(\d{8})\.json$", os.path.basename(path))
    if m:
        s = m.group(1)
        return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
    dr = (payload.get("request") or {}).get("requestedDateRange") or {}
    start, end = dr.get("startDate"), dr.get("endDate")
    if start and start == end:
        return start
    return None


def is_landing_page_daily_file(payload: dict) -> bool:
    rows = payload.get("rows")
    if not isinstance(rows, list):
        return False
    request = payload.get("request") or {}
    report_kind = request.get("reportKind")
    if report_kind is not None:
        return report_kind == "landing_pages"
    # No reportKind to trust (older/different pull shape): fall back to
    # checking the first row looks like a landing-page row. An empty `rows`
    # with no reportKind can't be classified, so treat it as not-ours.
    return bool(rows) and "landingPage" in rows[0]


def flatten_file(path: str) -> tuple[list[dict], str | None, str | None]:
    """Returns (rows, date, skip_reason). skip_reason is None on success,
    even for a legitimate zero-session day (rows == [])."""
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if not is_landing_page_daily_file(payload):
        return [], None, f"skipped {os.path.basename(path)}: not a per-day landing-pages response"

    date = file_date(payload, path)
    if not date:
        return [], None, f"skipped {os.path.basename(path)}: no single-day date (window/aggregate file)"

    request = payload.get("request") or {}
    dims_present = set(request.get("dimensions") or [])
    currency = request.get("currencyCode", "")
    channel = request.get("channel", "")

    dim_note = ("visitor_country/device/session_source_medium not requested in this pull "
                "(dimensions: " + ",".join(sorted(dims_present)) + ")") if dims_present else \
        "visitor_country/device/session_source_medium not requested in this pull"

    out_rows = []
    for r in payload.get("rows", []):
        host = r.get("hostName", "")
        landing = r.get("landingPage", "")
        normalized = f"https://{host}{landing}" if host else landing

        fields = {
            "date": date,
            "url_id": "",
            "normalized_landing_url": normalized,
            "target_country": "",
            "language": "",
            "visitor_country": "",
            "device": "",
            "session_source_medium": "",
            "session_channel": channel,
            "currency": currency,
        }
        for src_field, col in FIELD_MAP.items():
            fields[col] = r.get(src_field, "")
        for col in NO_SOURCE_METRIC:
            fields[col] = ""

        notes = [dim_note, "booking_starts not available from this metric set"]
        fields["data_quality"] = "; ".join(notes)
        fields["row_key"] = "|".join([
            fields["date"], fields["normalized_landing_url"],
            fields["visitor_country"], fields["device"], fields["session_source_medium"],
        ])
        out_rows.append(fields)

    return out_rows, date, None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--exclude-ranges", default="2026-08-02:2026-09-08")
    ap.add_argument("--refresh-id", default=None)
    args = ap.parse_args()

    refresh_id = args.refresh_id or f"A14-ga4-{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}"
    ranges = parse_ranges(args.exclude_ranges)
    files = sorted(glob.glob(os.path.join(args.raw_dir, "**", "*.json"), recursive=True))
    if not files:
        print(f"no JSON files found under {args.raw_dir}", file=sys.stderr)
        sys.exit(1)

    kept: dict[str, dict] = {}
    outaged: dict[str, dict] = {}
    all_dates = []
    for path in files:
        rows, date, skip_reason = flatten_file(path)
        if skip_reason:
            print(skip_reason, file=sys.stderr)
            continue
        all_dates.append(date)  # counts even a legitimate zero-session day
        source_note = f"GA4 organic landing pages {date} via OpenSEO connector"
        bucket = outaged if in_excluded(date, ranges) else kept
        for fields in rows:
            fields["refresh_id"] = refresh_id
            fields["source"] = source_note
            bucket[fields["row_key"]] = fields  # later files win on key collision

    if not kept and not outaged:
        print("no daily landing-page rows produced", file=sys.stderr)
        sys.exit(1)

    def write_csv(target_path, data: dict):
        os.makedirs(os.path.dirname(os.path.abspath(target_path)) or ".", exist_ok=True)
        with open(target_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=COLUMNS)
            writer.writeheader()
            for fields in sorted(data.values(), key=lambda r: r["row_key"]):
                writer.writerow({c: injection_safe(fields.get(c, "")) for c in COLUMNS})

    write_csv(args.out, kept)
    outage_path = os.path.splitext(args.out)[0] + ".outage.csv"
    if outaged:
        write_csv(outage_path, outaged)

    write_manifest(
        args.out,
        source="GA4 (OpenSEO get_google_analytics_organic_landing_pages)",
        query_params={"raw_dir": args.raw_dir, "exclude_ranges": args.exclude_ranges},
        grain="date+landing_page",
        date_range=(min(all_dates), max(all_dates)) if all_dates else ("", ""),
        timezone_name="property (see 25_Config ga4_last_complete_date / propertyTimeZone in raw response)",
        completeness=f"{len(kept)} in-window rows, {len(outaged)} excluded as outage dates",
        row_count=len(kept),
    )
    print(f"wrote {len(kept)} rows -> {args.out}" + (f", {len(outaged)} outage rows -> {outage_path}" if outaged else "") + f" (refresh_id={refresh_id})")


if __name__ == "__main__":
    main()
