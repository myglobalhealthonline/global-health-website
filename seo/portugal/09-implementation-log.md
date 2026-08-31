# Portugal implementation log

Date: 2026-08-31.

## Implemented

### Localized shared doctor-card strings

Root cause: `frontend/components/cards/DoctorCard.tsx` contained two English literals used across every public locale: the crawlable overlay link text and the credentials heading.

Implementation:

- extended `DoctorCardI18n` with `viewProfileAria` and `credentialsLabel`;
- reused the existing `common.doctors.viewProfileAria` locale key;
- added one `credentialsLabel` key to all six common locale bundles;
- resolved `{name}` in the shared component;
- kept caller-provided `viewProfileAriaLabel` as the override;
- added a focused static-render test that failed before and passed after the fix;
- updated affected typed test fixtures.

No new dependency, helper layer or framework file was added.

## Research artifacts

Created the complete `seo/portugal/` package: 8,106 raw keyword rows, a 1,647-row normalized/relevance-gated master, 177 business-fit gaps, URL map, competitor inventories, SERP export, backlink opportunities, 24 briefs, technical/measurement/roadmap documents and a 24-row page/file clinical review register. The final gate removed 143 non-medical, unsupported, non-Portugal administrative or employment terms that had collided with `receita`/`consulta` seeds; the removals are preserved in `raw/keyword-exclusions-final.csv`.

## Deliberately not implemented

- No title/H1 rewrite on the driving-certificate page: fresh indexing and SERP evidence points to an authority wall.
- No new page, city page, doorway page, mass FAQ or thin programmatic route.
- No redirect/noindex/canonical/robots/sitemap change without a reproduced defect.
- No production database write. `backend/.env` points to production; hero CTA, roles, image metadata and registration divisions need reviewed content-data changes.
- No prescribing, booking, patient, clinician-credential or service-availability logic changed.
- No rank tracker or recurring paid OpenSEO job created.

## Data changes still requiring approval/review

1. Portugal homepage CTA → verified pt-PT label.
2. Missing Portuguese clinician role/specialty translations.
3. Missing Portuguese image title/description/alt source values.
4. Missing Portuguese registration-division translations.
5. Certificate/leave/prescription content claims listed in `clinical-review-register.csv`.

## Verification

- RED: focused DoctorCard test failed on English `View profile for …`.
- GREEN: DoctorCard + DoctorTeamTemplate focused tests passed (5/5).
- Locale-key validation passed for six locales across 16 namespaces.
- Frontend typecheck initially exposed one typed test fixture missing the new key; after that fixture was fixed, frontend and backend package typechecks passed.
- Touched TypeScript/React files passed the frontend ESLint script.
- Full frontend suite passed: 96 files, 1,136 tests passed and 5 skipped.
- The production build compiled and completed its TypeScript phase. Static generation could not complete because the configured content backend was unreachable; even the explicit degraded-build path repeatedly retried `/api/countries`, `/api/assets` and `/api/public/reviews-config`. It was stopped at 52/951 pages after fallback behavior was proven. The strict baseline build fails on the same external dependency by design.
- No formatter script exists in the frontend or backend package; no formatter result is claimed.
