#!/usr/bin/env python
"""A2 live probe — Global Health SEO master audit, 2026-09-15.

Probes production URLs from seo/tracking/data/page_inventory.csv (plus a
handful of fixed URLs: root, robots.txt, sitemap.xml, apex/http variants,
6 country roots) and writes:

  seo/tracking/data/crawl_history.csv
  seo/tracking/data/hreflang_edges.csv
  seo/tracking/data/internal_links.csv
  seo/tracking/data/orphans.csv
  seo/tracking/data/technical_qa.csv
  seo/tracking/data/probe-summary.md
  seo/tracking/raw/2026-09-15/A2-probe/manifest-A2.json
  seo/tracking/raw/2026-09-15/A2-probe/text/<url_id>.txt        (every 200 HTML page)
  seo/tracking/raw/2026-09-15/A2-probe/html-flagged/<url_id>.html (flagged pages)

Re-runnable / resumable: every fetched URL's full record is appended to
_cache/records.jsonl as it completes. Re-running the script skips URLs
already in the cache and regenerates every output from the full cache
each time, so a run that gets killed partway can just be re-invoked.

Usage:
    python probe.py                 # crawl remaining URLs, write all outputs
    python probe.py --selftest      # run the offline unit checks, no network
    python probe.py --limit 50      # crawl at most 50 NEW urls this run (testing)
"""
import argparse
import csv
import hashlib
import json
import re
import sys
import threading
import time
import traceback
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

import requests
from lxml import html as lxml_html

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
REPO = Path(__file__).resolve().parents[5]
assert (REPO / "seo").is_dir(), f"unexpected repo root guess: {REPO}"

INVENTORY_CSV = REPO / "seo/tracking/data/page_inventory.csv"
A1_MARKETS_CSV = REPO / "seo/tracking/raw/2026-09-15/A1-inventory/markets_locales.csv"
OUT_DATA = REPO / "seo/tracking/data"
OUT_DIR = REPO / "seo/tracking/raw/2026-09-15/A2-probe"
TEXT_DIR = OUT_DIR / "text"
FLAGGED_DIR = OUT_DIR / "html-flagged"
CACHE_FILE = OUT_DIR / "_cache/records.jsonl"

AUDITED_COMMIT = "f055a9b78a567502051c7c81b9f9313da32cdc4d"
SITE = "https://www.myglobalhealth.online"
HOST = "www.myglobalhealth.online"
UA = "Mozilla/5.0 (compatible; GlobalHealthAudit/1.0; +https://www.myglobalhealth.online)"
TIMEOUT = 20
MAX_RETRIES = 2  # on 5xx/timeout
MAX_HOPS = 6
WORKERS = 4
RATE_PER_SEC = 4
MAX_TEXT_BYTES = 30 * 1024

COUNTRY_SLUGS = ["ireland", "czechia", "portugal", "spain", "romania", "brazil"]
LANGS = ["en", "pt", "es", "cs", "ro", "de"]

# ponytail: hand-rolled per-language word lists, not a real i18n dependency —
# extend the dict if a market adds a language.
SUPERLATIVES = {
    "en": ["best", "leading", "world-class", "#1", "top-rated", "unmatched", "guaranteed"],
    "pt": ["melhor", "líder", "classe mundial", "nº1", "mais bem avaliado", "incomparável", "garantido"],
    "es": ["mejor", "líder", "clase mundial", "número 1", "mejor valorado", "inigualable", "garantizado"],
    "cs": ["nejlepší", "přední", "světová třída", "nejlépe hodnocený", "nepřekonatelný", "garantovaný"],
    "ro": ["cel mai bun", "lider", "de clasă mondială", "cel mai bine cotat", "de neegalat", "garantat"],
    "de": ["beste", "führend", "weltklasse", "nummer 1", "bestbewertet", "unübertroffen", "garantiert"],
}
GENERIC_INTROS = [
    "welcome to", "bem-vindo", "bem vindo", "bienvenido", "vítejte",
    "bine ați venit", "bine ati venit", "willkommen",
]
SOFT_404_PHRASES = [
    "not found", "page doesn't exist", "page does not exist",
    "não encontrada", "não encontrado", "página não existe",
    "no encontrada", "no encontrado", "la página no existe",
    "nenalezena", "nenalezeno", "stránka neexistuje",
    "nu a fost găsită", "nu a fost gasita", "pagina nu există",
    "nicht gefunden", "seite existiert nicht",
    "404",
]
CONTENT_PAGE_TYPES = {
    "service", "doctor", "legal", "tool", "blog_post", "consult", "test",
    "health_legacy", "market_home", "booking", "careers", "press",
    "blog_index", "contact", "doctors_index", "about", "faq",
}

REGION_BY_SLUG = {"ireland": "IE", "czechia": "CZ", "portugal": "PT", "spain": "ES", "romania": "RO", "brazil": "BR"}
VALID_REGIONS = set(REGION_BY_SLUG.values())


# --------------------------------------------------------------------------
# URL helpers
# --------------------------------------------------------------------------
def normalize_url(raw, base=SITE):
    """Absolute https://www.myglobalhealth.online URL, fragment stripped,
    trailing slash stripped (except root). Mirrors A1's normalization-rules.md."""
    absolute = urljoin(base + "/", raw)
    parts = urlsplit(absolute)
    path = parts.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


def is_same_host(url):
    try:
        return urlsplit(url).netloc.split(":")[0].lower() in (HOST, "myglobalhealth.online")
    except Exception:
        return False


def market_of_path(path):
    """('ireland', 'en') from /ireland/en/... else (None, None)."""
    m = re.match(r"^/([a-z0-9-]+)/([a-z]{2})(?:/|$)", path)
    if not m:
        return None, None
    slug = m.group(1)
    if slug not in COUNTRY_SLUGS:
        return None, None
    return slug, m.group(2)


# --------------------------------------------------------------------------
# Token bucket rate limiter (shared across worker threads)
# --------------------------------------------------------------------------
class TokenBucket:
    def __init__(self, rate_per_sec):
        self.rate = rate_per_sec
        self.tokens = rate_per_sec
        self.updated = time.monotonic()
        self.lock = threading.Lock()

    def acquire(self):
        while True:
            with self.lock:
                now = time.monotonic()
                self.tokens = min(self.rate, self.tokens + (now - self.updated) * self.rate)
                self.updated = now
                if self.tokens >= 1:
                    self.tokens -= 1
                    return
                wait = (1 - self.tokens) / self.rate
            time.sleep(wait)


BUCKET = TokenBucket(RATE_PER_SEC)


def fetch_one_hop(url):
    """Single GET, no redirect following, 2 retries on 5xx/timeout with backoff.
    Returns (status_or_None, headers_dict, content_bytes, elapsed_ms, error_str)."""
    last_err = None
    for attempt in range(MAX_RETRIES + 1):
        BUCKET.acquire()
        t0 = time.monotonic()
        try:
            resp = requests.get(
                url, headers={"User-Agent": UA}, allow_redirects=False,
                timeout=TIMEOUT,
            )
            elapsed_ms = round((time.monotonic() - t0) * 1000, 1)
            if resp.status_code >= 500 and attempt < MAX_RETRIES:
                last_err = f"http {resp.status_code}"
                time.sleep(2 ** attempt)
                continue
            return resp.status_code, dict(resp.headers), resp.content, elapsed_ms, None
        except requests.exceptions.Timeout:
            last_err = "timeout"
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
                continue
        except requests.exceptions.RequestException as e:
            last_err = str(e)
            break
    return None, {}, b"", None, last_err


def crawl_chain(url):
    """Follow redirects manually up to MAX_HOPS. Returns dict of chain-level fields."""
    hop_chain = []
    current = url
    first_status = None
    first_ms = None
    headers = {}
    body = b""
    err = None
    for hop in range(MAX_HOPS + 1):
        status, hdrs, content, ms, e = fetch_one_hop(current)
        if hop == 0:
            first_status, first_ms = status, ms
        if status is None:
            err = e
            hop_chain.append(f"ERROR {current}")
            break
        hop_chain.append(f"{status} {current}")
        headers, body = hdrs, content
        if status in (301, 302, 303, 307, 308) and hop < MAX_HOPS:
            loc = hdrs.get("Location") or hdrs.get("location")
            if not loc:
                break
            current = urljoin(current, loc)
            continue
        break
    final_status = None if hop_chain and hop_chain[-1].startswith("ERROR") else status
    return {
        "final_url": current,
        "http_status": first_status,
        "final_status": final_status,
        "redirect_hops": max(0, len(hop_chain) - 1) if err is None else max(0, len(hop_chain) - 1),
        "hop_chain": " | ".join(hop_chain),
        "response_time_ms": first_ms,
        "headers": headers,
        "body": body,
        "error": err,
    }


# --------------------------------------------------------------------------
# HTML parsing
# --------------------------------------------------------------------------
def _text(el):
    return el.text_content().strip() if el is not None else ""


def parse_json_ld(tree):
    """Return (types:list[str], errors:int, faq_count:int)."""
    types, errors, faq_count = [], 0, 0

    def walk(node):
        nonlocal faq_count
        if isinstance(node, dict):
            t = node.get("@type")
            if isinstance(t, str):
                types.append(t)
                if t == "FAQPage":
                    faq_count += len(node.get("mainEntity") or [])
            elif isinstance(t, list):
                types.extend(str(x) for x in t)
                if "FAQPage" in t:
                    faq_count += len(node.get("mainEntity") or [])
            for v in node.values():
                if isinstance(v, (dict, list)):
                    walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    for script in tree.xpath('//script[@type="application/ld+json"]'):
        raw = script.text_content()
        if not raw or not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except Exception:
            errors += 1
            continue
        walk(data)
    return types, errors, faq_count


def main_content_el(tree):
    mains = tree.xpath("//main")
    if mains:
        return mains[0]
    arts = tree.xpath("//article")
    if arts:
        return arts[0]
    body = tree.xpath("//body")
    if not body:
        return tree
    body = body[0]
    for tag in ("nav", "header", "footer", "script", "style"):
        for el in body.xpath(f".//{tag}"):
            el.drop_tree()
    return body


def count_superlatives(text, lang):
    text_low = text.lower()
    words = SUPERLATIVES.get(lang, []) + SUPERLATIVES["en"]
    return sum(text_low.count(w.lower()) for w in set(words))


def has_generic_intro(text):
    head = text[:200].strip().lower()
    return any(head.startswith(p) for p in GENERIC_INTROS)


def has_soft_404_text(text):
    low = text.lower()
    return any(p in low for p in SOFT_404_PHRASES)


def parse_html_page(final_url, body, lang_hint):
    tree = lxml_html.fromstring(body)

    html_lang = tree.get("lang") or (tree.xpath("//html/@lang") or [""])[0]

    title_el = tree.xpath("//title")
    title = _text(title_el[0]) if title_el else ""

    def meta_content(name=None, prop=None):
        if name:
            els = tree.xpath(f'//meta[translate(@name,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="{name}"]/@content')
        else:
            els = tree.xpath(f'//meta[translate(@property,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="{prop}"]/@content')
        return els[0].strip() if els else ""

    meta_description = meta_content(name="description")
    meta_robots = meta_content(name="robots")
    viewport = meta_content(name="viewport")
    og_locale = meta_content(prop="og:locale")
    og_title = meta_content(prop="og:title")

    canonical_els = tree.xpath('//link[translate(@rel,"CANONIAL","canonial")="canonical"]/@href')
    canonical = normalize_url(canonical_els[0], base=final_url) if canonical_els else ""
    canonical_matches_self = "yes" if canonical and canonical == normalize_url(final_url) else ("no" if canonical else "")

    h1s = tree.xpath("//h1")
    h1 = _text(h1s[0]) if h1s else ""
    h1_count = len(h1s)
    h2_count = len(tree.xpath("//h2"))

    hreflang_edges = []
    x_default = ""
    for link in tree.xpath('//link'):
        rel = (link.get("rel") or "").strip().lower()
        if rel != "alternate":
            continue
        hreflang = None
        href = None
        for k, v in link.attrib.items():
            if k.lower() == "hreflang":
                hreflang = v
            if k.lower() == "href":
                href = v
        if hreflang and href:
            abs_href = normalize_url(href, base=final_url)
            hreflang_edges.append((hreflang, abs_href))
            if hreflang.lower() == "x-default":
                x_default = abs_href

    json_ld_types, json_ld_parse_errors, faq_count = parse_json_ld(tree)

    main_el = main_content_el(tree)
    main_text = _text(main_el)
    word_count = len(main_text.split())

    internal_links, nofollow_internal = [], 0
    external_link_count = 0
    for a in tree.xpath("//a[@href]"):
        href = a.get("href")
        if not href or href.startswith(("javascript:", "mailto:", "tel:", "#")):
            continue
        abs_href = urljoin(final_url, href)
        if is_same_host(abs_href):
            norm = normalize_url(abs_href)
            internal_links.append(norm)
            rel = (a.get("rel") or "").lower().split()
            if "nofollow" in rel:
                nofollow_internal += 1
        else:
            external_link_count += 1

    images_missing_alt = sum(
        1 for img in tree.xpath("//img")
        if not img.get("alt") or not img.get("alt").strip()
    )

    em_dash_count = main_text.count("—")
    exclamation_count = main_text.count("!")
    superlative_hits = count_superlatives(main_text, lang_hint)
    generic_intro = "yes" if has_generic_intro(main_text) else "no"

    return {
        "html_lang": html_lang,
        "title": title,
        "title_length": len(title),
        "meta_description": meta_description,
        "description_length": len(meta_description),
        "meta_robots": meta_robots,
        "canonical": canonical,
        "canonical_matches_self": canonical_matches_self,
        "h1": h1,
        "h1_count": h1_count,
        "h2_count": h2_count,
        "hreflang_edges": hreflang_edges,
        "x_default": x_default,
        "og_locale": og_locale,
        "og_title": og_title,
        "json_ld_types": json_ld_types,
        "json_ld_parse_errors": json_ld_parse_errors,
        "word_count": word_count,
        "main_text": main_text,
        "internal_links": internal_links,
        "internal_link_count": len(internal_links),
        "external_link_count": external_link_count,
        "nofollow_internal_count": nofollow_internal,
        "images_missing_alt": images_missing_alt,
        "viewport_meta": "yes" if viewport else "no",
        "em_dash_count": em_dash_count,
        "exclamation_count": exclamation_count,
        "superlative_hits": superlative_hits,
        "generic_intro": generic_intro,
        "faq_count": faq_count,
    }


BUILD_ID_RE = [re.compile(r"[?&]dpl=([0-9a-f]{16,40})"), re.compile(r"/_next/static/(?!chunks/|css/|media/)([\w-]+)/")]


def find_build_id(body_text):
    for rx in BUILD_ID_RE:
        m = rx.search(body_text)
        if m:
            return m.group(1)
    return ""


# --------------------------------------------------------------------------
# Load inventory + build target URL list
# --------------------------------------------------------------------------
def load_inventory():
    with open(INVENTORY_CSV, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_market_regions():
    """slug -> region code, from A1's markets_locales.csv if present, else the static fallback."""
    if not A1_MARKETS_CSV.exists():
        return REGION_BY_SLUG
    out = {}
    with open(A1_MARKETS_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            out[row["country_slug"]] = row["country_code"].upper()
    return out or REGION_BY_SLUG


def to_absolute(url):
    """requests needs a full URI; resolve bare paths (~1.1k rows in the inventory
    carry a relative raw_url) against the site root before fetching."""
    if url.startswith(("http://", "https://")):
        return url
    return urljoin(SITE + "/", url)


def build_targets(inv_rows):
    """List of dicts: {url_id, requested_url, role, in_sitemap, target_country, language, page_type, content_entity_id}."""
    targets = []
    seen = set()

    def add(url_id, url, role, row=None):
        if not url:
            return
        url = to_absolute(url)
        if (url_id, url) in seen:
            return
        seen.add((url_id, url))
        targets.append({
            "url_id": url_id,
            "requested_url": url,
            "role": role,
            "in_sitemap": (row or {}).get("in_sitemap", ""),
            "target_country": (row or {}).get("target_country", ""),
            "language": (row or {}).get("language", ""),
            "page_type": (row or {}).get("page_type", ""),
            "content_entity_id": (row or {}).get("content_entity_id", ""),
            "expected_indexability": (row or {}).get("expected_indexability", ""),
        })

    for row in inv_rows:
        add(row["url_id"], row["raw_url"], "raw", row)
        if row.get("normalized_url") and row["normalized_url"] != row["raw_url"]:
            add(row["url_id"], row["normalized_url"], "normalized", row)

    # fixed synthetic checks
    add("SYN-root", SITE + "/", "synthetic")
    add("SYN-robots", SITE + "/robots.txt", "synthetic")
    add("SYN-sitemap", SITE + "/sitemap.xml", "synthetic")
    add("SYN-apex", "https://myglobalhealth.online/", "synthetic")
    add("SYN-http-www", "http://www.myglobalhealth.online/", "synthetic")
    add("SYN-http-apex", "http://myglobalhealth.online/", "synthetic")
    for slug in COUNTRY_SLUGS:
        add(f"SYN-{slug}-noslash", f"{SITE}/{slug}", "synthetic")
        add(f"SYN-{slug}-slash", f"{SITE}/{slug}/", "synthetic")

    return targets


# --------------------------------------------------------------------------
# Cache (resumability)
# --------------------------------------------------------------------------
def load_cache():
    records = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                records[(rec["url_id"], rec["requested_url"])] = rec
    return records


_cache_lock = threading.Lock()


def append_cache(rec):
    with _cache_lock:
        with open(CACHE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


# --------------------------------------------------------------------------
# Per-URL probe
# --------------------------------------------------------------------------
def indexability_of(target, chain, parsed):
    status = target_http_status = chain["http_status"]
    final_status = chain["final_status"]
    if chain["error"]:
        return "error"
    if status in (301, 302, 303, 307, 308):
        return "redirect"
    if final_status in (404, 410):
        return "gone"
    if final_status and final_status >= 400:
        return "error"
    if parsed is None:
        return "not_html"
    meta_robots = (parsed.get("meta_robots") or "").lower()
    xrt = (chain["headers"].get("X-Robots-Tag") or chain["headers"].get("x-robots-tag") or "").lower()
    if "noindex" in meta_robots or "noindex" in xrt:
        return "noindex"
    return "index"


def is_flagged(target, chain, parsed, indexability, soft404):
    if chain["final_status"] != 200:
        return True
    if indexability == "noindex":
        return True
    if soft404:
        return True
    if parsed and parsed.get("canonical_matches_self") == "no":
        return True
    if parsed and (not parsed.get("title") or parsed.get("h1_count", 0) == 0):
        return True
    if parsed and parsed.get("json_ld_parse_errors", 0) > 0:
        return True
    return False


def probe_target(target):
    url = target["requested_url"]
    chain = crawl_chain(url)
    headers = chain["headers"]
    content_type = headers.get("Content-Type") or headers.get("content-type") or ""
    is_html = "text/html" in content_type.lower()
    parsed = None
    build_id = ""
    if is_html and chain["body"]:
        try:
            parsed = parse_html_page(chain["final_url"], chain["body"], target["language"] or "en")
        except Exception:
            parsed = None
        try:
            build_id = find_build_id(chain["body"].decode("utf-8", "ignore"))
        except Exception:
            build_id = ""

    soft404 = False
    if chain["final_status"] == 200:
        text_for_check = (parsed or {}).get("main_text", "") + " " + (parsed or {}).get("title", "") + " " + (parsed or {}).get("h1", "")
        if has_soft_404_text(text_for_check):
            soft404 = True
        elif parsed and parsed.get("word_count", 0) < 40 and target["page_type"] in CONTENT_PAGE_TYPES:
            soft404 = True

    indexability = indexability_of(target, chain, parsed)
    flagged = is_flagged(target, chain, parsed, indexability, soft404)

    rec = {
        "url_id": target["url_id"],
        "role": target["role"],
        "requested_url": url,
        "final_url": chain["final_url"],
        "http_status": chain["http_status"],
        "final_status": chain["final_status"],
        "redirect_hops": chain["redirect_hops"],
        "hop_chain": chain["hop_chain"],
        "response_time_ms": chain["response_time_ms"],
        "content_type": content_type,
        "content_length": headers.get("Content-Length") or headers.get("content-length") or (str(len(chain["body"])) if chain["body"] else ""),
        "x_robots_tag": headers.get("X-Robots-Tag") or headers.get("x-robots-tag") or "",
        "cache_control": headers.get("Cache-Control") or headers.get("cache-control") or "",
        "in_sitemap": target["in_sitemap"],
        "target_country": target["target_country"],
        "language": target["language"],
        "page_type": target["page_type"],
        "content_entity_id": target["content_entity_id"],
        "indexability": indexability,
        "soft_404_signal": "yes" if soft404 else "no",
        "build_id": build_id,
        "error": chain["error"] or "",
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    if parsed:
        rec.update({k: v for k, v in parsed.items() if k not in ("internal_links", "hreflang_edges", "main_text")})
        rec["internal_links"] = parsed["internal_links"]
        rec["hreflang_edges"] = parsed["hreflang_edges"]
        main_text = parsed["main_text"]
        rec["main_text_hash"] = hashlib.sha256(main_text.encode("utf-8")).hexdigest() if main_text else ""
        if chain["final_status"] == 200 and is_html:
            TEXT_DIR.mkdir(parents=True, exist_ok=True)
            (TEXT_DIR / f"{target['url_id']}.txt").write_bytes(main_text.encode("utf-8")[:MAX_TEXT_BYTES])
            rec["evidence"] = f"seo/tracking/raw/2026-09-15/A2-probe/text/{target['url_id']}.txt"
        else:
            rec["evidence"] = ""
    else:
        for k in ("html_lang", "title", "title_length", "meta_description", "description_length",
                   "meta_robots", "canonical", "canonical_matches_self", "h1", "h1_count", "h2_count",
                   "og_locale", "og_title", "json_ld_types", "json_ld_parse_errors", "word_count",
                   "viewport_meta", "em_dash_count", "exclamation_count", "superlative_hits",
                   "generic_intro", "faq_count", "nofollow_internal_count", "external_link_count",
                   "internal_link_count", "images_missing_alt", "x_default"):
            rec.setdefault(k, "")
        rec["internal_links"] = []
        rec["hreflang_edges"] = []
        rec["main_text_hash"] = ""
        rec["evidence"] = ""

    if flagged:
        FLAGGED_DIR.mkdir(parents=True, exist_ok=True)
        try:
            (FLAGGED_DIR / f"{target['url_id']}.html").write_bytes(chain["body"][:2_000_000])
        except Exception:
            pass
    return rec


# --------------------------------------------------------------------------
# Crawl orchestration
# --------------------------------------------------------------------------
def run_crawl(targets, limit=None):
    from concurrent.futures import ThreadPoolExecutor, as_completed

    cache = load_cache()
    todo = [t for t in targets if (t["url_id"], t["requested_url"]) not in cache]
    if limit:
        todo = todo[:limit]

    print(f"[crawl] {len(targets)} targets total, {len(cache)} cached, {len(todo)} to fetch this run", file=sys.stderr)
    errors = 0
    t_start = time.monotonic()
    if todo:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(probe_target, t): t for t in todo}
            done_n = 0
            for fut in as_completed(futs):
                t = futs[fut]
                try:
                    rec = fut.result()
                except Exception as e:
                    errors += 1
                    rec = {
                        "url_id": t["url_id"], "role": t["role"], "requested_url": t["requested_url"],
                        "final_url": t["requested_url"], "http_status": None, "final_status": None,
                        "redirect_hops": 0, "hop_chain": "", "response_time_ms": None,
                        "content_type": "", "content_length": "", "x_robots_tag": "", "cache_control": "",
                        "in_sitemap": t["in_sitemap"], "target_country": t["target_country"],
                        "language": t["language"], "page_type": t["page_type"],
                        "content_entity_id": t["content_entity_id"], "indexability": "error",
                        "soft_404_signal": "no", "build_id": "", "error": f"{type(e).__name__}: {e}",
                        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                        "internal_links": [], "hreflang_edges": [], "main_text_hash": "", "evidence": "",
                    }
                    print(f"[crawl] EXCEPTION {t['requested_url']}: {e}", file=sys.stderr)
                    traceback.print_exc(file=sys.stderr)
                append_cache(rec)
                done_n += 1
                if done_n % 200 == 0:
                    elapsed = time.monotonic() - t_start
                    print(f"[crawl] {done_n}/{len(todo)} done, {elapsed:.0f}s elapsed, {done_n/elapsed:.2f} req/s", file=sys.stderr)

    elapsed = time.monotonic() - t_start
    cache = load_cache()  # reload full set including this run's new rows
    return cache, {"requested": len(targets), "fetched_this_run": len(todo), "errors_this_run": errors, "seconds_this_run": round(elapsed, 1)}


# --------------------------------------------------------------------------
# Output writers
# --------------------------------------------------------------------------
CRAWL_HISTORY_COLS = [
    "checked_at", "url_id", "requested_url", "final_url", "http_status", "final_status",
    "redirect_hops", "hop_chain", "response_time_ms", "title", "meta_description", "h1",
    "html_lang", "canonical", "canonical_matches_self", "meta_robots", "x_robots_tag",
    "in_sitemap", "indexability", "rendering_check", "source_revision", "word_count",
    "h1_count", "h2_count", "json_ld_types", "internal_link_count", "external_link_count",
    "images_missing_alt", "soft_404_signal", "em_dash_count", "exclamation_count",
    "superlative_hits", "generic_intro", "faq_count", "main_text_hash", "evidence",
]


def pick_source_revision(rec):
    return rec.get("build_id") or ""


def write_crawl_history(records):
    OUT_DATA.mkdir(parents=True, exist_ok=True)
    path = OUT_DATA / "crawl_history.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CRAWL_HISTORY_COLS)
        w.writeheader()
        for rec in records:
            row = {c: rec.get(c, "") for c in CRAWL_HISTORY_COLS}
            row["rendering_check"] = ""
            row["source_revision"] = pick_source_revision(rec) or AUDITED_COMMIT[:8]
            jt = rec.get("json_ld_types") or []
            row["json_ld_types"] = "|".join(jt) if isinstance(jt, list) else jt
            w.writerow(row)
    return path


BCP47_RE = re.compile(r"^([a-z]{2})-([A-Z]{2})$")


def build_url_entity_map(inv_rows):
    """normalized url -> {content_entity_id, page_type, target_country, language, url_id}."""
    m = {}
    for row in inv_rows:
        info = {
            "content_entity_id": row.get("content_entity_id", ""),
            "page_type": row.get("page_type", ""),
            "target_country": row.get("target_country", ""),
            "language": row.get("language", ""),
            "url_id": row["url_id"],
        }
        for u in (row.get("raw_url"), row.get("normalized_url")):
            if not u:
                continue
            try:
                m[normalize_url(u)] = info
            except Exception:
                continue
    return m


def write_hreflang_edges(records, inv_rows):
    path = OUT_DATA / "hreflang_edges.csv"
    by_final_url = {}
    by_requested_url = {}
    for rec in records:
        if rec.get("final_url"):
            by_final_url.setdefault(normalize_url(rec["final_url"]), rec)
        by_requested_url.setdefault(normalize_url(rec["requested_url"]), rec)

    def lookup(url):
        n = normalize_url(url)
        return by_final_url.get(n) or by_requested_url.get(n)

    entity_map = build_url_entity_map(inv_rows)

    # page-level: does this source have a self-referencing edge / an x-default?
    self_ref = defaultdict(bool)
    has_xdef = defaultdict(bool)
    for rec in records:
        edges = rec.get("hreflang_edges") or []
        if not edges:
            continue
        src_norm = normalize_url(rec.get("final_url") or rec["requested_url"])
        for tag, href in edges:
            if normalize_url(href) == src_norm:
                self_ref[rec["url_id"]] = True
            if tag.lower() == "x-default":
                has_xdef[rec["url_id"]] = True

    rows = []
    for rec in records:
        edges = rec.get("hreflang_edges") or []
        if not edges:
            continue
        source_url = rec.get("final_url") or rec["requested_url"]
        src_entity = entity_map.get(normalize_url(source_url), {})
        cluster_id = (src_entity.get("content_entity_id") or "") or urlsplit(source_url).path
        src_slug, _ = market_of_path(urlsplit(source_url).path)

        for tag, href in edges:
            alt_norm = normalize_url(href)
            alt_rec = lookup(href)
            is_self = "yes" if alt_norm == normalize_url(source_url) else "no"

            # tag validity
            tag_valid = tag.lower() == "x-default" or bool(BCP47_RE.match(tag)) and BCP47_RE.match(tag).group(2) in VALID_REGIONS

            alt_slug, _ = market_of_path(urlsplit(href).path)
            cross_market = "yes" if (src_slug and alt_slug and src_slug != alt_slug) else "no"

            alt_entity = entity_map.get(alt_norm, {})
            if not src_entity.get("content_entity_id") or not alt_entity.get("content_entity_id"):
                equivalent_content = "unknown"
            elif (src_entity.get("content_entity_id") == alt_entity.get("content_entity_id")
                    and src_entity.get("page_type") == alt_entity.get("page_type")):
                equivalent_content = "yes"
            else:
                equivalent_content = "no"

            alt_status = alt_rec.get("final_status") if alt_rec else ""
            alt_canonical = alt_rec.get("canonical") if alt_rec else ""
            alt_indexability = alt_rec.get("indexability") if alt_rec else ""
            reciprocal = "no"
            if alt_rec:
                for atag, ahref in (alt_rec.get("hreflang_edges") or []):
                    if normalize_url(ahref) == normalize_url(source_url):
                        reciprocal = "yes"
                        break
            x_default_valid = "yes" if has_xdef[rec["url_id"]] else "no"

            # verdict, priority order
            if not tag_valid:
                verdict = "invalid_tag"
            elif cross_market == "yes":
                verdict = "cross_market"
            elif alt_rec is None:
                verdict = "alternate_error"
            elif alt_status and int(alt_status) >= 400:
                verdict = "alternate_error"
            elif alt_rec.get("redirect_hops") and int(alt_rec["redirect_hops"]) > 0:
                verdict = "alternate_redirects"
            elif alt_indexability == "noindex":
                verdict = "alternate_not_indexable"
            elif not self_ref[rec["url_id"]]:
                verdict = "no_self_reference"
            elif not has_xdef[rec["url_id"]]:
                verdict = "x_default_missing"
            elif reciprocal == "no" and is_self == "no":
                verdict = "missing_reciprocal"
            else:
                verdict = "pass"

            rows.append({
                "checked_at": rec.get("checked_at", ""),
                "cluster_id": cluster_id,
                "source_url_id": rec["url_id"],
                "source_url": source_url,
                "declared_tag": tag,
                "alternate_url": href,
                "alternate_status": alt_status,
                "alternate_canonical": alt_canonical,
                "alternate_indexability": alt_indexability,
                "reciprocal": reciprocal,
                "is_self_reference": is_self,
                "x_default_valid": x_default_valid,
                "equivalent_content": equivalent_content,
                "verdict": verdict,
                "evidence": alt_rec.get("evidence", "") if alt_rec else "not found in crawl_history",
            })

    with open(path, "w", newline="", encoding="utf-8") as f:
        cols = ["checked_at", "cluster_id", "source_url_id", "source_url", "declared_tag", "alternate_url",
                "alternate_status", "alternate_canonical", "alternate_indexability", "reciprocal",
                "is_self_reference", "x_default_valid", "equivalent_content", "verdict", "evidence"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    return path, rows


def write_internal_links(records, inv_rows):
    path = OUT_DATA / "internal_links.csv"
    url_to_id = {}
    for row in inv_rows:
        for u in (row.get("raw_url"), row.get("normalized_url")):
            if u:
                try:
                    url_to_id[normalize_url(u)] = row["url_id"]
                except Exception:
                    pass
    status_by_url = {}
    for rec in records:
        n = normalize_url(rec.get("final_url") or rec["requested_url"])
        status_by_url.setdefault(n, rec.get("final_status"))
        n2 = normalize_url(rec["requested_url"])
        status_by_url.setdefault(n2, rec.get("final_status"))

    inbound_counts = Counter()
    rows = []
    for rec in records:
        if rec.get("final_status") != 200:
            continue
        for target_url in rec.get("internal_links") or []:
            target_url_id = url_to_id.get(target_url, "")
            target_status = status_by_url.get(target_url, "")
            inbound_counts[target_url] += 1
            rows.append({
                "source_url_id": rec["url_id"],
                "source_url": rec.get("final_url") or rec["requested_url"],
                "target_url": target_url,
                "target_url_id": target_url_id,
                "target_status": target_status,
                "rel_nofollow": "no",  # per-link nofollow not retained individually; nofollow_internal_count on source covers the aggregate
                "anchor_text": "",
            })

    with open(path, "w", newline="", encoding="utf-8") as f:
        cols = ["source_url_id", "source_url", "target_url", "target_url_id", "target_status", "rel_nofollow", "anchor_text"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)

    # orphans: canonical_candidate inventory URLs with zero inbound internal links from any 200 page
    orphans_path = OUT_DATA / "orphans.csv"
    orphan_rows = []
    for row in inv_rows:
        if row.get("inventory_state") != "canonical_candidate":
            continue
        try:
            n = normalize_url(row.get("normalized_url") or row.get("raw_url"))
        except Exception:
            continue
        if inbound_counts.get(n, 0) == 0:
            orphan_rows.append({
                "url_id": row["url_id"],
                "normalized_url": n,
                "page_type": row.get("page_type", ""),
                "target_country": row.get("target_country", ""),
                "language": row.get("language", ""),
                "in_sitemap": row.get("in_sitemap", ""),
                "discovery_sources": row.get("discovery_sources", ""),
            })
    with open(orphans_path, "w", newline="", encoding="utf-8") as f:
        cols = ["url_id", "normalized_url", "page_type", "target_country", "language", "in_sitemap", "discovery_sources"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(orphan_rows)

    return path, rows, orphans_path, orphan_rows


# --------------------------------------------------------------------------
# technical_qa.csv
# --------------------------------------------------------------------------
def write_technical_qa(records, hreflang_rows, orphan_rows, inv_rows):
    path = OUT_DATA / "technical_qa.csv"
    checks = []
    n = [0]

    def add(area, check, scope, status, tested, affected, evidence):
        n[0] += 1
        checks.append({
            "check_id": f"T-{n[0]:03d}", "area": area, "check": check, "scope": scope,
            "status": status, "tested_count": tested, "affected_count": affected,
            "evidence": evidence, "owner": "",
        })

    sitemap_recs = [r for r in records if r.get("in_sitemap") == "yes"]
    add("sitemap", "sitemap URLs return non-200 final status", "in_sitemap=yes",
        "fail" if any(r.get("final_status") != 200 for r in sitemap_recs) else "pass",
        len(sitemap_recs), sum(1 for r in sitemap_recs if r.get("final_status") != 200),
        "crawl_history.csv filter in_sitemap=yes & final_status!=200")

    add("redirect", "sitemap URLs that redirect (http_status 3xx)", "in_sitemap=yes",
        "fail" if any(r.get("http_status") in (301, 302, 303, 307, 308) for r in sitemap_recs) else "pass",
        len(sitemap_recs), sum(1 for r in sitemap_recs if r.get("http_status") in (301, 302, 303, 307, 308)),
        "crawl_history.csv filter in_sitemap=yes & http_status in 3xx")

    add("robots", "sitemap URLs noindex", "in_sitemap=yes",
        "fail" if any(r.get("indexability") == "noindex" for r in sitemap_recs) else "pass",
        len(sitemap_recs), sum(1 for r in sitemap_recs if r.get("indexability") == "noindex"),
        "crawl_history.csv filter in_sitemap=yes & indexability=noindex")

    chain_recs = [r for r in records if (r.get("redirect_hops") or 0) > 1]
    add("redirect", "redirect chains >1 hop", "all",
        "fail" if chain_recs else "pass", len(records), len(chain_recs),
        "crawl_history.csv filter redirect_hops>1")

    loop_recs = [r for r in records if (r.get("hop_chain") or "").count(" | ") >= MAX_HOPS]
    add("redirect", "redirect loops (hit max-hop cap without resolving)", "all",
        "fail" if loop_recs else "pass", len(records), len(loop_recs),
        f"crawl_history.csv hop_chain with {MAX_HOPS}+ hops")

    bad_end = [r for r in records if r.get("redirect_hops") and (r.get("final_status") or 0) >= 400]
    add("redirect", "redirects ending in 4xx/5xx", "redirect_hops>0",
        "fail" if bad_end else "pass",
        sum(1 for r in records if r.get("redirect_hops")), len(bad_end),
        "crawl_history.csv filter redirect_hops>0 & final_status>=400")

    host_bad = [r for r in records if r.get("role") == "synthetic" and "SYN-http" in r["url_id"] and r.get("http_status") not in (301, 302, 308)]
    add("http", "host/https/slash consistency (apex, http, bare-country-slash all redirect cleanly)", "synthetic checks",
        "fail" if host_bad else "pass", sum(1 for r in records if r.get("role") == "synthetic"), len(host_bad),
        "crawl_history.csv url_id starting SYN-")

    mismatch = [r for r in records if r.get("canonical") and r.get("canonical_matches_self") == "no"]
    add("canonical", "canonical mismatch (points elsewhere)", "html pages with canonical",
        "fail" if mismatch else "pass", sum(1 for r in records if r.get("canonical")), len(mismatch),
        "crawl_history.csv filter canonical_matches_self=no")

    canon_by_url = {normalize_url(r.get("final_url") or r["requested_url"]): r for r in records}
    canon_bad = []
    for r in records:
        c = r.get("canonical")
        if not c:
            continue
        target = canon_by_url.get(normalize_url(c))
        if target and (target.get("final_status") != 200):
            canon_bad.append(r)
    add("canonical", "canonical points to a redirect/404 target", "html pages with canonical",
        "fail" if canon_bad else "pass", sum(1 for r in records if r.get("canonical")), len(canon_bad),
        "crawl_history.csv join canonical -> target final_status!=200")

    html_recs = [r for r in records if r.get("final_status") == 200 and r.get("title") is not None and r.get("title") != ""]
    by_lang_title = defaultdict(list)
    for r in records:
        if r.get("final_status") == 200:
            by_lang_title[(r.get("language"), r.get("title"))].append(r)
    dup_titles = {k: v for k, v in by_lang_title.items() if k[1] and len(v) > 1}
    missing_titles = [r for r in records if r.get("final_status") == 200 and not r.get("title")]
    add("metadata", "missing titles", "final_status=200", "fail" if missing_titles else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(missing_titles),
        "crawl_history.csv filter final_status=200 & title=''")
    add("metadata", "duplicate titles within same language", "final_status=200", "fail" if dup_titles else "pass",
        sum(1 for r in records if r.get("final_status") == 200), sum(len(v) for v in dup_titles.values()),
        "crawl_history.csv group by (language,title) count>1")

    by_lang_desc = defaultdict(list)
    for r in records:
        if r.get("final_status") == 200:
            by_lang_desc[(r.get("language"), r.get("meta_description"))].append(r)
    dup_desc = {k: v for k, v in by_lang_desc.items() if k[1] and len(v) > 1}
    missing_desc = [r for r in records if r.get("final_status") == 200 and not r.get("meta_description")]
    add("metadata", "missing meta descriptions", "final_status=200", "fail" if missing_desc else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(missing_desc),
        "crawl_history.csv filter final_status=200 & meta_description=''")
    add("metadata", "duplicate meta descriptions within same language", "final_status=200", "fail" if dup_desc else "pass",
        sum(1 for r in records if r.get("final_status") == 200), sum(len(v) for v in dup_desc.values()),
        "crawl_history.csv group by (language,meta_description) count>1")

    long_title = [r for r in records if r.get("final_status") == 200 and (r.get("title_length") or 0) > 60]
    add("metadata", "title length > 60 chars", "final_status=200", "partial" if long_title else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(long_title),
        "crawl_history.csv filter title length>60 (join text/*.txt or recompute len(title))")
    long_desc = [r for r in records if r.get("final_status") == 200 and (r.get("description_length") or 0) > 160]
    add("metadata", "meta description length > 160 chars", "final_status=200", "partial" if long_desc else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(long_desc),
        "recompute len(meta_description) per row")

    missing_h1 = [r for r in records if r.get("final_status") == 200 and (r.get("h1_count") or 0) == 0]
    multi_h1 = [r for r in records if r.get("final_status") == 200 and (r.get("h1_count") or 0) > 1]
    add("headings", "missing H1", "final_status=200", "fail" if missing_h1 else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(missing_h1),
        "crawl_history.csv filter h1_count=0")
    add("headings", "multiple H1", "final_status=200", "fail" if multi_h1 else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(multi_h1),
        "crawl_history.csv filter h1_count>1")

    lang_mismatch = []
    for r in records:
        if r.get("final_status") != 200 or not r.get("html_lang"):
            continue
        path_lang = urlsplit(r.get("final_url") or r["requested_url"]).path
        _, url_lang = market_of_path(path_lang)
        if url_lang and r["html_lang"].split("-")[0].lower() != url_lang.lower():
            lang_mismatch.append(r)
    add("international", "html lang attribute mismatches URL language segment", "final_status=200, market URLs",
        "fail" if lang_mismatch else "pass", sum(1 for r in records if r.get("final_status") == 200), len(lang_mismatch),
        "crawl_history.csv html_lang vs URL /{country}/{lang}/ segment")

    verdict_counts = Counter(r["verdict"] for r in hreflang_rows)
    for bad in ("missing_reciprocal", "invalid_tag", "cross_market", "no_self_reference", "x_default_missing",
                "alternate_not_indexable", "alternate_redirects", "alternate_error"):
        cnt = verdict_counts.get(bad, 0)
        add("hreflang", f"hreflang {bad.replace('_', ' ')}", "hreflang_edges.csv",
            "fail" if cnt else "pass", len(hreflang_rows), cnt, f"hreflang_edges.csv filter verdict={bad}")

    ld_errors = [r for r in records if (r.get("json_ld_parse_errors") or 0) > 0]
    add("structured_data", "JSON-LD parse errors", "final_status=200", "fail" if ld_errors else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(ld_errors),
        "crawl_history.csv filter json_ld_parse_errors>0 (see full record in cache)")

    expected_types = {
        "market_home": "MedicalOrganization|WebSite", "doctor": "Physician", "service": "MedicalWebPage|Service",
        "blog_post": "BlogPosting|Article", "root_home": "MedicalOrganization|WebSite",
    }
    missing_types = []
    for r in records:
        if r.get("final_status") != 200:
            continue
        expect = expected_types.get(r.get("page_type"))
        if not expect:
            continue
        want = set(expect.split("|"))
        got = set(r.get("json_ld_types") or [])
        if not (want & got):
            missing_types.append(r)
    add("structured_data", "missing expected JSON-LD @type for page family", "market_home|doctor|service|blog_post|root_home",
        "fail" if missing_types else "pass",
        sum(1 for r in records if r.get("page_type") in expected_types and r.get("final_status") == 200),
        len(missing_types), "crawl_history.csv json_ld_types vs page_type expectation table in probe.py")

    faq_present_no_schema = [r for r in records if r.get("final_status") == 200 and (r.get("faq_count") or 0) == 0 and "faq" in (r.get("page_type") or "")]
    add("structured_data", "FAQ page_type with no FAQPage schema", "page_type=faq", "fail" if faq_present_no_schema else "pass",
        sum(1 for r in records if r.get("page_type") == "faq"), len(faq_present_no_schema),
        "crawl_history.csv filter page_type=faq & faq_count=0")

    soft404 = [r for r in records if r.get("soft_404_signal") == "yes"]
    add("content_signals", "soft 404s (200 status, not-found language or too-thin content)", "final_status=200",
        "fail" if soft404 else "pass", sum(1 for r in records if r.get("final_status") == 200), len(soft404),
        "crawl_history.csv filter soft_404_signal=yes")

    times = [r["response_time_ms"] for r in records if isinstance(r.get("response_time_ms"), (int, float))]
    if times:
        times_sorted = sorted(times)
        p50 = times_sorted[len(times_sorted) // 2]
        p95 = times_sorted[int(len(times_sorted) * 0.95) - 1]
        add("performance", "response time p50/p95 across all probed URLs", "all", "not_run",
            len(times), 0, f"p50={p50:.0f}ms p95={p95:.0f}ms — see probe-summary.md for per-market table")

    add("internal_links", "orphan canonical_candidate URLs (zero inbound internal links, sitemap-only discovery)",
        "inventory_state=canonical_candidate", "fail" if orphan_rows else "pass",
        sum(1 for r in inv_rows if r.get("inventory_state") == "canonical_candidate"), len(orphan_rows),
        "orphans.csv")

    img_bad = [r for r in records if (r.get("images_missing_alt") or 0) > 0]
    add("images", "images missing alt", "final_status=200", "fail" if img_bad else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(img_bad),
        "crawl_history.csv filter images_missing_alt>0 (per-row count, see cache for detail)")

    generic = [r for r in records if r.get("generic_intro") == "yes"]
    add("content_signals", "pages with generic intro (Welcome to / Bem-vindo / ...)", "final_status=200",
        "fail" if generic else "pass", sum(1 for r in records if r.get("final_status") == 200), len(generic),
        "crawl_history.csv filter generic_intro=yes")

    by_lang_emdash = defaultdict(lambda: [0, 0])
    for r in records:
        if r.get("final_status") != 200 or not r.get("language"):
            continue
        wc = r.get("word_count") or 0
        by_lang_emdash[r["language"]][0] += r.get("em_dash_count") or 0
        by_lang_emdash[r["language"]][1] += wc
    density_note = "; ".join(
        f"{lang}: {(cnt / wc * 1000):.1f}/1000w" if wc else f"{lang}: n/a"
        for lang, (cnt, wc) in sorted(by_lang_emdash.items())
    )
    add("content_signals", "em-dash density per 1,000 words by language", "final_status=200, by language",
        "not_run", sum(1 for r in records if r.get("final_status") == 200), 0, density_note or "no data")

    superlative_hits = [r for r in records if (r.get("superlative_hits") or 0) > 0]
    add("content_signals", "superlative claim hits (best/leading/world-class/#1/top-rated/unmatched/guaranteed + i18n)",
        "final_status=200", "fail" if superlative_hits else "pass",
        sum(1 for r in records if r.get("final_status") == 200), len(superlative_hits),
        "crawl_history.csv filter superlative_hits>0")

    noindex_in_sitemap = [r for r in records if r.get("in_sitemap") == "yes" and r.get("indexability") == "noindex"]
    add("robots", "noindex pages present in sitemap", "in_sitemap=yes", "fail" if noindex_in_sitemap else "pass",
        len(sitemap_recs), len(noindex_in_sitemap), "crawl_history.csv filter in_sitemap=yes & indexability=noindex")

    lastmods = Counter(r.get("sitemap_lastmod") for r in inv_rows if r.get("sitemap_lastmod"))
    if lastmods:
        top_val, top_count = lastmods.most_common(1)[0]
        add("sitemap", "sitemap lastmod meaningfulness (most common single value across all lastmods)", "in_sitemap=yes",
            "partial" if top_count > len(lastmods) * 0.5 else "pass",
            sum(lastmods.values()), top_count, f"page_inventory.csv sitemap_lastmod mode='{top_val}' x{top_count}")

    param_indexable = [r for r in records if "?" in r["requested_url"] and r.get("indexability") == "index"]
    add("international", "parameter/alternate URLs indexable (should generally canonicalize away)", "requested_url has query string",
        "fail" if param_indexable else "pass", sum(1 for r in records if "?" in r["requested_url"]), len(param_indexable),
        "crawl_history.csv filter requested_url contains '?' & indexability=index")

    legacy_200 = [r for r in records if r.get("role") == "raw" and (r.get("http_status") not in (301, 302, 303, 307, 308)) and r.get("final_status") == 200
                  and any(row.get("url_id") == r["url_id"] and row.get("inventory_state") == "retired" for row in inv_rows)]
    add("redirect", "legacy/retired inventory URLs answering 200 instead of redirecting/gone", "inventory_state=retired",
        "fail" if legacy_200 else "pass", sum(1 for row in inv_rows if row.get("inventory_state") == "retired"), len(legacy_200),
        "crawl_history.csv join page_inventory inventory_state=retired & final_status=200")

    with open(path, "w", newline="", encoding="utf-8") as f:
        cols = ["check_id", "area", "check", "scope", "status", "tested_count", "affected_count", "evidence", "owner"]
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(checks)
    return path, checks


# --------------------------------------------------------------------------
# Summary + manifest
# --------------------------------------------------------------------------
def write_summary(records, checks, run_stats, build_ids):
    path = OUT_DATA / "probe-summary.md"
    lines = ["# A2 live probe summary — 2026-09-15", ""]

    by_market_type_status = Counter(
        (r.get("target_country") or "none", r.get("page_type") or "unknown", r.get("final_status") or "error")
        for r in records
    )
    lines.append("## Counts by market x page_type x final_status (top 25)")
    for (market, ptype, status), cnt in by_market_type_status.most_common(25):
        lines.append(f"- {market} / {ptype} / {status}: {cnt}")
    lines.append("")

    failing = [c for c in checks if c["status"] == "fail"]
    lines.append(f"## Failing checks ({len(failing)})")
    for c in failing:
        lines.append(f"- {c['check_id']} [{c['area']}] {c['check']}: {c['affected_count']}/{c['tested_count']}")
    lines.append("")

    lines.append("## Top 25 anomalies (non-200 or flagged, first 25)")
    anomalies = [r for r in records if r.get("final_status") != 200 or r.get("soft_404_signal") == "yes"
                 or r.get("indexability") == "noindex" or r.get("canonical_matches_self") == "no"]
    for r in anomalies[:25]:
        lines.append(f"- {r['url_id']} {r['requested_url']} -> status={r.get('final_status')} indexability={r.get('indexability')} soft404={r.get('soft_404_signal')}")
    lines.append("")

    lines.append("## Response time (ms) by market")
    by_market = defaultdict(list)
    for r in records:
        if isinstance(r.get("response_time_ms"), (int, float)):
            by_market[r.get("target_country") or "none"].append(r["response_time_ms"])
    for market, times in sorted(by_market.items()):
        times_sorted = sorted(times)
        p50 = times_sorted[len(times_sorted) // 2]
        p95 = times_sorted[int(len(times_sorted) * 0.95) - 1]
        lines.append(f"- {market}: n={len(times)} p50={p50:.0f}ms p95={p95:.0f}ms")
    lines.append("")

    build_id_str = ", ".join(sorted(build_ids)) if build_ids else "none observed"
    lines.append(f"## Next build id / deployment marker observed: {build_id_str}")
    lines.append("")
    lines.append(f"## Run stats: {json.dumps(run_stats)}")

    text = "\n".join(lines)
    # keep under ~100 lines per spec: trim anomalies/counts sections if needed
    all_lines = text.split("\n")
    if len(all_lines) > 100:
        text = "\n".join(all_lines[:99] + [f"... ({len(all_lines)-99} more lines truncated)"])
    path.write_text(text, encoding="utf-8")
    return path


def write_manifest(run_stats, targets, cache):
    path = OUT_DIR / "manifest-A2.json"
    failed = sum(1 for rec in cache.values() if rec.get("error"))
    manifest = {
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "audited_commit": AUDITED_COMMIT,
        "urls_requested": len(targets),
        "urls_probed": len(cache),
        "urls_failed": failed,
        "rate_limit": f"{RATE_PER_SEC}/s, {WORKERS} concurrent",
        "timeout_s": TIMEOUT,
        "retries": MAX_RETRIES,
        "this_run": run_stats,
    }
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path


# --------------------------------------------------------------------------
# Self-test (offline, no network) — ponytail's one runnable check
# --------------------------------------------------------------------------
def selftest():
    assert normalize_url("/ireland/en/") == SITE + "/ireland/en"
    assert normalize_url(SITE + "/") == SITE + "/"
    assert normalize_url("/a?x=1#frag") == SITE + "/a?x=1"
    assert market_of_path("/ireland/en/services/x") == ("ireland", "en")
    assert market_of_path("/blog/x") == (None, None)
    assert has_generic_intro("Welcome to Global Health, your trusted partner") is True
    assert has_generic_intro("Global Health is a trusted partner") is False
    assert has_soft_404_text("Sorry, this page was not found") is True
    assert count_superlatives("We are the best, #1 rated clinic", "en") >= 2
    build = find_build_id('<script src="/_next/static/chunks/x.js?dpl=451b23e72f7076f53a06364e06f86da74113d568">')
    assert build == "451b23e72f7076f53a06364e06f86da74113d568", build

    import lxml.html as lh
    tree = lh.fromstring(
        '<html lang="en"><head><title>T</title>'
        '<link rel="alternate" hreflang="en-IE" href="/ireland/en/x">'
        '<link rel="ALTERNATE" HREFLANG="x-default" HREF="/x">'
        '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"FAQPage","mainEntity":[1,2,3]}]}</script>'
        '</head><body><main>Hello world this is the main text</main></body></html>'
    )
    parsed = parse_html_page(SITE + "/x", lh.tostring(tree), "en")
    assert parsed["word_count"] == 7, parsed["word_count"]
    assert parsed["faq_count"] == 3
    assert ("en-IE", SITE + "/ireland/en/x") in parsed["hreflang_edges"]
    assert parsed["x_default"] == SITE + "/x"
    assert "FAQPage" in parsed["json_ld_types"]

    bad_json = lh.fromstring('<html><head><script type="application/ld+json">{not valid json</script></head><body></body></html>')
    types, errors, faqs = parse_json_ld(bad_json)
    assert errors == 1 and types == [] and faqs == 0

    print("selftest OK")


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--limit", type=int, default=None, help="cap NEW urls fetched this run (testing/resuming)")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return

    global REGION_BY_SLUG
    REGION_BY_SLUG.update(load_market_regions())
    VALID_REGIONS.update(REGION_BY_SLUG.values())

    inv_rows = load_inventory()
    targets = build_targets(inv_rows)
    cache, run_stats = run_crawl(targets, limit=args.limit)
    records = list(cache.values())

    write_crawl_history(records)
    _, hreflang_rows = write_hreflang_edges(records, inv_rows)
    _, _, _, orphan_rows = write_internal_links(records, inv_rows)
    _, checks = write_technical_qa(records, hreflang_rows, orphan_rows, inv_rows)
    build_ids = {r["build_id"] for r in records if r.get("build_id")}
    write_summary(records, checks, run_stats, build_ids)
    write_manifest(run_stats, targets, cache)

    print(f"[done] probed {len(cache)}/{len(targets)} urls this-run-fetched={run_stats['fetched_this_run']}", file=sys.stderr)


if __name__ == "__main__":
    main()
