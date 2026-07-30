# 05 — Availability (Doctor Portal)

## 1. Page Identification
- **Name:** Availability
- **Route:** `/doctor/availability`
- **Entry points:** Doctor sidebar → Schedule → Availability (persistent nav item)
- **Role:** DOCTOR
- **Workflow stage:** Ongoing schedule maintenance (recurring weekly hours), separate from day-to-day calendar management
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/availability/page.tsx` (server component)
  - `frontend/app/(doctor)/doctor/availability/_components/availability-ui.tsx` (client, 444 lines)
  - `frontend/app/(doctor)/doctor/availability/_components/availability-week-view.tsx` (client, 152 lines)
  - `frontend/components/calendar/WeekCalendar.tsx` (shared grid, also used by admin doctor-availability editor and doctor `/calendar`)
- **Shared components used:** `AdminCard`, `AdminSummaryStrip`, `AdminEmptyState`, `Pill`, `Btn`, `SectionHeader`, `PageHeader` (portal-atoms), `FormSection`, `PortalDialog`, `WeekCalendar`, `EventDetailDialog`, `TimezoneSelect`
- **APIs observed (code):** `fetchDoctorAvailability(14)` (server, initial 14-day load), `createAvailabilityWindow`, `deleteAvailabilityWindow`, `fetchAvailabilityRangeClient`, `toggleSlotStatus` (client) — `frontend/lib/api/doctor-availability-client.ts` / `doctor-availability-server.ts`; backend `frontend/app/api/doctor/availability/route.ts`, `.../[availabilityId]/route.ts`
- **Date:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (7-viewport matrix) + full-page captures for mobile/short/desktop
- **States tested (browser):** default/populated (10 real windows, 124 slots), add-window form filled-but-not-submitted (overlap scenario), delete-confirmation dialog open → Escape (not confirmed), keyboard Tab traversal. Empty state, loading state, error state, and "0 windows" state are **code-derived only** (not triggerable without mutating real data).

## 2. Page Purpose
Lets a doctor define their **recurring weekly working hours** (per-weekday time bands, "base" slot-duration grid, optional effective date range) which the backend expands into concrete bookable time slots, and gives a week-grid view to spot-block/reopen individual generated slots and see booked consultations.

## 3. Primary Doctor Tasks (priority order)
1. See at a glance: how many recurring rules exist, how many slots are open/booked/blocked this window.
2. Review/edit the recurring weekly schedule (add a new weekly window; remove an old one).
3. Spot-check the current week's grid for booked appointments vs open slots.
4. Toggle an individual generated slot open/blocked directly from the grid.
5. Understand what timezone everything is expressed in.

## 4. Clinical/Operational Importance
High — this is the source of truth for patient-bookable capacity. An overlap, a wrong effective-date range, or an accidental deletion of the wrong recurring window directly changes what patients can book, with no undo. Because generated slots cascade from these rules ("Future open slots derived from it will be cleared" on delete), mistakes here have a wider blast radius than a single-appointment edit.

## 5. Current Page Structure (top-to-bottom)
1. Compliance banner (2FA nudge, global to portal)
2. PageHeader (eyebrow "Schedule", title "Availability", description)
3. AdminSummaryStrip (4 stat cards: Weekly windows / Open slots / Booked / Blocked)
4. Two-column grid:
   - Left (flex-1): "Week calendar" card → help text → timezone select → WeekCalendar (7-day hour grid)
   - Right (360px sidebar): "Weekly windows" card (list of all recurring rules) → "Add window" form card → "Legend" card
5. Delete-confirmation dialog (modal, hidden by default)

## 6. Current Container Hierarchy (indented tree)
```
main (gh-admin-main)
└─ AdminSummaryStrip (4× stat card) — level 1
└─ .grid.lg:grid-cols-[1fr_360px]                         — layout grid, no surface
   ├─ AdminCard "gh-doctor-panel" (Week calendar)          — level 1
   │  └─ SectionHeader (no surface)
   │  └─ .p-5
   │     └─ .grid.gap-3 (WeekView wrapper, no surface)
   │        └─ WeekCalendar → .gh-calendar-panel.gh-card   — level 2 (card-in-card)
   │           └─ header row (border only)                — level 3
   │           └─ .overflow-x-auto → .gh-week-grid
   │              └─ legend dots (rounded, bg)             — level 4
   └─ aside (grid gap-4)
      ├─ AdminCard (Weekly windows list)                   — level 1
      │  └─ ul → li.gh-doctor-window-row (border+bg)       — level 2, ×10 rows
      │     └─ Pill (rounded pill, bg)                     — level 3
      ├─ FormSection (Add window)                          — level 1
      └─ AdminCard (Legend)                                — level 1
```
Max measured surface depth = 4 (AdminCard → gh-calendar-panel card → header divider → legend dot), confirmed via `getComputedStyle` walk. This is acceptable — **not** an excessive-nesting page. The one true "card-in-card" is AdminCard wrapping `gh-calendar-panel` for the week grid; it's a reasonable single level of nesting (outer card = page section, inner card = the calendar's own chrome) and does not need flattening.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Sidebar "Availability" | nav link | click | navigates to page | — | 05-availability-desktop-default-01 |
| Stat cards ×4 | static card | none (no click handler) | — | Fine — informational, not fake-clickable | 05-availability-desktop-default-01 |
| "View in" timezone select | select | change | re-renders week grid in chosen zone | — | — |
| Previous/Next week, Today | buttons | click | refetches slots for that week | not tested live (would mutate view state only, safe, but not exercised this pass) | code-derived |
| Open slot in grid | grid cell | click | toggles OPEN→BLOCKED | not triggered (safe but mutates real data) | code-derived |
| Blocked slot in grid | grid cell | click | toggles BLOCKED→OPEN | not triggered | code-derived |
| Booked slot in grid | grid cell | click | opens `EventDetailDialog` (read-only) | not triggered this pass | code-derived |
| "Delete window" (trash icon) ×10 | icon-only button | click | opens `PortalDialog` "Remove weekly window?" | **Dialog body does not restate which window (day/time) is being deleted** — see 05-004 | 05-availability-desktop-delete-dialog-04 |
| Delete dialog → Escape | keyboard | Escape | dialog closes, no mutation | confirmed safe | 05-availability-desktop-delete-dialog-escaped-05 |
| Delete dialog → "Cancel" | button | click | closes, no mutation | not clicked (Escape used instead per safety rule) | — |
| Add-window form: Day select | select | change | updates local state | — | — |
| Add-window form: From/To time | input[time] | fill | updates local state | **No client-side overlap validation** against existing windows for the same weekday — see 05-002 | 05-availability-desktop-overlap-form-03 |
| Add-window form: Base slot length | select | change | updates local state | — | — |
| Add-window form: Starts/Ends (optional) | input[date] | fill | updates local state | native `dd/mm/yyyy` placeholder only, no explicit format hint elsewhere on page | — |
| "Add window" submit | button[type=submit] | — | POSTs `createAvailabilityWindow` | not submitted (would mutate real doctor's live schedule) | — |
| Weekly windows list rows | static row | none | — | Duplicate day/time combos are visually indistinguishable except for the tiny effective-date sub-line — see 05-003 | 05-availability-desktop-default-full |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Populated (10 windows, 124 slots, 0 booked, 0 blocked) | ✅ | — | Renders correctly | 05-003 (overlap/duplicate ambiguity) |
| Add-window form filled, not submitted | ✅ | — | No validation feedback for overlapping windows | 05-002 |
| Delete confirmation dialog | ✅ | — | Opens, generic wording, dismissible via Escape | 05-004 |
| Empty (0 windows) | — | ✅ (`AdminEmptyState` renders `noWindowsTitle`/`noWindowsDesc`) | Code path exists | not visually verifiable without deleting real data |
| Loading | — | ✅ (`useTransition` `busy` sets `pointer-events-none opacity-70` on the week grid only; sidebar list/form show no skeleton) | Partial — form buttons show a text swap ("Adding…") but list/stat-strip have no loading affordance on first paint (page is server-rendered so this mostly doesn't matter) | Low |
| Error (API failure) | — | ✅ (top-of-page red banner `rose-50/rose-800`, plus a second independent error banner inside `WeekCalendar`'s own state) | Two separate error banners can exist simultaneously for two different failure sources with identical styling and no distinction | 05-005 |
| Validation error (end ≤ start, end-date ≤ start-date) | — | ✅ (`s.errorEndAfterStart` / `s.errorEndDateAfterStart`, shown in the same shared top banner, not inline under the field) | Errors from a sidebar form show in a full-width banner above the summary strip, far from the field that caused it | 05-006 |
| Mobile week-grid overflow | ✅ | ✅ (root cause traced) | **Thursday–Sunday columns are clipped off-screen with no way to scroll to them** | 05-001 (Critical) |

## 9. Screenshots
All in `docs/audits/portal/doctor/screenshots/05-availability/`:
- `05-availability-desktop-default-01.png` — desktop 1440, default state
- `05-availability-laptop-default-01.png` — laptop 1280
- `05-availability-tabletl-default-01.png` — tablet landscape 1024
- `05-availability-tabletp-default-01.png` — tablet portrait 768
- `05-availability-mobile-default-01.png` — mobile 390 (viewport crop)
- `05-availability-smobile-default-01.png` — small mobile 375
- `05-availability-short-default-01.png` — short 1366×650
- `05-availability-mobile-default-full.png` — mobile 390, full page — shows week grid cut to Mon/Tue/Wed only (05-001)
- `05-availability-short-default-full.png` — short viewport, full page
- `05-availability-desktop-default-full.png` — desktop, full page
- `05-availability-desktop-overlap-form-03.png` — Add-window form filled with an overlapping Mon 10:00–11:00 window, no warning shown (05-002)
- `05-availability-desktop-delete-dialog-04.png` — delete-confirmation dialog, generic wording (05-004)
- `05-availability-desktop-delete-dialog-escaped-05.png` — dialog dismissed via Escape, no mutation occurred

## 10. UX Problems

**05-001 — Critical — Week grid loses Thursday–Sunday entirely on mobile/narrow viewports, with no scroll affordance**
- Evidence: browser, `05-availability-mobile-default-full.png`; code, `frontend/components/calendar/WeekCalendar.tsx:266-267` and `frontend/app/(doctor)/doctor/availability/_components/availability-week-view.tsx:112`
- Doctor impact: On a phone (the device doctors are most likely to check their schedule from between patients), only Mon–Wed of the week grid is visible. Thu/Fri/Sat/Sun columns are rendered in the DOM (confirmed via `page.evaluate`) but visually cut off with **zero way to reach them** — no horizontal scrollbar, no swipe affordance, no "next days" control.
- Root cause: `WeekCalendar.tsx` wraps the 720px-wide `.gh-week-grid` in a div with `overflow-x-auto`, which is the correct pattern — but that div is a **child of a CSS grid item** (`<div className="grid gap-3">` in `availability-week-view.tsx:112`) that itself has no `min-width: 0`. Per the CSS grid spec, a grid item's default `min-width` is `auto`, so instead of shrinking to the 324–366px available column, the item (and everything inside it, including the "should-scroll" div) grows to fit its 720px content and overflows its own ancestors until something with `overflow: hidden` finally clips it — which turns out to be `<main>` itself. The `overflow-x-auto` div therefore never becomes narrower than its content, so it never gets a scrollbar; it just gets truncated upstream instead.
- Resolution: Add `min-w-0` (Tailwind) to the `.grid.gap-3` wrapper in `availability-week-view.tsx:112`, and audit every ancestor between it and `.overflow-x-auto` (the `p-5` div, the `gh-admin-card` panel, and the `lg:grid-cols-[minmax(0,1fr)_360px]` grid — the latter already correctly uses `minmax(0, …)`) for the same missing `min-width: 0`. This is a shared component (`WeekCalendar`), so the same bug should be checked on `/doctor/calendar` and the admin per-doctor availability editor (`admin/doctors/[id]/availability/_components/availability-week.tsx`), which reuse the identical `WeekCalendar` + wrapper pattern.

**05-002 — High — No overlap detection/warning when adding a window that conflicts with an existing one**
- Evidence: browser, `05-availability-desktop-overlap-form-03.png` (Mon 10:00–11:00 entered while Mon 09:00–17:00 and Mon 19:00–22:00 already exist — no inline warning); code, `availability-ui.tsx:90-129` `onAddWindow` only validates `endMin <= startMin` and date-range ordering, no overlap check against `windows` state.
- Doctor impact: A doctor can create two, three, or more overlapping recurring windows for the same weekday (the real account already has this: two separate "Mon · 09:00–17:00" windows and three separate "Fri · 09:00–17:00" windows with different effective ranges — see item 05-003) without any warning that they're duplicating/overlapping coverage. Silent overlaps make the schedule harder to reason about and increase the chance of the wrong window being edited/deleted.
- Root cause: Validation in `onAddWindow` is time-order and date-order only; there's no client-side (or apparently server-side, given the live account already has overlaps) overlap check per weekday.
- Resolution: Add an inline warning (not a hard block, since legitimate overlapping windows with different effective ranges do exist — e.g. a temporary extra Friday evening clinic) directly under the time fields when the new window's [startMinute,endMinute] intersects an existing active window on the same weekday within an overlapping effective-date range. Non-blocking amber notice, e.g. "This overlaps your existing Mon 09:00–17:00 window."

**05-003 — Medium — Weekly-windows list doesn't visually distinguish near-duplicate rules**
- Evidence: browser, `05-availability-desktop-default-full.png` / code-derived from `dump` text output: the real account has 10 windows including **two** "Mon · 09:00–17:00" and **three** "Fri · 09:00–17:00" entries, differing only in a small greyed-out effective-date sub-line (or none at all, meaning "always").
- Doctor impact: At a glance the list reads as duplicated/broken data. A doctor scanning the sidebar cannot tell why there are 3 identical "Fri 09:00–17:00 · 30-min base grid" rows without reading the tiny muted date range under each — which is easy to miss, especially since two of the ten windows have no date range at all (identical siblings).
- Root cause: List rows lead with day+time+duration; effective-date range (the only differentiator between duplicates) is demoted to a barely-legible tertiary line (`text-portal-micro`, muted color).
- Resolution: When two or more windows share the same weekday, sort them by effective-date and visually group/label them (e.g. a subheading per weekday, or promote the date range to the same visual weight as the time range when it's the only distinguishing field).

**05-004 — High — Delete-confirmation dialog doesn't identify which window is being removed**
- Evidence: browser, `05-availability-desktop-delete-dialog-04.png`; dialog text captured via `page.evaluate`: *"Remove weekly window? Remove this weekly window? Future open slots derived from it will be cleared."*
- Doctor impact: With up to 3 visually-identical rows ("Fri · 09:00–17:00 · 30-min base grid"), a generic confirmation that never restates the specific window's day/time/date-range gives the doctor no last chance to catch a mis-click before an irreversible delete that also cascades to clear derived open slots.
- Root cause: `PortalDialog` body in `availability-ui.tsx:412-415` renders static `s.removeWindowBody` copy, not the selected window's own data (`deleteTarget` only stores the id, the row's label is never passed through).
- Resolution: Interpolate the specific window into the dialog body, e.g. "Remove **Fri 09:00–17:00** (30-min grid, from 1 Jun 2026)? Future open slots derived from it will be cleared." Requires looking up the full `AvailabilityWindow` object by `deleteTarget` id (already in local `windows` state) instead of storing only the id.

**05-005 — Medium — Two independent, identically-styled error banners can appear for different failure sources**
- Evidence: code, `availability-ui.tsx:169-173` (page-level error banner) and `availability-week-view.tsx:120-124` (week-view's own error banner) — both `rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800`, no distinguishing icon or label.
- Doctor impact: If, say, week navigation fails while an add-window error is also present, two identical red boxes stack with no way to tell which action failed.
- Root cause: `error` state is duplicated per-component instead of lifted/unified.
- Resolution: Either lift error state to a single owner (the parent `DoctorAvailabilityUI`) or prefix each banner with which action it relates to ("Couldn't load this week", "Couldn't add window").

**05-006 — Medium — Form validation errors surface far from the field that caused them**
- Evidence: code, `onAddWindow` (`availability-ui.tsx:90-106`) calls `setError(...)` which renders in the shared banner at the very top of the page (`availability-ui.tsx:169-173`), while the offending fields are in the sidebar "Add window" card, often below the fold.
- Doctor impact: On the "short" viewport (1366×650) and on mobile, the sidebar form sits well below the top banner; a doctor who mistypes end-before-start won't see why the form silently didn't submit unless they scroll back up.
- Resolution: Show the validation message inline directly under the relevant field pair (From/To, or Starts/Ends) in addition to or instead of the shared top banner.

**05-007 — Low — Delete icon-button touch target is 22×22px**
- Evidence: browser, measured via `getBoundingClientRect()`: `{ w: 22, h: 22 }` for `button[aria-label="Delete window"]`; code, `availability-ui.tsx:276-284` (`p-1` + `size-3.5` icon, no explicit min-height/width).
- Doctor impact: Below the WCAG 2.5.5 44×44px minimum recommendation for touch targets, and this is a **destructive** action sitting immediately next to a status pill in a dense list — small hit area increases risk of accidental taps on mobile.
- Resolution: Increase to at least 32×32px hit area (`min-h-8 min-w-8` or equivalent) or move the delete action into a per-row overflow/kebab menu (`AppMenu`) so the visible icon can be small while the clickable area is larger.

## 11. Visual Design Problems
- Legend uses colored circles only (`Legend` component, `availability-ui.tsx:421-442`) to distinguish Open/Blocked/Booked/Held — paired with text labels here so it's fine, but the week-grid cells themselves rely on color alone (see 05-020 accessibility).
- Three stacked cards in the sidebar (Weekly windows / Add window / Legend) all use the same `AdminCard`/`FormSection` chrome with identical padding and header treatment — visually monotonous but not wrong; no redundant card-in-card found in this stack (contrast with 05-006's problem, which is informational, not structural).
- "Weekly windows" list rows (`gh-doctor-window-row`) use a flat well background (`--portal-well`) with a border — consistent with the design system, no complaint.

## 12. Information Hierarchy Problems
- The page conflates two different mental models in one flat scroll: **rule authoring** (recurring weekly windows, sidebar) and **outcome inspection/adjustment** (week grid, left column) with no explicit link between a grid cell and the rule that generated it. A doctor cannot click an open slot in the grid and jump to "which weekly window produced this."
- Stat strip order (Weekly windows, Open slots, Booked, Blocked) is reasonable and matches the two page halves (windows→sidebar, slots→grid) — no change needed there.
- "Booked" consultations appear only inside the week grid, with no separate summary/list — acceptable since `/doctor/appointments` is the dedicated list for that, but the grid's own booked-slot styling is easy to miss among many open (green) cells at a glance from the current stat-strip alone (0 booked in this account, untested visually with real bookings).

## 13. Current Section Order
1. Compliance banner (global)
2. Page header
3. Stat strip (4 cards)
4. Week calendar (left) / Weekly windows list + Add window form + Legend (right sidebar) — side by side
5. Delete dialog (modal)

## 14. Recommended Section Order (+ reasons)
1. Page header
2. Stat strip — keep as-is; it answers "how much capacity do I have right now," the doctor's first question
3. **Weekly windows (rules) — move to primary/left position**, because rule-authoring is the doctor's actual task on *this* page (vs. `/doctor/calendar` which is where day-to-day slot inspection/blocking belongs — see §23 IA note below); the week grid becomes secondary/preview
4. Week calendar — becomes a "preview of what these rules generate this week," secondary column
5. Add window form — keep adjacent to the windows list (cause and effect stay visually close)
6. Legend — keep, but consider collapsing into a tooltip/popover since it's low-frequency reference info taking a full card's vertical space permanently

Reasoning: currently the grid (an *output*/read-mostly view) gets the dominant 1fr column while the actual editable data (windows) is squeezed into 360px. Swapping emphasis matches the doctor's primary task (author/audit recurring rules) rather than the least-frequent one (spot-block a single slot, which `/doctor/calendar` already does with a friendlier day-agenda UI).

## 15. Tabs/Steps/Sectioning Recommendation
No tabs needed on this page itself — it's short enough (2 logical zones: rules + preview) to stay a single scroll once section order is fixed (§14). The larger recommendation is at the **page level, cross-page**: see §22/§23 IA note — consider whether "Availability" (recurring rules) and "Calendar" (day/month view + time-off + ad-hoc bounded windows) should be merged into one page with List/Calendar-style tabs (the pattern already used elsewhere in this portal per recent commits — e.g. "My bookings" List/Calendar tabs), since both pages currently create the same `AvailabilityWindow` entity through two different forms.

## 16. Save & Finalization Recommendation
- "Add window" is a single, unambiguous primary action (`Btn variant="primary"`) — no multiple-save-button problem on this page.
- Delete is appropriately gated behind a confirmation dialog — the fix needed is content (05-004), not pattern.
- No unsaved-change guard exists for the add-window form (e.g., navigating away with fields filled loses them silently) — low risk since the form has no auto-save and fields are quick to re-enter, not flagging as an issue needing a beforeunload guard.
- Slot toggle (open/block) in the grid is a direct, immediate mutation with no confirmation — appropriate given it's non-destructive/reversible (toggle again to undo) and consistent with `/doctor/calendar`'s identical pattern.

## 17. Proposed Page Structure (exact top-to-bottom)
1. PageHeader
2. AdminSummaryStrip (unchanged, 4 stats)
3. Two-column grid, **reflowed**: left = Weekly windows list + Add window form (primary, ~440px), right = Week calendar preview (secondary)
4. Legend — converted to a small inline popover/tooltip triggered from the week-calendar header, not a permanent third sidebar card
5. Delete dialog — content updated to name the specific window (05-004)

## 18. Proposed Container Simplification
- **Keep:** AdminCard for "Weekly windows" and the week-calendar card (`gh-calendar-panel`) — both are legitimate distinct surfaces, not excessive nesting.
- **Flatten:** none required structurally — max depth measured at 4 is within a healthy range; no card-in-card removal needed.
- **Remove:** Legend as a permanent full-height card (§17) — convert to popover to reclaim vertical space, especially valuable on the "short" 1366×650 viewport where the sidebar currently runs Weekly-windows → Add-window → Legend and pushes the form itself down.
- **Fix (not remove):** the `min-w-0` grid-shrink bug (05-001) — this is a CSS correction, not a container-hierarchy simplification.

## 19. Responsive Findings (per viewport)
| Viewport | Finding |
|---|---|
| Desktop 1440 | Fine. Sidebar list scrolls internally as more windows accumulate (verified 10 rows render without page-level overflow). |
| Laptop 1280 | Fine, same layout as desktop, grid columns hold. |
| Tabletl 1024 | Two-column layout still holds (`lg:` breakpoint), week grid has adequate width. |
| Tabletp 768 | Layout stacks to single column (below `lg:`); week grid still requires its internal `overflow-x-auto` — same underlying `min-w-0` bug likely still present since 768px < 720px+padding is close to the edge; not fully clipped at this width in the captured screenshot but the fix in 05-001 is needed as width decreases further. |
| Mobile 390 | **Critical (05-001):** week grid clipped to Mon–Wed only, Thu–Sun unreachable. Everything else (stat strip, windows list, add-window form) reflows acceptably to single column. |
| Smobile 375 | Same as mobile, slightly worse (5px less width). |
| Short 1366×650 | Vertical space is the constraint here rather than horizontal: with the two-column layout intact, the sidebar (windows list + form + legend) requires scrolling within the viewport height sooner than desktop full-height; removing the Legend card as a permanent element (§17/§18) directly helps this case. |

## 20. Accessibility Findings
- **05-008 (Medium):** Week-grid slot status (Open/Booked/Blocked) is conveyed primarily by fill color (green/blue/grey per `Legend` component tones) inside the grid cells themselves; the sidebar legend provides a text key but the grid cells don't carry a text/icon label per cell, so color-blind users must cross-reference the separate legend card rather than reading the cell directly. Code: `availability-week-view.tsx` passes `status` through to `WeekCalendar`, which is a shared component — recommend adding a small icon or pattern per status inside `WeekCalendar`'s slot rendering (shared fix, benefits `/doctor/calendar` and admin editor too).
- **05-009 (Low):** Delete icon-button touch target 22×22px — see 05-007 (cross-listed as both UX and a11y touch-target issue).
- **05-010 (Low):** Heading order confirmed correct via dump: page title "Availability" (h1-equivalent PageHeader) → "Week calendar" / "Weekly windows" / "Add window" / "Legend" section headers — no skipped levels observed.
- **05-011 (Medium):** `PortalDialog` delete-confirmation was confirmed to close on Escape (focus-trap/dismiss works), but the dialog's default focus target was not verified to land on a non-destructive control first (would need explicit focus-trap audit inside `PortalDialog` itself, out of scope for this page's own code but worth a shared-component check — cross-reference if `PortalDialog` is audited elsewhere).
- **05-012 (Low):** Native `<input type="time">` and `<input type="date">` segmented controls behave per-browser (confirmed via Tab traversal — focus remains on the single input element across internal segment navigation); no custom keyboard trap introduced by this page's code.
- Tab order (confirmed via live traversal): all 10 "Delete window" icon buttons come before the Add-window form fields when tabbing from the top of the interactive region, because the windows list precedes the form in DOM order. Once §14's reordering (rules-primary, form-adjacent-to-list) ships, re-verify tab order still reaches "Add window" reasonably early relative to the 10 delete buttons — consider whether burying the primary "add" action behind 10 destructive icon-button tab stops is itself worth revisiting (e.g., visually-hidden "skip to add window" or moving Add-window above the list) — flagged as an **open question**, not a hard issue, since the list length (10) is unusually high for this test account and may be uncommon in practice.

## 21. Content & Microcopy Findings
| Current | Issue | Recommended |
|---|---|---|
| "Remove this weekly window? Future open slots derived from it will be cleared." | Doesn't name the window (05-004) | "Remove **{day} {start}–{end}**? Future open slots derived from it will be cleared." |
| "30-min base grid" | "base grid" is internal jargon; acceptable once explained (the add-window form does explain "Base slot length (grid)" with a hint), but the list rows repeat the jargon term without the explanation each time | Consider "30-min slots" in the list rows (explanation stays only in the form where it's first introduced) |
| "ACTIVE" / paused pill | Binary but no way to pause a window from this UI (`w.isActive` is read-only here — only create/delete exist) | Either add a pause/resume action or drop the pill if it's always ACTIVE in practice (verify with backend whether `isActive=false` is ever set outside this UI) — **open question**, code-derived only |
| Dates shown as "from 15/6/2026 · until 18/6/2026" | `toLocaleDateString("en-IE")` — DD/MM/YYYY, consistent within the page and matches the "Starts/Ends" input's `dd/mm/yyyy` placeholder | No change needed, just confirming consistency (good) |
| "Add window" (button + card title, identical string) | Card title and submit-button text are identical, which is fine/clear here, unlike the vague "Save"/"Submit" anti-pattern flagged portal-wide — no issue |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| Week-grid shrink fix | `frontend/app/(doctor)/doctor/availability/_components/availability-week-view.tsx:112` | Add `min-w-0` to the `.grid.gap-3` wrapper; verify ancestor chain | No (page-local wrapper) but the underlying `WeekCalendar` bug pattern is shared | Low (pure CSS) | Small |
| `WeekCalendar` | `frontend/components/calendar/WeekCalendar.tsx` | Verify `min-w-0` is safe on every consumer's ancestor chain (`/doctor/calendar`, admin `availability-week.tsx`) | **Yes — shared** | Medium (touches 3+ pages) | Small–Medium |
| Overlap warning | `availability-ui.tsx` `onAddWindow` | Add non-blocking overlap check against `windows` state before submit | No | Low | Small |
| Delete dialog content | `availability-ui.tsx:397-416`, `onDeleteWindow`/`deleteTarget` | Store full window object (or look up by id) instead of bare id string; interpolate into dialog body | No | Low | Small |
| Delete button touch target | `availability-ui.tsx:276-284` | Increase hit area or move to `AppMenu` kebab | No | Low | Small |
| Section reorder | `availability-ui.tsx` JSX order (lines ~209-395) | Swap grid column order / content order per §14 | No | Low (layout only) | Small |
| Legend → popover | `availability-ui.tsx:382-393` | Replace permanent card with popover trigger, likely using `AppMenu` per project convention for popovers | No, but should use the mandated shared primitive | Low | Small |
| Error-banner unification | `availability-ui.tsx:169-173` + `availability-week-view.tsx:120-124` | Lift error state or differentiate messaging | No | Low | Small |

## 23. Backend or Business-Logic Impact
- **Frontend-only:** 05-001 (CSS), 05-002 (client-side warning, no API change needed — could optionally also add server-side overlap detection but not required for the fix), 05-003, 05-004, 05-005, 05-006, 05-007 (all presentation/validation-copy, no schema or endpoint changes).
- **Needs product/clinical sign-off before any change:** The IA question in §15/§24 — merging "Availability" (recurring weekly windows) and "Calendar" (bounded date-range windows + time-off) into one page, or at minimum clarifying their division of labor in-product — is a structural decision, not a bug fix, and should go through the same review as other tab-system/page-merge recommendations (per brief, flag for review rather than implement).
- **Confirmed via code, not requiring a new investigation:** both pages already call the identical `createAvailabilityWindow` API (`doctor-availability-client.ts`) — `/doctor/availability`'s form creates a single-weekday window with an optional effective range, while `/doctor/calendar`'s "Add availability" form loops `createAvailabilityWindow` once per weekday across a date range to backfill the same table. No backend change is implied by documenting this; it's a UI/IA duplication, not a data-model gap.

## 24. Recommended Implementation Order
1. **05-001** (Critical, mobile week-grid clipping) — fix first, affects real usability today, low risk/CSS-only, but touches shared `WeekCalendar` ancestor chains so verify on `/doctor/calendar` and admin editor in the same pass.
2. **05-004** (delete dialog doesn't name the window) — high-risk-of-wrong-deletion issue, small fix.
3. **05-002** (overlap warning) — prevents the exact duplicate-window mess already visible in the live account (05-003).
4. **05-007** (touch target) — quick win, bundle with 05-004 since both touch the delete button.
5. **05-005 / 05-006** (error banner unification/placement) — medium priority polish.
6. **05-003** (duplicate-window list legibility) — cosmetic/legibility, can ride along with the delete-dialog fix since both touch the same list-row markup.
7. Section reorder (§14) + Legend→popover (§17/18) — batch as one layout PR since they touch the same JSX region.
8. **IA review** (§15/§23: Availability vs Calendar page merge/division-of-labor) — separate discussion track, not blocking the above fixes.

## 25. Acceptance Criteria (measurable)
- On a 375–414px-wide viewport, all 7 day columns (Mon–Sun) of the week grid are reachable, either by fitting on-screen or via a working horizontal scroll gesture/scrollbar inside the grid's own container (not the page).
- Delete-confirmation dialog body includes the specific weekday, time range, and (if present) effective-date range of the window being removed.
- Entering a new window whose time range overlaps an existing active window on the same weekday (within an overlapping effective-date range) shows a non-blocking inline warning before submit.
- "Delete window" button hit area ≥ 32×32px (ideally 44×44).
- Zero duplicate-styled error banners visible simultaneously for two different failure sources.

## 26. Open Questions
- Should "Availability" (recurring weekly rules) and "Calendar" (month/day view, ad-hoc time-off, bounded-range availability) be merged into a single page with List/Calendar-style tabs, given both already write to the same `AvailabilityWindow` table via the same `createAvailabilityWindow` call? Flagging for Fable/product review rather than deciding unilaterally — this is a bigger IA call than a single-page audit should resolve alone.
- Is `AvailabilityWindow.isActive` ever actually set to `false` by any flow? The doctor-availability page only shows "ACTIVE"/paused pills and can create/delete but has no visible pause action — worth confirming whether this is dead UI or whether pause exists elsewhere (e.g., admin-side).
- Does the backend enforce (or plan to enforce) overlap prevention server-side, or is overlap intentionally allowed (e.g., to support "extra evening clinic" style additive windows)? This determines whether 05-002's fix should be a soft warning (recommended) or a hard block.
- Confirm whether the `min-w-0` grid-shrink bug (05-001) is already present on `/doctor/calendar` and the admin per-doctor availability editor, since all three consume the same `WeekCalendar` component with a similar wrapper pattern — this page audit did not test those two pages directly.
