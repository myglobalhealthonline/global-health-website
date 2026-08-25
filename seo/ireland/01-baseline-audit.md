# Ireland baseline audit

**Collected:** 2026-08-25
**Scope:** Republic of Ireland public organic surface
**Canonical host:** `https://www.myglobalhealth.online`

## Platform discovered

| Area | Observed implementation |
| --- | --- |
| Frontend | Next.js 16.2.11 App Router, React 19.2.8, hybrid static/server rendering |
| Backend | Fastify 5.12, Prisma 7.9, PostgreSQL |
| Package manager | pnpm 10.33.2 |
| Routing | `frontend/app/[country]/[lang]`; framework convention is `frontend/proxy.ts` |
| Content | Backend-managed services, doctors, tests and page content plus repository fallbacks |
| Metadata | `frontend/lib/seo/page-seo.ts` |
| Canonical host | `frontend/lib/seo/site-url.ts` fixes `https://www.myglobalhealth.online` |
| Sitemap | Dynamic `frontend/app/sitemap.ts`, filtered by publication/indexability |
| Robots | `frontend/app/robots.ts`; private/admin/API paths blocked with narrow public API exceptions |
| Structured data | `frontend/lib/seo/structured-data.ts` and page-level JSON-LD |
| Analytics | Consent-gated GA4, Meta Pixel and Clarity; page locations are sanitised |
| Locales | Ireland supports en, pt, es, cs, ro and de; fallback pages may serve 200 while intentionally excluded from hreflang/sitemap |
| Conversion | Public booking routes under market locale; authenticated portal excluded from organic surfaces |
| Images | Next image pipeline plus generated OG route |

## Crawl and indexation baseline

OpenSEO's most recent site audit started at `https://www.myglobalhealth.online/`, completed 2026-08-25 and reached its 100-page budget.

- Critical issues: 0.
- Warnings: 1 thin-content item on the global selector root, reported at 92 words.
- Informational flags: 93 meta descriptions over the tool's length heuristic and 68 titles over its heuristic.
- The 17 English Ireland service pages returned by the audit were all 200, indexable and in the sitemap.
- Sampled service word counts ranged from 1,129 to 2,275 words, with 46–54 outgoing internal links reported.
- Length alone is not a defect. No blanket title or description rewrite is recommended.
- The root selector is intentionally a global routing surface; expansion is not justified solely to satisfy a word-count heuristic.

The current 27-page priority URL inventory is in `target-page-inventory.csv`. It records live status, indexability, canonical, title, meta description, H1, substantive word count, schema, links in/out within the bounded inventory, sitemap membership, conversion action, topic and issue. `05-url-keyword-map.csv` is the planning map, not the crawl inventory.

## First-party performance

### Ireland GSC, equal 90-day final-data periods

| Metric | 2026-05-25–2026-08-22 | 2026-02-24–2026-05-24 | Change |
| --- | ---: | ---: | ---: |
| Query-page rows | 1,851 | 338 | +1,513 |
| Clicks | 119 | 72 | +65.3% |
| Impressions | 7,283 | 1,176 | +519.3% |
| Working non-brand clicks | 29 | Unavailable | — |
| Working non-brand impressions | 6,453 | Unavailable | — |

The country filter was GSC country `irl`. Dates use GSC's Pacific-time reporting and end three days before collection. The large impression increase follows the site's index expansion and should be interpreted as discovery, not proof of conversion growth.

### GSC / GA4 reconciliation

OpenSEO GA4 organic overview returned 24 sessions, 22 users, 16 engaged sessions and zero key events for the current window, with no previous-period comparison. OpenSEO's joined opportunity report also left many high-impression Ireland pages as `gsc_only`. This is a measurement-health issue: verify GA4 organic landing-page coverage and key-event configuration before using organic conversion rate as an optimisation signal.

No health conditions, test names, questionnaire data or other health information should be added to event parameters. Preserve the verified production event names `begin_booking`, `begin_checkout` and `purchase`, subject to consent; do not create parallel aliases for SEO reporting.

## Current Ireland search state

- Doctors and legacy clinician-name demand still contribute clicks; the retired Gráinne Ahern URL is an expected declining legacy signal, not a new defect.
- The sick-certificate migration is still visible across legacy and current URLs in Google's stored query-page rows. The repository's one-hop redirects are already implemented; do not infer live duplicate pages from historical GSC attribution.
- Ireland lab URLs are receiving impressions while the cluster remains in its index-ramp period. The canonical ledger prohibits changes before the approximately 2026-09-08 gate.
- GP consultation, mental health, psychiatry, referral/investigations and tools have striking-distance or discovery signals, but exact page actions require query-level intent review.
- Prescription pages are deliberately disabled under the current business/Ads constraint and are excluded from the normal keyword plan.

## Existing controls that are working

- Server-rendered metadata and canonical URLs.
- Indexability-aligned hreflang.
- Dynamic sitemap exclusions for unpublished/fallback content.
- Preview-host `X-Robots-Tag: noindex, nofollow, noarchive`.
- Direct 410 handling for retired content.
- Public lab URLs use `/lab-tests` while internal implementation uses a rewrite to `/tests`.
- Consent-gated analytics with URL sanitisation.
- Verified clinician entities only; no automatic fake reviewer fallback.

## Baseline command results before edits

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed after network access was allowed; lockfile already current |
| `pnpm lint` | Failed pre-change: 2 backend unused-import errors; frontend had 13 warnings and no errors |
| `pnpm typecheck` | Passed |
| `pnpm --filter frontend test` | Failed pre-change: 3 timeouts plus one stale sick-cert redirect expectation; 975 passed, 37 skipped |
| `pnpm --filter backend test` | Failed pre-change: local database unavailable at 127.0.0.1:5433 plus unrelated auth/test failures |
| `pnpm --filter backend build` | Passed |
| `pnpm --filter frontend build` | Compiled/typechecked, then failed during prerender because the backend was unavailable and degraded build mode was not enabled |

These failures pre-date the research files and are not attributed to this batch.
