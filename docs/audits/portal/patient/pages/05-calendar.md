# 05 — Calendar

## 1. Page Identification

- **Name**: Patient Calendar
- **Route**: `/account/calendar`
- **Entry points**: sidebar "Calendar" (Care group), breadcrumb
- **Role**: PATIENT only
- **Frontend files**:
  - `frontend/app/(auth)/account/calendar/page.tsx` (server component — fetches appointments, builds `CalendarItem[]`)
  - `frontend/app/(auth)/account/calendar/ui.tsx` (`PatientCalendarUI`, client — month state, day-sheet state, event dialog state)
- **Shared components**: `MonthCalendar` (`frontend/components/calendar/MonthCalendar.tsx`), `DayAgenda` (`frontend/components/calendar/DayAgenda.tsx`), `EventDetailDialog` (`frontend/components/calendar/EventDetailDialog.tsx`, not opened this pass — no clickable consultation row reached without opening the day sheet first, see §6), `AppSheet` (`frontend/components/AppSheet.tsx`), `AdminSummaryStrip`, `PageHeader` (`portal-atoms`)
- **APIs observed** (code-derived): `fetchAccountAppointments` (single server fetch; page is server-rendered, no client-side data fetching — month navigation is pure client-side date math over the same dataset, not re-fetched per month)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)

## 2. Page Purpose

Month-grid view of the patient's consultations, secondary to the list view at `/account/bookings`. Lets the patient see density of bookings across a month and drill into a specific day to see times and join links.

## 3. Primary User Tasks (priority order)

1. See which days this month have consultations (visual density scan)
2. Click a day → see times + status + join-call access for that day
3. Navigate to a different month to check past/future bookings
4. Jump back to "Today"

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "MY SCHEDULE", title "📅 Calendar", subtitle
2. `AdminSummaryStrip` — 4 cards: SCHEDULED / UPCOMING / MEET LINKS / MARKETS
3. `MonthCalendar` — month label + Today/Prev/Next controls, weekday row, 7×N day grid with per-day consult/status pill badges
4. `AppSheet` (day agenda drawer, closed by default) — opens on day click
5. `EventDetailDialog` (modal, closed by default) — opens on consultation-row click inside the day sheet

## 5. Current Container Hierarchy (indented tree)

```
.gh-patient-page.gh-patient-calendar-page
├─ PageHeader                                          — necessary, page identity
├─ AdminSummaryStrip (grid, 4 cols)
│   ├─ "card" × 4 (Scheduled/Upcoming/Meet links/Markets) — 3 of 4 are real counts; MARKETS ("1 · Countries represented") is trivia, not a task signal (see 05-002)
├─ .gh-patient-calendar (grid gap-4)
│   └─ MonthCalendar (gh-calendar-panel.gh-card, single card)  — appropriately one container, not nested further
│       ├─ header row (month label + Today/Prev/Next)
│       ├─ weekday row
│       └─ day grid (7-col, button-per-day)
├─ AppSheet (portalled, day agenda)                      — correct use of shared drawer primitive
│   └─ DayAgenda
│       └─ consultation rows (button list) — real list, not cards-in-cards
└─ EventDetailDialog (portalled modal)
```

No unnecessary nesting levels found in the calendar grid itself — `MonthCalendar` is a single well-scoped card, and `DayAgenda`'s consultation rows are plain bordered rows, not card-in-card. The one structural question is whether the 4-card `AdminSummaryStrip` above the calendar earns its place (see §8).

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Day cell with "3 consults" badge (9 Jul) | Button | Click (desktop) | Opens `AppSheet` day agenda with 3 rows, correct times/doctor/status | — | 05-calendar-desktop-day-agenda-open-01.png |
| Day cell, no events (15 Jul) | Button | Click (desktop) | Opens `AppSheet` with proper empty state ("No consultations on this day.") | — | 05-calendar-desktop-empty-day-sheet-01.png |
| "Next month" (`ChevronRight` icon button) | Button | Click | Advances July → August 2026, grid re-renders correctly | — | 05-calendar-desktop-next-month-01.png |
| "Previous month" ×2 | Button | Click | July → June 2026, correctly shows June's 2 consult-days | — | 05-calendar-desktop-prev-month-01.png |
| "Today" pill | Button | Not clicked this pass (idempotent — code-derived: resets `ym` + `selectedDay` to current date) | code-derived only | — | — |
| Consultation row inside day sheet | Button | Not reached — day-sheet close intercepted focus before a targeted click landed on the row (script limitation); code-derived: `onSelectConsultation` closes sheet and opens `EventDetailDialog` | code-derived: `ui.tsx:53-56` | Untested this pass — recommend a follow-up interaction pass | — |
| Day cell with badge, mobile (390px) | Button | Tap | Opens `AppSheet`; rows overflow the drawer width, "Request Received" pill clipped | Mobile row-overflow bug | 05-calendar-mobile-day-agenda-open-01.png (see 05-001) |
| Weekend day cells (Sat/Sun, no events) | Button | Visual only | Rendered with a slightly different background (`--portal-well` vs `--portal-surface`) for out-of-month days; in-month weekend days look identical to weekdays | No dedicated weekend affordance — minor, not flagged as an issue (matches most calendar UIs) | 05-calendar-desktop-default-01.png |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 05-calendar-desktop-default-01.png | 1440×900 | default | Full page top: header, summary strip, month grid start | 05-002 |
| 05-calendar-mobile-default-01.png | 390×844 | default, top | Stacked summary cards + calendar start | 05-002 |
| 05-calendar-mobile-default-02.png | 390×844 | default, scrolled | Calendar grid with "3 cons…" truncated badge on day 9 | 05-003 |
| 05-calendar-desktop-day-agenda-open-01.png | 1440×900 | day sheet open, populated day | Confirms correct time/doctor/status rendering | — |
| 05-calendar-desktop-empty-day-sheet-01.png | 1440×900 | day sheet open, empty day | Confirms empty-state copy and icon | — |
| 05-calendar-desktop-next-month-01.png | 1440×900 | August 2026 (next-month nav) | Confirms month navigation works | — |
| 05-calendar-desktop-prev-month-01.png | 1440×900 | June 2026 (prev-month nav ×2) | Confirms backward navigation + historical consult badges | — |
| 05-calendar-mobile-day-agenda-open-01.png | 390×844 | day sheet open, mobile | Row overflow / clipped badge text | 05-001 |
| 05-calendar-short-default-full-01.png | 1366×650 | default, top | Short-viewport clipping check | 05-004 |

## 8. UX Problems

### 05-001 — Day-agenda consultation rows overflow the mobile drawer, clipping status text (High, Responsive/Layout)
**Browser evidence**: `05-calendar-mobile-day-agenda-open-01.png` — every consultation row's "Request Received" badge is cut off mid-word ("Request Rec…") at the drawer's right edge, and the row itself visibly extends past the sheet panel boundary (a second drop-shadow edge is visible ~15px right of the sheet's own edge).
**User impact**: on a 390px phone (the most common patient device per typical portal traffic), the booking status is not fully readable inside the day agenda — the exact information ("is my request still pending or confirmed?") the drawer exists to surface is clipped.
**Root cause**: `frontend/components/calendar/DayAgenda.tsx:152-187` — the row button is `flex items-center gap-3` with three children: a fixed `w-14` time chip, a `min-w-0 flex-1 truncate` title block, and a status badge (`<span className="gh-badge ... shrink-0">`) that has `shrink-0` but no `truncate`/max-width/wrap allowance. On narrow viewports the badge's full text ("Request Received") plus the trailing `Video` icon don't fit in the remaining flex space after the time chip and title claim their share, so the row's total content width exceeds the sheet's inner width and overflows rather than wrapping.
**Recommended resolution**: give the status badge either (a) a `max-w-[92px] truncate` treatment matching the title column, (b) an abbreviated status vocabulary for narrow viewports ("Request Received" → "Pending"), or (c) move the badge to a second line under the title on small screens (`sm:` breakpoint changes row from single-line to 2-line layout). Also add `overflow-hidden` to the row button itself as a safety net so future badge-text growth can't visually escape the drawer again.

### 05-002 — "MARKETS" summary card is a trivia stat with no task value (Low, Information Hierarchy / Card overuse)
**Browser evidence**: `05-calendar-desktop-default-01.png` — "MARKETS: 1, Countries represented."
**User impact**: for the overwhelming majority of patients (single-country bookers), this card always reads "1" and answers a question nobody asked on a calendar page. It's the 4th card in a row that otherwise contains genuinely useful counts (Scheduled, Upcoming, Meet links ready).
**Root cause**: `frontend/app/(auth)/account/calendar/page.tsx:60-67` — `countries` is computed and always rendered regardless of whether it's ever >1 or provides scheduling-relevant signal.
**Recommended resolution**: drop the MARKETS card; reduce the summary strip to 3 cards (Scheduled / Upcoming / Meet links ready), which are the ones that actually help the patient decide what to look at.

### 05-003 — "N consults" day badge truncates illegibly at narrow widths (Medium, Responsive/Content — browser evidence)
**Browser evidence**: `05-calendar-mobile-default-02.png` — day 9's badge reads "3 cons" (word "consults" cut off) inside the day cell.
**User impact**: on mobile the badge is unreadable as a word fragment; a user has to guess what "3 cons" means (though the green pill color + number partially compensates).
**Root cause**: `frontend/components/calendar/MonthCalendar.tsx:139-147` — the badge is `inline-flex max-w-full items-center truncate rounded-full px-1.5 py-0.5 text-portal-micro`; `truncate` clips at the cell's available width, and the cell itself shrinks to `min-h-[68px]` with `p-1` on mobile (`MonthCalendar.tsx:116`), leaving very little horizontal room for a 7-column grid on a 390px screen (~48px per column minus padding/borders).
**Recommended resolution**: replace the text badge with a compact dot-count treatment at narrow widths (e.g. a single colored dot + numeral "3" without the word "consults", already partially done for the `booked`/`open`/`blocked` sub-counts elsewhere in the same component at lines 148-174) — the word "consults" only needs to appear once, e.g. in a legend, not per cell.

### 05-004 — Short viewport (1366×650) truncates the month grid to ~1.5 rows before scroll (Medium, Responsive)
**Browser evidence**: `05-calendar-short-default-full-01.png` — at 650px tall, header + summary strip + calendar header/weekday row consume ~430px, leaving only ~220px for the day grid — roughly 1 row of days (68-92px min-height rows) is visible before the viewport ends; the rest of the month (and the "Today" state) requires scrolling with no visual cue that more days exist below the fold.
**User impact**: on laptops with reduced browser chrome or split-screen use (a "short" viewport is a realistic laptop scenario, not just an edge case), the primary content of the page — the calendar grid — is mostly hidden on load.
**Root cause**: `AdminSummaryStrip` + `PageHeader` are non-collapsing, full-height elements stacked above the calendar with no responsive height reduction for short viewports; `MonthCalendar`'s own header/weekday chrome (`MonthCalendar.tsx:54-101`) adds further fixed height before any day cell renders.
**Recommended resolution**: consider a `@media (max-height: 700px)` rule that compresses `PageHeader` vertical padding and/or collapses the summary strip to a single inline row of numbers (e.g. "14 scheduled · 0 upcoming · 10 meet-ready") instead of 4 full-height cards, reclaiming ~150-200px for the actual calendar grid on short viewports.

## 9. Visual Design Problems

- Same repeated green-chip-icon-in-a-pill treatment as the dashboard (see 01-002) — all 4 `AdminSummaryStrip` cards on this page also share one identical bar-chart glyph regardless of whether the metric is a count, a readiness state, or a trivia fact. This is a portal-wide pattern, not calendar-specific, but reinforces the same problem here.
- The day-cell status pills (consult/booked/open/blocked, `MonthCalendar.tsx:138-175`) use 4 different visual treatments (filled pill, dot+number in 3 colors) inside one small cell — on a day with multiple statuses this could get visually noisy, though not observed in this dataset (no day had more than one status type simultaneously in the tested months).

## 10. Information Hierarchy Problems

The summary strip's 4 cards give equal visual weight to "Scheduled: 14" (a real orientation number) and "Markets: 1" (trivia). Per the "needs attention" model, none of these 4 cards is actually actionable — they're all read-only counts — so the entire strip functions as decoration rather than a task aid; the calendar grid itself is the only task-relevant surface on this page, and it's the 3rd/4th thing on the page rather than the 1st, given the header + full 4-card row above it.

## 11. Section Ordering Review

**Current order:**
1. PageHeader
2. AdminSummaryStrip (4 cards)
3. MonthCalendar

**Recommended order:**
1. PageHeader (unchanged — page identity, cheap)
2. MonthCalendar (moved up) — *Reasoning: this is the entire reason the page exists; per §10 the summary strip is decorative, so it should not sit between the page title and the one interactive surface the patient came here for.*
3. Compact summary row (3 items, not 4, inline text not cards) beneath or beside the month header — *Reasoning: "14 scheduled, 0 upcoming, 10 meet-ready" is useful context but doesn't need 4 full-height cards; folding it into the `MonthCalendar` panel's own header row (next to the Today/Prev/Next controls) keeps it visible without pushing the grid below the fold, directly fixing 05-004.*

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — single-surface month view, no multi-step flow. No tabs warranted; the existing day-click → sheet → dialog drill-down pattern is the correct interaction model for this content type and should be kept as-is.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. `MonthCalendar` panel, with its header row extended to include a compact 3-item inline summary ("14 scheduled · 0 upcoming · 10 meet-ready") next to the Today/Prev/Next controls, replacing the standalone `AdminSummaryStrip`
3. Day grid (unchanged)
4. `AppSheet` day agenda (unchanged, with 05-001 row-overflow fix)
5. `EventDetailDialog` (unchanged)

## 14. Proposed Container Simplification

| Element | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` (4 cards) | Remove | Replace with inline text summary inside `MonthCalendar`'s existing header row (§11) |
| MARKETS card | Remove | No task value (05-002) |
| Day-cell "N consults" text badge | Row/dot | Replace word-badge with dot+numeral pattern already used for other statuses in the same component (05-003) |
| `DayAgenda` consultation row | Keep, fix overflow | Add `overflow-hidden` to row + responsive badge width (05-001) |
| `MonthCalendar` single card | Keep | Already correctly scoped, no change |

## 15. Responsive Findings

- **Desktop/laptop**: month grid renders cleanly, day badges legible, no clipping.
- **Tabletl/tabletp**: not deep-inspected beyond capture (screenshots taken, no interaction issues observed in the default-state slices).
- **Mobile (390)/smobile (375)**: two confirmed defects — badge text truncation on day cells (05-003) and day-agenda row overflow (05-001).
- **Short (1366×650)**: calendar grid mostly below the fold on load (05-004).

## 16. Accessibility Findings

- `MonthCalendar` day cells are real `<button>` elements (`MonthCalendar.tsx:112`) — keyboard-focusable and activatable by default, good baseline.
- Prev/Next month controls use `IconBtn` with `ariaLabel="Previous month"`/`"Next month"` (`MonthCalendar.tsx:70-83`) — correctly labeled for screen readers, confirmed via successful `getByLabel()` Playwright lookups in this pass.
- Day cells with consult badges have no `aria-label` summarizing the day's content (e.g. "9 July, 3 consultations") — a screen reader user tabbing through the grid hears only the bare day number: "9", then separately encounters the badge text as a nested `<span>`, which may or may not read together depending on the AT/browser combination; not verified with an actual screen reader this pass, flagged as a suspected gap.
- `AppSheet` day-agenda drawer: not verified this pass whether Escape closes it or focus is trapped/returned correctly — recommend a follow-up keyboard-only pass (Tab into the sheet, Escape, confirm focus returns to the triggering day button).
- Status badges ("Request Received", etc.) rely on color + text together (not color-only) — no color-contrast-only violation observed in the badge treatments themselves from the screenshots.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "N consults" day badge | "N" + dot, word moved to a legend or tooltip | Illegible truncation on mobile (05-003) |
| "MARKETS — Countries represented" | Remove | Trivia stat, not task-relevant (05-002) |
| "Add availability or open another day to review appointments." (empty-day-sheet body) | Flag for review, not rewrite | This copy reads like doctor-portal empty-state text ("Add availability") reused verbatim for the patient view — patients cannot add availability; this is medical/product-flow wording that should be patient-specific ("No consultations booked for this day.") |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| `DayAgenda` consultation row | `frontend/components/calendar/DayAgenda.tsx:152-187` | Add overflow guard + responsive badge sizing | Shared (also used by doctor/admin calendars per header comment "same composition as admin/doctor calendars") | Medium — must verify doctor/admin calendar rows aren't broken by the same fix | S–M |
| Empty-day-sheet copy | `frontend/components/calendar/DayAgenda.tsx:130-141` | Patient-specific empty-state text via a prop (already has `emptyLabel` prop for the header string; the body sentence at line 138 is hardcoded and shared) | Shared component, patient-only content fix | Low | S |
| Day-cell badge | `frontend/components/calendar/MonthCalendar.tsx:138-147` | Replace text badge with dot+numeral at narrow widths | Shared (same component serves admin/doctor calendars) | Medium — verify other portals' expectations before changing | S–M |
| `AdminSummaryStrip` usage | `frontend/app/(auth)/account/calendar/page.tsx:60-68` | Remove, fold 3 metrics into `MonthCalendar` header | Page-specific | Low–Medium (requires a `MonthCalendar` prop addition for the inline summary) | M |

## 19. Recommended Implementation Order

1. 05-001 (mobile row overflow) — High severity, affects the primary drill-down interaction on the most common device
2. 05-003 (badge truncation) — pairs naturally with 05-001 since both are `DayAgenda`/`MonthCalendar` mobile-width fixes
3. 05-004 (short-viewport grid compression) — depends on the summary-strip removal (05-002/§11) being decided first
4. 05-002 (drop MARKETS, fold strip into calendar header) — design/IA change, needs sign-off given shared-component impact on other portals

## 20. Acceptance Criteria

- On a 390px-wide viewport, every consultation row's status badge is fully readable with no clipped text and no row extending past the drawer's visible bounds.
- Day-cell consult badges show a legible label at 390px width with no mid-word truncation.
- At 1366×650, at least 2 full rows of the day grid are visible without scrolling.
- Summary metrics (Scheduled/Upcoming/Meet-ready) remain visible somewhere on the page after any strip-removal change — no net loss of information, only presentation.

## 21. Open Questions

- Confirm whether `MonthCalendar`/`DayAgenda` are shared verbatim with the doctor and/or admin portal calendars (the code comment in `ui.tsx:76` says "same composition as admin/doctor calendars") — any fix to `DayAgenda.tsx` or `MonthCalendar.tsx` needs a cross-portal regression check before shipping, which is outside this page's audit scope.
- Could not verify the `EventDetailDialog` (consultation detail modal) interaction in the browser this pass — a targeted click on a day-sheet row didn't land in the automated script; recommend a dedicated interaction pass or manual check before treating that surface as audited.
- Could not verify keyboard/Escape behavior of the `AppSheet` day-agenda drawer this pass (see §16) — recommend a keyboard-only follow-up.

---

## 22. Reviewer Verification Addendum (Fable, 2026-07-12)

Follow-up browser pass covering the two gaps flagged in §16/§21 (day-agenda keyboard behavior, `EventDetailDialog`). Evidence archived under `screenshots/05-calendar/`.

**Verified (closes §21 open items):**
- `AppSheet` day agenda **Escape closes correctly** and returns to the calendar (`05-calendar-desktop-event-detail-escaped-01.png`).
- `EventDetailDialog` opens from a day-agenda row and renders (`05-calendar-desktop-event-detail-01.png`).
- Day-cell buttons confirmed to expose **no accessible name** in the accessibility tree (35 bare `button` nodes) — upgrades the "suspected gap" in §16 to confirmed. Screen-reader users get only the day number at best.

**New issues found in this pass:**

### 05-005 — Doctor name rendered 3× in the event detail dialog, patient row empty (Medium, Content/Consistency — browser evidence)
`05-calendar-desktop-event-detail-01.png`: dialog title "Dr Tiago Miguel Figueira", subtitle line "· Dr Tiago Miguel Figueira", and APPOINTMENT › Doctor row all repeat the same name; the Patient row shows "—" — on the patient's own portal that field is self-referential (the dialog is a shared doctor/admin component surfaced to patients unadapted). Fix: patient-facing variant should title the dialog with service type + time, show doctor once, and drop the Patient row.

### 05-006 — "Join video call" CTA offered on a past, unconfirmed booking (High, Interaction/Status communication — browser evidence)
`05-calendar-desktop-event-detail-01.png`: booking status "Request Received" (not yet scheduled/confirmed), start 9 Jul 2026 14:30 — three days in the past at audit time — yet the primary action is an enabled "Join video call" button. Misleading medical-appointment state communication: patients may believe an unconfirmed past request is joinable. Fix: gate the CTA on confirmed status + a join window around the start time; otherwise show status explanation.

### 05-007 — Day-agenda empty state shows doctor-portal copy to patients (Medium, Content — browser evidence)
`05-calendar-desktop-day-agenda-empty-01.png`: empty day reads "No consultations on this day. **Add availability** or open another day to review appointments." Patients cannot add availability — copy belongs to the doctor calendar. Fix: patient variant, e.g. "No consultations on this day." + optional "Book a consultation" link.

### 05-008 — Raw IANA timezone string and empty "End —" row in detail dialog (Low, Content — browser evidence)
`05-calendar-desktop-event-detail-01.png`: TIMING shows "Timezone: Asia/Karachi" (raw identifier) and "End: —". Fix: human-readable timezone ("Pakistan Time, GMT+5") or fold into the start time; hide the End row when unknown.

**Screenshots added:** `05-calendar-desktop-day-agenda-9jul-01.png`, `05-calendar-desktop-event-detail-01.png`, `05-calendar-desktop-event-detail-escaped-01.png`, `05-calendar-desktop-day-agenda-empty-01.png`.
