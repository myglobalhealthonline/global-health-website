# Portugal organic-search research and implementation

**Evidence snapshot:** approved clinical metadata production rollout, 2026-09-02.
**Canonical operational source:** [`docs/plans/seo-control-state.md`](../../docs/plans/seo-control-state.md).
**Workspace contract:** [`seo/README.md`](../README.md).

This directory is the auditable Portugal (`pt-PT`) SEO workstream for `myglobalhealth.online`. It separates purchased/raw evidence from normalized analysis, recommendations, dated production observations, and code changes.

## Headline result

- 8,106 raw keyword rows retained.
- 5,483 normalized unique terms before relevance/service gating.
- 1,647 cleaned Portugal-relevant terms in the master after a final `receita`/administrative-intent relevance gate.
- 14 P0, 60 P1, 853 P2 and 720 P3 terms after service, safety, public-system and authority constraints.
- 100 algorithmically discovered SERP competitors; 11 domains received portfolio/domain analysis.
- 474 competitor pages and 91 target pages inventoried.
- 200 live SERP rows retained across ten priority queries.
- 24 URL/cluster briefs, all mapped to existing URLs. New page recommendation: **zero**.
- 75-row live page-by-page completion matrix covering every current `/portugal/pt` sitemap URL, with a separate 28-row approved clinical-draft manifest.
- All 16 live doctor profiles have an explicit fact-register row; four approved metadata-only profiles have verified OM evidence and 12 remain pending for future profile-copy changes.
- Dr Tiago Miguel Figueira approved all 28 rows at `2026-09-01T18:30:00+02:00`. Twenty-six database metadata records and the frontend-owned blood-pressure metadata are live and verified; the driving-certificate row was reviewed and deliberately retained.
- The Portugal homepage CTA had already been corrected to `Marcar consulta` through the guarded one-field production updater; this metadata rollout left the CTA unchanged.
- Portugal FAQ and pricing metadata, H1 and lede fields are live and verified. The empty-catalogue pricing cleanup reached `main`; final public readback is recorded in the implementation log.
- Five unsafe Portugal FAQ crisis contacts and three occurrences in the medical disclaimer were corrected in production to the official `1411` line plus `112` for immediate danger. Four protected doctor biographies still contain the legacy `1024` text and remain held for the doctor-profile approval workflow; no profile or credential fact was changed.
- The metadata-only clinical rollout is complete. Doctor-profile body copy, credentials, certifications, registrations, specialties, languages, prices, booking data, FAQs and tool algorithms or thresholds were not changed.

## Read order

1. [Baseline audit](01-baseline-audit.md)
2. [Competitor landscape](02-competitor-landscape.md)
3. [Keyword master](03-keyword-master.csv)
4. [Content gaps](04-content-gap.csv)
5. [URL/keyword map](05-url-keyword-map.csv)
6. [Architecture](06-proposed-site-architecture.md)
7. [Technical audit](07-technical-audit.md)
8. [Backlink opportunities](08-backlink-opportunities.csv)
9. [Implementation log](09-implementation-log.md)
10. [Measurement plan](10-measurement-plan.md)
11. [30/60/90 roadmap](11-30-60-90-day-roadmap.md)

Supporting evidence: [75-page completion matrix](page-by-page-completion-matrix.csv), [28-row approved draft matrix](content-completion-matrix.csv), [doctor fact register](doctor-profile-fact-register.csv), [domain summary](competitor-domain-summary.csv), [competitor pages](competitor-page-inventory.csv), [target pages](target-page-inventory.csv), [SERP validation](serp-validation.csv), [clinical review register](clinical-review-register.csv), [content briefs](content-briefs/), [OpenSEO call log](raw/openseo-call-log.jsonl), [source log](raw/keyword-source-log.csv), [clinical SEO production receipt](raw/production-write-receipt-2026-09-02-clinical-seo.json), [clinical SEO public readback](raw/clinical-seo-production-readback-2026-09-02.csv), [static-page production readback](raw/static-page-production-readback-2026-09-01.csv), [homepage CTA production receipt](raw/production-write-receipt-2026-09-01-home-cta.json), [FAQ safety production receipt](raw/production-write-receipt-2026-09-01-faq-safety.json), and [raw keyword exports](raw/keywords/).

## Method

OpenSEO/DataForSEO was the primary paid SEO data source, using Portugal location code `2620`, language `pt`, locale `pt-PT` where supported, Google, and EUR. Paid collection stopped with 8,657 credits remaining; aggregate session spend was 2,589 credits.

The corpus combines:

- five related-keyword batches (4,884 rows);
- target/competitor ranked portfolios (1,389 rows);
- current GSC queries (811 rows);
- fully paginated current GSC query/page rows (1,022 rows).

Rows were normalized for case, whitespace and trivial punctuation. Accented and unaccented variants were retained when the source data kept them distinct. The master removes or demotes Brazilian, inactive-specialty, public-system, third-party-provider, shopping, location-doorway and obvious expansion noise. Missing volume/KD/CPC remains blank; blank never means zero.

The master contains 1,598 pt-PT and 49 en-PT rows by a transparent language
heuristic; four English rows explicitly contain Portugal/tourist intent. English
rows without an explicit place name are retained only when observed in the Portugal
provider market or the site's GSC extract.

Opportunity score:

`(business fit × 25 + intent × 20 + attainability × 15 + demand × 15 + competitor gap × 15 + SERP fit × 10) / 5`

Each component is 0–5. Priority additionally applies service reality, current rankings/impressions, clinical risk, government intent and observed SERP authority; volume alone cannot create a P0/P1.

## Evidence boundaries

- **Production/live:** the public site, read-only production inventory and current URL Inspection.
- **Google stored state:** GSC Search Analytics and URL Inspection; recrawl can lag live HTML.
- **Provider estimates:** OpenSEO/DataForSEO volumes, difficulty, positions, traffic and backlink metrics.
- **Inference:** opportunity scores, clusters, gap labels and recommendations. These are explicitly derived, not provider facts.

No ranking promise is made. No patient data, credentials, internal database IDs or secrets are present.
