#!/usr/bin/env python
"""
A1 inventory builder — Global Health SEO master audit, 2026-09-15.

Re-runnable. Read-only on the repo; public GET only against
https://api.myglobalhealth.online (rate-limited to <=4 req/s).

Usage:  python build_inventory.py

Outputs (relative to this file's directory unless noted):
  routes.csv, excluded_routes.csv
  sitemap_urls.csv, sitemap_alternates.csv, sitemap-rules.md
  raw/api/**.json, entities.csv, api_access.csv
  redirects.csv (from redirects-dump.json, produced by dump-redirects.cjs
    via Next's own config loader — see manifest for how)
  legacy_urls.csv
  retired.csv
  markets_locales.csv
  normalization-rules.md
  manifest-A1.json
  ../../../data/page_inventory.csv
  ../../../data/inventory_counts.csv
"""
import csv
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from lxml import etree

REPO = Path(r"C:\Github\global-health-website")
OUT = Path(__file__).resolve().parent
DATA_OUT = REPO / "seo" / "tracking" / "data"
RAW_API = OUT / "raw" / "api"
DATE = "2026-09-15"
SITE = "https://www.myglobalhealth.online"
API_BASE = "https://api.myglobalhealth.online"
UA = "Mozilla/5.0 (compatible; GlobalHealthAudit/1.0; +https://www.myglobalhealth.online)"
SITEMAP_FILE = REPO / "seo/tracking/raw/2026-09-15/A0-access/sitemap-2026-09-15.xml"

RAW_API.mkdir(parents=True, exist_ok=True)
DATA_OUT.mkdir(parents=True, exist_ok=True)

manifest = {
    "agent": "A1-inventory",
    "date": DATE,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "sources": {},
    "counts": {},
    "exclusions": [],
    "api_blocked": [],
    "pagination_limits": "none observed; every list endpoint returned a flat array/object with no cursor/page params in the frontend fetch helpers",
    "notes": [],
}

# --------------------------------------------------------------------------
# 6. Country / locale configuration — parsed from frontend/data/countries.ts
# --------------------------------------------------------------------------

def parse_countries():
    src = (REPO / "frontend/data/countries.ts").read_text(encoding="utf-8")
    blocks = re.findall(r"\{\s*(?:code:\s*\"rm\".*?)?code:\s*\"(\w+)\".*?\n  \},", src, re.S)
    # simpler: split on top-level object literals inside the countries array
    countries = []
    array_match = re.search(r"export const countries: CountryConfig\[\] = \[(.*?)\n\];", src, re.S)
    body = array_match.group(1)
    # each entry starts with "{" at ~2-space indent and ends with matching "},"
    depth = 0
    cur = ""
    entries = []
    for ch in body:
        if ch == "{":
            depth += 1
        if depth > 0:
            cur += ch
        if ch == "}":
            depth -= 1
            if depth == 0 and cur.strip():
                entries.append(cur)
                cur = ""

    def field(pattern, block, default=None):
        m = re.search(pattern, block)
        return m.group(1) if m else default

    for i, block in enumerate(entries):
        code = field(r'code:\s*"(\w+)"', block)
        if not code:
            continue
        name = field(r'name:\s*"([^"]+)"', block)
        slug = field(r'slug:\s*"([^"]+)"', block)
        default_locale = field(r'defaultLocale:\s*"(\w+)"', block)
        locales_raw = field(r"supportedLocales:\s*\[([^\]]+)\]", block, "")
        locales = [l.strip().strip('"') for l in locales_raw.split(",") if l.strip()]
        tz = field(r'bookingTimezone:\s*"([^"]+)"', block)
        countries.append({
            "code": code,
            "name": name,
            "slug": slug,
            "default_locale": default_locale,
            "supported_locales": locales,
            "booking_timezone": tz,
            "order": i,
        })
    return countries


COUNTRIES = parse_countries()
CODE_TO_SLUG = {c["code"]: c["slug"] for c in COUNTRIES}
CODE_TO_COUNTRY = {c["code"]: c for c in COUNTRIES}


def hreflang_region(code):
    return code.upper()


def write_markets_locales():
    rows = []
    for c in COUNTRIES:
        default_lang = c["default_locale"]
        langs = [default_lang] + [l for l in c["supported_locales"] if l != default_lang]
        for lang in langs:
            key = f"{c['code'].upper()}-{lang}"
            rows.append({
                "market_locale_key": key,
                "target_country": c["name"],
                "country_code": c["code"],
                "country_slug": c["slug"],
                "language": lang,
                "hreflang_tag": f"{lang}-{hreflang_region(c['code'])}",
                "default_language": default_lang,
                "is_default": "yes" if lang == default_lang else "no",
                "configured_home_path": f"/{c['slug']}/{lang}",
                "booking_timezone": c["booking_timezone"],
                "currency": "",
                "source_file_line": "frontend/data/countries.ts",
            })
    path = OUT / "markets_locales.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    manifest["counts"]["markets_locales.csv"] = len(rows)
    if len(rows) != 33:
        manifest["notes"].append(
            f"markets_locales.csv has {len(rows)} rows, expected 33 — code and expectation disagree, investigate."
        )
    else:
        manifest["notes"].append("markets_locales.csv: 33 rows, matches expectation.")
    return rows


MARKET_LOCALE_ROWS = write_markets_locales()
CONFIGURED_COMBOS = {(r["country_code"], r["language"]) for r in MARKET_LOCALE_ROWS}

# Static, code-resident slug lists (not fetched via API — cheaper and more
# reliable than an extra endpoint per family; verified against source below).
# TOOL_SLUGS: frontend/lib/tools/registry.ts (`TOOLS[].slug`)
TOOL_SLUGS = [
    "bmi-calculator", "calorie-calculator", "blood-pressure-chart",
    "due-date-calculator", "adhd-test", "ovulation-calculator",
    "osteoporosis-risk-checker", "sore-throat-checker",
]
# LEGAL_TYPE_SLUGS: frontend/lib/content/get-country-legal.ts
LEGAL_TYPE_SLUGS = [
    "terms-of-service", "privacy-policy", "cookie-policy", "gdpr-notice",
    "data-processing-agreement", "refund-policy", "medical-disclaimer",
    "accessibility-statement", "complaints-procedure",
]

# --------------------------------------------------------------------------
# 1. Routes — walk frontend/app
# --------------------------------------------------------------------------

APP_DIR = REPO / "frontend/app"
EXCLUDED_GROUPS = {"(admin)", "(doctor)", "(corporate)"}


def is_excluded(parts):
    if "api" in parts:
        return "api route"
    for g in EXCLUDED_GROUPS:
        if g in parts:
            return f"portal-only tree {g}"
    if "(auth)" in parts and "account" in parts:
        return "portal-only tree (auth)/account"
    return None


def dynamic_segments(parts):
    return [p for p in parts if p.startswith("[")]


def strip_groups(parts):
    return [p for p in parts if not (p.startswith("(") and p.endswith(")"))]


def classify_page_type(parts):
    """parts = path segments under frontend/app, groups included, filename removed."""
    stripped_top = parts[0] if parts else ""
    if stripped_top == "(redirect)":
        return "legacy_redirect"
    if stripped_top == "(global)":
        sub = parts[1:]
        if not sub:
            return "root_home"
        head = sub[0]
        if head == "blog":
            return "blog_post" if len(sub) > 1 else "blog_index"
        if head in ("cart", "checkout"):
            return "checkout"
        if head == "contact":
            return "contact"
        if head in ("privacy", "terms"):
            return "legal"
        if head == "brazil" and len(sub) > 1 and sub[1] == "dr-renato":
            return "doctor"
        return "static_other"
    if stripped_top == "(portal)":
        sub = strip_groups(parts[1:])
        if not sub:
            return "static_other"
        head = sub[0]
        if head == "pay":
            return "api_or_asset"
        if head == "print":
            return "api_or_asset"
        return "static_other"
    if stripped_top == "[country]":
        sub = parts[2:]  # drop [country], [lang]
        if not sub:
            return "market_home"
        head = sub[0]
        table_single = {
            "about": "about", "contact": "contact", "faq": "faq",
            "pricing": "pricing", "book": "booking", "cart": "checkout",
            "checkout": "checkout", "prescriptions": "static_other",
            "specialist-consultation": "consult", "general-consultation": "consult",
            "dr-renato": "doctor",
        }
        if head in table_single:
            return table_single[head]
        if head == "blog":
            if len(sub) == 1:
                return "blog_index"
            if sub[1] == "[slug]":
                return "blog_post"
            if sub[1] == "page":
                return "blog_index"
            if sub[1] == "medical-review-policy":
                return "static_other"
            return "blog_index"
        if head == "book-a-test":
            return "booking"
        if head == "careers":
            return "careers"
        if head == "consult":
            return "consult"
        if head == "doctors":
            return "doctors_index" if len(sub) == 1 else "doctor"
        if head == "health":
            return "health_legacy"
        if head == "legal":
            return "legal"
        if head == "press":
            return "press"
        if head == "services":
            return "service"
        if head == "tests":
            return "tests_index" if len(sub) == 1 else "test"
        if head == "tools":
            return "tool"
        return "unknown"
    return "unknown"


def source_imports(text):
    mods = set()
    for m in re.finditer(r'from\s+"@/lib/(content|api|tools|seo)/([^"]+)"', text):
        mods.add(f"lib/{m.group(1)}/{m.group(2)}")
    return sorted(mods)


def build_routes():
    routes = []
    excluded = []
    for f in sorted(APP_DIR.rglob("*")):
        if f.name not in ("page.tsx", "route.ts"):
            continue
        rel = f.relative_to(REPO).as_posix()
        parts = f.relative_to(APP_DIR).parts[:-1]  # drop filename
        reason = is_excluded(parts)
        text = f.read_text(encoding="utf-8", errors="replace")
        if reason:
            excluded.append({"file": rel, "reason": reason})
            continue
        segs = strip_groups(list(parts))
        route_pattern = "/" + "/".join(segs) if segs else "/"
        dyn = dynamic_segments(list(parts))
        has_gsp = "generateStaticParams" in text
        dyn_export = None
        m = re.search(r'export const dynamic\s*=\s*"([^"]+)"', text)
        if m:
            dyn_export = m.group(1)
        page_type = classify_page_type(list(parts))
        routes.append({
            "route_pattern": route_pattern,
            "file": rel,
            "is_route_handler": "yes" if f.name == "route.ts" else "no",
            "dynamic_segments": "|".join(dyn),
            "has_generateStaticParams": "yes" if has_gsp else "no",
            "dynamic_export": dyn_export or "",
            "rendering": "dynamic" if (dyn_export == "force-dynamic") else ("static_params" if has_gsp else ("dynamic_params" if dyn else "static")),
            "page_type": page_type,
            "data_sources": "|".join(source_imports(text)),
        })
    with open(OUT / "routes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(routes[0].keys()))
        w.writeheader()
        w.writerows(routes)
    with open(OUT / "excluded_routes.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["file", "reason"])
        w.writeheader()
        w.writerows(excluded)
    manifest["counts"]["routes.csv"] = len(routes)
    manifest["counts"]["excluded_routes.csv"] = len(excluded)
    return routes, excluded


ROUTES, EXCLUDED_ROUTES = build_routes()

# --------------------------------------------------------------------------
# 2. Sitemap
# --------------------------------------------------------------------------

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9", "xhtml": "http://www.w3.org/1999/xhtml"}


def parse_sitemap():
    tree = etree.parse(str(SITEMAP_FILE))
    urlset = tree.getroot()
    urls = []
    alternates = []
    for url_el in urlset.findall("sm:url", NS):
        loc = url_el.findtext("sm:loc", namespaces=NS)
        lastmod = url_el.findtext("sm:lastmod", namespaces=NS) or ""
        links = url_el.findall("xhtml:link", NS)
        for link in links:
            alternates.append({
                "loc": loc,
                "hreflang": link.get("hreflang", ""),
                "href": link.get("href", ""),
            })
        urls.append({"loc": loc, "lastmod": lastmod, "alternates_count": len(links)})
    with open(OUT / "sitemap_urls.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["loc", "lastmod", "alternates_count"])
        w.writeheader()
        w.writerows(urls)
    with open(OUT / "sitemap_alternates.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["loc", "hreflang", "href"])
        w.writeheader()
        w.writerows(alternates)
    manifest["counts"]["sitemap_urls.csv"] = len(urls)
    manifest["counts"]["sitemap_alternates.csv"] = len(alternates)
    return urls, alternates


SITEMAP_URLS, SITEMAP_ALTS = parse_sitemap()

SITEMAP_RULES_MD = """# sitemap.ts rules (A1 note, {date})

Source: `frontend/app/sitemap.ts` (`export const dynamic = "force-dynamic"` —
rendered per-request, not at build time, because build-time can't reach the
backend API).

Entity families emitted: service detail (`/{{slug}}` under `/services`),
lab-test detail (emitted at `/lab-tests/{{slug}}` and hub `/lab-tests` — see
note below), doctor profile, blog post, legal document, SEO landing page,
membership plan hub (`/pricing`), job/careers, plus the country home + fixed
section routes (from the live admin country list via
`getPublicCountriesMerged`, not a hardcoded five).

Explicitly excluded by the file's own comments: the global `/` entry (country
picker, not a content target), the bare country root `/{{country}}`
(redirects to the default-locale home), all auth/account routes, and every
legacy Wix slug (deliberately NOT in the sitemap, but also NOT disallowed in
robots.txt — see file header comment, ranking-equity rationale).

Eligibility gates applied per entity, read straight from the sitemap code:
- Services: `isPublicServiceRecordIndexable(record, lang, defaultLocale)`,
  evaluated **per locale** (not on the merged/default-locale record) —
  deliberately, per an inline comment describing a past incident where the
  merged read hid an empty-content locale and shipped `<p><br/></p>` bodies
  into the sitemap.
- Doctors: `isPublicDoctorRecordIndexable`, same predicate the profile page
  uses for its own `noindex` decision (`publication-validation.ts`), which
  in turn reads `readyToIndex` (boolean field, or
  `editorialChecklist.readyToIndex === true`).
- Legal documents: locale membership from `exactLocalesForLegalType`
  (`get-country-legal.ts`) — a document must have a real per-locale
  translation row, not `resolveTranslation`'s fallback.
- Landing pages / plans / jobs / press: existence in the country's list
  response is the only gate visible in `sitemap.ts` itself; no separate
  indexability predicate is called for these families here.
- lastModified per hub page (country home, `/doctors`, `/blog`, ...) is the
  newest child timestamp of that country's own content, deliberately never
  build time (comment: a lastModified that moves every deploy gets discounted
  as a noise signal sitewide, "including for the detail pages where it IS
  accurate").

**Finding — route/sitemap path mismatch (verify live in A2):** `sitemap.ts`
pushes lab-test URLs at `/lab-tests/{{slug}}` and hub `/lab-tests`
(lines ~197, ~529), but there is no `/lab-tests` route anywhere under
`frontend/app` — the actual page is
`frontend/app/[country]/[lang]/tests/[testSlug]/page.tsx`, i.e. `/tests/{{slug}}`
and `/tests`. Every submitted `/lab-tests*` URL across all six markets appears
to have no matching frontend route. These rows are carried in
`page_inventory.csv` with `inventory_state=unknown` and a note; A2 should
confirm live status (expected: 404, or caught by some redirect/rewrite not
visible in `sitemap.ts`/`next.config.ts`/`proxy.ts` at a first read).
""".format(date=DATE)

(OUT / "sitemap-rules.md").write_text(SITEMAP_RULES_MD, encoding="utf-8")

# --------------------------------------------------------------------------
# 5. Retired content — frontend/lib/seo/gone-content.ts
# --------------------------------------------------------------------------


def parse_gone_content():
    src = (REPO / "frontend/lib/seo/gone-content.ts").read_text(encoding="utf-8")
    rows = []
    for m in re.finditer(
        r'country:\s*"([^"]+)".*?legacyPrefix:\s*"([^"]+)".*?slug:\s*"([^"]+)".*?clickCost:\s*\n?\s*"([^"]*)".*?approvedBy:\s*"([^"]*)"',
        src, re.S):
        country, prefix, slug, click_cost, approved_by = m.groups()
        for path in [f"/{prefix}/{slug}"] + [f"/{loc}/{prefix}/{slug}" for loc in ["en", "pt", "es", "cs", "ro", "de"]]:
            rows.append({"path": path, "kind": "gone_doctor", "reason": f"departed clinician: {click_cost}", "approved_by": approved_by})
    retired_block = re.search(r"RETIRED_LEGACY_URLS[^=]*=\s*\[(.*)\];\n\nexport const RETIRED_LEGACY_PATHS", src, re.S)
    if retired_block:
        for pm in re.finditer(r'"(/[^"]*)"', retired_block.group(1)):
            rows.append({"path": pm.group(1), "kind": "retired_legacy_url", "reason": "Wix alias/placeholder — see gone-content.ts", "approved_by": "Site owner instruction, 2026-08-17"})
    with open(OUT / "retired.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["path", "kind", "reason", "approved_by"])
        w.writeheader()
        w.writerows(rows)
    manifest["counts"]["retired.csv"] = len(rows)
    return rows


RETIRED_ROWS = parse_gone_content()

# --------------------------------------------------------------------------
# 4a. Redirects — from redirects-dump.json (produced by dump-redirects.cjs,
#     which loads next.config.ts through Next's own config loader so
#     programmatically-generated rules are captured, not just literal ones)
# --------------------------------------------------------------------------

DUMP_SRC = Path(r"C:\Users\kingh\AppData\Local\Temp\claude\C--Github-global-health-website\cdf8a9c7-585a-4cb1-a27c-811646e1c491\scratchpad\redirects-dump.json")
DUMP_DEST = OUT / "redirects-dump.json"


def load_redirects():
    if DUMP_SRC.exists():
        DUMP_DEST.write_text(DUMP_SRC.read_text(encoding="utf-8"), encoding="utf-8")
    data = json.loads(DUMP_DEST.read_text(encoding="utf-8"))
    rows = []
    for i, r in enumerate(data):
        rows.append({
            "rule_order_index": i,
            "source": r.get("source", ""),
            "destination": r.get("destination", ""),
            "permanent": r.get("permanent", ""),
            "statusCode": r.get("statusCode", ""),
            "has": json.dumps(r.get("has")) if r.get("has") else "",
            "missing": json.dumps(r.get("missing")) if r.get("missing") else "",
            "locale": r.get("locale", ""),
        })
    with open(OUT / "redirects.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    manifest["counts"]["redirects.csv"] = len(rows)
    manifest["notes"].append(
        f"redirects.csv has {len(rows)} fully-resolved rules (next.config.ts:redirects() executed via "
        "Next's own loader, next/dist/server/config.js#loadConfig, in dump-redirects.cjs — captures rules "
        "built by JS loops/maps, e.g. localizedSlugRenames, which a source-text regex would under-count). "
        "CLAUDE.md's '~276 rules' refers to literal rule blocks in the source file, not the expanded count."
    )
    return rows


REDIRECT_ROWS = load_redirects()

# --------------------------------------------------------------------------
# 4b. Legacy URL lists — grep repo for Wix-era exports
# --------------------------------------------------------------------------

LEGACY_SEARCH_DIRS = ["myglobalhealth.online-audit", "seo", "docs"]
LEGACY_PATTERNS = [
    re.compile(r"https?://(?:www\.)?myglobalhealth\.online(/[^\s\"'<>]*(?:wix|-doctors/|/post/|product-page|gift-card|/items-?\d|/general-\d|_files)[^\s\"'<>]*)", re.I),
    re.compile(r'"(/(?:[a-z]{2}/)?[a-z0-9-]*-doctors/[a-z0-9-]+)"', re.I),
]


LEGACY_SCAN_MAX_BYTES = 2_000_000  # seo/ holds many 3-9MB crawl/rollout JSON dumps
LEGACY_QUICK_CHECK = re.compile(rb"wix|-doctors/|/post/|wixsite|_files|product-page|gift-card", re.I)


def find_legacy_urls():
    """Pure-stdlib scan, size-capped: seo/ is ~800MB across 2.5k files, and a
    handful of them are 3-9MB rollout/crawl JSON dumps — reading every file
    unconditionally (first attempt) hung for minutes. Skipping anything over
    LEGACY_SCAN_MAX_BYTES keeps this to a few seconds while still covering the
    small URL-list/GSC-export files this step actually targets."""
    rows = []
    seen = set()
    skipped_large = 0
    for base_name in LEGACY_SEARCH_DIRS:
        base = REPO / base_name
        if not base.exists():
            continue
        for f in base.rglob("*"):
            if not f.is_file() or f.suffix.lower() not in (".json", ".md", ".txt", ".csv", ".html"):
                continue
            if "tracking" in f.parts and "raw" in f.parts:
                continue  # our own audit output, not a legacy source
            try:
                size = f.stat().st_size
            except OSError:
                continue
            if size > LEGACY_SCAN_MAX_BYTES:
                skipped_large += 1
                continue
            try:
                raw = f.read_bytes()
            except Exception:
                continue
            if not LEGACY_QUICK_CHECK.search(raw):
                continue
            text = raw.decode("utf-8", errors="ignore")
            rel = f.relative_to(REPO).as_posix()
            for pat in LEGACY_PATTERNS:
                for pm in pat.finditer(text):
                    raw_url = pm.group(1) if pm.groups() else pm.group(0)
                    key = (raw_url, rel)
                    if key in seen:
                        continue
                    seen.add(key)
                    kind = "wix_doctor_slug" if "-doctors/" in raw_url else "wix_alias_or_placeholder"
                    rows.append({"raw_url": raw_url, "source_file": rel, "kind": kind})
    with open(OUT / "legacy_urls.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["raw_url", "source_file", "kind"])
        w.writeheader()
        w.writerows(rows)
    manifest["counts"]["legacy_urls.csv"] = len(rows)
    manifest["notes"].append(
        f"legacy_urls.csv: scanned myglobalhealth.online-audit/, seo/ (~800MB/2.5k files), docs/, skipping "
        f"{skipped_large} files over {LEGACY_SCAN_MAX_BYTES} bytes (large rollout/crawl JSON dumps, not URL-list "
        "exports) — an uncapped first attempt hung for minutes and was killed."
    )
    return rows


LEGACY_URL_ROWS = find_legacy_urls()

# --------------------------------------------------------------------------
# 3. Public API entities
# --------------------------------------------------------------------------

session_last_call = [0.0]
MIN_INTERVAL = 0.26  # <4 req/s


def http_get(path):
    time.sleep(max(0, MIN_INTERVAL - (time.time() - session_last_call[0])))
    url = API_BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    session_last_call[0] = time.time()
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read()
            return resp.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode("utf-8")


api_access_rows = []
entity_rows = []


def record_access(endpoint, status, note=""):
    api_access_rows.append({"endpoint": endpoint, "status": status, "note": note})
    if status is None or (isinstance(status, int) and status >= 400):
        manifest["api_blocked"].append({"endpoint": endpoint, "status": status, "note": note})


def save_raw(subdir, name, body):
    d = RAW_API / subdir
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{name}.json").write_bytes(body)


def fetch_json(path, subdir, name):
    status, body = http_get(path)
    save_raw(subdir, name, body)
    if status != 200:
        record_access(path, status, "non-200, stopped retrying")
        return None
    record_access(path, status)
    try:
        return json.loads(body)
    except Exception as e:
        record_access(path, "json-parse-error", str(e))
        return None


def unwrap(payload, *keys):
    """Try nested keys ('data','services') then fall back to payload itself if it's already a list."""
    cur = payload
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            break
    if isinstance(cur, list):
        return cur
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return payload["data"]
    return []


def add_entity(entity_type, country, locale, slug, pub_state, first_published, source_endpoint, extra=""):
    eid = f"{entity_type}:{country}:{slug}"
    entity_rows.append({
        "content_entity_id": eid,
        "entity_type": entity_type,
        "country": country,
        "locale": locale,
        "slug": slug,
        "publication_state": pub_state,
        "first_published": first_published or "",
        "source_endpoint": source_endpoint,
        "extra": extra,
    })
    return eid


def pub_state_of(row, kind):
    """Verbatim-ish publication flags, joined, per record — field names kept as the API sends them."""
    parts = []
    for k in ("isActive", "published", "isPublished", "readyToIndex", "status", "isDraft", "noindex"):
        if isinstance(row, dict) and k in row:
            parts.append(f"{k}={row[k]}")
    if isinstance(row, dict) and isinstance(row.get("editorialChecklist"), dict):
        rti = row["editorialChecklist"].get("readyToIndex")
        if rti is not None:
            parts.append(f"editorialChecklist.readyToIndex={rti}")
    return ";".join(parts) if parts else "unknown"


def first_pub_of(row):
    for k in ("firstPublishedAt", "publishedAt", "createdAt"):
        if isinstance(row, dict) and row.get(k):
            return row[k]
    return ""


def fetch_entities():
    # /api/countries — cross-check
    countries_payload = fetch_json("/api/countries", "countries", "all")

    for c in COUNTRIES:
        code = c["code"]
        langs = [c["default_locale"]] + [l for l in c["supported_locales"] if l != c["default_locale"]]
        for lang in langs:
            up = lang.upper()

            # services
            payload = fetch_json(f"/api/countries/{code}/services?locale={up}", "services", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload):
                    if isinstance(row, dict) and row.get("slug"):
                        add_entity("service", code, lang, row["slug"], pub_state_of(row, "service"),
                                    first_pub_of(row), f"/api/countries/{code}/services?locale={up}",
                                    extra=f"kind={row.get('kind','')}")

            # doctors
            payload = fetch_json(f"/api/countries/{code}/doctors?locale={up}", "doctors", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload):
                    slug = row.get("slug") if isinstance(row, dict) else None
                    if slug:
                        add_entity("doctor", code, lang, slug, pub_state_of(row, "doctor"),
                                    first_pub_of(row), f"/api/countries/{code}/doctors?locale={up}")

            # health-tests (backs /tests, /tests/[slug])
            payload = fetch_json(f"/api/countries/{code}/health-tests?locale={up}", "health-tests", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload):
                    slug = row.get("slug") if isinstance(row, dict) else None
                    if slug:
                        add_entity("other", code, lang, slug, pub_state_of(row, "test"),
                                    first_pub_of(row), f"/api/countries/{code}/health-tests?locale={up}",
                                    extra="subtype=health_test")

            # plans (feed /pricing hub, no own URL)
            payload = fetch_json(f"/api/countries/{code}/plans?locale={up}", "plans", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload, "plans"):
                    ident = row.get("id") or row.get("slug") if isinstance(row, dict) else None
                    if ident:
                        add_entity("plan", code, lang, str(ident), pub_state_of(row, "plan"),
                                    first_pub_of(row), f"/api/countries/{code}/plans?locale={up}")

            # landing pages (page_content, render via /services/[slug])
            payload = fetch_json(f"/api/public/countries/{code}/landing-pages?locale={up}", "landing-pages", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload, "landingPages"):
                    slug = row.get("slug") if isinstance(row, dict) else None
                    if slug:
                        add_entity("page_content", code, lang, slug, pub_state_of(row, "landing"),
                                    row.get("updatedAt", "") if isinstance(row, dict) else "",
                                    f"/api/public/countries/{code}/landing-pages?locale={up}")

            # jobs (careers)
            payload = fetch_json(f"/api/public/jobs?countryCode={code}&locale={up}", "jobs", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload, "jobs"):
                    slug = row.get("slug") if isinstance(row, dict) else None
                    if slug:
                        add_entity("other", code, lang, slug, pub_state_of(row, "job"),
                                    first_pub_of(row), f"/api/public/jobs?countryCode={code}&locale={up}",
                                    extra="subtype=job")

            # blog, country-scoped
            payload = fetch_json(f"/api/blog?countryCode={code}&locale={up}&view=summary", "blog", f"{code}-{lang}")
            if payload is not None:
                for row in unwrap(payload, "posts"):
                    slug = row.get("slug") if isinstance(row, dict) else None
                    if slug:
                        add_entity("blog", code, lang, slug, pub_state_of(row, "blog"),
                                    first_pub_of(row), f"/api/blog?countryCode={code}&locale={up}&view=summary")

    # global blog (no country) — backs (global)/blog/[slug]
    payload = fetch_json("/api/blog?view=summary", "blog", "global")
    if payload is not None:
        for row in unwrap(payload, "posts"):
            slug = row.get("slug") if isinstance(row, dict) else None
            if slug:
                add_entity("blog", "global", "", slug, pub_state_of(row, "blog"),
                            first_pub_of(row), "/api/blog?view=summary")

    with open(OUT / "entities.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["content_entity_id", "entity_type", "country", "locale", "slug",
                                            "publication_state", "first_published", "source_endpoint", "extra"])
        w.writeheader()
        w.writerows(entity_rows)
    with open(OUT / "api_access.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["endpoint", "status", "note"])
        w.writeheader()
        w.writerows(api_access_rows)
    manifest["counts"]["entities.csv"] = len(entity_rows)
    manifest["counts"]["api_access.csv"] = len(api_access_rows)


fetch_entities()

# --------------------------------------------------------------------------
# 7. Normalization rules
# --------------------------------------------------------------------------

NORMALIZATION_MD = """# URL normalization rules (A1, {date})

- scheme: `https`
- host: `www.myglobalhealth.online` (apex + `http://` + bare `myglobalhealth.online` 301 here — confirmed in A0)
- trailing slash: stripped, except for the root `/` itself (confirmed: trailing slash 308s to no-slash)
- path case: preserved as-is (no case-folding — several legacy Wix slugs carry mixed case, e.g. `dr-yliana-muñoz-bravo`)
- query strings: kept as a **separate raw row**, flagged `parameter` in `inventory_state`/notes rather than merged into the base URL's row
- percent-decoding: NOT applied — raw percent-encoded octets are preserved verbatim in `normalized_url`
- fragment (`#...`): stripped
""".format(date=DATE)
(OUT / "normalization-rules.md").write_text(NORMALIZATION_MD, encoding="utf-8")


def normalize_url(raw):
    """raw: absolute URL or bare path. Returns (normalized_url, is_parameter)."""
    if raw.startswith("http://") or raw.startswith("https://"):
        rest = re.sub(r"^https?://", "", raw)
        rest = re.sub(r"^[^/]+", "", rest)  # drop host
    else:
        rest = raw
    if "#" in rest:
        rest = rest.split("#", 1)[0]
    is_param = "?" in rest
    path = rest.split("?", 1)[0]
    if not path.startswith("/"):
        path = "/" + path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return f"{SITE}{path}", is_param


# --------------------------------------------------------------------------
# 8. page_inventory.csv build
# --------------------------------------------------------------------------

PATH_RE_MARKET_HOME = re.compile(r"^/([a-z]+)/([a-z]{2})$")
HOME_SPECIALS = {  # (country_slug, lang) -> url_id
    ("ireland", "en"): "HOME-IE",
    ("czechia", "cs"): "HOME-CZ",
    ("portugal", "pt"): "HOME-PT",
    ("spain", "es"): "HOME-ES",
    ("romania", "ro"): "HOME-RO",
    ("brazil", "pt"): "HOME-BR",
}
SLUG_TO_CODE_MAP = {c["slug"]: c["code"] for c in COUNTRIES}


def infer_market_locale(path):
    """From a /{slug}/{lang}/... path, return (country_name, language, locale_tag) or (None,None,None)."""
    m = re.match(r"^/([a-z0-9-]+)/([a-z]{2})(?:/|$)", path)
    if not m:
        return None, None, None
    slug, lang = m.group(1), m.group(2)
    code = SLUG_TO_CODE_MAP.get(slug)
    if not code:
        return None, None, None
    return CODE_TO_COUNTRY[code]["name"], lang, f"{lang}-{hreflang_region(code)}"


def classify_url_page_type(path):
    """Classify a normalized path (no host) into a page_type, mirroring classify_page_type
    but operating on a URL string instead of a filesystem route."""
    if path == "/":
        return "root_home"
    parts = [p for p in path.split("/") if p]
    m = re.match(r"^([a-z0-9-]+)$", parts[0]) if parts else None
    slug0 = parts[0] if parts else ""
    if slug0 in SLUG_TO_CODE_MAP:
        sub = parts[2:] if len(parts) >= 2 else []
        if len(parts) == 2:
            return "market_home"
        if not sub:
            return "unknown"
        head = sub[0]
        table_single = {
            "about": "about", "contact": "contact", "faq": "faq",
            "pricing": "pricing", "book": "booking", "cart": "checkout",
            "checkout": "checkout", "prescriptions": "static_other",
            "specialist-consultation": "consult", "general-consultation": "consult",
            "dr-renato": "doctor",
        }
        if head in table_single:
            return table_single[head]
        if head == "blog":
            return "blog_post" if len(sub) > 1 and sub[1] not in ("page",) else "blog_index"
        if head == "book-a-test":
            return "booking"
        if head == "careers":
            return "careers"
        if head == "consult":
            return "consult"
        if head == "doctors":
            return "doctors_index" if len(sub) == 1 else "doctor"
        if head == "health":
            return "health_legacy"
        if head == "legal":
            return "legal"
        if head == "press":
            return "press"
        if head == "services":
            return "service"
        if head == "tests":
            return "tests_index" if len(sub) == 1 else "test"
        if head == "tools":
            return "tool"
        # e.g. "lab-tests" — no matching route family
        return "unknown"
    if slug0 == "blog":
        return "blog_post" if len(parts) > 1 else "blog_index"
    if slug0 in ("cart", "checkout"):
        return "checkout"
    if slug0 == "contact":
        return "contact"
    if slug0 in ("privacy", "terms"):
        return "legal"
    return "unknown"


inv = {}  # normalized_url -> record dict


def touch(normalized_url, is_param):
    if normalized_url not in inv:
        path = normalized_url[len(SITE):] or "/"
        country, lang, locale_tag = infer_market_locale(path)
        inv[normalized_url] = {
            "raw_urls": set(),
            "target_country": country or "",
            "language": lang or "",
            "locale_tag": locale_tag or "",
            "page_type": classify_url_page_type(path),
            "template_file": "",
            "source_file_or_model": "",
            "discovery_sources": set(),
            "in_sitemap": "no",
            "sitemap_lastmod": "",
            "first_published": "",
            "content_entity_id": "",
            "notes": [],
            "is_parameter": is_param,
        }
    return inv[normalized_url]


# route -> page_type file map, for template_file backfill
ROUTE_BY_TYPE = {}
for r in ROUTES:
    ROUTE_BY_TYPE.setdefault(r["page_type"], []).append(r["file"])

# A. sitemap
for row in SITEMAP_URLS:
    norm, is_param = normalize_url(row["loc"])
    rec = touch(norm, is_param)
    rec["raw_urls"].add(row["loc"])
    rec["discovery_sources"].add("sitemap")
    rec["in_sitemap"] = "yes"
    rec["sitemap_lastmod"] = row["lastmod"]

# B. route-enumerable static families
STATIC_SINGLE_TYPES = [
    "about", "contact", "faq", "pricing", "booking", "checkout", "consult",
    "doctors_index", "blog_index", "tests_index", "careers", "static_other",
]
for c in COUNTRIES:
    langs = [c["default_locale"]] + [l for l in c["supported_locales"] if l != c["default_locale"]]
    for lang in langs:
        base = f"/{c['slug']}/{lang}"
        norm, _ = normalize_url(base)
        rec = touch(norm, False)
        rec["discovery_sources"].add("route")
        rec["template_file"] = "frontend/app/[country]/[lang]/page.tsx"
        for suffix, ptype in [
            ("/about", "about"), ("/contact", "contact"), ("/faq", "faq"),
            ("/pricing", "pricing"), ("/book", "booking"), ("/cart", "checkout"),
            ("/checkout", "checkout"), ("/checkout/success", "checkout"), ("/checkout/cancelled", "checkout"),
            ("/prescriptions", "static_other"), ("/specialist-consultation", "consult"),
            ("/general-consultation", "consult"), ("/doctors", "doctors_index"),
            ("/blog", "blog_index"), ("/tests", "tests_index"), ("/book-a-test", "booking"),
            ("/careers", "careers"), ("/press", "press"), ("/legal", "legal"),
        ]:
            norm2, _ = normalize_url(base + suffix)
            rec2 = touch(norm2, False)
            rec2["discovery_sources"].add("route")

        # tools (8 slugs, per TOOL_SLUGS)
        for slug in TOOL_SLUGS:
            norm3, _ = normalize_url(f"{base}/tools/{slug}")
            rec3 = touch(norm3, False)
            rec3["discovery_sources"].add("route")
            rec3["template_file"] = "frontend/app/[country]/[lang]/tools/[slug]/page.tsx"

        # legal doc types (9 slugs) — CMS-gated, route enumerable but may not be published
        for lslug in LEGAL_TYPE_SLUGS:
            norm4, _ = normalize_url(f"{base}/legal/{lslug}")
            rec4 = touch(norm4, False)
            rec4["discovery_sources"].add("route")
            rec4["template_file"] = "frontend/app/[country]/[lang]/legal/[type]/page.tsx"

# press releases (code-resident, 2 markets only: cz, ie)
for code, slug in [("cz", "global-health-launches-online-platform-czechia"), ("ie", "global-health-launches-new-platform")]:
    c = CODE_TO_COUNTRY[code]
    langs = [c["default_locale"]] + [l for l in c["supported_locales"] if l != c["default_locale"]]
    for lang in langs:
        norm, _ = normalize_url(f"/{c['slug']}/{lang}/press/{slug}")
        rec = touch(norm, False)
        rec["discovery_sources"].add("route")
        rec["template_file"] = "frontend/lib/content/press-releases/index.ts"

# root home + global static pages
for path in ["/", "/access-request", "/cart", "/checkout", "/checkout/success", "/checkout/cancelled",
             "/contact", "/cross-border-consent", "/patient-upload", "/pay-status", "/privacy", "/terms",
             "/login", "/register", "/forgot-password", "/reset-password", "/verify-email",
             "/reviews/rate", "/unauthorized", "/unsubscribe"]:
    norm, _ = normalize_url(path)
    rec = touch(norm, False)
    rec["discovery_sources"].add("route")

# C. CMS entities
ENTITY_URL_BUILDERS = {
    "service": lambda e: f"/{CODE_TO_COUNTRY[e['country']]['slug']}/{e['locale']}/services/{e['slug']}" if e["country"] in CODE_TO_COUNTRY else None,
    "page_content": lambda e: f"/{CODE_TO_COUNTRY[e['country']]['slug']}/{e['locale']}/services/{e['slug']}" if e["country"] in CODE_TO_COUNTRY else None,
    "doctor": lambda e: f"/{CODE_TO_COUNTRY[e['country']]['slug']}/{e['locale']}/doctors/{e['slug']}" if e["country"] in CODE_TO_COUNTRY else None,
}


def entity_url(e):
    if e["entity_type"] in ENTITY_URL_BUILDERS:
        return ENTITY_URL_BUILDERS[e["entity_type"]](e)
    if e["entity_type"] == "blog":
        if e["country"] == "global" or not e["country"]:
            return f"/blog/{e['slug']}"
        c = CODE_TO_COUNTRY.get(e["country"])
        return f"/{c['slug']}/{e['locale']}/blog/{e['slug']}" if c else None
    if e["entity_type"] == "other" and "health_test" in e.get("extra", ""):
        c = CODE_TO_COUNTRY.get(e["country"])
        return f"/{c['slug']}/{e['locale']}/tests/{e['slug']}" if c else None
    if e["entity_type"] == "other" and "job" in e.get("extra", ""):
        c = CODE_TO_COUNTRY.get(e["country"])
        return f"/{c['slug']}/{e['locale']}/careers/{e['slug']}" if c else None
    return None  # plan: no own URL, feeds /pricing


UNPUBLISHED_MARK = re.compile(r"\b(isActive=False|published=False|isPublished=False|readyToIndex=False|status=DRAFT|isDraft=True|noindex=True)\b", re.I)

for e in entity_rows:
    path = entity_url(e)
    if not path:
        continue
    norm, _ = normalize_url(path)
    rec = touch(norm, False)
    rec["discovery_sources"].add("cms")
    rec["content_entity_id"] = e["content_entity_id"]
    rec["first_published"] = e["first_published"]
    combo = (e["country"], e["locale"])
    if e["country"] not in ("global", "") and combo not in CONFIGURED_COMBOS:
        rec["notes"].append(f"unsupported combo {combo}")
        rec["_unsupported"] = True
    if UNPUBLISHED_MARK.search(e["publication_state"] or ""):
        rec["_unpublished"] = True
        rec["notes"].append(f"publication_state={e['publication_state']}")

# D. redirects
for r in REDIRECT_ROWS:
    for col, tag in [("source", "redirect_source"), ("destination", "redirect_target")]:
        val = r[col]
        if not val or "*" in val or val.startswith("http"):
            # keep absolute destinations too, but skip pure external ones (none expected) and wildcard patterns
            if val.startswith("http") and SITE.split("//")[1] not in val:
                continue
        norm, _ = normalize_url(val) if not val.startswith("http") else (val.rstrip("/") or val, False)
        rec = touch(norm, False)
        rec["discovery_sources"].add(tag)
        if tag == "redirect_source":
            rec["notes"].append(f"redirect rule #{r['rule_order_index']} -> {r['destination']} (permanent={r['permanent']})")

# E. legacy URL exports
for r in LEGACY_URL_ROWS:
    raw = r["raw_url"]
    norm, is_param = normalize_url(raw)
    rec = touch(norm, is_param)
    rec["raw_urls"].add(raw)
    rec["discovery_sources"].add("legacy_export")

# F. retired
for r in RETIRED_ROWS:
    norm, _ = normalize_url(r["path"])
    rec = touch(norm, False)
    rec["discovery_sources"].add("retired")
    rec["notes"].append(r["reason"])

# ---- resolve inventory_state / expected_indexability, assign url_id ----

NOINDEX_TYPES = {"checkout", "static_other", "api_or_asset", "root_home", "health_legacy"}


def resolve_state(norm, rec):
    sources = rec["discovery_sources"]
    ptype = rec["page_type"]
    if "retired" in sources:
        return "retired", "gone"
    if rec.get("_unsupported"):
        return "unsupported_combination", "unknown"
    if "redirect_source" in sources and "sitemap" not in sources and "cms" not in sources:
        return "redirect_source", "redirect"
    if rec.get("_unpublished") and "sitemap" not in sources:
        return "unpublished_record", "noindex"
    if "sitemap" in sources:
        if ptype == "unknown":
            return "unknown", "unknown"
        return "canonical_candidate", "noindex" if ptype in NOINDEX_TYPES else "index"
    if "route" in sources or "cms" in sources:
        if ptype == "legacy_redirect":
            return "canonical_candidate", "redirect"
        if ptype in NOINDEX_TYPES or ptype in ("legal",):
            return "noindexed_expected" if ptype != "legal" else "orphan_candidate", "noindex"
        return "orphan_candidate", "unknown"
    if "legacy_export" in sources:
        return "unknown", "unknown"
    return "unknown", "unknown"


rows_sorted = sorted(inv.items(), key=lambda kv: kv[0])
next_seq = 1
final_rows = []
for norm, rec in rows_sorted:
    path = norm[len(SITE):] or "/"
    country_slug_m = re.match(r"^/([a-z0-9-]+)/([a-z]{2})(?:/|$)", path)
    url_id = None
    if country_slug_m:
        slug, lang = country_slug_m.group(1), country_slug_m.group(2)
        c = CODE_TO_COUNTRY.get(SLUG_TO_CODE_MAP.get(slug, ""))
        if c and (slug, lang) in HOME_SPECIALS and len(path.split("/")) == 3:
            url_id = HOME_SPECIALS[(slug, lang)]
    if not url_id:
        url_id = f"U{next_seq:06d}"
        next_seq += 1
    state, expected = resolve_state(norm, rec)
    final_rows.append({
        "url_id": url_id,
        "content_entity_id": rec["content_entity_id"],
        "raw_url": next(iter(rec["raw_urls"])) if rec["raw_urls"] else norm,
        "normalized_url": norm if not rec["is_parameter"] else norm,
        "target_country": rec["target_country"],
        "language": rec["language"],
        "locale_tag": rec["locale_tag"],
        "page_type": rec["page_type"],
        "template_file": rec["template_file"] or "|".join(ROUTE_BY_TYPE.get(rec["page_type"], [])[:1]),
        "source_file_or_model": rec["source_file_or_model"],
        "discovery_sources": "|".join(sorted(rec["discovery_sources"])),
        "inventory_state": "alternate_or_parameter" if rec["is_parameter"] else state,
        "expected_indexability": "unknown" if rec["is_parameter"] else expected,
        "in_sitemap": rec["in_sitemap"],
        "sitemap_lastmod": rec["sitemap_lastmod"],
        "first_published": rec["first_published"],
        "notes": " | ".join(rec["notes"])[:500],
    })

with open(DATA_OUT / "page_inventory.csv", "w", newline="", encoding="utf-8") as f:
    fieldnames = ["url_id", "content_entity_id", "raw_url", "normalized_url", "target_country", "language",
                    "locale_tag", "page_type", "template_file", "source_file_or_model", "discovery_sources",
                    "inventory_state", "expected_indexability", "in_sitemap", "sitemap_lastmod",
                    "first_published", "notes"]
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(final_rows)

manifest["counts"]["page_inventory.csv"] = len(final_rows)

# --------------------------------------------------------------------------
# 9. inventory_counts.csv + manifest
# --------------------------------------------------------------------------

from collections import Counter
counter = Counter()
for row in final_rows:
    counter[(row["target_country"] or "(none)", row["language"] or "(none)", row["page_type"], row["inventory_state"])] += 1

with open(DATA_OUT / "inventory_counts.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["target_country", "language", "page_type", "inventory_state", "count"])
    for (country, lang, ptype, state), n in sorted(counter.items()):
        w.writerow([country, lang, ptype, state, n])

manifest["counts"]["inventory_counts.csv"] = len(counter)

(OUT / "manifest-A1.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

print("DONE")
print(json.dumps(manifest["counts"], indent=2))
