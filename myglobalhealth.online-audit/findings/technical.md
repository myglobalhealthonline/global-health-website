# Technical SEO — myglobalhealth.online

Crawl: 500 pages fetched from the XML sitemap (1,153 total URLs), 2026-08-02.
Method: raw HTTP `GET` of the served HTML (no JS execution) — everything below is
what a crawler sees on first byte.

## Summary

| Check | Result |
|---|---|
| Pages fetched | 500 / 500 returned `200` |
| Fetch errors | 0 |
| Redirects encountered mid-crawl | 0 |
| Avg response time | 316 ms (p90 340 ms) |
| Median served HTML | 230 KB (max 590 KB) |
| Sitemap URLs sampled outside the crawl | 73 / 73 returned `200` |
| Server-side rendering | Full — body text present in raw HTML, no CSR gap |

Crawlability and indexability are fundamentally healthy. The defects are
concentrated in **metadata emission on two route groups** and in **page weight**.

---

## Critical: 2 route groups emit no `<head>` metadata at all

39 of the 500 crawled pages return HTML with **no `<title>`, no
`meta description`, no `rel=canonical`, no `meta robots`, no Open Graph tags and
no `twitter:card`**. Verified by direct `curl` — the `<head>` goes straight from
`<meta charSet>` / preload links to the stylesheets.

Affected route groups:

| Route group | In 500-page crawl | Total in sitemap |
|---|---|---|
| `/{country}/{locale}/legal/*` | 21 | 36 |
| `/{country}/{locale}/doctors/{slug}` | 18 | 91 |
| **Total** | **39** | **127 (11.0% of the site)** |

Examples:

```
/ireland/en/legal/privacy-policy        h1 "Privacy Policy"       3,615 words, no title
/spain/es/legal/terms-of-service        h1 "Términos y Condiciones" 7,696 words, no title
/spain/en/doctors/dr-syed-tahir         h1 "Dr. Syed Tahir"       1,239 words, no title
/ireland/en/doctors/silvia-alexandre-fernandes  1,518 words, no title
```

These are not thin pages — the legal pages run 2,700–8,200 words and the doctor
profiles 900–1,500 words with full `Physician` + `EducationalOccupationalCredential`
+ `FAQPage` + `BreadcrumbList` JSON-LD. The structured data is excellent and the
metadata is entirely absent, which strongly suggests these routes have no
`generateMetadata` export (or one that throws and is being swallowed).

Consequences:
- Google synthesises a title from the `<h1>`/anchor text — an unmanaged SERP snippet.
- No self-referencing canonical on 127 URLs, so parameterised or
  alternate-cased variants are free to be treated as separate URLs.
- No `og:*`/`twitter:*` → link previews on WhatsApp, LinkedIn, Slack render bare.
- The 91 doctor profiles are the site's strongest E-E-A-T asset and its most
  brand-searchable pages ("Dr. Syed Tahir"), and they are shipping without titles.

**Fix:** add `generateMetadata` to the `legal/[slug]` and `doctors/[slug]` route
segments. Confirm the fix by asserting `<title>` presence in the crawl for all
127 URLs.

---

## Server, security and transport

Response headers on `https://www.myglobalhealth.online/`:

| Header | Value | Verdict |
|---|---|---|
| `strict-transport-security` | `max-age=31536000; includeSubDomains; preload` | Good |
| `content-security-policy` | Enforcing, `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'` | Good |
| `x-content-type-options` | `nosniff` | Good |
| `referrer-policy` | `strict-origin-when-cross-origin` | Good |
| `permissions-policy` | `camera=(), microphone=(self), geolocation=(), browsing-topics=()` | Good |
| `x-frame-options` | `SAMEORIGIN` | Good (redundant with `frame-ancestors`) |
| `cross-origin-opener-policy` | **absent** | Minor — add `same-origin` |
| `Cache-Control` | Varies by route — see below | **Partial problem** |

The CSP still carries `script-src 'unsafe-inline'` and `blob:`. That is a known,
deliberate trade-off in this codebase (the ElevenLabs AudioWorklet needs `blob:`;
Next.js inline bootstrap needs the inline allowance). No SEO impact; flagged for
completeness only.

### `Cache-Control: no-store` on the entry gate, legal and global pages

Measured per route:

| Route | `Cache-Control` | ISR |
|---|---|---|
| `/` (entry gate) | `private, no-cache, no-store, max-age=0, must-revalidate` | no |
| `/about`, `/faq`, `/blog`, `/contact`, `/terms`, `/privacy` | `private, no-cache, no-store, max-age=0, must-revalidate` | no |
| `/{country}/{locale}/legal/*` | `private, no-cache, no-store, max-age=0, must-revalidate` | no |
| `/ireland/en` (country home) | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` | `x-nextjs-prerender: 1` |
| `/{country}/{locale}/services/*` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` | yes |
| `/{country}/{locale}/doctors/*` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` | yes |

So the bulk of the site (~1,000 content URLs) **is** correctly CDN-cacheable via
ISR. The problem is narrower than it first appears, but it lands on the worst
possible page: **the root entry gate — the URL every brand search and every
external link hits — is `no-store` and not prerendered.** Every visitor pays a
full origin round-trip before they can even pick a country. The 7 root-level
global pages and the 36 `/legal/*` pages share the same treatment.

CrUX shows the cost: TTFB in the latest reported week is **2,618 ms on phone**
(Poor) and **1,985 ms on desktop** (Needs Improvement), against a blended 28-day
figure of 534 ms.

**Fix:** the `no-store` header is correct and required for the authenticated
route groups (`(admin)`, `(doctor)`, `(auth)`, `/account`, `/api`). It should not
be reaching `/`, `/legal/*`, or the root-level marketing pages. Move those onto
the same ISR treatment the country pages already use. Fixing `/` alone is the
single cheapest TTFB win available.

Note the overlap: `/legal/*` and the root gate are also the routes missing
metadata and hreflang. All three symptoms point at the same set of route
segments being configured differently from the rest of the app — likely one
shared layout or route-group config.

---

## URL structure and redirects

| Test | Result |
|---|---|
| `http://www.` → `https://www.` | `301`, single hop ✓ |
| Apex `myglobalhealth.online` → `www` | `301` ✓ |
| `/ireland/en` | `200` ✓ |
| `/ireland` | `308` → `/ireland/en` ✓ |
| `/ireland/` (trailing slash) | `308` → `/ireland` → `308` → `/ireland/en` — **2-hop chain** |
| `/zzz-does-not-exist-404` | `404` ✓ (correct, not a soft-404) |
| `/health`, `/doctors`, `/pricing` (unprefixed) | `404` |
| `/favicon.ico` | **`404`** |

Two issues:

1. **Trailing-slash double redirect.** `/ireland/` costs two hops before content.
   Every country prefix has this. Collapse to one hop by normalising the slash
   and the locale in a single rule.
2. **`/favicon.ico` returns 404.** Browsers and several crawlers request this path
   unconditionally regardless of `<link rel="icon">`. Add the file (or a rewrite)
   at the well-known path.

The unprefixed `/health`, `/doctors`, `/pricing` 404s are correct behaviour for a
country-scoped IA — noted only because they are plausible manual-entry and legacy
inbound paths worth redirecting to the entry gate.

### Legacy Wix URLs — handled, but blog articles land on a hub

The pre-migration Wix paths are redirected server-side, not left to 404:

```
308  /es/home-sp                                     -> /spain/es
308  /home-sp                                        -> /spain/es
308  /pt/home                                        -> /ireland/pt
308  /plans-pricing                                  -> /ireland/en/pricing
308  /service-page/gp-consultation                   -> /ireland/en/see-a-specialist
308  /service-page/pt-cons-med-dr-tiago-...          -> /ireland/en/see-a-specialist
308  /post/getting-a-gp-sick-note-online-simplified  -> /ireland/en/blog
308  /post/diabetes-a-silent-disease                 -> /ireland/en/blog
308  /post/hand-foot-and-mouth-disease               -> /ireland/en/blog
404  /about-1, /contact-1, /doctors-1, /es/servicios
```

Two problems:

1. **`/post/*` blanket-redirects to the blog hub even when the exact article
   exists.** `/post/diabetes-a-silent-disease` should go to
   `/ireland/en/blog/diabetes-a-silent-disease`, which is live and 2,385+ words.
   Redirecting a specific article to a listing page is the textbook soft-404
   pattern — Google routinely treats it as a 404 and drops the accumulated
   equity of the legacy URL. These legacy URLs still hold SERP positions, so
   this is measurable lost traffic. Map `/post/{slug}` to the matching article
   slug per-article, with the hub only as a genuine last-resort fallback.
2. **`/pt/home` → `/ireland/pt`.** On Wix, `/pt/` was the Portugal market, not
   Portuguese-language-in-Ireland. Verify the intent; if it was Portugal, this
   should target `/portugal/pt`.

---

## Canonicals

| | Count |
|---|---|
| Self-referencing canonical | 461 / 500 |
| Cross-canonical | 1 (`/` → `https://www.myglobalhealth.online`, i.e. self, no trailing slash) |
| **Missing canonical** | **39** (the legal + doctor routes above) |

No cross-domain, chained or conflicting canonicals. Clean apart from the missing 39.

---

## Hreflang

454 pages carry hreflang. Validation across all of them:

| Check | Result |
|---|---|
| Missing `x-default` | 0 |
| Self-reference present in own cluster | 454 / 454 ✓ |
| Malformed language/region codes | 0 |
| Reciprocity (2,267 pairs checked within the crawl) | **0 failures** ✓ |
| Cluster sizes | 7 alternates (416 pages), 4 alternates (38 pages — Brazil, which ships `en`/`pt`/`es` only) |
| Pages with **no** hreflang | 46 |

The implementation is, for a 6-country × 6-locale site, unusually correct.

Two defects:

1. **79 hreflang targets are absent from the XML sitemap** — mostly locale
   variants of the `/legal` hub, e.g. `/ireland/pt/legal`, `/ireland/es/legal`.
   The pages exist and are referenced as alternates but are never submitted.
   Either add them to the sitemap or drop them from the clusters.
2. **The 46 pages with no hreflang** are the 39 metadata-less routes plus the 7
   root-level global pages (`/`, `/about`, `/faq`, `/blog`, `/contact`, `/terms`,
   `/privacy`). The root pages are English-only while the rest of the site serves
   six languages — see the IA finding below.

---

## Page weight

| | Value |
|---|---|
| Median served HTML | 230 KB |
| Heaviest | 590 KB (`/ireland/de`, `/ireland/ro`, `/ireland/es`, `/ireland/pt`, `/ireland/cs`) |

A 230 KB **median HTML document** is roughly 4–5× what comparable content-led
sites ship. The country-home pages at ~590 KB are the extreme.

Root cause confirmed by the performance pass: **38.6% of `/ireland/en` (230.5 KB
of 596.6 KB) is the inlined Next.js RSC flight payload** (`self.__next_f.push`),
and ~91 KB of that is the full GP-availability schedule being serialised
server-side into the document rather than fetched client-side after hydration.
The same pattern appears on service pages (55.2% inline script) and doctor
profiles (41.5%).

This is the largest single byte win on the site, and it lines up with
`/ireland/en` being the worst Lighthouse result measured (score 49, LCP 4,809 ms,
TBT 1,515 ms). See `performance.md`.

---

## Information architecture

The root `/` is a **country-selection entry gate: 114 words, 6 internal links, one
`<h1>`, no hreflang, no `BreadcrumbList`.**

Every external link, every brand search and all crawl equity lands on the site's
thinnest page, which then distributes through exactly six anchors. This is the
structural bottleneck of the whole site. It is a defensible UX choice for a
multi-jurisdiction medical service (you must not show Irish prescribing content
to a Brazilian patient), but the SEO cost is real and can be reduced without
changing the gate's function — see `ACTION-PLAN.md`.

Related: the 7 root-level global pages are English-only, while every equivalent
country-scoped page has six locales. `/terms` (687 words) and `/privacy` (547
words) also coexist with far longer country-scoped equivalents at
`/{country}/{locale}/legal/terms-of-service` (6,414–8,207 words) and
`/legal/privacy-policy` (3,496–4,358 words). Two sets of legal pages of very
different lengths, both indexable, is both an SEO duplication problem and a
compliance ambiguity worth resolving.

`/blog` (232 words) is in the main navigation of every page and in the sitemap,
and renders "No articles published yet" — while 44 country-scoped article URLs
serve full articles. The global hub is a broken aggregator.

---

## XML sitemap

| Check | Result |
|---|---|
| Discoverable from robots.txt | ✓ |
| Format | Valid `urlset` (single file, not an index) |
| URLs | 1,153 |
| Status of sampled URLs | 573 checked (500 crawled + 73 sampled), 100% `200` |
| `lastmod` | Present on all URLs, real dates (1,111 in 2026-07, 31 in 2026-08, 3 in 2026-06) |
| `changefreq` | Present |
| `priority` | Present and genuinely varied (1.0 → 0.3) |
| Non-canonical / noindex / redirecting URLs in sitemap | 0 |

Composition:

| Page type | URLs |
|---|---|
| `services` | 666 |
| `doctors` | 124 (91 profiles + 33 index) |
| `health` | 90 |
| `blog` | 44 |
| `legal` | 42 |
| country homes | 39 |
| `gp-consultation-online` | 33 |
| `book` | 33 |
| `pricing` | 33 |
| `lab-tests` | 24 |
| `see-a-specialist` | 24 |
| root | 1 |

This is a well-built sitemap. The only gap is the 79 hreflang targets it omits.
At 1,153 URLs it is also comfortably within single-file limits, so no index file
is needed.

Note: `/book` (33 URLs) is a transactional booking funnel entry. It is
indexable and in the sitemap, which is defensible, but confirm it is the intended
landing experience rather than a step that should be `noindex`.

## robots.txt

Correct. `Allow: /` with targeted disallows for `/admin`, `/account`, `/login`,
`/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/`.
The same block is repeated per-user-agent for the major AI crawlers, all
permissive. Sitemap declared. No accidental blocking of any indexable content.
