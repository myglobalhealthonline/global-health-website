# Czechia technical audit

Date: `2026-08-31`

## Production and inventory

- The live sitemap contains `281` unique Czechia URLs: `48 cs`, `49 en`, and `46` each for `de`, `es`, `pt`, and `ro`.
- Sitemap SHA-256: `EC2E16B5C014293868D25A546C394D188B1A88707EF751D7BC3822381D3B4ECA`.
- Czech inventory includes 15 service routes, 7 tools, 5 doctor profiles, and 4 blog posts.
- `target-page-inventory.csv` reconciles sitemap, GSC, and inspected URLs. Of 281 sitemap URLs, 171 matched a current GSC page row; this is not an indexation count.

## Crawl result and scope limit

The focused audit started at Czechia, capped at 100 pages, and completed 19/20 Lighthouse checks. The crawler followed cross-market links into Ireland after the Czech start page. Reported audit totals—66 long titles, 42 slow responses, and 35 long descriptions—are therefore mostly cross-market observations and must not be presented as Czech defects.

The Czech start page returned 200, was indexable, contained 2,182 words and 61 links, responded in 458 ms, and had a 142-character description. Its title, `Online lékař Česko | Registrovaní lékaři a specialisté`, is long enough to monitor but not a proven defect.

## URL Inspection findings

Core Czech home, GP, 24/7 article, doctor directory, pediatric, canonical travel, neschopenka, treatment-renewal, dermatology, referral, Prague-doctor, mental-health, men’s-health, and major tool URLs passed with declared and Google-selected canonicals aligned.

- Retired travel URL: still indexed as itself; last crawl `2026-07-18`. Production redirect already exists. Status: Google lag, monitor.
- Women’s health: discovered but not indexed. Status: monitor; do not submit speculative fixes without content/lifecycle evidence.
- Blood-pressure owner: `/czechia/cs/tools/blood-pressure-chart`; the guessed `blood-pressure-calculator` path is not a valid target.
- Correct service routes include `/kozni-konzultace-praha`, `/doporuceni-a-vysetreni`, and `/druhy-nazor-praha`.

## Code review

The shared service and blog route systems already provide locale metadata, canonical/hreflang variants, publication gating, breadcrumbs, and structured data. Redirects remain ordered in `frontend/next.config.ts` before the project’s `proxy.ts` middleware convention. No sitemap, robots, canonical, hreflang, redirect, schema, or route architecture rewrite is justified.

### Verified defect: reviewer doctor link locale

`renderBlogPostPage()` built a visible reviewer profile link with a hardcoded `/en/` segment. A Czech article could therefore link users and crawlers to the English doctor profile while its Physician structured-data path used the article locale. This was fixed at the shared path builder and covered by a focused test.

### Content ownership, not technical defect

GSC shows `praktik online` on both the 24/7 explainer and GP page. Resolve with page role, copy, and internal links after the observation hold; do not add redirects or canonicals between distinct intents.

## QA checklist

| Check | Result |
| --- | --- |
| HTTP/indexability/canonical on inspected priority URLs | pass |
| Robots and sitemap inclusion | pass for current public inventory |
| Czech locale/hreflang route model | pass in shared implementation |
| Structured-data/visible reviewer locale alignment | fixed locally; deploy verification required |
| Legacy travel redirect | production behavior present; Google stored state stale |
| Navigation and booking logic | unchanged |
| Analytics privacy | no tracking code or patient-data change |
| Placeholder/unsupported claims | none added |

## Risks outside this batch

The shared worktree contains unrelated recruitment and backend edits. Repository-wide lint currently fails in `frontend/app/(portal)/(admin)/admin/careers/applications/page.tsx` on React purity (`Date.now()` during render). This Czech batch does not modify that file.
