# 04 — Booking Flow (`/book`)

## 1. Page Identification

- **Name:** Booking flow ("Book consultation")
- **Route:** `/[country]/[lang]/book`, exercised at `/ireland/en/book` — a **public-site route**, not under `(auth)/account`
- **Entry points tested:** Patient portal sidebar → "Book consultation" (`frontend/app/(auth)/account/layout.tsx:88`, href resolved by `resolveBookConsultationHref()` in `frontend/lib/api/last-booking-country.ts`, which routed the test session to `/ireland/en/book`)
- **Other entry points (code-derived, not walked):** service detail page "Book" CTA, doctor profile "Book" CTA (`?doctor=` doctor-first order), homepage same-day GP quick-book (`?gp=1&language=&at=`, own 3-step flow), public nav "Book Appointment" button
- **Role:** PATIENT (also reachable signed-out as a guest checkout; this audit only exercised the signed-in path)
- **Related frontend files:**
  - `frontend/app/(site)/[country]/[lang]/book/page.tsx` — server component, all step-routing logic
  - `frontend/app/(site)/[country]/[lang]/book/_components/service-time-picker.tsx` — service-first TIME step (aggregated across doctors)
  - `frontend/app/(site)/[country]/[lang]/book/_components/language-filtered-doctors.tsx` — DOCTOR step for service-first flow
  - `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/slot-picker-step.tsx` — TIME step for doctor-first flow
  - `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx` — DETAILS step (shared by both orderings and by the GP quick-book flow)
- **Shared components:** `DoctorCard` (`frontend/components/cards/DoctorCard.tsx`), `GH2FlowHeader`, `PhoneField`, `DobField`. None of the portal's shared primitives (`AppMenu`, `PortalDialog`, `ColumnPriorityTable`, etc.) are used here — this page is entirely public-site component stock (`gh2-*` classes from `globals.css`), not `portal.css`.
- **APIs observed (network tab, details step):** `GET /api/auth/me`, `GET /api/cart` (server-rendered steps hit internal content-loader functions directly, not REST, so no XHR is visible for service/availability data). Code-derived (not fired during this walk because it requires filling the form): `POST /api/public/gp-assign` (GP autoAssign submit), `GET /api/account/profile` (address prefill), `POST /api/cart/items` (final "Continue to cart" submit — **not clicked**, per audit safety rules).
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Lets a signed-in patient (or guest) select a service, a time, and a clinician, then enter patient/consent/address details, and add the booking to the cart for checkout. It is the same route and same components used by anonymous public-site visitors — the portal is simply one of several entry points into it.

## 3. Primary User Tasks (priority order)

1. Pick the right service quickly (23 services on this country — needs to find one, not browse all)
2. Find an open time that fits their schedule
3. Pick a clinician (or accept the one auto-offered)
4. Enter/verify patient + contact + address details and required consents
5. Correct a wrong step without losing already-entered choices (back-navigation)

## 4. Current Page Structure (top-to-bottom, all steps)

1. Public site header (logo, Home/Doctors/Services/Plans/Blog/About/Contact, country switcher, language switcher, cart icon, notification bell, account avatar, "Book Appointment" CTA button)
2. Dark green `GH2FlowHeader` band: page title "Book your consultation", subtitle, top-right mini step list (`01 Service · 02 Time · 03 Doctor · 04 Details`)
3. Two-column section (`lg:grid-cols-[0.95fr_1.8fr]`):
   - **Left (sticky) sidebar:** "Booking Steps" dark glass panel — vertical step list with back-links on completed steps, availability note, 3 trust tiles (Registered doctors, Secure video consultation, Confidential & GDPR-compliant)
   - **Right (main):** step-specific content — Service grid → Time picker → Doctor picker → Details form
4. Trust/authority band (repeated on **every step**): "Licensed care, checked locally" — Medical Register / Data Protection / Clinical Standards / Verified Reviews tiles + emergency notice
5. Public site footer (4-column link grid, newsletter signup)

## 5. Current Container Hierarchy (indented tree)

```
body
└─ public header (shared, unrelated to booking)
└─ section#booking (gh2-section-ivory, py-[48-88px])
   └─ div.mx-auto.max-w-container
      └─ div.grid.lg:grid-cols-[0.95fr_1.8fr]        ← unnecessary at ≥1024px only; stacks below
         ├─ aside.lg:sticky                            ← always renders FIRST in DOM (mobile issue, see §15)
         │  └─ div.gh2-glass-forest.p-5                ← 1 real panel, correctly single-level
         │     ├─ p (eyebrow "BOOKING STEPS")
         │     ├─ ol (StepIndicator)                    ← decorative rail (absolute span) + 4 li rows
         │     ├─ p (availability note)
         │     └─ ul (3 trust tiles, each gh2-trust-tile-dark) ← 3 near-identical bordered rows, mild card-in-panel repetition
         └─ div.min-w-0
            └─ [InlineNotice?]
            └─ step content:
               Step 1: div.grid.gap-6
                 ├─ BookingSectionHeader (eyebrow/h2/desc)
                 ├─ "Need a same-day GP instead?" link
                 └─ div.grid.sm:grid-cols-2 (23× ServiceChoiceCard, each gh2-glass-forest)
               Step 2: div.grid.gap-6
                 ├─ BookingSectionHeader
                 └─ div.gh2-glass-forest.p-5 (ONE outer panel)
                    ├─ header (selected consultation summary)
                    └─ ServiceTimePicker (date-pill row + time-button grid, both INSIDE the same panel — no nested cards)
               Step 3: div.grid.gap-6
                 ├─ BookingSectionHeader
                 └─ LanguageFilteredDoctors
                    ├─ language filter chip row (light theme, floats directly on ivory bg — OK)
                    └─ ul.grid (1-3× li > DoctorCard, each its own dark card)
               Step 4: div.grid.gap-6
                 ├─ BookingSectionHeader
                 └─ div.gh2-glass-forest.p-5 (outer panel)
                    ├─ header (consultation summary)
                    ├─ [stale-slot notice]
                    └─ ConsultationBookingForm
                       ├─ div.gh2-card-ivory (selected-time summary) ← card #1
                       ├─ div.gh2-card-ivory (patient details)        ← card #2
                       ├─ div.gh2-card-ivory (patient address)        ← card #3
                       └─ div.gh2-card-ivory (GDPR consent)           ← card #4
      └─ trust/authority band (its own gh2-status-card-style wrapper, repeated identically on every step)
└─ public footer (shared)
```

Levels flagged unnecessary: none of the wrapper divs are purely decorative extras beyond what's needed for the grid/sticky layout — the structure is comparatively flat for this codebase. The one real repetition is the **4 stacked `gh2-card-ivory` panels inside the details form** (§8/§14) and the **trust/authority band duplicated on every step** (§8).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Portal sidebar "Book consultation" link | Link | Navigate from `/account` | Lands on `/ireland/en/book`, full public header replaces portal shell | 04-001 | `04-bookingflow-desktop-step1-service-01.png` |
| ServiceChoiceCard "Continue" (Acute Medical Consultation) | Link | Click | Navigates to `?service=acute-medical-consultation`, advances to TIME step | — | `04-bookingflow-desktop-step2-time-01.png` |
| Date pill (2nd day) | Button (`role=tab`, local state) | Click | Switches active day + time grid, no navigation/URL change | — | `04-bookingflow-desktop-step2-time-daychange-01.png` |
| Time slot button "09:00 · €45" | Button | Click | Navigates to `&at=2026-07-14T08:00:00.000Z#booking`, advances to DOCTOR step | — | `04-bookingflow-desktop-step3-doctor-01.png` |
| Doctor card "Continue" (Dr Tiago Miguel Figueira) | Link | Click | Navigates to `&doctor=dr-tiago...&slot=cmrg7z...`, advances to DETAILS step | — | `04-bookingflow-desktop-step4-details-01.png` |
| Step-indicator "Time" row (completed step, sidebar) | Link | Read `href` (not clicked to avoid losing captured state) | Points to `?service=...` (drops doctor/slot/at) — correct back target | — | code-derived |
| Details step "Change time" link | Link | Direct nav to its `href` | Returns cleanly to TIME step, service selection preserved | — | `04-bookingflow-desktop-changetime-nav-01.png` |
| Browser back button (from DETAILS step) | Browser nav | `goBack()` | Correctly restores DETAILS step with doctor+slot+at still in URL | — | `04-bookingflow-desktop-browserback-01.png` |
| Header account avatar ("P") | Link | Click | Navigates to `/account` (aria-label "Your account (email)" present) — the only way back to the portal | 04-002 | `04-bookingflow-desktop-usermenu-open-01.png` |
| Keyboard Tab × 15 from step 1 top | Keyboard | Tab traversal | First 15 stops are all in the shared public header (skip-link, logo, 7 nav items, country/lang switchers, cart, notifications, avatar, Book Appointment) before reaching any booking content | 04-003 | `04-bookingflow-desktop-focus-tab15-01.png` |
| "Continue to cart" submit button | Button | **Not clicked** (would create a real cart line / mutate data) | N/A | N/A | N/A — per audit safety rules |
| "I confirm..."/GDPR checkboxes | Checkbox | Inspected only, not toggled | Required, unchecked by default | — | `04-bookingflow-desktop-step4-details-01.png` |

## 7. Screenshots

All under `docs/audits/portal/patient/screenshots/04-booking-flow/`:

- `04-bookingflow-default-{desktop,laptop,tabletl,tabletp,mobile,smobile,short}-default-0{1-6}.png` — full default-state scroll captures of step 1 (Service picker) at all 7 viewports (auto-generated by `shot.mjs`)
- `04-bookingflow-desktop-step1-service-01.png` — step 1, desktop, full page (issues 04-004, 04-005)
- `04-bookingflow-desktop-step2-time-01.png` — step 2 (Time), desktop (issue 04-006)
- `04-bookingflow-desktop-step2-time-daychange-01.png` — step 2 after selecting a different date pill
- `04-bookingflow-desktop-step3-doctor-01.png` — step 3 (Doctor), desktop (issue 04-007)
- `04-bookingflow-desktop-step4-details-01.png` — step 4 (Details form), desktop (issue 04-008)
- `04-bookingflow-mobile-step4-details-01.png` — step 4, mobile 390×844, full page (issue 04-009)
- `04-bookingflow-short-step4-details-01.png` — step 4, short viewport 1366×650, above-the-fold only (issue 04-010)
- `04-bookingflow-desktop-changetime-nav-01.png` — "Change time" back-navigation target
- `04-bookingflow-desktop-browserback-01.png` — state after browser Back
- `04-bookingflow-desktop-usermenu-open-01.png` — destination after clicking the header avatar
- `04-bookingflow-desktop-focus-tab15-01.png` — page state after 15 Tab presses (still in header)

## 8. UX Problems

**04-001 — Booking flow exits the portal chrome entirely**
Severity: Medium · Category: Navigation / Information architecture
Browser evidence: `04-bookingflow-desktop-step1-service-01.png` — full public marketing header (Home/Doctors/Services/Plans/Blog/About/Contact, country+language switchers, cart, notification bell, a second "Book Appointment" CTA) replaces the portal's dark sidebar the instant the patient clicks "Book consultation" from `/account`.
User impact: a patient mid-task loses all portal navigation (no sidebar, no breadcrumb reading "Account / Book"), sees marketing chrome and a redundant CTA button that duplicates the action they're already performing, and has no visible, labeled way back to their dashboard.
Root cause: `/book` lives under the `(site)` route group (public site), not `(auth)/account` — this is the shared-component risk called out in the assignment: the wizard is genuinely one shared implementation used by both anonymous visitors and authenticated patients, with no portal-aware variant of the header/footer.
Recommended resolution: either (a) render a minimal/portal-aware header when the visitor is an authenticated patient arriving from the portal (hide country/lang switchers already locked by the portal session, hide the duplicate "Book Appointment" CTA, add an explicit "← Back to my account" link), or (b) at minimum add a visible breadcrumb/back-link at the top of the booking header band itself so the exit doesn't rely on a small unlabeled avatar icon.

**04-002 — Only path back to the portal is an icon-only avatar link**
Severity: Low · Category: Navigation / Accessibility
Browser evidence: `04-bookingflow-desktop-usermenu-open-01.png` (destination confirmed `/account`); source at `frontend/components/layout/HeaderAuthActions.tsx:69-79`.
User impact: sighted patients must recognize a bare circular avatar/initial as "my account" with no text label visible in the UI (an `aria-label` exists for screen readers, but nothing on-screen states it).
Root cause: reuse of the generic public-header avatar component with no portal-specific affordance.
Recommended resolution: covered by the fix for 04-001 (an explicit "Back to my account" text link removes the ambiguity).

**04-003 — Keyboard users tab through the entire shared header before reaching the booking task**
Severity: Medium · Category: Accessibility / Keyboard navigation
Browser evidence: `04-bookingflow-desktop-focus-tab15-01.png`; 15 consecutive Tab presses from page load never leave the header (skip-link → logo → 7 nav links → 2 dropdown buttons → cart → notification bell → avatar → CTA button).
User impact: a keyboard-only patient arriving specifically to book a consultation must tab past 13+ unrelated header controls every time before reaching the first service card — no "skip to booking" affordance beyond the generic site skip-link (which targets `#content`, not the booking step content specifically).
Root cause: shared public header has no page-specific skip target; not booking-specific but disproportionately costly here because the portal explicitly routes users into a single-task flow.
Recommended resolution: add a second, page-scoped skip link ("Skip to booking steps") right after the generic skip-link, targeting the `#booking` section id that already exists on the page.

**04-004 — 23 services shown as one flat, ungrouped grid with no search or filter**
Severity: Medium · Category: Information hierarchy / Findability
Browser evidence: `04-bookingflow-desktop-step1-service-01.png` — General and Specialist services are interleaved in DB order (Acute Medical → Sick Leave → Ongoing Treatment → Chronic Disease → Paediatric GP → Weight Management → ... → Psychology Specialist), distinguishable only by a small "General"/"Specialist" tag on each card; no section headers, no search box, no filter chips.
User impact: a patient who wants (e.g.) "Cardiology" must scroll through ~18 unrelated cards to find it; on mobile this is a very long scroll (see 04-009).
Root cause: `ServicePicker` (`frontend/app/(site)/[country]/[lang]/book/page.tsx:696-770`) renders `services` (General + Specialist concatenated) as a flat `sm:grid-cols-2` with no grouping/sort/filter logic.
Recommended resolution: split into two labeled sections ("General consultations" / "Specialist consultations") matching the existing tag taxonomy, and add a lightweight text filter above the grid once service count exceeds ~8.

**04-005 — Doctor step card is mostly empty space for a single-doctor result**
Severity: Low · Category: Space misuse
Browser evidence: `04-bookingflow-desktop-step3-doctor-01.png` — the sole `DoctorCard` renders at ~610px tall × ~180px wide with the "Medical Doctor" badge, name, registration, and languages occupying only the top ~40%; the remaining ~60% is solid dark-green padding before the View/Continue buttons.
Root cause: `DoctorCard` (`frontend/components/cards/DoctorCard.tsx`) is sized for a photo-forward grid layout and doesn't collapse gracefully when only 1 result renders in a `sm:grid-cols-2 xl:grid-cols-3` grid with no image.
Recommended resolution: cap the card's min-height or switch to a compact single-column list treatment when `filtered.length <= 2`.

**04-006 — 32 same-priced time slots shown as an undifferentiated grid**
Severity: Low · Category: Information hierarchy
Browser evidence: `04-bookingflow-desktop-step2-time-01.png` — the time grid for a selected day lists all 32 slots (09:00–16:45, all "€45") with no AM/PM or morning/afternoon/evening grouping.
User impact: mild scanning cost when a patient has a rough time-of-day preference; the pricing-type badges (Peak/Off-peak) already prove the grid supports metadata rows, so a lightweight time-of-day label would be a small addition.
Recommended resolution: optional — insert subtle "Morning / Afternoon" sub-headers inside the grid when slot count exceeds ~12.

**04-007 — Trust/authority marketing band is repeated identically on every wizard step**
Severity: Low · Category: Space misuse / Redundancy
Browser evidence: `04-bookingflow-desktop-step1-service-01.png`, `-step2-time-01.png`, `-step3-doctor-01.png`, `-step4-details-01.png` — the full "Licensed care, checked locally" band (Medical Register / Data Protection / Clinical Standards / Verified Reviews tiles + emergency notice) renders below the fold on all four steps, in addition to the 3 trust tiles already present in the persistent sidebar.
User impact: a patient re-reads (or scrolls past) the same conversion-focused trust content 4 times during a single booking, alongside a second, overlapping trust module in the sidebar — redundant for a user who is already mid-conversion.
Root cause: the band is part of the shared page shell rather than conditioned on step; reasonable on step 1 (first-visit trust-building) but unnecessary once already committed by step 2+.
Recommended resolution: show the full trust band only on step 1; keep the compact sidebar tiles (already present on every step) as the ongoing reassurance signal for steps 2-4.

**04-008 — Details form stacks 4 full-width card panels with no persistent scroll anchor**
Severity: Low · Category: Forms / Section ownership
Browser evidence: `04-bookingflow-desktop-step4-details-01.png` — Selected-time summary, Patient details, Patient address, and GDPR consent each render as a separate `gh2-card-ivory` panel with its own padding/border/shadow, stacked in one long scroll, submit button only at the very bottom.
User impact: on a long form the "Continue to cart" button is off-screen for most of the fill-in process, and there's no sticky/mini progress signal distinguishing "which of the 4 sections still needs input" beyond visually scanning each card.
Root cause: `ConsultationBookingForm` renders each logical group as an independent `gh2-card-ivory` block (`frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx:606, 976, 1057`) rather than as dividers within one panel.
Recommended resolution: per project convention (`CLAUDE.md` responsive-primitives note doesn't cover this legacy page, but the same "single surface, use dividers not repeated cards" principle from the portal audits applies) — merge the 3 non-time cards into one panel with `border-t` dividers between "Patient details" / "Address" / "Consent" sections, and keep the submit button visible via a sticky footer bar on tall forms. This does not require a new component; it is a class change on this page only.

**04-009 — Mobile step 1: the entire step sidebar renders above the service list**
Severity: Medium · Category: Section ordering / Mobile
Browser evidence: `04-bookingflow-default-mobile-default-01.png` — on a 390px viewport, the "Booking Steps" panel (step list + note + 3 trust tiles, ≈800px tall) is the first thing rendered below the page header banner; the actual service cards a patient needs to choose from only begin after that full scroll.
User impact: the compact `01/04 Service` counter already exists in the header band (good — it lets the patient orient without the full sidebar), which makes the large duplicate step panel below it pure extra scroll before the primary task (picking a service) becomes visible.
Root cause: `aside` (step sidebar) is the first DOM child of the two-column grid at `frontend/app/(site)/[country]/[lang]/book/page.tsx:242`; the CSS grid only reorders columns at `lg:`, so below 1024px it falls back to DOM/document order (sidebar first, content second).
Recommended resolution: add an `order-2`/`order-1` (Tailwind `order-*`) pair so the step content renders first and the sidebar (with its trust tiles) renders after it on mobile — the header's compact step counter already covers the "where am I" need at small sizes, so the full sidebar isn't needed above the fold at all.

**04-010 — Short-height viewport: step content requires a scroll even to see the step header**
Severity: Low · Category: Short-height / Responsive
Browser evidence: `04-bookingflow-short-step4-details-01.png` (1366×650) — at this height the sticky sidebar and "Add your details" heading are both visible above the fold with no clipping or overlap; the layout degrades acceptably here. No unreachable action or sticky overlap was found on the details step at this viewport.
Recommended resolution: none required — noted as a passed check, not a defect.

## 9. Visual Design Problems

- Repeated `gh2-glass-forest` (dark glass panel) treatment appears at 3+ nesting contexts per step (sidebar panel, step-content panel, individual service/doctor cards) — visually consistent but contributes to the "everything is a card" feel documented across the portal audits; on this page it is largely justified (each panel is a genuinely distinct content group) except for the 4-way split in the details form (04-008).
- `LanguageFilteredDoctors`' language-filter chip row (`frontend/app/(site)/[country]/[lang]/book/_components/language-filtered-doctors.tsx:104-124`) uses light-theme colors (`bg-[var(--color-brand-primary)] text-white` / bordered chips) floating directly on the ivory section background with no surrounding panel — visually consistent with the light section, not a defect, but stylistically inconsistent with every other interactive control on this page which uses the dark `gh2-selectable-dark` treatment (date pills, time buttons). Low-severity polish item.

## 10. Information Hierarchy Problems

Covered above: 04-004 (flat/ungrouped service list), 04-006 (undifferentiated time grid), 04-007 (redundant trust band competing with the primary task for attention on steps 2-4).

## 11. Section Ordering Review

**Current order (desktop, per step):** Sidebar (steps+trust) | Step content — side-by-side, sidebar always first in markup.
**Current order (mobile, per step):** Sidebar (steps+trust) → Step content — stacked, sidebar first (04-009).

**Recommended order (mobile only):**
1. Header band with compact step counter (unchanged — already present, already sufficient for orientation)
2. Step content (service grid / time picker / doctor picker / details form) — primary task, should be first reachable content
3. Sidebar/step-list panel with trust tiles — secondary/orientation content, after the task
4. Trust/authority band — step 1 only (04-007)

Reasoning: on mobile there is no side-by-side space, so document order = visual order. The primary task should win that order; the step list is redundant with the header's `01/04 Service` counter and the individual step's own `BookingSectionHeader` eyebrow (e.g., "TIME", "DOCTOR", "DETAILS"), so it can safely move after the task content without any loss of orientation.

## 12. Tabs, Steps, or Sectioning Recommendation

The 4-step wizard structure (Service → Time → Doctor → Details) is sound and already well externalized to the URL (every step is a distinct, bookmarkable/back-button-safe `?service=&at=&doctor=&slot=` combination — verified via direct navigation and browser Back, both restored correct state). No structural change to the stepping mechanism is recommended. Only the **details step's internal sectioning** should change (04-008): merge "Patient details" / "Patient address" / "Consent" into one panel with `border-t` dividers, keep "Selected time" as its own small summary strip (it is conceptually different — a read-only confirmation, not an input section).

## 13. Proposed Page Structure (exact, mobile)

1. Header band (title, subtitle, compact step counter) — unchanged
2. Step content panel (service grid / time picker / doctor+language filter / details form)
3. Step sidebar panel (step list + trust tiles) — moved after content via `order-*`
4. Trust/authority band — step 1 only
5. Footer — unchanged

## 14. Proposed Container Simplification

| Container | Current | Proposed |
|---|---|---|
| Details form's 3 non-time `gh2-card-ivory` panels | 3 separate bordered/shadowed cards | 1 panel, `border-t border-[var(--color-border)]` dividers between "Patient details" / "Patient address" / "Consent" sub-sections |
| Trust/authority band (steps 2-4) | Rendered on every step | Remove from steps 2-4; keep only on step 1 |
| Sidebar vs. content DOM order (mobile) | Sidebar first (forced by document order) | Add `order-2` to `aside`, `order-1` to the content `div` at `lg:` breakpoint reset, so mobile shows content first |

## 15. Responsive Findings (per viewport)

- **desktop/laptop (1440/1280):** Two-column layout works well; sticky sidebar behaves correctly through scroll on long steps (e.g., 23-card service grid). No clipping.
- **tabletl (1024×768):** Still two-column (grid breakpoint is `lg:` = 1024px, right at the edge) — confirmed via default-state captures, layout holds.
- **tabletp (768×1024):** Below the `lg:` breakpoint — stacks to single column, same ordering issue as mobile (04-009) applies here too.
- **mobile (390×844) / smobile (375×667):** Sidebar-before-content ordering issue confirmed (04-009); otherwise no overflow, no horizontal scroll, service cards and time/doctor grids reflow cleanly to 1-2 columns.
- **short (1366×650):** No clipping or unreachable actions found on the details step (04-010, passed); the time-step's 32-slot grid requires in-panel scrolling at this height but the panel itself scrolls with the page (not a trapped inner-scroll container), so no sticky-overlap risk.

## 16. Accessibility Findings

- **Keyboard tab order:** confirmed functional but expensive — 15 tabs from page load never leave the shared header (04-003). Within the booking content itself, date pills and time buttons are real `<button>` elements with `role="tab"`/`role="tabpanel"` — appropriate ARIA for the date-picker pattern.
- **Focus visibility:** all traced focus stops in the header showed a visible `outline: solid` (via `gh-focus-on-dark`), consistent with the rest of the site — no missing focus ring observed in the 15-tab trace.
- **Labels:** account avatar link has a proper `aria-label` ("Your account (email)") even though visually unlabeled (04-002, visual-only issue). Step indicator's active step includes an `sr-only` "— Step N of 4" suffix (`frontend/app/(site)/[country]/[lang]/book/page.tsx:905-907`) — good practice, confirmed in code.
- **Form labeling (details step, code-derived):** all visible inputs use `<label>` wrapping with explicit text, required fields carry both `required` and `aria-required="true"` (e.g. `consultation-booking-form.tsx:740-741, 961-962, 1065-1066`). No unlabeled icon-only form controls were found on this step.
- **Error announcement (code-derived):** submit validation errors get `role="alert"`, `tabIndex={-1}`, and are focused + scrolled into view (`consultation-booking-form.tsx:118-129, 1094-1108`) — a genuinely good pattern, not tested live (would require an invalid submit, out of scope since submit is not to be clicked with the required checkboxes still needing consent that isn't safe to grant/decline meaningfully in an audit run — inspected in code only).
- **Contrast (suspected, not measured):** inactive step-list labels use `text-white/45` on the `gh2-glass-forest` dark-green background (`page.tsx:886`) — visually low-contrast in screenshots (`04-bookingflow-desktop-step1-service-01.png`); flagged as a suspected AA failure for non-active step labels, not measured precisely.

## 17. Content and Microcopy Findings

| Current | Recommended | Where |
|---|---|---|
| "Continue" (button, on every Service and Doctor card) | Keep as-is — acceptable given adjacent card heading provides context (e.g., "See a Doctor Online in Ireland" + "Continue" reads clearly); no change needed. | `page.tsx` `ServiceChoiceCard`, `language-filtered-doctors.tsx` |
| "Change time" (details step) | Fine as-is — specific and accurate. | `consultation-booking-form.tsx:563, 597` |
| Trust tile "Confidential & GDPR-compliant" (sidebar, every step) vs. full band's "Data Protection … GDPR compliant" (steps 1 & repeated) | Redundant phrasing across the two trust modules; resolved by 04-007's fix (remove the full band from steps 2-4). | n/a |
| "Need a same-day GP instead?" (step 1 escape hatch) | Clear and specific — good example of task-specific microcopy, no change needed. | `page.tsx:732` |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Mobile order fix | `frontend/app/(site)/[country]/[lang]/book/page.tsx` (aside/content wrapper, line ~242-279) | Add Tailwind `order-2`/`order-1` classes | Page-specific | Low | Trivial |
| Trust band step-gating | `frontend/app/(site)/[country]/[lang]/book/page.tsx` | Wrap the authority band in a `{currentStep === 1 && ...}` conditional | Page-specific | Low | Trivial |
| Details-form card merge | `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx` (lines 606, 976, 1057) | Replace 3 `gh2-card-ivory` wrappers with 1 panel + `border-t` dividers | **Shared** — this form also renders inside the GP quick-book flow (`GpBookingFlow` in `page.tsx:341`) and the doctor-first `/consult/[serviceSlug]` page | Medium (shared component, touches 2+ entry flows) | Small |
| Service grid grouping | `frontend/app/(site)/[country]/[lang]/book/page.tsx` `ServicePicker` (line 696) | Split `services` into General/Specialist labeled sections | Page-specific (this `ServicePicker` isn't reused elsewhere) | Low | Small |
| Skip-to-booking link | Page header area or `GH2FlowHeader` | Add a second skip-link targeting `#booking` | Shared component (`GH2FlowHeader` is used by other public flows too) | Low | Trivial |
| Portal-aware header/back-link | Header rendering for `/book` when arriving from portal, or a new lightweight header variant | Larger — needs a signal (referrer/portal flag) or a conditional header component | Shared (touches routing/header architecture) | **High** — biggest-scope item in this audit | Medium-Large |

## 19. Recommended Implementation Order

1. 04-009 mobile order fix (trivial, isolated, page-specific)
2. 04-007 trust band step-gating (trivial, isolated)
3. 04-004 service grid grouping (small, isolated)
4. 04-003 skip-to-booking link (trivial, but touches a shared header component — verify it doesn't duplicate the existing site-wide skip link)
5. 04-008 details-form card merge (small complexity but **shared component** — verify against the GP quick-book flow and the doctor-first `/consult/[serviceSlug]` page before shipping)
6. 04-001/04-002 portal-aware header/back-link (largest scope — needs a product decision on whether `/book` gets a portal-specific header variant or just a back-link; do last and get explicit sign-off given it touches routing shared with the entire public site)

## 20. Acceptance Criteria (measurable)

- Mobile (≤1023px): first ~100vh of scroll from page load on step 1 contains at least one bookable service card (currently: 0 — only the step sidebar is visible).
- Trust/authority band renders only when `currentStep === 1`; steps 2-4 no longer contain the "Licensed care, checked locally" band in the DOM.
- Details step DOM contains 1 form-section panel with 3 `<div>` dividers instead of 3 separate `gh2-card-ivory` panels (verified by inspecting rendered markup), and this change is verified not to break `GpBookingFlow`'s rendering of the same component.
- Step 1 service grid renders under two labeled `<h3>`/section headings ("General consultations", "Specialist consultations") instead of one flat 23-card grid.
- A "Skip to booking" link is reachable within 2 Tab presses of page load and moves focus to the `#booking` section.

## 21. Open Questions

- Whether `/book` should get a portal-aware header variant is a product/design decision (touches the shared public header architecture) — flagged in 04-001/04-002 but not resolved here; needs owner sign-off before implementation given the "High risk" classification in §18.
- The final "Continue to cart" submission and downstream `/cart` → checkout → payment steps were intentionally not exercised (would create a real cart line against the live DB) — anything past the details step is out of scope per the audit's safety rules, not because it's unreachable.
- GDPR/consent checkbox interaction (checking/unchecking, submit-time validation messages) was inspected in code only, not exercised live, since submitting would attempt to add a real item to the cart.
- Precise contrast ratio for inactive step-list labels (`text-white/45` on dark green) was not measured with a contrast tool — flagged as suspected-only in §16.
