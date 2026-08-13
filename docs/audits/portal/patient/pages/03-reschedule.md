# 03 — Reschedule Booking

## 1. Page Identification

- **Name:** Reschedule booking
- **Route:** `/account/bookings/[id]/reschedule`
- **Entry points:** "Reschedule" action button on a booking card at `/account/bookings` (only shown for `REQUEST_RECEIVED` / `UNDER_REVIEW` / `CONTACTED` statuses)
- **Role:** Patient (authenticated, `(auth)` route group)
- **Related frontend files:**
  - `frontend/app/(auth)/account/bookings/[id]/reschedule/page.tsx` — server component, fetches appointment + doctor availability, gates on status/doctor presence
  - `frontend/app/(auth)/account/bookings/[id]/reschedule/reschedule-picker.tsx` — `ReschedulePicker` client component, all day/slot UI and submit logic
- **Shared components used:** `PageHeader`, `AdminEmptyState`, `Btn` (`frontend/components/portal-atoms.ts`)
- **APIs observed (code-derived):**
  - `GET {backend}/api/account/appointments/{id}/reschedule` — fetches the appointment detail used to gate the page (`page.tsx:33-43`)
  - Doctor availability via `getDoctorAvailability(countryCode, doctorSlug)` (`frontend/lib/content/get-doctor-availability.ts`, not opened in this audit — code-derived only)
  - `rescheduleAccountAppointment(appointmentId, slotId)` — PATCH-style action fired **immediately on time-slot click**, no separate confirm step (`reschedule-picker.tsx:95-107`)
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **Test booking:** `cmrcyrh2100080cjuqvncgt3u` — status `REQUEST_RECEIVED`, doctor assigned, 12 days / ~32 slots per day available.
- **Not submitted:** per audit brief, no time slot was clicked (see 03-001 — clicking a slot submits immediately with no confirmation).

## 2. Page Purpose

Let a patient move a not-yet-confirmed/contacted booking to a different date/time with their already-assigned clinician, without needing to cancel and rebook from scratch.

## 3. Primary User Tasks (priority order)

1. See what dates/times are actually open.
2. Pick a new date.
3. Pick a new time and have it applied to the booking.
4. Bail out back to the booking list without changing anything.

## 4. Current Page Structure (top-to-bottom)

1. Page header card (breadcrumb "Bookings", title "Reschedule booking", subtitle explaining the current slot stays held, "Cancel" link back to bookings)
2. Single `gh2-card-ivory` panel containing the `ReschedulePicker`:
   - "Pick a new date" label + "N days available" count
   - Horizontally-scrollable row of day pills (weekday/day-number/month/slot-count), current day pre-selected to the first open day
   - "Times on {day}" label
   - Grid of time buttons (2–5 columns depending on viewport) for the selected day; clicking one **immediately submits** the reschedule and redirects to `/account/bookings`

## 5. Current Container Hierarchy (indented tree; unnecessary levels marked)

```
.gh-patient-page
├─ PageHeader card                                   [necessary]
└─ .gh2-card-ivory (p-5)                              [necessary — single content container]
   └─ ReschedulePicker
      ├─ header row (label + count)                   [necessary]
      ├─ day-pill scroll row (role=tablist)            [necessary]
      └─ time-slot grid (role=tabpanel)                [necessary]
```
This is the leanest hierarchy of the pages audited so far — one outer card, no card-in-card nesting, no decorative wrapper levels. No structural simplification needed here.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Day pill (tab) | Button, `role="tab"` | Clicked 3rd day (Wed 15) | Selected state moves correctly, "Times on 15 Jul 2026" updates, time grid refreshes | — | `03-reschedule-desktop-day-selected-01.png` |
| Day pill | Keyboard focus | Tabbed to a day pill | Visible focus ring: `outline: 2px solid`, `box-shadow: 0 0 0 4px #fff` | — | console log (see §16) |
| Time slot button | Button | **Not clicked** — inspected code only | Clicking calls `chooseSlot()` → `rescheduleAccountAppointment()` immediately, no confirmation dialog | 03-001 | code-derived |
| "Cancel" header link | Link | Read code | `href="/account/bookings"`, plain navigation, no unsaved-state warning needed since nothing is selected/staged | — | code-derived |
| Horizontal day-pill scroll | Scroll | Verified 12 pills present, only ~9 fit at 1440px before requiring scroll | Scroll-fade affordance (`gh2-scroll-fade`) present | — | `03-reschedule-desktop-default-01.png` |
| "Current" badge | Static | N/A — current slot not within the visible day range in this dataset | Not verified live; confirmed in code (`reschedule-picker.tsx:226-230`) that a slot matching `currentTimeSlotId` renders a "Current" tag | Code-derived only | — |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `03-reschedule-desktop-default-01.png`, `02.png` | 1440×900 | Default | Baseline, populated slots | — |
| `03-reschedule-desktop-day-selected-01.png` | 1440×900 | 3rd day pill selected | Interaction correctness | — |
| `03-reschedule-tabletl-default-01.png`, `02.png` | 1024×768 | Default | Responsive check | — |
| `03-reschedule-tabletp-default-01.png` | 768×1024 | Default | Responsive check | — |
| `03-reschedule-mobile-default-01.png`, `02.png` | 390×844 | Default | Mobile layout | — |
| `03-reschedule-smobile-default-01.png`–`03.png` | 375×667 | Default | Small mobile | — |
| `03-reschedule-short-default-01.png`, `02.png` | 1366×650 | Default | Short-viewport clipping check | 03-002 |

## 8. UX Problems

**03-001 — Selecting a time slot reschedules the booking immediately with no confirmation step**
Severity: Critical · Category: Destructive/irreversible action without confirmation
Evidence: `reschedule-picker.tsx:215-232` (`onClick={() => chooseSlot(s.id)}`) and `:95-107` (`chooseSlot` calls `rescheduleAccountAppointment` directly inside the click handler, then redirects). Not exercised live per audit-safety rules (no reschedule submitted), but the code path is unambiguous: there is no "Review" or "Confirm new time" step between clicking a time button and the appointment actually being moved.
User impact: a mis-tap on a densely-packed time grid (buttons are `min-h-[70px] sm:min-h-[80px]` but sit in a 2–5 column grid with small gaps) silently reschedules a real medical appointment with no undo affordance beyond re-opening this same page and picking again — and the patient may not even notice they changed anything, since the success state ("Booking rescheduled") looks identical whether intended or not.
Root cause: the picker was built as a single-click "pick = commit" flow, consistent with some slot-pickers in the public booking wizard, but a *reschedule* of an already-placed booking is a different risk class than an initial booking selection — mistakes here overwrite existing state rather than create new state.
Recommended resolution: add a lightweight confirm step — either (a) a two-tap pattern (select highlights the slot, a separate "Confirm new time" button commits), or (b) an inline confirmation `PortalDialog` ("Reschedule to Wed 15 Jul, 09:00?") before calling `rescheduleAccountAppointment`. Given this project's own audit brief explicitly forbids agents from completing this exact action without confirmation, the product should hold patients to the same bar.

**03-002 — At the 1366×650 short viewport, only 2 rows of time slots are visible before scrolling, with no visual cue more exist below**
Severity: Low · Category: Short-viewport space usage
Evidence: `03-reschedule-short-default-01.png`
Not a clipping bug (scroll works, nothing is unreachable), but the header card alone consumes ~180px and the day-pill row ~120px before any times are visible, leaving under half the viewport for the actual task. No fade/shadow at the bottom edge of the time grid hints that more rows exist below the fold.
Recommended resolution: low priority — consider a subtle bottom fade-out on the time grid container (matching the existing `gh2-scroll-fade` treatment already used on the day-pill row) so short-viewport users get the same "more below" affordance.

## 9. Visual Design Problems

- None found rising to the level of a defect — single-card layout, consistent `gh2-selectable` treatment across day pills and time buttons, clear active/inactive/current states.
- Minor: the "Current" slot badge style (`rounded-full bg-[rgba(29,75,54,0.08)]`) is quite subtle against the button background; not verified live since the current slot wasn't in the visible date range for this test booking — flag as code-derived, worth a contrast check when a "Current" badge is actually on screen.

## 10. Information Hierarchy Problems

- None significant. The page correctly leads with "what's open" (day count) before drilling into times, and the header's subtitle ("Your existing slot stays held until you confirm a new one") sets expectations well — though this copy is now slightly misleading given 03-001 (there is no separate "confirm" step; clicking IS confirming).

## 11. Section Ordering Review

Current order (Pick a new date → Times on {day}) is correct and standard for this task type — no reordering recommended.

## 12. Tabs, Steps, or Sectioning Recommendation

Recommend converting the current single-click flow into an explicit 2-step interaction (not full "steps" UI, just a commit gate):
- Step A (current): browse days → browse times → **select** a time (visually marks it chosen, does NOT submit).
- Step B (new): a "Confirm new time — {formatted date/time}" primary button appears (sticky footer or inline below the grid) that the patient must press to actually call `rescheduleAccountAppointment`.
Default state: no time pre-selected beyond the first day; confirm button disabled/absent until a slot is chosen.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Page header (unchanged)
2. `gh2-card-ivory` panel:
   - Pick a new date (unchanged)
   - Times on {day} grid — time buttons now *select* rather than submit
   - New: inline confirmation row — "Reschedule to {day}, {time}" + "Confirm" primary button + "Change" secondary link, appearing once a time is chosen

## 14. Proposed Container Simplification

No container-level changes needed — hierarchy is already minimal (see §5). The only change is behavioral (add a commit gate), not structural nesting.

## 15. Responsive Findings

- **Desktop/Laptop:** Full day range mostly visible, 5-column time grid, no issues.
- **Tabletl (1024×768):** Day pills scroll horizontally as expected, time grid adapts column count, no clipping.
- **Tabletp (768×1024):** Portrait tablet renders comfortably, day pills scroll, no issues observed.
- **Mobile (390×844) / Small mobile (375×667):** 2-column time grid, day pills scroll with visible fade affordance, header "Cancel" link remains reachable, no overlap with any fixed elements. Best-behaved page of the two audited in this pass.
- **Short (1366×650):** No clipping/unreachable actions (03-002 is a minor polish note, not a blocker) — confirmed scrollable, all controls reachable.

## 16. Accessibility Findings

- Heading outline: single `H1 "Reschedule booking"` — clean, no skipped levels.
- Day-pill row correctly uses `role="tablist"` / `role="tab"` / `aria-selected` (verified live: exactly 1 tab has `aria-selected="true"` at any time) and the time grid uses `role="tabpanel"` with a matching `aria-label` — good semantic pattern for this kind of date/time picker.
- Keyboard focus verified live: tabbing to a day-pill button produces a clearly visible focus ring (`outline: 2px solid`, `box-shadow: 0 0 0 4px #fff`) — passes basic visible-focus check.
- Time slot buttons have no `aria-pressed`/selection state exposed before commit (not applicable today since click = submit; becomes necessary once 03-001's two-step flow is built, so the chosen-but-unconfirmed slot is announced to assistive tech).
- No skip-link or landmark issue found; page is short and single-purpose.
- "Current" slot indicator is conveyed only via a small badge/text ("Current") next to the time, which does work for screen readers (text, not color-only) — good.

## 17. Content and Microcopy Findings

| Current | Recommended | Note |
|---|---|---|
| Subtitle: "Pick a new time with your current clinician. Your existing slot stays held until you confirm a new one." | Keep the sentiment, but this implies a confirm step that doesn't currently exist (03-001) — copy is accurate only once 03-001 is fixed. If 03-001 is not fixed short-term, change to: "Picking a new time reschedules this booking immediately." so the irreversibility is honestly communicated. | Flag — depends on product decision on 03-001, not rewriting proactively |
| "Pick a new date" / "Times on {day}" | Keep — clear, task-specific | — |
| Empty state: "No open times right now" + guidance to cancel/rebook or message clinic | Keep — good example of an actionable empty state | — |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| `chooseSlot` handler | `frontend/app/(auth)/account/bookings/[id]/reschedule/reschedule-picker.tsx:95-107` | Split into `selectSlot` (local state only) + `confirmReschedule` (calls API), gated behind a new confirm button | Page-specific | Medium | Small–Medium |
| Time slot button | `reschedule-picker.tsx:212-233` | Add `aria-pressed`/selected visual state for the chosen-but-unconfirmed slot | Page-specific | Low | Small |
| Header subtitle copy | `reschedule-picker.tsx` i18n defaults + locale bundles (`r.subtitle`) | Update wording once/if confirm step ships | Page-specific i18n | Low | Small |

## 19. Recommended Implementation Order

1. Add the select-then-confirm gate (03-001) — this is the only Critical-severity finding on this page and should ship before any other polish.
2. Update subtitle copy to match whatever behavior ships.
3. (Optional/low priority) short-viewport bottom fade affordance (03-002).

## 20. Acceptance Criteria (measurable)

- Clicking a time slot no longer calls the reschedule API directly; it only marks the slot as selected.
- A visible "Confirm" action exists and is the only path that triggers `rescheduleAccountAppointment`.
- Selecting a different slot before confirming updates the selection without any API call.
- Screen reader announces the selected-but-unconfirmed slot distinctly from the previously-committed "Current" slot.

## 21. Open Questions

- Was the immediate-submit-on-click behavior intentional (optimizing for fewest taps) or an oversight versus the subtitle copy's implication of a confirm step? Not answerable from code/browser alone — needs a product decision before 03-001 is implemented one way or the other.
- `getDoctorAvailability` (source not opened in this audit) — worth a follow-up check that it excludes the appointment's own currently-held slot correctly from being double-counted, but this is outside what browser/UI evidence can confirm.
