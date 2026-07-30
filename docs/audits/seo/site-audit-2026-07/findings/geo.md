# GEO / AI-Search Readiness Audit — myglobalhealth.online
Date: 2026-07-24

## GEO Health Score: 68/100

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 55 | Answers exist but most are short bullet fragments, not 134-167w self-contained passages |
| Structural Readability | 20% | 70 | Clean heading hierarchy, but H2/H3 are declarative ("Real doctors, registered locally") not question-form except FAQ |
| Multi-Modal Content | 15% | 50 | No video/YouTube embeds, no data tables/infographics found |
| Authority & Brand Signals | 20% | 55 | MedicalOrganization + doctor-registration schema is strong; no visible authorship/byline/dateline in rendered HTML |
| Technical Accessibility | 20% | 95 | Fully SSR (`mode_used: raw`, `is_spa: false` on all 4 pages) — zero JS-rendering risk for crawlers |

## AI Crawler Access (robots.txt)
All target crawlers explicitly allowed with `Allow: /`, only admin/account/api paths blocked:
- GPTBot: **Allowed**
- OAI-SearchBot: **Allowed**
- ChatGPT-User: **Allowed**
- ClaudeBot: **Allowed**
- Claude-SearchBot / Claude-User: **Allowed**
- anthropic-ai: **Allowed** (note: this is a training crawler; site chose to allow it — no issue, but worth a conscious decision)
- Google-Extended: **Allowed**
- Gemini-Deep-Research: **Allowed**
- PerplexityBot / Perplexity-User: **Allowed**
- CCBot: **not listed** (falls under `User-Agent: *` which also Allows `/` — so CCBot is allowed too by the wildcard block; if training-crawler exclusion is desired, this is a gap)

Sitemap declared: `https://www.myglobalhealth.online/sitemap.xml` — good.

**Severity: none** — crawler access is a non-issue, best-practice already implemented.

## llms.txt
**Present** at `/llms.txt`, returns 200, well-formed markdown: site summary, per-country landing/booking/GP/specialist/doctor/lab-test links for 6 markets, plus About/FAQ/Blog/Privacy/Terms/Sitemap.
No RSL 1.0 licensing block found in the file.
**Severity: Low** — add an RSL licensing section if the business wants explicit AI-reuse terms; not currently blocking anything.

## Structured Data
- Homepage: `MedicalOrganization` + `Country`/`PostalAddress`/`ContactPoint`/`WebSite` (1 block, 2.3KB) — solid entity graph.
- About: adds `FAQPage` (Q&A pairs) + `BreadcrumbList`.
- Service page (`/ireland/en/gp-consultation-online`): 5 schema blocks — org, `BreadcrumbList`, `MedicalProcedure`/`ReserveAction`, `Service`/`Offer`/`QuantitativeValue` (pricing), and `FAQPage`. This is the strongest page in the audit — pricing + procedure + FAQ schema all present.
- FAQ page: `FAQPage` schema present, matches visible Q&A content.

**Severity: none** — structured-data coverage is above average for the vertical.

## Citability (passage-level, via trafilatura extracted_text)
- Homepage: opens with a direct 1-sentence value prop ("Licensed doctors and online care, in your country") followed by a 4-item bullet list — good hook, but no elaboration/stats to reach the 134-167 word optimal citation length.
- About: "Real doctors, registered locally" section is close to ideal — 2-3 sentence self-contained claim ("Every clinician on the platform is licensed in your country... The doctor on the profile is the doctor on the call.") but under-length (~35 words); no supporting statistic (e.g., number of doctors, number of consultations).
- Service page (GP consultation, Ireland): leads with credential-specific claim ("IMC-registered GPs... same-day appointments... Consultations in English, Portuguese, Spanish, Arabic and more") — good specificity, still short of 134-167w and lacks a cited statistic (e.g., average wait time, consultation count).
- No page in the sample contains a numeric/statistical claim with source attribution (e.g., "X% of patients seen within Y minutes").

**Severity: Medium** — content is directionally right (short, direct, factual) but consistently under the optimal citation length and missing sourced statistics, which are the two things AI Overviews/Perplexity reward most.

## Q&A / FAQ Structure
- Dedicated `/faq` page with FAQPage schema, organized into topic groups (Booking, Payment, etc.) — question-form headings, direct 1-2 sentence answers. This is the best-optimized content type on the site.
- About and Service pages also carry FAQPage schema blocks (reused Q&A component) — good pattern, should be replicated onto every service/country landing page if not already.

## Authority / Brand Signals
- No visible author byline, credential line, or publish/update date rendered in the HTML on About/Service/FAQ (site metadata reports `publication_date: 2026-07-20` at the HTTP/meta level, but no in-content "Reviewed by Dr. X" or "Last updated" text was found in extracted_text).
- Doctor-specific `MedicalProcedure`/registration schema (IMC etc.) is a strong E-E-A-T signal per-market.
- Off-site brand signals (Wikipedia entity, Reddit threads, YouTube mentions, LinkedIn) were **not verifiable in this pass** — no live web-search tool was invoked; recommend a follow-up brand-mention crawl (YouTube mentions carry the strongest correlation, ~0.737, with AI citation).

**Severity: Medium** — missing on-page authorship/review dates is a quick, high-leverage fix for medical content (YMYL) trust signals.

## Technical Accessibility
All 4 sampled pages (`/`, `/about`, `/ireland/en/gp-consultation-online`, `/faq`) rendered via `mode_used: raw` with `is_spa: false` — content is present in the initial server response with no client-side rendering gap. This is the strongest dimension in the audit; AI crawlers that don't execute JS will see full content.

## Top 5 Highest-Impact Changes

1. **Add sourced statistics to hero/answer blocks** (e.g., doctor count, average booking time, consultation volume per country) on homepage, About, and service pages. Effort: Low (content only). Impact: High — directly targets the #1 citability gap.
2. **Add visible authorship/clinical-review + "last updated" date** to About, FAQ, and service pages (e.g., "Clinically reviewed by Dr. X, [registration], updated [date]"). Effort: Low-Medium (component + CMS field). Impact: High — E-E-A-T signal for YMYL medical content.
3. **Expand top-of-section answers to 134-167 words** on About and service pages (currently 35-80 word fragments) while keeping the direct-answer-first structure. Effort: Medium (copywriting). Impact: High — hits the documented optimal-citation length band.
4. **Replicate FAQPage + Q&A pattern onto every country landing page and remaining service pages** (currently confirmed only on About/one GP service page/FAQ). Effort: Low (reuse existing component). Impact: Medium-High.
5. **Add explicit CCBot/anthropic-ai training-crawler policy decision + optional RSL 1.0 licensing block** in robots.txt and llms.txt if the business wants to distinguish "AI search visibility" crawlers from "AI training" crawlers (currently CCBot is implicitly allowed via the wildcard rule). Effort: Low. Impact: Low-Medium (policy/compliance, not visibility).

## Platform-Specific Estimated Scores
(Based on structured-data coverage, SSR accessibility, and content-citability signals observed; not live-verified against ChatGPT/Perplexity/Bing outputs — no DataForSEO MCP tools were available in this session.)

| Platform | Est. Score (0-100) | Rationale |
|---|---|---|
| Google AI Overviews | 65 | Strong schema + SSR, held back by short passages/no stats |
| ChatGPT / OAI-SearchBot | 70 | Crawler fully allowed, llms.txt present — best-supported platform |
| Perplexity | 62 | Crawler allowed, but weak on citable stat-backed passages Perplexity favors |
| Bing Copilot | 60 | Depends on Bing index quality (not checked); schema/SSR support present |

## Notes / Limitations
- No live web search performed for off-site brand mentions (Wikipedia/Reddit/YouTube/LinkedIn) or DataForSEO live ChatGPT visibility — recommend follow-up pass with those tools connected.
- Sample limited to homepage, /about, one service page (Ireland GP consultation), and /faq per audit scope; other 5 country/service combinations not individually checked but share the same templates per llms.txt structure, so findings likely generalize.
