# Full SEO Audit — myglobalhealth.online

**Date:** 2026-07-24 · **Health Score: 73/100** · Business type: multi-country telehealth / online GP (IE, ES, PT, CZ, BR, RO)

Category scores (weighted): Technical 83 (22%) · Content 74 (23%) · On-Page/SXO 60 (20%) · Schema 78 (10%) · Performance 72 (10%) · AI Readiness 68 (10%) · Images/Visual 70 (5%)

Per-category detail: [findings/technical.md](findings/technical.md), [findings/content.md](findings/content.md), [findings/schema.md](findings/schema.md), [findings/sitemap.md](findings/sitemap.md), [findings/performance.md](findings/performance.md), [findings/visual.md](findings/visual.md), [findings/geo.md](findings/geo.md), [findings/sxo.md](findings/sxo.md). Screenshots in `screenshots/`, raw Lighthouse JSON in `lighthouse/`.

## Executive summary

The site's technical foundation is strong — full SSR, clean canonicals, hardened headers, valid 1,422-URL sitemap with hreflang, current AI-crawler policy, llms.txt. The existential problem is **visibility, not build quality**: Google is still surfacing legacy Wix-era URLs (`/home`, `/es/home-sp`, `/post/*`) and does not rank the real country pages for any tested money query ("online doctor ireland", "online gp consultation ireland", "médico online portugal", …). Competitors hold 100% of visible slots. Until indexing is reconciled, every content/perf improvement is invisible.

### Top 5 critical issues
1. **Indexing/legacy-URL gap (Critical)** — real country/service pages absent from SERPs; legacy Wix URLs still represent the domain.
2. **~250+ noindexed doctor locale-variant URLs in sitemap (High)** — 68% of sampled doctor URLs are noindex yet listed; crawl-budget waste, same root cause as known locale/market-row gap.
3. **Mobile cookie modal covers the primary CTA on every page tested (High)** — conversion killer site-wide.
4. **Mobile performance (Critical)** — homepage LCP 3.04s (82% JS-gated H1 render delay), ~30s main-thread work, TBT 1,840ms; `/ireland/en` TBT 2,970ms; service hero LCP 4.62s (raw `/api/media` image bypasses Next/Image). Desktop is 96-98; CLS 0 everywhere.
5. **Homepage is a 162-word country gate** with zero E-E-A-T signals and zero internal links — crawl-depth risk for all six markets.

### Top 5 quick wins
1. Deploy commit `6a756ff1` — legal BreadcrumbList committed but not live.
2. Add `<link rel="alternate" hreflang>` head tags via `generateMetadata` (currently sitemap-only).
3. Visible €29 hero price badge on `/ireland/en` (price-shopper persona scored 14/25; price is meta-only today).
4. Fix em-dash mojibake ("�") across homepage, blog, doctor pages.
5. Serve service hero via Next/Image — cuts 3.6s off a 4.62s LCP.

## Category highlights

**Technical (83)** — hreflang head tags missing (High); noindexed URLs in sitemap (High); `/legal/*` 404s (Medium); Portuguese slugs under `/brazil/en|es` (Medium); lastmod absent/fake on 92% of sitemap.

**Content (74)** — homepage thin (Critical); only 2 blog articles for a 6-market YMYL brand (Critical); generic "Reviewed by licensed doctors" instead of named reviewer+date on service pages (High); no external citations outside one blog post (High); mojibake (High). Bright spot: the diabetes article + doctor profiles are textbook E-E-A-T.

**On-Page/SXO (60)** — page-type alignment is actually correct (`/ireland/en` matches SERP consensus well); the failure is being indexed at all. Secondary: price not on-page, multilingual USP buried, no single-purpose sick-cert/prescription landers.

**Schema (78)** — strong entity modelling (MedicalOrganization with registry IDs, Physician with credentials, Service+16 Offers). Gaps: legal breadcrumbs not deployed (High), no publisher logo, no `@id` graph, no review schema despite Doctify.

**Performance (72)** — all pain is mobile CPU: JS-gated hero reveal + animation/observer loop on homepage; heavy hydration on `/ireland/en`; unoptimized `/api/media` hero on service page.

**AI Readiness (68)** — crawler access and llms.txt excellent; needs sourced stats, 134-167-word answer passages, and visible bylines to be citable.

**Visual (70)** — cookie modal CTA occlusion is the one real issue; layout otherwise clean on both viewports.

## Limitations
- No Google API credentials — CrUX field data, GSC indexation, and GA4 skipped (lab Lighthouse only).
- No drift baseline existed — capture one after fixes.
- Brand-mention sweep (Wikipedia/Reddit/YouTube) not run — no live SERP API.
- Backlink profile not audited this pass (no Moz/Bing creds).

See [ACTION-PLAN.md](action-plan.md) for the phased plan.
