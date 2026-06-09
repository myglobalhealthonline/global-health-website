# Public Website Telemedicine UX/UI Upgrade Plan

> **Status:** Plan / pre-implementation. Authored 2026-06-09. No code changed yet.
> **Brand slogan:** *Medicine Anytime Anywhere*
> **Authoritative visual spec:** [`DESIGN.md`](../DESIGN.md) (dark forest + lime, Manrope). `direction.md` / `redesign-audit.md` are **superseded** for their light-hero + Geist recommendations.
> **This plan does NOT re-audit or re-derive what already exists.** It cites and builds on prior docs (see §16 references).

---

## 1. Scope

### Included — public/user-facing surface only (`frontend/app/(site)/**` + the components it consumes)

Localized i18n tree (`/[country]/[lang]/…`): country homepage, GP hub (`gp-appointment`), specialist hub (`see-a-specialist`), prescriptions hub (`repeat-prescription-request`, gated), lab-tests hub (`lab-tests`), per-service booking (`consult/[serviceSlug]`), doctors index + doctor profile, legacy `book-online`, cart, checkout (+ success/cancelled).

Global non-localized pages: `about`, `contact`, `faq`, `blog` + `blog/[slug]`, `privacy`.

Shared chrome: `SiteHeader`, `SiteFooter`, `MobileNav`, `SiteChrome`, `(site)/layout.tsx`, public sections/cards under `frontend/components/**`.

### Excluded from redesign (inspect-only for feature alignment)

- **Admin portal** `app/(admin)/**`
- **Doctor portal** `app/(doctor)/**`
- **Patient/auth portal** `app/(account)`, `app/(auth)/**`

Admin/backend were inspected **only** to learn real features (Prisma schema, public API). No portal UI is redesigned.

### Transactional pages left as-is (not marketing IA)

`patient-upload`, `reviews/rate`, `brazil/consent(/success)`, legacy redirect shims (`/cart`, `/checkout`, …). Touch only if they break brand consistency badly; otherwise out of scope.

---

## 2. Current Public Route Inventory

| Route | File | Source | Key issues |
|---|---|---|---|
| `/` | `app/(site)/page.tsx` → `CountryEntryGate` | API countries + doctor counts | **Chrome-less hard country wall**; zero content/SEO before pick; flag-glyph cards only |
| `/[country]` | `app/(site)/[country]/page.tsx` | redirect only | Server redirect to `/[country]/[lang]`; `notFound()` on unknown slug |
| `/[country]/[lang]` | `…/[lang]/page.tsx` | `getPublicPage('HOME')` + country collections | Main marketing page; image-light unless CMS hero set; unsourced "24h" claims |
| `/…/gp-appointment` → `general-consultation` | `…/general-consultation/page.tsx` | `getPublicPage('GENERAL_CONSULTATION')` + GENERAL services + doctors | Long-form GP copy **Ireland-only**; hero CTA = `#services` anchor; raw `<img>` hero |
| `/…/see-a-specialist` → `specialist-consultation` | `…/specialist-consultation/page.tsx` | `getPublicPage('SPECIALIST_CONSULTATION')` + SPECIALIST services | Thinner than GP; **`SpecialtiesGrid` computed but never rendered (dead/bug)**; no FAQ/disclaimer |
| `/…/repeat-prescription-request` → `prescriptions` | `…/prescriptions/page.tsx` | PRESCRIPTION services + `getPublicPage('PRESCRIPTIONS')` | **Feature-gated; GP-only in prod pending LegitScript**; provider-first copy |
| `/…/lab-tests` → `tests` | `…/tests/page.tsx` | health tests + `getPublicPage('HEALTH_TESTS')` | Add-to-cart grid; `notFound()` when feature off; no detail page |
| `/…/consult/[serviceSlug]` | `…/consult/[serviceSlug]/page.tsx` | services + `getServiceDoctorAvailability` | **Primary booking flow** (cart-first). Mode1 doctor-list / Mode2 `?doctor` slot picker; deep, conditional |
| `/…/doctors` | `…/doctors/page.tsx` | `getCountryDoctors` + `DOCTORS_INDEX` CMS | Card CTA = "View profile" (no direct book); filter chips = full server round-trips |
| `/…/doctors/[doctorSlug]` | `…/doctors/[doctorSlug]/page.tsx` | `resolveDoctorProfilePageData` | **Broken self-canonical: points to `/team/` route that does not exist**; many silently noindexed |
| `/…/book-online` | `…/book-online/page.tsx` | `BookingFormTemplate` | **Legacy** single-form path; reads `?type` `?doctor` `?service`; only footer + no-services fallback link here |
| `/…/cart` | `…/cart/page.tsx` | `useCart()` | **OFF-BRAND emerald/slate**; not on the luxury design system |
| `/…/checkout` (+ `success`,`cancelled`) | `…/checkout/**` | `useCart()` + Stripe | **OFF-BRAND**; raw ISO country text input; guest "view orders" hits auth wall |
| `/about` | `app/(site)/about/page.tsx` | hardcoded | Not localized; CTAs route to `/` (drops country); **no human imagery**; "get referrals/certificates" overclaim |
| `/contact` | `app/(site)/contact/page.tsx` | static + `ContactForm` | Not localized; no human imagery; email-only |
| `/faq` | `app/(site)/faq/page.tsx` | hardcoded `FAQ_GROUPS` | **Stale Wix copy — markets non-existent "Wellness plans" + "telemedicine devices"**; dead `{false && …}` |
| `/blog`, `/blog/[slug]` | `app/(site)/blog/**` | admin DB + static | Not localized; **renders admin HTML via `dangerouslySetInnerHTML`** (sanitize path must be verified) |
| `/privacy` | `app/(site)/privacy/page.tsx` | hardcoded | Only legal page found; footer links to terms/cookies/refund **not located — verify they don't 404** |
| `/patient-upload`, `/reviews/rate`, `/brazil/consent(/success)` | various | token/API | Transactional; out of marketing scope |
| `/cart`, `/checkout`, `/checkout/success`,`/checkout/cancelled` (non-i18n) | `app/(site)/{cart,checkout}/**` | client redirect shims | Legacy Stripe-return shims; resolve country from cart cookie |

### Locale / routing model (immutable)
- Country-first: `[country]` = clinic/business context (slug), `[lang]` = presentation only. **5 live markets**: `ie | pt | sp | cz | rm` (internal `sp`=es, `rm`=ro). Default country `ie`.
- 6 locales: EN, PT, ES, CS, RO, DE (`frontend/lib/i18n/types.ts`).
- **No `middleware.ts`** — Next 16 uses `frontend/proxy.ts` (auth-gates `/account|/admin|/doctor`, stamps `x-gh-*` headers). **Locale redirects happen in `next.config.ts` rewrites**, not proxy.
- Ads-safe friendly slugs are **rewrites** (`gp-appointment`→`general-consultation`, etc.) with reverse 301s; friendly slug is the canonical URL.

---

## 3. Portal Exclusions (confirmed)

`app/(admin)/**`, `app/(doctor)/**`, and patient/auth (`app/(account)`, `app/(auth)/**`) are **out of redesign scope**. They were inspected only via `backend/prisma/schema.prisma`, the Fastify public API, and `proxy.ts` gating to confirm what features exist. **No portal file is restyled.** The lock list (§ end) protects shared primitives (`CartProvider`/`useCart`, cart enums, checkout field names) that portals also depend on.

---

## 4. Current Navigation Audit

**Header** (`frontend/components/layout/SiteHeader.tsx`, dark/forest sticky):

| Problem | Detail |
|---|---|
| Booking is **not one-click** | Header "Book" → `general-consultation` **catalogue page**, not a booking widget. Then service → cart → checkout ≈ 3–4 more clicks |
| Book CTA **low prominence** | `gh-btn-ghost-dark` outline, visually identical to neighbouring "Log in" ghost button — no primary treatment |
| **Hidden on mobile bar** | Desktop CTA is `hidden md:inline-flex`; mobile Book lives only at the **bottom of the hamburger drawer** (2 taps) |
| Desktop vs mobile **destination mismatch** | Desktop → `general-consultation`; mobile → `gp-appointment` (same page via rewrite, but drift risk) |
| **Dead-ends with no country** | Both fall back to `/` (the gate) when no country resolved → booking intent lost |
| **No chrome on `/`** | `SiteChrome` suppresses header + footer when `pathname === '/'` → zero global booking entry on the gateway |
| Mobile header drops controls | Country/Language switchers are `md+` only; mobile bar shows logo + Cart + hamburger only |
| Dead nav data | `data/navigation.ts` (`headerPrimaryCta`, `footerColumns`, `footerCta`) all point at `/book-online` but are **unused** by live header/footer; `CTAFooter.tsx` unused |

**Footer** (`SiteFooter.tsx`): already carries the slogan ("Medicine anytime anywhere"). Care/Clinics/Account/Company columns; "Clinics" links drop locale (`/{slug}` bare). Social/phone/address render only with admin overrides → sparse by default.

**Current IA:** in-country = Home · Doctors · Services▾ (GP / Specialist / Prescription / Lab — feature-gated) · About · Blog · FAQ. Global = Home · About · Blog · FAQ · Contact. **No "How It Works" item.**

---

## 5. Proposed Navigation Structure

### Desktop header (in-country)
```
[Logo]   Home   Doctors   Services ▾   How It Works   About   Contact        [Cart]  Log in  [ Book Appointment ]
```
- **Add "How It Works"** (anchor to homepage `#how-it-works` or a short section). Keep Blog/FAQ inside `Services ▾` overflow or move to footer to reduce top-level clutter.
- **"Book Appointment" = the single solid pill**, visually dominant. Demote "Log in" to a plain text link so Book is the only button in the right cluster.
  - **Brand-compliant prominence (per `DESIGN.md` CTA discipline):** lime is *never* a button fill. On the dark forest header use a **solid white pill / forest text** (or solid mid-mint `#8FB021`) — high contrast against the ghost links, still on-brand. Document this as the one header-CTA exception to "outline on dark".
- **One-click rule:** Book CTA → **`/[country]/[lang]/book`** (new guided booking page, §6), not the catalogue. `Header → Book Appointment → /book` in one click.
- **Unify** desktop + mobile `bookHref` to the same `/book` target (kill the `general-consultation` vs `gp-appointment` split).
- **No-country fallback:** instead of dumping on `/`, send to `/{lastCountry||ie}/{defaultLang}/book` using the `gh-last-country` cookie already read in layout; only fall to `/` if truly unknown.

### Mobile
- Add a **persistent "Book" button in the mobile header bar** (not just the drawer) — thumb-reachable, filled. Keep the drawer's bottom Book button too.
- Optionally a **`StickyBookingCTA`** (new component, §10) on key pages (home, service hubs, doctor profile) — bottom sticky bar on `< md`, auto-hidden on cart/checkout/booking pages and respecting `motion-reduce`.

### Gateway `/`
- Either (a) keep chrome suppressed but **add a Book entry inside `CountryEntryGate`** (each country card gets a secondary "Book" action), or (b) **render a slim header** on `/` with the slogan + a single "Choose your country to book" CTA. Recommend (a) — least disruptive, keeps the gate's purpose.

### Nav QA (post-impl)
Header clear · mobile drawer works · Book CTA visible desktop **and** mobile bar · Book routes to `/book` in one click · no admin/doctor/account links promoted · auth flow (`proxy.ts` JWT gating) untouched · no horizontal scroll 320–1440.

---

## 6. Dedicated Booking Page Plan

### The problem to solve
Two competing booking systems coexist:
1. **Cart-first `/consult/[serviceSlug]`** (modern): service in URL path → pick doctor (`?doctor`) → 14-day slot picker → `ConsultationBookingForm` → `POST /api/cart/items` → `/cart?added=1` → checkout → Stripe (Appointment minted by webhook). **≈6–7 clicks.**
2. **Legacy `/book-online`** (`BookingFormTemplate`): reads `?type` `?doctor` `?service`; `POST /api/appointments` creates an Appointment immediately (+ optional Stripe). Free-form request possible. Footer still links here; header does not.

Inconsistent CTAs, duplicated slot/timezone logic, no service-agnostic entry, no slot deep-link.

### Decision: ONE canonical guided page at `/[country]/[lang]/book`

Make the **cart-first model canonical**. Build a single guided page that is the **service-agnostic umbrella** over the existing consult components, and **deprecate `/book-online`** (301 → `/book`, preserving params).

**Flow (each step renders only when the prior is resolved; deep-linkable):**

| Step | Reads | Behaviour | Data source (reuse) |
|---|---|---|---|
| 1 · Service | `?service=<slug>` / `?serviceId=` | If absent: service picker grouped GENERAL / SPECIALIST, **feature-gated** (honors GP-only). If present: skip to 2 | `getCountryServices(GENERAL,SPECIALIST)` |
| 2 · Doctor | `?doctor=<slug>` | List `ServiceDoctor`-assigned doctors as pick cards. If present: skip to 3 | `getCountryDoctors` filtered by `service.assignedDoctorIds` |
| 3 · Date + slot | `?slot=<id>` | 14-day, clinic-tz-aware slot grid; preselect from `?slot` | `getServiceDoctorAvailability(code,serviceSlug,doctorSlug,14)` |
| 4 · Patient details | — | name/contact + address (per `BookingSetting` requirements) + **dual GDPR consent** | `getServerAuthUser` prefill |
| 5 · Confirm | — | `POST /api/cart/items` (kind/serviceId/doctorId/timeSlotId + patient snapshot) → `/cart?added=1` | existing `useCart().add()` |

- `/book` (no params) → Step 1. `/book?service=X` → Step 2. `/book?service=X&doctor=Y` → Step 3. `/book?service=X&doctor=Y&slot=Z` → Step 3 with slot preselected.
- **Reuse `ConsultationBookingForm`** for steps 3–5 (extend it to accept `initialSlotId` so `?slot` works — today slot state is client-only React state, see §6.1).
- **Keep `/consult/[serviceSlug]`** as the per-service deep-link variant (service preselected by path). It already powers every live CTA; `/book` is the new front door, `/consult` is the same engine with service pre-filled. Optionally make `/consult/[serviceSlug]` a thin wrapper that renders the `/book` step machine with `service` fixed.
- **Step indicator** (1 Service · 2 Doctor · 3 Time · 4 Details) for orientation.
- **Empty states:** "No clinicians available for this service yet — browse our doctors" / "No open slots in the next 14 days — check back or pick another doctor." Never a bare `notFound()`.

### 6.1 Code hooks (exact)
- Service preselect already encoded in path (`[serviceSlug]`). For query-param entry on `/book`, resolve `?service` → serviceSlug server-side (mirror the `rawType`/`doctorSlugParam` reads in `book-online/page.tsx`).
- Doctor preselect already supported: `consult/[serviceSlug]/page.tsx` reads `sp.doctor` (no change needed for the doctor mechanic).
- **Slot deep-link (new):** add `slot?: string` to `SearchParams`, parse near the `?doctor` read, pass `initialSlotId` into `ConsultationBookingForm`, seed `useState(selectedSlotId)` from it instead of always `slots[0].id`.
- **Replace** the brittle client-side `new URLSearchParams(window.location.search).get('service')` read in `BookingFormTemplate.tsx` with a server-passed `initialServiceSlug` prop (only relevant while `book-online` lives; removed at deprecation).

### 6.2 Booking page UX requirements
Reachable in one click from header · manual service + doctor + date/slot selection on direct visit · slots shown as early as Step 3 · clear next step + step indicator · helpful empty states · mobile-first · preserves backend logic (cart-first, slot hold `heldUntil`, dual GDPR, atomic slot claim) · no long copy before the widget · slogan subtitle "Medicine Anytime Anywhere".

### 6.3 Subject-to-availability copy (Ads-safe)
> Choose a service, select a time that works for you, and speak with a healthcare professional online.
> Appointments are subject to clinician availability. You'll receive confirmation after completing your booking.

### 6.4 Booking implementation contract
- **Inputs:** `country`, `lang`, optional `?service` / `?serviceId`, optional `?doctor`, optional `?slot`, public feature gates, active service/doctor records, availability API result, optional authenticated user profile.
- **Output:** a guided booking state that resolves the earliest valid step, then adds a cart item through the existing cart-first path. Do **not** create an appointment directly from `/book`; appointment creation remains tied to the current cart/checkout/webhook path.
- **Invariants:** never bypass `isCountryFeatureEnabled`, `ConsultationSetting`, `ServiceDoctor`, `Doctor.active`, slot status, `heldUntil`, dual GDPR consent, or existing checkout field contracts.
- **Edge cases:** invalid/deactivated service slug, doctor not assigned to selected service, selected doctor hidden in the current country, `slot` no longer open/held by another user, prescription/test feature disabled after a user opens a deep link, country/language mismatch from an old link.
- **Fallback behaviour:** invalid params should reset the user to the nearest valid prior step with a short inline message. Use `notFound()` only for genuinely unknown country/lang/service routes, not for normal empty booking inventory.
- **Acceptance:** `/book`, `/book?service=X`, `/book?doctor=Y`, and `/book?service=X&doctor=Y&slot=Z` all produce predictable state without changing the cart API contract.

---

## 7. Admin Portal Alignment Findings

Backend = Fastify + Prisma + Postgres (`backend/prisma/schema.prisma`, 1832 lines). Public pages must reflect — and never over-claim beyond — this reality.

### What the backend actually supports
- **Services:** `Service.kind ∈ {GENERAL, SPECIALIST, PRESCRIPTION, HEALTH_TEST, HOME_DELIVERY}`; `@@unique([countryId, slug])`; price in cents + currency; `durationMinutes`; `ServiceTranslation` per locale. `Specialty` is a separate model (`SpecialtyTranslation`). `HealthTest` is its own top-level model (own price/stock/SEO + `HealthTestTranslation`).
- **Doctors:** `Doctor.active` = public visibility; `slug` per country; `DoctorSpecialty` M:N; photo via `Asset(kind=IMAGE, doctorId)`; `DoctorTranslation` (title/bio/SEO per locale); registration via `DoctorCountry.registrationNumber/chamberEntity/isVerified`. "Featured" stored in `Setting`, computed at serialize time.
- **Bookable mapping:** `ServiceDoctor` M:N decides which doctors are bookable per service.
- **Availability:** `DoctorAvailability` (recurring weekly windows) + `DoctorTimeSlot` (concrete UTC slots, status `OPEN/HELD/BOOKED/BLOCKED`, `@@unique[doctorId,startAt]` atomic claim). Slot duration from the Service.
- **Geo/timezone:** `Country` (code/slug/defaultLocale/currency/`enabledFeatures[]`); `CountryLocale`; **timezone lives on `BookingSetting.timezone`** (per-country IANA), drives both slot generation and display.
- **CMS:** `ContentPage` per `(countryId, pageKey, locale)`; `PageKey ∈ {HOME, GENERAL_CONSULTATION, SPECIALIST_CONSULTATION, DOCTORS_INDEX, PRESCRIPTIONS, HEALTH_TESTS}`; status DRAFT/PUBLISHED + `isActive`.
- **Media:** `Asset` (IMAGE/ICON/LOGO/BADGE/SOCIAL) + path fields on `Service.galleryImagePaths[]`, `HealthTest.productImagePath`, `ContentPage.heroImagePath`. Admin upload route serves via `/api/media/**`.
- **Pricing/payments:** Stripe scaffolded; prices in cents; `Cart`/`Order`/`Payment` ledger; `PaymentStatus`. (Payments env-gated; see §16 constraints.)
- **Three independent visibility gates** compose on every public page: row `isActive`/`PUBLISHED` + `Country.enabledFeatures[]` (`isCountryFeatureEnabled`) + `ConsultationSetting.enableGeneral/Specialist`.

### Public/backend gaps (align or flag)
| Gap | Action |
|---|---|
| `PricingPlan` model exists, **no public pricing page** | Don't invent a pricing page now (payments skipped this launch); leave for later phase |
| `HealthTest` rich detail fields exist but **no detail page built** | Optionally add a health-test detail page later; lab-tests listing stays |
| **Two booking systems** | Unify on cart-first `/book` (§6); deprecate `/book-online` |
| `book-online` copy "manual clinic follow-up… when backend integration available" | **Stale claim contradicting live Stripe+slot flow** — remove at deprecation |
| Prescriptions intentionally downgraded for Ads | **Keep gated** (GP-only) until LegitScript |
| `consultationType` fragmented across 4 representations | Don't surface raw type to users; rely on Service/ServiceKind |
| FAQ advertises non-existent "Wellness plans" / "devices" | **Rewrite** (§13) |
| `ConsultationMode.IN_PERSON` + `Clinic` model exist | Public framing stays telemedicine-only; don't surface in-person |
| Reviews aggregate may be **admin-entered, not live** | Don't imply live third-party verification beyond what's true |
| `structured-data.ts`, `page-seo.ts`, `sitemap.ts`, `llms.txt` still advertise `/book-online` | Update only after `/book` exists; query-param booking states canonicalize to `/book` |
| No obvious public analytics layer found | Add privacy-minimal measurement only if consented; never send symptoms, names, emails, doctor names, slot timestamps, or service-specific medical details to client analytics |

**Rule:** if a public page claims something the backend can't back (e.g. guaranteed prescription, "same-day" as fact), reword or remove (§13). If a backend feature is missing publicly and in-scope (e.g. one-click book, doctor preselect), add it (§6).

---

## 8. User Journey Problems

1. **Country wall first** — no value/SEO content before a country is chosen; the gate is chrome-less.
2. **Booking buried** — header CTA lands on a catalogue, not a booking widget; ~3–4 extra clicks; ~6–7 total to paid booking.
3. **Two booking flows** with different mechanics and inconsistent CTAs (header→consult, footer→book-online).
4. **No service-agnostic booking entry** — you must already know the serviceSlug; no `/book` umbrella.
5. **No slot/doctor deep-link** — slot state is client-only; can't share/resume a chosen time.
6. **Doctor index has no direct book** — card CTA is "View profile" only.
7. **Off-brand cart/checkout** — emerald/slate utilities look like a different product mid-funnel (trust drop at the highest-intent moment).
8. **Text-only inner pages** — shared `PageHero` has no image slot; About/Contact/How-It-Works/most service heroes are imagery-free.
9. **Context loss** — global pages (About/Contact/FAQ/Blog) link CTAs to `/`, dropping the chosen country.
10. **Compliance exposure** — risky DB service summaries + stale FAQ + missing disclaimers on most pages/markets.

---

## 9. Recommended New User Journey

```
Home (/[country]/[lang])
  └─ Book Appointment ─────────────► /book  (Step 1 service → 2 doctor → 3 slot → 4 details → confirm)
  └─ Services ▾ ► GP / Specialist hub
        └─ Service card "Book this service" ► /book?service=<slug>   (jumps to Step 2)
  └─ Doctors ► /doctors
        └─ Doctor card "Book with this doctor" ► /book?doctor=<slug> (Step 1 with doctor pre-bound)
        └─ Doctor profile ► service card ► /book?service=<slug>&doctor=<slug> (Step 3)
  └─ How It Works · About · Contact · FAQ · Blog
Booking ► /cart ► /checkout ► Stripe ► success
```

Every service card and doctor card preserves selection into `/book`. Homepage + hubs surface the Book CTA **above the fold** and repeat it at natural points. Earliest possible slot visibility = Step 3 of `/book` (or immediately when service+doctor are deep-linked).

---

## 10. Page-by-Page Improvement Plan

> Visual rules per `DESIGN.md`: dark forest hero/closer only (max 2 dark sections/page), lime `#B0F122` accent never a button fill, forest `#1D4B36` CTA fill on light, Manrope, strict `--text-*` tokens, motion = CSS only (no framer/GSAP), single-level cards, no 3-up identical grids (featured-first/asymmetric).

### 10.1 Homepage `/[country]/[lang]`
- **Purpose:** main conversion page. **Issues:** image-light; unsourced "24h" claims; CTAs to `#services`.
- **UX/CTA:** Hero primary CTA → `/book` (not anchor); add secondary "View Services". Add `StickyBookingCTA` on mobile. Surface slogan in hero eyebrow/headline.
- **Content:** soften "24h Same-day" → "Same-day slots often available" + "subject to availability" (§13). Keep "same doctor you book with" point, drop "actually pick up" absolute.
- **Imagery:** `HomeHero` already has a telemedicine photo (good). Ensure non-IE markets get a generic human fallback, not Ireland reuse.
- **Sections (keep order, dark budget ≤2):** HomeHero(dark) → TrustRibbon(light) → ServiceCatalog(dark, no glow) → DoctorWall/FeaturedDoctor(light/mint) → HowItWorks → ReviewBadge → FinalCTA(dark).
- **Files:** `…/[lang]/page.tsx`, `HomeHero.tsx`, `TrustRibbon.tsx`, `FinalCTA.tsx`.

### 10.2 GP hub `gp-appointment` (`general-consultation`)
- **Issues:** long-form copy Ireland-only; hero CTA = anchor; raw `<img>` hero. 
- **Changes:** hero CTA → `/book?service=<first GENERAL slug>` or `/book`; extend the Ireland GP long-form pattern (`ireland-service-content.ts`) to other markets via CMS `GENERAL_CONSULTATION` body so non-IE isn't bare; route service cards → `/book?service=<slug>`.
- **Imagery:** give `PageHero` an optional image slot (§11); add human GP imagery.
- **Compliance:** keep/extend `MedicalDisclaimer` to all markets.

### 10.3 Specialist hub `see-a-specialist`
- **Bug:** `SpecialtiesGrid` is computed but **never rendered** — either render it or delete the dead computation.
- **Changes:** add FAQ + disclaimer (parity with GP); service cards → `/book?service=<slug>`; hero CTA → `/book`.

### 10.4 Prescriptions hub `repeat-prescription-request` (gated)
- **Keep feature-gated / GP-only** until LegitScript. Maintain clinician-led copy. Fix the **DB summaries** behind it (HRT/contraceptive CRITICAL, §13) even while hidden, so nothing risky ships if toggled on.

### 10.5 Lab-tests `lab-tests`
- Keep add-to-cart grid; richer empty state; consider a health-test **detail page** later (backend fields exist). Rounded prices → show cents consistently.

### 10.6 `consult/[serviceSlug]`
- Becomes the per-service deep-link into the `/book` engine; add `?slot` preselect; fix ugly metadata title fallback (literal slug). Keep cart-first POST path.

### 10.7 Doctors index `/doctors`
- **Add direct "Book with this doctor"** on each card → `/book?doctor=<slug>` (keep "View profile" secondary).
- Consider client-side filtering (current chips = full server round-trips) — optional perf item.

### 10.8 Doctor profile `/doctors/[doctorSlug]`
- **Fix broken canonical** (`/team/` → real `/doctors/` route) — SEO bug.
- "Book with this doctor" hero CTA → `/book?doctor=<slug>`; service cards → `/book?service=<slug>&doctor=<slug>`.
- Replace no-services fallback link to legacy `/book-online` with `/book?doctor=<slug>`.
- Add portrait to booking confirm step.

### 10.9 Cart + Checkout (highest-value visual fix)
- **Re-skin to the design system** (`.gh-*`, forest + lime, Manrope) — single biggest visual win. **Restyle only.**
- **LOCKED:** do not change checkout form field names, `autocomplete` attrs, `data-testid`, cart `kind` enum, `heldUntil` hold, Stripe disclaimer text. (See lock list.)
- Replace raw ISO country **text input** with a select.
- Guest "View my orders" → don't force `/account` auth wall for guests (link to order receipt by `orderId`).

### 10.10 About
- Localize or at least keep country context (CTAs → `/{country}/{lang}/book`, not `/`). Add human/team imagery. Surface slogan in mission. **Fix copy:** condition "referrals/certificates" on clinical appropriateness; soften "within the hour" → "usually the same day" (§13).

### 10.11 Contact
- Keep country context; add warm human imagery; add "Need care now? Book an online consultation" CTA → `/book`. Add `ContactPoint` JSON-LD.

### 10.12 FAQ
- **Rewrite entirely** — remove non-existent "Wellness plans" / "telemedicine devices" / "always protected" (§13). Add "online consultations are not for emergencies — call 112". Remove dead `{false && <FAQSection/>}`. Add `FAQPage` JSON-LD.

### 10.13 Footer
- Already has slogan. Fix "Clinics" links to include locale; add disclaimer line; ensure Book Appointment + Services + Contact prominent; don't over-emphasize portal links. Remove dead `data/navigation.ts` / `CTAFooter.tsx` if confirmed unused.

### 10.14 Blog
- **Verify `sanitize-html` is actually invoked** on the `dangerouslySetInnerHTML` render path (open deferred item). Keep CTA in country context. `next/image` for cover.

### 10.15 SEO / discovery surfaces
- Update `frontend/lib/seo/structured-data.ts` site-search target away from `/book-online` once `/book` ships.
- Update `frontend/lib/seo/page-seo.ts`, `frontend/app/sitemap.ts`, and `frontend/app/llms.txt/route.ts` so public discovery links do not promote deprecated booking routes.
- Add canonical + hreflang handling for `/{country}/{lang}/book`. Query-param booking states (`?service`, `?doctor`, `?slot`) should canonicalize to the clean `/book` URL and should not create duplicate indexed pages.
- Keep service detail pages indexable; keep checkout/cart/success/cancelled and slot-specific URLs out of organic indexing.

---

## 11. Image and Visual Asset Plan

### Mechanics (critical)
- `next/image` is used but **`unoptimized`** for all CMS/remote media; `next.config.ts` `remotePatterns` only allows the API media origin **when `NEXT_PUBLIC_API_URL` is set**. New remote hosts are rejected.
- **Highest-leverage change:** `frontend/components/sections/PageHero.tsx` has **no image prop**. Add an optional image slot → fixes About/Contact/Doctors/GP/Specialist/Tests/Prescriptions heroes in one component, not seven pages.
- **Source strategy:** **download vetted free stock (Unsplash/Pexels/Pixabay) into `/public/images/**` and commit them** — avoids hotlinking, licensing fragility, and `next.config` domain changes; bundled images get optimized. Only add `remotePatterns` if a real image CDN is adopted.
- Replace Ireland-only `*-ai.svg` / `*-placeholder.svg` fallbacks with generic human telemedicine imagery so non-IE markets aren't placeholder-y.
- **Revive, don't rebuild:** dead-but-ready `HowItWorks.tsx` (step photos + `/public/images/how-it-works/step-1..3.png`), `HealthcareMediaFrame.tsx`, `BookingCTA` aside image.

### Where imagery goes
| Surface | Image type | Source |
|---|---|---|
| Home hero | doctor↔patient video consult (exists) | bundled, ensure non-IE fallback |
| GP / Specialist / Tests / Prescriptions heroes | calm consultation / clinician with tablet | new bundled via PageHero slot |
| `/book` page | supportive healthcare visual / patient on laptop | new bundled |
| Doctors index + profile | portraits (exist) + warm directory header | Asset + bundled header |
| About | team / human healthcare environment | new bundled |
| Contact | friendly support scene | new bundled |
| How It Works | 3 step illustrations | revive existing PNGs |
| Final CTA | (intentionally photo-free) | — |

### Image rules
- Every meaningful image gets **descriptive alt** (e.g. "Doctor speaking with a patient during an online consultation"). Improve templated alts in `ServiceCatalog`/`ServiceCard` and CMS-hero alts.
- Avoid: graphic/surgical/blood, fake before/after, fear-based, guaranteed-treatment implications, text/logos.
- Explicit `width`/`height`, no layout shift, `priority` for hero only.
- AI-generated or stock images are generic brand imagery only. Do not use them as a substitute for real doctor portraits, clinician identities, badges, licenses, or proof claims.
- **TODO/licensing:** record source + license per committed image in `docs/media-asset-upload-guide.md`; if an image needs owner approval, ship a safe bundled placeholder and flag.

---

## 12. Slogan Usage Plan — *Medicine Anytime Anywhere*

| Location | Status | Action |
|---|---|---|
| Footer tagline + bottom bar | ✅ present | keep |
| Homepage hero | ❌ (HomeHero says "Meet our licensed doctors") | add as eyebrow/lead line |
| `/book` page subtitle | ❌ | add subtly under the title |
| About mission | ❌ | weave into mission statement |
| Metadata/SEO | partial | include in home + book metadata description |

Use as a **brand line, not spam** — not on every card. (Note: login uses a different "Medicine without borders" variant — leave portal copy alone, but the public marketing slogan is "Medicine Anytime Anywhere".)

---

## 13. Google Ads Policy & Healthcare Content Review Findings

> Best-effort review applying general healthcare-advertising safety + Google Ads restricted-services principles (no live policy browse). Copy lives in **DB `Service.summary`** (edit via `/admin/services`; live dump at repo-root `C:Tempservices.json`), **`ContentPage` CMS**, and **hardcoded React strings**.

| Page / source | Risk | Issue | Suggested safer copy |
|---|---|---|---|
| **HRT prescription** `Service.summary` (hrt-prescription-ie) | **CRITICAL** | "receive your prescription the same day" — prescription-medicine promotion + guaranteed outcome pre-assessment | "Menopause & HRT consultation with a doctor registered with the Irish Medical Council. The doctor reviews your symptoms and decides whether HRT is clinically appropriate. A prescription is issued only where suitable following assessment, and is never guaranteed." |
| **Contraceptive pill** `Service.summary` (contraceptive-pill-ie) | **CRITICAL** | "Get a prescription… posted to your door" — restricted-medicine supply + guaranteed issuance/fulfilment | "Contraceptive pill consultation with an IMC-registered doctor. Where clinically appropriate, the doctor can issue a prescription. Issuance is at the doctor's discretion following assessment and is not guaranteed." |
| **Cardiology** `Service.summary` | HIGH | "expert cardiologists… diagnosis… personalised treatment plans" — superlative + guaranteed diagnosis/treatment over video | "Online cardiology consultation. Speak with an IMC-registered cardiologist for a heart-health assessment and, where clinically appropriate, advice on next steps. Does not replace in-person tests where clinically required." |
| **Treatment refill** `Service.summary` | HIGH | "Renew your existing prescription quickly" — guaranteed speed-driven renewal | "A doctor reviews your stable, ongoing condition and decides whether continuing your current medication is appropriate. Any renewal is at the doctor's discretion." |
| **Sick leave** `Service.summary` | HIGH | "Get a medically certified sick note quickly" — guaranteed certificate (contradicts the page's own disclaimer) | "A doctor assesses your symptoms and, where clinically appropriate, can issue a medical certificate. A certificate is issued at the doctor's discretion and is not guaranteed." |
| **Dermatology** `Service.summary` | MEDIUM | "expert diagnosis and treatment" — diagnosis-without-in-person overclaim | "Speak with an IMC-registered dermatologist to review skin concerns and discuss next steps. Some conditions may need an in-person examination." |
| **Homepage** trust/stats (`page.tsx` hardcoded + `FinalCTA.tsx`) | MEDIUM | "24h Same-day consultations" / "24h Average wait" — absolute availability promise, no source | "Same-day slots often available" / "Often within 24h — subject to doctor availability" |
| **FAQ** (`faq/page.tsx` `FAQ_GROUPS`) | MEDIUM | Markets non-existent "Essential/Comprehensive/Premium Wellness plans", "telemedicine devices", "data always protected" | Rewrite to match live product (pay-per-consult, choose by specialty/language, post-consult notes where appropriate, factual GDPR, "not for emergencies — call 112") |
| **About** step 04 (`about/page.tsx`) | MEDIUM | "Get referrals, certificates… within the hour" — guaranteed deliverables + absolute time | "Where clinically appropriate, the doctor can issue referrals or certificates. Notes are sent to your portal, usually the same day." |
| **Homepage** team heading | LOW | "Doctors who actually pick up" — unverifiable availability promise | "The clinician shown on the profile is the clinician on your consultation — no call-centre handoffs." |
| **`medical-consultation`** `detailBody` | LOW | Placeholder garbage ("dsffdsfsd") shipped to public field; 2 QA rows `isActive=true` | Clear field; deactivate "QA Other Consult" / test rows |
| **Doctor bios** `Doctor.bio` (DB) | LOW (surface) | No content-review gate; future bio could add cure/superlative claims | Add editorial guideline + admin review; audit live `Doctor.bio` values in DB before Ads submission |

### Disclaimer plan
- Today: `MedicalDisclaimer` renders **only** on Ireland GP + sick-leave. **Missing** on specialist, prescriptions, tests, doctor profiles, and **all non-Ireland markets**.
- **Add a site-wide layout-level disclaimer** in `frontend/app/(site)/layout.tsx` (or footer): "Online consultations are not a substitute for emergency care — call 112 / your local emergency number. Information here is general guidance, not medical advice. Prescriptions, certificates, referrals and next steps depend on clinical assessment and are at the treating doctor's discretion." This covers every market and page in one change.

### Constraints honored
- **GP-only public site until LegitScript** — prescription flows stay feature-gated; fix the risky DB copy now so nothing leaks if toggled.
- Remove dead `frontend/lib/content/template-page-data.ts` ("Get Prescription Delivered", "100% online") to prevent accidental re-wire.
- Soften `BookingFormTemplate` `DEFAULT_NEXT_STEPS` "we confirm receipt instantly" (minor speed claim) until `book-online` is deprecated.

---

## 14. Implementation Checklist

**Recommended execution order**
1. **P0 safety/content:** risky copy, FAQ, site-wide disclaimer, footer 404s, blog sanitize verification.
2. **P1 booking/navigation:** `/book` route, header/mobile CTA, service/doctor/slot preselection, `/book-online` redirect decision.
3. **P2 visual trust:** `PageHero` image slot, key human imagery, slogan placement, How It Works, About/Contact.
4. **P3 funnel polish:** cart/checkout visual re-skin, country select, guest receipt link.
5. **P4 discovery/measurement/QA:** SEO metadata, sitemap/llms updates, privacy-safe event hooks, Playwright/manual regression.

**A. Navigation & booking (core)**
- [ ] Restructure header IA (add How It Works); promote **Book Appointment** to the single solid pill; demote Log in to text link.
- [ ] Point header + mobile Book CTA to **`/book`** (unify destinations); fix no-country fallback to `/{lastCountry}/…/book`.
- [ ] Add persistent mobile-bar Book button; add `StickyBookingCTA` component on home/hubs/profile.
- [ ] Add a Book entry to `CountryEntryGate` (gateway has no chrome).
- [ ] Build **`/[country]/[lang]/book`** guided page (5 steps, query-param preselect, step indicator, empty states) reusing `getCountryServices`/`getCountryDoctors`/`getServiceDoctorAvailability` + `ConsultationBookingForm`.
- [ ] Extend `ConsultationBookingForm` with `initialSlotId`; add `?slot` to consult/book `SearchParams`.
- [ ] Service cards → `/book?service=<slug>`; doctor cards/profile → `/book?doctor=<slug>` (+ `&service=`); doctors-index card gets direct "Book with this doctor".
- [ ] Deprecate `/book-online` → 301 to `/book` (preserve params); remove stale "manual follow-up" copy.

**B. Visual / pages**
- [ ] Re-skin **cart + checkout** to design tokens (restyle only; LOCKED field names/enums/Stripe text).
- [ ] Add optional image slot to `PageHero`; wire human imagery into About/Contact/GP/Specialist/Tests/Doctors heroes + `/book`.
- [ ] Revive `HowItWorks` step photos (or add imagery to `HowItWorksNarrative`).
- [ ] Render or delete the dead `SpecialtiesGrid` on the specialist page.
- [ ] Fix doctor-profile **canonical** (`/team/` → `/doctors/`).
- [ ] Keep country context on About/Contact/FAQ/Blog CTAs (no `/`).
- [ ] Surface slogan in hero / `/book` / About / metadata.

**C. Imagery assets**
- [ ] Download + commit vetted Unsplash/Pexels/Pixabay human telemedicine images to `/public/images/**`; record source/license in `docs/media-asset-upload-guide.md`.
- [ ] Descriptive alt on every image; improve templated `ServiceCatalog`/`ServiceCard` alts.

**D. Compliance / content**
- [ ] Rewrite risky `Service.summary` rows (CRITICAL/HIGH first) via `/admin/services` (or a content migration script).
- [ ] Soften homepage "24h", `FinalCTA`, About step 04, team heading; clear `medical-consultation` garbage; deactivate QA rows.
- [ ] Rewrite `/faq` to match live product; add emergency/112 answer; add `FAQPage` JSON-LD; remove dead `{false && …}`.
- [ ] Add **site-wide `MedicalDisclaimer`** in `(site)/layout.tsx`.
- [ ] Delete dead `template-page-data.ts`; confirm + remove `CTAFooter.tsx`/`data/navigation.ts` dead surface.
- [ ] Verify `sanitize-html` runs on blog `dangerouslySetInnerHTML`.
- [ ] Verify footer terms/cookies/refund links don't 404; add or redirect.

**E. SEO / measurement / rollout**
- [ ] Add `/book` metadata, canonical, hreflang alternates, and sitemap entry after the route exists.
- [ ] Remove `/book-online` from `page-seo.ts`, `structured-data.ts`, `sitemap.ts`, and `llms.txt` after the redirect is in place.
- [ ] Add privacy-minimal funnel events only behind the existing consent model, if analytics is enabled: `book_cta_click`, `booking_step_view`, `booking_empty_state`, `cart_add_success`, `checkout_start`. Payloads must exclude PHI and medical free text.
- [ ] Stage rollout behind low-risk routing first: ship `/book` and CTAs, monitor, then redirect `/book-online` once cart-first appointment creation is verified.

---

## 15. QA Checklist

**Automated** (`pnpm` workspace): `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm --filter frontend test` (vitest) · `pnpm e2e` (Playwright). Keep `docs/manual-tests/TEST-PUBLIC-WEBSITE.md` (TC-PUB-001…029) green.

**Manual / functional**
- [ ] Home, services, service-detail, doctors, doctor-profile, about, contact, faq, blog, `/book`, cart, checkout all load per market.
- [ ] Header **Book → `/book` in one click**; mobile bar Book works; drawer Book works.
- [ ] `/book?service=X` preselects service; `/book?doctor=Y` preselects doctor; `/book?service=X&doctor=Y&slot=Z` lands on slot preselected.
- [ ] Direct `/book` allows manual service→doctor→date→slot selection.
- [ ] Slot/timezone display correct (clinic-local), atomic claim + `heldUntil` hold intact.
- [ ] Empty states show (no clinicians / no slots) instead of `notFound()`.
- [ ] Prescriptions stay **gated** (GP-only) in prod config.

**Responsive** (320/375/390/430/768/1024/1280/1440): no horizontal scroll; grids collapse < 768; touch targets ok. **Visual regression** screenshots both hero states.

**Accessibility:** alt text present + descriptive; keyboard nav (drawer, switchers, `/book` steps); focus states; `motion-reduce` variants; color contrast (forest/lime).

**SEO / indexing:** `/book` has canonical + hreflang; `?service`/`?doctor`/`?slot` states do not create duplicate indexed pages; `/book-online` is removed from sitemap/llms/search structured data only after redirect works.

**Measurement privacy:** if events are added, verify no PHI, doctor names, patient identifiers, symptoms, notes, service-specific medical condition labels, slot timestamps, or checkout PII leave the app through client analytics.

**Compliance:** no CRITICAL/HIGH risky copy remains; site-wide disclaimer renders all markets; no internal words leak ("placeholder/TODO/fallback/legacy/pending/mock").

**Portal regression (must NOT change):** admin/doctor/account UI unchanged; `proxy.ts` JWT gating + auth flow intact; cart enum / checkout field names / `data-testid` / Stripe text untouched; `pageMetadata` + JSON-LD helpers intact.

---

## 16. Risks / Questions

**Open questions for owner**
- Header Book CTA fill on the dark header: **solid white** (forest text) vs **solid mid-mint `#8FB021`** — both brand-legal (lime stays non-fill). Recommend solid white. Confirm.
- `/book` umbrella vs keeping `/consult/[serviceSlug]` as the canonical — plan keeps both (book = front door, consult = per-service deep-link). Confirm acceptable.
- Deprecating `/book-online` (301 → `/book`): confirm no external links/Ads landing pages depend on it.

**Backend / functional limitations**
- **Payments env-gated / skipped this launch** (`launch-blockers.md`): Stripe redirect from booking may not be fully wired; free-consultation path → admin inbox. Don't promise instant payment UX beyond what's wired.
- Two booking systems create different Appointment-creation timing (immediate vs webhook) — unifying on cart-first is the intended direction; verify webhook mints Appointments reliably before deprecating `book-online`.
- Country expansion is **hardcoded to 5 markets** (`data/countries.ts`, `country-slug.ts`, `proxy.ts`, backend schema); admin-added countries don't surface publicly. Plan assumes 5 live markets.
- `PageKey` enum **does include** `PRESCRIPTIONS`/`HEALTH_TESTS`; those CMS pages are editable today. The remaining gap is public routing: health-test detail pages do not exist, and any future CMS page keys would require a backend enum/migration.
- The new `/book` route must be added to public SEO/discovery helpers deliberately. Do not remove `/book-online` discovery links before redirect behaviour is implemented and verified.

**Compliance caveats**
- Best-effort Ads review (no live policy browse). Live `Doctor.bio` and `HealthTest.shortDescription` DB values were **not auditable from the repo** — review directly in `/admin` / DB before Ads submission.
- LegitScript pending gates all public prescription/pharmacy promotion — keep gated.
- Legal sign-off, final logo/brand assets, and footer terms/cookies/refund pages are owner/business blockers (`launch-blockers.md`).

**Data / analytics caveat**
- Healthcare funnel analytics must be consent-aware and data-minimized. Avoid Google/third-party analytics until the owner confirms the lawful basis, consent copy, and regional data-processing posture. Prefer aggregate, non-health-specific events.

**Imagery / licensing**
- Vetted free-stock images must be confirmed commercial-use-safe and attributed where required; commit into `/public/images` (avoids `next.config` remote-host + hotlink risk). Where approval is needed, ship a safe placeholder + TODO.

---

## Reference docs (build on, don't duplicate)

| Doc | Use for |
|---|---|
| [`DESIGN.md`](../DESIGN.md) | **Authoritative** visual spec — palette, surfaces, per-section layout, motion, anti-patterns. Do NOT re-derive tokens. |
| [`direction.md`](../direction.md) | Engineering-rule table, component sketches, anti-pattern list, globals.css additions. **Light-hero + Geist = SUPERSEDED.** |
| [`redesign-report.md`](../redesign-report.md) | As-built record of 12 shipped commits + existing `.gh-*` utilities/tokens + **lock list**. |
| [`redesign-audit.md`](../redesign-audit.md) | Per-page 0–5 scoring, "must not revert" baseline. |
| [`docs/website-ux-content-redundancy-audit.md`](website-ux-content-redundancy-audit.md) · [`docs/frontend-redundancy-ux-audit.md`](frontend-redundancy-ux-audit.md) | **All IA / canonicalization / CTA-reduction / SEO / copy-rewrite decisions.** |
| [`docs/wix-migration-product-audit.md`](wix-migration-product-audit.md) | Phase-1 product scope, country-first model, 7 priority decisions. |
| [`docs/next-phases-roadmap.md`](next-phases-roadmap.md) | Production handover checklist, phase status, known gaps. |
| [`docs/launch-blockers.md`](launch-blockers.md) | Business/legal/deploy blockers. |
| [`docs/manual-tests/TEST-PUBLIC-WEBSITE.md`](manual-tests/TEST-PUBLIC-WEBSITE.md) | Public-site acceptance/regression matrix (keep green). |
| [`AI_AGENT_PROMPT_Global_Health.md`](../AI_AGENT_PROMPT_Global_Health.md) | Stack, responsive widths, URL-preservation, asset-migration rules. |

## Lock list (must NOT change during implementation)
`pageMetadata()` · `breadcrumbJsonLd`/`medicalBusinessJsonLd`/`medicalProcedureJsonLd` · `isCountryFeatureEnabled` gating · `CartProvider`/`useCart` · cart `kind` enum (`HEALTH_TEST`/`PRESCRIPTION_SERVICE`/`GENERAL_CONSULTATION`/`SPECIALIST_CONSULTATION`) · `heldUntil` slot-hold · Stripe disclaimer text · all checkout form field names + `autocomplete` attrs · `sanitize-html` in `RichBodySection` render path · all `data-testid` / `aria-*` / `role` / event handlers · `proxy.ts` JWT auth gating · no PHI or medical free text in client analytics.
