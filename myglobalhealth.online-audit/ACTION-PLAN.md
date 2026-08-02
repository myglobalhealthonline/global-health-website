# Action Plan — myglobalhealth.online

Ordered by impact ÷ effort. Every item traces to evidence in
[`FULL-AUDIT-REPORT.md`](FULL-AUDIT-REPORT.md) and `findings/`.

Priority definitions: **Critical** = blocks indexing or causes penalties.
**High** = significantly impacts rankings. **Medium** = optimisation
opportunity. **Low** = backlog.

---

## Phase 1 — Critical fixes (Week 1)

**Status as of 2026-08-03 — Phase 1 executed on `Dev-hassaan`, not yet deployed.**

| Item | Status |
|---|---|
| 1.1 Restore Google API access | **Blocked — needs you.** Interactive browser OAuth; cannot be done headless. |
| 1.2 Metadata streaming race | **Done** (code). Both fixes applied. Was mis-diagnosed in v1 — see below. |
| 1.3 Locale leak on non-English pages | **Done + verified** against a live local render. |
| 1.4 €29/€39 price | **Code done, production DB write pending your go-ahead.** |
| 1.5 Global `/blog` hub | **Done** (backend + frontend). Query verified 0 → 10 posts; full render blocked on deploy. |

### 1.1 Restore Google API access · Critical · needs you
**Blocker on measurement.** GSC, GA4 and the Indexing API all return
`invalid_grant`. Until this is fixed there is no way to measure whether any
other fix in this plan worked.

```bash
claude-seo run google_auth.py --auth
```

This opens a browser consent screen, so it has to be run by you. Then re-run the
audit's Google pass to capture a baseline before the Phase 1 changes deploy —
otherwise the before/after is lost.

### 1.2 Stop metadata losing the streaming race on legal + doctor routes · High · needs a decision
**Corrected 2026-08-03.** This item originally read "add `generateMetadata`".
That was wrong — `generateMetadata` already exists and is correct on both
segments. The real defect: on a cold, uncached render under concurrent load the
HTML shell flushes before `generateMetadata` resolves, so `<title>`,
`rel=canonical` and `meta description` stream into `<body>` 80–230 KB past
`</head>`. Google ignores a canonical in `<body>` outright.

Reproduction: all 127 URLs in one burst (5 concurrent, cache-busted) → 38 broken.
Same URLs in small unloaded batches → 1 broken. Warm ISR hits → 0.

- `/{country}/{locale}/legal/[slug]` — 36 URLs, served `no-store` with no
  prerendering, so **every** request is a cold render and permanently exposed.
- `/{country}/{locale}/doctors/[slug]` — 91 URLs on ISR, exposed only on the
  revalidation miss.

**Trigger refined during the fix.** It is cold *cache*, not user-agent: a repeat
burst once the app was warm dropped to 1/127 for a generic crawler UA **and**
1/127 for Googlebot's UA. So Next's `htmlLimitedBots` stream-blocking does not
shield Googlebot here, and the exposure window is a cold boot or a fresh deploy
— which is exactly when Google re-crawls.

**DONE — both fixes applied.**

1. **`/legal*` moved onto the CDN-cacheable header list** in `next.config.ts`.
   It had been excluded there as "unverified / auth-adjacent"; it is now
   verified — all three legal pages and every module in their import trees read
   zero `cookies()`/`headers()`/`searchParams`/`draftMode()`, and the
   `[country]/[lang]` layout above them is already documented static-safe. Those
   36 URLs now get `public, max-age=0, s-maxage=60, stale-while-revalidate=300`
   instead of `no-store`, which also removes the full origin round-trip they were
   paying per request.
2. **Shared `cache()` fetch on both segments.** `getCountryLegal` and
   `getCountryLegalDocument` (`lib/content/get-country-legal.ts`) and
   `resolveDoctorProfilePageData` (`lib/content/doctor-profile-data.ts`) are now
   React-`cache()` wrapped, matching the pattern already used in
   `get-country-collections.ts`. `generateMetadata` and the page component share
   one in-flight request per render instead of racing two — the doctor path was
   previously firing six backend fetches per request where three would do.

Note this does **not** make the segment statically generated. `next build` still
classifies all of `[country]/[lang]` as dynamic — a known platform-level
classification quirk documented in `next.config.ts` and not in scope here.

**Verified so far:** `tsc` clean; `/ireland/en/legal/privacy-policy`,
`/spain/es/legal/terms-of-service`, `/ireland/en/legal`,
`/spain/en/doctors/dr-syed-tahir` and
`/ireland/en/doctors/silvia-alexandre-fernandes` all render `200` with `<title>`,
`rel=canonical` **and** `meta description` inside `<head>`.

**Still to verify after deploy:** re-run the burst test — all 127 URLs, 5–8
concurrent, cache-busted, immediately after a fresh deploy so the cache is cold —
and assert all three tags appear before `</head>` on every one. That is the
condition that reproduced it; a warm origin will pass either way.

### 1.3 Wire the shared CTA/cross-sell component to the active locale · Critical · 1 component
50 of 66 sampled non-English pages (76% of a 912-URL non-English inventory)
render hard-coded English strings — `Languages` (43), `Pick a time` (40),
`Specialist care` (14), `Book a consultation` (6), `Ready when you are` (6).

Reproduce on `/ireland/de/services/acute-medical-consultation`,
`/ireland/cs/health/diabetes`, `/czechia/cs`.

The body copy around these strings is correctly translated, so this is a single
component that never received the locale — not a translation backlog.

**DONE.** It turned out to be three components, not one: `DoctorCard` (the
`Languages` label plus the `ctaLabel`/`bookLabel` English defaults), the
`/{country}/{locale}/health/{slug}` template (six strings), and `LinkCallout`
(its four variant labels). Almost every translation already existed — only
`doctors.languagesLabel`, `healthPage.seeAllLanguageDoctors` and the
`linkCallout` namespace were new, added across all 6 bundles.

**Verified:** `tsc` clean, locale key parity across all 6 bundles, and a local
render against the production API returned **0** leaked strings on
`/ireland/de/health/diabetes`, `/ireland/cs/health/diabetes`,
`/ireland/de/services/acute-medical-consultation`, `/ireland/ro/health/migraine`
and `/czechia/cs`, with the translations rendering in their place — `/czechia/cs`
now serves 8× *Jazyky*, 8× *Vybrat čas*, 9× *Zobrazit profil*, 6× *Rezervovat
konzultaci* where it previously served the English.

### 1.4 Reconcile the €29 / €39 price contradiction · Critical · needs a prod DB write
```
/ireland/en                        meta: "same-day appointments from €29"
/ireland/en/gp-consultation-online meta: "same-day appointments from €39"
```

**Not a bug — both numbers are real.** Live Ireland prices are repeat
prescription €29, GP consultation €39, sick cert €45. The problem is the word
*appointments*: "same-day appointments from €29" reads as a €29 GP slot, so a
searcher who clicks the snippet lands on €39 and sees a price rise. The same
page's own hero badge already says "GP consultations from €39".

**Decision taken:** reword to **"consultations from €29"** — accurate, keeps the
cheaper hook, and matches the visible on-page line *"Consultations at Global
Health cost from €29.00"*. The GP page keeps €39, which now reads as a service
tier rather than a contradiction.

**Code done, apply pending.** The live string lives in a CMS-managed
`PageContentTranslation` row, not in code. `backend/scripts/patch-home-meta-descriptions.ts`
has been updated with the new wording, but **the production DB has not been
touched.** To apply:

```bash
node --env-file=.env --import tsx scripts/patch-home-meta-descriptions.ts
```

That is the dry run. Re-run with `--apply` to write. `backend/.env` points at
**production** — review the dry-run diff before applying.

Still outstanding from this item: audit the other five markets' hub-vs-service
meta for the same divergence, and surface a single-consultation price on
`/ireland/en/pricing` (currently subscription-first).

### 1.5 Fix the global `/blog` hub · Critical · 1 query
`/blog` renders "No articles published yet" while 44 country-scoped article URLs
serve full 2,400–3,800-word content. It is in the main navigation of every page,
in the sitemap, and is the URL `llms.txt` points AI crawlers at.

**DONE.** Root cause was not a bug but a deliberate rule: `getPublicBlogPosts`
filtered the bare route to `{ countries: { none: {} } }` — "global posts only" —
and every published post is assigned to at least one country, so the hub was
structurally guaranteed to be empty. Per your call it is now a real global index:
the no-country case is unfiltered, matching the semantics
`getPublicBlogPostBySlug` already used.

Canonicalization is unchanged — `/blog/{slug}` still redirects a country-specific
post to `/{country}/{lang}/blog/{slug}`, so the hub is an index and never a
second home for the content. The index now links **straight** at each post's
canonical country URL instead of at `/blog/{slug}`, so a nav- and sitemap-linked
hub no longer points at URLs that immediately redirect.

**Verified:** a read-only count against the live DB shows the bare hub going
**0 → 10** published posts while `/ireland/en/blog` stays at 4 (unchanged), and
all four sampled derived hrefs resolve `200`
(`/brazil/pt/blog/diabetes-doenca-silenciosa`,
`/portugal/pt/blog/compreendendo-a-hipercolesterolemia`,
`/romania/ro/blog/diabetul-boala-tacuta`,
`/ireland/en/blog/when-to-see-a-gp-online-vs-in-person`). The rendered hub itself
cannot be confirmed until the backend deploys — a local frontend still reads the
production API, which is running the old query.

---

## Phase 2 — High-impact improvements (Weeks 2–3)

### 2.1 Fix the title template · High · 1 template
232 of 500 titles exceed 60 characters; 99 exceed 70. 32 of 33 country-home
pages are over-length.

- Drop the `| Global Health` / `· Global Health` suffix when the title already
  exceeds ~48 characters. Google appends the site name from `WebSite` schema,
  which is present on all 500 pages.
- Shorten the middle qualifier so the trust signal ("IMC-Registered",
  "Colegiados", "ČLK Registered") survives truncation instead of being the part
  that gets cut.
- Pick one separator — `|` and `·` are currently mixed.
- Convert blog article titles from ALL CAPS to sentence case.

Target ≤60 characters / ~575px.

### 2.2 Move the RSC availability payload client-side · High · 1 component
38.6% of `/ireland/en` (230.5 KB of 596.6 KB) is inlined RSC flight payload;
~91 KB of that is the full GP-availability schedule serialised into the
document. Same pattern at 55.2% on service pages and 41.5% on doctor profiles.

`/ireland/en` is the worst page measured: Lighthouse 49, LCP 4,809 ms, TBT
1,515 ms — against 91/2,988 ms/87 ms on a doctor profile.

Fetch availability client-side after hydration.

### 2.3 Make the entry gate cacheable and linkable · High · config + small content pass
`/` is `private, no-cache, no-store` with no prerendering, 114 words, 6 internal
links, no hreflang, no breadcrumb. Every brand search and external link lands
here and pays a full origin round-trip. CrUX phone TTFB is 2,618 ms (Poor).

- Move `/`, the 7 root-level global pages (`/about`, `/faq`, `/blog`,
  `/contact`, `/terms`, `/privacy`) and the 36 `/legal/*` pages onto the same ISR
  treatment the country pages already use. Keep `no-store` scoped to `(admin)`,
  `(doctor)`, `(auth)`, `/account`, `/api`.
- Add hreflang and a `BreadcrumbList` to `/`.
- Add enough substance to the gate — trust signals, what the service is, links
  to `/about` and the doctor hubs — without breaking the country-selection
  function.

These three routes sharing all of *metadata missing*, *hreflang missing* and
*no-store* strongly suggests one shared layout or route-group config is the
single upstream cause. Check that before fixing them individually.

### 2.4 Build a dedicated sick-certificate page per market · High · new page
The Irish "sick cert online" SERP is owned by single-purpose transactional pages
(doconcall.ie, getsickcert.ie, sicknote.com) — price-forward, with legal-validity
FAQ and DSP caveats. Global Health has no equivalent; sick certs are one bullet
inside `/ireland/en/gp-consultation-online`.

Anxious same-day-cert patient scores **35/100**, the weakest journey on the site
against one of its highest-intent queries.

Ship `/ireland/en/sick-cert-online` as a transactional page: price above the
fold, turnaround time, employer/DSP legal validity, one CTA. Then replicate per
market. Note `/ireland/en/health/sick-cert-online` already exists at 486 words —
promote and expand it rather than starting over.

### 2.5 Map legacy `/post/*` redirects to real articles · High · 1 redirect map
```
/post/diabetes-a-silent-disease  →  /ireland/en/blog  (hub)
                        should be →  /ireland/en/blog/diabetes-a-silent-disease
```
All `/post/*` paths blanket-redirect to the blog hub even when the exact article
exists. Redirecting a specific article to a listing is the textbook soft-404
pattern; Google routinely treats it as a 404 and drops the legacy URL's equity.
These Wix URLs still hold SERP positions.

Also verify `/pt/home → /ireland/pt` — on Wix, `/pt/` was the Portugal market,
which would make `/portugal/pt` the correct target.

### 2.6 Fix `Product`/`Brand` schema on pricing pages · High · 6 pages
Care-plan subscriptions on `/ireland/*/pricing` are typed as `Product` and are
missing required `itemCondition`, so they are not Merchant-eligible even as
typed. Switch to `Service` + `Offer` — the pattern already used correctly in 52
places elsewhere. Corrected JSON-LD is in `findings/schema.md`.

### 2.7 Differentiate the per-country blog-hub descriptions · High · 1 template
55 pages share 12 meta descriptions, e.g. *"Evidence-based guides written and
reviewed by our medical team. No ads, no fluff."* on 7 pages. Insert the country
name. One-line template change; makes six SERP listings distinct.

### 2.8 Fix the wrong title on a Romanian service page · High · 1 string
`/romania/en/services/controlul-greutatii` (slug = "weight control") carries the
title *"Men's Health Online | Romania | Confidential English Doctor"*. Audit
neighbouring Romanian service slugs for the same mis-mapping.

---

## Phase 3 — Content & authority (Month 2)

### 3.1 Deepen or reposition the ~90 `/health/` condition pages · High
290–486 words, 4–5 H2s, competing against HSE/NHS/Mayo on "diabetes",
"migraine", "hypertension". They lack the byline and reviewer depth the blog
articles already have.

Two viable paths — pick one deliberately:
- **Deepen:** take them to 1,200+ words with the same named-clinician byline,
  reviewer and `lastReviewed` treatment the blog uses.
- **Reposition:** reframe them as service-intent pages ("Diabetes care in
  Ireland — book an online GP") rather than condition explainers, and stop
  competing with national health bodies on informational intent.

The current middle ground is the worst outcome for a YMYL site.

### 3.2 Add `AggregateRating` / `Review` schema · High
The single highest-value schema gap: **zero rating or review markup anywhere**,
despite live Doctify review widgets on the site. Star ratings in the SERP are
one of the largest CTR levers available for a medical service. Ensure the markup
reflects genuinely collected reviews.

### 3.3 Extend clinician bylines to service pages · Medium
Named author + reviewer + `lastReviewed` currently exist only on blog articles.
Service pages are where the commercial queries land and where YMYL trust matters
most.

### 3.4 Differentiate cross-country service copy · Medium
The mental-health service across ES/PT/BR uses an identical section template with
near-verbatim sub-headers and bullet lists, country name swapped. Add genuine
per-market substance: local regulator, local pricing, local referral pathways,
local clinician names.

### 3.5 Resolve the duplicate legal-page sets · Medium
`/terms` (687 words) and `/privacy` (547 words) coexist with
`/{country}/{locale}/legal/terms-of-service` (6,414–8,207 words) and
`/legal/privacy-policy` (3,496–4,358 words). Both sets are indexable. This is
both an SEO duplication issue and a compliance ambiguity about which document
governs. Decide which is canonical and either redirect or `noindex` the other.

### 3.6 Improve AI citability · Medium
- List individual blog articles in `llms.txt` and add an `## Optional` section
  (it currently points only at the broken `/blog` hub).
- Rewrite hub and `/about` H2s from marketing copy into question form.
- Chunk long article paragraphs into self-contained ~140–160 word answer blocks.

### 3.7 Add cross-silo internal linking · Medium
Median 53 internal links per page within each country silo, but no cross-silo
links — authority earned by an Irish article cannot reach its Spanish
equivalent. The hreflang clusters already know the mapping; surface a visible
"also available in" link row.

### 3.8 Add a doctor-language filter facet · Medium
The expat persona scores highest (73/100) because doctor profiles already list
languages. A filter facet on `/{country}/{locale}/doctors` turns that latent
strength into landing pages for "Arabic-speaking doctor Ireland"-type queries —
a `/health/arabic-speaking-doctor` page already exists at 279 words, confirming
the intent is real.

---

## Phase 4 — Cleanup, monitoring & iteration (Ongoing)

### Small fixes worth batching
| Fix | Detail |
|---|---|
| `/favicon.ico` returns 404 | Add the file at the well-known path; browsers request it regardless of `<link rel="icon">` |
| Trailing-slash double redirect | `/ireland/` → `/ireland` → `/ireland/en`; collapse to one hop on every country prefix |
| 79 hreflang targets absent from the sitemap | Locale variants of the `/legal` hub — add to the sitemap or drop from the clusters |
| Add `Cross-Origin-Opener-Policy: same-origin` | Only missing security header |
| 5 blog articles emit two `<h1>`s | Page title and article title both rendering as `h1` |
| `BreadcrumbList` generator gap | Non-English / non-Ireland localised service pages lack it while their Irish English equivalents have it |
| `MedicalBusiness` vs `MedicalClinic` type conflict | Collapse to `MedicalOrganization` with a country-scoped `@id` |
| `Article.image` should be `ImageObject` | With explicit width/height |
| `Physician` needs structured `medicalSpecialty` | Currently free text |
| Cookie-consent modal covers 55–60% of mobile viewport | Not a ranking penalty (consent notices are exempt) but it buries the H1 and CTA on first paint |

### Measurement gaps to close
- **Add free API keys** — [Moz](https://moz.com/products/api) (2,500 rows/month)
  and [Bing Webmaster Tools](https://www.bing.com/webmasters). Currently there is
  no DA/PA, anchor-text distribution, toxicity scoring or referring-domain count
  at all.
- **Re-measure third-party script cost with consent accepted.** GTM, Doctify,
  Meta, Clarity and ElevenLabs all measured zero bytes because they are
  consent-gated and never fired in a headless session. This matters: INP is the
  one CWV metric degrading (+33.9% over 25 weeks, +16.9% on desktop).
- **Confirm the phone TTFB figure.** 2,618 ms on phone vs 534 ms blended origin
  is a large divergence; re-run `crux_history.py --form-factor PHONE` once CrUX
  rolls past the current collection period to rule out a small-sample artifact.

### Watch-items
- INP trend (origin +33.9%, desktop +16.9% over 25 weeks — still "Good")
- Phone TTFB trend (+23.3% over 25 weeks)
- Legacy Wix URL rankings as the `/post/*` redirect map takes effect
- The 293 `FAQPage` blocks earn no SERP feature since Google's FAQ retirement —
  no reason to remove, no reason to expand

### Re-audit cadence
Baseline a drift snapshot now, then re-run after Phase 1 and Phase 2 ship:

```bash
claude-seo run drift_baseline.py https://www.myglobalhealth.online
```

The existing weekly SEO monitoring task already covers position tracking once
GSC access is restored.
