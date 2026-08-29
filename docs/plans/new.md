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
7. The old public collection endpoints remain available during rollout and can be restored immediately through a server-side feature flag.
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
- the authentication decisions and `gh-auth-hint` handling in `frontend/proxy.ts`
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
- The service list selects country, assets, assignments, translations, insurance coverage, and insurer/doctor relationships, then resolves one summary per service at `backend/src/modules/services/services.service.ts:476-576`.
- The doctor list selects specialties, translations, FAQs, assets, market registration, credentials, and assignments, then resolves doctor/service summaries at `backend/src/modules/doctors/doctors.service.ts:503-642`.
- The service evaluator releases expired holds and scans assigned doctors in bounded batches at `backend/src/modules/bookability/bookability.service.ts:190-265`.
- The normalized frontend contracts are `CountryServiceCard` and `CountryDoctorCard` at `frontend/lib/content/get-country-collections.ts:30-66,303-355`.
- Public auth is already deferred and conditional on `gh-auth-hint` at `frontend/components/layout/PublicAuthContext.tsx:51-71`; preserve this behavior.
- Cart hydration currently runs after every public-layout mount at `frontend/components/cart/CartContext.tsx:77-95`.
- The homepage GP proxy reserializes its complete result through `NextResponse.json` at `frontend/app/api/public/gp-availability/route.ts:11-26`.

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

Final names must be checked against the runtime route table before implementation. The existing routes remain untouched:

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
7. Return the existing `okResponse` envelope.
8. Expose a contract version in code/metrics, not as user-visible content.
9. Have focused response-schema tests that reject unexpected private fields.

### 7.2 Compatibility adapter

Add new fetchers beside the old ones in `frontend/lib/api/site-content-api.ts`. Add a compatibility layer beside `getCountryDoctors` and `getCountryServices` in `frontend/lib/content/get-country-collections.ts`.

Per request, the adapter performs this sequence:

1. Read a server-side feature flag scoped by projection, market, and consumer.
2. If disabled, call the old fetcher only.
3. If enabled, call the new projection.
4. Parse every required field and enum into the existing normalized TypeScript shape.
5. Verify internal relationships: unique IDs; assignment IDs are non-empty; every bookability map value is valid; no duplicate card IDs.
6. If validation succeeds, return the new result.
7. If the request or validation fails, emit a sanitized fallback metric and call the old endpoint.
8. If the old endpoint also fails, preserve the current page-level error/fallback behavior; do not invent data.

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

The first GP improvement is transport-only:

- Return the same status, envelope, slots, service, timezone, and bookability.
- Preserve `cache: no-store` behavior expected by the booking widget.
- Stream or forward the backend response where safe, or explicitly enable compression on the same-origin route.
- Forward only reviewed safe headers; never forward `set-cookie` or internal headers accidentally.
- Add a byte-for-byte canonical JSON equivalence test before and after the proxy change.

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

- Add cache tags for projections while retaining the parent old-route tags for coordinated invalidation.
- Build strict normalizers that return `CountryDoctorCard[]` and `CountryServiceCard[]`.
- Use existing parsing conventions; do not add a runtime validation dependency without approval.
- Add server-side flags with this minimum granularity:
  - doctor/service projection;
  - market;
  - consumer group;
  - global kill switch.
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

## 12. Feature flags and rollout

Minimum flags:

- `PUBLIC_SERVICE_CARD_PROJECTION_V1`
- `PUBLIC_DOCTOR_CARD_PROJECTION_V1`
- `PUBLIC_BOOKABILITY_BATCH_V1`
- `PUBLIC_GP_PROXY_STREAM_V1`
- per-consumer and per-market allowlists
- one global public-performance kill switch

Recommended rollout:

1. Local seeded tests.
2. CI contract/parity/build gates.
3. Confirmed non-production shadow comparison.
4. Internal traffic only.
5. Ireland/English canary for one low-risk consumer.
6. Expand percentage in steps while monitoring fallback, card synthetic, auth synthetic, p95, errors, and DB/event-loop metrics.
7. Expand to the rest of Ireland's configured locales.
8. Expand one market at a time across configured locales.
9. Migrate higher-risk booking/detail consumers last.
10. Leave legacy endpoints and rollback flags in place for at least one agreed release/observation period.

Do not roll out a projection and bookability batching simultaneously. Their metrics and rollback flags must remain independent.

## 13. Rollback procedure

Rollback must not require a new build for the primary failure modes.

1. Disable the affected consumer/market projection flag.
2. Confirm subsequent server requests use the legacy endpoint.
3. Purge only the affected projection cache keys if necessary; do not purge unrelated public/auth/cart data.
4. Confirm card synthetic and login synthetic are green.
5. If a backend error remains, disable the projection route globally and roll back the deployment using the platform's last-known-good release.
6. Preserve sanitized traces and mismatch categories for diagnosis.
7. Do not delete or mutate user data during rollback.
8. Do not retry mutating booking/payment requests as part of a public-read rollback.

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
| Projection omits a hidden consumer field | Cards or booking can render incorrectly even if TypeScript compiles | Consumer inventory, runtime validation, golden normalized parity, staged migration |
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
