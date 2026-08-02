# Content Quality — myglobalhealth.online

Scope: 500-page crawl sample + live-fetched samples (blog, /health/ condition pages,
service pages across 4 locales x 3 countries, /about, a doctor profile). YMYL
telemedicine site, September 2025 QRG lens.

## Content quality score: 63/100

Strong medical E-E-A-T structured data and long-form blog/service copy dragged down by
a large, systematic thin-content tier (/health/*, blog indexes, root gate) and
widespread untranslated UI microcopy leaking English into non-English locale URLs.

## 1. Medical E-E-A-T

**Blog articles — strong.** Sampled `/ireland/en/blog/diabetes-a-silent-disease`
(3,846–4,085 words by our count) and `/ireland/en/blog/sick-certificate-ireland-employee-rights`
(2,385–2,514 words). Both carry:
- Visible on-page byline: `Written by Dr Tiago Miguel Figueira (IMC 523449` and a
  `Reviewed by` / `Last reviewed` block — this is real page text, not just schema.
- `Article` JSON-LD with `author` and `reviewedBy` both set to a `Physician` object
  (`name`, `jobTitle`, `identifier.IMC`, `hasCredential` → Irish Medical Council,
  `worksFor` → MedicalOrganization), plus `datePublished`/`dateModified`/`lastReviewed`.
- Deep H2 hierarchy (8–13 H2s) including "Key Irish Institutions and Resources" /
  "Frequently Asked Questions" and 18–31 external links (govt/HSE-style sourcing implied
  by link count; not individually verified this run).

This is a legitimate, well-built E-E-A-T pattern — named credentialed physician,
registration number, review date, all rendered server-side and in schema. Scored per
this skill's model: Experience 14/20 (no first-hand patient-experience signal, but
physician-authored), Expertise 24/25, Authoritativeness 20/25 (IMC credential shown,
no external citations/backlinks verified), Trustworthiness 27/30 (contact info,
regulator link, HTTPS, clear disclaimers present sitewide per crawl schema). Blog
subtotal ≈ 85/100.

**Doctor profile — strong.** `/spain/en/doctors/dr-syed-tahir` is 1,239–1,297 words,
`Physician` schema present, IMC/registration data pattern consistent with the blog
author block.

**/about — adequate.** 1,082–1,133 words. Not deep-audited this run beyond word count
and schema-type presence (`MedicalOrganization`, `ContactPoint`, `PostalAddress`
present sitewide per crawl).

**/health/* condition pages — the E-E-A-T weak point.** These are the pages that
actually compete against HSE/NHS/Mayo Clinic for informational medical queries, and
they do not carry the same authorship depth as the blog:
- `/ireland/en/health/diabetes` — 298 words, H1 unique, only a handful of H2s
  ("Fortlaufende Diabetesversorgung" pattern — see DE sample below), body copy is
  short generic paragraphs ("Diabetes is a condition you live with every day, and
  good management depends on consistent, engaged care...") followed immediately by a
  booking CTA. No visible byline/reviewer block was found in the stripped text for
  this page type (contrast with the blog's explicit "Written by Dr Tiago...IMC
  523449" line) — schema-level attribution was not separately re-verified for this
  page type this run, but the on-page trust signal blog readers get is absent here.
- `/ireland/en/health/migraine` 290w, `/ireland/en/health/hypertension` 323w,
  `/portugal/en/health/diabetes` 338w, `/portugal/en/health/enxaqueca` 355w,
  `/portugal/en/health/hipertensao` 354w — same pattern across all 6 countries, ~90
  pages total (per crawl.json filter).
- These pages read as commercial "condition → book a consultation" landing pages,
  not as the comprehensive, citable medical explainers a 300-word page cannot be for
  a YMYL query. On a strict E-E-A-T basis for content actually intended to rank on
  medical informational intent, this tier is the site's biggest exposure.

**Recommendation:** either (a) fold /health/* condition pages into the blog article
depth+byline pattern (the site already has the physician-schema plumbing — reuse it),
or (b) keep them thin as pure commercial landing pages and rely on canonical/noindex
+ internal linking to the matching in-depth blog article instead of asking a 300-word
page to rank on its own for a competitive medical query.

## 2. Cross-locale translation quality / duplicate content

**Paragraph-level translation is genuinely good** where it exists. German sample of
`/ireland/de/services/acute-medical-consultation`:
> "Sprechen Sie mit einem in Irland registrierten Arzt, ganz gleich wo Sie sich
> befinden – am selben Tag, per sicherem Videoanruf..."

This is fluent, professionally-translated German, not machine-translation artifacts —
same for the Czech (`svc-ie-cs`) and Romanian (`svc-ie-ro`) samples of the same page.

**But componentized UI/CTA microcopy is NOT translated, and leaks English on every
non-English locale URL sampled.** Confirmed identically on `/ireland/de/`,
`/ireland/cs/`, and `/ireland/ro/` versions of
`services/acute-medical-consultation`:
- A whole cross-sell module renders in English mid-page: "Specialist care / New
  neurological symptoms? / Experiencing new onset neurological symptoms — sudden
  weakness, numbness, coordination difficulties, vision changes, or unexplained
  headache — that may require specialist neurological assessment? Our Neurology
  Specialist Consultation provides specialist-level evaluation." — appears verbatim,
  in English, under all three non-English URLs.
- Doctor-card labels stay English under the German/Czech/Romanian locales: "Languages"
  (not "Sprachen"/"Jazyky"/"Limbi") and "Pick a time" (not translated), repeated 3x
  per page (one per doctor card).
- Same pattern reproduced on `/ireland/de/health/diabetes`: full paragraphs are
  correctly translated German, but the booking CTA block renders "Book a
  consultation" / "Ready when you are" in English mid-page, sitting directly under
  German paragraph copy.

**Scope:** this is a component-level i18n gap (the "related/cross-sell" card,
doctor-card language/booking labels, and the sticky-CTA microcopy component are not
wired to the locale dictionary), not a one-off content bug. It reproduces identically
across at least 3 of the 5 non-English locales tested (de, cs, ro) and across both
page types tested (service page, health page) — treat as sitewide until the
component(s) are found and fixed once, not per-page.

**SEO/duplicate-content angle:** because the untranslated blocks are the same English
string reused across locales, they don't create classic duplicate-content risk
between locale URLs (the surrounding body copy still differs per language), but they
do materially hurt on-page language consistency signals and user trust/quality
perception on a YMYL site — a German user mid-medical-service-page hitting three
unexplained English CTAs reads as unfinished/untrustworthy, which is a Trustworthiness
(30% weight) hit specifically.

## 3. Thin content

Two distinct thin-content populations, not one:

- **/health/* condition pages (~90 URLs):** 290–486 words each, e.g.
  `/ireland/en/health/diabetes` 298w, `/ireland/en/health/migraine` 290w,
  `/ireland/en/health/hypertension` 323w, `/ireland/en/health/sick-cert-online` 486w.
  This is the real thin-content risk — see §1, these are YMYL condition pages
  expected to compete against HSE/NHS/Mayo Clinic-grade content at 1/5th the depth.
- **Blog index/hub pages, not blog articles:** the blog ARTICLES themselves are
  substantial (2,385 / 2,514 / 3,846 / 4,085 words in our samples — well above the
  1,500-word blog minimum). The thin pages are the per-country blog LIST pages:
  `/blog` (global hub) 232w, `/spain/en/blog` 291w, `/brazil/en/blog` 271w,
  `/ireland/en/blog` 430w, `/czechia/en/blog` 320w, `/romania/en/blog` 290w,
  `/portugal/en/blog` 424w. These are index/doorway-style pages by design (they list
  article teasers), so raw word count is less diagnostic than for the condition
  pages — but see §6 below, the global hub is actively broken, not just thin.
- **Root `/`** is a 114-word country-selection gate page — functionally a doorway
  page rather than a homepage. Appropriate for its purpose (routing to
  `/{country}/{locale}`) but means the domain root itself carries near-zero
  indexable content/E-E-A-T signal if it gets indexed and ranked directly.

**Content-discovery bug, not just thin content:** the global `/blog` hub (232 words)
renders **"No articles published yet"** — confirmed in the crawl sample — while 44
country-scoped blog article URLs (`/{country}/en/blog/{slug}`) serve full, deep
articles. The global hub is not pulling from the same article pool the country blogs
use. Practical effect: a visitor or crawler landing on the canonical-looking `/blog`
gets told the site has no content, one click after which 44 substantial articles
exist and are indexable — this is a discoverability/internal-linking failure on top
of being a thin page, and plausibly suppresses article discovery for anyone not
already on a specific country subsite.

**Separate technical note (not a content-depth issue, but compounds it):** 39/500
crawled pages — all `/legal/*` and all `/doctors/{slug}` — ship with no `<title>`, no
meta description, no canonical, no OG tags. For the doctor-profile URLs this means
otherwise-solid E-E-A-T content (Physician schema, credentials, 1,200+ words per
§1) has none of the metadata a search result or an AI citation snippet would use to
represent it. Flagging here because it directly limits how the good doctor-profile
and legal content actually surfaces, but the fix belongs to the technical-SEO
finding, not a content rewrite.

## 4. Cross-country near-duplicate service pages

Sampled the mental-health service across three countries at matching depth:
`/spain/en/services/salud-mental-online` (1,782w stripped-text), 
`/portugal/en/services/saude-mental` (2,192w), 
`/brazil/en/services/saude-mental-online` (1,977w).

Structural template is identical — same section order and same near-verbatim
sub-heading: "About this service" → "What This Service Is — And What It Is Not" →
qualifying-condition bullet list → "This service is not appropriate for" → booking
CTA. Spain sample body text:
> "This GP-level mental health assessment is appropriate for: Initial assessment of
> anxiety, low mood, depression, and stress... Guidance on mental health services
> available in Spain in English..."

The "available in {country} in English" swap and country-specific regulator/pricing
blocks are the only country-specific substitution points visible in the sampled
section; the surrounding clinical-scope bullet list reads as the same template
populated per country (word counts differ by 200-400 words, consistent with country-
specific sections like local emergency numbers/regulator names, not with materially
different body copy). This is the templated-programmatic-content pattern —
**defer detailed duplicate-content scoring to the `seo-programmatic` sub-skill**,
which is built for exactly this cross-page-template assessment; this run only
confirms the pattern exists and quantifies 3 sample pairs, it does not run full
similarity scoring across the ~144 service pages in the crawl.

## 5. Readability (English samples)

Not run through a formal Flesch/Flesch-Kincaid calculator this run (no stdlib
readability tool available in this environment; skipped rather than hand-approximate
a scored metric for a YMYL report — flag for a follow-up pass with an actual
readability library if a numeric score is required). Qualitative read of the 4
sampled English pages:
- Blog articles (`diabetes-a-silent-disease`, `sick-certificate-ireland-employee-rights`):
  short paragraphs (2-4 sentences), frequent H2/H3 breaks, bullet lists for
  symptoms/entitlements, plain-English phrasing with medical terms explained inline
  ("Type 2 diabetes, which accounts for approximately 88% of all cases..."). Reads as
  general-public-accessible, consistent with a well-edited health-content site.
- Service page (`acute-medical-consultation`): short declarative sentences, heavy use
  of bullet lists for symptom categories, consistent with scannable commercial-medical
  copy.
- /health/diabetes (thin page): also short/plain sentences, but too little content to
  meaningfully score depth vs. readability — see §1/§3.

## 6. AI citation readiness

Good raw material, inconsistent packaging:
- Blog articles carry `Article` JSON-LD with explicit `author`/`reviewedBy` Physician
  objects and `lastReviewed` — exactly the structured provenance an AI answer engine
  wants to cite confidently.
- H2 hierarchy on the diabetes article includes direct, self-contained-answer-style
  headers ("Types of Diabetes", "Signs and Symptoms", "Current Treatments for
  Diabetes in Ireland") and the sick-cert article closes with an explicit
  "Frequently Asked Questions" H2 — both strong AI-citation patterns (question-shaped
  headers, self-contained sourced answers).
- Definitional openers are present on the sampled pages (article intro states the
  claim with a number: "Over 308,000 people in Ireland live with diabetes...").
- Weak point: the /health/* condition-page tier (§1/§3) is too short to contain a
  self-contained, quotable answer block for most sub-questions an AI engine would
  want — a 290-300 word page covering an entire condition can't supply the same
  citable granularity as the corresponding blog article does. Since both exist for
  the same condition (e.g. diabetes has both a thin /health/ page and a deep /blog
  article), the risk is the wrong one gets crawled/cited as "the" page for that
  topic. Recommend explicit internal linking + canonical guidance from the thin
  /health/ page to the deep blog article, or merge them, rather than leaving two
  competing depths live for the same query.
- Global `/blog` hub showing "No articles published yet" (§3) is actively harmful to
  AI-citation readiness for the whole article corpus — a crawler/answer-engine
  following the obvious hub URL finds nothing, when 44 solid articles exist one level
  down.

## Not assessed this run
- Formal Flesch-Kincaid/readability scoring (no tool available; see §5).
- External link/citation-source quality on the blog articles (link *count* confirmed,
  destinations not individually checked).
- Full similarity/duplicate scoring across the ~144 service pages — only 3 sample
  pairs compared (§4); defer bulk pass to `seo-programmatic`.
- /about page E-E-A-T detail beyond word count and sitewide schema-type presence.
- Non-English readability (only English samples read qualitatively).
- Locale comparison was only done for `services/acute-medical-consultation` and
  `health/diabetes` on the Ireland country site (de/cs/ro locales) — not repeated for
  other countries or the pt/es locales specifically, though the untranslated-CTA
  pattern is a shared component so is expected to reproduce identically.
