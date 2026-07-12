# Service hub parity audit

Date: 2026-07-13

Scope: country/language GP, specialist consultation, health tests, consultation detail, and health-test detail pages. This audit covers the React/Next.js frontend, public Fastify/Prisma reads, CMS page records, routing, legal content, caching, SEO, and booking eligibility.

## Executive summary

The Ireland GP hub feels complete because it has an authored content layer (`getGpHubContent`) and deliberately alternates product, guidance, clinicians, trust, FAQ, reviews, CTA, and disclaimer sections. The specialist and tests hubs previously stopped after the catalogue and a generic CMS rich body. They had no reusable structured content contract, no country legal composition, and no intentional information flow.

The specialist roster defect was more serious than a thin page. The page used specialty taxonomy as its eligibility rule and then silently capped the result. Production data proves that this selected the wrong clinicians and hid the bookable ones. Active `ServiceDoctor` assignments are the booking source of truth; specialty metadata is descriptive.

## Section comparison before rebuild

| Section | GP hub | Specialist hub | Tests hub | Consultation detail | Test detail |
|---|---|---|---|---|---|
| Country-aware hero | Yes; CMS fields partly ignored | Yes; CMS title/image partly ignored | Yes; unsupported global review/timing claims | Yes | Yes |
| Overview | Ireland only | No | No | Service summary/body | Product intro |
| Active catalogue | General services | Specialist services | Health tests | One active service | One active test |
| Who it is for | Ireland only | No | No | CMS body dependent | `whyGetTested` when authored |
| Reasons/coverage | Ireland only | No | Cards only | CMS body dependent | `whatThisTestCovers` |
| Process | Partial on GP detail content | No | No | Booking card/doctor selection | Product order flow |
| Eligible clinicians | First six country doctors | Specialty-linked first six | Not applicable | Assigned doctors | Not applicable |
| Why choose | Ireland only | No | No | Trust/reviews | Trust ribbon |
| Important limits | Disclaimer only | No | No | Country disclaimer | Generic/detail disclaimer |
| FAQ + matching schema | Ireland only | No | No | Yes | FAQ UI but no FAQ schema |
| Reviews | Yes | Yes | No | Yes | No |
| Final/mobile CTA | Both | Both | Desktop final only | Final CTA | Add-to-cart actions |
| CMS rich body | Supplementary | Primary long-form source | Primary long-form source | Primary detail source | Extra sections/product fields |

## Page architecture and data sources

### GP hub

`frontend/app/(site)/[country]/[lang]/general-consultation/page.tsx` fetches the content page, active general services, country doctors, and country disclaimer in parallel. The page uses `ServiceHero`, service cards, `DoctorsSection`, the optional Ireland hub object, CMS rich HTML, reviews, CTAs, and legal copy. The structured hub is returned only for country `ie`; it ignores locale, so non-English Ireland routes receive English authored content and FAQ schema. Other countries receive the thin fallback.

### Specialist hub

Before this work the sequence was hero, active specialist services, incorrectly filtered doctors, CMS body, reviews, and CTAs. Service rows come from `/api/countries/:countryCode/services?kind=SPECIALIST`; doctor rows come from `/api/countries/:countryCode/doctors`. Both requests use a 60-second Next fetch cache with country/locale tags. The rebuilt page composes a neutral structured fallback, the active catalogue, assignment-eligible doctors, country legal data, visible FAQ/schema, and supplementary CMS HTML.

### Tests hub

The catalogue comes from `/api/health-tests?countryCode=...` through `getCountryHealthTests`. Each card uses stored title, description, price, currency, sample type, result timeline, stock, and image. The old hero and trust ribbon claimed universal clinician review, 24–48 hour results, home kits, and delivery without checking product data. Those claims were not supported by the hub payload. The rebuild uses only catalogue count, country scope, configured product fields, stock, and secure cart behavior.

### Detail pages

Consultation detail pages have the strongest data-driven implementation: localized service fields, assigned doctors, FAQ, internal links, country disclaimer, and MedicalClinic/FAQ schema. Health-test detail pages correctly use product-specific arrays and FAQs, but their canonical/linking still targets `/tests/:slug` while the public alias is `/lab-tests/:slug`; they also lack hreflang, FAQ schema, and Product/Offer schema. Those detail-route issues are outside the hub-only code patch and remain recommended follow-up work.

## Specialist doctor root cause

Old frontend logic:

```ts
doctors
  .filter((doctor) => doctor.specialties.length > 0)
  .slice(0, 6)
```

This made a descriptive `DoctorSpecialty` relation the eligibility gate, ignored `assignedServiceIds`, allowed unassigned clinicians to appear, hid assigned clinicians with incomplete taxonomy, silently capped the roster, and created booking links with only a doctor slug.

Read-only production diagnostics on 2026-07-13:

| Country | Country API roster | Has specialty | Active specialist assignment | Old rendered | Hidden by old specialty filter | Hidden by old six-card limit | Correct rendered |
|---|---:|---:|---:|---:|---:|---:|---:|
| Ireland | 23 | 2 | 8 | 2 | 8 valid specialists | 0 after old filter; 2 after corrected filter | 8 |
| Portugal | 17 | 2 | 7 | 2 | 6 valid specialists | 0 after old filter; 1 after corrected filter | 7 |
| Czechia | 6 | 1 | 0 | 1 | 0 valid specialists | 0 | 0 |

In Ireland both clinicians rendered by the old filter had no active Ireland specialist assignment, while all eight valid assigned specialists lacked specialty metadata. In Portugal one of the two old results was unassigned. Czechia had no active specialist service assignment, yet one taxonomy-linked clinician was shown.

The corrected selector iterates ordered active specialist services and their ordered `assignedDoctorIds`, intersects them with the country doctor payload, verifies the reciprocal `assignedServiceIds`, deduplicates by doctor ID, preserves the first valid doctor/service pair, promotes featured doctors, and otherwise uses service/assignment order with name/ID tie-breakers. Booking URLs include both service and doctor.

## Backend eligibility and cache audit

`listDoctorsByCountry` correctly requires `Doctor.active` and either an active primary country or active `DoctorCountry` link to an active country. Before this work its assignment include required `ServiceDoctor.isActive` and active service/country, but not `status = active` or public visibility. `listServicesByCountry` required an active public service and active doctor, but not active assignment status or active country linkage for that doctor. The availability endpoint also checked only `isActive`.

The public projections and availability gate now require active assignment status. The doctor projection also requires public service visibility; the service projection verifies active primary/additional country linkage. This is additive query hardening and needs no database migration.

Next data fetches revalidate after 60 seconds and use country doctor/service tags. Service create/edit actions invalidate both tags. Doctor-side service assignment actions currently invalidate admin paths only, so a public roster can remain stale until TTL/SWR expiry. That invalidation gap remains a follow-up.

## Country and locale behavior

The static frontend registry contains Ireland, Portugal, Czechia, Spain, Romania, and Brazil, with English, Portuguese, Spanish, Czech, Romanian, and German support. Runtime country routes still call the static `getCountryByCode` after dynamic slug resolution, so an admin-created country can resolve a slug and then 404. Routes validate global locale support but do not consistently reject a locale disabled for a particular country.

Country services, doctors, tests, prices, currencies, registration fields, and legal disclaimers are sourced from country-scoped APIs. The new fallback copy interpolates only the country name and active product/service data. It deliberately does not insert regulator names, emergency numbers, delivery promises, laboratory accreditation, clinician review, or turnaround times. Approved regulator/emergency/disclaimer data continues to come from `CountryLegalProfile`.

The reusable structured fallback is approved and implemented in English, Portuguese, Spanish, Czech, Romanian, and German. Dynamic country names and service names remain sourced from localized API data rather than being translated in static code. Requested-locale CMS hero/SEO/body and product/service translations still resolve requested locale to country default to base.

## CMS compatibility

`ContentPage` currently supports title, rich body, hero title/subtitle/image, CTA, SEO, and social image fields. It cannot store repeatable overview/checklist/process/FAQ/important-information structures. Existing CMS content is preserved and rendered after the main conversion/information flow as supplementary editorial content. CMS hero title and hero image are now used by the rebuilt hubs instead of rendering a second image below the stock hero.

Recommended CMS evolution is an additive nullable, versioned `structuredContent` JSON field validated by a discriminated schema. Arrays should replace atomically during fallback merging so jurisdictional copy is not mixed. Legal/regulatory content should remain in the legal profile rather than being duplicated in generic page JSON.

## UI and responsive audit

The shared design system uses responsive clamp spacing, a constrained container, 1/2/3-column grids, mobile hero composition, and a safe-area-aware sticky CTA. The old specialist and tests pages lacked the dark/light rhythm and supporting sections present on GP. The rebuilt order uses flatter full-width sections and reserves cards for services, doctors, ordered steps, and FAQ interaction. No fixed content heights were introduced.

The existing doctor pager already exposes all doctors in six-card pages with visible controls, but the old page truncated the input before it reached that component. The corrected page passes the full roster and displays its total. The tests hub now has a mobile sticky catalogue action and a composed empty state.

## SEO audit

All three hubs have canonical and hreflang helpers plus breadcrumb schema. The tests title previously embedded the brand and bypassed `resolveBrandTitle`, risking duplication; this is corrected. Specialist metadata no longer enumerates hardcoded specialties. FAQ schema is emitted only for the exact visible fallback FAQ array.

Outstanding SEO gaps include test-detail canonical redirects, missing test-detail hreflang/Product/FAQ schema, omitted service/test detail URLs from the sitemap, English breadcrumb labels, CMS social images not wired into hub metadata, and static-country limitations. The specialist hub now uses neutral `Service` schema instead of the detail-oriented `medicalProcedureJsonLd` assumptions; the health-test hub emits an `ItemList` from visible products.

## Recommended architecture

1. Keep `ServiceHubContent` as the common frontend render contract.
2. Add nullable versioned structured CMS JSON and validate it server-side.
3. Resolve requested-locale CMS structure, country default, approved country fallback, then neutral global fallback.
4. Keep country legal content authoritative and separate.
5. Use assignment-based pure selectors for bookability; use taxonomy only for display/filtering/SEO.
6. Add endpoint integration tests around every activity/status/country relation and page-level tests around conditional sections and matching schema.
