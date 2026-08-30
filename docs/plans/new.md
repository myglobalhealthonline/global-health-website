# API and Website Performance Remediation Plan

**Plan date:** 2026-08-30
**Planning revision:** `b7263f28`
**Primary evidence:** `docs/audits/performance/API_PERFORMANCE_AUDIT.md`
**Change type:** planning only; this document does not authorize a production deployment
**Primary objective:** make the public website and its APIs faster without changing login, authorization, booking decisions, card content, ordering, localization, navigation, or other business logic

## 1. Required outcome

Implement performance improvements as additive, reversible data-access changes. The visible and operational behavior of the application must remain the same.

Success means all of the following are true:

1. Public pages and the doctor/service APIs are materially faster under repeatable cold, warm, and concurrent measurements.
2. A valid user can still log in, remain logged in, refresh a public page, enter the correct portal, and log out.
3. Anonymous and expired-session users still receive the same redirects and authorization failures as before.
4. Every doctor and service card that renders before the change still renders afterward with the same content, order, links, localized text, image behavior, and booking state.
5. No card becomes blank because a new projection is missing or malformed.
6. `BOOKABLE`, `RETURNING`, and `UNAVAILABLE` decisions, their reason codes, and `nextAvailableAt` values remain identical for the same data and clock.
7. The old public collection endpoints remain available and are the automatic runtime fallback whenever the projection path fails (user decision 2026-08-30: no operator feature flags; see §12).
8. No secret, cookie value, token, private clinician contact field, or patient data is added to a response, log, metric, fixture, or performance artifact.

## 2. Non-negotiable safety rules

These are release blockers, not suggestions.

### 2.1 Preserve behavior and logic

- Do not rewrite `DoctorCard`, `ServiceCard`, `BookCta`, login forms, authentication handlers, authorization guards, booking rules, pricing rules, insurance calculations, sorting rules, locale fallback, or SEO URL construction as part of this work.
- Do not remove an existing field from an existing endpoint.
- Do not change an existing endpoint's status codes, response envelope, cache privacy, cookie forwarding, or error semantics.
- Introduce card projections through new additive endpoints or an equally isolated versioned contract. Do not silently change the payload of `/api/countries/:countryCode/doctors` or `/api/countries/:countryCode/services`.
- Keep the current endpoints as the runtime fallback until the new path has completed parity checks, canary rollout, and an agreed observation window.
- Optimize how data is selected, batched, serialized, transferred, and cached. Do not optimize by changing which records qualify or what users are allowed to do.

### 2.2 Preserve authentication and login

The first implementation phases must not edit these authentication boundaries:

- `frontend/app/api/auth/[...path]/route.ts`
- `frontend/lib/api/auth-api.ts`
- `frontend/app/api/cart/route.ts` (forwards the raw cookie header and applies `forwardSetCookies` — a session-cookie-carrying path, frozen alongside the auth proxy)
- the authentication decisions and `gh-auth-hint` handling in `frontend/proxy.ts` (hint written/deleted at `frontend/proxy.ts:631-649`; the proxy matcher also covers `/api/*` route handlers)
- `frontend/components/layout/PublicAuthContext.tsx`
- `backend/src/routes/auth.route.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/utils/require-auth.ts`
- session-cookie names, flags, lifetime, token version checks, role redirects, CSRF controls, and rate limits

The backend `requireAuth` database lookup is a revocation and account-state control. It must not be removed or cached across requests merely to reduce latency. Any future optimization to authenticated APIs requires a separate security review and its own plan.

### 2.3 Preserve card rendering

- Keep `frontend/components/cards/DoctorCard.tsx` and `frontend/components/cards/ServiceCard.tsx` unchanged in the projection phases.
- Keep every existing page-to-card mapping function unchanged unless a test first demonstrates that a compatibility adapter returns the exact same normalized type.
- Required card fields must be validated before the new result is accepted.
- A network error, non-2xx response, invalid JSON, invalid required field, invalid enum, or inconsistent relationship must trigger the old endpoint fallback on the server.
- A successful new response must never be combined with a partial old response. Choose one complete source per request so ordering and counts cannot be mixed.
- Preserve current safe defaults: unavailable bookability fails closed, missing doctor photos render `DoctorAvatarFallback`, and service cards retain their existing no-image rendering.
- Never replace a valid card with an empty array merely because the projection endpoint failed.

### 2.4 Preserve booking correctness

- Reuse the existing pure bookability derivation and the same clock for old/new comparisons.
- Keep the same country pause, doctor pause, service pause, approved-doctor, open-slot, held-slot, and lookahead semantics.
- Keep the same stable priority: `BOOKABLE` before `RETURNING` before `UNAVAILABLE`, followed by the existing source order.
- Keep booking CTAs fail-closed. Missing or invalid bookability must not produce an active booking link.
- Do not lengthen availability cache TTLs until invalidation and stale-state tests prove it is safe.
- Do not move expired-hold cleanup out of GET handlers in the same change as batching the summary reads. That is a separate, high-risk behavior change and needs separate race/idempotency validation.

### 2.5 Preserve privacy and secrets

- Public projections may contain only already-public fields.
- Do not expose `whatsappNumber`; the backend intentionally strips private clinician contact data from public payloads.
- Do not log response bodies, names, emails, phone numbers, cookie headers, authorization headers, session identifiers, cart tokens, or provider payloads.
- Performance logs must use route templates, durations, counts, byte sizes, result categories, and opaque request IDs only.
- Use synthetic/non-production accounts for authenticated tests. Never copy production cookies or tokens into fixtures.

## 3. Evidence baseline and limitations

The verified audit is the baseline record. Its seven-sample public probe is directional because each request opened a new connection and seven samples cannot establish a stable tail percentile. Under nearest-rank calculation, the reported p95 is the maximum sample. The implementation team must preserve raw per-request artifacts for the new baseline and every comparison.

| Path | Audit average | Audit directional p95 | Raw payload | Initial target |
| --- | ---: | ---: | ---: | --- |
| `/api/countries/ie/doctors?locale=EN` | 1,077 ms | 1,702 ms | 514,430 B | p95 total below 500 ms; first list below 100 KB compressed |
| `/api/countries/ie/services?locale=EN` | 868 ms | 919 ms | 276,806 B | p95 total below 500 ms; first list below 100 KB compressed |
| `/ie/en` document | 1,266 ms | 2,518 ms | 640,192 B HTML | baseline p95 below 1 s with materially smaller transfer |
| `/health` | 551 ms | 877 ms | 43 B | use only to separate connection/edge floor; do not label DB/server cost without timing |

These numbers do not prove the same behavior for authenticated routes, every market, every region, or production concurrency. The plan therefore adds observability and a repeatable test protocol before attributing time to the database, Node.js, the edge, serialization, or transfer.

## 4. Current critical path

```text
Browser navigation
  -> Next public layout
       -> five parallel shell reads
  -> country homepage
       -> six parallel page reads
            -> full country doctor collection
                 -> rich doctor relations
                 -> general + per-service bookability summaries
            -> full country service collection
                 -> rich service relations
                 -> one bookability summary per service
  -> HTML/RSC serialization and transfer
  -> hydration
       -> GP availability request
       -> universal cart request
       -> conditional /api/auth/me only when gh-auth-hint exists
```

Relevant current source:

- The homepage awaits six reads at `frontend/app/[country]/[lang]/page.tsx:223-242`.
- The public shell awaits five reads at `frontend/components/layout/PublicShell.tsx:82-98`.
- The service list (`listServicesByCountry`) selects country, assets, assignments, translations, insurance coverage, and insurer/doctor relationships with a broad `include`, then resolves one summary per service at `backend/src/modules/services/services.service.ts:476-580`. Cold query count ≈ `8 + 3N + 8D` for N services and D distinct doctors.
- The doctor list (`listDoctorsByCountry`) selects specialties, translations, FAQs, assets, market registration, credentials, and assignments, then resolves doctor/service summaries at `backend/src/modules/doctors/doctors.service.ts:503-646`. Order is `fullName asc` with `take: 300`; `stripPrivateContact` (`:662-683`) removes `whatsappNumber` and booking-pause fields at `:620`. Cold query count ≈ `14 + 3M(1+S) + 8M` for M doctors averaging S assigned services (~700 for M=30, S=4).
- The service evaluator releases expired holds and scans assigned doctors in bounded batches (concurrency 8) at `backend/src/modules/bookability/bookability.service.ts:190-266`. The bookability summary cache TTL is **60 s** (`CACHE_TTL_MS`, `:29`) with single-flight; the 45 s TTL belongs to the slot-inventory layer (`doctor-availability.service.ts:1045`). The public GET path performs writes: expired-hold sweeping (`releaseExpiredHeldSlotsForDoctors`, `:217`) and slot minting (`ensureSlotsForRange` → `createMany`). Projections that reuse the bookability enrichment inherit these writes unchanged.
- The normalized frontend contracts are `CountryServiceCard` at `frontend/lib/content/get-country-collections.ts:30-51` (dependent bookability types at `:53-66`) and `CountryDoctorCard` at `:303-355`. The doctor mapper (`:611-657`) always emits `imageFocalX`/`imageFocalY` (default 50), `imageZoom` (default 1), and `isFeatured` even though typed optional; parity tests must assert presence. `marketDisplayName` is applied inside this frontend mapper (`:614`) — the backend projection must return raw `fullName`.
- **Hidden second consumer of the doctors endpoint:** `getPublicDoctorsForMarket` (`frontend/lib/content/get-public-doctors.ts:302-317`) requires fields absent from `CountryDoctorCard` — `country{code,name,teamPath}`, `seoTitle`, `seoDescription`, `seoKeywords`, `faqs`, `qualifications`, `editorialChecklist`, `updatedAt`, `lastReviewedAt` — feeding `app/sitemap.ts:444`, `lib/seo/doctor-hreflang.ts:51`, `lib/seo/doctor-market-title.ts:20`. It must stay on the legacy endpoint permanently; narrowing the legacy `/doctors` response would silently empty the sitemap.
- **Legacy failure semantics are fail-loud, not `[]`:** `getCountryDoctors`/`getCountryServices` call `assertCollectionAvailable` (`get-country-collections.ts:442-444,546-548`); an unconfirmed backend failure raises `PublicContentUnavailableError` (`frontend/lib/content/public-content-source.ts`); `[]` only for confirmed-empty. Pinned by `content-fetch-reliability.test.ts:194,198`. The adapter must preserve this: projection failure → legacy call; legacy failure → the existing throw, never a synthesized empty result.
- Public auth is already deferred and conditional on `gh-auth-hint` at `frontend/components/layout/PublicAuthContext.tsx:51-71`; preserve this behavior.
- Cart hydration currently runs after every public-layout mount at `frontend/components/cart/CartContext.tsx:81-95` (unconditional effect at `:93-95`).
- The homepage GP route reserializes its complete result through `NextResponse.json` at `frontend/app/api/public/gp-availability/route.ts:11-26`. **It is not a header-forwarding proxy:** it forwards zero incoming headers; the backend fetch lives in `frontend/lib/content/get-gp-availability.ts:77-110` with `cache: "no-store"`. Backend `Cache-Control: no-store` is currently dropped (route relies on `force-dynamic`). Consumer envelope pinned by `frontend/components/sections/SameDayBooking.tsx:202-219`: `{ ok, data: { slots, service, bookability, clinicTimezone } }`.

## 5. Scope

### 5.1 In scope

- Route, loader, database-phase, cache, serialization, and response-size instrumentation.
- New additive doctor-card and service-card projection endpoints.
- Explicit select clauses that fetch only fields required by the normalized card contracts.
- A frontend compatibility adapter with validation, logging, feature flags, and old-endpoint fallback.
- Consumer-by-consumer migration of public pages after contract parity.
- Batched country-level bookability data loading that still invokes the existing derivation semantics.
- Compression/header preservation for the same-origin GP availability route without changing its JSON data.
- Public shell/home dependency reduction where outputs are proven identical.
- Controlled load validation and reversible market-by-market rollout.

### 5.2 Out of scope for this plan's initial implementation

- Login, registration, password reset, 2FA, JWT, cookies, roles, authorization, and protected-route behavior.
- Changes to card design, markup, CSS, copy, interactions, or component logic.
- Changes to booking eligibility, availability horizons, slot generation, holds, prices, insurance, payments, refunds, appointments, or fulfillment.
- Database schema changes or migrations for the first release.
- Removing old endpoints.
- Replacing polling with WebSockets/SSE.
- Moving schedulers, documents, payments, or provider work to workers.
- Horizontal scaling, pool-size changes, or new infrastructure before instrumentation and a controlled retest justify them.
- Removing the universal cart request until an exact returning-guest and authenticated-cart hydration design is proven. The `gh_cart` cookie is HttpOnly, so a browser-only shortcut cannot safely infer that no saved cart exists.

## 6. Behavioral invariants

Every invariant needs an automated parity assertion.

### 6.1 Collection invariants

- Same active-country check.
- Same doctor `active` filter and primary/additional-country eligibility.
- Same service `isActive`, `visibility: PUBLIC`, active-country, and optional kind filter.
- Same locale normalization and fallback to the market default.
- Same result count for an unpaginated compatibility request.
- Same IDs, slugs, and deterministic order.
- Same featured doctor.
- Same doctor-service assignment order and membership.
- Same insurance options and patient-visible prices.
- No additional private fields.
- `bookabilityByServiceId` key coverage: every ID in a doctor's `assignedServiceIds` has an entry. `getDoctorServiceBookability` (`get-country-collections.ts:142-147`) returns a hard `UNAVAILABLE` for any missing key — a partial map produces valid cards with silently dead CTAs. Validation must assert key coverage, not only value validity.
- Featured-doctor parity: the same doctor (or none) carries `isFeatured` in old and new results. It drives the directory spotlight (`doctor-directory.ts:179`), the homepage FeaturedDoctor, and the service page's JSON-LD clinical-reviewer node (`services/[serviceSlug]/page.tsx:371`).

### 6.2 Doctor card invariants

The projection must supply the complete `CountryDoctorCard` shape used by current consumers:

| Group | Fields that must remain equivalent |
| --- | --- |
| Identity/navigation | `id`, `slug`, `fullName`, `title` |
| Card text/filtering | `bio`, `languages`, `specialties` |
| Media | `imageSrc`, `imageAltText`, `imageTitle`, `imageCaption`, `imageDescription`, `imageFocalX`, `imageFocalY`, `imageZoom` |
| Relationships | ordered `assignedServiceIds` |
| Trust | `imcRegistration`, `registrationNumber`, `registrationChamber`, `registrationDivision`, `registrationVerified`, `credentials`, `medicalRegistrationUrl`, `nonPhysician` |
| Display flags/links | `isFeatured`, public social links currently used by cards |
| Booking | `bookability`, complete `bookabilityByServiceId` for consumers that choose a service |

Implementation findings (Phase 4, 2026-08-30 — from the first implementation round, binding on any re-implementation of the adapter):

- `registrationNumber` is not emitted by the backend (the frontend derives it from `imcRegistration`) — the adapter keeps deriving it.
- The frontend mapper reads the chamber from `r.additionalCountries[0].chamberEntity` (`get-country-collections.ts:583-588`); a projection that drops `additionalCountries` and ships top-level `registrationChamber` must be shimmed back (`additionalCountries: [{chamberEntity: registrationChamber}]`) or cards lose their chamber prefix — highest-risk consumer difference.
- `nonPhysician` has no raw column; the mapper reads `r.editorialChecklist.nonPhysician` — ship a derived boolean and shim `editorialChecklist: {nonPhysician}`.
- The projection emits raw `fullName`; `marketDisplayName` stays a frontend-mapper transform.

`whatsappNumber` must not be introduced by the projection. It is present in the frontend type for historical/caller compatibility, but current public backend mapping deliberately strips the private number.

### 6.3 Service card invariants

The projection must supply the complete `CountryServiceCard` shape:

| Group | Fields that must remain equivalent |
| --- | --- |
| Identity/navigation | `id`, `slug`, `name`, `kind` |
| Card text | `summary` |
| Booking display | `durationMinutes`, `basePriceCents`, `currencyCode`, `bookability` |
| Media | `imageSrc`, `imageAltText`, `imageTitle`, `imageCaption`, `imageDescription` |
| Relationships | ordered `assignedDoctorIds` |
| Insurance | normalized `insuranceOptions` with the same company IDs, names, and prices |

Implementation findings (Phase 3, 2026-08-30 — from the first implementation round): the raw payload must also carry `isActive` (the frontend mapper drops rows where `isActive === false`). `insuranceSeoLine` is detail-contract-only (the card mapper never reads it) — omit from the projection. The legacy services asset select omits `title`/`caption`/`description`/`focalX`/`focalY`/`zoom`, so service `imageTitle`/`imageCaption`/`imageDescription` are always undefined in production today — copy the legacy select verbatim for parity; fixing it is a separate content decision.

Long detail bodies, FAQs, full translation relations, raw country objects, raw insurance coverage rows, payout rows, and unrelated SEO/editorial fields are not card contract fields. They may be omitted only from the new projection; the existing collection/detail responses remain unchanged.

### 6.4 Render invariants

- The same number of visible cards appears for the same URL and data.
- Cards have the same accessible names and heading levels.
- Profile/detail links and booking URLs are byte-for-byte equal.
- CTA enabled/disabled/returning state is identical.
- Missing doctor images still show `DoctorAvatarFallback`.
- Missing service images still use the existing no-image variant.
- Optional missing text uses the same current fallback string.
- No React error boundary, hydration mismatch, console error, unhandled rejection, or blank section appears.
- JSON-LD and internal links produced by a page remain equivalent.

### 6.5 Auth and cart invariants

- Anonymous public pages render their logged-out shell without `/api/auth/me`.
- A valid `gh-auth-hint` may trigger the current post-paint `/api/auth/me` request and upgrade the shell.
- The hint is never treated as authorization; backend auth remains authoritative.
- Patient, doctor, admin, and corporate users land in the same portal as before.
- Invalid, expired, revoked, or wrong-role sessions follow the same redirect/error paths.
- Guest and authenticated carts retain the same items, counts, hold expiry, and merge behavior.

## 7. Target architecture

### 7.1 Additive backend projections

Prefer distinct routes whose names cannot collide with `doctors/:slug` or service detail routing, for example:

- `GET /api/countries/:countryCode/doctor-cards?locale=EN`
- `GET /api/countries/:countryCode/service-cards?locale=EN&kind=GENERAL`

Route-conflict check performed 2026-08-30 against current source: **no conflict.** The siblings of `/api/countries/:countryCode/` are all distinct static children (`doctors` `country-scoped.route.ts:127`, `doctors/:slug` `:146`, `specialties` `:172`, `health-tests` `:194`, `plans` `:213`, `services` `:237`, plus `pages/:pageKey`, `page-content/:pageKey`, `legal`, `legal-documents/:type`); Fastify prefers static over parametric per segment; no `:wildcard` sibling exists; Next `rewrites()`/`redirects()` never match `/api/countries/*`; the `/api/public/[...path]` allowlist cannot reach it; `proxy.ts` does no `/api/countries` routing. The `/api/countries` prefix is already in `PUBLIC_READ_PREFIXES` (`frontend/lib/api/client.ts:63`) and `backend/src/utils/rate-limit-trust.ts:45`, so new routes inherit the raised SSR/build rate-limit bucket. Use param name `:countryCode`. Ship a route-table test as regression protection. The existing routes remain untouched:

- `GET /api/countries/:countryCode/doctors`
- `GET /api/countries/:countryCode/doctors/:slug`
- `GET /api/countries/:countryCode/services`

Each projection must:

1. Reuse the same request schemas for country, locale, and service kind.
2. Reuse `ensureCountryExists` and the current public cache policy.
3. Reuse the current locale merge functions rather than reimplementing translation fallback.
4. Use Prisma `select`, not a broad `include`, for card fields.
5. Reuse current filtering and ordering expressions.
6. Build normalized assignment IDs and insurance options with existing functions.
7. Return the existing `okResponse` envelope (`backend/src/utils/response.ts:1` — `{ ok, message, data }`; the collections put a bare array in `data`).
7a. Copy the existing route preamble pattern: `applyPublicCache(reply)` (`public, max-age=60, s-maxage=60, stale-while-revalidate=300`), zod `safeParse` on params/query, `ensureCountryExists`, `handleError`.
8. Expose a contract version in code/metrics, not as user-visible content.
9. Have focused response-schema tests that reject unexpected private fields.

### 7.2 Compatibility adapter

Add new fetchers beside the old ones in `frontend/lib/api/site-content-api.ts`. Add a compatibility layer beside `getCountryDoctors` and `getCountryServices` in `frontend/lib/content/get-country-collections.ts`.

Per request, the adapter performs this sequence:

1. Read a server-side feature flag scoped by projection, market, and consumer.
2. If disabled, call the old fetcher only.
3. If enabled, call the new projection.
4. Parse every required field and enum into the existing normalized TypeScript shape.
5. Verify internal relationships: unique IDs; assignment IDs are non-empty; every bookability map value is valid; **`bookabilityByServiceId` keys cover `assignedServiceIds`**; no duplicate card IDs.
6. If validation succeeds, return the new result.
7. If the request or validation fails, emit a sanitized fallback metric and call the old endpoint. Use a non-throwing logger for this — `logPublicContentFallback` throws during `next build` unless `ALLOW_DEGRADED_BUILD=1`, and a projection failure with a healthy legacy path must not kill prerender (learned in the first implementation round).
8. If the old endpoint also fails, preserve the current fail-loud behavior exactly: the existing `assertCollectionAvailable`/`PublicContentUnavailableError` semantics in `frontend/lib/content/public-content-source.ts`. A projection failure must never be converted into the confirmed-empty branch; do not invent data.

The adapter must not perform both requests on every production page. Shadow comparison is sampled and isolated from the user response.

### 7.3 Shadow parity

In local, CI, and confirmed non-production environments, request old and new data against the same seeded snapshot and compare canonical forms.

Canonical comparison must cover:

- collection count and ordered IDs;
- every normalized field used by cards, filters, SEO, or booking;
- bookability state, reason code, and timestamp;
- per-service bookability map keys and values;
- assignment order;
- insurance option order and price;
- absence of prohibited fields.

Production shadowing, if used, must be low-rate, read-only, bounded by a short timeout, excluded from the user critical path, and disabled automatically when error rate or origin load rises. Logs record only mismatch category, route template, market, locale, counts, and opaque IDs/hashes.

### 7.4 Bookability batching without rule changes

Batching is a later phase and must be separated from payload projection.

The batch implementation should load the country/service/doctor/slot inputs once, then feed the same inputs into the existing derivation rules. It must not create a new definition of bookability.

Required design constraints:

- Capture one `now` value for an entire comparison/request.
- Preserve primary and lookahead horizons.
- Preserve pause overlap calculations.
- Preserve approved-doctor filtering.
- Preserve service duration when deriving usable slots.
- Preserve the earliest timestamp choice for `BOOKABLE` and `RETURNING`.
- Preserve fail-closed error behavior.
- Preserve cache keys, TTL meaning, and invalidation triggers until parity is proven.
- Compare the old and batched results for every doctor, service, and doctor/service pair in fixtures containing pauses, no doctors, no slots, open slots, held slots, and lookahead-only slots.

Do not delete or bypass `deriveBookability`; make it the common oracle where practical.

### 7.5 Homepage and shell

After the projections are stable:

- Keep server rendering for the first visible content and crawlable card links.
- Replace full operational entities with normalized card projections only at consumers proven to need no detail fields.
- Keep homepage sort, featured-doctor choice, doctor count, service grouping, prescription aggregation, and booking-target choice unchanged.
- Consolidate shell reads only where cache keys, locale choice, invalidation tags, and response content remain equivalent.
- Do not convert required server data into a new client-side waterfall.
- Stream/lazy-render only below-fold presentation whose absence cannot affect metadata, structured data, navigation, initial card count, or booking state.

### 7.6 GP availability transfer

The first GP improvement is transport-only. Corrected model: `frontend/app/api/public/gp-availability/route.ts` is a thin re-serializer, not a header-forwarding proxy — zero incoming headers forwarded; the backend fetch lives in `frontend/lib/content/get-gp-availability.ts:77-110`.

- Return the same status and the exact envelope `{ ok: true, data: { service, clinicTimezone, slots, bookability } }` consumed by `SameDayBooking.tsx:202-219` and `book/page.tsx`.
- **Streaming is NOT safe here** (finding from the first implementation round): the upstream body is the `okResponse` `{ok,message,data}` envelope while the route emits `{ok,data}`; the lib normalizes partial bodies (`clinicTimezone ?? "UTC"`, `slots ?? []`); upstream failures are deliberately swallowed into `200` + empty result; a network throw has no upstream Response at all. Streaming would change status codes and body shape. Do not stream.
- Ship instead: an explicit `Cache-Control: no-store` header on the route's 200 and 400 (allowed strengthening), preserving request validation and the 1-30 day clamp byte-identically (including its no-integer-coercion behavior, e.g. `days=7.9` stays `7.9`).
- Add a byte-for-byte canonical JSON equivalence test pinning the envelope and the swallow-errors-to-empty semantics.
- **Rate-limit allowlist fix (same phase, additive):** `/api/public/gp-availability` and `/api/public/gp-languages` are missing from `PUBLIC_READ_PREFIXES` (`frontend/lib/api/client.ts:62-78`) and `backend/src/utils/rate-limit-trust.ts:44-67`, despite `client.ts:104-108` claiming otherwise. Both SSR reads fall into the shared 300/min egress-IP bucket — live 429 exposure under crawl/deploy load. Add both paths to both lists in lockstep.

Reducing days, truncating slots, pagination, or changing the visible slot list is not part of the transport-only release.

### 7.7 Cart optimization is deferred

The cart request is measurable overhead, but removing it from anonymous informational pages can break returning guest carts because `gh_cart` is HttpOnly. Do not implement a client-only `document.cookie` check.

A later proposal may use a server-derived non-sensitive cart-presence hint or route-scoped provider while preserving:

- returning guest cart restoration;
- authenticated cart restoration/merge;
- expired-hold messages;
- cart badge correctness;
- add/update/remove/clear behavior;
- checkout state.

Until those cases have parity tests, keep current cart hydration behavior.

## 8. Detailed implementation phases

No phase may start deployment until the preceding exit gate is satisfied.

### Phase 0 — Freeze the contract and create a reproducible baseline

Tasks:

- Record current HEAD and audit revision in benchmark artifacts.
- Create a confirmed non-production database snapshot with representative public records and neutralized integrations.
- Inventory all configured market/locale combinations from source rather than assuming every language belongs to every market.
- Export old doctor/service responses for synthetic fixture data only.
- Normalize volatile timestamps before golden comparison.
- Record cold and warm timings, TTFB, total time, status, compressed/uncompressed bytes, and connection reuse.
- Record SQL/query count, serialization time, event-loop lag, memory, and cache status once instrumentation exists.
- Capture screenshots and DOM/card counts for homepage, doctors, general consultation, specialist consultation, service detail, doctor profile, and booking pages.
- Save raw samples, command/config metadata, region, build SHA, and test data version.

Exit gate:

- Reproducible baseline artifact exists.
- No production credentials or personal data are present.
- Old normalized contract snapshots pass deterministically.

### Phase 1 — Instrument before optimizing

Tasks:

- Generate/forward an opaque request ID from Next to Fastify.
- Add backend route timing by normalized route template.
- Add phase timing around country validation, base query, locale merge, insurance normalization, bookability, serialization, and response write.
- Add response byte measurements and compression state.
- Add Prisma query count/time and pool wait/active/idle metrics through a supported instrumentation layer.
- Add Node event-loop delay and process CPU/RSS metrics.
- Add Next `Server-Timing` for shell and homepage loaders.
- Add cache hit/miss/stale/revalidation metrics without logging cache contents.
- Set cardinality limits: no raw path IDs, slugs, names, emails, tokens, or query text containing values.

Exit gate:

- A single homepage trace explains its Next and Fastify phases without sensitive values.
- Metrics overhead is below an agreed threshold and can be disabled independently.
- No response/body/cookie logging is introduced.

### Phase 2 — Write characterization and contract tests first

Tasks:

- Add golden fixtures for each supported bookability state and reason.
- Add doctor projection parity tests for primary-country and additional-country doctors.
- Add service projection parity tests for every service kind and optional kind filters.
- Cover requested locale, default-locale fallback, partially translated records, and missing optional media.
- Cover featured doctor, non-physician, verified/unverified registration, credentials, social links, multiple assignments, and empty assignments.
- Cover insurance pricing modes and the rule that only insurers with eligible doctors appear.
- Assert prohibited private/operational fields are absent from projection JSON.
- Add card component tests for complete data and every allowed optional-field omission.
- Add a test that invalid projection data causes old-endpoint fallback rather than `[]`.

Exit gate:

- New tests fail for the not-yet-implemented projection.
- Existing card, selection, content reliability, bookability, and auth tests still pass.

### Phase 3 — Implement additive service-card projection

Tasks:

- Add a narrowly named service function and route; do not edit the old route's return shape.
- Select only fields required by `CountryServiceCard` plus data required to derive those fields.
- Reuse current filters, sort, translation merge, assignment rules, insurance calculation, and bookability resolver.
- Keep cache directives and invalidation tags equivalent to the old public catalog.
- Add response schema and byte-budget tests.
- Benchmark the endpoint alone with batching still unchanged.

Exit gate:

- Canonical result is identical to the old normalized service cards for all fixtures/market-locales.
- No private or detail-only field leaks.
- New response is smaller and not slower at p50/p95 in the controlled environment.
- Old endpoint remains unchanged and passing.

### Phase 4 — Implement additive doctor-card projection

Tasks:

- Add a narrowly named doctor function and route; do not edit the old collection/detail route shapes.
- Select only fields required by `CountryDoctorCard` plus inputs required to calculate them.
- Preserve the exact primary/additional-country filter, full-name order, cap, market display name, translation fallback, featured-doctor setting, registration override, credentials, assignments, and public-contact stripping.
- Keep both general and per-service bookability values initially, even if they remain expensive.
- Add response schema, ordering, and byte-budget tests.
- Benchmark payload/query/serialization improvements before bookability batching.

Exit gate:

- Canonical result is identical to the old normalized doctor cards for all fixtures/market-locales.
- Private clinician contact fields remain absent.
- New response is smaller and not slower at p50/p95 in the controlled environment.
- Old endpoint remains unchanged and passing.

### Phase 5 — Add frontend fetchers and guarded adapters

Tasks:

- Fetch projections under the **same existing cache tags** as the legacy collections — `SITE_CACHE_TAGS.countryDoctors(code)` / `(code, locale)` and the country-services equivalents, with `revalidate: REVALIDATE_SECONDS`. Mandatory: there is no `/api/revalidate` route and no backend→frontend purge webhook; the ~20 admin/doctor mutation trigger sites (admin editors, `frontend/lib/server/revalidate-doctor-profile.ts:58-61`, country pages) enumerate tag names literally, so a projection fetched under only a new tag would never be invalidated.
- Build strict normalizers that return `CountryDoctorCard[]` and `CountryServiceCard[]`.
- Use existing parsing conventions; do not add a runtime validation dependency without approval.
- No flags (user decision 2026-08-30, see §12): the adapter always tries the projection first.
- Implement one-request fallback as specified in section 7.2.
- Add structured metrics for new success, validation failure, upstream failure, fallback success, and fallback failure.
- Ensure fallback is not cached as a successful empty projection.
- Ensure projection and legacy cache invalidation occur from the same admin mutations.

Exit gate:

- With flags off, network calls and rendered output are unchanged.
- With flags on and valid data, only the projection is on the user critical path.
- With injected projection failures, old cards render without a blank section.

### Phase 6 — Migrate public consumers by risk

Migrate one group at a time and keep independent flags.

1. Homepage service catalog cards.
2. Homepage doctor carousel and featured-doctor inputs.
3. Services/catalog pages that need only normalized service cards.
4. Doctor directory cards and filters.
5. General/specialist consultation pages.
6. Service-detail recommendation/doctor cards.
7. Booking pages that depend on `bookabilityByServiceId`, `assignedServiceIds`, `assignedDoctorIds`, and insurance options.
8. Doctor profile pages; prefer the existing doctor detail endpoint for the profile record and projections only for related cards.

For each group:

- Compare old/new server props.
- Compare card count/order and link targets.
- Run console/hydration checks.
- Run visual snapshots at mobile/tablet/desktop widths.
- Run configured market/locale coverage.
- Enable only that consumer in non-production, then canary.
- Observe at least one full cache TTL plus stale-while-revalidate interval before expansion.

Exit gate per group:

- Zero unexplained parity differences.
- Zero blank cards, 5xx errors, console errors, or hydration errors.
- Performance improves or remains neutral.
- Flag-off rollback is tested.

### Phase 7 — Batch bookability input loading

Tasks:

- Add query-count tests around old doctor/service collection summary construction.
- Build one country-level input loader for relevant services, approved doctors, pauses, settings, assignments, and open-slot inventory.
- Keep existing derivation as the final decision function.
- Run old and new summary builders with one frozen clock in tests.
- Test cache miss, cache hit, concurrent miss/single-flight, and invalidation after schedule/pause/assignment/booking changes.
- Prove held/booked slots never become advertised as open.
- Keep the old builder behind a separate kill switch.
- Do not combine this deployment with cleanup-job migration or cache-TTL changes.

Exit gate:

- Exact summary parity across the full matrix.
- Bounded query count independent of roster/service count, or a documented measurable reduction.
- Existing 13 focused availability/bookability tests plus new batch tests pass.
- Booking concurrency tests show no double booking or stale enabled CTA regression.

### Phase 8 — Reduce homepage/shell critical work

Tasks:

- Use the stable projections in existing parallel loaders.
- Measure whether repeated country/trust/site context data can be combined without changing cache tags or locale decisions.
- Keep metadata and first visible cards server-rendered.
- Avoid awaiting data not used above the fold only when removing it cannot change layout, SEO, counts, or links.
- Preserve `PublicAuthProvider` and conditional auth fetch exactly.
- Preserve cart hydration until the deferred cart design is approved.
- Measured opportunity: the global entry gate (`frontend/app/(global)/page.tsx:75-78`) calls `getCountryDoctors` once per country purely for `.length`. A per-country count read (following the `getPublicDoctorsCount` pattern) is an additive candidate, only with proven identical rendered counts.

Exit gate:

- Same HTML semantics, metadata, structured data, card counts, and links.
- Reduced origin calls and/or critical-path duration demonstrated by traces.
- Login/public-shell regression suite passes.

### Phase 9 — Optimize GP proxy transfer only

Tasks:

- Preserve request validation and the 1-30 day clamp.
- Preserve complete JSON semantics.
- Add safe compression/stream forwarding.
- Confirm abort/error handling and no sensitive header forwarding.
- Verify the widget's loading, retry, empty, unavailable, returning, and bookable states.

Exit gate:

- Canonical body equivalence.
- Same slot count/order and booking links.
- Smaller transfer or lower proxy overhead.
- No cache or freshness regression.

### Phase 10 — Controlled load and capacity decision

Tasks:

- Use only a confirmed non-production target and synthetic credentials.
- Run smoke, baseline, target, stress, spike, and soak in that order; stop on correctness/error thresholds.
- Test cold connections and reused keep-alive separately.
- Preserve every raw sample and environment identifier.
- Correlate p50/p75/p95/p99/max with event-loop, CPU, memory, DB query/pool, cache, and error metrics.
- Decide on worker separation, replicas, distributed rate limiting, and pool budget only from measured bottlenecks.

Exit gate:

- Public target budgets pass with less than 1% errors.
- No auth, card, booking, or cart correctness failures occur under load.
- Capacity recommendation names the measured limiter and includes rollback.

## 9. Required test matrix

### 9.1 Unit and contract tests

| Area | Required assertions |
| --- | --- |
| Doctor normalizer | required-field validation, all optional defaults, focal values, registration formatting, locale fallback, prohibited-field absence |
| Service normalizer | kind validation, prices/currency, media, assignments, insurance normalization, locale fallback |
| Bookability parser | all states/reasons, timestamp validation, fail-closed invalid input |
| Projection fallback | timeout, non-2xx, malformed JSON, invalid required field, invalid enum, duplicate ID, successful legacy fallback |
| Ordering | service kind/sort/name order; doctor full-name order; stable bookability priority preserving original position |
| Cache tags | admin mutation invalidates old and projection variants for affected market/locale |
| Card components | complete, missing image, missing optional text, unavailable/returning/bookable CTA, valid accessible link text |

Keep and extend the existing focused tests, including:

- `frontend/components/cards/DoctorCard.test.tsx`
- `frontend/lib/content/content-fetch-reliability.test.ts`
- `frontend/lib/content/doctor-directory.test.ts`
- `frontend/lib/content/service-doctor-selection.test.ts`
- `frontend/lib/content/specialist-doctor-selection.test.ts`
- `backend/src/modules/bookability/public-bookability-enrichment.test.ts`
- `backend/src/modules/bookability/bookability.summary.test.ts`
- `backend/src/modules/doctor-availability/doctor-availability.cache.test.ts`

### 9.2 Page/card integration matrix

Run every configured market/locale combination for:

| Surface | What must be checked |
| --- | --- |
| Country homepage | document status, featured doctor, doctor carousel, service catalog, counts, localized headings, profile/detail/book links |
| Doctors directory | card count/order, featured extraction, language/type filters, pagination if later added, booking states |
| General consultation | general-service set, eligible doctors, selection links, availability state |
| Specialist consultation | specialist-service set, eligible doctors, ordering, selection links |
| Service detail | selected service detail from existing detail source, related doctors, booking CTA, JSON-LD/internal links |
| Doctor profile | selected doctor detail from existing detail source, related services, registration/credentials, booking CTA |
| Booking | URL preselection, doctor/service compatibility, insurance options, slot lookup, unavailable/returning states |
| GP quick-book | language, seven-day request, slot count/order, timezone, retry and empty states |

For each surface assert:

- HTTP status is not 5xx;
- root page content and card containers render;
- expected card count is greater than zero only where the seeded fixture contains records;
- every rendered card has a non-empty title/name and a valid primary navigation target;
- no `pageerror`, console error, failed required request, hydration warning, or uncaught rejection occurs;
- screenshots have no blank card body, collapsed layout, missing CTA, or broken image placeholder.

### 9.3 Login and authorization regression matrix

Use existing Playwright login fixtures and non-production accounts.

Safety facts verified 2026-08-30: the Playwright config lives at the repo root (`playwright.config.ts`, `testDir: "./frontend/tests/e2e"`), `baseURL` defaults to `http://localhost:3000` via `E2E_BASE_URL`, and **no production guard exists** — `E2E_NO_WEBSERVER` disables the only localhost pin. Confirm `E2E_BASE_URL` is unset or non-production before any E2E run. The k6 harness is separately unsafe: `loadtest/config/targets.json` hardcodes Railway hosts with no env override, and `loadtest/config/cookies.json` is a **tracked file containing role session JWTs** (the audit's standing P0). Do not run the k6 harness against its configured targets under this plan.

| Scenario | Expected result |
| --- | --- |
| Anonymous opens `/login` | form renders, no console/server error |
| Anonymous opens public market page | logged-out shell renders; no unnecessary `/api/auth/me` |
| Patient login | same success response/cookies and redirect to patient account |
| Doctor login | same redirect and authorized doctor portal access |
| Admin login | same redirect and authorized admin access |
| Corporate login | same redirect and authorized corporate access |
| Signed-in user opens/refreshes public page | server HTML remains hydration-safe; post-mount auth shell upgrades correctly |
| Invalid credentials | same safe error and rate-limit behavior |
| Expired/revoked session | same rejection, hint clearing, and redirect behavior |
| Wrong role visits protected page | same denial/redirect; never a 500 |
| Logout | session and hint cleared; protected route no longer accessible |

At minimum retain/run:

- `frontend/tests/e2e/smoke.spec.ts`
- `frontend/tests/e2e/authz-boundaries.spec.ts`
- `frontend/tests/e2e/patient-portal.spec.ts`
- `frontend/tests/e2e/fixtures/auth.setup.ts`
- relevant role flows in `frontend/tests/e2e/portal-responsive-regression.spec.ts`

### 9.4 Cart and conversion regression matrix

- New guest with no cart.
- Returning guest with `gh_cart` created through the normal add flow.
- Authenticated user with an existing cart.
- Guest-to-authenticated merge, where supported by current logic.
- Add consultation, health test, and prescription.
- Update quantity/benefit/family target.
- Remove and clear.
- Expired hold message and item removal.
- Proceed from card CTA to booking and checkout.

The performance work fails if any cart state is lost or delayed in a way that changes the current visible behavior.

### 9.5 Performance protocol

- Warm-up runs are separate and not included silently.
- Run at least 30 samples for descriptive cold/warm comparisons; use a longer controlled run for meaningful p95/p99.
- Record DNS, connect, TLS, TTFB, download, total, status, compressed bytes, and uncompressed bytes.
- Use the same region, dataset, build mode, connection model, and load profile before/after.
- Test direct Fastify and browser-facing Next paths separately.
- Report median, p75, p95, p99, max, standard deviation/dispersion, throughput, and error rate; do not report only averages.
- Treat a result as inconclusive when environment drift or cache state is unknown.

## 10. Build and verification commands

Run from the repository root, type-checking packages separately as required by repository policy:

```text
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter backend test
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build
```

Notes verified against current source: there is **no root `test` script** (E2E is `pnpm e2e` from the root). Backend tests are safe by default — `backend/src/test-guard.ts` loads `.env.test` first (`DATABASE_URL` = `127.0.0.1:5433/global_health_test` wins over `backend/.env`'s production URL) and exits unless the DB host is localhost/test-named. DB-backed tests need the local test Postgres on 5433. The performance baseline must run the production build (`next build && next start`) — dev mode does not exercise the Data Cache. `next build` requires a reachable backend (`NEXT_PUBLIC_API_URL`, default `127.0.0.1:4000` from `.env.local`); a killed build leaves orphaned `next build` node processes that block later builds — kill by CommandLine match, never blanket node.exe. `projection-flags`-style modules and anything imported by `get-country-collections.ts` must NOT use `import "server-only"` — that file sits in a Client Component graph (via `book/_components/language-filtered-doctors.tsx`) and the marker breaks the build.

Run targeted Playwright projects/specs against a confirmed non-production environment with synthetic accounts. Do not run authenticated or mutating E2E tests against production.

Before every commit:

- inspect `git status` because the clone is shared;
- review the exact diff;
- stage only explicit owned paths;
- verify no secret or generated benchmark credential is included;
- do not push or merge `main` without explicit approval.

## 11. Observability and alerts

Required metrics:

- Next document and RSC duration/bytes by page template and market.
- Fastify duration, status, TTFB, serialization time, and response bytes by route template.
- Doctor/service base query count/time.
- Bookability query count/time and cache hit/miss/coalesced status.
- Prisma pool active/idle/wait and connection timeout.
- Node event-loop lag, CPU, RSS, and restart count.
- Projection validation/fallback count and percentage.
- New-vs-old shadow mismatch count by category.
- Browser page error, API error, and Core Web Vitals by page template/market.

Initial rollback alerts:

- any sustained increase in 5xx rate;
- projection fallback above 1% for five minutes;
- any login success-rate or auth/me regression relative to baseline;
- any blank-card/browser-error synthetic failure;
- any bookability parity mismatch;
- p95 or payload regression above the agreed baseline tolerance;
- DB pool wait/timeout or event-loop lag crossing the existing safe operating band.

Do not create high-cardinality labels from raw URLs, record IDs, emails, names, or tokens.

## 12. Rollout (revised 2026-08-30 by user decision: no feature flags, global always-on)

**User decision 2026-08-30 supersedes the original flag design:** no environment-variable switches. The projection path and bookability batching are always on, for every market and every consumer, from the deploy that ships them. Do not build flag plumbing.

What remains as the safety net, because it is automatic behavior rather than an operator switch:

- The adapter validates every projection response and **falls back to the legacy endpoint on any failure** (network, malformed payload, missing field, bad enum, duplicate ID, bookability-map key gap). A broken projection degrades to today's behavior, never to blank cards. This was exercised for real in the first implementation round: a production build against a backend without the new routes produced 204 projection 404s, 204 clean legacy fallbacks, and a fully rendered site.
- Legacy endpoints stay registered and operational — fallback target, and permanent home of `getPublicDoctorsForMarket` (sitemap/hreflang).
- Fail-closed bookability and `PublicContentUnavailableError` semantics unchanged.

Rollout: local seeded tests → CI contract/parity/build gates → deploy **backend before or together with frontend** (a frontend deployed ahead of the backend wastes one 404 round-trip per collection read before falling back) → verify with the §9.2 page matrix and a `probe.sh` rerun.

**Accepted trade-off (recorded):** with no flags, turning the fast path off in production requires reverting the code and redeploying the previous build, not a variable flip. The user explicitly chose this simplification.

## 13. Rollback procedure

Revised for the no-flag design (2026-08-30): the automatic legacy fallback absorbs projection failures at runtime without operator action. Operator rollback for anything the fallback cannot absorb is a code rollback:

1. A failing projection endpoint (5xx/404/malformed) self-heals per request via the adapter fallback — confirm fallback log volume and that cards render; no action needed beyond diagnosis.
2. For a behavioral regression the fallback cannot catch (wrong-but-valid data), roll back the deployment to the platform's last-known-good release.
3. Purge only the affected projection cache keys if necessary; do not purge unrelated public/auth/cart data.
4. Confirm card synthetic and login synthetic are green after rollback.
5. Preserve sanitized traces and mismatch categories for diagnosis.
6. Do not delete or mutate user data during rollback.
7. Do not retry mutating booking/payment requests as part of a public-read rollback.

Rollback triggers include:

- missing/blank cards;
- changed card ordering or links;
- changed bookability or CTA state;
- locale regression;
- login/session/role regression;
- rising 4xx/5xx or fallback rate;
- performance regression;
- private-field exposure.

A private-field exposure is an incident: disable the projection immediately, preserve evidence safely, assess caches, and follow the project's incident process.

## 14. Risks and mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Projection omits a hidden consumer field | Cards or booking can render incorrectly even if TypeScript compiles | Consumer inventory, runtime validation, golden normalized parity, staged migration. Known hidden consumer: `getPublicDoctorsForMarket` (`get-public-doctors.ts:302-317`) feeds `app/sitemap.ts`, `doctor-hreflang.ts`, `doctor-market-title.ts` with non-card fields — it stays on the legacy endpoint permanently |
| New endpoint conflicts with `:slug` route | Requests may hit detail handler | Use non-colliding route name and assert `app.printRoutes()`/route tests |
| Locale merge drifts | Wrong-language or empty card text | Reuse merge functions; fixture each fallback case; full configured market/locale matrix |
| Sorting changes | Featured/bookable cards move | Reuse order clauses and stable original-position tiebreaker; ordered-ID parity |
| Bookability batching changes time/input | CTA may be wrongly enabled | Frozen clock, shared derivation, exhaustive parity, independent flag, fail closed |
| Cache invalidation misses projection | Paused doctor/service or price remains stale | Shared mutation invalidation tests; short existing TTL; purge observation before expansion |
| Fallback masks persistent failures | Users render but latency remains high | Alert on fallback rate; never cache invalid projection as success |
| Shadow doubles origin load | Can worsen the problem being measured | Non-prod by default; sampled async production shadow; timeout/circuit breaker |
| Cart request removal loses returning cart | Conversion/data-loss perception | Defer until HttpOnly-cookie-aware design and parity tests exist |
| Auth is accidentally coupled to shell change | Login/avatar/role navigation breaks | Auth files frozen; explicit login synthetic during every rollout step |
| Metrics leak sensitive data | Privacy/security incident | Route templates and aggregate values only; log review tests |
| Shared clone causes unrelated edits | Commit contaminates other work | status/diff before edit and commit; explicit path staging only |

## 15. Pull-request sequence

Keep changes small enough to review and roll back independently.

1. **PR A — characterization tests and sanitized instrumentation**
   No response or behavior change.
2. **PR B — additive service-card projection**
   Backend route/service/tests only; no consumer enabled.
3. **PR C — additive doctor-card projection**
   Backend route/service/tests only; no consumer enabled.
4. **PR D — frontend projection fetchers, validators, flags, and fallback**
   Flags default off.
5. **PR E — homepage service/doctor consumers**
   Canary flag only; card components unchanged.
6. **PR F — directories and consultation consumers**
   Separate flags and parity artifacts.
7. **PR G — booking/detail related-card consumers**
   Highest contract sensitivity; only after preceding observation.
8. **PR H — batched bookability inputs**
   Independent flag and exhaustive correctness tests.
9. **PR I — GP proxy transport optimization**
   Same response semantics.
10. **PR J — measured topology/capacity follow-up**
    Only recommendations justified by post-change traces/load results.

Every PR must include:

- exact owned files;
- before/after contract result;
- before/after performance artifact;
- tests run and results;
- privacy/security check;
- feature flag/default;
- rollout and rollback steps;
- known limitations.

## 16. Definition of done

This plan is complete only when:

- [ ] Existing doctor/service endpoints remain compatible and available.
- [ ] Projection contracts are explicit and tested.
- [ ] All normalized fields used by cards, filters, SEO, and booking have exact parity.
- [ ] Private clinician/patient/auth data is absent from public projections and telemetry.
- [ ] Invalid projection data falls back to the old endpoint and does not blank cards.
- [ ] Card components and their visual/business logic remain unchanged.
- [ ] Bookability state/reason/timestamp and booking links are identical for the same input/clock.
- [ ] All configured market/locale page checks pass.
- [ ] Anonymous, patient, doctor, admin, and corporate auth flows pass in non-production.
- [ ] Guest/authenticated cart regression checks pass.
- [ ] Frontend and backend type-check, lint, tests, and frontend production build pass.
- [ ] No page errors, hydration errors, required-request failures, or 5xx regressions occur.
- [ ] Doctor/service list payloads are below 100 KB compressed and p95 total is below 500 ms in the controlled baseline environment, or any miss is documented and blocks rollout.
- [ ] Representative homepage p95 is below 1 second in the controlled baseline environment.
- [ ] Error rate stays below 1% under the agreed load profile.
- [ ] Raw measurement artifacts make the comparison reproducible.
- [ ] Rollback has been exercised, not merely documented.
- [ ] Legacy removal is deferred to a separate explicitly approved cleanup after the observation period.

## 17. First implementation ticket

The first code ticket should be limited to Phase 0 through Phase 2: reproducible baseline, sanitized instrumentation, and characterization tests. It must not change a production response, card component, authentication path, or bookability result.

Only after those tests establish the current contract should implementation proceed to the additive service-card projection.

## 18. Continuation context (2026-08-30 — for the session resuming this work)

A full implementation round was completed and then discarded from the working tree before commit ("removed everything"); this plan was re-fixed afterward and now embeds everything that round learned. State for the resuming session:

- git is clean at `9b850cf5`; nothing of the implementation survived. This document + memory file `project_perf_plan_execution_aug2026.md` are the complete guide.
- Final user decisions, not open for re-litigation: no feature flags or env switches of any kind (always-on in code); global — all six markets, no canary; rollback = redeploy previous build (§12/§13).
- The proven build order and every trap (chamber/editorialChecklist shims, `isActive`, non-throwing fallback logger, no `server-only` import in the get-country-collections graph, cache-tag reuse, key-coverage validation, batch/cache-key sharing, GP streaming-unsafe analysis, rate-limit lockstep fix) are recorded in §6-§7 findings blocks and §10 notes.
- Last round's proof points, reproducible: 183 frontend + 64 backend tests green; production build EXIT=0 against the Railway backend; during prerender every one of 204 projection 404s fell back cleanly to legacy with full page content.
- Process rule learned the hard way: commit each PR as it goes green (with the user's approval), so a single working-tree discard cannot erase the work again.

## 19. Implementation round 2 — what is now in the tree (2026-08-30)

Re-implemented after the round-1 discard, under the no-flag global design.
Everything below is uncommitted working-tree state at the time of writing.

### 19.1 Delivered

| Phase | Change | Files |
| --- | --- | --- |
| 3 | `listServiceCardsByCountry` + `GET /api/countries/:countryCode/service-cards` | `backend/src/modules/services/services.service.ts`, `backend/src/routes/country-scoped.route.ts` |
| 4 | `listDoctorCardsByCountry` + `GET /api/countries/:countryCode/doctor-cards` | `backend/src/modules/doctors/doctors.service.ts`, same route file |
| 5 | Projection fetchers (legacy cache tags) + always-on validating adapter with one-request legacy fallback | `frontend/lib/api/site-content-api.ts`, `frontend/lib/content/get-country-collections.ts` |
| 7 | `getCountryBookabilityBatch` + `readBatch*` readers, wired into the two projections only | `backend/src/modules/bookability/bookability.service.ts` |
| 9 | GP route `Cache-Control: no-store` (header only, no streaming) + `gp-availability`/`gp-languages` added to both public-read allowlists in lockstep | `frontend/app/api/public/gp-availability/route.ts`, `frontend/lib/api/client.ts`, `backend/src/utils/rate-limit-trust.ts` |

Tests added: `backend/src/routes/card-projections.test.ts` (24, including a
five-case drift guard that runs the same fixture through the projection's
replicated locale merge and through the exported `mergeDoctorTranslation` /
`mergeDoctorMarketTranslation`, so an edit to either helper cannot silently
diverge from the copy),
`backend/src/routes/card-projections.route-table.test.ts` (2),
`backend/src/modules/bookability/bookability.batch.test.ts` (7),
`frontend/lib/content/card-projection-adapter.test.ts` (14),
`frontend/tests/unit/gp-public-read-allowlist.test.ts` (5).

### 19.2 Design decisions made during this round

- **One shared row mapper, not a second normalizer.** The projections emit a
  raw-payload-shaped body and the frontend keeps its existing
  `CountryServiceCard` / `CountryDoctorCard` mapping code, now extracted as
  `mapServiceRow` / `mapDoctorRow` and called by both the projection and the
  legacy path. Card parity is therefore structural, not asserted field by
  field — one adapter test proves the two payloads yield `toEqual` cards.
- **`resolveTranslation` directly instead of `mergeServiceTranslation` /
  `mergeDoctorTranslation`.** Those helpers require the full display-field base
  type (including `detailBody`), which would have forced the projection to
  select the very columns it exists to drop. `resolveTranslation` *is* the
  fallback chain those helpers wrap; the projection applies it to the two or
  three fields a card renders, and the doctor projection replicates
  `mergeDoctorMarketTranslation`'s resolved-locale guard verbatim.
- **Batch by injecting a slot loader, not by forking `evaluateService`.**
  `evaluateService` gained an options bag (`skipExpiredRelease`, `loadSlots`,
  both defaulted to today's behaviour). The batch memoizes slot reads per
  `(doctorId, durationMinutes)` and sweeps expired holds once for the whole
  country. `deriveBookability` remains the only decision function.
- **The batch writes the per-item cache keys.** Same key format, same
  generation guard, so a later `getServiceBookability` / `getDoctorBookability`
  within the TTL hits the batch's entry instead of recomputing a possibly
  different answer. Pinned by a test.

### 19.3 Verification actually run

- `pnpm --filter backend typecheck` — clean. `pnpm --filter frontend typecheck` — clean.
- `pnpm --filter frontend lint` — 0 errors (15 pre-existing warnings).
  `pnpm --filter backend lint` — 1 pre-existing error in
  `modules/automation/refund-notifications.service.ts`, untouched by this work.
- **Full backend suite: 1856/1856 pass, 0 fail, 0 skipped.** A local PG18
  cluster was hand-built on `127.0.0.1:5433` for this (Docker does not start on
  this machine — see the local-test-db note), so the DB-backed tests that
  normally skip actually ran.
- A DB-backed integration suite was added,
  `backend/src/routes/card-projections.integration.test.ts` (12): it runs both
  projections and both legacy collections against real Postgres over
  `app.inject` and asserts same rows, same order, same card values, smaller
  payloads, no private clinician fields, 404 parity, kind filtering, and the
  query-growth gate. This is what proves the Prisma `select` clauses are
  actually valid — the mocked contract tests never execute them.
- `getPublicDoctorsForMarket` (the sitemap/hreflang feeder) is untouched and
  still calls the legacy `fetchDoctorsByCountry` directly, not `getCountryDoctors`
  — so it never reaches the adapter at all.
- `pnpm --filter frontend test` — 1134 pass, 5 skipped, 2 failures, BOTH
  reproduced on a clean tree at HEAD in the same machine state:
  `tests/unit/sick-cert-legacy-redirects.test.ts` (a real pre-existing
  assertion failure) and `tests/unit/ireland-core-page-seo.test.ts` (a 5 s
  test-timeout flake that only appears when the machine is loaded — it passes
  in isolation).
- Production build: `NEXT_PUBLIC_API_URL=https://api.myglobalhealth.online pnpm --filter frontend build`
  → **EXIT=0**, with **186 projection 404s all falling back cleanly to legacy**
  during prerender and every page rendering full content. That is the
  frontend-deployed-before-backend case proven safe (it costs one wasted
  request per collection read until the backend ships).

### 19.4 Phase 1 — instrumentation (delivered)

`backend/src/lib/perf/`, registered by one line in `app.ts`; deleting that line
disables the whole feature.

- `request-context.ts` — `AsyncLocalStorage` per request holding an opaque
  request id, a DB round-trip count, total DB ms, and named phase spans.
  `timePhase(name, fn)` wraps an expression without restructuring it.
- `instrument-pool.ts` — counts round trips at the `pg.Pool` boundary.
  Prisma's own `query` event fires in the engine's async context and therefore
  cannot be correlated with the causing request; the pool is ours and runs in
  the caller's context, which is what `AsyncLocalStorage` needs. Only elapsed
  time is read — never the SQL text or its bound parameters.
- `fastify-perf.ts` — one `perf` log line per request
  (`requestId, route, method, statusCode, totalMs, dbMs, dbQueries, phases,
  bytes, eventLoopLagMs, rssMb`) plus a `Server-Timing` response header.
  Cardinality is bounded by construction: `route` is Fastify's route TEMPLATE,
  never the resolved URL, so ids and slugs cannot become label values. An
  inbound `x-request-id` is echoed only when it is short and matches
  `[A-Za-z0-9._-]+`, so a caller cannot smuggle text into the logs.
- The frontend sends `x-request-id` on server-side reads only
  (`frontend/lib/api/client.ts`), so one page render is followable across both
  processes. Browser calls are left alone rather than widening the API's CORS
  `allowedHeaders`.
- `query` and `bookability` spans are timed inside both projections.

### 19.5 Measured results

**Query growth (the Phase 7 exit gate — "bounded query count independent of
roster size").** Measured on real Postgres via the perf instrumentation, cold
cache both sides, two markets with 1 and 5 doctors:

| Path | 1 doctor | 5 doctors | Growth |
| --- | ---: | ---: | ---: |
| legacy `/doctors` | 37 | 121 | **+84** |
| projection `/doctor-cards` | 26 | 38 | **+12** |

A ~7x shallower slope. Note the honest corollary, now pinned by the test's own
comment: the batch is a fixed country-level cost, so on a one-doctor market it
issues MORE round trips than the per-item path (which answers almost everything
from its 60 s cache). The gate is the slope, not any single fixture.

**Production baseline ("before"), `docs/audits/performance/baseline-2026-08-30/`.**
`probe.mjs` is re-runnable; `samples.json` holds every raw sample. 30 samples
each, 3 warm-ups discarded, sequential single-connection from one developer
machine — comparable only against a run made the same way from the same place.

| Target | p50 | p95 (directional) | max | decoded bytes | encoding |
| --- | ---: | ---: | ---: | ---: | --- |
| `/api/countries/ie/doctors?locale=EN` | 351 ms | 417 ms | 430 ms | 533,561 | br |
| `/api/countries/ie/services?locale=EN` | 380 ms | 429 ms | 464 ms | 271,174 | br |
| `/health` | 345 ms | 797 ms | 1,021 ms | 43 | — |
| `https://www.myglobalhealth.online/ireland/en` | 383 ms | 459 ms | 461 ms | 708,135 | gzip |

**URL correctness matters here and cost a wrong number once.** The first run
probed `https://myglobalhealth.online/ie/en` — the apex host, which 301s to
`www`, and the country CODE alias rather than the canonical SLUG the sitemap
and every internal link use. That run reported the homepage at p50 880 ms /
p95 1,123 ms; the same page probed correctly is p50 383 ms. The API keeps the
country code (`/api/countries/ie/...`), because that is what its route
parameter takes — only the site URL was wrong.

**Between-run variance is large.** The two runs above, minutes apart from the
same machine, moved `/doctors` p95 from 766 ms to 417 ms purely on CDN/origin
cache state. Per §9.5 this makes any single run directional: compare only runs
made the same way, from the same place, close together — and treat a result
as inconclusive when cache state is unknown.

The two projection targets are in the probe and currently return 404 — the
backend is not deployed yet. That is the "after" half of the comparison and is
the first thing to re-run post-deploy.

**Payload size** is asserted rather than quoted: the integration test requires
each projection to be strictly smaller than its legacy counterpart on the same
fixture. A representative production ratio needs the deployed endpoints.

### 19.6 Phase 8 — entry-gate count: analysed, deliberately NOT changed

`frontend/app/(global)/page.tsx` calls `getCountryDoctors` once per country
purely for `.length`. §8 lists a per-country count read as a candidate "only
with proven identical rendered counts" — and it provably is not identical:

- The gate SUMS per-country rosters, so a doctor active in two markets is
  counted twice. `countActiveDoctors()` (`GET /api/doctors/count`) counts
  distinct active doctors, so swapping it in would silently change a published
  stat. Multi-market doctors are a supported, used feature (`DoctorCountry`).
- A new per-country `count` would also diverge from `.length` by the 300-row
  cap and by any row the frontend mapper drops.

What the gate did get for free: those six reads now go through the projection,
so each is a much smaller payload. The remaining waste is real and worth a
follow-up — the gate triggers a full `getCountryBookabilityBatch` per country
to render a number that does not use bookability at all. Fixing that properly
means a count endpoint whose semantics are proven against production data,
which is a separate, evidence-gated change.

### 19.7 Browser verification against real content (2026-08-30)

Run from the production build (`next start`, launch config
`frontend-prod-build-prod-api`) with `NEXT_PUBLIC_API_URL` pointed at the live
backend. Because that backend does not yet serve the projections, this
exercises the ADAPTER AND FALLBACK path against real production content —
i.e. it answers "does anything regress before the backend ships", not "is the
projection fast".

Surfaces returning 200 with content: `/ireland/en` (708 KB),
`/ireland/en/doctors` (483 KB), `/ireland/en/gp-consultation-online`,
`/ireland/en/see-a-specialist`, `/ireland/en/book`, `/ireland/pt`,
`/portugal/pt`. The two consultation paths 308 to their market slugs, as
before.

The decisive check is local-vs-live parity on the same URL, same minute:

| `/ireland/en/doctors` | live `www` | local build |
| --- | --- | --- |
| doctor profile links | 22, in order | **identical, same order** |
| featured names | 7, in order | **identical, same order** |
| booking CTAs | 4 | 4 |

`/ireland/en/services/sick-certificate-ireland` likewise matched live exactly:
same H1, 4 related doctor cards, 2 booking CTAs, `€45`, and the same 9
sections — including the one empty section, which is therefore pre-existing
and not introduced here.

Two things this run surfaced that are NOT regressions, recorded so the next
session does not re-chase them:

- The global entry gate (`/`) threw `PublicContentUnavailableError` for
  pt/es/ro/br/ie. Cause: `PROXY_CLIENT_IP_SECRET` in `.env.local` is the dev
  value and does not match production's, so these SSR reads were not trusted
  and fell into the shared 300/min visitor bucket; the six-market fan-out then
  burst-429'd. A direct request seconds later returned 200. It also
  incidentally demonstrated the full designed chain end to end: projection 404
  → legacy → legacy 429 → fail-loud throw rather than an invented empty page.
- Images briefly reporting `naturalWidth === 0` were mid-decode; the optimizer
  serves them 200.

### 19.8 Not done / still open

- **Phase 10 (controlled load): the harness is now safe to point somewhere, but
  no run has been made.** The two blockers were fixed on 2026-08-30:
  `loadtest/config/cookies.json` is untracked and gitignored (it had been
  committed holding live PATIENT/DOCTOR/ADMIN/SUPERADMIN sessions, while
  `helpers.js` described it as gitignored all along), and
  `loadtest/config/targets.json` no longer defaults to the production Railway
  pair — both base URLs are empty, read from `LOADTEST_FRONTEND_URL` /
  `LOADTEST_BACKEND_URL`, and `helpers.js` refuses to start against a known
  production host unless `LOADTEST_ALLOW_PRODUCTION=1`. `pagesToBrowse` and the
  p95 threshold tag moved from the `/ie/en` code alias to the canonical
  `/ireland/en`; the threshold had been keyed to a tag no run would emit once
  the paths changed, and a threshold that matches nothing passes vacuously.
  **Untracking the file does not revoke those sessions — they remain in git
  history and must be invalidated separately** (token-version bump or auth
  secret rotation). Running the ladder still needs a non-production target with
  synthetic accounts.
- Phase 6's per-consumer migration bookkeeping is moot under the no-flag
  decision: the adapter sits at the getter, so every consumer moved at once.
  What remains from §9.2 is the rendered page matrix against a deployed
  backend — it cannot be run here, since no local environment has content.
- The "after" performance run, and therefore every §16 numeric budget
  (100 KB compressed lists, p95 < 500 ms, homepage p95 < 1 s).
