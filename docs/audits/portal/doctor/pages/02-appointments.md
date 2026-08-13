# 02 — My Appointments (Consultation Queue)

## 1. Page Identification

- **Name**: My Appointments / Consultation Queue
- **Route**: `/doctor/appointments`
- **Entry points**: sidebar "Appointments" (Schedule group), dashboard "My appointments" links, dashboard schedule row "Open" buttons, notification deep-links
- **Role**: DOCTOR only (same layout gate as `01-dashboard.md`)
- **Workflow position**: the doctor's primary work list — every open, upcoming, and past consultation, filterable, with the "open consultation workspace" action per row
- **Frontend files**:
  - `frontend/app/(doctor)/doctor/appointments/page.tsx` (server component, page content, `dynamic = "force-dynamic"`)
  - `frontend/app/(doctor)/doctor/appointments/[id]/page.tsx` (detail/workspace, out of scope this pass — linked to but not audited)
  - `frontend/app/(doctor)/doctor/appointments/loading.tsx` (route-level loading fallback)
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState`, `Btn`, `Pill` (`frontend/components/portal-atoms.ts`); `AppointmentCard` (`frontend/components/AppointmentCard.tsx`, desktop row); `PortalMobileCard` (`frontend/components/PortalMobileCard.tsx`, mobile card)
- **APIs observed**: `fetchDoctorAppointments` (`frontend/lib/api/doctor-api.ts:175`) — server-side, query params `page/pageSize/view/search/from/to/consultationType/openOnly/finalized`; status-view mapping via `doctorAppointmentView`/`doctorAppointmentViewTone` (`frontend/lib/api/appointment-status-labels.ts:68-99`)
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **States tested**: default (15 total appointments, 12 open, none scheduled today), status filter applied (Cancelled → 2 results), search with no match (empty-filtered state), filter panel default state (always-open on desktop, see 15), keyboard focus order, mobile card list

## 2. Page Purpose

The doctor's full consultation queue: find a specific patient/appointment, see what needs action (unpaid, no meeting link, not finalized), and open the consultation workspace. This is explicitly the page type the reference-screenshot complaint targets: stat cards + big filter container + list-in-container + card-per-row + colored accents + status pills + right-side buttons.

## 3. Primary Doctor Tasks (priority order)

1. Find today's/next open consultation and join it
2. Scan for anything blocking (no meeting link, unpaid, not finalized) across the queue
3. Search for a specific patient by name/email
4. Filter by status/type/date range to narrow a large list
5. Open a specific appointment's workspace to document/finalize
6. Switch to calendar view for a date-oriented view of the same data

## 4. Clinical/Operational Importance

Very high — this is the doctor's primary worklist, used every session. At audit time: 15 total, 12 open, 9 with meeting links, 14 not finalized, none scheduled today. A doctor opening this page to find "what do I need to do" has to get past a full-height hero card, 4 stat tiles, and a 6-field filter form (always expanded on desktop, cannot be collapsed — see 15) before the first appointment row is visible. At the audited "short" viewport (1366×650, a realistic laptop-with-taskbar height) **zero appointment rows are visible without scrolling** — see 19-002.

## 5. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "CONSULTATION QUEUE", title "My appointments", description, icon tile, "Calendar view" action button
2. `AdminSummaryStrip` — 4 cards: VISIBLE RESULTS / OPEN CONSULTS / MEETING LINKS / NOT FINALIZED (label, big number, hint, icon badge, tone)
3. `<details open>` filter panel (`.gh-doctor-filter-card`) — Search, Status, Type, From, To, Finalized, "Legacy open window" checkbox, Apply/Reset buttons. The `open` attribute is hard-set and the `<summary>` toggle is disabled via `sm:pointer-events-none` above 640px — **the panel cannot be collapsed on desktop/tablet at all**, only on mobile.
4. Results: `.gh-card.gh-card-jewel.gh-doctor-table-card` wrapping a `grid` of `AppointmentCard` rows (desktop `md:` and up) / `PortalMobileCard`s (below `md:`)
5. Pagination footer text (not present at audit time — 15 results fit one page of `pageSize=25`)

## 6. Current Container Hierarchy (indented tree, from `page.evaluate` surface probe — every element with a border, shadow, radius, or fill)

```
<main>
├─ HEADER .gh-portal-page-header            radius 24px · shadow · border 1px   — page-level, keep (1 surface)
│   ├─ SPAN icon-badge                       radius 12px · shadow               — decorative nesting inside header
│   └─ A .gh-btn.gh-btn-soft (Calendar view) radius 12px · border 2px
├─ SECTION .gh-admin-summary-strip
│   ├─ DIV .gh-admin-summary-item × 4        radius 20px · shadow · (tone bg)   — surface level 2
│   │   └─ SPAN icon-badge                    radius 12px · shadow              — surface level 3, per card
├─ DETAILS .gh-doctor-filter-card            radius 20px · shadow · border · bg — surface level 2
│   └─ INPUT/SELECT × 6, BUTTON, A            radius 12px · shadow each          — surface level 3, every field
├─ DIV .gh-card.gh-card-jewel.gh-doctor-table-card   radius 20px · shadow · bg white — surface level 2
│   └─ A/DIV .gh-appointment-card × 15         radius 20px · shadow (!)          — surface level 3, PER ROW
│       ├─ DIV .gh-appointment-card__time       radius 10px · shadow            — surface level 4
│       ├─ SPAN .gh-pill                        radius 999px · shadow · bg      — surface level 4
│       │   └─ SPAN (status dot)                 radius 999px · shadow          — surface level 5
│       └─ A .gh-btn (Join/Open) × 2             radius 12px · shadow each      — surface level 4
```

**Unnecessary levels** (per the brief's "max visible surface levels" ask): this page reaches **5 nested shadow+radius surfaces** on a single row (table-card → appointment-card → pill → status-dot, plus the time block and buttons as siblings at level 4). The `box-shadow` computed on *every* element down to a 4px status dot is almost certainly an inherited/utility default rather than an intentional per-element shadow — visually it reads as one clean row per screenshot, but it's evidence the row recipe (`AppointmentCard`) and its children (`gh-appointment-card__time`, `gh-pill`, the pill's inner dot) are not opting out of a global shadow utility, which is the mechanism that turns "list of appointments" into "stack of cards" once density increases (12+ rows) or theming shifts (dark mode, high-contrast mode). Recommended max: 3 visible surface levels for this page — page header (1) → filter panel + results container (2) → row (3). Everything inside a row (time, pill, action buttons) should be typography/color, not its own bordered/shadowed surface.

## 7. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Calendar view" | Link | Not clicked (navigates to `/doctor/calendar`, out of scope) | code-derived: correct href | — | 02-appointments-desktop-default-01.png |
| Filters `<summary>` toggle | Disclosure | Click at desktop (1440px) | No visible change — panel stays open | Toggle is dead weight on desktop: `sm:pointer-events-none sm:cursor-default` (`page.tsx:156`) disables the click target above 640px, but the "Filters" text still renders with `cursor-pointer` styling removed only via a modifier class the user has no way to perceive (15-001) | 02-appointments-desktop-filters-collapsed-01.png (shows panel still open) |
| Status select → "Cancelled" + Apply | Select + submit | Selected, submitted | URL updates to `?view=cancelled`, results correctly narrow to 2 rows, stat strip recomputes (VISIBLE RESULTS 2, NOT FINALIZED 2) | Works correctly | 02-appointments-desktop-filter-cancelled-01.png |
| Search "zzzznomatch" | Text input + submit (via URL) | Applied | Correctly renders `AdminEmptyState` — "No appointments match these filters" + "Clear filters" CTA | Works correctly | 02-appointments-desktop-empty-filtered-02.png |
| Reset | Link | Not clicked (navigates to bare `/doctor/appointments`) | code-derived: correct, clears all query params | — | — |
| Row without meeting link (e.g. "Race Test", "QA Patient A") | Row (whole-row Link when `href` set) | Not clicked (would navigate) | code-derived (`page.tsx:287`, `AppointmentCard.tsx:71-77`): row itself is a link to `/doctor/appointments/{id}` when `meetingUrl` is absent | The only visible affordance is a small gray "Meeting link not yet created" caption + chevron — no button, no visible hover/focus styling distinct from a static row (16-002) | 02-appointments-desktop-filters-collapsed-01.png |
| "Join" (row with meeting link) | Link (`target=_blank`) | Not clicked (external navigation) | code-derived: correct `meetingUrl` href | — | 02-appointments-desktop-filters-collapsed-01.png |
| "Open" (row with meeting link) | Link | Not clicked | code-derived: `/doctor/appointments/{id}` | — | 02-appointments-desktop-filters-collapsed-01.png |
| Keyboard Tab (11 presses from load) | Keyboard | Tab × 11 | Focus lands inside the filter form (visible lime ring on a form field) | Focus visible and correctly ordered through header → summary strip (not focusable, correct) → filter fields | 02-appointments-desktop-keyboard-focus-01.png |
| Pagination | N/A | Not testable | 15 results, `pageSize=25` → single page, no pagination footer rendered | Cannot verify pagination UI/behavior this pass — code-derived only (`page.tsx:395-402`, standard prev/next-free "Page X of Y" text, no buttons visible in the snippet — flag as its own review item, 22-001) | — |
| "Legacy open window (30h)" checkbox | Checkbox | Not toggled | code-derived: `openOnly=true` param | Label is internal/legacy jargon exposed directly to doctors (21-002) | 02-appointments-desktop-default-01.png |

## 8. Page States Tested

| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default, populated (15 items) | Yes | — | Full stat strip + filter panel + 15 rows, no pagination (single page) | 15-001, 16-001 |
| Filtered (status=cancelled, 2 results) | Yes | — | Correct narrowing, stat strip recomputes live | — |
| Empty (search, no match) | Yes | — | `AdminEmptyState` with distinct "filtered" copy vs. the true-empty copy (`page.tsx:257-269`) | Good — two different empty-state messages exist and are wired correctly |
| Empty (no filters, zero appointments ever) | Code only | Yes | `page.tsx:270-277` — separate copy path exists, not triggerable on this seeded account (15 real appointments) | Mark not-browser-verified |
| Error (`!result.ok`) | Code only | Yes | `page.tsx:247-255` — warning card + "Try again" link back to the same filtered URL | Good pattern, not triggerable without a backend failure this pass |
| Loading | Code only | Yes | `frontend/app/(doctor)/doctor/appointments/loading.tsx` exists (route-level Suspense fallback) — not visually inspected this pass | Mark not-browser-verified |
| Mobile card list (390px) | Yes | — | `PortalMobileCard`s render correctly with meta grid (Type/Scheduled/Payment/Meeting) and stacked action buttons | 19-001 (floating widget overlap, shell-wide) |
| Short viewport (1366×650) | Yes | — | Zero appointment rows visible without scrolling — see 19-002 | 19-002 |

## 9. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| 02-appointments-desktop-default-01.png | 1440×900 | default, top | Hero + 4 stat cards + filter panel, zero rows visible | 15-001, 16-001, 19-002 |
| 02-appointments-laptop-default-01.png | 1280×720 | default | Laptop breakpoint | 19-002 (same fold problem, less severe) |
| 02-appointments-tabletl-default-01.png | 1024×768 | default | Tablet-landscape breakpoint | — |
| 02-appointments-tabletp-default-01.png | 768×1024 | default | Tablet-portrait breakpoint | — |
| 02-appointments-mobile-default-01.png | 390×844 | default | Mobile stacking, breadcrumb truncation | 19-001, 19-003 |
| 02-appointments-smobile-default-01.png | 375×667 | default | Smallest supported width | 19-001, 19-003 |
| 02-appointments-short-default-01.png | 1366×650 | default | Short-viewport fold — confirms zero rows above the fold | 19-002 |
| 02-appointments-desktop-filter-cancelled-01.png | 1440×900 | status=cancelled applied | Confirms filter + stat-strip recompute works | — |
| 02-appointments-desktop-empty-filtered-01.png | 1440×900 | search=zzzznomatch (top of page) | Confirms filter panel state persists search text | — |
| 02-appointments-desktop-empty-filtered-02.png | 1440×900 | search=zzzznomatch (scrolled to empty state) | Confirms `AdminEmptyState` renders correct filtered-copy + "Clear filters" | — |
| 02-appointments-desktop-filters-collapsed-01.png | 1440×900 | attempted filter-collapse (no-op) + scrolled to show rows | Confirms toggle is inert on desktop; also captures row recipe (time/name/pill/actions) | 15-001, 16-002 |
| 02-appointments-desktop-keyboard-focus-01.png | 1440×900 | 11 Tab presses from load | Confirms keyboard focus order and visible ring | — |
| 02-appointments-mobile-cardlist-01.png | 390×844 | scrolled to stat cards | Same floating-widget overlap as dashboard | 19-001 |

## 10. UX Problems

### 02-001 — Filter panel cannot be collapsed on desktop/tablet; it, plus the hero and stat strip, push every appointment row below the fold (Critical, Space / Clinical Hierarchy)
**Browser evidence**: `02-appointments-desktop-default-01.png` — from page top to the first visible row requires scrolling past a 108px header, a ~110px hero card, ~130px of stat cards, and a ~330px filter form (6 fields across 2 rows + button row) — roughly 680px of chrome before row 1. At `02-appointments-short-default-01.png` (1366×650, a realistic laptop height with browser chrome/taskbar), **zero rows are visible** without scrolling.
**Doctor impact**: this is the exact "floating boxes" pattern named in the audit brief — stat cards + big filter container + list-in-container, all stacked, none collapsible, before the actual work list appears. A doctor's most-used page requires a scroll on every visit, every session, on a majority of real-world laptop viewport heights.
**Root cause**: `page.tsx:155` — `<details className="gh-card gh-doctor-filter-card mb-4 p-4" open>`; `page.tsx:156` — `<summary className="... sm:pointer-events-none sm:cursor-default">` explicitly disables the collapse interaction at `sm:` (640px) and above, so `open` is permanently true on any non-mobile viewport. There is no persisted collapse preference and no compact "filter bar" alternative.
**Recommended resolution**: make the filter panel a real, user-controlled disclosure on all viewports (remove the `sm:pointer-events-none` override), default to **collapsed** when no filters are active and the result set is small enough to browse directly (e.g. ≤ 25, matching current `pageSize`), and default to **expanded** only when filters are already active (so a doctor mid-filter doesn't lose context). Persist the last state in a cookie/localStorage per the pattern other portal list pages already use for view preference, if one exists.

### 02-002 — 4-card stat strip duplicates counts the doctor can already see in the list below, with no action wired to the two that would benefit from one (High, Card overuse / Information Hierarchy)
**Browser evidence**: `02-appointments-desktop-default-01.png` — VISIBLE RESULTS (15), OPEN CONSULTS (12), MEETING LINKS (9), NOT FINALIZED (14).
**Doctor impact**: VISIBLE RESULTS is redundant with "15 total" directly beneath it and with simply counting the rows once scrolled to; OPEN CONSULTS and NOT FINALIZED are both "needs attention" counts but neither is a link or filter shortcut — clicking them does nothing (unlike `StatCard`, which supports `href`, `AdminSummaryStrip` items render as plain `<div>`s, `atoms.tsx:180-217`, no link wiring at all).
**Root cause**: `page.tsx:120-153` builds all 4 items as static `AdminSummaryStrip` entries; the component itself (`atoms.tsx:180-217`) has no `href` prop on its item type.
**Recommended resolution**: keep OPEN CONSULTS and NOT FINALIZED (real, actionable-adjacent signals) but wire them as one-click filter shortcuts (`?openOnly=true`, `?finalized=false`) — the query params already exist and are already read by this same page (`page.tsx:69-70,95-96`). Drop VISIBLE RESULTS (duplicates the "N total" hint already shown per-card and duplicates the eye-count of the list itself) and MEETING LINKS (informational only, no action follows from it — a doctor doesn't act on "9 have links," they act on the individual rows that don't).

### 02-003 — Every visible surface has a shadow, down to the 4px status-pill dot (Medium, Visual Design / Container Nesting)
**Browser evidence**: `page.evaluate` surface probe (§6) — `gh-appointment-card__time`, `gh-pill`, and the pill's inner status dot (a bare `<span>` with no class) all compute a non-`none` `box-shadow`.
**Doctor impact**: at 12+ rows the shadow-per-element compounds into a slightly "busy"/embossed look under close inspection (not glaringly obvious in a single screenshot, but measurable and will worsen if density increases or a dark/high-contrast theme is added later, since shadows read very differently against non-white row backgrounds).
**Root cause**: likely a global utility class or CSS reset applying a default `box-shadow` broadly in `portal.css` rather than the row recipe intentionally opting in per-element. Not fully traced to a single selector this pass — flagged from computed-style evidence, needs a `portal.css` audit for what's setting `box-shadow` on bare `<span>` elements.
**Recommended resolution**: audit `portal.css` for the shadow source and scope it to actual card-level containers only (`.gh-card`, `.gh-appointment-card`) — remove it from `__time`, `.gh-pill`, and pill-internal elements, which should be flat/typographic.

### 02-004 — Rows with no meeting link have no visible interactive affordance (Medium, Clinical Hierarchy / Accessibility)
**Browser evidence**: `02-appointments-desktop-filters-collapsed-01.png` — the "Race Test" and "QA Patient A" rows show only "Meeting link not yet created" in muted gray text with a small chevron; no button, no distinct hover treatment visible in a static capture.
**Doctor impact**: these rows *are* clickable (the whole `AppointmentCard` becomes a `<Link>` when `href` is set — `AppointmentCard.tsx:71-77`, wired at `page.tsx:287`), but nothing in the row visually signals "click here" the way the "Join"/"Open" buttons do on rows that have a meeting link. A doctor who needs to create a meeting link for a waiting-payment appointment may not realize the row itself is the entry point.
**Root cause**: `page.tsx:326-331` renders a plain `<span>` with muted text + `ChevronRight` for the no-link case, with no button styling, while the meeting-link case (`page.tsx:309-325`) gets two full `Btn` components.
**Recommended resolution**: give the no-link case a real (if secondary-styled) `Btn`-equivalent affordance — e.g. a "Set up meeting link" or "Open" secondary button matching the meeting-link case's "Open" button, rather than a passive caption + chevron.

### 02-005 — "Legacy open window (30h)" checkbox exposes internal/legacy terminology directly to doctors (Low, Microcopy)
**Browser evidence**: `02-appointments-desktop-default-01.png` — checkbox label reads exactly "Legacy open window (30h)".
**Doctor impact**: no doctor-facing context for what this filter does or why "legacy" and "30h" matter; reads as an internal engineering flag left in doctor-facing copy.
**Root cause**: `page.tsx:223-232`, label sourced from `d.appointments.legacyOpenWindow` translation key — the key name and copy both carry the internal "legacy" framing forward into the UI.
**Recommended resolution**: rename the doctor-facing copy to describe the actual behavior (e.g. "Include appointments open in the last 30 hours") or, if this is truly an internal/debug-only filter, gate it behind a role check rather than showing it to every doctor.

## 11. Visual Design Problems

- Filter panel background (`rgb(246, 248, 241)`, a very light green tint) versus the results container background (`rgb(255, 255, 255)`, pure white) — both `radius: 20px`, both `shadow: true` — read as two same-weight, same-shape "cards" stacked back to back with only a subtle tint difference distinguishing "input surface" from "output surface." A stronger visual break (e.g. no card chrome on the filter bar at all once collapsed by default per 02-001) would help.
- The hero (`PageHeader`) uses the same soft-green gradient wash as the stat cards and filter panel — three consecutive sections in near-identical tone reduce the visual "signal" of the one place that should draw the eye first (an actionable row).
- Status pills (`BOOKED – WAITING PAYMENT`, `BOOKING CONFIRMED`, `CANCELLED`, `CONCLUDED`) use color + a small dot consistently — good, not color-only (ties to 20 Accessibility below).

## 12. Information Hierarchy Problems

- VISIBLE RESULTS and MEETING LINKS stat cards carry no action and largely restate what's directly below them — see 02-002.
- The filter panel, being permanently expanded and visually equal-weight to the results container, competes with the results for "first thing I look at" — a doctor's actual task (find/open an appointment) is pushed to third priority in reading order (hero → stats → filters → **results**) when it should be first or second.

## 13. Current Section Order

1. `PageHeader` (hero)
2. `AdminSummaryStrip` (4 stat cards)
3. Filter panel (permanently open on desktop)
4. Results list (`AppointmentCard`/`PortalMobileCard` rows)
5. Pagination footer (conditional, not present at audit time)

## 14. Recommended Section Order (+ reasons)

1. `PageHeader` (hero) — unchanged, minimal, correct as a compact title bar
2. Results list — promoted to immediately below the hero; this is the doctor's primary task and should be the first thing visible
3. Filter panel — collapsed by default (expandable), positioned as a slim bar above the results (search + status as always-visible quick filters, "More filters" disclosure for type/date/finalized) rather than a separate full-height card below the hero
4. Stat strip — reduced to the 2 actionable cards (OPEN CONSULTS, NOT FINALIZED) per 02-002, rendered as small inline chips near the filter bar rather than a separate full-width card row, OR removed entirely if the doctor can already see this at a glance once the list is visible above the fold

Reasoning: the current order optimizes for "configure your view" (stats, then filters) before "see your work" (the list) — inverting doctor intent. A worklist page should show the list first, with filtering/stats as secondary, dismissable chrome.

## 15. Tabs/Steps/Sectioning Recommendation

Not a multi-step page, but the filter panel should adopt a **quick-filter bar + expandable "more filters" pattern** rather than an all-fields-always-visible form:
- Always visible: Search input, Status quick-select (pill/segmented control: All / Waiting payment / Confirmed / Cancelled / Concluded)
- Behind "More filters" disclosure (collapsed by default): Type, From/To date range, Finalized, Legacy open window
- This halves the default vertical footprint (2 fields vs. 6) while keeping full filter power one click away.

### 15-001 — Filter `<summary>` toggle is visually a disclosure control but functionally inert above 640px (High, Interaction / Accessibility)
**Browser evidence**: `02-appointments-desktop-filters-collapsed-01.png` — clicking the "Filters" summary produces no visible state change.
**Doctor impact**: the `<summary>` element's default semantics (and the `cursor-pointer` class still present in the base className) signal "click to toggle" — a doctor who clicks it and sees nothing happen may assume the page is broken, not that the control is intentionally disabled at this width.
**Root cause**: `page.tsx:156` — `sm:pointer-events-none sm:cursor-default` on the `<summary>`.
**Recommended resolution**: either make the panel genuinely collapsible at all viewports (preferred, ties to 02-001) or, if desktop-always-open is intentional, remove the `<summary>`/disclosure semantics and `cursor-pointer` styling entirely on desktop so the control doesn't visually promise an interaction it won't perform.

## 16. Save & Finalization Recommendation

N/A for this list page itself — no save/finalize actions live here (that's the appointment detail/workspace page, out of scope this pass). One related finding:

### 16-001 — No unsaved-change guard applicable (informational)
This is a server-rendered filter-via-URL page (`<form>` submits via GET, not client state) — there is no "unsaved changes" risk since every filter change is a full navigation. No guard needed. Noted per brief requirement 6, marked N/A.

### 16-002 — see 02-004 (no-meeting-link row affordance) — cross-referenced here since it affects the "what should I click" clarity the save/action-clarity section is meant to cover.

## 17. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (hero) — unchanged
2. Quick-filter bar (Search + Status segmented control, "More filters" disclosure trigger) — replaces the full 6-field panel by default
3. Results list (`AppointmentCard`/`PortalMobileCard` rows) — promoted above the old stat-strip position
4. Compact actionable-stat chips (OPEN CONSULTS, NOT FINALIZED only) — inline near the quick-filter bar, not a separate full-width card row
5. Pagination footer (unchanged, conditional)

## 18. Proposed Container Simplification

- **Remove**: VISIBLE RESULTS and MEETING LINKS stat cards (02-002) — 2 of the 4 `AdminSummaryStrip` cards.
- **Keep, but wire as links**: OPEN CONSULTS, NOT FINALIZED — convert from static `AdminSummaryStrip` items to filter-shortcut chips/links.
- **Flatten**: filter panel from a full-height always-open `<details>` card (6 fields) to a slim quick-filter bar (2 always-visible controls + disclosure for the rest) — see 15.
- **Flatten**: remove `box-shadow` from `.gh-appointment-card__time`, `.gh-pill`, and the pill's inner dot (02-003) — these should be typography/color only, not their own bordered surfaces.
- **Rows**: keep `AppointmentCard`/`PortalMobileCard` as-is structurally (already correct: list of rows, not card-in-card-in-card) — the row recipe itself is sound, it's the shadow bleed-through (02-003) and the missing-link affordance (02-004) that need fixing, not the row pattern.
- **Max visible surface levels after fix**: 3 (page header → results container → row), down from the current 5.

## 19. Responsive Findings (per viewport)

- **Desktop/Laptop/Tabletl/Tabletp** — layout stacks correctly, no overflow; the fold problem (19-002) is the dominant issue across all of these, worsening as viewport height shrinks.
- **19-001 Mobile (390) / Smobile (375)** — a floating black circular support/help-widget badge ("N") sits fixed at the bottom-left of the viewport and visually overlaps the OPEN CONSULTS stat card's value text at the smallest width (`02-appointments-smobile-default-01.png`) — the "1" in "12" and the card's hint text are partially obscured. This is a shell-wide widget z-index issue (also seen on `01-dashboard.md`, mobile nav drawer screenshot), not appointments-specific, but it directly obscures content on this page. Recommend raising the results/stat-card z-index above the widget, or repositioning the widget to avoid the content column at narrow widths.
- **19-002 Short (1366×650)** — `02-appointments-short-default-01.png`: **zero appointment rows visible above the fold** — hero, all 4 stat cards, and the top of the filter panel consume the entire viewport height. This is the clearest evidence for 02-001; a doctor on a 1366×650-class display (common laptop-with-taskbar resolution) cannot see a single appointment without scrolling on page load.
- **19-003 Mobile breadcrumb truncation** — `02-appointments-mobile-default-01.png` / `-smobile-default-01.png`: the header breadcrumb "Doctor › Appointments" truncates to "Doctor › A" (only the first letter of "Appointments" survives) at 390px and disappears further at 375px, sitting immediately adjacent to the "EN" language switcher with no visible ellipsis treatment — reads as a rendering glitch rather than intentional truncation. Recommend hiding the trailing breadcrumb segment entirely below a width threshold (showing only "Doctor" or an icon) rather than letting it clip mid-word.

## 20. Accessibility Findings

- Status pills use color + dot + text label consistently (not color-only) — good, applies across all 4 status states observed (waiting payment, confirmed, cancelled, concluded).
- Keyboard focus: confirmed visible lime focus ring on form fields during Tab traversal (`02-appointments-desktop-keyboard-focus-01.png`); order proceeds logically header → filter fields.
- 15-001 (dead `<summary>` toggle) is also an accessibility concern: a `<details>`/`<summary>` pair carries native disclosure semantics (screen readers announce it as expandable) that are false on desktop where the control does nothing — assistive-technology users get an incorrect affordance signal.
- 02-004 (no-meeting-link row) — the row is a real `<Link>` (keyboard-focusable, correct semantics) but has no distinct focus-visible styling beyond the shared `.gh-appointment-card` treatment; not verified whether focus ring is visually sufficient on a row with no button chrome (worth a dedicated check).
- Touch targets: "Join"/"Open" button pair on rows with meeting links sit close together (~4-8px gap based on screenshot proportions) — not measured precisely this pass, flag for a tap-target-size check on mobile (`PortalMobileCard` stacks them vertically instead, which sidesteps this — desktop-only concern).

## 21. Content & Microcopy Findings

| Current | Recommended | Reason |
|---|---|---|
| "Legacy open window (30h)" | "Include appointments open in the last 30 hours" (or gate behind an internal/admin-only flag) | See 02-005 — internal jargon exposed to doctors |
| "VISIBLE RESULTS" / "MEETING LINKS" stat labels | Remove (02-002) | Non-actionable, duplicate information |
| "Meeting link not yet created" (row caption, no-link case) | Keep the informational text, but pair it with a real button label like "Set up link" | See 02-004 |
| Empty-filtered: "No appointments match these filters / Try widening the date range or clearing status filters." | Keep — specific, correctly differentiated from the true-empty state | Good pattern, no change |
| "BOOKED – WAITING PAYMENT" / "BOOKING CONFIRMED" pill text | Keep — clear, doctor-relevant status language | No change needed |

## 22. Component & Code Impact

| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| Filter panel collapse behavior | `frontend/app/(doctor)/doctor/appointments/page.tsx:155-245` | Remove `sm:pointer-events-none`, default-collapse logic, restructure into quick-bar + disclosure | No (page-local) | Medium (URL/query-param wiring must stay intact) | Medium |
| Stat strip reduction + link-wiring | `frontend/app/(doctor)/doctor/appointments/page.tsx:120-153` | Drop 2 cards, wire remaining 2 as filter-shortcut links | No (page-local), but `AdminSummaryStrip` itself has no `href` support | Low-Medium — may need `AdminSummaryStrip` prop addition (shared, `atoms.tsx:180-217`) | Medium |
| Shadow removal on row internals | `frontend/app/portal.css` (selector not yet isolated — needs audit) | Scope `box-shadow` off `.gh-appointment-card__time`, `.gh-pill`, pill-internal spans | Yes — shared across portals if these classes are reused elsewhere (needs a grep before touching) | Medium (shared CSS, cross-portal risk) | Small once source selector is found |
| No-meeting-link row affordance | `frontend/app/(doctor)/doctor/appointments/page.tsx:326-331`, `frontend/components/AppointmentCard.tsx` (action slot) | Render a real secondary `Btn` instead of caption+chevron | `AppointmentCard` is shared (Doctor/Admin/Patient per its own doc comment) — check other callers before changing default behavior | Medium | Small |
| Legacy-window label copy | i18n bundle (`d.appointments.legacyOpenWindow`, locale files under `frontend/lib/i18n` / `frontend/messages` doctor bundle) | Copy-only change | No | Low | Trivial |
| Mobile breadcrumb truncation | `PortalShell` breadcrumb rendering (`frontend/components/portal-shell.tsx` or equivalent — not opened this pass, flagging by symptom) | Truncate/hide trailing segment below a width threshold | Yes — shell-wide, affects all 3 portals | Low-Medium | Small |
| Floating widget z-index overlap | Widget/shell component (not identified this pass — likely a support-chat or brand badge fixed-position element) | Reposition or lower z-index relative to page content at narrow widths | Yes — shell-wide | Low | Small once source located |

## 23. Backend or Business-Logic Impact

- 02-001, 02-002, 15-001, 02-004, 02-003, 21 findings are all frontend-only — no API contract changes needed; `fetchDoctorAppointments` already returns everything the proposed quick-filter/stat-shortcut UI needs.
- 22-001 (pagination, not fully verified — 15 results never exceeded the 25-item page size this pass): needs a doctor account with >25 appointments to browser-verify the "Page X of Y" footer and confirm there's an actual page-2 control, not just static text. Flag for a follow-up pass with a larger seeded account, or a code review of `page.tsx:395-402` to confirm next/prev controls exist beyond the text shown.
- No clinical/legal review needed — all findings are presentation-layer.

## 24. Recommended Implementation Order

1. 02-001 / 15-001 (filter panel collapse + dead toggle) — highest-impact single fix, resolves the "floating boxes" complaint most directly
2. 02-002 (stat strip reduction + shortcut links) — pairs naturally with #1, same file, same review
3. 02-004 (no-meeting-link row affordance) — small, high doctor-facing clarity gain
4. 19-003 (breadcrumb truncation) + 19-001 (widget overlap) — shell-wide, coordinate with whoever owns `PortalShell`/the widget, likely a single fix benefiting all portals
5. 02-003 (shadow audit) — needs source-selector investigation first; do after the above land so there's no rebase conflict on the row markup
6. 02-005 (legacy-window copy) — trivial, any time
7. 22-001 (pagination verification) — needs a bigger seeded account; not blocking

## 25. Acceptance Criteria (measurable)

- At 1366×650, at least 2 appointment rows are visible without scrolling on default page load (currently 0).
- Filter panel's `<summary>` either genuinely toggles content visibility at all viewports ≥ 375px, or the disclosure semantics/`cursor-pointer` styling are removed where it's inert.
- Stat strip shows at most 2 cards, both of which navigate to a pre-filtered view of the list on click.
- Rows with no meeting link render a focusable, visibly-styled action control (not a plain caption).
- `box-shadow` is `none` on `.gh-appointment-card__time`, `.gh-pill`, and pill-internal elements (computed-style check).
- Mobile breadcrumb never renders a single truncated character ("A") — either full label or hidden.

## 26. Open Questions

- Is the floating "N" widget (19-001) a support-chat launcher, a brand badge, or something else? Not identified from the DOM dump this pass — needs a source lookup before a z-index fix can be scoped correctly.
- Should the "Legacy open window (30h)" filter be doctor-facing at all, or is it a debugging/ops leftover that should be admin/internal-only? Needs a product decision, not just a copy fix.
- Confirm with Fable/product whether collapsing the filter panel by default (02-001) is the right default, or whether doctors specifically want filters always visible for muscle-memory reasons — this is the single structural recommendation on this page most likely to need design sign-off before implementation, since it changes default information density on the portal's most-used page.
- Pagination behavion beyond 25 results is unverified this pass (22-001) — needs either a bigger seeded account or a dedicated code review.
