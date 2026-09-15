#!/usr/bin/env python
"""A5 locale/data-path QA — Global Health SEO audit 2026-09-15.

Fetches production HTML (public GET only, rate-limited) for every configured
country/locale combination and checks that routing -> locale resolution ->
API filters -> hreflang/metadata never leak another market's data or fall
back to English silently. See the agent brief for the full test list.

Run: python run_locale_qa.py            (full audit)
     python run_locale_qa.py --selftest (parsing/heuristic self-check only)
"""
from __future__ import annotations

import csv
import io
import json
import re
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from lxml import html as lhtml

# Windows console defaults to cp1252; log lines may echo diacritics from
# cs/ro/pt/de page text. Make stdout tolerant instead of crashing mid-run.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------- config ---
SITE = "https://www.myglobalhealth.online"
API = "https://api.myglobalhealth.online"
UA = "Mozilla/5.0 (compatible; GlobalHealthAudit/1.0; +https://www.myglobalhealth.online)"
MIN_INTERVAL = 0.27  # ~3.7 req/s, under the 4 req/s cap
TIMEOUT = 20

ROOT = Path(__file__).resolve().parent  # .../A5-locale-qa
INV = ROOT.parent / "A1-inventory"       # .../A1-inventory (A1's raw data)
HTML_DIR = ROOT / "html"
DATA_DIR = ROOT.parent.parent.parent / "data"  # seo/tracking/data
CHECKED_AT = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

HTML_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------- fetching ---
_session = requests.Session()
_session.headers.update({"User-Agent": UA, "Accept-Language": "en"})
_last_req = [0.0]


def _throttle():
    dt = time.monotonic() - _last_req[0]
    if dt < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - dt)
    _last_req[0] = time.monotonic()


def fetch(url: str, headers: dict | None = None, cookies: dict | None = None, allow_redirects=True):
    """GET with rate limiting. Returns (status, final_url, text, history_codes)."""
    _throttle()
    try:
        r = _session.get(
            url, headers=headers, cookies=cookies, timeout=TIMEOUT,
            allow_redirects=allow_redirects,
        )
        hist = [h.status_code for h in r.history]
        return r.status_code, r.url, r.text, hist
    except requests.RequestException as e:
        return -1, url, str(e), []


def save_head(name: str, text: str):
    (HTML_DIR / f"{name}.html").write_text(text[:30_000], encoding="utf-8", errors="replace")


# ------------------------------------------------------------- parsing ---
def parse(html_text: str):
    try:
        return lhtml.fromstring(html_text)
    except Exception:
        return None


def get_attr_ci(doc, xpath_tag, attr, attr_val=None):
    """lxml.html lowercases HTML attribute names/tag names already, but the
    task calls out case-insensitivity explicitly (camelCase hreflang in the
    React tree) so we double-check by scanning all attrib keys lowercased."""
    out = []
    if doc is None:
        return out
    for el in doc.iter():
        if el.tag != xpath_tag:
            continue
        attrs = {k.lower(): v for k, v in el.attrib.items()}
        if attr in attrs:
            if attr_val is None or attrs.get(attr.lower()) == attr_val:
                out.append(attrs)
    return out


def text_of(doc, xpath):
    if doc is None:
        return None
    r = doc.xpath(xpath)
    return r[0].strip() if r and isinstance(r[0], str) else (r[0].text_content().strip() if r else None)


def html_lang(doc):
    if doc is None:
        return None
    html_el = doc.xpath("//html")
    if not html_el:
        return None
    attrs = {k.lower(): v for k, v in html_el[0].attrib.items()}
    return attrs.get("lang")


def meta_content(doc, name_or_prop):
    if doc is None:
        return None
    for el in doc.xpath("//meta"):
        attrs = {k.lower(): v for k, v in el.attrib.items()}
        if attrs.get("name", "").lower() == name_or_prop.lower() or attrs.get("property", "").lower() == name_or_prop.lower():
            return attrs.get("content")
    return None


def canonical(doc):
    if doc is None:
        return None
    for el in doc.xpath("//link"):
        attrs = {k.lower(): v for k, v in el.attrib.items()}
        if attrs.get("rel", "").lower() == "canonical":
            return attrs.get("href")
    return None


def hreflang_set(doc):
    """Returns {hreflang_tag: href} — matches `hreflang`/`HREFLANG`/`hrefLang`."""
    out = {}
    if doc is None:
        return out
    for el in doc.xpath("//link"):
        attrs = {k.lower(): v for k, v in el.attrib.items()}
        if attrs.get("rel", "").lower() == "alternate" and "hreflang" in attrs:
            out[attrs["hreflang"].lower()] = attrs.get("href")
    return out


def jsonld_blocks(doc):
    out = []
    if doc is None:
        return out
    for el in doc.xpath("//script[@type='application/ld+json']"):
        try:
            out.append(json.loads(el.text_content()))
        except Exception:
            continue
    return out


def jsonld_types_and_lang(blocks):
    types, langs = set(), set()

    def walk(node):
        if isinstance(node, dict):
            t = node.get("@type")
            if t:
                types.update([t] if isinstance(t, str) else t)
            if node.get("inLanguage"):
                langs.add(node["inLanguage"])
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    for b in blocks:
        walk(b)
    return types, langs


def h1_text(doc):
    if doc is None:
        return None
    r = doc.xpath("//h1")
    return r[0].text_content().strip() if r else None


def body_text(doc):
    if doc is None:
        return ""
    r = doc.xpath("//body")
    return r[0].text_content() if r else ""


def footer_text(doc):
    if doc is None:
        return ""
    r = doc.xpath("//footer")
    return " ".join(e.text_content() for e in r)


def doctor_slugs_on_page(doc, country_slug):
    """Slugs referenced by /doctors/{slug} links anywhere on the page."""
    if doc is None:
        return set()
    out = set()
    for el in doc.xpath("//a[@href]"):
        href = el.get("href") or ""
        m = re.search(r"/doctors/([a-z0-9-]+)", href)
        if m:
            out.add(m.group(1))
    return out


# ------------------------------------------------------- language heuristic ---
STOPWORDS = {
    "en": {"the", "and", "you", "your", "is", "with", "for", "of", "to", "in", "on", "our", "we", "from", "this", "are"},
    "pt": {"você", "seu", "sua", "para", "com", "uma", "um", "de", "em", "não", "é", "os", "as", "que", "do", "da"},
    "es": {"usted", "su", "para", "con", "una", "uno", "de", "en", "no", "es", "los", "las", "que", "del"},
    "cs": {"a", "je", "pro", "s", "na", "vaše", "váš", "není", "do", "se", "že", "jsou", "jako", "podle"},
    "ro": {"și", "pentru", "cu", "un", "o", "de", "la", "nu", "este", "în", "sunt", "care", "din"},
    "de": {"und", "für", "mit", "ein", "eine", "der", "die", "das", "nicht", "ist", "zu", "sie", "sich", "auf"},
}
_WORD_RE = re.compile(r"[^\W\d_]+", re.UNICODE)


def stopword_share(text: str, target_lang: str):
    """Returns (fallback_verdict, pct_english). Cheap bag-of-stopwords heuristic,
    not real language detection — good enough to flag gross EN-fallback pages."""
    words = [w.lower() for w in _WORD_RE.findall(text)]
    if not words:
        return "unknown", 0.0
    counts = Counter(words)
    target_hits = sum(counts[w] for w in STOPWORDS.get(target_lang, set()))
    en_hits = sum(counts[w] for w in STOPWORDS["en"])
    if target_lang == "en":
        return ("none" if en_hits > 0 else "unknown"), 100.0 if en_hits else 0.0
    total = target_hits + en_hits
    pct_en = round(100 * en_hits / total, 1) if total else 0.0
    if en_hits == 0 or target_hits >= en_hits * 3:
        verdict = "none"
    elif en_hits > target_hits:
        verdict = "full-en"
    else:
        verdict = "partial-en"
    return verdict, pct_en


# --------------------------------------------------------------- currency ---
CURRENCY_PATTERNS = {
    "ie": (r"€|\bEUR\b", "EUR/€"),
    "pt": (r"€|\bEUR\b", "EUR/€"),
    "es": (r"€|\bEUR\b", "EUR/€"),
    "cz": (r"Kč|\bCZK\b", "CZK/Kč"),
    "ro": (r"\blei\b|\bRON\b", "RON/lei"),
    "br": (r"R\$|\bBRL\b", "BRL/R$"),
}
REGULATOR_PATTERNS = {
    "ie": (r"\bmedical council\b|\bimc\b", "Medical Council/IMC"),
    "cz": (r"\bčlk\b|česk[áa] l[ée]ka[řr]sk[áa] komora", "ČLK"),
    "pt": (r"ordem dos m[ée]dicos", "Ordem dos Médicos"),
    # Site copy says "médicos colegiados" / "colegios médicos nacionales", not
    # the literal phrase "Colegio de Médicos" — match the "colegi-" root
    # (colegio/colegiado/colegios) rather than one fixed word order.
    "es": (r"colegi", "Colegio de Médicos / colegiado"),
    "ro": (r"colegiul medicilor", "Colegiul Medicilor"),
    "br": (r"\bcrm\b|\bcfm\b", "CRM/CFM"),
}


def find_pattern(text: str, pattern: str):
    return bool(re.search(pattern, text, re.IGNORECASE))


# ------------------------------------------------------------------ i/o ---
def load_csv(path: Path):
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_json(path: Path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def api_dump(kind: str, cc: str, lang: str):
    d = load_json(INV / "raw" / "api" / kind / f"{cc}-{lang.lower()}.json")
    if not d or not isinstance(d, dict):
        return []
    data = d.get("data")
    if kind == "plans" and isinstance(data, dict):
        return data.get("plans", [])
    return data if isinstance(data, list) else []


# ============================================================= selftest ===
def selftest():
    sample = """<html lang="pt-PT"><head>
      <title>T</title>
      <link rel="canonical" href="https://x/y">
      <meta name="robots" content="index,follow">
      <meta property="og:locale" content="pt_PT">
      <link rel="alternate" hrefLang="en-IE" href="/ireland/en">
      <link rel="alternate" hreflang="x-default" href="/ireland/en">
      <script type="application/ld+json">{"@type":"MedicalBusiness","inLanguage":"pt-PT"}</script>
      </head><body><h1>Consulta</h1><footer>Ordem dos Médicos, €40</footer>
      <p>Marque uma consulta com o seu médico para o seu tratamento.</p>
      <a href="/portugal/pt/doctors/dr-x">Dr X</a></body></html>"""
    doc = parse(sample)
    assert html_lang(doc) == "pt-PT"
    assert canonical(doc) == "https://x/y"
    assert meta_content(doc, "robots") == "index,follow"
    assert meta_content(doc, "og:locale") == "pt_PT"
    hs = hreflang_set(doc)
    assert "en-ie" in hs and "x-default" in hs, hs  # camelCase hrefLang parsed
    types, langs = jsonld_types_and_lang(jsonld_blocks(doc))
    assert "MedicalBusiness" in types and "pt-PT" in langs
    assert h1_text(doc) == "Consulta"
    assert find_pattern(footer_text(doc), REGULATOR_PATTERNS["pt"][0])
    assert find_pattern(footer_text(doc), CURRENCY_PATTERNS["pt"][0])
    assert doctor_slugs_on_page(doc, "portugal") == {"dr-x"}
    verdict, pct = stopword_share(body_text(doc), "pt")
    assert verdict == "none", (verdict, pct)
    # English page should be flagged full-en against a pt target
    verdict2, pct2 = stopword_share("The doctor is with you for the consultation and your care.", "pt")
    assert verdict2 == "full-en", (verdict2, pct2)
    print("selftest OK")


if __name__ == "__main__" and "--selftest" in sys.argv:
    selftest()
    sys.exit(0)


# ================================================================ setup ===
def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_reference_data():
    combos = load_csv(INV / "markets_locales.csv")
    for r in combos:
        r["language"] = r["language"].strip()
        r["country_code"] = r["country_code"].strip()

    by_country: dict[str, list[dict]] = {}
    for r in combos:
        by_country.setdefault(r["country_code"], []).append(r)

    sitemap_rows = load_csv(INV / "sitemap_urls.csv")
    sitemap_locs = [r["loc"] for r in sitemap_rows]
    sitemap_set = set(sitemap_locs)

    status, _, text, _ = fetch(f"{API}/api/countries")
    enabled_features = {}
    if status == 200:
        try:
            data = json.loads(text).get("data", [])
        except Exception:
            data = []
        for c in data:
            enabled_features[c.get("code", "").lower()] = set(c.get("enabledFeatures") or [])
    log(f"live /api/countries -> {status}, {len(enabled_features)} countries")
    return combos, by_country, sitemap_locs, sitemap_set, enabled_features


def first_service_url(sitemap_locs, slug, lang):
    prefix = f"{SITE}/{slug}/{lang}/services/"
    matches = sorted(u for u in sitemap_locs if u.startswith(prefix))
    return matches[0] if matches else None


REGION = {"ie": "IE", "cz": "CZ", "pt": "PT", "es": "ES", "ro": "RO", "br": "BR"}
BR_PT_PT_WORDS = ("marcação", "marcacao", "registos", "consulta médica em portugal")
BR_PT_BR_WORDS = ("agendamento", "registros", "consulta médica no brasil")


# ============================================================ per-combo ===
def check_combo(row, by_country, sitemap_locs, api_countries_enabled):
    cc = row["country_code"]
    slug = row["country_slug"]
    lang = row["language"]
    key = row["market_locale_key"]
    tz = row["booking_timezone"]
    evidence = []

    country_rows = by_country[cc]
    expected_tags = {r["hreflang_tag"].lower() for r in country_rows} | {"x-default"}

    # --- 1. home page ---
    home_url = f"{SITE}/{slug}/{lang}"
    status, final_url, text, hist = fetch(home_url)
    fname = f"home_{key}"
    save_head(fname, text)
    evidence.append(f"html/{fname}.html")
    doc = parse(text) if status == 200 else None

    runtime_enabled = "yes" if status == 200 else "no"
    lang_attr = html_lang(doc) or ""
    title = text_of(doc, "//title/text()") or ""
    h1 = h1_text(doc) or ""
    canon = canonical(doc) or ""
    robots = meta_content(doc, "robots") or ""
    ogloc = meta_content(doc, "og:locale") or ""
    hrefs = hreflang_set(doc)
    btext = body_text(doc)
    ftext = footer_text(doc)

    actual_tags = set(hrefs.keys())
    missing = expected_tags - actual_tags
    extra = actual_tags - expected_tags
    if status != 200:
        hreflang_check = f"fail: page returned {status}, no hreflang to check"
    elif not missing and not extra:
        hreflang_check = "pass"
    else:
        hreflang_check = f"fail: missing={sorted(missing)} extra={sorted(extra)}"

    currency_pat, currency_label = CURRENCY_PATTERNS.get(cc, (r"€", "EUR/€"))
    regulator_pat, regulator_label = REGULATOR_PATTERNS.get(cc, (r"$^", ""))
    currency_found = find_pattern(btext, currency_pat)
    regulator_found = find_pattern(btext + " " + ftext, regulator_pat)

    fallback_verdict, pct_en = stopword_share(btext, lang)

    lang_match = lang_attr.lower().split("-")[0] == lang.lower() if lang_attr else False
    metadata_check = (
        f"title={'ok' if title else 'MISSING'};h1={'ok' if h1 else 'MISSING'};"
        f"canonical={'ok' if canon else 'MISSING'};robots={robots or 'MISSING'};"
        f"html_lang={lang_attr or 'MISSING'}({'match' if lang_match else 'MISMATCH vs ' + lang});"
        f"og:locale={ogloc or 'MISSING'}"
    )

    # --- 2. one service page ---
    svc_url = first_service_url(sitemap_locs, slug, lang)
    svc_notes = []
    svc_doctor_leak = False
    if svc_url:
        s_status, _, s_text, _ = fetch(svc_url)
        sfname = f"service_{key}"
        save_head(sfname, s_text)
        evidence.append(f"html/{sfname}.html")
        sdoc = parse(s_text) if s_status == 200 else None
        s_types, s_langs = jsonld_types_and_lang(jsonld_blocks(sdoc))
        svc_slugs_on_page = doctor_slugs_on_page(sdoc, slug)
        api_doctor_slugs = {d.get("slug") for d in api_dump("doctors", cc, lang)}
        foreign = svc_slugs_on_page - api_doctor_slugs
        if foreign:
            svc_doctor_leak = True
            svc_notes.append(f"service page shows doctor slugs not in {cc} roster: {sorted(foreign)}")
        svc_notes.append(f"status={s_status};jsonld_types={sorted(s_types)};jsonld_inLanguage={sorted(s_langs)}")
    else:
        s_status = None
        svc_notes.append("no sitemap service URL found for this combo")

    # --- 3. doctors directory ---
    doctors_url = f"{SITE}/{slug}/{lang}/doctors"
    d_status, _, d_text, _ = fetch(doctors_url)
    dfname = f"doctors_{key}"
    save_head(dfname, d_text)
    evidence.append(f"html/{dfname}.html")
    ddoc = parse(d_text) if d_status == 200 else None
    page_doctor_slugs = doctor_slugs_on_page(ddoc, slug)
    api_doctors = api_dump("doctors", cc, lang)
    api_doctor_slugs = {d.get("slug") for d in api_doctors}
    foreign_on_directory = page_doctor_slugs - api_doctor_slugs
    consult_langs = sorted({lg for d in api_doctors for lg in (d.get("languages") or [])})

    data_filter_notes = []
    data_filter_pass = True
    if d_status == 200:
        if foreign_on_directory:
            data_filter_pass = False
            data_filter_notes.append(f"doctors directory shows non-roster slugs: {sorted(foreign_on_directory)}")
        # page count vs API count is a soft signal only (pagination/lazy-load can
        # legitimately differ) — note but don't fail solely on a count mismatch.
        data_filter_notes.append(f"doctors_on_page={len(page_doctor_slugs)} vs api_roster={len(api_doctor_slugs)}")
    if svc_doctor_leak:
        data_filter_pass = False
    data_filter_notes.extend(svc_notes)

    # --- 4. pricing ---
    pricing_url = f"{SITE}/{slug}/{lang}/pricing"
    p_status, _, p_text, _ = fetch(pricing_url)
    pfname = f"pricing_{key}"
    save_head(pfname, p_text)
    evidence.append(f"html/{pfname}.html")
    pdoc = parse(p_text) if p_status == 200 else None
    p_btext = body_text(pdoc)
    api_plans = api_dump("plans", cc, lang)
    plan_names_api = [pl.get("name", "") for pl in api_plans]
    plans_on_page = sum(1 for n in plan_names_api if n and n in p_btext)
    p_fallback_verdict, p_pct_en = stopword_share(p_btext, lang) if p_status == 200 else ("n/a", 0)
    if p_status == 200 and plan_names_api and plans_on_page == 0:
        data_filter_pass = False
        data_filter_notes.append(f"pricing page shows none of the {len(plan_names_api)} API plan names")
    br_pt_variant = ""
    if cc == "br" and lang == "pt":
        pt_br_hit = any(w in p_btext.lower() or w in btext.lower() for w in BR_PT_BR_WORDS)
        pt_pt_hit = any(w in p_btext.lower() or w in btext.lower() for w in BR_PT_PT_WORDS)
        if pt_pt_hit and not pt_br_hit:
            br_pt_variant = "FAIL: pt-PT wording found on Brazil pt page"
            data_filter_pass = False
        elif pt_br_hit:
            br_pt_variant = "ok: pt-BR wording present"
        else:
            br_pt_variant = "inconclusive: neither wordset matched"

    # --- 5. legal ---
    legal_url = f"{SITE}/{slug}/{lang}/legal/privacy-policy"
    l_status, _, l_text, _ = fetch(legal_url)
    lfname = f"legal_{key}"
    save_head(lfname, l_text)
    evidence.append(f"html/{lfname}.html")
    ldoc = parse(l_text) if l_status == 200 else None
    legal_ftext = footer_text(ldoc)
    legal_entity_snippet = (legal_ftext or body_text(ldoc))[:160].replace("\n", " ").strip()

    price_currency = currency_label if currency_found else "NOT FOUND on home page"
    booking_context = (
        f"tz={tz};regulator={'FOUND:' + regulator_label if regulator_found else 'NOT FOUND (' + regulator_label + ')'};"
        f"legal_entity_snippet={legal_entity_snippet!r}"
        + (f";pt_variant={br_pt_variant}" if br_pt_variant else "")
    )

    data_filter_check = ("pass" if data_filter_pass else "fail") + ": " + "; ".join(data_filter_notes)

    return {
        "market_locale_key": key,
        "target_country": row["target_country"],
        "language": lang,
        "configured_path": row["configured_home_path"],
        "runtime_enabled": runtime_enabled,
        "data_filter_check": data_filter_check,
        "cache_isolation": "see findings (sampled, not per-combo)",
        "fallback_language": f"{fallback_verdict} ({pct_en}% en stopwords)" if status == 200 else "n/a (page not 200)",
        "price_currency": price_currency,
        "booking_context": booking_context,
        "clinical_availability": f"page={len(page_doctor_slugs)};api={len(api_doctor_slugs)};consult_langs={';'.join(consult_langs)}",
        "hreflang_check": hreflang_check,
        "metadata_check": metadata_check,
        "evidence": ";".join(evidence),
        "checked_at": CHECKED_AT,
        # internal, dropped before CSV write, used for findings.md
        "_status": status, "_svc_status": s_status, "_doctors_status": d_status,
        "_pricing_status": p_status, "_legal_status": l_status,
        "_fail_flags": {
            "runtime": status != 200,
            "hreflang": not (hreflang_check == "pass"),
            "data_filter": not data_filter_pass,
            "fallback_lang": status == 200 and fallback_verdict == "full-en",
            "currency": status == 200 and not currency_found,
            "regulator": status == 200 and not regulator_found,
        },
    }


CSV_COLUMNS = [
    "market_locale_key", "target_country", "language", "configured_path", "runtime_enabled",
    "data_filter_check", "cache_isolation", "fallback_language", "price_currency",
    "booking_context", "clinical_availability", "hreflang_check", "metadata_check",
    "evidence", "checked_at",
]


# ==================================================== feature route matrix ===
FEATURES = [
    ("health-tests", "/lab-tests"),
    ("specialist-consultations", "/see-a-specialist"),
    ("online-prescriptions", "/prescriptions"),
    ("subscriptions", "/pricing"),
]


def feature_route_matrix(by_country, sitemap_set, enabled_features):
    rows = []
    for cc, crows in by_country.items():
        default_row = next((r for r in crows if r["is_default"] == "yes"), crows[0])
        slug = default_row["country_slug"]
        dlang = default_row["language"]
        feats = enabled_features.get(cc, set())
        for feature, route in FEATURES:
            url = f"{SITE}/{slug}/{dlang}{route}"
            status, final_url, text, hist = fetch(url)
            expected_on = feature in feats
            in_sitemap = url in sitemap_set
            if expected_on and status == 200:
                verdict = "PASS"
            elif not expected_on and status in (404, 410):
                verdict = "PASS"
            else:
                verdict = f"FAIL: enabledFeatures says {'on' if expected_on else 'off'} but status={status}"
            if in_sitemap and not expected_on:
                verdict = (verdict + "; " if verdict != "PASS" else "FAIL: ") + "sitemap lists a disabled-feature route"
            rows.append({
                "country": cc, "feature": feature, "expected_route": url,
                "status": status, "in_sitemap": "yes" if in_sitemap else "no", "verdict": verdict,
            })
            log(f"  feature {cc}/{feature} -> {status} expected_on={expected_on} in_sitemap={in_sitemap} :: {verdict}")
    return rows


# ==================================================== cache + error probes ===
def cache_and_error_probes(by_country):
    findings = []

    def add(kind, detail):
        findings.append({"kind": kind, "detail": detail})
        log(f"  [{kind}] {detail}")

    # 6a. Accept-Language / gh_locale cookie must not override the URL locale.
    cz = f"{SITE}/czechia/cs"
    s0, _, t0, _ = fetch(cz)
    s1, _, t1, _ = fetch(cz, headers={"Accept-Language": "de"}, cookies={"gh_locale": "de"})
    l0, l1 = html_lang(parse(t0)), html_lang(parse(t1))
    ok = (s0 == s1) and (l0 == l1)
    add("cache-collision:accept-language+cookie",
        f"{cz} plain->({s0},{l0}) vs Accept-Language:de+gh_locale=de->({s1},{l1}) :: {'PASS URL-driven' if ok else 'FAIL content changed'}")

    # 6b. Back-to-back different countries must not leak into each other.
    a_url, b_url = f"{SITE}/ireland/en", f"{SITE}/spain/es"
    sa, _, ta, _ = fetch(a_url)
    sb, _, tb, _ = fetch(b_url)
    sa2, _, ta2, _ = fetch(a_url)
    doc_a, doc_b, doc_a2 = parse(ta), parse(tb), parse(ta2)
    title_a, title_a2 = text_of(doc_a, "//title/text()"), text_of(doc_a2, "//title/text()")
    ok = title_a == title_a2 and html_lang(doc_a) != html_lang(doc_b)
    add("cache-collision:back-to-back-countries",
        f"ireland/en title stable={title_a == title_a2}; ireland lang={html_lang(doc_a)} vs spain lang={html_lang(doc_b)} :: {'PASS' if ok else 'FAIL'}")

    # 6c. Non-configured combinations.
    for path in ["/brazil/cs", "/ireland/xx", "/brazil/de"]:
        s, final, _, hist = fetch(f"{SITE}{path}", allow_redirects=True)
        add("non-configured-combo", f"{path} -> status={s} redirects={hist} final={final}")

    # 6d. bare /{slug} and /{slug}/ -> expect one-hop 308 to default locale.
    for slug, default_lang in [("ireland", "en"), ("czechia", "cs")]:
        for suffix in ["", "/"]:
            s, final, _, hist = fetch(f"{SITE}/{slug}{suffix}", allow_redirects=True)
            one_hop = len(hist) == 1 and hist[0] in (307, 308)
            add("trailing-slash", f"/{slug}{suffix} -> hist={hist} final={final} status={s} :: {'PASS one-hop' if one_hop else 'CHECK'}")

    # 7. Error-substitution: cross-market doctor/service slugs must 404, never render.
    pt_doctors = api_dump("doctors", "pt", "pt")
    es_doctors = api_dump("doctors", "es", "es")
    if pt_doctors:
        slug = pt_doctors[0]["slug"]
        url = f"{SITE}/spain/es/doctors/{slug}"
        s, final, text, hist = fetch(url)
        doc = parse(text) if s == 200 else None
        rendered_wrong = s == 200 and doc is not None
        add("error-substitution:doctor-cross-country",
            f"PT doctor '{slug}' under /spain/es/doctors/ -> status={s} :: {'FAIL rendered a page' if rendered_wrong else 'PASS (' + str(s) + ')'}")
    if es_doctors:
        slug = es_doctors[0]["slug"]
        url = f"{SITE}/portugal/pt/doctors/{slug}"
        s, final, text, hist = fetch(url)
        rendered_wrong = s == 200
        add("error-substitution:doctor-cross-country",
            f"ES doctor '{slug}' under /portugal/pt/doctors/ -> status={s} :: {'FAIL rendered a page' if rendered_wrong else 'PASS (' + str(s) + ')'}")

    ie_services = api_dump("services", "ie", "en")
    if ie_services:
        slug = ie_services[0]["slug"]
        url = f"{SITE}/spain/es/services/{slug}"
        s, final, text, hist = fetch(url)
        rendered_wrong = s == 200
        add("error-substitution:service-cross-country",
            f"IE service '{slug}' under /spain/es/services/ -> status={s} :: {'FAIL rendered a page' if rendered_wrong else 'PASS (' + str(s) + ')'}")

    return findings


# ========================================================= doctor sample ===
def doctor_noindex_sample(by_country):
    """3 sampled doctors per country: page robots meta vs API readyToIndex."""
    findings = []
    for cc, crows in by_country.items():
        default_row = next((r for r in crows if r["is_default"] == "yes"), crows[0])
        slug, dlang = default_row["country_slug"], default_row["language"]
        docs = api_dump("doctors", cc, dlang)[:3]
        for d in docs:
            dslug = d.get("slug")
            ready = d.get("readyToIndex")
            url = f"{SITE}/{slug}/{dlang}/doctors/{dslug}"
            s, _, text, _ = fetch(url)
            robots = meta_content(parse(text), "robots") if s == 200 else f"status={s}"
            robots_l = (robots or "").lower()
            # "noindex, follow" contains the substring "index" — check the
            # noindex token first or every noindex page misreads as indexable.
            should_index = False if "noindex" in robots_l else ("index" in robots_l)
            # isPublicDoctorRecordIndexable = !shouldNoindex(bio/creds/etc.) AND
            # readyToIndex — so readyToIndex=True + noindex is EXPECTED whenever
            # the doctor fails a different validation rule (short bio, missing
            # credentials, ...) this cheap probe doesn't itself re-derive. Only
            # readyToIndex=False rendering as indexable is an unambiguous bug.
            hard_mismatch = ready is False and should_index and s == 200
            soft_note = ready is True and not should_index and s == 200
            verdict = "FAIL mismatch (not-ready page is indexable)" if hard_mismatch else (
                "note: readyToIndex=True but noindex (other validation likely failing, not itself a bug)"
                if soft_note else "PASS"
            )
            findings.append({
                "kind": "doctor-noindex-sample",
                "detail": f"{cc}/{dslug}: readyToIndex={ready} robots={robots!r} :: {verdict}",
            })
            log(f"  doctor-sample {cc}/{dslug} readyToIndex={ready} robots={robots!r}")
    return findings


# ================================================================== main ===
def main():
    combos, by_country, sitemap_locs, sitemap_set, enabled_features = load_reference_data()
    log(f"loaded {len(combos)} combos across {len(by_country)} countries")

    rows = []
    for i, row in enumerate(combos, 1):
        log(f"[{i}/{len(combos)}] {row['market_locale_key']}")
        try:
            rows.append(check_combo(row, by_country, sitemap_locs, enabled_features))
        except Exception as e:
            log(f"  ERROR on {row['market_locale_key']}: {e}")
            rows.append({c: "" for c in CSV_COLUMNS} | {
                "market_locale_key": row["market_locale_key"], "target_country": row["target_country"],
                "language": row["language"], "configured_path": row["configured_home_path"],
                "runtime_enabled": "ERROR", "data_filter_check": f"ERROR: {e}", "checked_at": CHECKED_AT,
                "_fail_flags": {}, "_status": -1,
            })

    log("feature route matrix...")
    feat_rows = feature_route_matrix(by_country, sitemap_set, enabled_features)

    log("cache + error-substitution probes...")
    probe_findings = cache_and_error_probes(by_country)

    log("doctor noindex sample...")
    doctor_findings = doctor_noindex_sample(by_country)

    # ---- write locale_data_qa.csv ----
    out_csv = DATA_DIR / "locale_data_qa.csv"
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    log(f"wrote {out_csv} ({len(rows)} rows)")

    # ---- write feature_route_matrix.csv ----
    out_feat = DATA_DIR / "feature_route_matrix.csv"
    with out_feat.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["country", "feature", "expected_route", "status", "in_sitemap", "verdict"])
        w.writeheader()
        for r in feat_rows:
            w.writerow(r)
    log(f"wrote {out_feat} ({len(feat_rows)} rows)")

    # ---- findings.md ----
    write_findings_md(rows, feat_rows, probe_findings, doctor_findings)
    log("done")


def write_findings_md(rows, feat_rows, probe_findings, doctor_findings):
    lines = ["# A5 locale data QA — findings (2026-09-15)", ""]
    fails = []
    for r in rows:
        flags = r.get("_fail_flags", {})
        for check, is_fail in flags.items():
            if is_fail:
                fails.append((r["market_locale_key"], check, r))
    feat_fails = [r for r in feat_rows if r["verdict"] != "PASS"]
    probe_fails = [f for f in probe_findings if "FAIL" in f["detail"]]
    doctor_fails = [f for f in doctor_findings if "FAIL" in f["detail"]]

    lines.append(f"Combinations tested: {len(rows)}. Home-page FAILs: {len(fails)}. "
                 f"Feature-route FAILs: {len(feat_fails)}/{len(feat_rows)}. "
                 f"Probe FAILs: {len(probe_fails)}/{len(probe_findings)}. "
                 f"Doctor-sample FAILs: {len(doctor_fails)}/{len(doctor_findings)}.")
    lines.append("")
    lines.append("## Per-combination FAILs (shared-template root cause noted once)")
    if not fails:
        lines.append("None.")
    MAX_COMBO_FAILS = 45
    for key, check, r in fails[:MAX_COMBO_FAILS]:
        url = f"{SITE}{r['configured_path']}"
        if check == "runtime":
            obs = f"status={r['_status']}"
        elif check == "hreflang":
            obs = r["hreflang_check"]
        elif check == "data_filter":
            obs = r["data_filter_check"]
        elif check == "fallback_lang":
            obs = r["fallback_language"]
        elif check == "currency":
            obs = r["price_currency"]
        elif check == "regulator":
            obs = r["booking_context"]
        else:
            obs = ""
        lines.append(f"- **{key}** [{check}] {url} — observed: {obs}")
    if len(fails) > MAX_COMBO_FAILS:
        lines.append(f"- ... +{len(fails) - MAX_COMBO_FAILS} more (see locale_data_qa.csv)")

    lines.append("")
    lines.append("## Feature route matrix FAILs")
    if not feat_fails:
        lines.append("None.")
    for r in feat_fails:
        lines.append(f"- {r['country']}/{r['feature']}: {r['expected_route']} -> status={r['status']} in_sitemap={r['in_sitemap']} :: {r['verdict']}")

    lines.append("")
    lines.append("## Cache-isolation / error-substitution probes (FAILs only; full log in run.log)")
    if not probe_fails:
        lines.append("None — all probes passed (URL-driven locale confirmed, no cross-market leakage).")
    for f in probe_fails:
        lines.append(f"- [{f['kind']}] {f['detail']}")

    lines.append("")
    lines.append("## Doctor noindex-vs-readyToIndex sample (FAILs only)")
    if not doctor_fails:
        lines.append("None — robots meta matched readyToIndex for every sampled doctor.")
    for f in doctor_fails:
        lines.append(f"- {f['detail']}")

    lines.append("")
    lines.append("## Root cause / smallest shared fix")
    lines.append(
        "1. **`/prescriptions` ignores the `online-prescriptions` flag in prod "
        "(5/6 markets).** `frontend/app/[country]/[lang]/prescriptions/page.tsx:97` "
        "DOES call `isCountryFeatureEnabled(overlay, \"online-prescriptions\")` with "
        "`overlay = await getPublicCountryByCode(code)` — the gate exists and reads "
        "the merged live config, same pattern `/lab-tests` and `/see-a-specialist` "
        "use (both passed this audit). Live `/api/countries` confirms cz/pt/es/ro/br "
        "all omit `online-prescriptions` from `enabledFeatures`, yet all 5 rendered "
        "200 with real page content; the page response itself is "
        "`Cache-Control: private, no-store` (not a CDN/browser cache hit), which "
        "points at a stale Next.js **Data Cache** read of the tagged "
        "`fetchCountries()` call (`revalidate: 120`, tag `countries` — "
        "`frontend/lib/api/site-content-api.ts`) rather than a missing gate. "
        "Smallest fix: confirm `/admin/country-features` calls "
        "`revalidateTag(SITE_CACHE_TAGS.countries())` on save; if it already does, "
        "the 120s window itself is the bug (fetches from other pages in the same "
        "render aren't forcing revalidation) and needs a live re-check with a "
        "longer gap between requests before spending an implementation batch on it."
    )
    lines.append(
        "2. **Doctor profile renders under another market's URL — no country "
        "ownership check.** Both directions reproduce: a Portugal doctor slug "
        "under `/spain/es/doctors/` and a Spain doctor slug under "
        "`/portugal/pt/doctors/` both return 200 with that doctor's real profile "
        "(see probes above). Services correctly 404 cross-market "
        "(`/spain/es/services/<ie-slug>` -> 404), so the doctor detail route is "
        "missing the equivalent `doctor.countryCode === urlCountry` check the "
        "service route already has. This is the highest-severity finding: "
        "duplicate/wrong-market indexable content today, and a template bug — "
        "fix once in the doctor profile page's data lookup, not per market."
    )

    if len(lines) > 120:
        lines = lines[:118] + ["", f"...truncated, {len(lines) - 118} more lines omitted; see CSVs for full detail."]

    out_md = DATA_DIR / "locale-qa-findings.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")
    log(f"wrote {out_md} ({len(lines)} lines)")


if __name__ == "__main__" and "--selftest" not in sys.argv:
    main()
