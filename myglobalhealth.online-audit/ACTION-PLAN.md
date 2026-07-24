# Action Plan — myglobalhealth.online (2026-07-24)

## Phase 1 — Critical (Week 1)
1. **Legacy Wix URL reconciliation** — verify 301s from `/home`, `/es/home-sp`, `/post/*` etc.; GSC removal/recrawl requests; submit `/ireland/en` + country pages for indexing. (Blocked partially on GSC access — no Google API creds configured.)
2. **Sitemap cleanup** — exclude noindexed doctor locale variants from sitemap generation (~250+ URLs; root cause = locale/market-row translation gap).
3. **Cookie modal** — stop covering primary CTA on mobile (site-wide component).
4. **Deploy `6a756ff1`** — legal BreadcrumbList live.
5. **Mojibake fix** — em-dash → "�" encoding bug (CMS ingestion or render layer).

## Phase 2 — High impact (Weeks 2-3)
6. hreflang `<link rel="alternate">` head tags via `generateMetadata` for `[country]/[lang]` routes.
7. Homepage mobile perf: un-gate hero H1 paint from JS reveal; profile/throttle animation-observer loop (30s main-thread, TBT 1,840ms).
8. `/ireland/en` hydration audit (TBT 2,970ms).
9. Service hero images via Next/Image (not raw `/api/media`).
10. Homepage gate: internal links to country pages + trust content (fix 162-word/0-link state).
11. €29 visible hero price badge on country/service pages.
12. Named clinical reviewer + review date on every service page and /about.

## Phase 3 — Content & authority (Month 2)
13. Editorial calendar; scale blog from 2 posts using diabetes-article template (author, reviewed-by, citations, FAQ schema).
14. External citations (HSE/WHO/NHS) on service pages.
15. GEO: sourced stats in hero/answer blocks; lengthen answers to 134-167 words; replicate FAQPage to all country/service pages.
16. Dedicated sick-cert + prescription landers per market (mirror single-purpose competitors).
17. Ship `/legal/*` routes (currently 404) + per-country legal sitemap entries.
18. Schema: Article publisher logo; `@id` entity graph; evaluate Doctify review schema.
19. Fix Brazil PT slugs under `/brazil/en|es` or confirm intentional.

## Phase 4 — Monitoring (Ongoing)
20. Configure Google API creds (GSC/CrUX/GA4) for field data.
21. `claude-seo` drift baseline post-fixes.
22. Track SERP positions for the 4 money queries vs webdoctor.ie / gpdoctor.ie / eirdoc.com / dronline.ie / medis.pt.
23. Re-run mobile Lighthouse after Phase 2.

Severity legend: Phase 1 = blocks visibility/conversion now; Phase 2 = ranking/UX lift; Phase 3 = authority build; Phase 4 = keep it fixed.
