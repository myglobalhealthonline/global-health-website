# Editorial Implementation Report

## Summary

The editorial completion plan from [editorial-completion-plan.md](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/docs/editorial-completion-plan.md) has been implemented into the CMS-backed data model and aligned with the current frontend rendering paths.

Completed in this pass:

- added missing CMS fields for service SEO, doctor SEO, blog reviewer/review date support, and editorial checklists
- imported Ireland service copy into CMS service records
- imported non-Ireland country drafts into CMS content-page records
- imported Dr. Khoiamul Islam profile draft into CMS doctor records
- imported five draft blog articles into CMS blog-post records
- imported pricing content into CMS content-page records
- imported legal scaffolding into CMS content-page records
- wired service and doctor metadata to respect editorial readiness, not just content presence
- kept Ireland services, country pages, doctor profiles, and legal pages out of index where required
- updated pricing, legal, and non-Ireland frontend fallback copy so public pages match the new editorial direction now

Operational workaround used:

- Prisma `migrate deploy` was blocked by a remote advisory-lock timeout.
- The same non-destructive schema changes were applied with `backend/prisma/apply-editorial-sql.ts`.
- Prisma client was regenerated and the standard seed/import flow then completed successfully.

## Validation

- `backend`: `npm run typecheck`
- `backend`: `npm run build`
- `frontend`: `npm run typecheck`
- `frontend`: `npm run build`

All four commands passed.

## Record Status

| Area | Records Updated | Kept Noindex | Ready to Index | Remaining Blocker |
| --- | ---: | ---: | ---: | --- |
| Ireland services | 37 | 37 | 0 | Exact `durationMinutes`, `basePriceCents`, `currencyCode`, and final operational service scope still need confirmation before `readyToIndex` can be true |
| Country content pages | 4 | 4 | 0 | Local roster, pricing, language support, and prescribing/referral workflows are still not confirmed |
| Doctor profiles | 1 | 1 | 0 | Verified IMC/public verification URL still needed before the profile can move to indexable |
| Blog drafts | 5 | 5 | 0 | Reviewer assignment, final clinical review, and confirmed review date are still missing |
| Pricing content | 1 | 0 | 1 | No blocker for copy; public pricing remains conditional and avoids fake price certainty |
| Legal content scaffolds | 4 | 4 | 0 | Legal entity details, jurisdiction wording, and effective dates still need legal approval |

## Schema / CMS Changes

Added CMS storage support for editorial readiness:

- `Service`
  - `seoTitle`
  - `seoDescription`
  - `editorialChecklist`
- `Doctor`
  - `seoTitle`
  - `seoDescription`
  - `editorialChecklist`
- `BlogPost`
  - `reviewerDisplayName`
  - `lastReviewedAt`
  - `editorialChecklist`
- `ContentPage`
  - `editorialChecklist`

Files added for this:

- [schema.prisma](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/backend/prisma/schema.prisma)
- [migration.sql](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/backend/prisma/migrations/20260508120000_editorial_content_enrichment/migration.sql)
- [apply-editorial-sql.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/backend/prisma/apply-editorial-sql.ts)

## Import Path

The CMS import now uses the markdown plan as the source of truth.

- parser/importer: [editorial-plan-import.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/backend/prisma/editorial-plan-import.ts)
- seed integration: [seed.ts](C:/Users/kingh/Desktop/NashaaFrontend/global-health-website/backend/prisma/seed.ts)

This keeps the editorial content in one authored document while still loading it into CMS records.

## Frontend Behavior Changes

Implemented to keep public behavior aligned with the imported records:

- service and specialist metadata now prefer service SEO fields and remain `noindex` until `editorialChecklist.readyToIndex === true`
- doctor metadata now respects the same editorial readiness gate
- service detail pages no longer append generic clinical cards after a rich imported body
- safe same-site internal links are now preserved in service rich HTML
- non-Ireland country hubs now use more specific route-family copy instead of near-cloned generic messaging
- pricing page copy now reflects the final editorial draft and avoids fake fixed-price certainty
- legal pages now use approval-pending legal scaffolding and are forced `noindex`

## Remaining Blockers

The remaining blockers are operational or approval-based, not structural.

1. Ireland services
   Exact public duration, price, currency, and service-scope confirmation are still needed before any service can move from `noindex` to indexed.

2. Doctor profiles
   A public verification URL or explicitly verified registration workflow is still missing for the imported doctor profile.

3. Blog publishing
   The CMS now holds the five draft articles, but they must stay draft/noindex until a reviewer and final review date are added.

4. Country routes
   The copy is in place, but non-Ireland routes should stay `noindex` until real local operational coverage is confirmed.

5. Legal pages
   Legal pages now have clean scaffolding only. They still require legal signoff before indexing.
