# Czechia implementation log

Date: `2026-08-31`

## Implemented

### Locale-correct doctor profile links from blog pages

- Added `frontend/lib/content/doctor-profile-path.ts`.
- Added `frontend/lib/content/doctor-profile-path.test.ts`.
- Updated `frontend/lib/content/blog-post-page.tsx` so both Physician input and the visible clinical-reviewer link use the article locale.

Root cause: the visible reviewer link hardcoded `/{country}/en/doctors/{slug}` while non-English articles and their schema resolved another locale. The shared helper returns no path when the clinician has no market slug and lowercases the locale.

No booking, prescription, patient record, clinical workflow, content database, redirect, sitemap, robots, or analytics behavior was changed.

## Evidence and planning artifacts created

All Czech research deliverables under `seo/czechia/` were created or refreshed: live inventory, raw OpenSEO/GSC/GA4 exports, keyword master, exclusions, SERP validation, competitor landscape, URL ownership, content briefs, clinical register, backlink prospects, audit, measurement plan, and roadmap.

## Deliberately not implemented

- No GP metadata or heading rewrite before the `2026-09-08` ownership gate.
- No redirect change for the retired travel route; the current evidence is Google recrawl lag.
- No new city, condition, or specialty landing page.
- No unsupported claim that a prescription, referral, neschopenka, diagnosis, or 24/7 response is guaranteed.
- No outreach, OpenSEO keyword persistence, deploy, commit, or push.

## Deployment verification

After deployment, open a Czech article with a linked reviewer and verify the visible reviewer URL, Physician JSON-LD URL, canonical, and hreflang all retain `/czechia/cs/`. Then request URL Inspection only if production output differs.

## Local verification

- `node seo/czechia/validate-artifacts.mjs`: pass.
- Focused doctor-path test: 3/3 pass.
- Frontend suite: 1,157 pass, 5 skip.
- Frontend and backend type-check: pass; locale key check passed for six locales and 16 namespaces.
- Focused ESLint on the three changed frontend files: pass. Repository-wide lint is blocked by an unrelated React-purity error in the shared recruitment page.
- Final general and TypeScript reviews: approved with no remaining findings; visible-link and schema URL resolution now share one localized value while preserving the unlinked fallback.
- Backend suite: database-independent tests ran, then the suite failed where PostgreSQL at `127.0.0.1:5433` was unavailable. The documented test-database setup could not run because Docker Desktop was not running.
- Strict production build: frontend compiled and type-checked, then correctly refused to prerender without backend content. A degraded-build attempt also compiled/type-checked but was stopped during 951-page fallback generation after repeated backend retries.
