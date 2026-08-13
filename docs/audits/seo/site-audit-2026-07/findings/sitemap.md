> **Historical audit — current status is tracked in [`docs/plans/seo-control-state.md`](../../../../plans/seo-control-state.md).** Counts and statuses below are a record of what was true when written. Do not treat them as current.

# Sitemap Audit — myglobalhealth.online
Date: 2026-07-24

## Overview
- `robots.txt`: valid, references single `Sitemap: https://www.myglobalhealth.online/sitemap.xml`. No sitemap index — one flat file.
- Sitemap file: 1,422 URLs, 1.46 MB. Well under the 50,000 URL / 50 MB cap. No `news:` namespace present.
- XML is well-formed (`urlset` + `xhtml:link` namespaces), parses cleanly, 0 duplicate `<loc>` entries.
- Coverage by country: ireland 384, portugal 324, spain 276, czechia 180, romania 174, brazil 78, plus 6 global pages (about/contact/faq/blog/privacy/terms).
- Doctor profile URLs: 381. Service URLs: 672. Blog: 34 index pages + 51 post URLs.

## Validation Checks

| Check | Result | Severity |
|---|---|---|
| XML well-formed | Pass | — |
| ≤50k URLs / ≤50MB | Pass (1,422 / 1.46MB) | — |
| Sampled URL status codes (64 URLs across all 6 countries × services/doctors/blog/pricing/legal/global) | 64/64 = 200 OK | — |
| Duplicate `<loc>` | 0 found | — |
| hreflang reciprocity (spot-checked ireland/spain/brazil) | Correct — alternates match each country's actual locale set (6 for IE/ES/PT/CZ/RO, 3 for BR pt/en/es), `x-default` set to primary locale | — |
| **Noindexed URLs included in sitemap** | **13 of 19 sampled doctor-profile URLs (≈68%) return `<meta name="robots" content="noindex, nofollow">` while still listed in sitemap.xml.** Extrapolated over 381 doctor-profile URLs in the sitemap, roughly 250+ are likely noindexed. Root cause matches known issue in memory (`locale_resolution_sweep` / market-row translation gaps): non-primary-locale doctor pages without a translated market row get noindexed but are not excluded from sitemap generation. | **High** |
| `priority` / `changefreq` tags | Present on all 1,422 URLs | Info — ignored by Google, safe to drop, not blocking |
| `lastmod` | Only 117/1,422 URLs (8%) carry `<lastmod>`; the rest have none. Of the 117, values cluster into ~19 distinct timestamps from batch operations (2026-06-06, 2026-07-05 x3), i.e. not true per-page edit dates. | Low — missing lastmod isn't penalized, but the ones present look like migration/seed timestamps rather than real content-change signals |
| Missing key pages | `/about`, `/contact`, `/faq`, `/privacy`, `/terms` present (global, no locale). **No `/legal/*` routes exist on the live site (all 404)** — despite a legal-docs content ingestion effort recorded in project memory (complaints procedure, cookie policy etc.), those documents are not published as crawlable pages, so they can't appear in the sitemap regardless. | Medium |
| Canonical tags | Self-referencing canonical present and correct on all 64 sampled URLs (no cross-locale or www/non-www canonical drift). | — |
| Location-page doorway-content gate | Not applicable — no city/location-swap pages found; country pages are legitimate distinct markets (per-country pricing/doctors/regulatory copy), not template-swapped doorway pages. | — |
| Blog thinness | 51 blog-post URLs but they're the same ~8-9 unique articles republished per locale (e.g. `diabetes-a-silent-disease` appears 6x under ireland/*), consistent with translated-not-duplicated content — acceptable if translations are genuinely localized (not verified per-locale text diff here). | Info |

## Findings Summary

1. **[High] Noindexed doctor profile pages included in sitemap.** ~68% of sampled locale-variant doctor pages are noindexed but still listed. This wastes crawl budget and sends a mixed signal to Google. Fix: filter sitemap generation to exclude any doctor page whose resolved `robots` meta is `noindex` (join on the same locale-resolution logic that sets the meta tag) — likely the same fix surface noted in `project_locale_resolution_sweep_july2026.md`.
2. **[Medium] Legal/compliance pages not published.** `/legal/*` returns 404 site-wide; ingested legal content (privacy policy variants, complaints procedure) has no live route, so it's absent from the sitemap by definition, not by sitemap-config error. Needs a route + sitemap entry once pages ship.
3. **[Low] `lastmod` mostly absent / unreliable where present.** 92% of URLs have no lastmod; the 8% that do cluster around known migration timestamps rather than real content-edit dates. Low priority — doesn't block indexing, but if added, source it from actual `updatedAt` per page/translation row.
4. **[Info] `priority`/`changefreq` present on every URL.** Both are ignored by Google; safe to drop from the sitemap generator to shrink file size, purely cosmetic cleanup.

## Not Found / Not Applicable
- No sitemap index or multiple sitemap files — single flat file, no split needed at current scale.
- No evidence of redirected URLs in the sample (all 200s); no evidence of URLs exceeding sitemap limits.
- No location/doorway-page pattern to gate.
