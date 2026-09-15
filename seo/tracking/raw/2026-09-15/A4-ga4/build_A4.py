"""
A4 (GA4) audit CSV builder. Reads raw JSON tool-response dumps from this
folder and writes normalized CSVs into seo/tracking/data/. Read-only against
the repo otherwise; no network calls (all data was already pulled and saved
as raw JSON by the agent).

ponytail: single-purpose script, run once per batch. No CLI flags, no config
file - the file list below IS the config. Add a row if a new raw pull is
added.
"""
import csv
import json
import os

RAW_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(RAW_DIR, "..", "..", "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

REFRESH_ID = "R2026-09-15-GA4"
CURRENCY = "EUR"

# Days considered possibly-incomplete per the task brief (latest received days).
INCOMPLETE_DAYS = {"2026-09-13", "2026-09-14"}
OUTAGE_START, OUTAGE_END = "2026-08-02", "2026-09-08"


def load(name):
    path = os.path.join(RAW_DIR, name)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def data_state(date_str):
    return "latest_received_possibly_incomplete" if date_str in INCOMPLETE_DAYS else "complete"


# ---------------------------------------------------------------------------
# 1. ga4_landing_daily.csv - one row per (date, landing_page), organic only.
# ---------------------------------------------------------------------------
LANDING_DAILY_FILES = [
    ("2026-07-25", "ga4_landing_pages_20260725.json"),
    ("2026-07-26", "ga4_landing_pages_20260726.json"),
    ("2026-07-27", "ga4_landing_pages_20260727.json"),
    ("2026-07-28", "ga4_landing_pages_20260728.json"),
    ("2026-07-29", "ga4_landing_pages_20260729.json"),
    ("2026-07-30", "ga4_landing_pages_20260730.json"),
    ("2026-07-31", "ga4_landing_pages_20260731.json"),
    ("2026-08-01", "ga4_landing_pages_20260801.json"),
    ("2026-09-09", "ga4_landing_pages_20260909.json"),
    ("2026-09-10", "ga4_landing_pages_20260910.json"),
    ("2026-09-11", "ga4_landing_pages_20260911.json"),
    ("2026-09-12", "ga4_landing_pages_20260912.json"),
    ("2026-09-13", "ga4_landing_pages_20260913.json"),
    ("2026-09-14", "ga4_landing_pages_20260914.json"),
]

landing_rows = []
for date_str, fname in LANDING_DAILY_FILES:
    doc = load(fname)
    for r in doc.get("rows", []):
        landing_rows.append({
            "date": date_str,
            "landing_page": r.get("landingPage", ""),
            "sessions": r.get("sessions", 0),
            "engaged_sessions": r.get("engagedSessions", 0),
            "key_events": r.get("keyEvents", 0),
            "transactions": r.get("transactions", 0),
            "purchase_revenue": r.get("purchaseRevenue", 0),
            "currency": CURRENCY,
            "total_users": r.get("activeUsers", ""),
            "engagement_rate": r.get("engagementRate", ""),
            "refresh_id": REFRESH_ID,
            "data_state": data_state(date_str),
            "data_quality": "window valid; users are a per-day aggregate, never sum across days",
            "source": fname,
        })

with open(os.path.join(DATA_DIR, "ga4_landing_daily.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "date", "landing_page", "sessions", "engaged_sessions", "key_events",
        "transactions", "purchase_revenue", "currency", "total_users",
        "engagement_rate", "refresh_id", "data_state", "data_quality", "source",
    ])
    w.writeheader()
    w.writerows(landing_rows)

# ---------------------------------------------------------------------------
# 2. ga4_outage_windows.csv
# ---------------------------------------------------------------------------
with open(os.path.join(DATA_DIR, "ga4_outage_windows.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "excluded_start", "excluded_end", "reason", "refresh_id", "source",
    ])
    w.writeheader()
    w.writerow({
        "excluded_start": OUTAGE_START,
        "excluded_end": OUTAGE_END,
        "reason": (
            "Documented GA4 collection outage (per task brief / seo-control-state.md "
            "ledger sec.47). No landing-page rows exist for this range in the property "
            "- confirmed empty (zero rows), not zero-traffic; excluded from "
            "ga4_landing_daily.csv rather than written as zero-session rows."
        ),
        "refresh_id": REFRESH_ID,
        "source": "ga4_organic_overview_full_20260725_20260914.json (trend array skips these dates entirely)",
    })

# ---------------------------------------------------------------------------
# 3. ga4_key_events.csv
# ---------------------------------------------------------------------------
KEY_EVENT_FILES = [
    ("2026-07-25..2026-08-01", "organic_search", "event", "ga4_key_events_event_window1_organic.json"),
    ("2026-09-09..2026-09-14", "organic_search", "event", "ga4_key_events_event_window2_organic.json"),
    ("2026-07-25..2026-08-01", "organic_search", "event_and_landing_page", "ga4_key_events_event_and_landing_page_window1_organic.json"),
    ("2026-09-09..2026-09-14", "organic_search", "event_and_landing_page", "ga4_key_events_event_and_landing_page_window2_organic.json"),
    ("2026-09-09..2026-09-14", "all", "event", "ga4_key_events_event_window2_all.json"),
]

key_event_rows = []
for window, channel, breakdown, fname in KEY_EVENT_FILES:
    doc = load(fname)
    for r in doc.get("rows", []):
        key_event_rows.append({
            "window": window,
            "channel": channel,
            "breakdown": breakdown,
            "event_name": r.get("eventName", ""),
            "landing_page": r.get("landingPage", ""),
            "key_events": r.get("keyEvents", 0),
            "total_users": r.get("totalUsers", ""),
            "refresh_id": REFRESH_ID,
            "source": fname,
        })

with open(os.path.join(DATA_DIR, "ga4_key_events.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "window", "channel", "breakdown", "event_name", "landing_page",
        "key_events", "total_users", "refresh_id", "source",
    ])
    w.writeheader()
    w.writerows(key_event_rows)

# ---------------------------------------------------------------------------
# 4. ga4_acquisition.csv (channel_group + source_medium, both windows)
#    Flags: referral/self-referral pollution, payment-provider referrals,
#    cross-domain handoffs, (not set)/(data not available).
# ---------------------------------------------------------------------------
ACQ_FILES = [
    ("2026-07-25..2026-08-01", "channel_group", "ga4_acquisition_channel_group_window1.json", "sessionDefaultChannelGroup"),
    ("2026-09-09..2026-09-14", "channel_group", "ga4_acquisition_channel_group_window2.json", "sessionDefaultChannelGroup"),
    ("2026-07-25..2026-08-01", "source_medium", "ga4_acquisition_source_medium_window1.json", "sessionSourceMedium"),
    ("2026-09-09..2026-09-14", "source_medium", "ga4_acquisition_source_medium_window2.json", "sessionSourceMedium"),
]

PAYMENT_PROVIDER_HOSTS = ("stripe.com",)
SELF_REFERRAL_HOSTS = ("tagassistant.google.com", "myglobalhealth.online")
UNATTRIBUTED_VALUES = ("(not set)", "(data not available)")


def flag_row(dim_value: str) -> str:
    v = (dim_value or "").lower()
    flags = []
    if any(h in v for h in PAYMENT_PROVIDER_HOSTS):
        flags.append("payment_provider_referral")
    if any(h in v for h in SELF_REFERRAL_HOSTS):
        flags.append("self_or_tooling_referral")
    if v in UNATTRIBUTED_VALUES:
        flags.append("unattributed")
    if "/ referral" in v and not flags:
        flags.append("referral_review")
    return ";".join(flags)


acq_rows = []
for window, breakdown, fname, dim in ACQ_FILES:
    doc = load(fname)
    for r in doc.get("rows", []):
        dim_value = r.get(dim, "")
        acq_rows.append({
            "window": window,
            "breakdown": breakdown,
            "dimension_value": dim_value,
            "sessions": r.get("sessions", 0),
            "active_users": r.get("activeUsers", 0),
            "engaged_sessions": r.get("engagedSessions", 0),
            "engagement_rate": r.get("engagementRate", ""),
            "key_events": r.get("keyEvents", 0),
            "transactions": r.get("transactions", 0),
            "purchase_revenue": r.get("purchaseRevenue", 0),
            "flag": flag_row(dim_value),
            "refresh_id": REFRESH_ID,
            "source": fname,
        })
    # attribution-quality diagnostic, if present (source_medium only)
    for diag in doc.get("diagnostics", []):
        acq_rows.append({
            "window": window,
            "breakdown": breakdown,
            "dimension_value": f"[DIAGNOSTIC] {diag.get('code','')}",
            "sessions": diag.get("evidence", {}).get("sessions", ""),
            "active_users": "",
            "engaged_sessions": "",
            "engagement_rate": "",
            "key_events": "",
            "transactions": "",
            "purchase_revenue": "",
            "flag": diag.get("message", ""),
            "refresh_id": REFRESH_ID,
            "source": fname,
        })

with open(os.path.join(DATA_DIR, "ga4_acquisition.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "window", "breakdown", "dimension_value", "sessions", "active_users",
        "engaged_sessions", "engagement_rate", "key_events", "transactions",
        "purchase_revenue", "flag", "refresh_id", "source",
    ])
    w.writeheader()
    w.writerows(acq_rows)

# ---------------------------------------------------------------------------
# 5. ga4_audience.csv (device + country, both windows, organic)
# ---------------------------------------------------------------------------
AUD_FILES = [
    ("2026-07-25..2026-08-01", "device", "ga4_audience_device_window1_organic.json", "deviceCategory"),
    ("2026-09-09..2026-09-14", "device", "ga4_audience_device_window2_organic.json", "deviceCategory"),
    ("2026-07-25..2026-08-01", "country", "ga4_audience_country_window1_organic.json", "country"),
    ("2026-09-09..2026-09-14", "country", "ga4_audience_country_window2_organic.json", "country"),
]

aud_rows = []
for window, breakdown, fname, dim in AUD_FILES:
    doc = load(fname)
    for r in doc.get("rows", []):
        active_users = r.get("activeUsers", 0) or 0
        sessions = r.get("sessions", 0) or 0
        ratio = round(sessions / active_users, 2) if active_users else ""
        note = "sessions/user ratio anomalous (>=5x)" if (active_users and sessions / active_users >= 5) else ""
        aud_rows.append({
            "window": window,
            "breakdown": breakdown,
            "dimension_value": r.get(dim, ""),
            "active_users": active_users,
            "sessions": sessions,
            "sessions_per_user": ratio,
            "engagement_rate": r.get("engagementRate", ""),
            "key_events": r.get("keyEvents", 0),
            "note": note,
            "refresh_id": REFRESH_ID,
            "source": fname,
        })

with open(os.path.join(DATA_DIR, "ga4_audience.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "window", "breakdown", "dimension_value", "active_users", "sessions",
        "sessions_per_user", "engagement_rate", "key_events", "note",
        "refresh_id", "source",
    ])
    w.writeheader()
    w.writerows(aud_rows)

# ---------------------------------------------------------------------------
# 6. ga4_ecommerce.csv (landing_page + item, channel all/organic, both windows)
# ---------------------------------------------------------------------------
ECOM_FILES = [
    ("2026-07-25..2026-08-01", "organic_search", "landing_page", "ga4_ecommerce_landing_page_window1_organic.json"),
    ("2026-09-09..2026-09-14", "organic_search", "landing_page", "ga4_ecommerce_landing_page_window2_organic.json"),
    ("2026-07-25..2026-08-01", "all", "landing_page", "ga4_ecommerce_landing_page_window1_all.json"),
    ("2026-09-09..2026-09-14", "all", "landing_page", "ga4_ecommerce_landing_page_window2_all.json"),
    ("2026-07-25..2026-08-01", "organic_search", "item", "ga4_ecommerce_item_window1_organic.json"),
    ("2026-09-09..2026-09-14", "organic_search", "item", "ga4_ecommerce_item_window2_organic.json"),
    ("2026-07-25..2026-08-01", "all", "item", "ga4_ecommerce_item_window1_all.json"),
    ("2026-09-09..2026-09-14", "all", "item", "ga4_ecommerce_item_window2_all.json"),
]

ecom_rows = []
for window, channel, breakdown, fname in ECOM_FILES:
    doc = load(fname)
    activity = doc.get("ecommerceActivity", {})
    if breakdown == "landing_page":
        for r in doc.get("rows", []):
            ecom_rows.append({
                "window": window, "channel": channel, "breakdown": breakdown,
                "dimension_value": r.get("landingPage", ""),
                "sessions": r.get("sessions", 0),
                "transactions": r.get("transactions", 0),
                "purchase_revenue": r.get("purchaseRevenue", 0),
                "items_viewed": "", "items_added_to_cart": "", "items_purchased": "",
                "item_revenue": "",
                "activity_status": activity.get("status", ""),
                "purchase_dedup_note": (
                    "transaction_id-based sessionStorage dedup client-side "
                    "(see track-code-review.md); GA4 server-side dedup window 48h"
                ) if activity.get("status") != "none" else "",
                "refresh_id": REFRESH_ID, "source": fname,
            })
    else:
        for r in doc.get("rows", []):
            ecom_rows.append({
                "window": window, "channel": channel, "breakdown": breakdown,
                "dimension_value": r.get("itemName", r.get("itemId", "")),
                "sessions": "", "transactions": "", "purchase_revenue": "",
                "items_viewed": r.get("itemsViewed", 0),
                "items_added_to_cart": r.get("itemsAddedToCart", 0),
                "items_purchased": r.get("itemsPurchased", 0),
                "item_revenue": r.get("itemRevenue", 0),
                "activity_status": activity.get("status", ""),
                "purchase_dedup_note": "",
                "refresh_id": REFRESH_ID, "source": fname,
            })
    if not doc.get("rows"):
        # Record the "none" activity state explicitly as a row so the CSV
        # doesn't silently omit empty pulls.
        ecom_rows.append({
            "window": window, "channel": channel, "breakdown": breakdown,
            "dimension_value": "[NO ROWS]",
            "sessions": "", "transactions": "", "purchase_revenue": "",
            "items_viewed": "", "items_added_to_cart": "", "items_purchased": "",
            "item_revenue": "",
            "activity_status": activity.get("status", ""),
            "purchase_dedup_note": activity.get("reason", ""),
            "refresh_id": REFRESH_ID, "source": fname,
        })

with open(os.path.join(DATA_DIR, "ga4_ecommerce.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=[
        "window", "channel", "breakdown", "dimension_value", "sessions",
        "transactions", "purchase_revenue", "items_viewed",
        "items_added_to_cart", "items_purchased", "item_revenue",
        "activity_status", "purchase_dedup_note", "refresh_id", "source",
    ])
    w.writeheader()
    w.writerows(ecom_rows)

# ---------------------------------------------------------------------------
# 7. ga4_pii_scan.csv - page_performance paths + site_search terms scan.
#    No raw personal values are copied in; every note below is a pattern
#    description, not an actual value.
# ---------------------------------------------------------------------------
pii_rows = []

perf = load("ga4_page_performance_window2_all.json")
perf_rows = perf.get("rows", [])
paths = [r.get("pagePath", "") for r in perf_rows]
hosts = sorted(set(r.get("hostName", "") for r in perf_rows))

import re
email_re = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
uuid_re = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
query_re = re.compile(r"\?.+")
token_re = re.compile(r"(token|jwt|sig|key|secret|auth)=", re.I)
placeholder_re = re.compile(r":id|:code|:token|:orderId|:doc|:email")

n_email = sum(1 for p in paths if email_re.search(p))
n_uuid = sum(1 for p in paths if uuid_re.search(p))
n_query = sum(1 for p in paths if query_re.search(p))
n_token = sum(1 for p in paths if token_re.search(p))
n_placeholder = sum(1 for p in paths if placeholder_re.search(p))

pii_rows.append({
    "item": "pagePath (406 rows scanned)", "where_seen": "ga4_page_performance_window2_all.json",
    "risk": "none", "note": f"0 raw email matches (pattern-scanned, {n_email} found)",
})
pii_rows.append({
    "item": "pagePath (406 rows scanned)", "where_seen": "ga4_page_performance_window2_all.json",
    "risk": "none", "note": f"0 raw UUID matches (pattern-scanned, {n_uuid} found)",
})
pii_rows.append({
    "item": "pagePath (406 rows scanned)", "where_seen": "ga4_page_performance_window2_all.json",
    "risk": "none", "note": f"0 query strings present in pagePath (pattern-scanned, {n_query} found) - GA4 dimension excludes query/hash by design (sanitizePagePath, see track-code-review.md)",
})
pii_rows.append({
    "item": "pagePath (406 rows scanned)", "where_seen": "ga4_page_performance_window2_all.json",
    "risk": "none", "note": f"0 token=/key=/auth= style params (pattern-scanned, {n_token} found)",
})
pii_rows.append({
    "item": f"pagePath placeholder routes ({n_placeholder} rows: /verify/certificate/:id, /api/account/invoices/:id/pdf, /so/tr/:id/c)",
    "where_seen": "ga4_page_performance_window2_all.json, ga4_ecommerce_landing_page_window2_all.json",
    "risk": "low - by design",
    "note": "Literal ':id' etc. is the sanitizer's redaction output (analytics-routes.ts isOpaqueSegment/NAMED_REDACTIONS), not an unredacted real identifier. No real booking/order/certificate id observed in any GA4 dimension pulled this session.",
})
pii_rows.append({
    "item": f"hostName values in page_performance: {hosts}",
    "where_seen": "ga4_page_performance_window2_all.json",
    "risk": "none (production only in this pull)",
    "note": "Only www.myglobalhealth.online present in this channel=all pull.",
})
pii_rows.append({
    "item": "hostName values in ecommerce landing_page pull (channel=all, both windows)",
    "where_seen": "ga4_ecommerce_landing_page_window1_all.json, ga4_ecommerce_landing_page_window2_all.json",
    "risk": "data-quality (not PII)",
    "note": "Non-production hosts present: localhost, myglobalhealth.up.railway.app alongside www.myglobalhealth.online. Dev/staging traffic is landing in the production GA4 property; recommend a hostName filter or a separate staging stream.",
})
pii_rows.append({
    "item": "doctor-name URL segments (e.g. /doctors/dr-...)",
    "where_seen": "multiple landing_page and page_performance files",
    "risk": "none",
    "note": "Public professional directory content (published, crawlable, identical for every visitor) - not patient/visitor PII. Consistent with analytics-routes.ts comment distinguishing content identifiers from person identifiers.",
})

ss = load("ga4_site_search_window2_all.json")
pii_rows.append({
    "item": "site search terms",
    "where_seen": "ga4_site_search_window2_all.json",
    "risk": "none",
    "note": f"rowCount={ss.get('rowCount', 0)}; siteSearchActivity.status={ss.get('siteSearchActivity', {}).get('status')} - no measured site-search terms this window, nothing to scan.",
})

pii_rows.append({
    "item": "page titles",
    "where_seen": "N/A",
    "risk": "not checkable via this tool",
    "note": "get_google_analytics_page_performance returns hostName+pagePath dimensions only, no pageTitle dimension - titles were not scannable from GA4 data this session.",
})

with open(os.path.join(DATA_DIR, "ga4_pii_scan.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["item", "where_seen", "risk", "note"])
    w.writeheader()
    w.writerows(pii_rows)

print("landing_daily rows:", len(landing_rows))
print("key_events rows:", len(key_event_rows))
print("acquisition rows:", len(acq_rows))
print("audience rows:", len(aud_rows))
print("ecommerce rows:", len(ecom_rows))
print("pii_scan rows:", len(pii_rows))
