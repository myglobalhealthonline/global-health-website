# Service hub parity implementation plan

Date: 2026-07-13

## Contract

Inputs are a country slug, requested locale, CMS page record, country feature overlay, active country services/tests/doctors, and country legal profile. Outputs are complete specialist and health-test hubs whose product and clinician actions are valid for that country. Acceptance requires assignment-correct specialist results, no silent roster cap, no unsupported test claims, visible empty states, matching FAQ schema, retained CMS body, passing type/tests/build, and responsive browser verification.

## Implemented phase

1. Add a pure specialist selection helper and tests. Eligibility is the intersection of active specialist service assignments with the active country doctor roster. Deduplicate, feature-promote, preserve assignment order, and retain a valid service/doctor pair.
2. Harden public backend assignment projections and service availability with `status = active`, public visibility, and country-link checks.
3. Add a reusable `ServiceHubContent` contract and medically neutral fallback resolver. Derive country/service references from live inputs.
4. Recompose the specialist hub: hero, overview, active services, who-for, active areas, booking process, full eligible roster/empty state, why choose, limits, CMS body, FAQ/schema, reviews, CTA, legal disclaimer.
5. Recompose the tests hub: hero, factual trust ribbon, overview, active tests/empty state, who-for, ordering, sample process, results/follow-up, why choose, limits, CMS body, FAQ/schema, disclaimer, final/mobile CTA.
6. Preserve current URL aliases, cart/booking flow, CMS records, and product/service models.

## Files modified in this phase

- `frontend/app/(site)/[country]/[lang]/specialist-consultation/page.tsx`
- `frontend/app/(site)/[country]/[lang]/tests/page.tsx`
- `frontend/lib/content/specialist-doctor-selection.ts`
- `frontend/lib/content/specialist-doctor-selection.test.ts`
- `frontend/lib/content/service-hub-content.ts`
- `frontend/lib/content/service-hub-content.test.ts`
- `backend/src/modules/doctors/doctors.service.ts`
- `backend/src/modules/services/services.service.ts`
- `backend/src/routes/country-scoped.route.ts`
- the two required audit/plan documents

## CMS and migration phase

No database migration is required for the implemented frontend fallback. A future additive migration should add nullable `ContentPage.structuredContent Json?`. A versioned Zod schema should validate page type and optional hero, overview, checklist, process, why-choose, important-information, FAQ, and final-CTA blocks. Thread the field through admin validation/service/routes, the public page payload, frontend normalization, and a repeatable admin editor. Existing rows remain valid because null preserves current behavior; `page.body` remains supplementary.

Fallback order:

1. Country + requested-locale published CMS structure.
2. Country + default-locale published CMS structure.
3. Approved country-level structure.
4. Neutral global fallback.

An explicitly disabled/draft locale/page must keep its disable semantics and must not silently fall through to another CMS record. Arrays replace atomically; scalar objects may merge field by field. Legal disclaimers, regulator details, emergency contacts, and jurisdictional claims remain sourced from the legal profile.

## Test strategy

Unit tests cover missing-specialty inclusion, specialty-only/general-only exclusion, reciprocal assignment validation, multi-service deduplication, featured/service/assignment ordering, rosters over six, country interpolation, empty optional service sections, and absence of unsupported global test claims.

Backend integration tests should next cover active/inactive doctor, primary country, active/inactive `DoctorCountry`, country activity, active/inactive/public service, `ServiceDoctor.isActive`, every assignment status, missing specialty, duplicate multi-service assignment, locale fallback, and deterministic order. Page tests should assert one H1, conditional section removal, explicit empty states, exact FAQ/schema parity, retained CMS body, and booking URLs containing country/language/service/doctor.

Verification gates are frontend/backend typecheck, targeted and full test suites, lint, production build, then Playwright at 320×568, 375×667, 390×844, 430×932, 768×1024, 1024×768, 1280×720, 1440×900, and 1920×1080. Capture specialist/tests desktop and mobile, full specialist roster, empty roster, and a non-Ireland country.

## Risks and mitigations

- Assignment status drift: require both `isActive` and `status = active` in public projections and availability.
- Stale public roster after doctor-side assignment edits: add country doctor/service tag invalidation to those actions.
- Unsupported clinical/legal content: keep fallback neutral and compose approved legal profile fields only.
- Locale drift: keep the six approved fallback modules structurally tested, then migrate their copy into requested-locale structured CMS records without changing the render contract.
- Admin order ties: service form order is currently alphabetical and direct doctor assignments can tie at zero. Preserve deterministic name/ID fallback and add explicit drag ordering later.
- Dynamic countries: replace static `getCountryByCode` dependency with public country configuration before claiming admin-created-country parity.

## Manual verification

1. Start backend and frontend.
2. Open `/ireland/en/see-a-specialist`; confirm eight assignment-eligible doctors, no specialty-only doctors, pagination rather than truncation, and service+doctor booking query parameters.
3. Open `/portugal/pt/see-a-specialist`; confirm seven eligible doctors and country registration data only when present.
4. Open `/czechia/cs/see-a-specialist`; confirm the explicit no-eligible-clinicians state.
5. Open each country `/lab-tests`; compare card sample/timeline/stock facts with product detail records and confirm no global clinician-review/delivery/timing promise.
6. Disable a country feature and confirm the hub returns not found.
7. Edit a CMS hero/body and verify the hero uses the CMS image/title and the body remains below the structured flow.
