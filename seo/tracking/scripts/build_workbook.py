#!/usr/bin/env python
"""Idempotent builder for seo/tracking/Global_Health_SEO_Tracker.xlsx.

Always starts from a fresh copy of seo/Global_Health_SEO_Tracker_Starter.xlsx
(the starter is never edited) and populates every sheet from
seo/tracking/data/*.csv and seo/tracking/raw/2026-09-15/*.

Run: python seo/tracking/scripts/build_workbook.py
"""
import csv
import json
import math
import os
import re
import shutil
import sys
import time
from datetime import datetime, date

import numpy as np
import pandas as pd
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SEO = os.path.join(ROOT, "seo")
TRACKING = os.path.join(SEO, "tracking")
DATA = os.path.join(TRACKING, "data")
RAW = os.path.join(TRACKING, "raw", "2026-09-15")
STARTER = os.path.join(SEO, "Global_Health_SEO_Tracker_Starter.xlsx")
OUT = os.path.join(TRACKING, "Global_Health_SEO_Tracker.xlsx")
BUILD_LOG_DIR = os.path.join(RAW, "A10-workbook")
DOMAIN_PREFIXES = ("https://www.myglobalhealth.online", "https://myglobalhealth.online")

ROW_COUNTS = {}  # sheet name -> data row count, filled in as we go, used for build-log

# ---------------------------------------------------------------------------
# generic helpers
# ---------------------------------------------------------------------------

INJECTION_PREFIX = ("=", "+", "-", "@", "\t", "\r")


def injection_safe(v):
    if isinstance(v, str) and v and v[0] in INJECTION_PREFIX:
        return "'" + v
    return v


def clean_val(v):
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, (np.floating,)):
        v = float(v)
        return None if math.isnan(v) else v
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, pd.Timestamp):
        if pd.isna(v):
            return None
        v = v.to_pydatetime()
        if v.tzinfo is not None:
            v = v.replace(tzinfo=None)
        return v
    if isinstance(v, datetime) and v.tzinfo is not None:
        return v.replace(tzinfo=None)
    if isinstance(v, str):
        s = v.strip()
        if s == "" or s.lower() == "nan":
            return None
        return injection_safe(s)
    return v


CELL_REF_RE = re.compile(r"(?<![A-Za-z0-9_])(\$?[A-Za-z]{1,3}\$?)(\d+)(?![A-Za-z0-9_])")


def shift_formula(tmpl, from_row, to_row):
    if tmpl is None or to_row == from_row:
        return tmpl

    def repl(m):
        col, row = m.group(1), m.group(2)
        if int(row) == from_row:
            return f"{col}{to_row}"
        return m.group(0)

    return CELL_REF_RE.sub(repl, tmpl)


def sheet_headers(ws):
    return [ws.cell(row=5, column=c).value for c in range(1, ws.max_column + 1)]


def clear_rows(ws, start_row, end_row, ncols):
    for r in range(start_row, end_row + 1):
        for c in range(1, ncols + 1):
            ws.cell(row=r, column=c).value = None


DATE_ONLY_HINTS = ("date", "window_start", "window_end", "month_start", "due_date",
                    "first_seen", "last_seen", "sitemap_lastmod")
PCT_HINTS = ("ctr", "rate", "share", "_pct", "indexed_share")
INT_HINTS = ("clicks", "impressions", "sessions", "users", "count", "hops", "events",
             "word_count", "links", "pages", "urls", "hits", "credits", "rows", "domains")
MONEY_HINTS = ("revenue", "value", "authority_metric")


def guess_format(colname, dtype_is_datetime, has_time):
    name = (colname or "").lower()
    if dtype_is_datetime:
        return "yyyy-mm-dd hh:mm" if has_time else "yyyy-mm-dd"
    if any(h in name for h in PCT_HINTS):
        return "0.00%"
    if any(h in name for h in MONEY_HINTS):
        return "#,##0.00"
    if any(h in name for h in INT_HINTS):
        return "#,##0"
    return None


def write_sheet(wb, sheet_name, df, start_row=6, formula_cols=None, clear_first=False,
                 extra_rows=0):
    """Write a DataFrame into a sheet by matching column NAMES to the sheet's row-5
    header. Extra df columns not in the header are appended at the right (and the
    sheet header row + table ref grow to include them). formula_cols: {header_name:
    row6 formula template} - written as a shifted formula instead of the df value.
    Returns (last_row_written, new_columns_added[list of names])."""
    ws = wb[sheet_name]
    formula_cols = formula_cols or {}
    headers = sheet_headers(ws)
    new_cols = [c for c in df.columns if c not in headers]
    for nc in new_cols:
        headers.append(nc)
        col_idx = len(headers)
        ws.cell(row=5, column=col_idx, value=nc)
    if new_cols and ws.tables:
        # keep the openpyxl Table object's tableColumns in sync - Table.ref alone
        # does NOT regenerate tableColumns, and a ref wider than the declared
        # column count is invalid OOXML that Excel refuses to open (even though
        # openpyxl itself does not validate this on save).
        from openpyxl.worksheet.table import TableColumn
        tbl = ws.tables[list(ws.tables.keys())[0]]
        next_id = len(tbl.tableColumns) + 1
        for nc in new_cols:
            tbl.tableColumns.append(TableColumn(id=next_id, name=str(nc)))
            next_id += 1
    ncols = len(headers)
    nrows = len(df)
    last_row = start_row + nrows - 1 if nrows else start_row - 1

    if clear_first:
        old_ref = ws.tables[list(ws.tables.keys())[0]].ref
        old_last = int(re.search(r"\d+$", old_ref).group())
        clear_rows(ws, start_row, max(old_last, last_row) + extra_rows, ncols)

    sub = df.reindex(columns=headers)
    # date typing + collect format hints
    col_formats = {}
    for h in headers:
        if h in formula_cols:
            continue
        s = sub[h]
        is_dt = False
        has_time = False
        if h and any(hint == h.lower() or hint in h.lower() for hint in DATE_ONLY_HINTS) or \
           (h and (h.lower().endswith("_at") or h.lower() == "checked_at" or h.lower() == "observed_at"
                   or h.lower() == "last_checked" or h.lower() == "last_crawl_time"
                   or h.lower() == "inspected_at" or h.lower() == "extraction_utc"
                   or h.lower() == "started_at")):
            if s.notna().any():
                try:
                    parsed = pd.to_datetime(s, errors="coerce", utc=False, format="mixed")
                except ValueError:
                    parsed = pd.to_datetime(s, errors="coerce", utc=True, format="mixed")
            else:
                parsed = s
            if hasattr(parsed, "dt") and getattr(parsed.dt, "tz", None) is not None:
                parsed = parsed.dt.tz_localize(None)
            ok_ratio = parsed.notna().sum() / max(1, s.notna().sum())
            if ok_ratio > 0.85:
                sub[h] = parsed
                is_dt = True
                nonmidnight = parsed.dropna().apply(lambda x: x.time() != datetime.min.time())
                has_time = bool(nonmidnight.any())
        fmt = guess_format(h, is_dt, has_time)
        if fmt:
            col_formats[h] = fmt

    rows = sub.values.tolist()
    for r_off, row in enumerate(rows):
        r = start_row + r_off
        for c_idx, h in enumerate(headers):
            cell = ws.cell(row=r, column=c_idx + 1)
            if h in formula_cols:
                cell.value = shift_formula(formula_cols[h], 6, r)
            else:
                cell.value = clean_val(row[c_idx])
            if h in col_formats and not (h in formula_cols):
                cell.number_format = col_formats[h]
    return last_row, new_cols, col_formats


def resize_table_and_format(wb, sheet_name, last_row, extra_widths=None):
    ws = wb[sheet_name]
    tname = list(ws.tables.keys())[0]
    tbl = ws.tables[tname]
    ncols = ws.max_column
    last_row = max(last_row, 6)
    tbl.ref = f"A5:{get_column_letter(ncols)}{last_row}"
    ws.freeze_panes = "A6"
    headers = sheet_headers(ws)
    for c_idx, h in enumerate(headers, start=1):
        letter = get_column_letter(c_idx)
        base = len(str(h)) if h else 8
        width = min(60, max(10, base + 4))
        if h and any(k in h.lower() for k in ("url", "evidence", "description", "finding",
                                               "definition", "title", "notes", "instructions",
                                               "recommend", "root_cause", "proposed_fix")):
            width = 50
        ws.column_dimensions[letter].width = width


STATUS_LIKE_HINTS = ("status", "priority", "classification", "verdict", "approval_needed",
                      "inventory_state", "technical_status", "content_status", "coverage_state",
                      "indexability", "brand_class")


def apply_validation_lists(wb, sheet_name, df, last_row):
    ws = wb[sheet_name]
    headers = sheet_headers(ws)
    for c_idx, h in enumerate(headers, start=1):
        if not h:
            continue
        hl = h.lower()
        if not any(k in hl for k in STATUS_LIKE_HINTS):
            continue
        if h not in df.columns:
            continue
        vals = sorted({str(v) for v in df[h].dropna().unique() if str(v).strip()})
        if not (1 < len(vals) <= 20):
            continue
        joined = ",".join(vals)
        if len(joined) > 250:
            continue
        letter = get_column_letter(c_idx)
        dv = DataValidation(type="list", formula1=f'"{joined}"', allow_blank=True, showErrorMessage=False)
        ws.add_data_validation(dv)
        dv.add(f"{letter}6:{letter}{max(last_row, 6)}")


def find_url_id_maps(pinv):
    """Build lookup dicts from page_inventory for joining other sources by URL."""
    full = {}
    path = {}
    for _, r in pinv.iterrows():
        rec = {"url_id": r["url_id"], "target_country": r["target_country"], "language": r["language"]}
        nu = str(r.get("normalized_url") or "")
        ru = str(r.get("raw_url") or "")
        for u in (nu, ru):
            if not u or u == "nan":
                continue
            full[u] = rec
            full[u.rstrip("/")] = rec
            p = u
            for pref in DOMAIN_PREFIXES:
                if p.startswith(pref):
                    p = p[len(pref):]
                    break
            if not p:
                p = "/"
            path[p] = rec
            path[p.rstrip("/") or "/"] = rec
    return full, path


def lookup_url(u, full_map, path_map):
    if u is None:
        return None
    u = str(u)
    if u in full_map:
        return full_map[u]
    if u.rstrip("/") in full_map:
        return full_map[u.rstrip("/")]
    if u in path_map:
        return path_map[u]
    if u.rstrip("/") in path_map:
        return path_map[u.rstrip("/")]
    # strip query string and retry once
    base = u.split("?", 1)[0]
    if base != u:
        return lookup_url(base, full_map, path_map)
    return None


def read_csv(name, **kw):
    return pd.read_csv(os.path.join(DATA, name), **kw)


NEW_DICT_ENTRIES = []


def add_dict(sheet, field, definition, type_, grain, agg, missing_rule):
    NEW_DICT_ENTRIES.append((sheet, field, definition, type_, grain, agg, missing_rule))


def log(msg):
    print(f"[build] {msg}", flush=True)


def finish_sheet(wb, sheet_name, df, last_row, extra_new_cols=None):
    resize_table_and_format(wb, sheet_name, last_row)
    apply_validation_lists(wb, sheet_name, df, last_row)
    ROW_COUNTS[sheet_name] = max(0, last_row - 5)
    log(f"{sheet_name}: {ROW_COUNTS[sheet_name]} data rows")


# ---------------------------------------------------------------------------
# 02 Markets & Locales
# ---------------------------------------------------------------------------

def build_02(wb, locale_qa):
    df = read_csv(os.path.join("..", "raw", "2026-09-15", "A1-inventory", "markets_locales.csv"))
    df["market_locale_key"] = df["market_locale_key"].str.replace("-", "|", regex=False)
    df["is_default"] = df["is_default"].str.capitalize()
    qa_map = {r["market_locale_key"].replace("-", "|"): r for _, r in locale_qa.iterrows()}

    def verif(row):
        key = row["market_locale_key"]
        qa = qa_map.get(key)
        if qa is None:
            return "Configured; publication unverified"
        enabled = str(qa.get("runtime_enabled", "")).lower() == "yes"
        hreflang_ok = str(qa.get("hreflang_check", "")).lower() == "pass"
        if enabled and hreflang_ok:
            return "Verified; runtime confirmed 2026-09-15"
        if enabled:
            return "Partially verified; runtime enabled, hreflang unconfirmed"
        return "Configured; publication unverified"

    df["verification_state"] = df.apply(verif, axis=1)
    df["source_url"] = ("https://github.com/myglobalhealthonline/global-health-website/blob/"
                         "main/frontend/data/countries.ts")
    df = df.drop(columns=["source_file_line"], errors="ignore")
    last_row, new_cols, _ = write_sheet(wb, "02_Markets_Locales", df, clear_first=True)
    for c in new_cols:
        add_dict("02_Markets_Locales", c, f"Imported from markets_locales.csv ({c}).",
                  "Text", "Configured market x language", "Dimension; do not sum",
                  "Blank + note; never invented")
    finish_sheet(wb, "02_Markets_Locales", df, last_row)


# ---------------------------------------------------------------------------
# 03 Data Access
# ---------------------------------------------------------------------------

def build_03(wb):
    df = read_csv(os.path.join("..", "raw", "2026-09-15", "A0-access", "data_access_2026-09-15.csv"))
    last_row, new_cols, _ = write_sheet(wb, "03_Data_Access", df, clear_first=True)
    finish_sheet(wb, "03_Data_Access", df, last_row)


# ---------------------------------------------------------------------------
# 04 Page Inventory
# ---------------------------------------------------------------------------

def build_04(wb, pinv, crawl_hist, url_insp, content_review):
    df = pinv.copy()
    df["documented_url"] = df["raw_url"]

    # verified_canonical_url: canonical from crawl_history when final_status==200
    ch_ok = crawl_hist[crawl_hist["final_status"] == 200].sort_values("checked_at").drop_duplicates(
        "url_id", keep="last")
    canon_map = dict(zip(ch_ok["url_id"], ch_ok["canonical"]))
    df["verified_canonical_url"] = df["url_id"].map(canon_map)

    # audit_state pipe-joined
    probed_ids = set(crawl_hist["url_id"].unique())
    rendered_urls = {"/", "/ireland/en", "/portugal/pt/doctors", "/czechia/cs",
                      "/brazil/pt/pricing", "/ireland/en/book",
                      "/spain/es/services/consulta-medica-online"}

    def path_of(u):
        u = str(u)
        for pref in DOMAIN_PREFIXES:
            if u.startswith(pref):
                return u[len(pref):] or "/"
        return u

    insp_urls = set(url_insp["url"].astype(str))
    cr_ids = set(content_review["url_id"].astype(str)) if content_review is not None and len(content_review) else set()

    def audit_state(row):
        parts = []
        if row["url_id"] in probed_ids:
            parts.append("Live-tested")
        if path_of(row["raw_url"]) in rendered_urls:
            parts.append("Rendered")
        if str(row["raw_url"]) in insp_urls or str(row["normalized_url"]) in insp_urls:
            parts.append("Inspected")
        if row["url_id"] in cr_ids:
            parts.append("Content-reviewed")
        return "|".join(parts) if parts else "Not checked"

    df["audit_state"] = df.apply(audit_state, axis=1)

    # actual_indexability from crawl_history.indexability (latest)
    idx_map = dict(zip(ch_ok["url_id"], ch_ok["indexability"]))
    idx_map_any = dict(zip(crawl_hist.sort_values("checked_at")["url_id"],
                            crawl_hist.sort_values("checked_at")["indexability"]))
    df["actual_indexability"] = df["url_id"].map(idx_map).fillna(df["url_id"].map(idx_map_any))

    # last_checked = probe checked_at (latest per url_id)
    lc_map = dict(zip(crawl_hist.sort_values("checked_at")["url_id"],
                       crawl_hist.sort_values("checked_at")["checked_at"]))
    df["last_checked"] = df["url_id"].map(lc_map)

    # primary_keyword: keyword_map owner_url highest volume, else top query by impressions in gsc_query_page_W1
    kw = read_csv("keyword_map.csv")
    full_map, path_map = find_url_id_maps(pinv)
    kw = kw.dropna(subset=["owner_url"]).copy()
    kw["url_id"] = kw["owner_url"].apply(lambda u: (lookup_url(u, full_map, path_map) or {}).get("url_id"))
    kw = kw.dropna(subset=["url_id"]).sort_values("volume_estimate", ascending=False)
    kw_top = kw.drop_duplicates("url_id", keep="first")
    kw_map = dict(zip(kw_top["url_id"], kw_top["query"]))

    qpw1 = read_csv("gsc_query_page_W1.csv")
    qpw1["url_id"] = qpw1["page"].apply(lambda u: (lookup_url(u, full_map, path_map) or {}).get("url_id"))
    qpw1 = qpw1.dropna(subset=["url_id"]).sort_values("impressions", ascending=False)
    qpw1_top = qpw1.drop_duplicates("url_id", keep="first")
    qpw1_map = dict(zip(qpw1_top["url_id"], qpw1_top["query"]))

    df["primary_keyword"] = df["url_id"].map(kw_map)
    df["primary_keyword"] = df["primary_keyword"].fillna(df["url_id"].map(qpw1_map))
    df["owner"] = None

    # evidence_url: text/html evidence path from crawl_history
    ev_map = dict(zip(ch_ok["url_id"], ch_ok["evidence"]))
    df["evidence_url"] = df["url_id"].map(ev_map)
    df["evidence_url"] = df["evidence_url"].fillna(
        "https://github.com/myglobalhealthonline/global-health-website/blob/main/seo/README.md")

    # extra columns
    df["in_sitemap"] = df["in_sitemap"]
    gpd = read_csv("gsc_page_daily.csv")
    gpd["url_id"] = gpd["page"].apply(lambda u: (lookup_url(u, full_map, path_map) or {}).get("url_id"))
    gpd_m = gpd.dropna(subset=["url_id"])
    W1 = (gpd_m["date"] >= "2026-08-15") & (gpd_m["date"] <= "2026-09-11")
    W0 = (gpd_m["date"] >= "2026-07-18") & (gpd_m["date"] <= "2026-08-14")
    g1 = gpd_m[W1].groupby("url_id").agg(gsc_impressions_W1=("impressions", "sum"),
                                          gsc_clicks_W1=("clicks", "sum"))
    g0 = gpd_m[W0].groupby("url_id").agg(gsc_impressions_W0=("impressions", "sum"),
                                          gsc_clicks_W0=("clicks", "sum"))
    df = df.merge(g1, on="url_id", how="left").merge(g0, on="url_id", how="left")

    ui = url_insp.copy()
    ui["url_id"] = ui["url"].apply(lambda u: (lookup_url(u, full_map, path_map) or {}).get("url_id"))
    ui = ui.dropna(subset=["url_id"]).sort_values("inspected_at").drop_duplicates("url_id", keep="last")
    cov_map = dict(zip(ui["url_id"], ui["coverage_state"]))
    lastcrawl_map = dict(zip(ui["url_id"], ui["last_crawl_time"]))
    df["coverage_state"] = df["url_id"].map(cov_map)
    df["last_crawl_time"] = df["url_id"].map(lastcrawl_map)

    def tech_status(row):
        st = idx_map_any.get(row["url_id"])
        chrow = ch_ok[ch_ok["url_id"] == row["url_id"]]
        if row["url_id"] not in probed_ids:
            return None
        fs = chrow["final_status"].iloc[0] if len(chrow) else None
        if fs == 200:
            if st == "noindex":
                return "noindex"
            return "ok"
        latest = crawl_hist[crawl_hist["url_id"] == row["url_id"]].sort_values("checked_at").iloc[-1]
        hops = latest.get("redirect_hops") or 0
        if latest.get("soft_404_signal") == "yes":
            return "soft404"
        if hops and hops > 0:
            return "redirect"
        return "non-200"

    df["technical_status"] = df.apply(tech_status, axis=1)

    if content_review is not None and len(content_review):
        cr_class = dict(zip(content_review["url_id"], content_review.get("classification", pd.Series(dtype=object))))
        cr_rec = dict(zip(content_review["url_id"], content_review.get("recommended_action", pd.Series(dtype=object))))
        df["content_status"] = df["url_id"].map(cr_class)
        df["recommendation"] = df["url_id"].map(cr_rec)
    else:
        df["content_status"] = None
        df["recommendation"] = None

    df["next_measurement_date"] = df["recommendation"].apply(
        lambda x: date(2026, 10, 13) if isinstance(x, str) and x.strip() else None)

    df["inventory_state"] = pinv["inventory_state"]
    df["discovery_sources"] = pinv["discovery_sources"]

    order_extra = ["inventory_state", "in_sitemap", "sitemap_lastmod", "discovery_sources",
                    "gsc_impressions_W1", "gsc_clicks_W1", "gsc_impressions_W0", "gsc_clicks_W0",
                    "coverage_state", "last_crawl_time", "technical_status", "content_status",
                    "recommendation", "next_measurement_date"]
    for c in order_extra:
        if c not in df.columns:
            df[c] = None

    df["impressions_change_pct"] = None  # written as formula below, placeholder to reserve column position

    keep_cols = (["url_id", "content_entity_id", "documented_url", "verified_canonical_url",
                  "target_country", "language", "locale_tag", "page_type", "discovery_source" if "discovery_source" in df.columns else None,
                  "inventory_state", "audit_state", "first_published", "source_file_or_model",
                  "expected_indexability", "actual_indexability", "primary_keyword", "owner",
                  "last_checked", "evidence_url"])
    df["discovery_source"] = pinv.get("discovery_sources")

    last_row, new_cols, _ = write_sheet(wb, "04_Page_Inventory", df, clear_first=True)
    ws = wb["04_Page_Inventory"]
    headers = sheet_headers(ws)
    impr_col = headers.index("impressions_change_pct") + 1
    w1_col = get_column_letter(headers.index("gsc_impressions_W1") + 1)
    w0_col = get_column_letter(headers.index("gsc_impressions_W0") + 1)
    for r_off in range(len(df)):
        r = 6 + r_off
        ws.cell(row=r, column=impr_col).value = (
            f'=IFERROR(IF(OR({w0_col}{r}="",{w0_col}{r}=0),"n/a",({w1_col}{r}-{w0_col}{r})/{w0_col}{r}),"n/a")')
        ws.cell(row=r, column=impr_col).number_format = "0.00%"

    for c in ["inventory_state", "in_sitemap", "sitemap_lastmod", "discovery_sources",
              "gsc_impressions_W1", "gsc_clicks_W1", "gsc_impressions_W0", "gsc_clicks_W0",
              "impressions_change_pct", "coverage_state", "last_crawl_time", "technical_status",
              "content_status", "recommendation", "next_measurement_date"]:
        add_dict("04_Page_Inventory", c, f"Extra column added by A10 build: {c}.", "Text/Number",
                  "One row per url_id", "Dimension or W1/W0 sums; not for arbitrary re-summation",
                  "Blank when source has no match; never invented zero")
    finish_sheet(wb, "04_Page_Inventory", df, last_row)
    return df


# ---------------------------------------------------------------------------
# 05 Technical QA
# ---------------------------------------------------------------------------

def build_05(wb):
    df = read_csv("technical_qa.csv")
    extra = [
        dict(check_id="QA-068", area="Feature flags", check="Reconcile per-market feature flags "
             "(health-tests, specialist-consultations, online-prescriptions, subscriptions) with "
             "route status and sitemap listing (24 probes, feature_route_matrix.csv)",
             scope="6 markets x 4 features", status="fail",
             tested_count=24, affected_count=1,
             evidence="feature_route_matrix.csv; orchestrator-correction-2026-09-15.md corrects the "
                       "5 online-prescriptions FAILs (deliberate SEO-RX-001 redirect, not a flag bug) "
                       "and the doctor cross-market redirect FAIL (307 noindex redirect, working as "
                       "intended). One real defect remains: Ireland lab-tests (flag off, 404, "
                       "see incident-ireland-lab-tests-404-2026-09-15.md).",
             owner=None),
        dict(check_id="QA-069", area="Technical implementation", check="seo-live-urls existing test suite",
             scope="9 test cases", status="fail", tested_count=9, affected_count=2,
             evidence="seo-live-urls-test-2026-09-15.txt: 7 passed / 2 failed", owner=None),
        dict(check_id="QA-070", area="Data and rendering", check="Rendered-DOM checks via Claude Browser "
             "on 5 representative pages (/, /ireland/en, /portugal/pt/doctors, /czechia/cs, "
             "/brazil/pt/pricing)", scope="5 pages", status="pass with notes",
             tested_count=5, affected_count=0,
             evidence="No console errors; gtag/Clarity/Pixel correctly gated behind consent "
                       "(not loaded pre-consent). Mobile: no horizontal overflow, viewport meta "
                       "present, but 11 tap targets <24px and min font 10px on the Spain service "
                       "page, and the cookie dialog covers the mobile fold.", owner=None),
        dict(check_id="QA-071", area="Coverage", check="OpenSEO full-site crawl + issue scan",
             scope="600 pages", status="pass with notes", tested_count=600, affected_count=323,
             evidence="0 critical, 150 long meta descriptions, 117 long titles, 23 noindex, "
                       "20 duplicate descriptions, 8 duplicate titles. Lighthouse per-page scores "
                       "not exposed by the API (get_audit_pages/get_audit_issues). "
                       "openseo_audit_issues.csv", owner=None),
    ]
    df = pd.concat([df, pd.DataFrame(extra)], ignore_index=True)
    last_row, new_cols, _ = write_sheet(wb, "05_Technical_QA", df, clear_first=True, extra_rows=30)
    finish_sheet(wb, "05_Technical_QA", df, last_row)


# ---------------------------------------------------------------------------
# 06 Locale Data QA
# ---------------------------------------------------------------------------

def build_06(wb, locale_qa):
    df = locale_qa.copy()
    last_row, new_cols, _ = write_sheet(wb, "06_Locale_Data_QA", df, clear_first=True)
    for c in new_cols:
        add_dict("06_Locale_Data_QA", c, f"Imported from locale_data_qa.csv ({c}).", "Text",
                  "One row per market_locale_key", "Dimension; do not sum",
                  "Blank + note; never invented")
    finish_sheet(wb, "06_Locale_Data_QA", df, last_row)


# ---------------------------------------------------------------------------
# 07 Hreflang
# ---------------------------------------------------------------------------

def build_07(wb):
    df = read_csv("hreflang_edges.csv")
    last_row, new_cols, _ = write_sheet(wb, "07_Hreflang", df)
    for c in new_cols:
        add_dict("07_Hreflang", c, "HTTP status of the alternate URL on its FIRST check today, "
                  "before any same-day re-probe/fix pass (compare against alternate_status, the "
                  "latest).", "Number", "One row per source/alternate edge, per check", "Dimension",
                  "Blank if not available")
    finish_sheet(wb, "07_Hreflang", df, last_row)


# ---------------------------------------------------------------------------
# 08 Crawl History
# ---------------------------------------------------------------------------

def build_08(wb, pinv):
    df = read_csv("crawl_history.csv")
    dropped = read_csv(os.path.join("..", "raw", "2026-09-15", "A1-inventory",
                                     "inventory-fix-merged-rows.csv"))
    dropped_ids = set(dropped["dropped_url_id"].astype(str))
    before = len(df)
    df = df[~df["url_id"].astype(str).isin(dropped_ids)].copy()
    log(f"08_Crawl_History: dropped {before - len(df)} rows for {len(dropped_ids)} merged url_ids")

    def strip_domain(u):
        if pd.isna(u):
            return u
        u = str(u)
        for p in DOMAIN_PREFIXES:
            if u.startswith(p):
                return u[len(p):] or "/"
        return u

    inv_raw = dict(zip(pinv["url_id"], pinv["raw_url"]))
    df["_inv_raw_url"] = df["url_id"].map(inv_raw)
    req_n = df["requested_url"].apply(strip_domain)
    inv_n = df["_inv_raw_url"].apply(strip_domain)

    def is_repaired_mismatch(r, i):
        if pd.isna(r) or pd.isna(i) or r == i:
            return False
        return r.startswith(i) and len(r) > len(i) and r[len(i)] == ","

    mask = [is_repaired_mismatch(r, i) for r, i in zip(req_n, inv_n)]
    mismatch = df[mask]
    to_reprobe = mismatch.drop_duplicates("url_id")
    log(f"08_Crawl_History: {len(to_reprobe)} url_ids need re-probe "
        f"(requested_url carries pre-repair comma-garbage beyond the clean inventory raw_url)")

    reprobed = {}
    if len(to_reprobe):
        try:
            import requests
            headers = {"User-Agent": "Mozilla/5.0 (compatible; GlobalHealthAudit/1.0)"}
            for i, (_, row) in enumerate(to_reprobe.iterrows()):
                url = row["_inv_raw_url"]
                if url and not url.startswith("http"):
                    url = "https://www.myglobalhealth.online" + url
                hops = []
                cur = url
                status = None
                try:
                    for _hop in range(6):
                        resp = requests.get(cur, headers=headers, allow_redirects=False, timeout=10)
                        hops.append(f"{resp.status_code} {cur}")
                        status = resp.status_code
                        if resp.status_code in (301, 302, 303, 307, 308) and "Location" in resp.headers:
                            nxt = resp.headers["Location"]
                            if nxt.startswith("/"):
                                nxt = "https://www.myglobalhealth.online" + nxt
                            cur = nxt
                        else:
                            break
                    reprobed[row["url_id"]] = dict(http_status=status, final_status=status,
                                                    final_url=cur, redirect_hops=len(hops) - 1,
                                                    hop_chain=" -> ".join(hops))
                except Exception as e:
                    reprobed[row["url_id"]] = dict(error=str(e))
                if i % 3 == 2:
                    time.sleep(1.0)
        except ImportError:
            log("08_Crawl_History: requests not available, skipping live re-probe")

    for uid, res in reprobed.items():
        mask = df["url_id"] == uid
        if "error" in res:
            df.loc[mask, "evidence"] = df.loc[mask, "evidence"].astype(str) + \
                f" | re-probe failed: {res['error']}"
            continue
        df.loc[mask, "http_status"] = res["http_status"]
        df.loc[mask, "final_status"] = res["final_status"]
        df.loc[mask, "final_url"] = res["final_url"]
        df.loc[mask, "redirect_hops"] = res["redirect_hops"]
        df.loc[mask, "hop_chain"] = res["hop_chain"]
        df.loc[mask, "evidence"] = "re-probed after inventory repair"

    df = df.drop(columns=["_inv_raw_url"])
    df["build_id"] = df["source_revision"].fillna("451b23e72f7076f53a06364e06f86da74113d568")
    last_row, new_cols, _ = write_sheet(wb, "08_Crawl_History", df)
    for c in new_cols:
        add_dict("08_Crawl_History", c, f"Imported from crawl_history.csv ({c}).", "Text/Number",
                  "One row per checked_at x url_id snapshot", "Dimension / evidence",
                  "Blank + note; never invented")
    finish_sheet(wb, "08_Crawl_History", df, last_row)
    return df, (set(to_reprobe["url_id"]) if len(to_reprobe) else set())


# ---------------------------------------------------------------------------
# 09 GSC Page Daily
# ---------------------------------------------------------------------------

def build_09(wb, full_map, path_map):
    df = read_csv("gsc_page_daily.csv")
    df["normalized_url"] = df["page"]
    matched = df["page"].apply(lambda u: lookup_url(u, full_map, path_map))
    df["url_id"] = matched.apply(lambda m: m["url_id"] if m else None)
    df["target_country"] = matched.apply(lambda m: m["target_country"] if m else None)
    df["language"] = matched.apply(lambda m: m["language"] if m else None)
    nomatch = df["url_id"].isna()
    df["data_quality"] = df["data_quality"].astype(object)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].fillna("").astype(str)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].apply(
        lambda s: (s + "; " if s else "") + "page not in inventory")
    ws = wb["09_GSC_Page_Daily"]
    row6 = {h: ws.cell(row=6, column=i + 1).value for i, h in enumerate(sheet_headers(ws))}
    last_row, new_cols, _ = write_sheet(wb, "09_GSC_Page_Daily", df,
                                         formula_cols={"ctr": row6["ctr"], "row_key": row6["row_key"]})
    log(f"09_GSC_Page_Daily: {nomatch.sum()} rows unmatched to inventory")
    finish_sheet(wb, "09_GSC_Page_Daily", df, last_row)


# ---------------------------------------------------------------------------
# 10 GSC Query Daily
# ---------------------------------------------------------------------------

BRAND_TERMS = ("global health", "globalhealth", "myglobalhealth", "mgh")
COLLISION_TERMS = ("clinic", "care", "help", "centre", "center", " ms ", "group", "doctors for")


def brand_class(q):
    ql = f" {str(q).lower()} "
    is_brand = any(t in ql for t in BRAND_TERMS)
    if not is_brand:
        return "non-brand"
    if any(t in ql for t in COLLISION_TERMS):
        return "brand-collision"
    return "brand"


def build_10(wb, full_map, path_map):
    df = read_csv("gsc_query_daily.csv")
    df["normalized_url"] = df["page"]
    matched = df["page"].apply(lambda u: lookup_url(u, full_map, path_map))
    df["url_id"] = matched.apply(lambda m: m["url_id"] if m else None)
    df["target_country"] = matched.apply(lambda m: m["target_country"] if m else None)
    df["language"] = matched.apply(lambda m: m["language"] if m else None)
    df["brand_class"] = df["query"].apply(brand_class)
    df["taxonomy_version"] = "brand-v1"
    nomatch = df["url_id"].isna()
    df["data_quality"] = df["data_quality"].astype(object)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].fillna("").astype(str)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].apply(
        lambda s: (s + "; " if s else "") + "page not in inventory")
    ws = wb["10_GSC_Query_Daily"]
    row6 = {h: ws.cell(row=6, column=i + 1).value for i, h in enumerate(sheet_headers(ws))}
    last_row, new_cols, _ = write_sheet(wb, "10_GSC_Query_Daily", df,
                                         formula_cols={"ctr": row6["ctr"], "row_key": row6["row_key"]})
    add_dict("10_GSC_Query_Daily", "brand_class", "brand-v1 rule: brand if query contains "
             "global health|globalhealth|myglobalhealth|mgh; brand-collision if it also contains "
             "clinic|care|help|centre|center| ms |group|doctors for; else non-brand.", "Text",
             "One row per query x page x date x dims", "Dimension", "n/a")
    add_dict("10_GSC_Query_Daily", "taxonomy_version", "Version tag for the brand_class rule set.",
              "Text", "Same as row", "Dimension", "n/a")
    finish_sheet(wb, "10_GSC_Query_Daily", df, last_row)


# ---------------------------------------------------------------------------
# 11 GA4 Landing Daily
# ---------------------------------------------------------------------------

def build_11(wb, full_map, path_map):
    df = read_csv("ga4_landing_daily.csv")
    matched = df["landing_page"].apply(lambda u: lookup_url(u, full_map, path_map))
    df["url_id"] = matched.apply(lambda m: m["url_id"] if m else None)
    df["target_country"] = matched.apply(lambda m: m["target_country"] if m else None)
    df["language"] = matched.apply(lambda m: m["language"] if m else None)
    df["normalized_landing_url"] = df["landing_page"]
    df["session_channel"] = "Organic Search"
    df["purchases"] = df.get("transactions")
    df["booking_starts"] = None
    df["session_key_event_rate"] = None
    for c in ("visitor_country", "device", "session_source_medium"):
        df[c] = None
    nomatch = df["url_id"].isna()
    df["data_quality"] = df["data_quality"].astype(object)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].fillna("").astype(str)
    df.loc[nomatch, "data_quality"] = df.loc[nomatch, "data_quality"].apply(
        lambda s: (s + "; " if s else "") + "page not in inventory")
    dq_note = "not available at daily grain from fixed GA4 reports"
    for c in ("visitor_country", "device", "session_source_medium"):
        pass
    df["data_quality"] = df["data_quality"].fillna("").astype(str).apply(
        lambda s: (s + "; " if s else "") + dq_note + " (visitor_country/device/session_source_medium)")
    ws = wb["11_GA4_Landing_Daily"]
    row6 = {h: ws.cell(row=6, column=i + 1).value for i, h in enumerate(sheet_headers(ws))}
    last_row, new_cols, _ = write_sheet(wb, "11_GA4_Landing_Daily", df,
                                         formula_cols={"engagement_rate": row6["engagement_rate"],
                                                       "row_key": row6["row_key"]})
    finish_sheet(wb, "11_GA4_Landing_Daily", df, last_row)


# ---------------------------------------------------------------------------
# 12 Monthly Summary (starter already has the 99-row formula grid; append Wix rows)
# ---------------------------------------------------------------------------

def build_12(wb):
    ws = wb["12_Monthly_Summary"]
    prop = read_csv("gsc_property_daily.csv")
    prop = prop[prop["search_type"] == "web"].copy()
    prop["month"] = prop["date"].str.slice(0, 7)
    pre = prop[prop["month"] < "2026-07"]
    g = pre.groupby("month").agg(gsc_rows=("date", "count"), clicks=("clicks", "sum"),
                                  impressions=("impressions", "sum"))
    g["ctr"] = g["clicks"] / g["impressions"]
    wpos = pre.groupby("month").apply(
        lambda d: (d["avg_position"] * d["impressions"]).sum() / d["impressions"].sum()
        if d["impressions"].sum() else None, include_groups=False)
    g["weighted_position"] = wpos
    g = g.reset_index().sort_values("month")

    headers = sheet_headers(ws)
    start = 105
    for i, row in g.iterrows():
        r = start + i
        vals = {"month_start": datetime.strptime(row["month"] + "-01", "%Y-%m-%d"),
                "target_country": "ALL", "language": "ALL", "gsc_rows": int(row["gsc_rows"]),
                "clicks": int(row["clicks"]), "impressions": int(row["impressions"]),
                "ctr": row["ctr"], "weighted_position": row["weighted_position"],
                "ga4_rows": None, "organic_sessions": None, "engaged_sessions": None,
                "engagement_rate": None, "key_events": None, "booking_starts": None,
                "purchases": None, "revenue": None, "currency": None,
                "reported_session_key_event_rate": None,
                "quality_status": "pre-launch Wix site, property level only"}
        for c_idx, h in enumerate(headers, start=1):
            ws.cell(row=r, column=c_idx, value=clean_val(vals.get(h)))
        ws.cell(row=r, column=headers.index("ctr") + 1).number_format = "0.00%"
    last_row = start + len(g) - 1 if len(g) else 104
    resize_table_and_format(wb, "12_Monthly_Summary", last_row)
    ROW_COUNTS["12_Monthly_Summary"] = last_row - 5
    log(f"12_Monthly_Summary: {ROW_COUNTS['12_Monthly_Summary']} data rows "
        f"(99 pre-built formula rows + {len(g)} Wix-period rows)")


# ---------------------------------------------------------------------------
# 13 Keyword Map / 14 Competitors / 15 Backlinks
# ---------------------------------------------------------------------------

def build_13(wb, full_map, path_map):
    df = read_csv("keyword_map.csv")
    matched = df["owner_url"].apply(lambda u: lookup_url(u, full_map, path_map) if pd.notna(u) else None)
    df["owner_url_id"] = matched.apply(lambda m: m["url_id"] if m else None)
    last_row, new_cols, _ = write_sheet(wb, "13_Keyword_Map", df)
    for c in new_cols:
        add_dict("13_Keyword_Map", c, f"Imported from keyword_map.csv ({c}).", "Text/Number",
                  "One row per keyword observation", "Dimension / evidence", "Blank + note")
    finish_sheet(wb, "13_Keyword_Map", df, last_row)


def build_14(wb):
    df = read_csv("competitors.csv")
    last_row, new_cols, _ = write_sheet(wb, "14_Competitors", df)
    for c in new_cols:
        add_dict("14_Competitors", c, f"Imported from competitors.csv ({c}).", "Text",
                  "One row per competitor SERP observation", "Dimension / evidence", "Blank + note")
    finish_sheet(wb, "14_Competitors", df, last_row)


def build_15(wb, full_map, path_map):
    bl = read_csv("backlinks.csv")
    matched = bl["target_url"].apply(lambda u: lookup_url(u, full_map, path_map) if pd.notna(u) else None)
    bl["target_url_id"] = matched.apply(lambda m: m["url_id"] if m else None)
    bl["owner"] = None
    bl["target_country"] = bl["target_country"]

    pr = read_csv("backlink_prospects.csv")
    pr = pr.rename(columns={"country": "target_country", "prospect_domain": "source_domain",
                             "prospect_url": "source_url", "proposed_target": "target_url",
                             "rationale": "opportunity", "authority_metric": "provider_metric_value",
                             "source_file": "evidence"})
    pr["link_status"] = "prospect"
    pr["anchor"] = None
    pr["owner"] = None
    matched2 = pr["target_url"].apply(lambda u: lookup_url(u, full_map, path_map) if pd.notna(u) else None)
    pr["target_url_id"] = matched2.apply(lambda m: m["url_id"] if m else None)

    df = pd.concat([bl, pr], ignore_index=True)
    last_row, new_cols, _ = write_sheet(wb, "15_Backlinks", df)
    for c in new_cols:
        add_dict("15_Backlinks", c, f"Imported from backlinks.csv / backlink_prospects.csv ({c}).",
                  "Text/Number", "One row per link or prospect", "Dimension / evidence",
                  "Blank + note")
    finish_sheet(wb, "15_Backlinks", df, last_row)


# ---------------------------------------------------------------------------
# 18 Migration
# ---------------------------------------------------------------------------

def build_18(wb):
    df = read_csv("migration.csv")
    last_row, new_cols, _ = write_sheet(wb, "18_Migration", df, clear_first=True, extra_rows=5)
    for c in new_cols:
        add_dict("18_Migration", c, f"Imported from migration.csv ({c}).", "Text/Number",
                  "One row per legacy URL", "Dimension / evidence", "Blank + note")
    finish_sheet(wb, "18_Migration", df, last_row)


# ---------------------------------------------------------------------------
# 19 Issues
# ---------------------------------------------------------------------------

ISSUE_STATUS_UPDATES = {
    "DATA-001": "Verified: collection restored 2026-09-09; begin_checkout still unregistered; "
                "outage 08-02..09-08 unmeasured",
    "DATA-002": "Unknown via API; owner to confirm in GA4 Admin > Product links",
    "COPY-001": "Traced: tile = languages spoken by Ireland GPs (13); FAQ = six site languages; "
                "proposal in 28_Copy_Proposals",
    "ACCESS-001": "Closed: audit run 2026-09-15",
}


def build_19(wb):
    ws = wb["19_Issues"]
    headers = sheet_headers(ws)
    status_col = headers.index("status") + 1
    id_col = headers.index("issue_id") + 1
    for r in range(6, 10):
        iid = ws.cell(row=r, column=id_col).value
        if iid in ISSUE_STATUS_UPDATES:
            ws.cell(row=r, column=status_col, value=ISSUE_STATUS_UPDATES[iid])

    coupling = read_csv("coupling_issues.csv")
    coupling = coupling.rename(columns={"url_or_template": "url_id",
                                         "coupling_ids_closed": "closes_coupling_ids"})
    coupling["ledger_reference"] = coupling.get("template_fix_id")

    derived = [
        dict(issue_id="TECH-001", category="Indexing", target_country="Ireland", language="en",
             finding="Ireland lab-tests: health-tests flag is off but 84 sitemapped URLs, a hub "
                      "page and 40 legacy redirects all resolve to the same dead route family",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P0",
             impact_1_5=5, confidence_0_1=1, effort_1_5=2,
             affected_scope="84 sitemapped URLs + hub + 40 legacy redirects",
             root_cause="health-tests feature flag disabled for Ireland while sitemap/redirects "
                        "still point at the route family",
             proposed_fix="Owner decision: re-enable the health-tests flag for Ireland, or "
                          "deliberately retire the family (410 + remove from sitemap + drop the "
                          "legacy redirects).",
             approval_needed="owner",
             rollback="Re-enabling the flag is reversible; retiring is reversible only if the "
                      "flag/content are kept, not deleted.",
             follow_up_measurement_window="Next full crawl after the decision is implemented",
             evidence_url="seo/tracking/raw/2026-09-15/A2-probe/incident-ireland-lab-tests-404-2026-09-15.md",
             status="Proposed", next_action="Owner decision needed", owner=None),
        dict(issue_id="MIG-001", category="Migration", target_country="All", language="All",
             finding="Legacy /team/* URLs (28 URLs, 296 historical clicks) 404 with no redirect rule",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P1",
             impact_1_5=4, confidence_0_1=0.9, effort_1_5=2,
             affected_scope="28 URLs, 296 historical clicks",
             root_cause="No redirect rule covers the /team/* legacy path family",
             proposed_fix="Add redirect rules from /team/* to the equivalent doctor/about pages",
             approval_needed="developer",
             rollback="Remove the added redirect rules",
             follow_up_measurement_window="4 weeks post-deploy GSC clicks/impressions on the family",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Developer to add redirect rules", owner=None),
        dict(issue_id="MIG-002", category="Migration", target_country="All", language="All",
             finding="Legacy /services-1/* and /services-2/* families (43 URLs) 404 with no "
                      "redirect rule",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P2",
             impact_1_5=3, confidence_0_1=0.9, effort_1_5=2,
             affected_scope="43 URLs",
             root_cause="No redirect rule covers the services-1/services-2 legacy path families",
             proposed_fix="Map to current service pages and add redirect rules",
             approval_needed="developer", rollback="Remove the added redirect rules",
             follow_up_measurement_window="4 weeks post-deploy",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Developer to add redirect rules", owner=None),
        dict(issue_id="MIG-003", category="Migration", target_country="All", language="All",
             finding="/product-page/beauty-focus-multibeauty returns 404, not the expected "
                      "410 for an intentionally retired product",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P3",
             impact_1_5=2, confidence_0_1=0.9, effort_1_5=1,
             affected_scope="1 URL",
             root_cause="Retirement was not implemented as a proper 410",
             proposed_fix="Return 410 Gone for this URL to signal intentional retirement",
             approval_needed="developer", rollback="Revert to prior (404) behaviour",
             follow_up_measurement_window="Next crawl", evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Developer to return 410", owner=None),
        dict(issue_id="MIG-004", category="Migration", target_country="All", language="All",
             finding="13 departed-clinician URLs are dead ends with no redirect target",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P2",
             impact_1_5=3, confidence_0_1=0.8, effort_1_5=2,
             affected_scope="13 URLs",
             root_cause="Clinician left the roster; no retirement/redirect policy was applied",
             proposed_fix="Owner call: redirect to market doctors index or return 410",
             approval_needed="owner", rollback="n/a (owner decision)",
             follow_up_measurement_window="Next crawl after decision",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Owner decision needed", owner=None),
        dict(issue_id="MIG-005", category="Migration", target_country="All", language="All",
             finding="191 legacy redirects land on a different locale than the original URL "
                      "implied (locale-losing redirects)",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P2",
             impact_1_5=3, confidence_0_1=0.8, effort_1_5=3,
             affected_scope="191 URLs",
             root_cause="Redirect map does not preserve the source URL's implied locale",
             proposed_fix="Rebuild the redirect map to preserve locale where the target page exists",
             approval_needed="developer", rollback="Revert redirect map changes",
             follow_up_measurement_window="4 weeks post-deploy hreflang + GSC check",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Developer to rebuild redirect map", owner=None),
        dict(issue_id="MIG-006", category="Migration", target_country="All", language="All",
             finding="28 legacy URLs redirect to a generic hub/home fallback instead of an "
                      "equivalent page",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P3",
             impact_1_5=2, confidence_0_1=0.8, effort_1_5=2,
             affected_scope="28 URLs",
             root_cause="No equivalent-content mapping existed at cutover; fallback rule used",
             proposed_fix="Research and add equivalent-content redirects where a real target exists",
             approval_needed="developer", rollback="Revert to hub/home fallback",
             follow_up_measurement_window="Next content review cycle",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Research equivalent targets", owner=None),
        dict(issue_id="MIG-007", category="Migration", target_country="All", language="All",
             finding="9 legacy URLs redirect through two hops before landing",
             evidence_date=date(2026, 9, 15), evidence_type="Live probe", priority="P3",
             impact_1_5=1, confidence_0_1=0.9, effort_1_5=1,
             affected_scope="9 URLs",
             root_cause="Chained redirect rules were never collapsed to a single hop",
             proposed_fix="Collapse two-hop chains to a single direct redirect",
             approval_needed="developer", rollback="Revert to chained redirects",
             follow_up_measurement_window="Next crawl",
             evidence_url="seo/tracking/raw/2026-09-15/A8-migration/migration-notes.md",
             status="Proposed", next_action="Developer to collapse chains", owner=None),
        dict(issue_id="MEAS-001", category="Measurement", target_country="All", language="All",
             finding="begin_checkout is fired client-side but is not a registered GA4 key event",
             evidence_date=date(2026, 9, 15), evidence_type="API + code review", priority="P1",
             impact_1_5=4, confidence_0_1=1, effort_1_5=1,
             affected_scope="All markets, checkout funnel",
             root_cause="Event fires in CartPageClient.tsx but was never registered as a GA4 key event",
             proposed_fix="Register begin_checkout as a GA4 key event in Admin",
             approval_needed="owner", rollback="Unregister the key event",
             follow_up_measurement_window="7 days post-registration",
             evidence_url="seo/tracking/raw/2026-09-15/A4-ga4/track-code-review.md",
             status="Proposed", next_action="Owner to register key event", owner=None),
        dict(issue_id="MEAS-002", category="Measurement", target_country="All", language="All",
             finding="dev/staging hosts (localhost, myglobalhealth.up.railway.app) appear in the "
                      "production GA4 property; checkout.stripe.com and tagassistant referral "
                      "pollution present; 11.3% of sessions unattributed",
             evidence_date=date(2026, 9, 15), evidence_type="API review", priority="P2",
             impact_1_5=3, confidence_0_1=0.9, effort_1_5=2,
             affected_scope="Production GA4 property acquisition reports",
             root_cause="No internal/dev traffic filter or referral exclusion list configured",
             proposed_fix="Add dev/staging hostname filter and referral exclusion list in GA4 Admin",
             approval_needed="owner", rollback="Remove the filters",
             follow_up_measurement_window="4 weeks post-filter",
             evidence_url="seo/tracking/raw/2026-09-15/A4-ga4/manifest-A4.json",
             status="Proposed", next_action="Owner approval for filters", owner=None),
        dict(issue_id="MEAS-003", category="Measurement", target_country="Pakistan", language="All",
             finding="Pakistan: 33 sessions / 3 users look like internal/team traffic, not "
                      "real market demand (Global Health has no PK market)",
             evidence_date=date(2026, 9, 15), evidence_type="API review", priority="P3",
             impact_1_5=1, confidence_0_1=0.7, effort_1_5=1,
             affected_scope="33 sessions / 3 users",
             root_cause="No internal-traffic IP/device filter configured",
             proposed_fix="Propose an internal-traffic filter in GA4 Admin (owner approval required "
                          "before applying)",
             approval_needed="owner", rollback="Remove the filter",
             follow_up_measurement_window="4 weeks post-filter",
             evidence_url="seo/tracking/raw/2026-09-15/A4-ga4/manifest-A4.json",
             status="Proposed", next_action="Owner approval needed", owner=None),
        dict(issue_id="IDX-001", category="Indexing", target_country="All", language="All",
             finding="SEO-DOC-006 cohort: 14 doctor URLs remain noindex on pre-fix crawls even "
                      "after a third re-crawl request extension",
             evidence_date=date(2026, 9, 15), evidence_type="URL Inspection", priority="P2",
             impact_1_5=3, confidence_0_1=0.8, effort_1_5=2,
             affected_scope="14 doctor URLs",
             root_cause="Crawl-budget delay, not a persistent template defect",
             proposed_fix="Re-request indexing selectively; monitor next Inspection pass",
             approval_needed="none", rollback="n/a",
             follow_up_measurement_window="Next URL Inspection batch",
             evidence_url="seo/tracking/raw/2026-09-15/A3-gsc/inspect/inspection-summary-2026-09-15.md",
             status="Proposed", next_action="Monitor next inspection batch", owner=None),
        dict(issue_id="IDX-002", category="Indexing", target_country="All", language="All",
             finding="91 URLs are Discovered - currently not indexed",
             evidence_date=date(2026, 9, 15), evidence_type="URL Inspection", priority="P3",
             impact_1_5=2, confidence_0_1=0.8, effort_1_5=2,
             affected_scope="91 URLs",
             root_cause="Crawl budget / low perceived value; not a technical block",
             proposed_fix="Improve internal linking and content depth on the affected templates",
             approval_needed="none", rollback="n/a",
             follow_up_measurement_window="Monthly coverage check",
             evidence_url="seo/tracking/raw/2026-09-15/A3-gsc/inspect/inspection-summary-2026-09-15.md",
             status="Proposed", next_action="Improve internal linking", owner=None),
        dict(issue_id="CONT-001", category="Content", target_country="All", language="All",
             finding="4 same-language cross-market blog copies were folded into one URL by Google",
             evidence_date=date(2026, 9, 15), evidence_type="Content scan", priority="P3",
             impact_1_5=2, confidence_0_1=0.8, effort_1_5=3,
             affected_scope="4 blog post groups",
             root_cause="Near-identical copy shared across markets in the same language",
             proposed_fix="Localize each market's copy with real local detail",
             approval_needed="clinical", rollback="n/a",
             follow_up_measurement_window="Next content review cycle",
             evidence_url="seo/tracking/data/content_duplicate_groups.csv",
             status="Proposed", next_action="Prioritize in editorial plan", owner=None),
        dict(issue_id="INTL-001", category="International SEO", target_country="All", language="All",
             finding="Tools cross-market hreflang cluster spans 7,200 edges - large by design "
                      "(shared tool pages), not necessarily a defect",
             evidence_date=date(2026, 9, 15), evidence_type="Hreflang audit", priority="P3",
             impact_1_5=1, confidence_0_1=0.6, effort_1_5=1,
             affected_scope="7,200 hreflang edges",
             root_cause="Shared tool pages are intentionally cross-linked across every market",
             proposed_fix="Confirm with owner that this is intentional; no fix unless confirmed wrong",
             approval_needed="owner", rollback="n/a",
             follow_up_measurement_window="n/a",
             evidence_url="seo/tracking/data/hreflang_edges.csv",
             status="Proposed", next_action="Owner confirmation", owner=None),
        dict(issue_id="META-001", category="Content", target_country="All", language="All",
             finding="117 pages have long titles and 150 have long meta descriptions",
             evidence_date=date(2026, 9, 15), evidence_type="OpenSEO crawl", priority="P3",
             impact_1_5=2, confidence_0_1=0.9, effort_1_5=2,
             affected_scope="117 + 150 pages",
             root_cause="Templates do not truncate/validate title and description length",
             proposed_fix="Trim titles/descriptions on the affected templates",
             approval_needed="none", rollback="n/a",
             follow_up_measurement_window="Next crawl",
             evidence_url="seo/tracking/data/openseo_audit_issues.csv",
             status="Proposed", next_action="Editorial cleanup", owner=None),
        dict(issue_id="META-002", category="Content", target_country="All", language="All",
             finding="412 pages share a duplicate title and 769 share a duplicate meta "
                      "description within the same language",
             evidence_date=date(2026, 9, 15), evidence_type="OpenSEO crawl", priority="P2",
             impact_1_5=3, confidence_0_1=0.9, effort_1_5=3,
             affected_scope="412 + 769 pages",
             root_cause="Template-generated metadata does not vary enough per entity",
             proposed_fix="Add entity-specific tokens (doctor name, city, service) to templates",
             approval_needed="developer", rollback="n/a",
             follow_up_measurement_window="Next crawl",
             evidence_url="seo/tracking/data/openseo_audit_issues.csv",
             status="Proposed", next_action="Template fix", owner=None),
        dict(issue_id="A11Y-001", category="Accessibility", target_country="All", language="All",
             finding="2,069 pages have images missing alt text",
             evidence_date=date(2026, 9, 15), evidence_type="OpenSEO crawl", priority="P3",
             impact_1_5=2, confidence_0_1=0.9, effort_1_5=3,
             affected_scope="2,069 pages",
             root_cause="Alt text not populated for CMS/roster-driven images",
             proposed_fix="Backfill alt text, starting with clinician and service images",
             approval_needed="none", rollback="n/a",
             follow_up_measurement_window="Next crawl",
             evidence_url="seo/tracking/data/crawl_history.csv",
             status="Proposed", next_action="Backfill alt text", owner=None),
        dict(issue_id="CONT-002", category="Content", target_country="All", language="All",
             finding="910 pages have 3+ superlative-claim hits (best, #1, guaranteed, etc.)",
             evidence_date=date(2026, 9, 15), evidence_type="Content scan", priority="P3",
             impact_1_5=2, confidence_0_1=0.8, effort_1_5=3,
             affected_scope="910 pages",
             root_cause="Template copy leans on unverifiable superlative claims",
             proposed_fix="Replace superlatives with specific, verifiable claims",
             approval_needed="clinical", rollback="n/a",
             follow_up_measurement_window="Next content review cycle",
             evidence_url="seo/tracking/data/content_scan_summary.csv",
             status="Proposed", next_action="Editorial rewrite queue", owner=None),
        dict(issue_id="INTL-002", category="International SEO", target_country="Romania,Brazil",
             language="ro,pt", priority="P1",
             finding="Wrong-locale cannibalisation: RO ranks on other markets' locale pages for "
                      "5/16 tracked queries, BR for 4/11",
             evidence_date=date(2026, 9, 15), evidence_type="Ranked-keywords + SERP check",
             impact_1_5=4, confidence_0_1=0.8, effort_1_5=3,
             affected_scope="RO 5/16 and BR 4/11 tracked queries",
             root_cause="A same-language page on another market ranks instead of the correct "
                        "market/locale page",
             proposed_fix="Strengthen internal linking and hreflang signals toward the correct "
                          "market page; review for near-duplicate content",
             approval_needed="developer", rollback="n/a",
             follow_up_measurement_window="4 weeks post-fix ranked-keywords recheck",
             evidence_url="seo/tracking/data/cannibalisation.csv",
             status="Proposed", next_action="Strengthen locale signals", owner=None),
        dict(issue_id="AUTH-001", category="Backlinks", target_country="All", language="All",
             finding="Backlink reclamation opportunity: 15 broken /product-page links, 54 "
                      "blog-index landings, 128 wix.to booking links pointing to the generic /book",
             evidence_date=date(2026, 9, 15), evidence_type="Backlink audit", priority="P2",
             impact_1_5=3, confidence_0_1=0.7, effort_1_5=2,
             affected_scope="15 + 54 + 128 backlinks",
             root_cause="Historic external links point at retired/renamed/generic URLs",
             proposed_fix="Request link updates from linking domains where feasible; ensure "
                          "current targets redirect correctly in the meantime",
             approval_needed="owner", rollback="n/a",
             follow_up_measurement_window="Quarterly backlink recheck",
             evidence_url="seo/tracking/data/backlinks.csv",
             status="Proposed", next_action="Outreach queue", owner=None),
        dict(issue_id="DATA-003", category="Measurement", target_country="All", language="All",
             finding="Anonymized (privacy-omitted) queries account for 80.6% of clicks / 61.7% "
                      "of impressions in GSC Query Daily W1 - informational, not fixable",
             evidence_date=date(2026, 9, 15), evidence_type="GSC API", priority="P3",
             impact_1_5=1, confidence_0_1=1, effort_1_5=1,
             affected_scope="GSC query-level reporting, all markets",
             root_cause="Google privacy thresholding omits low-volume/identifying queries",
             proposed_fix="None - treat query-level totals as a sample, not a full ledger",
             approval_needed="none", rollback="n/a", follow_up_measurement_window="n/a",
             evidence_url="seo/README.md",
             status="Closed: informational", next_action="None", owner=None),
    ]
    derived_df = pd.DataFrame(derived)

    df = pd.concat([coupling, derived_df], ignore_index=True)

    df["_p"] = df["priority"].map({"P0": 0, "P1": 1, "P2": 2, "P3": 3}).fillna(4)
    df["_score"] = pd.to_numeric(df["impact_1_5"], errors="coerce") * \
        pd.to_numeric(df["confidence_0_1"], errors="coerce") / \
        pd.to_numeric(df["effort_1_5"], errors="coerce").replace(0, pd.NA)
    df = df.sort_values(["_p", "_score"], ascending=[True, False]).drop(columns=["_p", "_score"])

    row6 = {h: ws.cell(row=6, column=i + 1).value for i, h in enumerate(headers)}
    last_row, new_cols, _ = write_sheet(wb, "19_Issues", df, start_row=10,
                                         formula_cols={"priority_score": row6["priority_score"]})
    for c in new_cols:
        add_dict("19_Issues", c, f"Added by A10 for coupling/derived issue rows ({c}).", "Text",
                  "One row per issue", "Dimension", "Blank if not applicable")
    ROW_COUNTS["19_Issues"] = max(0, last_row - 5)
    resize_table_and_format(wb, "19_Issues", last_row)
    log(f"19_Issues: {ROW_COUNTS['19_Issues']} data rows (4 seeded + {len(df)} appended)")


# ---------------------------------------------------------------------------
# 20 Change Log
# ---------------------------------------------------------------------------

def build_20(wb, head_commit):
    tl = read_csv("migration-timeline.csv")
    df = pd.DataFrame({
        "change_id": [f"EVT-{i+1:03d}" for i in range(len(tl))],
        "change_date": tl["date"],
        "change_type": "Migration/deployment event",
        "scope": "Repository / production",
        "description": tl["event"],
        "commit_or_deployment": tl["commit"],
        "implementation_status": "Historically documented",
        "evidence": tl["evidence"],
    })
    audit_row = pd.DataFrame([{
        "change_id": "AUDIT-2026-09-15", "ledger_reference": None,
        "change_date": date(2026, 9, 15), "change_type": "Audit",
        "scope": "Full SEO master audit (A0-A12)",
        "description": "audit recorded, no implementation",
        "commit_or_deployment": head_commit,
        "implementation_status": "Complete",
        "before_window": None, "after_window": None,
        "verification": "See seo/tracking/raw/2026-09-15/A10-workbook/build-log.md",
        "next_measurement": None,
        "evidence": "https://github.com/myglobalhealthonline/global-health-website/blob/main/seo/README.md",
    }])
    df = pd.concat([df, audit_row], ignore_index=True)
    last_row, new_cols, _ = write_sheet(wb, "20_Change_Log", df, clear_first=True)
    finish_sheet(wb, "20_Change_Log", df, last_row)


# ---------------------------------------------------------------------------
# 21 Historical Baselines (append only)
# ---------------------------------------------------------------------------

def build_21(wb):
    ws = wb["21_Historical_Baselines"]
    rows = [
        dict(snapshot_id="GSCW1-CLICKS", observed_at=date(2026, 9, 15), source="GSC API (openseo)",
             window_start=date(2026, 8, 15), window_end=date(2026, 9, 11), scope="Property / Web",
             metric="Clicks", value=1008, unit="clicks", precision="Exact (API)",
             comparison_warning="Current 28-day window; comparable to GSCW0-CLICKS",
             evidence_url="seo/tracking/data/gsc_page_daily.csv"),
        dict(snapshot_id="GSCW1-IMPR", observed_at=date(2026, 9, 15), source="GSC API (openseo)",
             window_start=date(2026, 8, 15), window_end=date(2026, 9, 11), scope="Property / Web",
             metric="Impressions", value=69925, unit="impressions", precision="Exact (API)",
             comparison_warning="Current 28-day window; comparable to GSCW0-IMPR",
             evidence_url="seo/tracking/data/gsc_page_daily.csv"),
        dict(snapshot_id="GSCW0-CLICKS", observed_at=date(2026, 9, 15), source="GSC API (openseo)",
             window_start=date(2026, 7, 18), window_end=date(2026, 8, 14), scope="Property / Web",
             metric="Clicks", value=761, unit="clicks", precision="Exact (API)",
             comparison_warning="Prior 28-day window; comparable to GSCW1-CLICKS",
             evidence_url="seo/tracking/data/gsc_page_daily.csv"),
        dict(snapshot_id="GSCW0-IMPR", observed_at=date(2026, 9, 15), source="GSC API (openseo)",
             window_start=date(2026, 7, 18), window_end=date(2026, 8, 14), scope="Property / Web",
             metric="Impressions", value=39935, unit="impressions", precision="Exact (API)",
             comparison_warning="Prior 28-day window; comparable to GSCW1-IMPR",
             evidence_url="seo/tracking/data/gsc_page_daily.csv"),
        dict(snapshot_id="LEDGER-S42.1", observed_at=date(2026, 9, 1), source="Ledger snapshot §42.1",
             window_start=date(2026, 8, 5), window_end=date(2026, 9, 1), scope="Property / Web",
             metric="Clicks / Impressions", value=None, unit="861 clicks / 60,058 impressions",
             precision="Rounded / historical",
             comparison_warning="Overlaps GSCW0/W1 windows; historical, do not sum or compare directly",
             evidence_url="docs/plans/seo-control-state.md"),
        dict(snapshot_id="LEDGER-S49", observed_at=date(2026, 9, 6), source="Ledger snapshot §49",
             window_start=date(2026, 8, 10), window_end=date(2026, 9, 6), scope="Property / Web",
             metric="Clicks / Impressions", value=None, unit="918 clicks / 61.3K impressions",
             precision="Rounded / historical",
             comparison_warning="Overlaps GSCW0/W1 windows; historical, do not sum or compare directly",
             evidence_url="docs/plans/seo-control-state.md"),
        dict(snapshot_id="GA4-VALID-W1", observed_at=date(2026, 9, 15), source="GA4 API (openseo)",
             window_start=date(2026, 7, 25), window_end=date(2026, 8, 1), scope="GA4 property 547083375",
             metric="Organic sessions (valid window)", value=24, unit="sessions",
             precision="Exact (API)",
             comparison_warning="Only valid measurement window before the outage",
             evidence_url="seo/tracking/data/ga4_landing_daily.csv"),
        dict(snapshot_id="GA4-VALID-W2", observed_at=date(2026, 9, 15), source="GA4 API (openseo)",
             window_start=date(2026, 9, 9), window_end=date(2026, 9, 14), scope="GA4 property 547083375",
             metric="Organic sessions (valid window)", value=260, unit="sessions",
             precision="Exact (API)",
             comparison_warning="Only valid measurement window after the outage ended",
             evidence_url="seo/tracking/data/ga4_landing_daily.csv"),
        dict(snapshot_id="BACKLINKS-2026-09-15", observed_at=date(2026, 9, 15),
             source="DataForSEO via OpenSEO", window_start=None, window_end=None,
             scope="Referring domains", metric="Backlinks / referring domains", value=None,
             unit="572 backlinks / 68 referring domains", precision="Provider estimate",
             comparison_warning="Provider index coverage, not a Google-verified count",
             evidence_url="seo/tracking/data/backlinks.csv"),
        dict(snapshot_id="OPENSEO-CRAWL-2026-09-15", observed_at=date(2026, 9, 15),
             source="OpenSEO site audit", window_start=None, window_end=None,
             scope="600-page crawl", metric="Pages crawled / critical issues", value=None,
             unit="600 pages / 0 critical", precision="Exact (tool)",
             comparison_warning="Single-day crawl snapshot; Lighthouse per-page scores not exposed",
             evidence_url="seo/tracking/data/openseo_audit_pages.csv"),
    ]
    df = pd.DataFrame(rows)
    last_row, new_cols, _ = write_sheet(wb, "21_Historical_Baselines", df, start_row=17)
    ROW_COUNTS["21_Historical_Baselines"] = max(0, last_row - 5)
    resize_table_and_format(wb, "21_Historical_Baselines", last_row)
    log(f"21_Historical_Baselines: {ROW_COUNTS['21_Historical_Baselines']} data rows "
        f"(11 starter + {len(df)} appended)")


# ---------------------------------------------------------------------------
# 22 Refresh Log
# ---------------------------------------------------------------------------

def build_22(wb):
    rows = [
        dict(refresh_id="R2026-09-15-GSC-A", started_at=datetime(2026, 9, 15, 17, 22),
             source="GSC API (openseo, A3a)", scope="Property daily + date/country + date/device",
             requested_start=date(2025, 5, 15), requested_end=date(2026, 9, 14),
             last_complete_date=date(2026, 9, 11), rows_received=2928 + 4458 + 168,
             status="Complete", pagination_or_limit="5 pages max for date/country",
             data_quality="Last ~3 days incomplete", evidence_path="A3-gsc/manifest-A3a.json",
             next_action="Daily refresh"),
        dict(refresh_id="R2026-09-15-GSC-B2", started_at=datetime(2026, 9, 15, 0, 0),
             source="GSC API (openseo, A3b page-daily window B, parts 1-4)",
             scope="Page daily 2026-07-21..09-14", requested_start=date(2026, 7, 21),
             requested_end=date(2026, 9, 14), last_complete_date=date(2026, 9, 11),
             rows_received=19488, status="Complete", pagination_or_limit="Paginated 1000 rows/call",
             data_quality="page x date grain; country/device sparse-filtered", evidence_path="A3-gsc/B/",
             next_action="Daily refresh"),
        dict(refresh_id="R2026-09-15-GSC-C", started_at=datetime(2026, 9, 15, 5, 35),
             source="GSC API (openseo, A3c query x page/country/device/appearance, parts 1-3)",
             scope="Query-level W1/W0 aggregates", requested_start=date(2026, 7, 18),
             requested_end=date(2026, 9, 11), last_complete_date=date(2026, 9, 11),
             rows_received=6474 + 5318 + 5000 + 5000 + 4997 + 5000 + 1 + 1, status="Complete",
             pagination_or_limit="Paginated 1000 rows/call, 25000-row cap per query",
             data_quality="W1/W0 28-day windows", evidence_path="A3-gsc/C/",
             next_action="Weekly refresh"),
        dict(refresh_id="R2026-09-15-GSC-B2D", started_at=datetime(2026, 9, 15, 0, 0),
             source="GSC API (openseo, A3d page-daily country/device, parts 1-3)",
             scope="Page daily x country x device 2026-07-21..08-06+", requested_start=date(2026, 7, 21),
             requested_end=date(2026, 9, 14), last_complete_date=date(2026, 9, 11),
             rows_received=12973, status="Complete", pagination_or_limit="Paginated 1000 rows/call",
             data_quality="Sparse-filtered by Google to ~35% of impressions",
             evidence_path="A3-gsc/B2/", next_action="Weekly refresh"),
        dict(refresh_id="R2026-09-15-GSC-W", started_at=datetime(2026, 9, 15, 5, 25, 58),
             source="GSC API (openseo, A3w Wix-period page monthly)",
             scope="Pre-launch page-level monthly", requested_start=date(2025, 5, 15),
             requested_end=date(2026, 6, 30), last_complete_date=date(2026, 6, 30),
             rows_received=4004, status="Complete", pagination_or_limit="1000 rows/call",
             data_quality="Legacy Wix URL structure; monthly grain only",
             evidence_path="A3-gsc/wix/manifest-A3w.json", next_action="None (historical, closed window)"),
        dict(refresh_id="R2026-09-15-GA4", started_at=datetime(2026, 9, 15, 0, 0),
             source="GA4 API (openseo, A4)", scope="Organic landing pages, valid windows",
             requested_start=date(2026, 7, 25), requested_end=date(2026, 9, 14),
             last_complete_date=date(2026, 9, 12), rows_received=204, status="Partial",
             pagination_or_limit="Fixed reports only, no raw Data API",
             data_quality="Outage 2026-08-02..09-08 unmeasured, not zero",
             evidence_path="A4-ga4/manifest-A4.json", next_action="Daily refresh once continuous"),
        dict(refresh_id="R2026-09-15-GSC-I-1..4", started_at=datetime(2026, 9, 15, 5, 12, 8),
             source="GSC URL Inspection API (openseo, 4 batches)", scope="628 priority URLs",
             requested_start=date(2026, 9, 15), requested_end=date(2026, 9, 15),
             last_complete_date=date(2026, 9, 15), rows_received=628, status="Partial",
             pagination_or_limit="2000 URLs/day quota; 1637 sitemap URLs queued for next day",
             data_quality="Point-in-time index state, not a live fetch",
             evidence_path="A3-gsc/inspect/manifest-set-1..4.json",
             next_action="Inspect remainder queue next day"),
        dict(refresh_id="R2026-09-15-PROBE-A2", started_at=datetime(2026, 9, 15, 5, 41, 57),
             source="Public HTTP probe (A2)", scope="Every inventory URL, crawl_history",
             requested_start=date(2026, 9, 15), requested_end=date(2026, 9, 15),
             last_complete_date=date(2026, 9, 15), rows_received=4672, status="Complete",
             pagination_or_limit="<=4 req/s, GET only", data_quality="901 rows later dropped as merged/garbage",
             evidence_path="A2-probe/manifest-A2.json", next_action="Periodic recrawl"),
        dict(refresh_id="R2026-09-15-AUDIT-A2B", started_at=datetime(2026, 9, 15, 5, 8, 34),
             source="OpenSEO site audit + Lighthouse (A2b)", scope="600-page crawl",
             requested_start=date(2026, 9, 15), requested_end=date(2026, 9, 15),
             last_complete_date=date(2026, 9, 15), rows_received=600, status="Complete",
             pagination_or_limit="maxPages 600; Lighthouse sample 20 (10 ok/10 failed)",
             data_quality="Per-page Lighthouse scores not exposed by the API",
             evidence_path="A2-probe/openseo-audit/manifest-A2b.json", next_action="Periodic re-crawl"),
        dict(refresh_id="R2026-09-15-A5", started_at=datetime(2026, 9, 15, 0, 0),
             source="Locale data QA probe (A5)", scope="33 market/locale combinations",
             requested_start=date(2026, 9, 15), requested_end=date(2026, 9, 15),
             last_complete_date=date(2026, 9, 15), rows_received=33, status="Complete",
             pagination_or_limit="None", data_quality="2 false-positive FAILs corrected by orchestrator",
             evidence_path="A5-locale-qa/run.log; orchestrator-correction-2026-09-15.md",
             next_action="Periodic recheck"),
        dict(refresh_id="R2026-09-15-A7", started_at=datetime(2026, 9, 15, 0, 0),
             source="OpenSEO market intelligence (A7: keywords, competitors, backlinks)",
             scope="6 markets: keywords, SERP competitors, backlinks", requested_start=date(2026, 9, 15),
             requested_end=date(2026, 9, 15), last_complete_date=date(2026, 9, 15),
             rows_received=820 + 299 + 410, status="Complete",
             pagination_or_limit="Credit-capped at 1800; 751 spent",
             data_quality="Provider estimates, not Google-verified",
             evidence_path="A7-market/manifest-A7.json", next_action="Monthly refresh"),
        dict(refresh_id="R2026-09-15-A8", started_at=datetime(2026, 9, 15, 0, 0),
             source="Migration probe (A8)", scope="1,142 legacy URLs",
             requested_start=date(2026, 9, 15), requested_end=date(2026, 9, 15),
             last_complete_date=date(2026, 9, 15), rows_received=1142, status="Complete",
             pagination_or_limit="<=4 req/s, GET only", data_quality="Live probe of documented legacy URLs",
             evidence_path="A8-migration/probe.jsonl", next_action="Periodic recheck"),
    ]
    df = pd.DataFrame(rows)
    last_row, new_cols, _ = write_sheet(wb, "22_Refresh_Log", df, start_row=9)
    ROW_COUNTS["22_Refresh_Log"] = max(0, last_row - 5)
    resize_table_and_format(wb, "22_Refresh_Log", last_row)
    log(f"22_Refresh_Log: {ROW_COUNTS['22_Refresh_Log']} data rows (3 starter + {len(df)} appended)")


# ---------------------------------------------------------------------------
# 24 Sources (append)
# ---------------------------------------------------------------------------

def build_24(wb):
    ws = wb["24_Sources"]
    rows = []
    n = 1
    folder_notes = {
        "A0-access": "Data-access inventory and robots/sitemap snapshot.",
        "A1-inventory": "Route/entity/URL inventory build, incl. inventory-fix merge/garbage passes.",
        "A2-probe": "Live HTTP probe of every inventory URL + OpenSEO site audit (A2b).",
        "A3-gsc": "GSC API pulls: property, page, query, country/device grains, URL Inspection.",
        "A4-ga4": "GA4 API pulls: organic overview, landing pages, key events, ecommerce.",
        "A5-locale-qa": "Per-locale runtime/data-isolation QA probe (33 combinations).",
        "A6-content": "Content review candidate selection (top pages by market).",
        "A7-market": "Keyword, competitor and backlink research via OpenSEO/DataForSEO.",
        "A8-migration": "Legacy URL live-probe for the migration mapping.",
        "A9-programmatic": "pSEO plan research inputs.",
        "A11-qa": "Cross-agent QA pass reserved output.",
        "A12-coupling": "Country-coupling code scan (hardcoded country logic).",
        "A-ledger": "Carried-forward context from the prior ledger.",
    }
    for folder, note in folder_notes.items():
        p = os.path.join(RAW, folder)
        if not os.path.isdir(p):
            continue
        rows.append(dict(source_id=f"F{n:02d}", description=f"Raw evidence folder: {folder}",
                          url=f"seo/tracking/raw/2026-09-15/{folder}/",
                          observation_or_retrieval="Retrieved 2026-09-15", limitations=note))
        n += 1
    for fn in sorted(os.listdir(DATA)):
        if not fn.endswith(".csv"):
            continue
        rows.append(dict(source_id=f"D{n:02d}", description=f"Normalized dataset: {fn}",
                          url=f"seo/tracking/data/{fn}",
                          observation_or_retrieval="Built 2026-09-15",
                          limitations="See 23_Data_Dictionary for column definitions"))
        n += 1
    for fn in sorted(os.listdir(os.path.join(TRACKING, "scripts"))):
        if not fn.endswith(".py") and fn != "recalc_excel.ps1":
            continue
        rows.append(dict(source_id=f"S{n:02d}", description=f"Refresh/build script: {fn}",
                          url=f"seo/tracking/scripts/{fn}",
                          observation_or_retrieval="Written 2026-09-15",
                          limitations="Run by hand; no scheduled automation"))
        n += 1
    df = pd.DataFrame(rows)
    last_row, new_cols, _ = write_sheet(wb, "24_Sources", df, start_row=28)
    ROW_COUNTS["24_Sources"] = max(0, last_row - 5)
    resize_table_and_format(wb, "24_Sources", last_row)
    log(f"24_Sources: {ROW_COUNTS['24_Sources']} data rows (22 starter + {len(df)} appended)")


# ---------------------------------------------------------------------------
# 26 GSC Property Daily
# ---------------------------------------------------------------------------

def build_26(wb):
    df = read_csv("gsc_property_daily.csv")
    ws = wb["26_GSC_Property_Daily"]
    row6 = {h: ws.cell(row=6, column=i + 1).value for i, h in enumerate(sheet_headers(ws))}
    last_row, new_cols, _ = write_sheet(wb, "26_GSC_Property_Daily", df,
                                         formula_cols={"ctr": row6["ctr"]})
    finish_sheet(wb, "26_GSC_Property_Daily", df, last_row)


# ---------------------------------------------------------------------------
# 27 Country Coupling / 29 Country Modules / 30 Scripts Cleanup (new sheets)
# ---------------------------------------------------------------------------

def build_new_table_sheet(wb, sheet_name, table_name, csv_name, title, scope_note):
    if sheet_name not in wb.sheetnames:
        wb.create_sheet(sheet_name)
    ws = wb[sheet_name]
    df = read_csv(csv_name)
    headers = list(df.columns)
    ws.cell(row=1, column=1, value=title)
    ws.cell(row=2, column=1, value=scope_note)
    for c_idx, h in enumerate(headers, start=1):
        ws.cell(row=5, column=c_idx, value=h)
    if table_name not in ws.tables:
        from openpyxl.worksheet.table import Table, TableStyleInfo
        style = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        tbl = Table(displayName=table_name, ref=f"A5:{get_column_letter(len(headers))}6")
        tbl.tableStyleInfo = style
        ws.add_table(tbl)
    last_row, new_cols, _ = write_sheet(wb, sheet_name, df)
    finish_sheet(wb, sheet_name, df, last_row)
    for c in headers:
        add_dict(sheet_name, c, f"Imported from {csv_name} ({c}).", "Text/Number",
                  "One row per record", "Dimension / evidence", "Blank + note")


# ---------------------------------------------------------------------------
# 16 Content Review / 17 pSEO Plan / 28 Copy Proposals - written by other agents
# ---------------------------------------------------------------------------

PENDING_FILES = {
    "16_Content_Review": ("content_review.csv", "T16ContentReview"),
    "17_pSEO_Plan": ("pseo_plan.csv", "T17pSEOPlan"),
}


def wait_for_dependency_files(max_minutes=40):
    import subprocess
    deadline = time.time() + max_minutes * 60
    names = ["content_review.csv", "pseo_plan.csv", "copy_proposals.csv"]
    while time.time() < deadline:
        present = {n: os.path.exists(os.path.join(DATA, n)) for n in names}
        if all(present.values()):
            log(f"All dependency files present: {present}")
            return present
        missing = [n for n, ok in present.items() if not ok]
        log(f"Waiting for other agents to write: {missing} "
            f"({int((deadline - time.time())/60)} min left)")
        time.sleep(60)
    present = {n: os.path.exists(os.path.join(DATA, n)) for n in names}
    log(f"Wait window elapsed. Final presence: {present}")
    return present


def build_16(wb, present):
    ws = wb["16_Content_Review"]
    headers = sheet_headers(ws)
    if present.get("content_review.csv"):
        df = read_csv("content_review.csv")
        last_row, new_cols, _ = write_sheet(wb, "16_Content_Review", df, start_row=7, clear_first=True)
        for c in new_cols:
            add_dict("16_Content_Review", c, f"Imported from content_review.csv ({c}).", "Text",
                      "One row per content review finding", "Dimension / evidence", "Blank + note")
        finish_sheet(wb, "16_Content_Review", df, last_row)
        return df
    else:
        note = pd.DataFrame([{"review_id": "pending", "issue": "pending - see seo/tracking/data/content_review.csv"}])
        last_row, new_cols, _ = write_sheet(wb, "16_Content_Review", note, start_row=7)
        ROW_COUNTS["16_Content_Review"] = max(0, last_row - 5)
        resize_table_and_format(wb, "16_Content_Review", last_row)
        log("16_Content_Review: content_review.csv not available - left pending note row")
        return None


def build_17(wb, present):
    if present.get("pseo_plan.csv"):
        df = read_csv("pseo_plan.csv")
        last_row, new_cols, _ = write_sheet(wb, "17_pSEO_Plan", df, start_row=9, clear_first=True)
        for c in new_cols:
            add_dict("17_pSEO_Plan", c, f"Imported from pseo_plan.csv ({c}).", "Text",
                      "One row per pSEO candidate", "Dimension / evidence", "Blank + note")
        finish_sheet(wb, "17_pSEO_Plan", df, last_row)
    else:
        note = pd.DataFrame([{"candidate_id": "pending",
                               "proposed_page_family": "pending - see seo/tracking/data/pseo_plan.csv"}])
        last_row, new_cols, _ = write_sheet(wb, "17_pSEO_Plan", note, start_row=9)
        ROW_COUNTS["17_pSEO_Plan"] = max(0, last_row - 5)
        resize_table_and_format(wb, "17_pSEO_Plan", last_row)
        log("17_pSEO_Plan: pseo_plan.csv not available - left pending note row")


def build_28(wb, present):
    sheet_name = "28_Copy_Proposals"
    if sheet_name not in wb.sheetnames:
        wb.create_sheet(sheet_name)
    ws = wb[sheet_name]
    ws.cell(row=1, column=1, value="COPY PROPOSALS")
    ws.cell(row=2, column=1, value="Proposed copy fixes traced from 19_Issues (e.g. COPY-001); "
            "not approved until clinical/native-editor/copy sign-off is recorded.")
    if present.get("copy_proposals.csv"):
        df = read_csv("copy_proposals.csv")
    else:
        df = pd.DataFrame([{"proposal_id": "pending",
                             "note": "pending - see seo/tracking/data/copy_proposals.csv"}])
    headers = list(df.columns)
    for c_idx, h in enumerate(headers, start=1):
        ws.cell(row=5, column=c_idx, value=h)
    if "T28CopyProposals" not in ws.tables:
        from openpyxl.worksheet.table import Table, TableStyleInfo
        style = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        tbl = Table(displayName="T28CopyProposals", ref=f"A5:{get_column_letter(len(headers))}6")
        tbl.tableStyleInfo = style
        ws.add_table(tbl)
    last_row, new_cols, _ = write_sheet(wb, sheet_name, df)
    finish_sheet(wb, sheet_name, df, last_row)
    if present.get("copy_proposals.csv"):
        for c in headers:
            add_dict(sheet_name, c, f"Imported from copy_proposals.csv ({c}).", "Text",
                      "One row per proposed copy fix", "Dimension / evidence", "Blank + note")
    else:
        log(f"{sheet_name}: copy_proposals.csv not available - left pending note row")


# ---------------------------------------------------------------------------
# 01 Dashboard
# ---------------------------------------------------------------------------

def build_01(wb, issues_df):
    from openpyxl.styles import Font
    ws = wb["01_Dashboard"]
    bold = Font(bold=True)

    # --- patch the starter's pre-built merged-cell card layout (rows 1-30) so its
    # formulas cover the now-full tables instead of the 6/9/4-row starter seeds ---
    last04 = 5 + ROW_COUNTS["04_Page_Inventory"]
    last05 = 5 + ROW_COUNTS["05_Technical_QA"]
    last19 = 5 + ROW_COUNTS["19_Issues"]
    ws["G7"] = f"=COUNTA('04_Page_Inventory'!A6:A{last04})"
    ws["J7"] = f"=COUNTA('05_Technical_QA'!A6:A{last05})"
    ws["G11"] = f"=COUNTA('19_Issues'!A6:A{last19})"
    ws["C18"] = "Live URLs (in inventory)"
    for row in range(19, 25):
        ws.cell(row=row, column=3, value=f"=COUNTIF('04_Page_Inventory'!E6:E{last04},A{row})")
    ws["A27"] = ("NEXT GATE\nRaw tables are now populated from the 2026-09-15 audit run "
                 "(A0-A12). Re-run seo/tracking/scripts/build_workbook.py to refresh; "
                 "recalc_excel.ps1 + check_formula_errors.py before trusting the numbers.")

    r = 36

    def label(row, col, text, b=True):
        c = ws.cell(row=row, column=col, value=text)
        if b:
            c.font = bold
        return c

    label(r, 1, "Data freshness (as of this A10 build)"); r += 1
    for name, cfg_row in [("as_of_date", 6), ("gsc_last_complete_date", 9), ("ga4_last_complete_date", 10),
                           ("ledger_retrieved_header_date", 16)]:
        ws.cell(row=r, column=1, value=name)
        ws.cell(row=r, column=2, value=f"='25_Config'!B{cfg_row}")
        r += 1
    r += 1

    label(r, 1, "Coverage (04_Page_Inventory, excludes route_pattern_not_url)"); r += 1
    coverage_defs = [
        ("Known URLs", '=COUNTIFS(T04PageInventory[inventory_state],"<>route_pattern_not_url")'),
        ("Live-tested", '=COUNTIFS(T04PageInventory[audit_state],"*Live-tested*",'
                         'T04PageInventory[inventory_state],"<>route_pattern_not_url")'),
        ("Rendered", '=COUNTIFS(T04PageInventory[audit_state],"*Rendered*",'
                      'T04PageInventory[inventory_state],"<>route_pattern_not_url")'),
        ("Inspected", '=COUNTIFS(T04PageInventory[audit_state],"*Inspected*",'
                       'T04PageInventory[inventory_state],"<>route_pattern_not_url")'),
        ("Content-reviewed", '=COUNTIFS(T04PageInventory[audit_state],"*Content-reviewed*",'
                              'T04PageInventory[inventory_state],"<>route_pattern_not_url")'),
    ]
    for name, formula in coverage_defs:
        ws.cell(row=r, column=1, value=name)
        ws.cell(row=r, column=2, value=formula)
        r += 1
    r += 1

    label(r, 1, "Indexing eligibility (04_Page_Inventory coverage_state)"); r += 1
    for state in ["Submitted and indexed", "Crawled - currently not indexed",
                  "Discovered - currently not indexed", "Excluded by 'noindex' tag",
                  "Page with redirect", "Duplicate, Google chose different canonical than user"]:
        ws.cell(row=r, column=1, value=state)
        ws.cell(row=r, column=2, value=f'=COUNTIFS(T04PageInventory[coverage_state],"{state}")')
        r += 1
    r += 1

    label(r, 1, "Organic visibility per market: W1 (2026-08-15..09-11) vs W0 (2026-07-18..08-14)"); r += 1
    header_r = r
    for c, h in enumerate(["Market", "W1 impressions", "W0 impressions", "Impr. change %",
                            "W1 clicks", "CTR W1", "Weighted position (09)"], start=1):
        ws.cell(row=header_r, column=c, value=h).font = bold
    r += 1
    markets = ["Ireland", "Czechia", "Portugal", "Spain", "Romania", "Brazil"]
    for m in markets:
        ws.cell(row=r, column=1, value=m)
        ws.cell(row=r, column=2, value=f'=SUMIFS(T04PageInventory[gsc_impressions_W1],T04PageInventory[target_country],A{r})')
        ws.cell(row=r, column=3, value=f'=SUMIFS(T04PageInventory[gsc_impressions_W0],T04PageInventory[target_country],A{r})')
        ws.cell(row=r, column=4, value=f'=IFERROR(IF(OR(C{r}="",C{r}=0),"n/a",(B{r}-C{r})/C{r}),"n/a")')
        ws.cell(row=r, column=4).number_format = "0.00%"
        ws.cell(row=r, column=5, value=f'=SUMIFS(T04PageInventory[gsc_clicks_W1],T04PageInventory[target_country],A{r})')
        ws.cell(row=r, column=6, value=f'=IFERROR(E{r}/B{r},"n/a")')
        ws.cell(row=r, column=6).number_format = "0.00%"
        ws.cell(row=r, column=7, value=(f'=IFERROR(SUMPRODUCT((T09GSCPageDaily[target_country]=A{r})*'
                                         f'(T09GSCPageDaily[date]>=DATE(2026,8,15))*(T09GSCPageDaily[date]<=DATE(2026,9,11))*'
                                         f'T09GSCPageDaily[avg_position]*T09GSCPageDaily[impressions])/'
                                         f'SUMPRODUCT((T09GSCPageDaily[target_country]=A{r})*'
                                         f'(T09GSCPageDaily[date]>=DATE(2026,8,15))*(T09GSCPageDaily[date]<=DATE(2026,9,11))*'
                                         f'T09GSCPageDaily[impressions]),"n/a")'))
        r += 1
    r += 1

    label(r, 1, "Validated outcomes (11_GA4_Landing_Daily, valid windows only)"); r += 1
    ws.cell(row=r, column=1, value="Organic sessions (valid windows)")
    ws.cell(row=r, column=2, value='=SUM(T11GA4LandingDaily[sessions])')
    r += 1
    ws.cell(row=r, column=1, value="Key events (valid windows)")
    ws.cell(row=r, column=2, value='=SUM(T11GA4LandingDaily[key_events])')
    r += 1
    ws.cell(row=r, column=1, value="Purchases (valid windows)")
    ws.cell(row=r, column=2, value='=SUM(T11GA4LandingDaily[purchases])')
    r += 1
    ws.cell(row=r, column=1, value="Outage window (unmeasured, not zero)")
    ws.cell(row=r, column=2, value="2026-08-02 .. 2026-09-08")
    r += 2

    label(r, 1, "P0 BANNER", True)
    banner = ws.cell(row=r, column=2, value="TECH-001 (Ireland lab-tests 404s) and CPL-012 are P0 - see 19_Issues")
    banner.font = Font(bold=True, color="FFCC0000")
    r += 2

    label(r, 1, "Top 10 impressions gains (04_Page_Inventory, W1 vs W0, AGGREGATE ignores text/errors)"); r += 1
    header_r = r
    for c, h in enumerate(["Rank", "Value", "URL"], start=1):
        ws.cell(row=header_r, column=c, value=h).font = bold
    r += 1
    gains_start = r
    for k in range(1, 11):
        ws.cell(row=r, column=1, value=k)
        ws.cell(row=r, column=2, value=f'=IFERROR(AGGREGATE(14,6,T04PageInventory[impressions_change_pct],{k}),"")')
        ws.cell(row=r, column=2).number_format = "0.00%"
        ws.cell(row=r, column=3, value=(f'=IFERROR(INDEX(T04PageInventory[documented_url],'
                                         f'MATCH(B{r},T04PageInventory[impressions_change_pct],0)),"")'))
        r += 1
    r += 1
    label(r, 1, "Top 10 impressions declines (04_Page_Inventory, W1 vs W0)"); r += 1
    header_r = r
    for c, h in enumerate(["Rank", "Value", "URL"], start=1):
        ws.cell(row=header_r, column=c, value=h).font = bold
    r += 1
    for k in range(1, 11):
        ws.cell(row=r, column=1, value=k)
        ws.cell(row=r, column=2, value=f'=IFERROR(AGGREGATE(15,6,T04PageInventory[impressions_change_pct],{k}),"")')
        ws.cell(row=r, column=2).number_format = "0.00%"
        ws.cell(row=r, column=3, value=(f'=IFERROR(INDEX(T04PageInventory[documented_url],'
                                         f'MATCH(B{r},T04PageInventory[impressions_change_pct],0)),"")'))
        r += 1
    r += 1

    label(r, 1, "Top 10 issues by priority then score - refreshed by build_workbook.py "
                "(static block, not a live formula)"); r += 1
    header_r = r
    for c, h in enumerate(["issue_id", "priority", "priority_score (approx)", "category", "finding"], start=1):
        ws.cell(row=header_r, column=c, value=h).font = bold
    r += 1
    top10 = issues_df.copy()
    top10["_p"] = top10["priority"].map({"P0": 0, "P1": 1, "P2": 2, "P3": 3}).fillna(4)
    top10["_score"] = pd.to_numeric(top10.get("impact_1_5"), errors="coerce") * \
        pd.to_numeric(top10.get("confidence_0_1"), errors="coerce") / \
        pd.to_numeric(top10.get("effort_1_5"), errors="coerce").replace(0, pd.NA)
    top10 = top10.sort_values(["_p", "_score"], ascending=[True, False]).head(10)
    for _, row in top10.iterrows():
        ws.cell(row=r, column=1, value=clean_val(row.get("issue_id")))
        ws.cell(row=r, column=2, value=clean_val(row.get("priority")))
        sc = row.get("_score")
        ws.cell(row=r, column=3, value=round(sc, 2) if pd.notna(sc) else None)
        ws.cell(row=r, column=4, value=clean_val(row.get("category")))
        ws.cell(row=r, column=5, value=clean_val(row.get("finding")))
        r += 1
    r += 1

    label(r, 1, "Market table"); r += 1
    header_r = r
    for c, h in enumerate(["Market", "Configured locales", "Sitemap URLs (inventory)",
                            "Live 200", "Inspected & indexed", "W1 clicks", "W1 impressions"], start=1):
        ws.cell(row=header_r, column=c, value=h).font = bold
    r += 1
    for m in markets:
        ws.cell(row=r, column=1, value=m)
        ws.cell(row=r, column=2, value=f"=COUNTIF(T02MarketsLocales[target_country],A{r})")
        ws.cell(row=r, column=3, value=f'=COUNTIFS(T04PageInventory[target_country],A{r},T04PageInventory[in_sitemap],"yes")')
        ws.cell(row=r, column=4, value=f'=COUNTIFS(T04PageInventory[target_country],A{r},T04PageInventory[technical_status],"ok")')
        ws.cell(row=r, column=5, value=f'=COUNTIFS(T04PageInventory[target_country],A{r},T04PageInventory[coverage_state],"Submitted and indexed")')
        ws.cell(row=r, column=6, value=f"=SUMIFS(T04PageInventory[gsc_clicks_W1],T04PageInventory[target_country],A{r})")
        ws.cell(row=r, column=7, value=f"=SUMIFS(T04PageInventory[gsc_impressions_W1],T04PageInventory[target_country],A{r})")
        r += 1

    for col in "ABCDEFG":
        ws.column_dimensions[col].width = 26
    log(f"01_Dashboard: written through row {r}")


# ---------------------------------------------------------------------------
# 00 README
# ---------------------------------------------------------------------------

def build_00(wb):
    ws = wb["00_README"]
    extra = [
        ("A10 workbook build", "This workbook was populated 2026-09-15 by "
         "seo/tracking/scripts/build_workbook.py from seo/tracking/data/*.csv and "
         "seo/tracking/raw/2026-09-15/*. It is idempotent: re-running it always starts from a "
         "fresh copy of the starter and rebuilds every sheet."),
        ("Refresh flow", "See seo/tracking/scripts/README.md for the ongoing "
         "normalize -> upsert -> recalc -> check-errors flow. The OpenSEO connector only works "
         "inside a live session; nothing here is scheduled."),
        ("Grain decisions", "09/10/11/26 keep separate date-window grains and are never summed "
         "together. 09_GSC_Page_Daily is page x date x country=ALL x device=ALL x search_type; "
         "country/device detail lives in the sparse gsc_page_daily_country_device.csv side file "
         "(not loaded into a sheet). 10_GSC_Query_Daily is 2026-09-05..09-11 only "
         "(anonymized-query share ~80% of clicks - see 25_Config). 12_Monthly_Summary's 99-row "
         "formula grid (33 market/locale combos x 3 months) was already built into the starter; "
         "this build only appended the pre-launch Wix-period market=ALL rows."),
        ("New sheets", "27_Country_Coupling, 29_Country_Modules and 30_Scripts_Cleanup (hardcoded "
         "country-logic scan) and 28_Copy_Proposals (traced fixes for 19_Issues COPY-001) were "
         "added by this build; see 23_Data_Dictionary for every new column."),
        ("Pending at build time", "16_Content_Review, 17_pSEO_Plan and 28_Copy_Proposals were "
         "being written by other agents concurrently; see seo/tracking/raw/2026-09-15/A10-workbook/"
         "build-log.md for whether they landed inside the wait window."),
    ]
    ws_last = 30
    for i, (topic, text) in enumerate(extra):
        r = ws_last + i + 1
        ws.cell(row=r, column=1, value=topic)
        ws.cell(row=r, column=2, value=text)
    last_row = ws_last + len(extra)
    resize_table_and_format(wb, "00_README", last_row)
    ROW_COUNTS["00_README"] = last_row - 5
    log(f"00_README: {ROW_COUNTS['00_README']} rows")


# ---------------------------------------------------------------------------
# 23 Data Dictionary (append new-column entries)
# ---------------------------------------------------------------------------

def build_23(wb):
    ws = wb["23_Data_Dictionary"]
    existing = set()
    for r in range(6, ws.max_row + 1):
        s = ws.cell(row=r, column=1).value
        f = ws.cell(row=r, column=2).value
        if s and f:
            existing.add((s, f))
    seen = set()
    to_write = []
    for entry in NEW_DICT_ENTRIES:
        key = (entry[0], entry[1])
        if key in existing or key in seen:
            continue
        seen.add(key)
        to_write.append(entry)
    df = pd.DataFrame(to_write, columns=["sheet", "field", "definition", "type", "grain",
                                          "aggregation", "missing_rule"])
    start = 350
    last_row, new_cols, _ = write_sheet(wb, "23_Data_Dictionary", df, start_row=start)
    ROW_COUNTS["23_Data_Dictionary"] = max(0, last_row - 5)
    resize_table_and_format(wb, "23_Data_Dictionary", last_row)
    log(f"23_Data_Dictionary: {ROW_COUNTS['23_Data_Dictionary']} total rows "
        f"(344 starter + {len(df)} new-column entries appended)")


# ---------------------------------------------------------------------------
# 25 Config
# ---------------------------------------------------------------------------

def build_25(wb, head_commit):
    ws = wb["25_Config"]
    updates = {
        "gsc_last_complete_date": date(2026, 9, 11),
        "ga4_last_complete_date": date(2026, 9, 12),
        "reporting_currency": "EUR",
        "ledger_retrieved_header_date": date(2026, 9, 15),
    }
    table_last_row = int(re.search(r"\d+$", ws.tables[list(ws.tables.keys())[0]].ref).group())
    param_col, value_col = 1, 2
    found = set()
    for r in range(6, table_last_row + 1):
        p = ws.cell(row=r, column=param_col).value
        if p in updates:
            ws.cell(row=r, column=value_col, value=updates[p])
            found.add(p)

    new_rows = [
        ("audited_commit", head_commit,
         "Repository HEAD commit for this audit run", "git rev-parse HEAD"),
        ("production_build_marker", "451b23e72f7076f53a06364e06f86da74113d568",
         "source_revision seen on live production pages during the A2 probe", "A2-probe"),
        ("launch_date_evidence", "cutover ~2026-07-17..07-21: release/go-live merged 07-17, "
         "first current-shape impressions 07-20/21, daily impressions 631->1,188->2,343",
         "User-reported launch date corroborated by commit history and GSC impressions ramp",
         "A1/A3 evidence"),
        ("seo_start_evidence", "first feat(seo) commits 2026-07-26, bulk 2026-07-28",
         "Corroborates the user-reported early-August SEO start", "git log"),
        ("ga4_outage_window", "2026-08-02 to 2026-09-08",
         "GA4 collection gap; unmeasured, not zero", "A4-ga4/manifest-A4.json"),
        ("gsc_query_anonymized_share_W1", "80.6% clicks / 61.7% impressions",
         "Share of W1 clicks/impressions carried by privacy-omitted (anonymized) queries",
         "gsc_query_daily.csv vs gsc_page_daily.csv W1 totals"),
        ("credits_spent_openseo", 751, "OpenSEO/DataForSEO credits spent this audit run",
         "A0-access/data_access_2026-09-15.csv"),
        ("inspection_quota_used", 630, "URL Inspection API calls used (of 2,000/day quota)",
         "A3-gsc/inspect manifests"),
        ("urls_known", '=COUNTIFS(T04PageInventory[inventory_state],"<>route_pattern_not_url")',
         "Known URLs excluding route-pattern rows", "04_Page_Inventory"),
        ("live_tested", '=COUNTIFS(T04PageInventory[audit_state],"*Live-tested*")',
         "URLs with a live HTTP probe this run", "04_Page_Inventory"),
        ("rendered", '=COUNTIFS(T04PageInventory[audit_state],"*Rendered*")',
         "URLs checked via rendered-DOM browser inspection", "04_Page_Inventory"),
        ("inspected", '=COUNTIFS(T04PageInventory[audit_state],"*Inspected*")',
         "URLs checked via GSC URL Inspection", "04_Page_Inventory"),
        ("content_reviewed", '=COUNTIFS(T04PageInventory[audit_state],"*Content-reviewed*")',
         "URLs with a content_review.csv finding", "04_Page_Inventory"),
        ("page_daily_grain", "page x date; country/device grain is a sparse side file "
         "(gsc_page_daily_country_device.csv, ~35% of impressions), not loaded into a sheet",
         "Grain documentation for 09_GSC_Page_Daily", "seo/tracking/data/gsc_page_daily_country_device.csv"),
    ]
    r = table_last_row + 1
    for param, value, rule, source in new_rows:
        if param in found:
            continue
        ws.cell(row=r, column=1, value=param)
        ws.cell(row=r, column=2, value=value)
        ws.cell(row=r, column=3, value=rule)
        ws.cell(row=r, column=4, value=source)
        r += 1
    last_row = r - 1
    ROW_COUNTS["25_Config"] = max(0, last_row - 5)
    resize_table_and_format(wb, "25_Config", last_row)
    log(f"25_Config: {ROW_COUNTS['25_Config']} total rows")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def get_head_commit():
    try:
        import subprocess
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
        return out.stdout.strip() or "f055a9b78a567502051c7c81b9f9313da32cdc4d"
    except Exception:
        return "f055a9b78a567502051c7c81b9f9313da32cdc4d"


def main():
    t0 = time.time()
    os.makedirs(BUILD_LOG_DIR, exist_ok=True)
    log(f"Copying starter -> {OUT}")
    shutil.copyfile(STARTER, OUT)
    wb = openpyxl.load_workbook(OUT)

    pinv = read_csv("page_inventory.csv")
    locale_qa = read_csv("locale_data_qa.csv")
    full_map, path_map = find_url_id_maps(pinv)
    head_commit = get_head_commit()

    build_02(wb, locale_qa)
    build_03(wb)
    wb.save(OUT)
    log("saved after 02,03")

    crawl_hist, reprobed = build_08(wb, pinv)
    url_insp = read_csv("url_inspection.csv")
    build_04(wb, pinv, crawl_hist, url_insp, None)
    wb.save(OUT)
    log("saved after 08,04")

    build_05(wb)
    build_06(wb, locale_qa)
    build_07(wb)
    wb.save(OUT)
    log("saved after 05,06,07")

    build_09(wb, full_map, path_map)
    build_10(wb, full_map, path_map)
    build_11(wb, full_map, path_map)
    build_12(wb)
    wb.save(OUT)
    log("saved after 09,10,11,12")

    build_13(wb, full_map, path_map)
    build_14(wb)
    build_15(wb, full_map, path_map)
    build_18(wb)
    wb.save(OUT)
    log("saved after 13,14,15,18")

    build_19(wb)
    build_20(wb, head_commit)
    build_21(wb)
    build_22(wb)
    build_24(wb)
    wb.save(OUT)
    log("saved after 19,20,21,22,24")

    build_26(wb)
    build_new_table_sheet(wb, "27_Country_Coupling", "T27CountryCoupling", "country_coupling.csv",
                           "COUNTRY COUPLING",
                           "Hardcoded country-specific logic found by static scan; status/notes are proposals.")
    build_new_table_sheet(wb, "29_Country_Modules", "T29CountryModules", "country_modules.csv",
                           "COUNTRY MODULES",
                           "Modules/files that carry per-country data or gating; companion to 27_Country_Coupling.")
    build_new_table_sheet(wb, "30_Scripts_Cleanup", "T30ScriptsCleanup", "country_scripts_cleanup.csv",
                           "SCRIPTS CLEANUP",
                           "One-off/legacy scripts scan; recommended_action is a proposal, not an action taken.")
    wb.save(OUT)
    log("saved after 26,27,29,30")

    wait_minutes = float(os.environ.get("GH_SEO_WAIT_MINUTES", "40"))
    present = wait_for_dependency_files(max_minutes=wait_minutes)
    content_review_df = build_16(wb, present)
    build_17(wb, present)
    build_28(wb, present)
    wb.save(OUT)
    log("saved after 16,17,28")

    # re-derive 04's content_status/recommendation now that content_review may have landed
    if content_review_df is not None:
        cr_class = dict(zip(content_review_df["url_id"],
                             content_review_df.get("classification", pd.Series(dtype=object))))
        cr_rec = dict(zip(content_review_df["url_id"],
                           content_review_df.get("recommended_action", pd.Series(dtype=object))))
        ws4 = wb["04_Page_Inventory"]
        headers4 = sheet_headers(ws4)
        cs_col = headers4.index("content_status") + 1
        rec_col = headers4.index("recommendation") + 1
        nmd_col = headers4.index("next_measurement_date") + 1
        id_col = headers4.index("url_id") + 1
        last_r4 = 5 + ROW_COUNTS["04_Page_Inventory"]
        for r in range(6, last_r4 + 1):
            uid = ws4.cell(row=r, column=id_col).value
            cls = cr_class.get(uid)
            rec = cr_rec.get(uid)
            if cls:
                ws4.cell(row=r, column=cs_col, value=clean_val(cls))
            if rec:
                ws4.cell(row=r, column=rec_col, value=clean_val(rec))
                ws4.cell(row=r, column=nmd_col, value=date(2026, 10, 13))
        log("04_Page_Inventory: content_status/recommendation refreshed from content_review.csv")

    # Pull the real 19_Issues content back out for the dashboard's static top-10 block
    ws19 = wb["19_Issues"]
    headers19 = sheet_headers(ws19)
    last19 = 5 + ROW_COUNTS["19_Issues"]
    rows19 = []
    for r in range(6, last19 + 1):
        rows19.append({h: ws19.cell(row=r, column=i + 1).value for i, h in enumerate(headers19)})
    issues_df_for_dashboard = pd.DataFrame(rows19)

    build_01(wb, issues_df_for_dashboard)
    build_00(wb)
    build_23(wb)
    build_25(wb, head_commit)
    wb.save(OUT)
    log(f"saved final. elapsed={time.time()-t0:.1f}s")

    write_build_log(present, reprobed)


def write_build_log(present, reprobed):
    path = os.path.join(BUILD_LOG_DIR, "build-log.md")
    lines = ["# A10 workbook build log", "", f"Built: 2026-09-15, script: "
             "seo/tracking/scripts/build_workbook.py", "", "## Row counts per sheet", ""]
    for name, n in ROW_COUNTS.items():
        lines.append(f"- {name}: {n}")
    lines.append("")
    lines.append("## Pending dependency files at end of wait window")
    for k, v in present.items():
        lines.append(f"- {k}: {'present' if v else 'MISSING'}")
    lines.append("")
    lines.append(f"## 08_Crawl_History re-probed url_ids: {len(reprobed)}")
    lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    log(f"wrote {path}")


if __name__ == "__main__":
    main()
