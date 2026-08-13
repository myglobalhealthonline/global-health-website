> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../../../plans/seo-control-state.md).** Counts and statuses below are a record of what was true when written. Do not treat them as current.

# Content Quality / E-E-A-T Audit — myglobalhealth.online

Fetched via render_page.py (Playwright, rendered mode): homepage, /about, /ireland/en,
/ireland/en/gp-consultation-online, /ireland/en/doctors/dr-grainne-ahern, /ireland/en/blog,
/ireland/en/blog/diabetes-a-silent-disease, /spain/es, /portugal/pt.

## Score: 74/100

Strong clinical E-E-A-T on doctor and blog-article pages (named, licensed, credentialed
authors + reviewer bylines + Physician/Article schema) drags against a critically thin,
generic homepage and a near-empty blog (2 posts).

## What works

- **Doctor profile pages** (`/ireland/en/doctors/*`): full name, IMC registration number,
  medical school, postgraduate credentials (e.g. Dr Gráinne Ahern — MB BCh BAO UCD,
  LLB TCD, MICGP), current practice location, specialisation — genuine first-hand
  expertise signals. `Physician` + `EducationalOccupationalCredential` schema present.
- **Blog article** (`diabetes-a-silent-disease`): 4,023 words, named clinical author
  (Dr Tiago Miguel Figueira, IMC 523449, Clinical Director) with byline photo initials,
  publish date + "Last reviewed" date, citations to HSE / Diabetes Ireland / peer-reviewed
  literature, TOC/section structure, FAQ schema. This is textbook Sept-2025-QRG YMYL
  content — best asset on the site.
- Consistent `MedicalOrganization`, `FAQPage`, `BreadcrumbList`, `ContactPoint`,
  `PostalAddress` JSON-LD across all sampled pages — good AI-citation / structured-data
  hygiene.
- Country home (/ireland/en) and localized markets (Spain, Portugal) are genuinely
  translated/localized (94 vs 93 distinct sentences, different language) — not templated
  duplicate content, this is legitimate multi-market localization.
- Trust signals present on country pages: IMC registration verify links, GDPR/DPC
  supervision, HSE-HIQA alignment claims, Doctify reviews, emergency-call-112 disclaimer.
- Contact info (`info@myglobalhealth.online`, phone, company/legal entity) present on
  /about and footer across pages — supports Trustworthiness.

## Findings by severity

### Critical
1. **Homepage is a near-empty country gate — 162 words.** Far below the 500-word
   homepage floor and below topical-coverage expectations for a YMYL brand entry point.
   No E-E-A-T signals at all on this page (no author, no credentials, no citations, no
   trust badges beyond a footer line). First-touch page for most users/crawlers carries
   almost no substantive content — high risk under Helpful Content evaluation now folded
   into core ranking.
2. **Blog has only 2 published articles** across all markets sampled
   (`/ireland/en/blog`). For a YMYL telehealth brand, this is a critical topical-coverage
   gap — insufficient to establish topical authority or satisfy "expertise" at a site
   level, even though the 2 existing articles are individually excellent.

### High
3. **No visible author/reviewer byline on service pages** (`/ireland/en/gp-consultation-online`)
   or on /about — the "Reviewed by licensed doctors" string is generic marketing copy
   repeated verbatim site-wide, not a specific named reviewer + date. Compare to the blog
   article's specific "Dr Tiago Miguel Figueira, IMC 523449 · Last reviewed July 21, 2026"
   — that pattern should be replicated on service pages, which are also YMYL medical advice.
4. **Zero external citations to independent authoritative sources** (PubMed, WHO, NHS,
   government health bodies) found on service and doctor pages — only the blog post cites
   HSE/Diabetes Ireland. Service pages making clinical claims should link out to
   authoritative sources to strengthen Authoritativeness/Trustworthiness for YMYL content.
5. **Encoding artifacts** ("—" rendering as "�") found repeatedly across homepage, blog,
   and doctor pages in the rendered HTML — indicates a character-encoding bug (likely
   missing `charset=utf-8` on an em-dash source or a mojibake in CMS content) that
   degrades perceived quality/trust and readability for both users and crawlers.

### Medium
6. Homepage lacks any FAQ/how-it-works content that would give AI answer engines a
   quotable summary of what the service does beyond a 4-bullet list — no structured
   Q&A comparable to what /about and country pages carry.
7. Blog listing page text ("Health guides articles.") reads as an unedited/placeholder
   H1 — low specificity, doesn't match the quality bar of the article itself.
8. Doctor page bios are strong on credentials but do not surface first-hand "experience"
   markers like patient volume, years in specific practice, or original case commentary —
   currently expertise-heavy but experience-signal-light.

### Low
9. Multiple `Country` and `PostalAddress` schema blocks repeated near-identically per
   page bloats JSON-LD without adding new AI-citation value — not harmful, just
   redundant weight.

## AI citation readiness: 7/10
Blog article and doctor pages have clear H-hierarchy, TOC, FAQ schema, and named
attributable facts (IMC numbers, stats with sourcing) — genuinely quotable by AI answer
engines. Homepage and service pages currently offer little that's citable beyond
boilerplate marketing lines.

## YMYL compliance note
Emergency disclaimer ("call 112, not suitable for emergencies") is present and correctly
placed on country pages — good. Extend the same specific-reviewer-byline + external-citation
pattern used on the blog article to every service page, since service pages carry direct
clinical claims (indications, what a GP consult covers) and are equally YMYL.
