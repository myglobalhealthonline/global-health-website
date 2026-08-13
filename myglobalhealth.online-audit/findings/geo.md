> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).** This audit predates the 2026-08 remediation batches. Every count, status and priority below is superseded. Kept as evidence only.

# GEO / AI Search Readiness — myglobalhealth.online

**Citability / GEO Health Score: 74 / 100**

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Citability | 25% | 78 | 19.5 |
| Structural Readability | 20% | 70 | 14.0 |
| Multi-Modal Content | 15% | 50 | 7.5 |
| Authority & Brand Signals | 20% | 72 | 14.4 |
| Technical Accessibility | 20% | 92 | 18.4 |
| **Total** | | | **73.8 ≈ 74** |

---

## 1. AI crawler access (robots.txt)

`https://www.myglobalhealth.online/robots.txt` — clean, explicit per-agent blocks, all with `Allow: /` and the same narrow disallow list (`/admin`, `/account`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/`). No blanket AI block, no `Disallow: /health` or content paths.

| Crawler | Status |
|---|---|
| GPTBot | Allowed |
| OAI-SearchBot | Allowed |
| ChatGPT-User | Allowed |
| ClaudeBot | Allowed |
| Claude-SearchBot | Allowed |
| Claude-User | Allowed |
| anthropic-ai | Allowed (training bot — usually blocked; site allows it, acceptable but optional to restrict) |
| Google-Extended | Allowed |
| Gemini-Deep-Research | Allowed |
| PerplexityBot | Allowed |
| Perplexity-User | Allowed |
| Bytespider | **Absent** — falls under wildcard `User-Agent: *` → allowed by default |
| Applebot-Extended | **Absent** — allowed under wildcard |
| Amazonbot | **Absent** — allowed under wildcard |
| Meta-ExternalAgent | **Absent** — allowed under wildcard |
| Claude-Web (legacy) | **Absent** (superseded by Claude-SearchBot/Claude-User, fine) |
| CCBot | **Absent** — allowed under wildcard (recommended optional block for training-only crawler not done) |

No hard blocks anywhere — best-case posture for AI visibility. Only gap: CCBot/Bytespider/Amazonbot ride the wildcard `Allow: /` since there's no dedicated rule; low priority since none of these drive citation traffic today.

## 2. llms.txt — Present, well-formed, good but shallow

`GET /llms.txt` → 200, correct Markdown spec structure (H1, blockquote summary, `##` sections, `- [Title](url): description` link list).

Strengths:
- Covers all 6 country hubs × 5 core pages (book, GP consultation, specialist, doctors, lab-tests) = 30 links, plus About/FAQ/Blog/Privacy/Terms/Sitemap.
- Descriptions are short direct-answer summaries, not just page titles.

Gaps vs. spec best practice:
- No `## Optional` section for lower-priority pages (legal, blog index) per the llms.txt convention — currently everything is flat in "Site info".
- Individual blog articles (e.g. `/ireland/en/blog/when-to-see-a-gp-online-vs-in-person`) are **not listed** despite being the site's strongest E-E-A-T content (named physician author + clinical reviewer + dates). llms.txt only points to the `/blog` hub, which is broken (see §3).
- No non-English locale entries (site is 6-locale but llms.txt is Ireland-en/Czechia-cs/Portugal-pt/Spain-es/Romania-ro/Brazil-pt only — one locale per country, not all 6 per country). Reasonable simplification, not a defect.
- No `llms-full.txt` variant (optional, not required).
- No RSL 1.0 licensing file/reference found (`/llms.txt` doesn't declare licensing terms, no `<link rel="license">` checked in HTML head — not verified but no RSL tags in the fetched JSON-LD).

## 3. Passage-level citability

All pages checked are **server-rendered** — raw `curl` (no JS execution) returns full text content, confirmed by word counts matching rendered pages. This is a major structural advantage: every AI crawler doing a plain HTTP GET gets full content, no CSR blind spot.

| Page | Raw word count | Notes |
|---|---|---|
| `/` (homepage) | 122 | Country-selection gate only, single H2 ("Select the country where you need medical care"). By design — not a citable content page, but it's the canonical `/` and thin content there can suppress overall domain trust signals for AI crawlers that sample the root. |
| `/ireland/en` | 3,459 | Good depth. H2s are marketing statements, not questions: "Built for people who shouldn't have to wait", "Why choose Global Health", "The doctor you book is the doctor you see" — low direct-extractability for query-matching (AI engines match question-shaped headings to user queries far more reliably). Has FAQPage schema section at bottom with real Q&A. |
| `/ireland/en/services/acute-medical-consultation` | 1,292 | Well-structured: "What to Expect", "Conditions Commonly Assessed", "How It Works", "Frequently Asked Questions". FAQ answers are self-contained, 40–70 words, directly answer the question in the first sentence — this is the strongest citability pattern on the site. |
| `/about` | 1,133 | H2s again mostly brand copy ("Medicine Anytime Anywhere isn't just a tagline..."), one FAQ block. |
| `/ireland/en/blog/when-to-see-a-gp-online-vs-in-person` | 4,869 | Best citability asset on the site: question/scenario-shaped H2s ("When Online Care Is Appropriate", "When You Need to Be Seen in Person", "Emergency Warning Signs — Call 999/112"), FAQ section, "Key Resources" list, named-author byline + clinical reviewer + published/modified dates. This is the template every other page should follow. |

**Systemic issue: the `/blog` hub is broken.** `curl /blog` returns "No articles published yet" (245 words) while the sitemap lists dozens of live, indexed, locale-scoped articles at `/{country}/{locale}/blog/{slug}` (confirmed: `/ireland/en/blog/when-to-see-a-gp-online-vs-in-person` returns a full 4,869-word article with Article schema). The generic `/blog` aggregator isn't querying the locale-scoped content — it's an orphaned page that undersells the site's actual article inventory to any crawler or AI agent that starts there (and it's the URL listed in llms.txt).

**Optimal passage length (134–167 words):** FAQ answers on the service page and article land in the 40–120 word range — good for direct Q&A snippets but slightly short of the ideal single-paragraph citation length recommended for AI Overviews/ChatGPT synthesis. Body paragraphs under H2s in the article run longer and are not chunked into standalone ~150-word blocks; they read as continuous prose, requiring the AI to do more extraction work rather than lifting a ready-made passage.

## 4. Authority / E-E-A-T signals

This is the strongest dimension on the site, and it's excellent for a YMYL vertical:

- **Article schema with named physician authors**: `@type: Article` → `author: { @type: Physician, name: "Dr Tiago Miguel Figueira", jobTitle: "Physician", hasCredential: [IMC 523449 recognized by Irish Medical Council], memberOf: Irish Medical Council, worksFor: Global Health }`. This is textbook medical E-E-A-T structured data.
- **Visible byline + clinical reviewer** in body text: "Written by Dr Tiago Miguel Figueira (IMC 523449), Clinical Director at Global Health" + "Clinically reviewed by Dr Ahmed Maklad" with read-time and date — exactly what Google/AI trust signals for medical content want.
- **`datePublished` / `dateModified`** present and current (2026-07-24) on articles.
- **Organization schema (`MedicalOrganization`)** on every page: legal name (Global Guest s.r.o.), founding date, description, and a strong `sameAs` array including **Wikidata** (`https://www.wikidata.org/wiki/Q140363271`), LinkedIn, YouTube, Instagram (per-country), TikTok, plus links to 12+ regulatory/authority bodies (Medical Council, HSE, HIQA, HPRA, RCPI, ICGP, etc.) — unusually thorough for entity grounding.
- **FAQPage schema** on hub, service, and about pages.
- **BreadcrumbList schema** present.
- **MedicalClinic/MedicalBusiness** schema variants add local-service specificity.

Gaps:
- No Wikipedia article (only Wikidata entity) — Wikipedia presence is one of the highest-correlation signals for AI citation and is absent; young brand (founded 2023) makes this hard but a Wikidata item is a reasonable stepping stone if it's well-sourced.
- Author bylines/reviewer credentials exist only on **articles**, not on the service pages themselves (service pages have FAQ schema but no visible clinician attribution on the medical claims made in body copy) — a missed opportunity since service pages carry the highest commercial-intent traffic.
- Could not verify live third-party citation/backlink footprint (Reddit threads, directory listings, news mentions) in this pass — YouTube channel (`@GlobalHealth-y9o`) exists but activity/subscriber count wasn't confirmable via fetch; recommend a manual/DataForSEO check (`ai_opt_llm_ment_search`) for "online doctor Ireland" / "telemedicine Portugal" / "online GP consultation Ireland" query sets, since domain age (2023) means organic third-party mentions are likely still thin — this is probably the single biggest lever left (YouTube mentions carry ~0.737 correlation with AI citation, the strongest signal in the table, and it's the one channel already owned but under-leveraged on-site — no video embeds found on any page checked).

## 5. Technical accessibility

- All checked pages (home, Ireland hub, service page, about, blog article) are fully server-rendered — no CSR/hydration gap between raw HTML and what a browser shows. This is the best possible baseline for AI crawlers, which typically do not execute JS.
- Sitemap present and large (1,153 URLs), correctly enumerates locale variants and the blog article URLs that the `/blog` hub itself fails to surface.
- No SSRF/robots issues found; `Sitemap:` directive correctly declared in robots.txt.

## Top 5 highest-impact fixes

1. **Fix the `/blog` hub aggregator** so it lists the real locale-scoped articles instead of "No articles published yet". This is a one-line-cause, high-impact bug: it's the URL cited in `llms.txt`, and it currently tells every AI crawler that the site has zero editorial content when the opposite is true. *Effort: Low (likely a locale-filter bug in the blog index query).*

2. **Add clinician byline + reviewer schema to service pages**, matching the pattern already built for blog articles (`Article.author = Physician` with `hasCredential`/`memberOf`). Service pages carry the highest-value medical claims (symptoms, treatment scope) and currently have no visible/structured clinical attribution. *Effort: Medium — reuse the existing Physician/Article schema helper from the blog pipeline.*

3. **Rewrite H2s on hub/about pages from marketing statements to question form** — e.g. "Built for people who shouldn't have to wait" → "Why choose an online GP over an in-person wait?", "The doctor you book is the doctor you see" → "Will I see the same doctor every time?". Direct win for AI Overview / ChatGPT snippet matching since these engines pattern-match questions to headings. *Effort: Low, copy-only change.*

4. **Chunk long-form article body paragraphs into ~140–160 word self-contained answer blocks** under each H2 (currently continuous prose). Keep the first sentence of each block as the direct answer. Apply to the article template so it propagates to all `/blog/*` posts. *Effort: Medium — content/template pattern, not code.*

5. **List individual high-value blog articles in `llms.txt`** (not just the broken `/blog` hub) and add an `## Optional` section per the llms.txt convention for legal/lower-priority pages. Also route `anthropic-ai`/`CCBot` (training-only bots) to a training-block rule if the brand wants search-visibility without training-corpus inclusion — currently both are implicitly allowed via the wildcard. *Effort: Low.*

## Platform-specific estimate

(Estimated from technical/structural signals — no live DataForSEO/platform query run in this pass.)

| Platform | Est. readiness | Rationale |
|---|---|---|
| Google AI Overviews | Medium-High | Strong schema + SSR + FAQPage; broken /blog hub and non-question H2s cap it |
| ChatGPT / OAI-SearchBot | Medium | Full crawler access + llms.txt present, but llms.txt omits the strongest content (articles); young-domain trust signal is a headwind |
| Perplexity | Medium | Full crawler access, SSR content favors it; passage chunking not yet optimal for direct lift |
| Bing Copilot | Medium-High | Benefits most from clean schema + sitemap + SSR; less citation-count-dependent than ChatGPT |

Only ~11% of domains get cited by both ChatGPT and Google AI Overviews — given the site's strong technical/schema foundation but thin third-party footprint (no Wikipedia, unverified Reddit/YouTube traction, 2023 founding), the realistic near-term win is Google AIO (schema-driven) before broad ChatGPT/Perplexity citation share.
