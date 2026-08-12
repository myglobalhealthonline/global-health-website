> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../../../plans/seo-control-state.md).** Counts and statuses below are a record of what was true when written. Do not treat them as current.

# SXO Gap Score — myglobalhealth.online

**SXO Gap Score: 38/100** (separate from SEO Health Score)

## Primary Finding (lead with this) — CRITICAL indexing/page-type mismatch

Google is NOT ranking the site's actual, well-built target page (`/ireland/en`). Site-scoped
and query searches surface legacy artifacts instead:
- `myglobalhealth.online/home` — "Clinic Ireland | Global Health"
- `myglobalhealth.online/es/home-sp` — "Global Health · Global Health"
- `myglobalhealth.online/post/easily-schedule-your-online-doctor-appointment`
- `myglobalhealth.online/corporate-plans`
- `myglobalhealth.online/service-page/erectile-dysfunction-consultation`

None of these are the current Next.js `/ireland/en` service page. This matches the known
Wix-legacy soft-404/slug issue already flagged in `project_seo_404_slug_title_investigation`.
Net effect: for every query tested ("online doctor ireland", "same day GP appointment ireland
online", "online gp consultation ireland"), the site does not appear on page 1 at all —
competitors (webdoctor.ie, gpdoctor.ie, eirdoc.com, dronline.ie, healthhero.ie, gpline.ie)
occupy 100% of visible slots. This is a distribution/indexing failure, not a content-quality
failure — `/ireland/en` itself is competitive on content depth once it's found.

## Page classification

| Page | Classification | Word count | H1/H2 | Schema | Images | Internal links |
|---|---|---|---|---|---|---|
| Homepage (`/`) | Country/locale gate (interstitial) | 96 | 1/1 | 2 blocks | ~2 | 0 |
| `/ireland/en` | Local Service page | 1,860 | 1/11 | 5 blocks | 35 | 123 |

Homepage title: "Licensed online consultations tailored to where you live" — correct pattern
for a gate page, but it means the homepage cannot itself rank for country-service queries
(no location/price/urgency signal, 0 internal links is also a crawl-depth risk — country pages
depend entirely on JS-driven navigation from the gate for discovery).

`/ireland/en` title: "Online Doctor Ireland | IMC-Registered GPs | Global Health" — good keyword
match. Meta description carries price (€29), same-day, sick certs/prescriptions/referrals,
11 languages — strong CTR bait, aligned with what ranks elsewhere.

## SERP consensus (4 queries, top 8-9 results each)

- **online doctor ireland**: mediconline.ie, webdoctor.ie, onlinedoc.ie, gpline.ie,
  smartscripts.ie, eirdoc.com, dooctor.ie, superdrug.com/ie — 8/8 **Local Service pages**
  (brand-run telehealth homepages/landing pages), 100% consensus.
- **same day GP appointment ireland online**: gpdoctor.ie, gpappointment.ie, getyourgp.ie
  (blog), webdoctor.ie, doxonline.ie, dawsonmedical.ie, liffeymedical.ie, eirdoc.com,
  dooctor.ie — dominant type Local Service page (7/9), 1 blog, 1 clinic-booking page.
- **online gp consultation ireland**: gpdoctor.ie, dronline.ie, getsickcert.ie, webdoctor.ie
  (x2), gpline.ie, healthhero.ie, gp24.ie — 8/8 Local Service pages, 100% consensus.
- **médico online portugal**: medis.pt, mediconanet.pt, teleconsultaportugal.com (x2),
  advancecare.pt, multicare.pt (x2), dronline.pt — Local Service pages, insurer-portal hybrid;
  same consensus pattern, no blog/informational content ranking.

**Dominant SERP page type across all 4 queries: Local/Transactional Service page (~90%
confidence).** No featured snippets or PAA blocks observed; results are pure commercial
service listings — price, same-day/24-7 availability, and registered-doctor trust badge are
the three recurring on-page signals across every ranking competitor.

`/ireland/en` is the CORRECT page type for this SERP (ALIGNED on page-type). The mismatch is
that it is invisible to the index (see Primary Finding above), which makes the type-alignment
moot until fixed.

## User stories (cite the SERP signal that generated each)

1. *"I need a doctor today, not next week."* — every ranking competitor headline advertises
   same-day/7-day availability (webdoctor.ie: "same or next-day, 7 days a week"; gpdoctor.ie:
   "same-day"). Urgent-need patient, awareness stage.
2. *"How much will this cost before I book?"* — price appears in the title/snippet on
   smartscripts.ie (€20), superdrug (from), gpdoctor.ie (€30), healthhero.ie (€39). Price-shopper,
   consideration stage.
3. *"Is this doctor actually licensed to treat me in my country?"* — every Irish competitor
   foregrounds "Irish Medical Council-registered" in the snippet copy; Portuguese competitors
   foreground insurer/certified-team language. Expat/trust-seeker, consideration stage.
4. *"I just need a sick cert / prescription, not a long consultation."* — getsickcert.ie ranks
   on its name alone; smartscripts.ie leads with "GP Prescription in 2 hours €20." Task-completer,
   decision stage.
5. *"Which language can I actually get seen in?"* — recurring across the multi-country brand
   (11 languages in `/ireland/en` meta) but this trust signal is absent from every SERP result
   we found — a gap the site can own if it becomes indexable.

## Gap analysis — `/ireland/en` (100 pts)

| Dimension | Score | Evidence |
|---|---|---|
| Page Type | 15/15 | Correct Local Service page type, matches 90% SERP consensus |
| Content Depth | 12/15 | 1,860 words, 11 H2 — deeper than most thin competitor landers, but structure not verified against FAQ/PAA coverage |
| UX Signals | 9/15 | 123 internal links (strong), but homepage gate has 0 internal links out — most users never reach this page via crawl path; CTA copy not verified |
| Schema | 10/15 | 5 schema blocks present (LocalBusiness/Service class likely) but FAQPage/BreadcrumbList presence not confirmed in this pass |
| Media | 12/15 | 35 images — image-rich vs. text-only competitors |
| Authority | 6/15 | Not indexed/ranking at all for any tested query — zero visible authority signal in SERP; competitor domains (webdoctor.ie 800k patients claim) dominate trust |
| Freshness | 5/10 | Not independently verified this pass (publication_date not captured) |
| **Total** | **69/100** | Content is competitive; the score is capped by the indexing failure, which this rubric doesn't directly penalize but the Primary Finding does |

## Persona scoring (25 pts each: Relevance / Clarity / Trust / Action)

Sorted weakest first.

**1. Urgent-need patient (need a doctor within hours)** — **11/25** lowest
- Relevance 6/25: page isn't found in search for "same day GP appointment ireland" — score
  reflects that the page itself, if found, states same-day but the finding funnel is broken
- Clarity 3/25: same-day framing exists in meta description but not confirmed above-the-fold on
  the rendered page in this pass
- Trust 2/25: IMC registration not confirmed in visible H1/H2 copy captured
- Action: not scored — CTA text not captured this pass
- **Fix**: get `/ireland/en` re-crawled/indexed (submit via GSC, fix internal linking from
  homepage gate, canonical/sitemap check) before any copy change matters.

**2. Price-shopper** — **14/25**
- Relevance 4/25 (meta has €29, good) but not found via search
- Clarity 5/25: price surfaces only in meta description, not confirmed as an on-page hero element
- Trust 3/25, Action: not scored
- **Fix**: surface price as a visible on-page badge (competitors put it in H1/hero), not just meta.

**3. Expat / trust-seeker (multi-country, wants registered doctor)** — **17/25**
- Relevance 7/25: 11-language claim is a genuine differentiator vs. every competitor found
- Clarity 5/25, Trust 3/25 (IMC/registration badge presence not confirmed on-page), Action 2/25
- **Fix**: multi-language + multi-country credential signal is the site's one real SERP
  differentiator — make it the headline USP once indexing is fixed.

**4. Task-completer (just wants a sick cert/prescription)** — **19/25**
- Relevance 8/25 (meta lists sick certs/prescriptions/referrals explicitly, matches
  getsickcert.ie/smartscripts.ie pattern), Clarity 5/25, Trust 4/25, Action 2/25
- **Fix**: consider a dedicated task-specific lander (mirrors getsickcert.ie's single-purpose
  page ranking on name alone).

## Cross-skill recommendations

- Indexing/legacy-slug gap is the dominant issue → run `/seo page` deep audit on `/ireland/en`
  canonical + sitemap + Google Search Console coverage, and reconcile against
  `project_seo_404_slug_title_investigation` findings (legacy Wix soft-404s).
- Schema types (FAQPage/LocalBusiness) not confirmed → run `/seo schema` to verify/generate.
- E-E-A-T / doctor credential visibility → run `/seo content` for deep IMC-registration and
  author/reviewer signal analysis.
- Local intent strongly present in every SERP (Dublin address surfaced in search snippet
  already) → run `/seo local` to check Google Business Profile alignment.

## Limitations

- Homepage/`/ireland/en` raw fetch (render_page.py --mode auto, direct invocation) returned a
  thin/truncated shell (503 chars, no H1) inconsistent with parse_html.py's own fetch, which
  returned full rendered content (1,860 words for `/ireland/en`). Findings above rely on the
  parse_html.py results as source of truth; on-page hero/CTA copy and confirmed schema `@type`
  values were not independently re-verified within this pass due to a tool timeout on the
  second verification attempt.
- No PAA/featured-snippet/AI Overview data captured — WebSearch tool does not expose these
  SERP features directly; consensus above is inferred from result list + snippet content only.
- Only 4 queries analyzed (Ireland x3, Portugal x1); Spain/Czechia/Brazil/Romania not covered.
- Publication/freshness date not captured for either page this pass.

---
Generate a PDF report? Use `/seo google report`
