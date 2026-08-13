> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../../../plans/seo-control-state.md).** Counts and statuses below are a record of what was true when written. Do not treat them as current.

# Technical SEO Audit — myglobalhealth.online
Date: 2026-07-24 | Pages sampled: home (/), /ireland/en, /about, /privacy, /terms (declared only),
/ireland/en/services/acute-medical-consultation, /brazil/pt/doctors/dr-renato-sarmento, robots.txt,
sitemap.xml, apex/non-www redirect, `*.up.railway.app` fallback host.

## Score: 88/100

## What works
- **Crawlability**: `robots.txt` is current and well-formed — allows `/`, blocks `/admin`, `/account`,
  `/login`, `/register`, auth flows, `/api/`. Explicit allow rules for GPTBot, OAI-SearchBot,
  ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User (correct 2026 AI-crawler tokens).
- **Sitemap**: declared in robots.txt, resolves 200, valid `urlset`, includes per-URL
  `xhtml:link rel="alternate" hreflang` blocks (en-IE/pt-IE/es-IE/cs-IE/ro-IE/de-IE + x-default) for
  country/locale variants. Covers home, country homes, service pages, doctor profiles.
- **Railway fallback domain**: confirmed via `frontend/proxy.ts:365-367` — any request whose `Host`
  ends in `.up.railway.app` and isn't the canonical host gets `X-Robots-Tag: noindex, nofollow, noarchive`
  set at the edge on every response. This is a genuine noindex mechanism (not just a stale robots.txt
  declaration), so it validates as a pass.
- **HTTPS/redirects**: non-www apex (`myglobalhealth.online`) 301s cleanly to
  `https://www.myglobalhealth.online` (single-hop, no chain). HSTS present
  (`max-age=31536000; includeSubDomains; preload`).
- **Security headers**: HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restricting
  camera/mic/geolocation/browsing-topics, and a real (non-report-only on HTML routes) CSP with
  `frame-ancestors 'self'`, `object-src 'none'`, `base-uri 'self'`.
- **Canonicals**: self-referencing, absolute, correct on every sampled page (home, country home,
  about, privacy, service, doctor).
- **Rendering**: fully SSR — `render_page.py --mode auto` resolved every sampled URL via raw fetch
  (`mode_used: "raw"`, `is_spa: false`), meaning Googlebot/Bingbot see full content with zero JS
  execution dependency. No CSR shell risk.
- **Structured data**: `MedicalOrganization`/`WebSite`/`PostalAddress` on home; `MedicalClinic` +
  `FAQPage` on service pages; doctor pages carry 2 JSON-LD blocks (person/clinic). All validated as
  well-formed JSON by the audit tool.
- **Mobile**: `<meta name="viewport" content="width=device-width, initial-scale=1">` present on every
  sampled page.
- **Meta robots**: `index, follow` correctly set on public pages (home, country home, about).

## Issues (prioritized)

### High
1. **No in-`<head>` hreflang tags on rendered HTML** — hreflang alternates exist only in
   `sitemap.xml`, not as `<link rel="alternate" hreflang="…">` in the actual page `<head>`
   (grep for `hreflang` on `/ireland/en` and `/about` returned 0 matches). Sitemap-only hreflang is a
   valid Google signal on its own, but relying on a single channel is fragile — sitemap generation
   drift (seen historically per project memory: multiple uncommitted i18n/locale branches) won't
   surface as a broken page, only as silent duplicate-content/wrong-locale serving in search results.
   Recommend adding matching `<link rel="alternate" hreflang>` tags in the Next.js `generateMetadata`
   for `[country]/[lang]` routes so the two sources can't drift apart. Defer full validation
   methodology to the `seo-hreflang` sub-skill.

### Medium
2. **Legal pages are global-only, not country-localized in the sitemap.** Only `/privacy` and
   `/terms` are declared; no per-country legal variants (e.g. `/ireland/en/terms`,
   `/brazil/pt/privacy`) even though the site has country-specific consent/compliance content
   elsewhere (Brazil consent flow, per-country disclaimers per project history). If per-country legal
   copy exists behind these routes it isn't indexed as such; if it's genuinely one global doc that's
   fine but should be a deliberate decision, not a gap.
3. **Locale/slug mismatch on Brazil market**: sitemap shows `/brazil/en/services/segunda-opiniao-medica`
   and `/brazil/es/services/...` using Portuguese-language slugs under `en`/`es` locale paths (e.g.
   `atestado-medico-online`, `consulta-pele-online`). Slugs should generally match the locale's
   language for keyword-relevance in that market's SERPs — worth confirming this is intentional
   (shared canonical slug across locales) vs. a translation/localization gap.

### Low
4. **CSP is `report-only` on `robots.txt` itself** (`content-security-policy-report-only` header seen
   on `/robots.txt`) vs. an enforcing `Content-Security-Policy` on HTML page routes (confirmed via
   render_page fetch of `/`). Inconsistent but low-impact since `/robots.txt` isn't a script-execution
   surface — flagging only for header-hygiene consistency.
5. No `IndexNow` submission observed/configured (not confirmed either way from static inspection) —
   recommend confirming Bing/Yandex/Naver IndexNow key + endpoint wiring exists for faster re-crawl
   on the frequent CMS content pushes this project does (weekly market launches per project history).

## Category pass/fail
| Category | Status |
|---|---|
| Crawlability (robots.txt, sitemap, noindex) | Pass |
| Indexability (canonicals, meta robots) | Pass |
| Security (HTTPS, headers) | Pass |
| URL structure / redirects | Pass |
| Mobile viewport | Pass |
| Core Web Vitals (source-level) | Not fully assessable — no field/lab data collected this pass; SSR + JSON-LD sizes small (2.3KB), no obvious render-blocking red flags in headers (`link rel=preload` on CSS chunks present) |
| Structured Data | Pass |
| JS rendering (CSR vs SSR) | Pass — full SSR, no Playwright fallback triggered |
| hreflang | Partial — sitemap only, no head tags (High) |
| IndexNow | Unconfirmed (Low) |
