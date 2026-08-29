# Feed availability visibility — implementation plan (2026-08-29)

**Status: IMPLEMENTED LOCALLY on 2026-08-29 — not deployed.** The booking-pause
model, authoritative availability policy, backend enforcement, public CTA states,
structured-data parity, and admin/doctor pause controls are implemented. The
notification opt-in described in Phase 7 is intentionally deferred because this
repository does not yet have the required consent, unsubscribe, and idempotent
delivery workflow; the UI therefore makes no notification promise.

### Local verification record

- Backend and frontend package type-checks pass.
- Focused backend suites pass (database-backed cases are skipped when the local
  PostgreSQL test service is offline); focused frontend suites pass 55/55.
- The production frontend bundle and TypeScript stages compile. Static prerendering
  cannot complete without the backend because the repository intentionally refuses
  degraded public content; no degraded build override was used as proof.
- The migration has been validated locally but has not been applied to production.
- Post-review hardening closes manual/admin/doctor/partner claim-time bypasses,
  invalidates availability caches after country and assignment changes, preserves
  editorial `updatedAt`/sitemap `lastmod` during pause changes, and keeps public
  content alive with a fail-closed booking state when enrichment fails.
- Public rosters use a stable `BOOKABLE` → `RETURNING` → `UNAVAILABLE` order.
  “Not accepting online bookings” cards stay rendered and crawlable at the end;
  explicitly featured doctors keep their featured placement.

## 0. Confirmed product decision

Temporary unavailability must affect **booking only**. It must not retire a public
doctor/service page or remove the entity's crawlable links.

- A temporarily unavailable doctor or service stays visible on its public content
  pages and listings. Its detail link stays a real crawlable `<a>`.
- Its Book action is visibly disabled with a localized reason. It has no booking
  `href`, click handler, or `begin_booking` event.
- GENERAL and SPECIALIST services/doctors follow this same rule. Specialist status
  never keeps a Book CTA active when the underlying doctor/service is unavailable.
- When a doctor has no known return date, the profile still stays live. Show
  "Not accepting online bookings" rather than a fabricated date. A separate
  "Notify me when appointments open" action may collect an explicit opt-in.
- In the booking wizard, unavailable services/doctors are not selectable. They may
  be omitted from a picker or shown disabled when the explanation is useful.
- A forged/deep-linked selection is rejected by the backend and reset with a clear
  message; UI state is never the enforcement boundary.
- HTTP status, robots, canonical, hreflang, sitemap membership, `lastmod`, and
  publication eligibility do not read availability or pause state.

"Keep the page in the index" means **keep it eligible for indexing**. Google decides
what is actually indexed.

`Doctor.active`, `Service.isActive`, and `Service.visibility` remain lifecycle
controls for genuinely removed/private content. Operations must not use them for a
holiday, a temporary pause, or a full diary.

---

## 1. Problems in the original draft

The original direction was right, but the proposed implementation was not safe
enough to build.

1. **Weekly windows are not real bookability.** A doctor can have an active weekly
   window while every compatible slot is BOOKED, HELD, or BLOCKED. The old plan
   knowingly called that `AVAILABLE`, contradicting its own goal.
2. **The old `RETURNING` and `LIMITED` rules overlapped.** A doctor returning in
   three weeks matched both states.
3. **`bulkRemoveSlotsInSpans` is not a complete away-period source of truth by
   itself.** It writes exceptions only for existing OPEN/BLOCKED slot rows and
   returns without writing any exception when none are removable. BOOKED/HELD and
   not-yet-materialized times are skipped, so future reads still need a proper
   pause/away source to avoid newly-opened capacity reappearing inside the break.
   See `backend/src/modules/doctor-availability/doctor-availability.service.ts:203-232`.
4. **Specialists cannot be blanket-exempt.** GENERAL and SPECIALIST services use
   the same slot-backed consultation/cart path. The specialist hub already has an
   eligible-doctor gate. A mixed GP/specialist doctor also needs a state scoped to
   the selected country/service, not a global exemption.
5. **An existing country-wide gate was omitted.**
   `CountryBookingSetting.bookingEnabled` already blocks public booking writes and
   must have highest precedence in the public state.
6. **Assignment predicates disagree.** Public service payloads require
   `ServiceDoctor.isActive && status === "active"`, while aggregated availability
   and cart validation currently check only `isActive` in some paths. The stricter
   predicate must be shared by reads and writes.
7. **The shared CTA cannot currently be disabled.** `BookCta` renders an active
   button/link and emits `begin_booking`; a disabled contract has to be added.
8. **Structured data is not already safe.** Consultation `Offer` nodes currently
   hardcode `availability: InStock`, and several service/hub schemas emit a
   `ReserveAction`. Those claims would contradict a disabled visible action.
9. **Several surfaces were missed.** `/health/[slug]` has three raw booking links
   driven by `template.ctaService`; service detail and consultation hubs emit
   booking actions/schema independently; country booking, tools, and hardcoded
   vanity pages also need an inventory pass.
10. **An inactive record and an unavailable record are different.** Current public
    service queries correctly exclude `isActive=false`. An owner-approved retired
    record must not be automatically republished merely to preserve SEO.

---

## 2. Four gates — never collapse them

| Gate | Source | Effect |
| --- | --- | --- |
| **Lifecycle / existence** | `Doctor.active`; `Service.isActive`; `Service.visibility`; active country/market membership | Whether the entity belongs on the public site at all |
| **Publication / index eligibility** | Existing content-completeness predicates | robots, sitemap, canonical/hreflang eligibility |
| **Booking policy** | country booking enabled; explicit doctor/service pause; active approved assignment | Whether online booking is allowed operationally |
| **Capacity** | an actual compatible OPEN slot in the public booking horizon | Whether the user can complete the current booking flow |

Availability may alter display order, badge, and booking-action state. It must never
flow backward into the first two gates.

---

## 3. Authoritative bookability model

### 3.1 Explicit pause state (schema change required)

Add a durable, auditable booking pause for doctors and services. Use either dedicated
pause records or equivalent validated fields:

- `bookingPausedFrom`
- `bookingPausedUntil` (nullable means indefinite)
- `bookingPauseReason` (admin/doctor-facing; public copy comes from localized reason
  codes, not raw free text)

Required rules:

- both endpoints are UTC instants derived from the market/doctor timezone;
- when an end exists, `from < until`;
- future pauses do not disable booking before `from`, but availability endpoints do
  not expose slots inside the pause span;
- clearing/expiring a pause restores policy eligibility automatically;
- setting a pause does **not** delete slots or cancel existing appointments;
- cancellation/release during a pause cannot make a slot publicly bookable because
  reads and writes check the pause independently of slot status;
- pause create/update/clear is audited and invalidates every availability cache.

This replaces the old plan's destructive reuse of per-slot exceptions. Existing
`DoctorAvailabilityException` remains the right tool for isolated removed times,
not a multi-week policy state.

### 3.2 One context-aware summary

Create one backend bookability service used by roster payloads, service payloads,
availability endpoints, and booking writes.

Public state:

| State | Exact rule | Public action |
| --- | --- | --- |
| `BOOKABLE` | lifecycle/publication unaffected; country enabled; no active doctor/service pause; approved assignment exists; at least one service-compatible OPEN slot exists within the same horizon the picker offers | Book enabled; expose the earliest verified slot as `nextAvailableAt` |
| `RETURNING` | currently paused with a known end **and** a compatible slot exists after the pause, or the first compatible slot is beyond the primary picker horizon but within the 90-day look-ahead | Book disabled; localized exact date when trustworthy |
| `UNAVAILABLE` | policy is disabled/indefinitely paused, no approved assignment, or no compatible OPEN slot exists within 90 days | Book disabled; no promised date; optional notification opt-in |

Keep an internal `reasonCode` (`COUNTRY_PAUSED`, `DOCTOR_PAUSED`,
`SERVICE_PAUSED`, `NO_APPROVED_DOCTOR`, `NO_OPEN_SLOT`) so UI copy is truthful.
Do not infer "Back {date}" from a weekly window alone.

A normal gap in the weekly schedule is **not** unavailability. The calculation looks
forward across calendar days, not only at today. For example, a doctor who works
Monday, Tuesday, Thursday, and Friday remains `BOOKABLE` on Wednesday when a real
Thursday slot is open. The public UI may show "Next available Thursday" while keeping
the Book CTA active.

The summary is scoped:

- service state = country + service + its approved active doctors;
- doctor state on a country page = country + doctor + at least one approved active
  consultation service in that country;
- doctor/service pairs use service duration, because an OPEN base slot may be too
  short for that service;
- multi-country doctors can therefore have different states per market.

`nextAvailableAt` is always the earliest actual compatible OPEN slot returned by the
same availability rules as the picker. The CTA should open the normal picker with
that date visible/selected where the current flow safely supports it; it must not
silently claim a specific time or reserve the slot before the user confirms it.

Use `listOpenSlotsForDoctorAndService` semantics (including contiguous-duration
checks), not a separate window approximation. Avoid N+1 work in public rendering:
compute in bounded batches or a write-invalidated read model, cache briefly, and
benchmark the six country rosters. Slot/window/pause/assignment/country-setting
writes must invalidate it. Never fall back to claiming `BOOKABLE` from windows when
the summary times out; return a controlled unavailable/error state without changing
page lifecycle.

Initial horizons are implementation defaults, not product blockers:

- primary picker/bookable horizon: the existing public picker horizon (currently
  14 days on the service-first flow);
- return look-ahead: 90 days;
- cache TTL: at most 60 seconds, plus existing page-cache time.

---

## 4. Server-side enforcement (source of truth)

The UI only explains state. Every public read/write path must use the same policy:

1. country `bookingEnabled !== false`;
2. service active + PUBLIC + correct country;
3. doctor active and rostered in that country;
4. `ServiceDoctor.isActive && status === "active"`;
5. no active service/doctor pause at the selected slot time;
6. slot belongs to the doctor, fits the service duration, is OPEN, and is atomically
   claimable;
7. existing insurer/network, commission-market, patient, and pricing gates still
   pass.

Apply this shared predicate to aggregated availability, doctor-specific
availability, GP assignment, cart add, direct appointment creation, and public
reschedule/follow-up paths. Admin manual-booking bypasses, if retained, must be
explicitly authorized and labelled; it must not happen accidentally because one
route forgot the pause.

Invalid `?service=`, `?doctor=`, `?slot=`, or `?at=` state is scrubbed and receives a
localized "not currently available" notice. It never turns the SEO page into a 404
and never silently books a different clinician.

`bookingEnabled=false` remains the outer country-wide kill switch already enforced
on appointment/cart writes. Entity-level availability is a narrower layer that must
compose with that setting, not replace it.

---

## 5. UI contract and surface inventory

### 5.1 Shared booking action

Extend `BookCta`/`BookNowButton` with a typed disabled variant:

- native `<button type="button" disabled>`; no `href`, `router.push`, or click
  handler;
- visible status text and accessible description;
- disabled action does not emit `begin_booking`;
- the separate View profile/Learn more link remains a normal crawlable anchor;
- Enquire/contact may remain a separate secondary link, but it is not relabelled as
  Book and does not imply that an online appointment can be completed.

All booking CTAs for the same entity on one page (hero, inline, sticky, closing band)
must consume the same server-provided state. No hydration-time active-to-disabled
flash.

### 5.2 Availability notification opt-in

For a doctor in `RETURNING` or `UNAVAILABLE`, the disabled Book control may be paired
with a separate active action: **"Notify me when appointments open."** This applies
equally to GP and specialist doctors.

The copy must reflect real consent state:

- before opt-in: "Notify me when appointments open";
- after a successful opt-in: "You're on the list. We'll email you when Dr {name}
  is accepting online bookings";
- without a successful opt-in, never say "We'll notify you" — that is a promise the
  system cannot fulfil.

The notification action is not a booking CTA. It must not navigate into booking or
emit `begin_booking`. It needs a small durable subscription record keyed to doctor +
market + user/email + locale, with confirmation, deduplication, unsubscribe,
rate-limiting, retention, and an auditable consent timestamp. Store a reason/status
code, not inferred medical information.

When the authoritative state transitions to `BOOKABLE`, dispatch one localized,
idempotent notification, record delivery, and stop notifying that subscription.
Retries must not send duplicates. If notification delivery is not implemented in the
same release, do not ship the opt-in control or the post-opt-in promise.

### 5.3 Required surfaces

| Surface | Required behavior |
| --- | --- |
| `/doctors`, country home carousel, featured doctor, doctor profile | keep cards/profile links; available-first stable sort; disabled Book + badge for RETURNING/UNAVAILABLE; show the notification opt-in where designed; never replace a featured doctor automatically |
| `/services`, service cards/catalog, service detail | keep service/detail links and copy; disable every entity-specific booking action consistently |
| GENERAL and SPECIALIST consultation hubs | apply the same gate to both kinds; no specialist exemption; keep informational hub content live |
| `/book` and `/consult/[serviceSlug]` | unavailable options omitted/disabled; deep links reset with an explanation; slot read and submit enforce the same predicate |
| GP quick-book (`HeroBookingWizard`, `SameDayBooking`) | include country/pause/assignment state in addition to their existing slot empty states |
| `/health/[slug]` | resolve `template.ctaService`; gate hero, body, and closing booking links; keep body service/detail links and doctor profile links |
| tools/service suggestions | retain informational suggestion/detail links; rank bookable first; disable/remove only the booking action |
| hardcoded/vanity pages (including `dr-renato`) | inventory and gate any affected booking link; no blanket out-of-scope exemption |
| generic header/footer Book links | remain generic when at least one country booking route is available; when the whole country is paused, the country booking page stays 200 but its controls are disabled |

Search for both `BookCta` and raw `Link`/`router.push` booking URLs; component reuse
alone does not cover all current entry points.

For content/listing pages, unavailable entities stay server-rendered and visible.
For booking pickers, hiding an unavailable option is allowed because those controls
are not the crawlable discovery surface.

---

## 6. Structured-data and SEO contract

1. Availability/pause fields are absent from publication validation, sitemap
   membership, `lastmod`, robots, canonical, hreflang, and title ownership.
2. The sitemap URL set and metadata output are identical before/after a pause for the
   same lifecycle/content fixture.
3. Every unavailable listing card retains its server-rendered detail anchor. Stable
   sorting may demote it but must not remove/collapse it from HTML.
4. `countActiveDoctors` and market-title logic continue to use lifecycle state only.
5. Doctor Physician schema can remain unchanged where it has no Offer.
6. When booking is unavailable, service/hub schema keeps truthful informational
   `Service`/`Medical*` data but omits the matching `ReserveAction` and any
   `Offer` that would claim `InStock`. General/specialist hub Offer arrays include
   only currently bookable offers. Do not invent `OutOfStock` or a return date in
   schema without separately validating that representation.
7. Visible CTA state, Offer state, and `potentialAction` must agree in the same SSR
   response.

Availability can change conversion behavior; it must not be used to add `noindex`,
remove internal links, change canonicals, or synthesize a new `lastmod`.

---

## 7. Scenario contract

| Scenario | Result |
| --- | --- |
| Active/public doctor with a compatible OPEN slot inside the picker horizon | BOOKABLE; page/listing unchanged |
| Doctor does not work today but has an OPEN slot tomorrow/next working day | BOOKABLE; CTA remains active; show "Next available {localized date}" and open the picker at that date |
| Doctor works Monday, Tuesday, Thursday, Friday and today is Wednesday | Wednesday is a normal schedule gap, not a pause; Thursday's verified OPEN slot keeps the doctor BOOKABLE |
| Doctor on a three-week explicit pause | RETURNING when a post-pause slot is verified; page/card remain visible; Book disabled |
| Doctor has weekly windows but all compatible slots are BOOKED/HELD/BLOCKED | RETURNING if a later OPEN slot is verified, otherwise UNAVAILABLE; never BOOKABLE from windows alone |
| A booked appointment is cancelled during an active pause | released slot remains absent from public availability and cannot be submitted |
| Active/public GENERAL service with no approved active doctor | UNAVAILABLE; detail page and Learn more stay live |
| Active/public SPECIALIST service or specialist doctor with no slot | same as GENERAL/GP; Book disabled with no exemption; doctor profile may offer the notification opt-in |
| Doctor has both GENERAL and SPECIALIST assignments | state is calculated per market/service; one assignment cannot exempt all CTAs |
| Doctor is unavailable indefinitely | profile/listing/detail links remain live; Book says "Not accepting online bookings"; no return date; optional "Notify me when appointments open" |
| Country booking disabled | public pages remain 200/index-eligible; all country booking selectors/actions are blocked by UI and backend |
| Future pause begins next week | pre-pause valid slots may be booked; slots inside the pause are not offered; pause does not cancel existing appointments |
| `Doctor.active=false`, `Service.isActive=false`, or service ADMIN_ONLY | lifecycle behavior unchanged; do not auto-publish |
| Existing inactive record should preserve an SEO page during a temporary outage | requires named owner/date confirming it is intended public supply, then restore lifecycle state and use booking pause; no bulk reactivation |
| Multi-country doctor | independent country/service states; global page lifecycle remains unchanged |

No roster "floor guard" is needed: unavailable cards stay rendered, so availability
cannot empty a hub. If every entity is unavailable, the hub shows the full
informational roster plus a clear no-online-booking message.

---

## 8. Delivery plan (TDD)

| Phase | Work | Required proof |
| --- | --- | --- |
| 0 — inventory | Focused repro for any claimed inactive item; enumerate every entity-specific booking entry point and schema action; no production writes | finding/inventory note with URL + component + backend route |
| 1 — RED | Write policy/state unit tests, route integration tests, CTA/component tests, sitemap/metadata/schema parity tests, and critical Playwright scenarios before implementation | tests fail for the intended reasons |
| 2 — pause model | Migration + validated/audited doctor/service pause APIs + country-setting integration + cache invalidation | migration test; authorization/input-validation tests; per-package type-check |
| 3 — shared backend contract | Context-aware summary; unify assignment predicate; wire all availability and public booking writes | unit + integration tests for GENERAL/SPECIALIST, duration, country, pause, assignment, insurer, and race cases |
| 4 — frontend rollout | Shared disabled CTA, payload types, stable sort/badges, all listed surfaces, deep-link notice, truthful pre/post notification copy, all six locale bundles | component tests; frontend type-check; locale-key parity |
| 5 — SEO parity | Remove false InStock/ReserveAction output while paused; prove sitemap, robots, canonical, hreflang, `lastmod`, and server-rendered detail links are invariant | focused SEO snapshots/tests |
| 6 — away UI | Admin + doctor portal set/schedule/clear pause without deleting slots; show existing appointments warning | Playwright: pause -> public blocked -> forged submit rejected -> clear/expiry restores booking |
| 7 — notification delivery | Consent-backed doctor availability subscriptions, confirmation/unsubscribe, idempotent state-transition dispatch, retry/deduplication | integration + E2E: opt in -> no premature promise -> BOOKABLE transition -> one localized notification -> no duplicate |
| 8 — verification/deploy | Backend/frontend type-check, focused suites, full relevant integration/E2E, accessibility/privacy check, performance measurement | all pass; touched policy modules at least 80% coverage |
| 9 — post-deploy | Live checks and two-week GSC page/impression watch; record implementation/deployment in the canonical SEO ledger | production evidence + `seo-control-state.md` update |

Type-check per package. Do not run a production-writing availability/backfill script
without dry-run output and explicit approval; `backend/.env` points at production.

---

## 9. Acceptance criteria

- Temporarily pausing a doctor/service never changes its public URL status,
  canonical, hreflang, robots, sitemap membership, `lastmod`, or crawlable detail
  links.
- Every entity-specific booking action and selector reflects the same server state.
- Unavailable controls cannot navigate, emit `begin_booking`, add to cart, create an
  appointment, or be bypassed with query parameters/direct requests.
- GENERAL and SPECIALIST consultation paths obey the same core policy.
- Specialist doctor/service CTAs are disabled whenever their authoritative state is
  RETURNING or UNAVAILABLE; no always-on specialist exception remains.
- A non-working day never disables Book when a compatible future slot exists inside
  the picker horizon; the earliest verified slot is shown as the next available date.
- Return dates are shown only when backed by a verified compatible future slot.
- An indefinitely unavailable doctor's profile remains live, shows no invented
  return date, and cannot start booking.
- "We'll notify you" appears only after a confirmed notification opt-in; each
  subscription receives at most one localized availability notification per
  qualifying transition and can unsubscribe.
- Existing appointments survive a pause; a cancellation during the pause does not
  reopen public booking.
- Structured data never says `InStock` or exposes `ReserveAction` for the exact
  entity whose visible Book action is disabled.
- Unit, integration, and critical E2E coverage pass, with at least 80% coverage on
  new policy/state modules.

### Implementation scope note

The booking-visibility release satisfies the booking and SEO behavior above locally.
The notification-specific acceptance criterion belongs to the deferred Phase 7 and
is not presented as complete. End-to-end pause/deploy proof and the GSC observation
window remain post-deployment work.

## 10. Separate follow-ups / non-goals

- Notification signup does not reserve a slot, guarantee an appointment, or imply
  priority access. The user still completes the normal booking flow after notice.
- A report that an actually inactive service is visible needs country + URL + record
  id. It does not block this feature.
- Retired/private records are not republished for SEO without an owner decision.
- Availability state does not guarantee ranking or index inclusion; post-deploy GSC
  observation is measurement, not an implementation gate.
