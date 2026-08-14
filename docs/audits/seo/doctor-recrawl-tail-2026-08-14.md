> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../plans/seo-control-state.md).** The counts, statuses and priorities below are a record of what was true when this document was written. Do not treat them as current.

# SEO-DOC-006 — the SEO-DOC-001 recrawl tail, measured (2026-08-14)

Evidence for the `SEO-DOC-006` ledger row and the §6 watchlist entry. Ledger is
authoritative; this file is the URL-level record behind it.

**No submission was performed and none is authorized.** The posture is WAIT FOR
GOOGLE, consistent with §19.5's classification of the same mechanism for Telmo
Coelho, Vitor Pais and Pedro Santos — all three of whom appear below. This
document exists so that if the posture is ever reversed by an owner decision,
the list already exists and does not have to be re-derived.

## 1. What was measured

`52c42d1a` (2026-08-08) backfilled `editorialChecklist.readyToIndex` for 28
doctors, lifting `noindex` from their profile pages. The ledger recorded the
Google-side result as "Recrawl pending" with no number attached. This pass
attaches the number.

**117 doctor-locale URLs across 25 doctors still carry Google's pre-fix
`noindex` verdict.**

| Country | URLs |
| --- | ---: |
| Portugal | 75 |
| Czechia | 18 |
| Romania | 18 |
| Brazil | 3 |
| Spain | 2 |
| Ireland | 1 |
| **Total** | **117** |

## 2. Method — a bounded diff, not a crawl

1. Parse the live sitemap: **1,924 URLs**.
2. Pull GSC `page`-dimension data, 90 days: **1,851 pages with ≥1 impression**.
3. Diff. Impressions prove indexation, so the **721** sitemap URLs with zero
   impressions are a bounded candidate set. Cost: one sitemap fetch, one GSC
   query.
4. Live-sweep all 721 for status, robots meta and canonical: **721/721 = 200,
   zero `noindex`, zero cross-canonical**. The §4 gate holds.
5. Inspect the **184** doctor URLs within the 721 via URL Inspection API.

Steps 1–4 are free. Only step 5 spends quota (184 calls; 252 including the
earlier stratified sample, against a 2,000/day limit).

**This is the half the §4 gate cannot cover.** §4 asserts every sitemap entry is
a live indexable 200 — a property of the site. Whether Google agrees is a
property of Google, and only the diff surfaces the gap between them.

## 3. Why the sample said ~75 and the answer is 117

A stratified 68-URL sample (2 per country/locale pair) returned 7 `noindex`,
extrapolating to ~10% of 721 ≈ 75. The true figure is 117 — the sample
understated by ~60%.

Cause: the extrapolation assumed even distribution. Doctor URLs cluster —
92 of the 184 doctor URLs in the remainder are Portugal alone. **Enumerate a
template's own URLs rather than extrapolating a site-wide sample**, for any
per-template finding in this codebase.

## 4. The verdict is stale, not correct — three independent checks

The failure mode this pass was built to rule out: if the `noindex` guard had
silently *stopped firing*, these pages would be thin profiles that Google was
right to exclude, and treating them as a recrawl backlog would push index bloat
onto a YMYL medical site. Three checks, all negative:

**a. The guard is intact and shared.** `isPublicDoctorRecordIndexable()`
(`frontend/lib/content/publication-validation.ts:126`) is one predicate driving
both the page's `noindex` and sitemap inclusion, applied at
`frontend/app/sitemap.ts:437`. Gate: bio ≥120 chars, registration number or
verification URL, `readyToIndex === true`. A sitemap doctor URL passed it by
construction.

**b. Bios are real, verified on all 25 doctors — not a sample.** Live Physician
JSON-LD `description` ranges **175–300 chars**, every one doctor-specific and in
the page's own locale. None empty, none boilerplate, none at the threshold.
Page body text runs 8,100–13,700 chars.

**c. Crawl dates are uniformly pre-fix.** All 117 were last crawled between
**2026-07-16 and 2026-08-06**. The fix landed **2026-08-08**. **Zero
exceptions** — not one of these pages has been re-evaluated against its current
content. The correct reading is "not yet re-crawled", not "re-crawled and still
rejected".

One correction to the working notes behind this document: `dr-ruben-pereira`
(en) was initially flagged as 186 chars of site boilerplate. That was an
extraction error — the page's longest `description` is the 186-char
organisation blurb, which beat the 184-char Physician node. The Physician bio is
genuine and doctor-specific. No site defect.

## 5. Two negatives worth not re-deriving

**The sitemap is not mis-submitted.** GSC reports `submitted: 1900`,
`errors: 0`, `warnings: 0`, `is_pending: false`, `is_index: false`, last
submitted 2026-08-05, against 1,924 live (it grew 24 since Google last read it).
Discovery works. The "URL is unknown to Google" rows elsewhere in the 721 are
crawl starvation — consistent with 58 referring domains — not a parsing fault.

**`lastmod` is not the blocker.** Every one of the 117 carries
`lastmod: 2026-08-08T20:22Z`, the backfill's own timestamp, and has done for six
days without triggering a recrawl. This is also why the **305 sitemap entries
missing `lastmod` entirely** are a tidying item, not a fix — the pages that
*have* a correct one are not being recrawled either.

## 6. The list

`GONE_DOCTORS` holds one entry (`dr-grainne-ahern`, Ireland), absent from the
sitemap by design and confirmed absent from this list — checked, not assumed.

### Portugal — 75 URLs

- `beatriz-carvalho` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-17 → 2026-07-21
- `dra-ana-varges-gomes` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-16 → 2026-07-21
- `dra-nadia-cavaco` — 2 locales (cs, es), last crawl 2026-07-20 → 2026-08-03
- `dr-ana-leal-neto` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-07-20
- `dr-egas-moura` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-05
- `dr-joana-branco-maia` — 5 locales (cs, de, en, pt, ro), last crawl 2026-07-19 → 2026-07-20
- `dr-joao-de-oliveira-e-silva` — 5 locales (cs, de, es, pt, ro), last crawl 2026-07-19 → 2026-08-03
- `dr-lucas-alvarenga-berto` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-05
- `dr-margarida-andrade` — 5 locales (de, en, es, pt, ro), last crawl 2026-07-17 → 2026-07-20
- `dr-martim-delgado` — 2 locales (en, ro), last crawl 2026-07-19 → 2026-07-20
- `dr-pedro-santos` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-06 *(§19.5 watchlist)*
- `dr-ruben-pereira` — 5 locales (cs, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-04
- `dr-rui-diogo-rodrigues` — 3 locales (en, es, ro), last crawl 2026-07-19 → 2026-07-21
- `dr-telmo-coelho` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-07-26 *(§19.5 watchlist)*
- `dr-vitor-hugo-de-matos-pais` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-16 → 2026-07-20 *(§19.5 watchlist)*

### Czechia — 18 URLs

- `mudr-romana-pavlu` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-04
- `mudr-vojtech-cerny` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-05
- `mudr-yasmin-holz` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-05

### Romania — 18 URLs

- `dr-alexandra-palaga` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-03
- `dr-andreea-lorena-bica` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-07-20
- `dr-robert-gabriel-brindus` — 6 locales (cs, de, en, es, pt, ro), last crawl 2026-07-19 → 2026-08-01

### Brazil — 3 URLs

- `dr-renato-sarmento` — 3 locales (en, es, pt), last crawl 2026-07-19 → 2026-08-04

### Spain — 2 URLs

- `dr-javier-villarte-betancor` — 1 locale (es), last crawl 2026-07-27
- `dr-silvina-irale` — 1 locale (es), last crawl 2026-08-04

### Ireland — 1 URL

- `dr-tiago-miguel-figueira` — 1 locale (es), last crawl 2026-08-06

Full URL-level JSON, including the other four coverage states across all 184
inspected doctor URLs, was produced by this pass and is reproducible from the
method in §2.

## 7. If the posture is ever reversed

Not a recommendation — a record of what the analysis would imply, so a future
reader does not redo it.

The stale-verdict case differs from the crawl-starvation case: these pages are
asking Google to re-evaluate a verdict it already formed on content that has
since changed, rather than asking for budget on pages it has never fetched. That
is a stronger case for URL Inspection submission than the general not-indexed
population, and it is why the question was raised at all.

Against it: §19.5 classifies this exact mechanism as WAIT FOR GOOGLE and the
roadmap ranks it "zero further implementation, pure wait". Submission is capped
at ~10 URLs/day and guarantees nothing. 117 URLs is roughly twelve days of
manual work.

If reversed, the sequencing the data supports is Czech pages first — best-CTR
market — then any doctor with existing position data, since those overturn a
verdict on pages that already rank. `GONE_DOCTORS` must be re-checked against
the list at that time, not trusted from this document: a 410 submission wastes a
day's quota.
