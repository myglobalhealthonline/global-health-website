"""Shared helpers for the tracker refresh scripts: manifest sidecar files,
CSV-injection escaping, and data_state classification.

Not a general framework - three small functions the normalizers import.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

INJECTION_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def injection_safe(value):
    """Prefix a string with a single quote if it would be read as a formula
    or control sequence by Excel/CSV. Non-strings pass through unchanged."""
    if isinstance(value, str) and value.startswith(INJECTION_PREFIXES):
        return "'" + value
    return value


def data_state(date_str: str, latest_received: str, final_lag_days: int = 3) -> str:
    """'final' once a date is at least `final_lag_days` behind the latest
    date seen in this pull, else 'incomplete'."""
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    latest = datetime.strptime(latest_received, "%Y-%m-%d").date()
    return "final" if (latest - d).days >= final_lag_days else "incomplete"


def write_manifest(
    out_path: str,
    *,
    source: str,
    query_params: dict,
    grain: str,
    date_range: tuple,
    timezone_name: str,
    completeness: str,
    row_count: int,
    schema_version: str = "1.0",
    extraction_time: str | None = None,
) -> str:
    """Write <out_path>.manifest.json next to a normalized CSV. Returns the
    manifest path."""
    manifest = {
        "source": source,
        "query_params": query_params,
        "grain": grain,
        "date_range": {"start": date_range[0], "end": date_range[1]},
        "timezone": timezone_name,
        "extraction_time_utc": extraction_time or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "completeness": completeness,
        "row_count": row_count,
        "schema_version": schema_version,
    }
    manifest_path = out_path + ".manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    return manifest_path
