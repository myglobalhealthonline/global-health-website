# Doctor Portal — Page Audit: Calendar

## 1. Page Identification
- **Name**: Calendar
- **Route**: `/doctor/calendar`
- **Entry points**: Sidebar nav "Calendar" (Schedule group), quick links from Overview
- **Role**: DOCTOR
- **Workflow**: Doctor reviews the month view of booked consultations + own availability (OPEN/BLOCKED slots), opens a day to see its agenda, blocks/reopens individual slots or a whole day, adds recurring availability windows over a date range, and blocks time off over a date+time range.
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/calendar/page.tsx` — server component (data fetch + `AdminSummaryStrip` stats)
  - `frontend/app/(doctor)/doctor/calendar/ui.tsx` — client UI (444 lines): toolbar, month grid, day-agenda sheet, two `FormSection` forms, event dialog
- **Shared components used**: `PageHeader`, `AdminCard`, `AdminSummaryStrip`, `Btn`, `IconBtn` (`components/portal-atoms.ts` → `app/(admin)/admin/_components/atoms.tsx`), `MonthCalendar`, `DayAgenda`, `EventDetailDialog`, `TimezoneSelect` (`components/calendar/*`, **shared with patient portal**), `AppSheet`, `FormSection`, `RecordDetailsDrawer` family
- **APIs observed**: `fetchDoctorAvailabilityRange` (SSR), `fetchDoctorAppointments` (SSR), `fetchAvailabilityRangeClient`, `createAvailabilityWindow`, `bulkBlockSlots`, `toggleSlotStatus` (client, `lib/api/doctor-availability-client.ts`)
- **Date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **States tested**: default/populated (13 consultations, 379 open slots, 3 blocked), day-agenda sheet open, event-detail dialog open (unconfirmed consultation), add-availability validation error (end date before start date), keyboard tab order (15 tabs), form-field fill (no submit)

## 2. Page Purpose
Single source of truth for a doctor's schedule: what's booked, when they're open, and a way to manage their own bookable time (open new windows, block time off) without leaving the calendar.

## 3. Primary Doctor Tasks (priority order)
1. See today/this week's booked consultations at a glance.
2. Jump to a specific day and see its full agenda (consultations + slots).
3. Open a consultation's details / join the video call when it's time.
4. Block a single slot, a whole day, or a date range (time off).
5. Add new bookable availability for a future date range.

## 4. Clinical/Operational Importance
High. This is the doctor's operational command center for time — a missed or hard-to-find upcoming consultation, or an availability window not actually saved, directly causes a missed appointment or overbooking risk. The month grid and day agenda are the primary tool; anything that delays reaching them (see §10, CAL-04-001) has direct operational cost.

## 5. Current Page Structure (top-to-bottom)
1. Global compliance banner ("Complete your compliance setup") — portal-wide, not page-specific
2. `PageHeader`: icon + eyebrow "SCHEDULE" + H1 "Calendar" + description paragraph, in a large bordered/shadowed card
3. `AdminSummaryStrip`: 4 stat cards (Consultations, Open slots, Blocked slots, Timezone)
4. Toolbar: legend (Open/Blocked/Booked/Consultations dots) + timezone `<select>`
5. Inline error banner (conditionally rendered, only when `error` state is set)
6. `MonthCalendar`: header (month label, Today/prev/next) + weekday row + 7×N day grid
7. `AppSheet` day-agenda drawer (hidden until a day is clicked) — Block whole day / Re-open day buttons + `DayAgenda` (consultations list + slot chips)
8. Two `FormSection` cards side-by-side (`lg:grid-cols-2`): "Add availability" (date range + time range + duration) and "Time off" (datetime range + reason)
9. `EventDetailDialog` (hidden until an event/consultation is clicked)

## 6. Current Container Hierarchy (indented tree)
```
main
└─ PageHeader (card: border+shadow+24px radius)          [surface 1]
   └─ icon badge (card: shadow+12px radius)               [surface 2 — nested]
   └─ eyebrow dot (pill)                                   [surface 3 — nested]
AdminSummaryStrip
└─ 4× stat item (card: border+shadow+20px radius)          [surface 1 ×4]
   └─ icon badge (card: shadow+12px radius)                [surface 2 — nested, ×4]
Toolbar (no surface, flex row)
MonthCalendar
└─ .gh-calendar-panel (gh-card: border+shadow)              [surface 1]
   └─ 7×N day buttons (bg fill, no radius/border individually) [surface 2]
      └─ day-number pill (rounded-full)                     [surface 3 — today/selected only]
      └─ count dots (rounded-full, ×1-3 per day)             [surface 4]
AppSheet (day agenda) — overlay, own stacking context
└─ action row (2 buttons)
└─ DayAgenda (gh-card)                                       [surface 1]
   └─ consultation row (bordered card)                       [surface 2]
      └─ time chip (bg pill) + status badge (pill)           [surface 3]
   └─ slot chip ×N (bordered pill)                           [surface 2]
FormSection ×2 (bordered card)                                [surface 1 ×2]
└─ inputs (bordered) — [surface 2]
EventDetailDialog (RecordDetailsDrawer) — overlay
└─ 3 RecordDetailsSection blocks, each row is a bare flex line (no per-row card) — good, flat.
```
**Assessment**: `PageHeader` and each `AdminSummaryStrip` item nest an icon badge as its own visually-distinct rounded/shadowed surface (card-in-card) — 2 visible levels per unit, consistent with other audited portal pages (portal-wide pattern, not calendar-specific — do not fix in isolation). The `MonthCalendar` itself is appropriately flat (1 surface + plain buttons, no per-day card). `DayAgenda` and `EventDetailDialog` are also reasonably flat. Recommended max visible surface levels for this page: **2** (outer panel + inner interactive row/chip) — current structure already close to that except the header/stat-strip badge nesting, which is a portal-wide convention.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Timezone `<select>` | select | change | Re-renders grid/agenda in chosen tz, persists to localStorage | None found | 04-calendar-desktop-default-01.png |
| Today / ‹ / › | button | click | Moves month, refetches slots for new range | None found | — |
| Day cell | button | click | Opens `AppSheet` day agenda for that day | Unlabeled numeric badges color-only (§20 CAL-04-004) | 04-calendar-desktop-day-agenda-open-01.png |
| "Block whole day" / "Re-open day" | button | click (destructive-ish, bulk) | Bulk toggles all OPEN→BLOCKED or BLOCKED→OPEN for the day | Not tested to completion (would mutate data) — code-derived only | — |
| Consultation row in day agenda | button | click | Opens `EventDetailDialog` | Status badge text is clipped ("Request Recei…") inside the row (§11 CAL-04-006) | 04-calendar-desktop-day-agenda-open-01.png |
| Slot chip lock/unlock icon | button | click | Toggles single slot OPEN↔BLOCKED | Icon-only, no visible label, has `title` tooltip only (§20) | 04-calendar-desktop-day-agenda-open-01.png |
| Event detail dialog | dialog | click "Close" / Escape | Closes dialog | "Doctor" field always renders "—" on doctor's own calendar (§11 CAL-04-007) | 04-calendar-desktop-event-detail-dialog-02.png |
| Add-availability form fields | date/time/select | fill | Local state only | Fields accept an invalid range (to-date < from-date) with no client-side blur validation, only on submit | 04-calendar-desktop-add-availability-validation-05.png |
| "Add availability" submit | button | click | Validates client-side; on failure sets `error` state | **Error message renders far above the form, off-screen, no auto-scroll (§10 CAL-04-002)** | 04-calendar-desktop-validation-fullpage-07.png |
| Time-off fields + "Block range" / "Re-open" | datetime-local/text/button | fill/click | Same pattern as above | Same off-screen-error issue applies (same `error` state) | — |
| Keyboard Tab from page load | keyboard | Tab ×15 | Focus moves through sidebar nav items only | **No skip-to-content link; 14+ tab stops through sidebar before reaching page content (§20 CAL-04-003)** | 04-calendar-desktop-keyboard-focus-06.png |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default/populated | ✅ | — | Renders 13 consultations, 379 open, 3 blocked | Primary content below fold (CAL-04-001) |
| Day agenda open (day with consultation) | ✅ | — | Sheet slides in, shows consultation + slot chips | Badge clip (CAL-04-006) |
| Event detail (unconfirmed request) | ✅ | — | Shows "This request hasn't been confirmed yet.", no join link | Doctor field "—" (CAL-04-007) |
| Event detail (confirmed, joinable) | code-derived | ✅ | `EventDetailDialog` renders "Join video call" button when `joinState.kind === 'ready'` | Not triggered live — no confirmed same-day appointment in test data |
| Validation error (add-availability) | ✅ | — | Error text set, but off-screen | CAL-04-002 |
| Validation error (time-off, offFrom>=offTo) | code-derived | ✅ ui.tsx:248-250 | Same `error` state / same off-screen issue | CAL-04-002 |
| Empty day (no items) | code-derived | ✅ `DayAgenda.tsx:133-145` | "Nothing scheduled." + hint text | Not triggered live in this pass |
| Loading (month refetch) | code-derived | ✅ ui.tsx:174-187 (`busy` state) | Buttons disable via `disabled={busy}`; no visible spinner/skeleton on the grid itself | Could read as unresponsive on slow network — minor |
| Error (availability fetch failure server-side) | code-derived | ✅ page.tsx:27-45 | Whole-page fallback: `PageHeader` + single warning `AdminCard` replaces everything else | Reasonable pattern |
| Empty legend / 0 slots | code-derived | not directly observed | AdminSummaryStrip tone flips to "warning" when `openSlots === 0` | — |

## 9. Screenshots
| Filename | Viewport | State | Reason captured | Issues visible |
|---|---|---|---|---|
| 04-calendar-desktop-default-01.png | desktop | default | Matrix baseline | CAL-04-001 (grid starts at row edge, only partially visible) |
| 04-calendar-laptop-default-01.png | laptop | default | Matrix baseline | Calendar grid entirely below fold |
| 04-calendar-tabletl-default-01.png | tabletl | default | Matrix baseline | Same |
| 04-calendar-tabletp-default-01.png | tabletp | default | Matrix baseline | Grid barely starts at bottom edge |
| 04-calendar-mobile-default-01.png | mobile | default | Matrix baseline | Only compliance banner + hero card + 2 stat cards visible; no calendar |
| 04-calendar-smobile-default-01.png | smobile | default (retaken) | First matrix pass caught a loading spinner (hydration race, see §19) | Slow-hydration artifact |
| 04-calendar-short-default-01.png | short (1366×650) | default | Fold-sensitivity check | **Calendar grid completely off-screen** (CAL-04-001) |
| 04-calendar-mobile-fullpage-04.png | mobile | full page scroll | Confirm order/stacking of forms below grid | Forms stack under grid, single column — acceptable |
| 04-calendar-desktop-day-agenda-open-01.png | desktop | day agenda sheet, day w/ 1 consultation + 18 slots | Interaction test | Badge clip (CAL-04-006) |
| 04-calendar-desktop-event-detail-dialog-02.png | desktop | event detail dialog, unconfirmed request | Interaction test | "Doctor —" row (CAL-04-007) |
| 04-calendar-desktop-add-availability-validation-05.png | desktop | form filled with invalid range, post-submit | Validation test | Error not visible in viewport near the form |
| 04-calendar-desktop-validation-fullpage-07.png | desktop | full page after validation error | Confirms error position | Error renders ~170px above the top of the visible viewport (near the toolbar) |
| 04-calendar-desktop-keyboard-focus-06.png | desktop | after 15 Tabs | A11y check | Focus still inside sidebar nav after 15 tabs |

## 10. UX Problems

**CAL-04-001 — Primary tool (month grid) is below the fold on every tested viewport, and entirely hidden at short/laptop heights**
- Severity: **Critical**
- Evidence: Browser — `04-calendar-short-default-01.png` (grid not visible at all at 1366×650), `04-calendar-tabletp-default-01.png`, `04-calendar-mobile-default-01.png` (grid not visible), `04-calendar-desktop-default-01.png` (grid only starts near bottom edge at 1440×900)
- Root cause: The compliance banner + `PageHeader` (large icon+title+description card, `frontend/app/(admin)/admin/_components/atoms.tsx:26-86`) + `AdminSummaryStrip` (4 stat cards) + legend/timezone toolbar all render above `MonthCalendar` (`frontend/app/(doctor)/doctor/calendar/ui.tsx:353-367`), consuming ~700-900px of vertical space before the calendar itself appears. The `PageHeader` title/description ("Calendar" / "Your consultations and available slots...") duplicates information already present in the breadcrumb ("Doctor > Calendar") and page `<title>`.
- Doctor impact: A doctor opening the Calendar page to check today's schedule must scroll past a banner, a hero card, and 4 stat tiles before seeing a single date. On short/laptop-height screens (very common — 1366×650-768 is a standard laptop resolution with browser chrome) the grid is invisible without scrolling on load.
- Resolution: Do not touch `PageHeader` itself (shared, portal-wide, used correctly elsewhere per brief). For this page: (a) move the compliance-reminder banner to a collapsed/dismissed-by-default state site-wide (portal-wide fix, out of scope here — flag separately), (b) collapse `AdminSummaryStrip` to a single compact row (already 1 row, but is tall due to per-card padding) or place it beside the calendar grid on `xl:` breakpoints as a slim sidebar instead of a full-width row above it, (c) drop the `PageHeader` description paragraph on this page only (`description={d.calendar.description}` at `page.tsx:84`) since it's redundant with the eyebrow + breadcrumb, saving ~40-56px.

**CAL-04-002 — Form validation error renders off-screen, no scroll-into-view**
- Severity: **High**
- Evidence: Browser automation — filled `Add availability` (to-date before from-date) and clicked submit; `getBoundingClientRect()` of the resulting `.text-rose-800` error box returned `y: -170` (i.e., 170px above the visible viewport top) with the form still on-screen at the bottom. Screenshots: `04-calendar-desktop-add-availability-validation-05.png` (no error visible near form) vs `04-calendar-desktop-validation-fullpage-07.png` (full-page capture shows the error banner near the toolbar, far above).
- Root cause: `ui.tsx:347-351` renders the single shared `error` state in one location (between the toolbar and `MonthCalendar`), but both bottom-of-page forms (`onAddAvailability` at `ui.tsx:281-327`, `onRangeTimeOff` at `ui.tsx:243-275`) write to that same top-of-page `error` state via `setError(...)`. There is no `scrollIntoView` call and no per-form inline error.
- Doctor impact: A doctor filling either bottom form who makes a mistake (e.g., end date before start date, times reversed) sees the button do nothing — the error appears off-screen with no visual acknowledgement near the click target, which reads as a silent failure / broken button.
- Resolution: Either (a) move to per-form inline error text directly under each `FormSection`'s submit button (requires splitting `error` into `addAvailabilityError`/`timeOffError` state), or (b) keep single shared error state but call `errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })` when `error` transitions from null to a string. Option (a) is the correct fix — it also disambiguates which form failed when both forms are visible at once (`lg:grid-cols-2`).

**CAL-04-003 — No skip-to-content link; full sidebar must be tabbed through before reaching page controls**
- Severity: **Medium** (portal-wide, but directly measured on this page)
- Evidence: Browser automation — 15 sequential `Tab` presses from page load stayed entirely within `.gh-portal-nav-item` sidebar links (Overview → Appointments → Messages → Calendar → Availability → Patients → My Services → Forms → Invoices → Reports → Notifications → Profile ×2 → Security), never reaching the toolbar, calendar grid, or forms. See raw tab-order log captured during this audit run.
- Root cause: No "Skip to main content" link at the top of the portal shell (not found in DOM at any tab stop 1-15).
- Doctor impact: Keyboard-only or screen-reader users must tab through 14+ irrelevant nav links every single page load to reach the calendar's interactive controls (day cells, forms). This is a portal-wide shell issue (not calendar-specific) but materially worsens this page's usability given it has 30+ day-cell buttons plus two multi-field forms to reach.
- Resolution: Add a visually-hidden-until-focused "Skip to main content" link as the first focusable element in the portal shell layout (likely `frontend/app/(doctor)/layout.tsx` or a shared `PortalShell` component), targeting `<main id="main-content">`. One shared fix covers all doctor/admin/patient portal pages — recommend filing as a portal-wide a11y ticket rather than a calendar-only patch.

**CAL-04-005 — Add-availability date/time fields accept an invalid range with no inline (blur-time) feedback**
- Severity: Low
- Evidence: Browser — filled `From date=20/07/2026`, `To date=10/07/2026` with native `<input type="date">` controls; no visual error state (red border, inline message) appeared on the fields themselves until after clicking "Add availability" (and then only as the off-screen banner in CAL-04-002).
- Root cause: `ui.tsx:281-327` validates only on submit (`onAddAvailability`), not on blur/change; no `min`/`max` cross-field constraint is set on the `<input type="date">` elements (e.g., `min={addFromDate}` on the "To date" input would let the browser natively prevent the invalid pick).
- Doctor impact: Minor — doctor can type a nonsensical range and only discovers the mistake after clicking submit and (per CAL-04-002) not even then without scrolling.
- Resolution: Add `min={addFromDate || undefined}` to the "To date" input and `min={addStart}`-equivalent minute constraint hint to the "To time" input; keep the submit-time validation as a fallback for edge cases (e.g., typed values).

## 11. Visual Design Problems

**CAL-04-006 — Consultation status badge clips inside the day-agenda row**
- Severity: Medium
- Evidence: Browser — `04-calendar-desktop-day-agenda-open-01.png`, the "Request Received" badge for the 10:00 consultation renders as "Request Recei" with no ellipsis before the row's right edge/video icon.
- Root cause: `DayAgenda.tsx:188-193` sets `max-w-[92px] shrink-0 truncate` on the badge but the row also has a `Video` icon (`DayAgenda.tsx:194-196`) immediately after it inside a `flex` row with `overflow-hidden` on the parent (`gh-agenda-row ... overflow-hidden`, line 162) — the combination of a fixed 92px max-width badge next to a name/type block that can also grow causes the badge to visually compete for space and clip mid-word rather than showing a clean ellipsis in the captured render.
- Doctor impact: Cosmetic but reads as broken UI in a clinical tool; "Request Recei" is not immediately parseable as "Request Received."
- Resolution: Verify `truncate` (which needs `overflow:hidden` + `text-overflow:ellipsis` + `white-space:nowrap`, all provided by Tailwind's `truncate` utility) is not being overridden by a portal.css rule on `.gh-badge`; if not, increase `max-w-[92px]` slightly (e.g. `max-w-[104px]`) or drop the `Video` icon's `shrink-0` competition by giving the badge a fixed order value.

**CAL-04-008 — Legend row and timezone selector float unanchored above the calendar with no visual grouping to the card below**
- Severity: Low
- Evidence: Browser — `04-calendar-desktop-default-01.png`: the "Open / Blocked / Booked / N Consultations / View in [select]" toolbar sits directly on the page background with no card/divider, then the `MonthCalendar` card begins immediately below. It reads acceptably at desktop but at `tabletp`/`mobile` (see `04-calendar-tabletp-default-01.png`) the legend wraps to 2 lines and the timezone select drops to its own row, adding vertical height without any grouping cue that it "belongs" to the calendar below it.
- Resolution: Low priority — could be pulled inside the `MonthCalendar` card's header row (which already has Today/prev/next controls) to reduce the ungrouped floating toolbar, but this is a nice-to-have, not a blocker.

## 12. Information Hierarchy Problems
- The `PageHeader` H1 "Calendar" + description duplicates the breadcrumb "Doctor > Calendar" and the sidebar's highlighted "Calendar" item — three redundant labels for "you are on the Calendar page" before any schedule content appears (compounds CAL-04-001).
- Day cells show raw numbers for open/blocked/booked counts distinguished **only by color** (green dot = open, red dot = blocked, blue dot = booked) with no text label — see `MonthCalendar.tsx:166-192`. A doctor scanning the month at a glance cannot tell open vs. blocked slot counts without color vision or hovering (there is no `title`/tooltip on these count spans either — only the consultation count has an `aria-label`, at `MonthCalendar.tsx:117-121`).
- "Open Slots: 379" as a single giant stat (`page.tsx:99-104`) is not independently actionable — a doctor cannot do anything with the raw count "379 bookable this range" beyond confirming it isn't zero. This is a known-accepted stat-strip pattern per the audit brief (do not recommend removing `AdminSummaryStrip` wholesale) but this specific number's precision (379 vs. a rounded/qualitative "379 this month") adds no clinical value — kept as Low-priority note only, not an issue ID.

## 13. Current Section Order
1. Compliance banner (portal-wide)
2. PageHeader (icon/title/description)
3. AdminSummaryStrip (4 stats)
4. Toolbar (legend + timezone)
5. Error banner (conditional)
6. MonthCalendar
7. Day-agenda AppSheet (overlay, not in normal flow)
8. Add-availability + Time-off forms (2-col)
9. EventDetailDialog (overlay, not in normal flow)

## 14. Recommended Section Order (+ reasons)
1. Compliance banner — unchanged (portal-wide, out of scope)
2. Compact PageHeader (title only, no description paragraph on this page — reasoning: breadcrumb + sidebar already establish location; description adds height without adding information a doctor needs before seeing their schedule)
3. Toolbar (legend + timezone) — moved above the stat strip so it sits directly adjacent to the calendar it controls
4. MonthCalendar — promoted higher, this is the primary task surface and should be reachable with minimal scrolling
5. AdminSummaryStrip — kept, but demoted below the grid, or converted to a slim single-line strip beside the calendar header on `xl:` breakpoints (grid + stats side-by-side) rather than a full-width block above it
6. Add-availability + Time-off forms — unchanged position (secondary, less-frequent task; fine below the fold)
- Reasoning: doctors open Calendar primarily to *look at* the schedule, not to read stats about it first. The forms are configuration tasks performed occasionally and are correctly placed last.

## 15. Tabs/Steps/Sectioning Recommendation
No tab system needed — page is a single coherent view (calendar + 2 small forms), not a long unstructured scroll once §14's reordering is applied. Recommend **against** introducing tabs here; the 2 forms already read cleanly as a `lg:grid-cols-2` pair and splitting them into tabs would hide "Time off" behind an extra click for a task doctors need quickly (e.g., booking sudden leave).

## 16. Save & Finalization Recommendation
- Two independent, clearly-scoped save actions ("Add availability" and "Block range"/"Re-open") — no ambiguity about what each button submits; this is a good pattern, unlike some other portal pages with multiple ambiguous saves.
- Gap: neither form warns on navigate-away with unsaved input (e.g., partially filled date range) — low risk since these are short single-screen forms with no multi-step state, so a navigation guard is not warranted here. No change recommended.
- Recommend fixing the error-visibility gap (CAL-04-002) as the priority "save clarity" fix for this page — a save button that appears to silently fail is the most serious save-pattern problem found.

## 17. Proposed Page Structure (exact top-to-bottom)
1. Compliance banner (unchanged, portal-wide)
2. Compact header: icon + "Calendar" title only (no description)
3. Toolbar: legend + timezone select (unchanged content, moved up)
4. MonthCalendar (promoted)
5. AdminSummaryStrip — compact single row (or `xl:` side rail next to the calendar)
6. Add-availability + Time-off forms (2-col, unchanged)
7. Day-agenda AppSheet (overlay, unchanged)
8. EventDetailDialog (overlay, unchanged)

## 18. Proposed Container Simplification
- **Keep**: `MonthCalendar` panel (already flat), `DayAgenda` panel, `FormSection` cards ×2, `AdminSummaryStrip` cards (owner-mandated keep).
- **Remove**: `PageHeader` description paragraph on this page only (pass no `description` prop at `page.tsx:84`).
- **Flatten**: none needed inside `MonthCalendar`/`DayAgenda` — already close to the 2-surface-level target.
- **Move**: `AdminSummaryStrip` from above-the-grid to below-the-grid (or beside it at `xl:`), per §14.
- **No new tables/tabs/dividers needed.**

## 19. Responsive Findings (per viewport)
- **desktop (1440×900)**: Calendar grid only becomes visible after the header+stats block; first day row starts at ~y=680. Forms readable 2-col. No overflow issues.
- **laptop (1280×720)**: Grid entirely below fold on load.
- **tabletl (1024×768)**: Same as laptop — grid below fold.
- **tabletp (768×1024)**: Grid barely starts at the very bottom edge of the viewport (see `04-calendar-tabletp-default-01.png`).
- **mobile (390×844)**: Grid not visible without scrolling (`04-calendar-mobile-default-01.png`); full-page capture (`04-calendar-mobile-fullpage-04.png`) confirms forms stack single-column correctly below the grid, no horizontal overflow observed.
- **smobile (375×667)**: First automated pass captured a loading spinner instead of content (`04-calendar-smobile-default-01.png`, initial capture) — a re-run with a longer settle delay showed normal content, so this looks like a hydration-timing artifact under this test harness's CPU/network throttling rather than a real product bug; flagged as an **untestable/flaky state**, not an issue ID. Worth a manual spot-check on a real low-end Android device given the portal-wide Android backdrop-filter/matrix-glitch history noted in project memory.
- **short (1366×650)**: Grid completely off-screen; this is the most common real-world laptop-with-browser-chrome height and the worst-case instance of CAL-04-001.
- Month grid itself (7-column CSS grid, `MonthCalendar.tsx:105`) did not show column overflow or cell-content clipping at any tested width — day-count badges correctly fall back to a compact dot+numeral pattern below `sm:` breakpoint (`MonthCalendar.tsx:155-164`), which is a good existing responsive pattern.

## 20. Accessibility Findings
- **CAL-04-003** (skip-to-content) — see §10, Medium.
- **CAL-04-004 — Day-cell open/blocked/booked counts are color-only, no text label**
  - Severity: Medium
  - Evidence: Code — `MonthCalendar.tsx:166-192`; only the aggregate consultation count has an `aria-label` (line 117-121: `"${dayLabel}, ${consults} consultation(s)"`); the open/blocked/booked numeral spans have no `aria-label`, `title`, or visually-hidden text distinguishing them beyond dot color.
  - Doctor impact: Screen-reader users get no information about open/blocked/booked slot counts per day at all (not even announced); colorblind users must rely on numeral position/order memorization since dot color is the only differentiator when 2+ counts appear on the same day (e.g., "10 → 15 open, 3 blocked" renders as two colored numerals with no label).
  - Resolution: Extend the existing `aria-label` on each day button to include a full sentence, e.g. `"${dayLabel}, ${consults} consultations, ${open} open slots, ${blocked} blocked slots"`, and/or add `aria-hidden` dot spans paired with visually-hidden text per count.
- Icon-only slot-toggle button in day agenda (`ui.tsx:421-435`) has a `title` attribute (`s.blockSlotTitle`/`s.reopenSlotTitle`) but no `aria-label` — `title` alone is not reliably exposed to all screen readers/mobile touch. Low severity, easy fix: add `aria-label={isOpen ? s.blockSlotTitle : s.reopenSlotTitle}` alongside the existing `title`.
- Modal focus trap/Escape: `EventDetailDialog`/`AppSheet` are Radix-based (`RecordDetailsDrawer`, `Dialog.Title`) — Radix Dialog provides focus trap and Escape-to-close by default; observed Escape closing the event dialog correctly during this audit (code + behavior consistent, not flagged as an issue).
- Contrast: not spot-checked via computed contrast ratio in this pass (no low-contrast text visually apparent in screenshots); recommend a follow-up automated axe-core pass across the whole portal rather than a manual per-page check.
- Touch targets: slot-toggle icon buttons in the day agenda are small (`size-3` icon inside a bare `<button>` with no padding beyond `ml-0.5`, `ui.tsx:422-434`) — likely under the 44×44px recommended touch target on mobile. Not independently verified via bounding box in this pass; flagged as Low, code-derived.

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| **CAL-04-009**: "Add availability" (form title AND submit button, identical text) | Keep title; change button to "Save availability" or "Create window" | Two identically-labeled controls (`FormSection` title at `ui.tsx:446` and the submit `Btn` at `ui.tsx:515`) reads ambiguous in a screen-reader element list ("Add availability" appears twice in a row) |
| "Re-open" (Time-off form) vs. "Reopen day" (day-agenda sheet) vs. "reopenSlotTitle" tooltip | Standardize on one verb form, e.g. "Reopen" everywhere (no hyphen) | Inconsistent hyphenation across 3 places for the same action concept |
| Day-agenda "Doctor" field always shows "—" | Omit the "Doctor" row entirely on the doctor's own calendar (`viewerRole="doctor"` equivalent to the existing `isPatientView` self-reference suppression already implemented for patients — see CAL-04-007 below) | Showing "Doctor: —" on your own schedule reads as missing/broken data, not "not applicable" |
| "Bookable this range" (Open Slots stat hint) | Fine as-is | — |
| Date format in AdminCard error state / dialog ("3 Jul 2026, 10:00") | Consistent with rest of portal — no change | — |

**CAL-04-007 — `EventDetailDialog`'s "Doctor" field is dead weight on the doctor's own calendar**
- Severity: Low
- Evidence: Browser — `04-calendar-desktop-event-detail-dialog-02.png` shows "Doctor —"; Code — `EventDetailDialog.tsx:117` unconditionally renders `<RecordDetailsField label="Doctor" value={item.meta?.doctorName ?? undefined} />` for all non-`isPatientView` callers, and `RecordDetailsField` (`RecordDetailsDrawer.tsx:161-166`) renders `"—"` for any empty value rather than omitting the row. `page.tsx:56-71` never populates `meta.doctorName` for the doctor calendar's own consultations (only `patientName`, `consultationType`, `meetingUrl`, `countryCode` are set) — because it's always the viewing doctor themselves, so the field is structurally always empty here.
- Doctor impact: Cosmetic confusion — every consultation the doctor opens shows a "Doctor: —" line, which can read as a data/loading bug rather than intentional self-omission.
- Resolution: `EventDetailDialog` already has the pattern needed — `viewerRole="patient"` suppresses the self-referential "Patient" row (`EventDetailDialog.tsx:118`). Pass `viewerRole="doctor"` from the doctor calendar's `<EventDetailDialog item={activeItem} tz={tz} onClose={...} />` call (`ui.tsx:589`) and extend the component's conditional (currently only `isPatientView` is checked) to also suppress the "Doctor" row when `viewerRole === "doctor"`. **This touches the shared `EventDetailDialog` component used by the patient portal too** — low risk (additive conditional, default behavior for `admin`/undefined role is unchanged) but should be verified against the patient-portal and admin-portal calendar/appointment views before merge.

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| `DoctorCalendarPage` | `frontend/app/(doctor)/doctor/calendar/page.tsx` | Drop `description` prop on `PageHeader` (CAL-04-001) | No (doctor-calendar only) | Low | Trivial |
| `DoctorCalendarUI` | `frontend/app/(doctor)/doctor/calendar/ui.tsx` | Reorder sections (toolbar+grid above stats), split `error` into per-form state or add scroll-into-view (CAL-04-002), add `min` date constraint (CAL-04-005), fix duplicate "Add availability" button label (CAL-04-009) | No | Medium (state split touches 3 handlers) | Medium |
| `MonthCalendar` | `frontend/components/calendar/MonthCalendar.tsx` | Extend day-cell `aria-label` to include open/blocked/booked counts (CAL-04-004) | **Yes — shared with patient/admin calendar** | Low (additive, string-only change) | Trivial |
| `EventDetailDialog` | `frontend/components/calendar/EventDetailDialog.tsx` | Add `viewerRole === "doctor"` handling to suppress self-referential Doctor row (CAL-04-007) | **Yes — shared with patient portal** | Low-Medium (verify no regression on patient/admin views) | Small |
| `DayAgenda` | `frontend/components/calendar/DayAgenda.tsx` | Fix badge truncation (CAL-04-006); add `aria-label` to slot-toggle prop consumers | **Yes — shared with patient/admin calendar** | Low | Trivial |
| Portal shell layout | `frontend/app/(doctor)/layout.tsx` (or shared `PortalShell`) | Add skip-to-content link (CAL-04-003) | **Yes — portal-wide (doctor/admin/patient)** | Low | Small — but recommend as its own ticket, not bundled into this page's fixes |

## 23. Backend or Business-Logic Impact
- All recommended fixes in this audit are **frontend-only** (layout reorder, ARIA labels, error-display timing, prop passing). No API, schema, or business-logic changes required.
- No clinical/legal review needed — no change to what data is shown, only how/where it's shown and labeled.

## 24. Recommended Implementation Order
1. CAL-04-002 (off-screen validation error) — highest doctor-facing pain for lowest risk, isolated to `ui.tsx`.
2. CAL-04-001 (fold/reorder) — isolated to this page's `page.tsx`/`ui.tsx`, no shared-component risk.
3. CAL-04-004 (day-cell aria-label) — trivial, shared component but additive-only.
4. CAL-04-006 (badge clip), CAL-04-005 (date min constraint), microcopy fixes (§21) — batch as one small PR.
5. CAL-04-007 (EventDetailDialog viewerRole="doctor") — needs patient/admin calendar screenshot verification before merge since it's shared.
6. CAL-04-003 (skip-to-content) — file as a separate portal-wide ticket, not part of this page's PR.

## 25. Acceptance Criteria (measurable)
- At 1366×650 and 1280×720, at least the `MonthCalendar` header row (month label + Today/prev/next) is visible without scrolling on initial page load.
- Submitting either form with an invalid range shows an error message within the visible viewport without requiring the user to scroll, verified at 1440×900 and 390×844.
- Each day-cell's accessible name (via `aria-label` or accessibility-tree dump) includes open/blocked/booked counts when present, not just consultation count.
- The doctor's own `EventDetailDialog` no longer shows a "Doctor —" row; patient-portal and admin-portal `EventDetailDialog` usages screenshot-diffed and confirmed unchanged.
- "Add availability" form title and submit button no longer share identical text.

## 26. Open Questions
- Should `AdminSummaryStrip` on this page move below the grid, or become a slim `xl:`-only side rail beside it? Needs a design call (Fable/owner) — this audit recommends "below" as the lower-risk, single-breakpoint-agnostic option, but a side-rail is likely nicer at large desktop widths.
- Is the compliance-reminder banner intended to persist across every portal page until 2FA is enabled, or should it be dismiss-and-remember? It's the single largest fixed-cost contributor to CAL-04-001 across the whole portal (not just Calendar) — worth a portal-wide decision rather than a per-page fix.
- Confirm with product whether "379 open slots" is meant to be actionable/clickable (e.g., jump to first open day) or purely informational — currently purely informational, which is fine but worth confirming intent.
- `EventDetailDialog` viewerRole fix (CAL-04-007) needs sign-off since it's a shared component — flagging for Fable/shared-component review per the brief's guidance.
