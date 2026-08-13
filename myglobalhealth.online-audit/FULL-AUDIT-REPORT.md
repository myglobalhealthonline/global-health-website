> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../docs/plans/seo-control-state.md).** This audit predates the 2026-08 remediation batches. Every count, status and priority below is superseded. Kept as evidence only.

# Full SEO Audit — myglobalhealth.online

**Audited:** 2026-08-03
**Site:** Global Health (Global Guest s.r.o.) — licensed telemedicine
**Business type:** Multi-market healthcare service / YMYL — Ireland, Portugal, Spain, Czechia, Romania, Brazil × 6 locales (en, pt, es, cs, ro, de)
**Scope:** 500 pages crawled from a 1,153-URL sitemap; 73 further sitemap URLs status-sampled; 10 screenshots; 4 Lighthouse runs; CrUX field data

---

## SEO Health Score: **69 / 100**

| Category | Weight | Score | Weighted |
|---|---|---|---|
| Technical SEO | 22% | 70 | 15.4 |
| Content Quality | 23% | 63 | 14.5 |
| On-Page SEO | 20% | 62 | 12.4 |
| Schema / Structured Data | 10% | 82 | 8.2 |
| Performance (CWV) | 10% | 62 | 6.2 |
| AI Search Readiness | 10% | 74 | 7.4 |
| Images | 5% | 95 | 4.8 |
| **Total** | | | **68.8 → 69** |

### How to read this score

This is not a broken site. The foundations are unusually good for a
six-country, six-locale medical platform: hreflang is 100% reciprocal across
2,267 checked pairs, every one of 6,186 images has an `alt` attribute, the
sitemap is clean and fully 200-status, security headers are complete, and the
structured-data coverage is broad and mostly correct.

The 69 comes from a small number of **systemic, mechanical defects that each hit
hundreds of URLs at once** — not from hundreds of individual page problems. Six
fixes move this site into the mid-80s.

---

## Top 5 critical issues

### 1. Under load, metadata is streamed into `<body>` instead of `<head>`

> **Corrected 2026-08-03.** The first version of this report claimed 127 URLs
> shipped *no* metadata at all and were missing `generateMetadata`. That was
> wrong on both counts — `generateMetadata` is present and correct on both route
> segments, and the metadata is always emitted. The real, narrower defect is
> below. The correction is kept visible rather than silently edited.

On `/{country}/{locale}/legal/*` (36 URLs) and `/{country}/{locale}/doctors/{slug}`
(91 URLs), a **cold, uncached render under concurrent load** flushes the HTML
shell before `generateMetadata` resolves. React then streams the `<title>`,
`<link rel=canonical>` and `<meta name=description>` into the **body**, roughly
80–230 KB past `</head>`:

```
/portugal/pt/legal/terms-of-service   </head> at 1,758   <title> at 226,198
/czechia/cs/legal/complaints-procedure </head> at 1,758   <title> at 118,741
/ireland/cs/doctors/dr-ahmed-maklad    </head> at 3,403   <title> at 154,536
```

It is **load-dependent, not route-dependent**. Hitting all 127 URLs in one burst
(5 concurrent, cache-busted) reproduced it on 38; running the same URLs in
smaller unloaded batches reproduced it on 1. Warm ISR hits never show it.

Why it still matters:

- **Google ignores `rel=canonical` placed in `<body>`** — that is documented,
  unambiguous behaviour, not a maybe. So these URLs intermittently have no
  canonical at all.
- Googlebot crawls in bursts, which is exactly the condition that triggers it.
- Stricter consumers (Bing, social scrapers, LLM crawlers) are less forgiving
  than Google about late metadata.
- `/legal/*` is served `no-store` with no prerendering, so **every** legal
  request is a cold render and permanently exposed to the race. Doctor profiles
  are ISR, so only the revalidation miss is exposed.

The fix is not "add `generateMetadata`" — it is to stop the metadata resolving
slower than the shell: have the page and `generateMetadata` share one cached
data fetch so the metadata promise is already settled, and/or prerender the
`/legal/*` routes instead of serving them `no-store`.

### 2. The English UI leaks onto 76% of non-English pages

912 of 1,153 sitemap URLs are non-English. Sampling 66 of them, **50 (76%)
render hard-coded English UI strings inside otherwise well-translated pages**:

| String | Pages hit (of 66 sampled) |
|---|---|
| `Languages` | 43 |
| `Pick a time` | 40 |
| `Specialist care` | 14 |
| `Book a consultation` | 6 |
| `Ready when you are` | 6 |

Body copy is genuinely fluent in German, Czech and Romanian — the translation
work is real. This is a **component-level i18n gap**: a shared cross-sell/CTA
block was never wired to the locale. It sits directly on the booking CTA, so it
damages both trust and conversion on three-quarters of the site's international
inventory.

### 3. 46% of titles are truncated in the SERP

232 of 500 titles exceed 60 characters; 99 exceed 70. The template appends both a
qualifier and the brand, so what gets cut is precisely the trust signal that
earns the click:

```
91  Online Specialist Consultation Ireland | Cardiology, Neurology, Paediatrics | Global Health
89  Dr. Leandro Wang — Flebología y Medicina General | CGCOM 464628929 | Global Health España
85  Médico Online España | Médicos de Cabecera y Especialistas Colegiados | Global Health
77  Online Doctors Ireland | IMC-Registered GPs & Specialists · Global Health
```

32 of 33 country-home pages are over-length — the highest-value commercial pages
on the site. Blog article titles are additionally set in ALL CAPS, which Google
routinely rewrites and which reads as low-quality in a YMYL SERP.

### 4. The root entry gate is the weakest page on the site — and the slowest

`/` is a 114-word country-selection gate with 6 internal links, no hreflang, no
breadcrumb, and `Cache-Control: private, no-cache, no-store` with no
prerendering. Every brand search, every external link and all crawl equity lands
here, pays a full origin round-trip, and then funnels through six anchors.

Gating by country is a legitimate requirement for a multi-jurisdiction medical
service — you must not show Irish prescribing content to a Brazilian patient.
But the gate does not need to be thin, uncached, hreflang-less and
breadcrumb-less to do that job.

Compounding it: the cookie-consent modal covers ~55–60% of the mobile viewport
on first paint on every page tested, stacking on top of the gate.

### 5. An entire commercial keyword cluster has no page

The "sick cert online" SERP in Ireland is owned by dedicated, single-purpose
transactional pages (doconcall.ie, getsickcert.ie, sicknote.com) — price-forward,
with legal-validity FAQ and DSP caveats. Global Health has no equivalent: sick
certs are one bullet inside `/ireland/en/gp-consultation-online`, and the only
URL currently surfacing is a legacy Wix blog path.

Persona scoring puts the anxious same-day-cert patient at **35/100** — the
weakest journey on the site, against one of its highest-intent queries.

---

## Top 5 quick wins

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Prerender `/legal/*` instead of serving it `no-store`, so its metadata never loses the streaming race | 1 route config | Removes the permanent exposure on 36 URLs |
| 2 | Drop `\| Global Health` from the title template when the title already exceeds ~48 chars | 1 template | Fixes ~200 truncated titles at once |
| 3 | Wire the shared CTA/cross-sell component to the active locale | 1 component | Fixes ~690 non-English pages |
| 4 | Reconcile the €29 / €39 price contradiction between `/ireland/en` and `/ireland/en/gp-consultation-online` | 2 strings | Removes a live trust break on the money page |
| 5 | Map `/post/{slug}` legacy redirects to the matching article instead of the blog hub | 1 redirect map | Recovers equity from still-ranking Wix URLs |

Two more that are nearly as cheap: add the country name to the six per-country
blog-hub meta descriptions (currently identical per language, 55 pages
affected), and ship a `/favicon.ico` (currently 404).

---

## Technical SEO — 70/100

Full detail: [`findings/technical.md`](findings/technical.md)

**Working well.** All 500 crawled pages returned `200` with zero fetch errors and
zero mid-crawl redirects. A further 73 sitemap URLs sampled outside the crawl were
also 100% `200`. Everything is fully server-rendered — raw HTTP `GET` returns
complete body text, so there is no CSR gap for non-JS crawlers. Average response
time 316 ms (p90 340 ms). `robots.txt` is correct, with targeted disallows and
no accidental blocking. HTTP→HTTPS and apex→www are both single-hop 301s. A
nonsense URL correctly returns a hard `404`, not a soft one.

Security headers are complete: HSTS with `preload`, an enforcing CSP with
`object-src 'none'` / `base-uri 'self'` / `frame-ancestors 'self'`, `nosniff`,
`strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`. Only
`Cross-Origin-Opener-Policy` is absent.

**Problems.**

- **The metadata streaming race** (issue #1 above) intermittently pushes the
  self-referencing canonical into `<body>` on 127 URLs, where Google ignores it.
- **Caching is inverted on the pages that need it most.** Content pages are
  correctly ISR-cached (`public, s-maxage=60, stale-while-revalidate=300`,
  `x-nextjs-prerender: 1`). But `/`, the 7 root-level global pages and the 36
  `/legal/*` pages are all `private, no-cache, no-store` and not prerendered.
  CrUX shows TTFB at **2,618 ms on phone (Poor)** and 1,985 ms on desktop in the
  latest reported week.
- **Page weight.** Median served HTML is 230 KB; Irish country homes hit 590 KB.
  38.6% of `/ireland/en` is inlined RSC flight payload, ~91 KB of which is the
  full GP-availability schedule serialised into the document.
- **Trailing-slash double redirect.** `/ireland/` → `/ireland` → `/ireland/en`,
  two hops, on every country prefix.
- **`/favicon.ico` returns 404.**
- **Legacy `/post/*` Wix URLs blanket-redirect to the blog hub** even when the
  exact article exists — a soft-404 pattern on URLs that still hold rankings.
- **79 hreflang targets are absent from the sitemap** (locale variants of the
  `/legal` hub).

**Hreflang deserves specific credit.** Across 454 pages: zero missing
`x-default`, zero malformed codes, self-reference present in 454/454 clusters,
and **0 reciprocity failures across 2,267 checked pairs**. Cluster sizes are
correct (7 alternates everywhere; 4 for Brazil, which ships three locales). For a
6×6 matrix this is a better result than most enterprise sites manage.

**The sitemap is also well-built.** 1,153 URLs, valid `urlset`, real `lastmod`
dates, genuinely varied `priority` (1.0→0.3), and zero noindex/redirecting/
non-canonical URLs included.

---

## Content Quality — 63/100

Full detail: [`findings/content.md`](findings/content.md)

**Working well.** Blog articles are strong and genuinely YMYL-compliant: 2,385–
3,846 words, a visible byline ("Written by Dr Tiago Miguel Figueira, IMC
523449"), a separate clinical reviewer, and `reviewedBy` / `lastReviewed`
Physician JSON-LD. This is exactly the pattern medical content needs. Service
pages median 1,901 words; country homes 2,172. Body-copy translation into German,
Czech and Romanian reads as human-quality.

**Problems.**

- **The ~90 `/health/` condition pages are the real YMYL exposure.** 290–486
  words, 4–5 H2s each, unique H1 per page — but competing against HSE, NHS and
  Mayo on queries like "diabetes", "migraine", "hypertension". They lack the
  byline and reviewer depth the blog articles have. Either deepen them
  substantially with the same medical-review treatment, or reposition them
  explicitly as service-intent pages rather than condition explainers.
- **English UI leak on 76% of non-English pages** (issue #2).
- **Cross-country near-duplication.** Sampling the mental-health service across
  ES/PT/BR found an identical section template with near-verbatim sub-headers and
  bullet lists, country name and local details swapped. Defensible at this scale,
  but it needs genuine per-market differentiation to hold up.
- **The global `/blog` hub is broken.** It renders "No articles published yet"
  while 44 country-scoped article URLs serve full content. It is in the main
  navigation of every page and in the sitemap.
- **Two competing sets of legal pages.** `/terms` (687 words) and `/privacy`
  (547 words) at the root coexist with `/{country}/{locale}/legal/terms-of-service`
  (6,414–8,207 words) and `/legal/privacy-policy` (3,496–4,358 words). Both sets
  are indexable. This is a duplication problem and a compliance ambiguity.
- **Thin index pages.** Per-country blog hubs run 230–430 words.

Readability scoring was not run this pass (no scorer available in the toolchain)
— assessed qualitatively only.

---

## On-Page SEO — 62/100

Full detail: [`findings/onpage.md`](findings/onpage.md)

| Page type | Pages | No `<title>` | Title > 60 | Median words | Hreflang | FAQPage |
|---|---|---|---|---|---|---|
| services | 144 | 0 | 93 | 1,901 | 144 | 123 |
| doctors | 69 | **18** | 17 | 1,176 | 51 | 69 |
| health | 45 | 0 | 21 | **351** | 45 | 2 |
| blog | 38 | 0 | 38 | 355¹ | 38 | 0 |
| book | 33 | 0 | 0 | 892 | 33 | 0 |
| pricing | 33 | 0 | 1 | 455 | 33 | 0 |
| country-home | 33 | 0 | 32 | 2,172 | 33 | 33 |
| legal | 32 | **21** | 0 | 2,701 | 11 | 0 |
| gp-consultation-online | 28 | 0 | 5 | 1,129 | 28 | 28 |
| see-a-specialist | 24 | 0 | 13 | 1,251 | 24 | 24 |
| lab-tests | 14 | 0 | 11 | 775 | 14 | 12 |
| global (root-level) | 6 | 0 | 1 | 547 | **0** | 2 |
| root `/` | 1 | 0 | 0 | **114** | **0** | 0 |

¹ Blog median is dragged down by index pages; actual articles run 2,385–3,846 words.

**Titles:** 39 missing, 232 over 60 chars, 99 over 70, 6 duplicated across 3
groups. Zero under 30. Two separators (`|` and `·`) are mixed inconsistently.

**Descriptions:** 39 missing, but of those present, **100% sit in the 70–160
character band** — genuinely excellent length discipline. The only issue is 55
pages sharing 12 descriptions, all per-country blog hubs where the country name
is missing from the template.

**Headings:** zero pages without an `<h1>` — a perfect result. Five blog articles
emit two `<h1>`s (page title and article title both rendering as `h1`).

**A real content bug found:** `/romania/en/services/controlul-greutatii` (slug =
"weight control") carries the title *"Men's Health Online | Romania | Confidential
English Doctor"*. Wrong title mapped to the page.

**Internal linking** is strong within each country silo (median 53 links per
page, max 128). The weakness is structural: the root gate passes equity through
6 anchors, and there is no cross-silo linking, so authority earned by an Irish
article cannot reach its Spanish equivalent.

---

## Schema / Structured Data — 82/100

Full detail: [`findings/schema.md`](findings/schema.md)

**The strongest category.** Zero JSON-LD parse errors across 500 pages. The
site-wide `MedicalOrganization` + `WebSite` block is on all 500 pages and is well
built — real `sameAs` (Wikidata, LinkedIn, YouTube, Instagram, TikTok, plus 12+
regulatory bodies including the Medical Council, HSE, HIQA, HPRA, RCPI, ICGP),
`ImageObject` logo with dimensions, `PropertyValue` registrations, and correct
`@id` cross-linking. `Physician` blocks (176) carry solid credential and
regulator linkage. `Article` markup has all required fields.

Coverage across the 500-page sample:

```
MedicalOrganization 500   BreadcrumbList 325   FAQPage 293   Organization 255
ReserveAction 196         Physician 176        MedicalProcedure 172
MedicalClinic 144         MedicalBusiness 78   Service 52     Article 50
ItemList 39               Offer 34             Product 6
```

**Problems.**

- **High — `Product`/`Brand` misuse on 6 Ireland pricing pages.** Care-plan
  subscriptions are typed as `Product` and are missing required `itemCondition`,
  so they are not eligible for Merchant listings even as typed. Should be
  `Service` + `Offer` — the pattern already used correctly in 52 other places.
- **Medium — `MedicalBusiness` vs `MedicalClinic` type conflict.** The same
  "Global Health · Ireland" entity is typed differently on the country home vs
  service pages, neither carrying address/geo/`@id`. Both are `LocalBusiness`
  subtypes, which give a virtual-only provider no local eligibility anyway.
  Collapse to `MedicalOrganization` with a country-scoped `@id`.
- **Medium — `BreadcrumbList` generator gap.** 175/500 pages lack it. Most are
  legitimate (legal/utility), but non-English and non-Ireland localised service
  pages are missing it while their Irish English equivalents have it.
- **The biggest missed opportunity: zero `AggregateRating`/`Review` markup
  anywhere**, despite live Doctify review widgets running on the site. This is
  the highest-value schema addition available.
- **Info:** the 293 `FAQPage` blocks no longer earn a SERP feature (Google
  retired FAQ rich results for non-authoritative sites). The content is
  well-scoped and contextual so there is no reason to remove it — just no reason
  to expand it either.

Other gaps worth adding: `WebSite.potentialAction` (SearchAction),
`MedicalCondition` typing on blog `about`, per-country pricing schema (only
Ireland has any), and per-test `MedicalTest` + `Offer` on lab-test pages.

---

## Performance (Core Web Vitals) — 62/100

Full detail: [`findings/performance.md`](findings/performance.md) and [`findings/google.md`](findings/google.md)

### Field data (CrUX, 28-day window ending 2026-07-25)

Origin, all devices — **passing every Core Web Vital**:

| Metric | Value | Rating |
|---|---|---|
| LCP | 1,539 ms | Good |
| INP | 137 ms | Good |
| CLS | 0.00 | Good |
| TTFB | 534 ms | Good |
| FCP | 1,115 ms | Good |

But the per-device breakdown (latest week each segment reported) is materially worse:

| Metric | Phone | Desktop |
|---|---|---|
| LCP | 3,098 ms — Needs Improvement | 3,097 ms — Needs Improvement |
| INP | 134 ms — Good | 59 ms — Good |
| CLS | 0.00 — Good | 0.00 — Good |
| TTFB | **2,618 ms — Poor** | 1,985 ms — Needs Improvement |

25-week trend: LCP −27.5%, TTFB −36.9%, FCP −29.6%, CLS −100% — all improving.
**INP is the one metric degrading: +33.9%** (91 ms → 122 ms), still inside
"Good" but worth a watch-item. Desktop INP specifically is +16.9% and phone TTFB
+23.3%.

### Lab data (Lighthouse)

| URL | Score | LCP | TBT | CLS |
|---|---|---|---|---|
| `/` | 78 | 3,099 ms | 544 ms | 0 |
| `/ireland/en` | **49** | **4,809 ms** | **1,515 ms** | 0 |
| `/ireland/en/services/acute-medical-consultation` | 76 | 3,605 ms | 369 ms | 0 |
| `/spain/en/doctors/dr-syed-tahir` | 91 | 2,988 ms | 87 ms | 0 |

**The country-home pages are the outlier and the fix is identified.** 38.6% of
`/ireland/en` (230.5 KB of 596.6 KB) is inlined RSC flight payload, and ~91 KB of
that is the complete GP-availability schedule being serialised server-side into
the document instead of fetched client-side after hydration. Same pattern at
55.2% on the service page and 41.5% on the doctor page. Moving the availability
payload to a client-side fetch addresses both the byte bloat and the LCP/TBT
outlier in one change.

**CLS is a genuine non-issue** — 0.00 in both lab and field, across every page.

Two measurement gaps, stated plainly rather than guessed: third-party cost
(GTM, Doctify, Meta, Clarity, ElevenLabs) measured **zero bytes** because all are
consent-gated and never fired in a headless session — this needs a
consent-accepted run or production RUM, and it matters because INP is the metric
degrading. LCP element identity and LCP subparts returned empty from Lighthouse
13.4.1 (a known insight-audit migration gap in that version).

---

## AI Search Readiness (GEO) — 74/100

Full detail: [`findings/geo.md`](findings/geo.md)

Sub-scores: Citability 78, Structural 70, Multi-modal 50, Authority 72, Technical 92.

**Working well.** AI crawler access is fully open and explicit — `robots.txt`
names GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot,
Google-Extended, Gemini-Deep-Research, PerplexityBot and Perplexity-User, all
permissive, with a permissive wildcard covering the rest. `llms.txt` is present,
returns 200, is well-formed, and lists 30+ country/service links with
direct-answer descriptions. Every page is fully server-rendered, so there is no
JS gap for AI crawlers. Authority signals are strong via the `MedicalOrganization`
`sameAs` block.

**Problems.**

- `llms.txt` points at the broken `/blog` hub and does not list individual
  articles — the site's strongest, most citable content is undiscoverable from
  the file meant to advertise it.
- Clinician bylines and reviewer schema exist only on blog articles, not on
  service pages.
- Hub and `/about` H2s are marketing copy rather than question-form headings.
- Long article paragraphs are not chunked into self-contained ~140–160 word
  answer blocks.
- No Wikipedia entity yet (founded 2023 — expected at this stage).

---

## Images — 95/100

**Across 6,186 `<img>` elements on 500 pages, zero are missing an `alt`
attribute.** 408 (6.6%) carry `alt=""`, which is the correct treatment for
decorative imagery. Images are served through `next/image` with responsive
`srcset` and WebP, and hero images are `rel=preload`ed with explicit
`imageSrcSet` and `imageSizes`.

At this scale that is an exceptional result. No action required.

---

## Visual & Mobile

Full detail: [`findings/visual.md`](findings/visual.md) · screenshots in [`screenshots/`](screenshots/)

10 captures (desktop 1440×900, mobile 390×844) across `/`, `/ireland/en`, a
service page, `/ireland/en/doctors` and `/about`. No rendering breakage, no
horizontal scroll, no overlapping or overflowing text on any page tested.

**One significant finding:** the cookie-consent modal covers ~55–60% of the
mobile viewport on first paint on every page tested — burying the H1 and primary
CTA, and stacking on top of the intentional country gate on `/`. On desktop the
homepage CTA is a text link rather than a button and sits partly behind the
consent banner. Google's intrusive-interstitial guidance does exempt
legally-required consent notices, so this is a conversion and first-impression
problem rather than a ranking penalty — but it is the first thing every mobile
visitor sees.

---

## Search Experience (SXO)

Full detail: [`findings/sxo.md`](findings/sxo.md)

Best-scoring page: `/ireland/en/gp-consultation-online` at 79/100.

**Aligned.** `/ireland/en` and `/ireland/en/gp-consultation-online` match the
dominant SERP page type well — 3,196 and 1,434 words, `FAQPage` + `Offer` +
`Service` + `MedicalOrganization` schema, IMC trust signals throughout. The thin
root domain is *correctly* thin as a country gate and is not a page-type
mismatch.

**Two hard breaks in the funnel.**

1. **Page-type mismatch on the sick-cert cluster** (critical — issue #5 above).
2. **Price contradiction** (high): `/ireland/en` meta says "from €29",
   `/ireland/en/gp-consultation-online` meta says "from €39" — verified live.
   Every ranking competitor anchors one number. A price-comparison shopper hits
   the contradiction before reaching `/pricing`, which is itself
   subscription-first rather than showing the single-consult price the SERP
   trains searchers to expect.

Persona scores: anxious same-day-cert patient **35/100**, price shopper
**49/100**, expat needing an own-language doctor **73/100** (strongest — doctor
profiles already list languages; it just needs a filter facet).

Romania and Brazil page-type severity was inferred from project history rather
than independently verified — flagged as a limitation.

---

## Backlinks & Authority

Full detail: [`findings/backlinks.md`](findings/backlinks.md)

Not a scored category — the available data tier is too thin to score honestly.
Only Common Crawl and a verification crawler were available (no Moz or Bing
Webmaster keys), so **no backlink health score is produced**.

What Common Crawl's `cc-main-2026-jan-feb-mar` web graph shows:

| Domain | PageRank rank | Harmonic centrality rank | Crawled hosts |
|---|---|---|---|
| **myglobalhealth.online** | 8,396,221 | 7,515,428 | 1 |
| webdoctor.ie | 2,747,412 | 3,371,283 | 6 |
| videodoc.ie | 12,955,079 | 12,481,292 | 2 |

(Lower rank = stronger.) webdoctor.ie is meaningfully ahead on both measures —
~3.1× on PageRank rank, ~2.2× on harmonic centrality — with 6 crawled hosts to
Global Health's 1. videodoc.ie sits in the same rough tier as Global Health. A
third competitor comparison was attempted against several candidate domains and
each timed out without resolving; it is not included rather than guessed.

The domain itself is young: registered 2024-12-16 via Tucows, ~1.6 years old,
with no signal of prior third-party use. (Worth noting the `MedicalOrganization`
schema declares `foundingDate: 2023` — the business predates this domain
registration, which is normal, but it means the domain carries none of the
brand's earlier authority.)

**Which makes the `/post/*` redirect problem a link-equity problem, not just a
technical one.** The legacy Wix article URLs are where the brand's accumulated
authority actually lives. Collapsing every one of them onto `/ireland/en/blog`
means that equity is being discarded at exactly the moment a 1.6-year-old domain
can least afford it. Per-article mapping (Phase 2.5) is the single highest-value
authority action available and it costs one redirect map.

**Not assessable at this tier** — DA/PA, anchor-text distribution, toxicity
scoring, full referring-domain counts, and per-domain link verification.
All are unlocked by two free keys: [Moz](https://moz.com/products/api)
(2,500 rows/month) and [Bing Webmaster Tools](https://www.bing.com/webmasters).

---

## Data limitations of this audit

Stated explicitly so nothing here is read as more certain than it is.

- **Google Search Console, GA4 and the Indexing API were unavailable.** The
  OAuth refresh token is invalid (`HTTP 400: invalid_grant` on every attempt,
  confirmed independently across all three services). So there is **no
  clicks/impressions/CTR/position data, no top-query or top-page data, no
  indexation counts and no organic traffic trend** in this report. Those
  sections are *unavailable*, not zero. Fix with:

  ```bash
  claude-seo run google_auth.py --auth
  ```

  CrUX authenticates by API key and did work, which is why field CWV is present.
- **Backlink data is limited to Common Crawl.** No Moz or Bing Webmaster keys are
  configured, so there is no DA/PA, no anchor-text distribution, no toxicity
  scoring and no full referring-domain count. Both are free to obtain.
- **OpenSEO/DataForSEO returned 0 remaining credits**, so live SERP positions and
  keyword volumes could not be pulled.
- 500 of 1,153 sitemap URLs were crawled in full; the remaining 653 were
  status-sampled (73 URLs, all 200). Per-page metadata findings are
  projections onto route groups, not a full census.
- Readability scoring, third-party script cost, and LCP element identity were
  each attempted and are marked "not measured" in their sections.

---

## Where to go next

See [`ACTION-PLAN.md`](ACTION-PLAN.md) for the prioritised, phased plan.
