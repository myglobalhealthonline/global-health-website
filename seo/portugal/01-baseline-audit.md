# Portugal baseline audit

Evidence date: 2026-08-31. Market: Portugal, Google, Portuguese (`pt-PT`).

## Business and repository baseline

The project is a Next.js 16 App Router frontend with React 19 and a Fastify 5 / Prisma 7 backend. Portugal is a first-class country/locale route at `/portugal/pt`. The repository already implements localized metadata, canonical/hreflang handling, sitemaps, robots, structured data and country-aware service/doctor routes. Redirects live in `frontend/next.config.ts`; request routing lives in `frontend/proxy.ts`.

The read-only production inventory returned:

- 16 primary Portugal clinicians;
- 18 Portugal clinician-country links;
- 39 Portugal service records;
- 23 active/public/bookable service rows;
- no active service without at least one staffed assignment in the inspected snapshot.

The 23 active service slugs are `baixa-medica`, `certificado-medico-carta-de-conducao`, `certificados-medicos`, `consulta-cardiologia`, `consulta-de-oncologia`, `consulta-de-pediatria`, `consulta-de-psicologia`, `consulta-de-psiquiatria`, `consulta-de-referenciacao`, `consulta-dermatologia`, `consulta-do-viajante`, `consulta-medica`, `consulta-queda-de-cabelo`, `deixar-de-fumar`, `gestao-da-dor`, `medicina-geral-e-familiar`, `pediatria-geral`, `perda-de-peso`, `renovacao-de-tratamento`, `saude-da-mulher`, `saude-do-homem`, `saude-mental`, and `segunda-opiniao-medica`.

Inactive specialties found in the database were excluded from targeting. The inventory is a point-in-time read, not permission to publish or change clinical claims.

## Search Console baseline

Device-complete Search Analytics:

| Window | Clicks | Impressions | CTR |
|---|---:|---:|---:|
| 2026-05-31 → 2026-08-28 | 350 | 8,862 | 3.95% |
| 2026-03-02 → 2026-05-30 | 281 | 2,848 | 9.87% |

Current device mix:

| Device | Clicks | Impressions | CTR | Average position |
|---|---:|---:|---:|---:|
| Mobile | 249 | 4,944 | 5.04% | 8.03 |
| Desktop | 95 | 3,825 | 2.48% | 26.06 |
| Tablet | 6 | 93 | 6.45% | — |

The current query-visible extract contains 811 privacy-thresholded rows, 45 clicks and 2,939 impressions. Fully paginated query/page extraction contains 1,022 rows, 45 clicks and 3,229 impressions. These are smaller than device totals because GSC suppresses low-volume query detail.

Portugal country rows for 2026-05-28 → 2026-08-28 show 359 clicks, 8,962 impressions, 4.0% CTR and position 15.9. The site gained much broader visibility while CTR fell, so query mix and landing-page ownership—not a blanket ranking claim—must be inspected cluster by cluster.

Notable current queries include:

- `global health`: 17 clicks / 116 impressions / position 3.14;
- `atestado médico online`: 1 / 36 / 18.53;
- `atestado medico para carta de condução`: 1 / 30 / 40.03;
- strong clinician-brand demand for Telmo Coelho.

## URL Inspection

- Telmo Coelho current canonical: submitted/indexed, canonical match; crawl 2026-08-24.
- Vitor Pais current canonical: submitted/indexed, canonical match; crawl 2026-08-30.
- Pedro Santos current and legacy shapes: Google still reports the old pre-fix `noindex` state from a 2026-08-06 crawl. Live state is newer; wait for recrawl rather than add another code change.
- Driving certificate service: submitted/indexed, canonical match; crawl 2026-08-29.
- General consultation service: submitted/indexed, canonical match; crawl 2026-07-31.
- Portugal homepage: submitted/indexed, canonical match; crawl 2026-08-29.

## Analytics baseline

The GA4 connection and measurement-health checks succeeded, with one web stream and no reported configuration issues, but the 2026-08-25 → 2026-08-30 overview/landing/audience reports returned no usable rows. Configured key events observed in the connection are `purchase` and `begin_booking`; `begin_checkout` is not a key event. No conversion-rate conclusion is defensible from this extract.

## Live page and content findings

The [Portugal homepage](https://www.myglobalhealth.online/portugal/pt) publicly presents 16 clinicians and 23 services. It also exposed residual English in the Portugal experience:

- hero CTA supplied by CMS: “Book a consultation”;
- doctor-card overlay text: “View profile for …”;
- doctor-card credential heading: “Credentials”;
- some clinician roles, image descriptions and registration-division values are stored in English.

The shared component caused the overlay/credential literals and was fixed in this repository. Hero CTA, role, image and division values are production content records; they remain a reviewed data-remediation item because the backend environment targets production.

## Crawl and technical baseline

A focused 200-page OpenSEO audit starting at the Portugal homepage completed, but internal links allowed the crawler to leave the Portugal market. The returned 295 issues were information severity only: 121 long titles, 99 long descriptions and 75 slow responses. Because only the Portugal homepage was present in the returned page slice, those global counts are not classified as Portugal defects.

The audited Portugal homepage was 200, indexable, self-described and approximately 3,211 words with a 353 ms response. The audit’s `inSitemap=false` flag conflicts with repository sitemap coverage and must be rechecked against the live sitemap before any sitemap change.

## Baseline QA constraints

- Frontend/backend typecheck baseline passed before changes.
- Frontend lint had 13 existing warnings.
- Backend lint had one existing unused-import error in `refund-notifications.service.ts`.
- Frontend suite: 1,101 tests passed and 38 skipped; three setup-timeout failures occurred under load.
- Backend DB-backed tests could not connect to the expected local test PostgreSQL on `127.0.0.1:5433`; non-DB tests continued to pass.
- Strict build reached frontend prerendering but intentionally failed when the backend content API was unavailable. This is an environment dependency, not a Portugal SEO compile error.
