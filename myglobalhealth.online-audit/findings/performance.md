# Performance / Core Web Vitals — myglobalhealth.online

Lab source: Lighthouse 13.4.1 (Node/CLI, mobile default throttling, single run per URL, headless Chrome, 2026-08-02).
Field source (context only, collected by another agent via CrUX, not re-fetched here): origin all-devices LCP 1,539ms / INP 137ms / CLS 0.00 / TTFB 534ms; but the latest per-device week is worse — LCP 3,098ms phone / 3,097ms desktop (Needs Improvement), TTFB 2,618ms phone (Poor) / 1,985ms desktop. 25-week trend: LCP/TTFB/FCP/CLS improving, INP degrading +33.9%. `lcp_subparts.py` (CrUX) returned HTTP 404 "chrome ux report data not found" for all 4 URLs when run directly against them — page-level CrUX segments don't exist for these low-traffic routes, consistent with the origin-level data above being the only field signal available.

`pagespeed_check.py` was not used (known-buggy in this environment per task brief).

## Per-URL Lighthouse lab results

| URL | Perf score | FCP | LCP | TBT | CLS | Speed Index | TTI |
|---|---|---|---|---|---|---|---|
| `/` (entry gate) | 78 | 1,299ms | 3,099ms | 544ms | 0 | 3,894ms | 4,052ms |
| `/ireland/en` | **49** | 2,009ms | **4,809ms** | **1,515ms** | 0 | 6,571ms | 4,846ms |
| `/ireland/en/services/acute-medical-consultation` | 76 | 1,724ms | 3,605ms | 369ms | 0 | 5,488ms | 3,669ms |
| `/spain/en/doctors/dr-syed-tahir` | 91 | 1,563ms | 2,988ms | 87ms | 0 | 4,405ms | 3,706ms |

CLS = 0.000 on all 4 pages in this lab run (no layout-shift-elements reported) — not measured under real user network variance/ad-block/slow-CPU scenarios, so treat as "no shift observed in a clean single run," not a guarantee.

Lighthouse's `largest-contentful-paint-element` and `render-blocking-resources` audits returned empty `items` on all 4 runs (a known Lighthouse 13.x insight-audit migration quirk — the LCP-element/render-blocking legacy detail arrays are not populated the same way post-13.0). LCP element identity and render-blocking resource list are **not measured this run** via that audit; inferred instead from `network-requests` + raw HTML below.

### LCP subparts — not measured this run (lab)
Lighthouse 13.x's insight-based LCP breakdown (TTFB / resource load delay / resource load time / render delay phases) was not exposed in the `audits` JSON keys checked (`largest-contentful-paint-element` came back empty). CrUX `lcp_subparts.py` 404'd per-URL (see above). What IS measured: `server-response-time` (TTFB proxy) was 291ms (`/`), 266ms (`/ireland/en`), 277ms (`/ireland/en/services/...`), 366ms (`/spain/en/doctors/...`) — all in the "good" TTFB range in Lighthouse's lab network, which does not match the field TTFB spike (2,618ms phone / 1,985ms desktop) — the field number is the one to trust for real users; lab TTFB under Lighthouse's synthetic network/server pairing is not representative of that regression.

Working LCP-element hypothesis from raw HTML/network-requests (not confirmed by the audit tool — flag as inferred):
- `/` — likely the logo image `logos/global-health-light.png` (40KB PNG, explicitly `<link rel=preload as=image>` in the HTML/response headers) or the hero heading text.
- `/ireland/en` — likely the hero image (`/_next/image?...home-hero.jpg`, preloaded) or the GP-availability widget, which itself blocks on a 91KB `/api/public/gp-availability` fetch (see below) — this API call is the single largest network resource on the page and is a strong LCP-delay candidate given the page's 4,809ms LCP.
- `/ireland/en/services/acute-medical-consultation` — likely a service hero image, not preloaded (no `imageSrcSet` preload link seen for this route's hero in the render dump).
- `/spain/en/doctors/dr-syed-tahir` — the doctor photo, `dr-syed-tahir.webp` (47.5KB, already WebP, not preloaded).

## Why Ireland pages are ~590KB of HTML (root cause found)

Confirmed via raw `curl` fetch + inline-script measurement, not modeled:

| Page | Total HTML bytes | Inline `<script>` bytes | % of page that is inline script |
|---|---|---|---|
| `/ireland/en` | 596,632 | 230,573 | **38.6%** |
| `/ireland/en/services/acute-medical-consultation` | 235,287 | 129,902 | **55.2%** |
| `/spain/en/doctors/dr-syed-tahir` | 269,945 | 112,030 | **41.5%** |

Root cause: **the Next.js App Router RSC "flight" payload is inlined into the document** via `self.__next_f.push([...])` script tags (69 push calls on `/ireland/en` alone) — this is the serialized React Server Component tree (including all fetched data: GP availability schedule, translations, doctor/service records) shipped twice — once rendered to HTML, once again as the JS-hydration payload embedded in `<script>` tags in the same document. This is standard Next.js App Router behavior, but the Ireland country-home page's RSC payload is unusually large because it inlines the full 7-day GP-availability schedule (`/api/public/gp-availability` response is 91KB on its own, separately fetched by the client) plus (per repo CLAUDE.md) the country-home page composes many translated sections.

Fix priority: reduce what's serialized into the RSC payload for `/ireland/en` — defer/stream the GP-availability data (fetch client-side after hydration behind a skeleton, don't inline it into the initial RSC flight) and check for over-fetching of translation/CMS fields not used above the fold. This single change is the highest-leverage fix for both HTML transfer size and the page's outlier 1,515ms TBT / 4,809ms LCP / score 49.

## JS / CSS transferred (network-requests audit, per page)

| Page | Total page weight | JS transferred | CSS transferred |
|---|---|---|---|
| `/` | 479,272 B (468 KiB) | 313,910 B | 48,141 B |
| `/ireland/en` | 680,109 B (664 KiB) | 315,496 B | 45,146 B |
| `/ireland/en/services/...` | 568,599 B (555 KiB) | 334,119 B | 45,154 B |
| `/spain/en/doctors/...` | 601,089 B (587 KiB) | 336,576 B | 45,133 B |

The same handful of core chunks (`3ekcchq7_crqv.js` ~75KB, `2vxb4d05-rexg.js` ~72.6KB, `0cr53kmeiz5e0.js` ~37.7KB, `0e_binmykb9nr.css` ~36.6KB) repeat on every page — good (browser-cacheable across navigations within a session) but confirms a large shared JS baseline (~185KB) is paid on every first visit regardless of route.

`unused-javascript` savings estimate: 23-26 KiB per page — minor, not a priority.

## Third-party script cost — not measured this run (consent-gated)

GTM, Doctify, Meta/Facebook Pixel, Microsoft Clarity, and the ElevenLabs convai widget are all present in the CSP allowlist (confirmed via response header), but **zero third-party network requests fired in any of the 4 Lighthouse lab runs** — `third-party-summary` returned empty on every page and `network-requests` shows only `www.myglobalhealth.online` (+ `api.myglobalhealth.online` for the doctor photo) as origins. This is consistent with the site's consent-gated tag setup (per project memory: "GA4 consent-gated tag live") — Lighthouse's fresh headless session never accepts a cookie-consent banner, so GTM/Clarity/Meta/Doctify/ElevenLabs never load. **Real-user cost of these five third parties is not measured this run** — to quantify it, a follow-up Lighthouse/trace run needs to auto-accept consent first (inject `document.cookie`/localStorage consent flag or click the banner via a Puppeteer script before navigation), or pull the cost from a synthetic RUM/`PerformanceObserver` capture in production instead.

## Render-blocking resources — not measured this run (empty audit)

`render-blocking-resources` returned empty `items` on all 4 pages (Lighthouse 13.x quirk noted above). From the raw response headers: CSS is a single ~36.6KB stylesheet (`0e_binmykb9nr.css`), no `<link rel=stylesheet media=print>` swap trick observed, no obvious multiple-stylesheet blocking chain. Not confirmed blocking vs. not — flag for a follow-up trace-waterfall check (`--only-categories=performance --output html` with visible waterfall, or DevTools trace) since the audit tool didn't surface it this run.

## Images — format/sizing

- Hero/logo images already served via `/_next/image` (automatic WebP/AVIF negotiation, responsive `srcset`, `w=` resizing) — `home-hero.jpg` source itself is a JPEG, `/_next/image` should be transcoding it, but the *source* file being a raw un-optimized JPEG on origin means the image optimizer at least isn't starting from a pre-compressed WebP.
- Doctor photo `dr-syed-tahir.webp` (47.5KB) — already WebP, good. Not run through `/_next/image` resizing (served directly from `api.myglobalhealth.online`), so the browser gets a fixed-size original rather than a viewport-matched srcset — worth checking if that origin file is larger than the rendered display size.
- `modern-image-formats` audit returned empty `items` on all 4 pages — i.e., Lighthouse found nothing to flag, consistent with `_next/image` already handling format negotiation for the images it serves.
- Logo PNG (`logos/global-health-light.png`, 40KB) is preloaded via response `link:` header (`rel=preload as=image`) on `/` — correct pattern for an LCP candidate, but confirm it actually IS the LCP element (see "LCP subparts" caveat above — not confirmed) before keeping the preload; if it's not LCP, the preload is wasted priority bandwidth on the entry gate's critical path.

## Fonts

`font-display` audit returned empty items on all 4 pages, and no `Font`-typed network requests were present in the network-requests audit on any page. Likely explanation: fonts are self-hosted via `next/font` (which inlines `font-display: swap` and preloads automatically, and Lighthouse's network-requests classification may miss `next/font`'s CSS-embedded `@font-face` in a single run) — or the site is using system/web-safe fonts only. **Not conclusively determined this run** — worth a direct check of `globals.css` for `@font-face`/`next/font` usage to confirm swap behavior is in place, since font-related CLS/FOIT risk can't be ruled out from this data alone.

## Caching (Cache-Control / TTFB impact) — corrected from brief

Directly verified via `curl -I` on 2026-08-02, the private/no-store header is **not universal** across all 4 target URLs as the brief's blanket statement suggested — it is scoped to the entry gate only:

| URL | Cache-Control |
|---|---|
| `/` (entry gate) | `private, no-cache, no-store, max-age=0, must-revalidate` |
| `/ireland/en` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` (+ `x-nextjs-cache: STALE`, `x-nextjs-prerender: 1`) |
| `/ireland/en/services/acute-medical-consultation` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` |
| `/spain/en/doctors/dr-syed-tahir` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` |

So: the 3 content pages ARE CDN/edge-cacheable (public, 60s shared-cache TTL with 300s stale-while-revalidate, ISR-backed — `x-nextjs-prerender: 1`/`x-nextjs-cache: STALE` confirms this is a Next.js ISR page being served stale-while-revalidating), which is a reasonable pattern and explains why lab TTFB looked fine (266-366ms) on all 3 — Railway's edge/`x-railway-edge: sin1` is likely serving a cached/near-cache copy in Singapore, which won't reflect real end-user TTFB if visitors are elsewhere (this is also the likely explanation for the field TTFB gap: 1,985-2,618ms field vs. <400ms lab — geographic distance to the single Railway edge region, not a caching-policy problem for these 3 URLs).

The entry gate `/` is the one page confirmed genuinely `no-store` — every visit to the country-selector re-executes full SSR + zero caching, on every browser back-button return, every repeat visit, and every bot/crawler hit. This is deliberate-looking (it's a stateful "which country am I" gate, plausibly needs to read geo/locale cookies per-request) but it means the very first page of the funnel never benefits from a CDN warm cache, and its own lab LCP (3,099ms) is already at the edge of "Needs Improvement." If `/` doesn't actually need per-request personalization beyond a cookie read, moving it to `public, s-maxage=60` like the other 3 would remove this as a source of first-visit latency.

## Prioritized fixes

1. **P0 — `/ireland/en` outlier (score 49, LCP 4,809ms, TBT 1,515ms).** Root cause: 91KB `/api/public/gp-availability` call + oversized inlined RSC flight payload (230KB of the 596KB document, 38.6%). Defer the GP-availability fetch to client-side-after-hydration (skeleton/loading state) instead of blocking the server render / inlining it into the RSC payload. Expected impact: largest single win available in this audit — could plausibly bring this page in line with the other 3 (score ~75-90, LCP <3.6s).
2. **P1 — Ireland service page RSC payload is 55.2% of document weight** (129.9KB of 235.3KB) — same root cause pattern as #1, smaller magnitude. Audit what's being fetched server-side and serialized into the flight payload for service-detail pages; trim to above-the-fold data only.
3. **P1 — Entry gate `/` cache policy.** Confirm whether `/` truly needs `no-store` (session/geo personalization) or can move to the same `public, s-maxage=60, swr=300` pattern as the other 3 routes — every visitor's first HTTP request currently bypasses CDN caching entirely.
4. **P2 — Confirm LCP element identity per page** (the audit tool didn't report it this run) via a manual trace/DevTools Performance panel capture, then verify each is preloaded — the `/` logo preload looks likely-correct but unconfirmed; the Ireland hero and doctor photo are not confirmed preloaded.
5. **P2 — Quantify real third-party cost** (GTM/Doctify/Meta/Clarity/ElevenLabs) with a consent-accepted Lighthouse run or production RUM/PerformanceObserver capture — current lab data shows 0 bytes from any of them because consent is never granted in a fresh headless session, so their true weight is unknown and could be materially affecting field INP (which is the one metric degrading +33.9% over 25 weeks per the field-data context).
6. **P3 — Verify font-loading strategy** directly in `globals.css`/`next/font` config; the audits found nothing to flag but also found no font network requests at all, which is inconclusive rather than confirmed-good.
7. **P3 — Shared JS baseline (~185KB across 4 core chunks) ships on every first visit.** Not urgent (well within cacheable, repeat-visit-free budget) but a candidate for code-splitting if it grows.

## Not measured this run (explicit)
- LCP element identity (Lighthouse audit returned empty; inferred only, not confirmed).
- LCP subparts / phase breakdown in lab (Lighthouse 13.x insight audits didn't expose it in the JSON keys checked; CrUX per-URL 404s).
- Render-blocking resource list (audit returned empty items).
- Third-party script byte/CPU cost for GTM, Doctify, Meta, Clarity, ElevenLabs (consent-gated, never fired in lab session).
- CLS under real-world conditions (0.000 observed in a single clean lab run only).
- Font-loading mechanism confirmation (no font network requests captured either way).
