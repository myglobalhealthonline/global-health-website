# 02 — My Bookings

## 1. Page Identification

- **Name:** My bookings
- **Route:** `/account/bookings`
- **Entry points:** Patient portal sidebar "My bookings" (Care group); redirect target after checkout/payment return (`?orderId=`/`?session_id=`); linked from dashboard booking widgets.
- **Role:** Patient (authenticated, `(auth)` route group)
- **Related frontend files:**
  - `frontend/app/(auth)/account/bookings/page.tsx` — server component, fetches data, renders stat strip
  - `frontend/app/(auth)/account/bookings/ui.tsx` — `BookingsShell` client component, all list/filter/dialog logic
  - `frontend/app/(auth)/account/bookings/loading.tsx`
- **Shared components used:** `PageHeader`, `AdminSummaryStrip`, `AdminEmptyState`, `Pill`, `Btn` (`frontend/components/portal-atoms.ts` → `frontend/app/(admin)/admin/_components/atoms.tsx`), `PortalMobileCard` (`frontend/components/PortalMobileCard.tsx`), `PortalDialog` (`frontend/components/PortalDialog.tsx`), `ChatThread`, `ConsultationChat`
- **APIs observed (code-derived):** `GET /api/account/appointments` (`frontend/lib/api/account-appointments-api.ts`, server-side, no query params — no pagination/filter support server-side); `POST` cancel via `cancelAccountAppointment`; payment-url fetch via `fetchAppointmentPaymentUrl`; chat via `fetchPatientMessages`/`postPatientMessage` and `fetchPatientChat`/`postPatientChatMessage`.
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **Account state:** 27 bookings (populated), 2 unpaid, 10 with meet links, 0 upcoming at test time.

## 2. Page Purpose

Let a patient see the full history of their consultation requests, act on anything blocking progress (pay, join a call, message, reschedule, cancel), and find a specific past booking.

## 3. Primary User Tasks (priority order)

1. See which bookings need payment right now and pay.
2. Join a scheduled video call.
3. Find a specific booking (search/filter) among a long history.
4. Message the clinic / chat with the assigned doctor about a booking.
5. Reschedule or cancel an upcoming request.
6. Get directions to an in-person appointment location.

## 4. Current Page Structure (top-to-bottom)

1. Page header card (breadcrumb "Account", title "My bookings", subtitle, "Book consultation" CTA) — `gh2`-style rounded gradient panel
2. 4-card stat strip: Upcoming / Payment / Meet links / History
3. Filter row: Search input + Status `<select>` + conditional "Clear filters" text link
4. Conditional payment-error banner
5. Conditional "Action required" banner (unpaid bookings) — its own bordered/tinted panel containing one flat sub-row per unpaid booking, each with a "Complete payment" button
6. Booking list — one `PortalMobileCard` per booking (used at **every** viewport, not just mobile), each containing:
   - Title row (order # + consultation type) + status pill
   - 2-column meta grid: Order / Country / Doctor / Scheduled / Payment — each meta value in its own bordered box
   - Optional green "Scheduled" band with "Join call" button
   - Optional blue "Where" band with "Directions" link
   - Optional notes box
   - Action button row: Message the clinic / Chat with your doctor / Reschedule / Cancel booking
7. No pagination, no "load more", no virtualization — all 27 cards render in one DOM pass and the list simply keeps growing.
8. Two `PortalDialog` modals per card (chat, doctor chat) + one shared cancel-confirmation `PortalDialog` at the bottom of the tree.

## 5. Current Container Hierarchy (indented tree; unnecessary levels marked)

```
.gh-patient-page.gh-patient-bookings-page
├─ PageHeader card                                         [necessary — page identity]
├─ AdminSummaryStrip (section, 4× stat-item div)            [DECORATIVE — see 02-001]
├─ .gh-patient-bookings-filters (flex row)                  [necessary]
│  ├─ label > .gh-input (search)
│  └─ label > .gh-select (status)
├─ pay-error banner (conditional)                           [necessary when present]
├─ .gh-patient-action-required (bordered/tinted panel)       [UNNECESSARY WRAPPER — see 02-002]
│  └─ grid
│     └─ div (flat row) × unpaid-count                      [fine — not a card, just a row]
├─ .gh-patient-bookings-list (grid, gap 16px)
│  └─ PortalMobileCard (bordered card) × 27                  [CARD-PER-ROW — see 02-003]
│     ├─ title-row (title + status pill)
│     ├─ meta grid (2 cols)
│     │  └─ meta-item (bordered box, bg well) × up to 5      [CARD-IN-CARD — see 02-003]
│     ├─ scheduled band (bordered, tinted)                   [nested colored panel]
│     ├─ where band (bordered, tinted)                       [nested colored panel]
│     ├─ notes box (bg well)                                 [nested panel]
│     ├─ action button row
│     └─ 2× PortalDialog (chat modals)
└─ PortalDialog (cancel confirmation, shared)
```
Depth at its worst (a booking with scheduled band + where band + notes): **PageBody → list → PortalMobileCard → meta-item box** = 3 nested bordered containers, plus 2 more sibling tinted bands inside the same card — 5 visually-boxed regions inside one already-boxed card.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Status `<select>` | Filter | Selected "Cancelled" | List correctly narrowed to 3 cancelled bookings | — | `02-bookings-desktop-filter-cancelled-01.png` |
| Search input | Filter | Typed "GP consultation" (the exact visible label text) | **0 results** even though ~20 GP-consultation bookings are visible in the unfiltered list | 02-004 | `02-bookings-desktop-search-gp-01.png` |
| Search input | Filter | Typed nonsense string | Correct "No bookings match" empty state rendered | — | `02-bookings-desktop-no-match-01.png` |
| "Clear filters" link | Button | N/A (inspected code) | Resets both search and status | — | code-derived |
| "Message the clinic" | Button → Modal | Clicked | `PortalDialog` opens with empty chat thread, input + Send | — | `02-bookings-desktop-chat-drawer-open-01.png` |
| Escape key | Keyboard | Pressed while chat modal open | Modal closed | — | `02-bookings-desktop-chat-drawer-escape-closed-01.png` |
| "Cancel booking" | Button → Modal | Clicked, then clicked "Keep booking" (did not confirm) | Confirmation dialog opens correctly, dismiss works, no mutation sent | — | `02-bookings-desktop-cancel-dialog-open-01.png` |
| "Reschedule" | Link | Read `href` | Navigates to `/account/bookings/{id}/reschedule` | — | code-derived |
| Tab key | Keyboard | Tab from search input | Focus moves to Status `<select>` (correct DOM order) | — | console log |
| Stat cards | Static | N/A | No click handler — purely decorative counters | 02-001 | `02-bookings-desktop-default-01.png` |
| Action-required rows | Button | N/A (not clicked, would start a real Stripe redirect) | "Complete payment" would navigate off-portal to Stripe — not tested to avoid a real payment flow | — | N/A — real payment side-effect |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `02-bookings-desktop-default-01.png`…`06.png` | 1440×900 | Default, scrolled slices | Full page baseline | 02-001–02-003, 02-005 |
| `02-bookings-mobile-default-01.png`…`06.png` | 390×844 | Default, scrolled slices | Mobile baseline | 02-006, 02-007 |
| `02-bookings-short-default-01.png` | 1366×650 | Default | Short-viewport clipping check | 02-008 |
| `02-bookings-desktop-filter-cancelled-01.png` | 1440×900 | Status filter = Cancelled | Filter correctness | — |
| `02-bookings-desktop-search-gp-01.png` | 1440×900 | Search = "GP consultation" | Search/label mismatch bug | 02-004 |
| `02-bookings-desktop-no-match-01.png` | 1440×900 | Search = no match | Empty-state correctness | — |
| `02-bookings-desktop-chat-drawer-open-01.png` | 1440×900 | Chat modal open | Modal a11y/behavior | — |
| `02-bookings-desktop-chat-drawer-escape-closed-01.png` | 1440×900 | After Escape | Keyboard-dismiss works | — |
| `02-bookings-desktop-cancel-dialog-open-01.png` | 1440×900 | Cancel confirm dialog open | Destructive-action gating | — |
| `02-bookings-mobile-full-page-01.png` | 390×844 | Full-page scroll capture | Stack order / stat-card scroll cost | 02-006 |
| `02-bookings-tabletp-default-01.png` | 768×1024 | Default | Tablet meta-grid waste | 02-005 |

## 8. UX Problems

**02-001 — Stat strip duplicates filter/list information and pushes the actual task below the fold**
Severity: Medium · Category: Information hierarchy / card overuse
Evidence: `02-bookings-desktop-default-01.png`, `02-bookings-short-default-01.png`
The four stat cards (Upcoming, Payment, Meet links, History) are non-interactive — clicking them does nothing (`frontend/app/(auth)/account/bookings/page.tsx:63-71`, plain `AdminSummaryStrip`, no `href`/`onClick`). "Payment: 2 action" duplicates the "Action required" banner two sections below; "History: 27" duplicates the visible list length. On the 1366×650 short viewport the strip + filters + action banner alone consume the entire viewport height — zero actual bookings are visible without scrolling.
User impact: patients land on the page and see numbers before they see anything they can act on; the numbers themselves are inert.
Root cause: `AdminSummaryStrip` was reused from the admin dashboard pattern without adding click-through (e.g. Payment card → jump to unpaid banner, or filter by unpaid) or evaluating whether a booking-history page needs 4 KPI tiles at all.
Recommended resolution: cut the strip to at most one interactive summary line (e.g. "27 bookings · 2 need payment" as plain text with an inline "Review" anchor scrolling to the action-required section), or make each tile a real filter shortcut (Payment tile → sets `status`/derived unpaid filter). Reclaim the vertical space for the list.

**02-002 — "Action required" banner is a bordered/tinted card wrapping more flat rows, one card too many**
Severity: Low · Category: Card overuse
Evidence: `02-bookings-desktop-default-01.png`
The unpaid-items banner (`ui.tsx:397-436`) is a 2px-bordered, tinted, rounded panel containing a `grid` of already-distinct rows (each with its own bg-elevated pill). The outer border+background is decorative — the rows are already legible without it once inside a bounded section.
Recommended resolution: keep the warning icon + heading, drop the outer border/background, use a simple divider list for the rows (matches Section-ordering recommendation below).

**02-003 — Booking list uses `PortalMobileCard` (a mobile fallback primitive) as the ONLY presentation at all 7 viewports, producing card-in-card nesting and the "floating boxes" look the redesign brief calls out**
Severity: High · Category: Card overuse / list presentation
Evidence: `02-bookings-desktop-default-01.png`, `02-bookings-desktop-default-02.png`, `02-bookings-tabletp-default-01.png`
`ui.tsx:449` renders `PortalMobileCard` directly for every booking with no desktop table — unlike the `ColumnPriorityTable` pattern documented in the project's own `CLAUDE.md` (desktop table + `PortalMobileCard` fallback from one config), this page has no desktop table at all. Each card then nests a 2-column meta grid where every meta value is its own bordered `.gh-portal-mobile-card__meta-item` box (`portal.css:767-773`, `bg: var(--portal-well)`, its own border+radius+padding) — a card-in-a-card. A booking with a scheduled time, an in-person location, and notes stacks 3 more bordered/tinted "band" panels below the meta grid inside the same outer card. On desktop this reads as a wall of boxes-in-boxes rather than a scannable list.
Root cause: the page was built directly on the mobile-card primitive instead of a `ColumnPriorityTable` config, so there is no denser desktop row/table representation and no way to collapse the meta grid into inline text at wide viewports.
Recommended resolution: migrate to a `ColumnPriorityTable` (columns: Order/Status/Consultation type P1, Scheduled P1, Doctor P2, Country P3, Payment P2, Actions P1) that renders a real table ≥1024px and falls back to `PortalMobileCard` below the breakpoint per project convention. Within the mobile card, replace the boxed meta grid with a plain label/value 2-column list (no per-item border/background) — see 14.

**02-004 — Search field matches raw `consultationType` codes, not the label patients see, so typing the visible label returns zero results**
Severity: High · Category: Functional bug
Evidence: `02-bookings-desktop-search-gp-01.png` (console: `Search 'GP consultation' result count: 0`)
`ui.tsx:286-297` filters on `item.consultationType.toLowerCase()` (raw values like `"general"`), while every card displays the translated label via `consultLabel()` (e.g. `"GP consultation"`, `messages.typeGeneral`). A patient who searches for exactly what they see on screen — "GP consultation" — gets "No bookings match" even though most of their 27 bookings are that type.
Root cause: the filter predicate was written against the API's raw enum field instead of the same `consultLabel()` output rendered in the card title.
Recommended resolution: filter against `consultLabel(item.consultationType, i18n).toLowerCase()` (and keep the raw-value match as a fallback) so search matches what's on screen.

**02-005 — Meta grid wastes half its width on bookings with only 1 meta fact**
Severity: Low · Category: Space misuse
Evidence: `02-bookings-desktop-default-06.png`, `02-bookings-tabletp-default-01.png`
The meta block is a fixed `grid-template-columns: repeat(2, 1fr)` (`portal.css:761-765`). Older/simpler bookings that only have a Country value (no order #, doctor, schedule, or payment) still render a 2-column grid with one populated box and one empty column's worth of blank space to its right (visible in `...default-06.png`, "GP consultation · Booked 23 May 2026" rows).
Recommended resolution: switch to `grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))` or drop the boxed-grid entirely per 02-003's recommendation, at which point a single label/value pair simply doesn't leave dead space.

**02-006 — On mobile, four full-width stat cards force ~800px of scrolling before the first booking appears**
Severity: Medium · Category: Space misuse / responsive
Evidence: `02-bookings-mobile-default-01.png`
At 390×844 the stat strip stacks to one column, so Upcoming/Payment/Meet links/History each take a full-width card — roughly one screen height of KPI tiles before Search/Status even appear, let alone a booking.
Recommended resolution: same as 02-001 — collapse to a compact 2×2 grid (already partly supported by `--card-count`, check the strip's mobile grid rules) or replace with the single-line summary; on mobile this is more urgent than desktop because vertical space is the primary constraint.

**02-007 — Floating chat-launcher widget overlaps the bottom-left content area on every viewport**
Severity: Low · Category: Layout overlap
Evidence: `02-bookings-mobile-default-01.png`, `02-bookings-desktop-default-01.png` (bottom-left "N" bubble)
A fixed-position support-chat bubble sits over the sidebar/"Medicine anytime, anywhere" footer text on desktop and over page content at short viewports. Not page-specific (site-wide widget) but worth flagging since it clips text ("A...WHERE") at 1366×650 (`02-bookings-short-default-01.png` sidebar footer). Mark code-derived for exact source (widget not in scope files reviewed).

**02-008 — No pagination or lazy-loading for a 27-item (and growing) history list**
Severity: Medium · Category: List presentation / performance
Evidence: `02-bookings-desktop-default-01.png` through `06.png` (6 screenshot slices needed just to reach the bottom of the visible viewport-capped capture, list continues past)
`fetchAccountAppointments()` (`account-appointments-api.ts:53`) has no query params — the API returns the full history in one call, and the UI renders every card unconditionally. For patients with a long consult history (this account: 27) the page becomes a very long single scroll with no way to jump to "recent" vs "older," no grouping by month, and no server-side page size cap.
Recommended resolution: group by month with sticky sub-headers, or add a "Load more" / cursor pagination once history exceeds ~10-15 items; at minimum sort/section so the 2 unpaid + upcoming items are guaranteed near the top even without scrolling.

## 9. Visual Design Problems

- Every one of: header panel, 4 stat cards, action-required panel, its inner rows, each booking card, each meta-item box, each scheduled/where/notes band uses the same rounded-corner + soft-border + light-tint recipe. Nothing signals a hierarchy of importance through shape — only color-coding (green/amber/blue tints) does that work, and it's applied so uniformly (every card gets a border) that the truly urgent unpaid banner doesn't stand out much more than the "Where" travel-directions band on a routine booking.
- Status pills, payment pills, and the "Current"-style label styling are visually consistent — no complaint there.
- The scheduled/where "band" components use the same visual weight (colored border + bg) as the outer action-required banner, so a single card can visually compete with the page-level urgent-action banner above it.

## 10. Information Hierarchy Problems

- Page-level attention order today: giant gradient header → 4 stat numbers → filters → action-required banner → 27 uniform cards. The single most time-critical item (a booking needing payment right now) is buried below two other "chrome" sections (header, stats) and a filter row the patient hasn't asked to use yet.
- Within each card, the title row (consultation type) and the action buttons carry equal visual weight to the meta boxes — nothing marks "Scheduled" as more important than "Country," even though scheduled time + join-call is the #2 priority task.

## 11. Section Ordering Review

Current numbered order:
1. Page header
2. Stat strip (4 cards)
3. Search/status filters
4. Payment error banner (conditional)
5. Action-required (unpaid) banner (conditional)
6. Booking list

Recommended numbered order + reasoning:
1. Page header — unchanged, needed for orientation/CTA.
2. **Action-required (unpaid) banner** (conditional) — move to position 2. This is the single most time-sensitive task on the page (blocks doctor chat); it should not depend on scrolling past decorative stats.
3. Payment error banner (conditional) — stays adjacent to the payment banner it relates to.
4. **Compact one-line summary** (replaces the 4-card stat strip) — "27 bookings · 2 need payment · 10 ready to join" as inline text/small pills, not full cards. Keeps the counts (they are useful context) without the vertical cost.
5. Search/status filters — unchanged position, now directly above the list it filters.
6. Booking list, sectioned by Upcoming / Needs action / Past (see 12) instead of one flat 27-item stack.

## 12. Tabs, Steps, or Sectioning Recommendation

Not a form/wizard, so tabs/steps don't apply in the traditional sense, but the flat list should be **sectioned** (not tabbed — patients still want one scroll, not another click):
- Section "Needs your action" (unpaid items) — already exists as the banner; keep it a lightweight divider-list.
- Section "Upcoming" — bookings with `scheduledAt >= now`.
- Section "Past / cancelled" — everything else, defaulting to a collapsed/"Show more" state after ~10 rows, or grouped by month.
Default expanded: "Needs your action" and "Upcoming"; "Past" collapsed behind a "Show 17 more" control.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Page header (title, subtitle, Book consultation CTA) — unchanged
2. Action-required strip (unpaid items) — flat divider rows, no outer card, shown only if non-empty
3. One-line stat summary + Search + Status filter on a single row (summary text left, controls right)
4. Section: Upcoming (table/row list)
5. Section: Needs action beyond payment (none today, reserved) — omit if empty
6. Section: History (table/row list, paginated or grouped by month, collapsed by default beyond ~10 rows)

## 14. Proposed Container Simplification

| Element | Action | Detail |
|---|---|---|
| 4-card stat strip | **Remove**, replace with plain text line | No border/background containers; keep the 4 numbers as inline `<dt>/<dd>` or comma-separated text |
| Action-required outer panel border+bg | **Flatten** | Keep icon+heading, drop 2px border/tinted background; render rows as a plain divided list |
| `PortalMobileCard` per booking (desktop) | **Replace with table row** | Use `ColumnPriorityTable` — real `<table>` row at ≥1024px, `PortalMobileCard` fallback below |
| Meta-item boxes inside card | **Flatten to plain label/value pairs** | Drop `border`+`background` on `.gh-portal-mobile-card__meta-item`; keep only typography (uppercase micro-label + bold value) |
| Scheduled / Where bands | **Keep as color-tinted rows**, but reduce to single-border (not border+shadow+bg all three) and make them the SAME visual weight as each other (currently fine) but distinctly lighter than the page-level action-required banner |
| Notes box | **Keep** — legitimately secondary/quoted content, a light background without border is enough |
| Cancel/chat `PortalDialog`s | **Keep** — appropriate modal usage, correctly interactive-tested |

## 15. Responsive Findings

- **Desktop (1440×900):** Full nesting problem visible; wide-format still renders single-column mobile-card list — significant unused horizontal space per card past ~700px card width (`02-bookings-desktop-default-01.png`).
- **Laptop (1280×720):** Same layout as desktop, no adaptation.
- **Tabletl (1024×768):** Same single-column card list; no regressions, no new clipping.
- **Tabletp (768×1024):** Stat strip drops to what looks like a 2-up/near-single column with cards nearly touching viewport edges (`02-bookings-tabletp-default-01.png`); meta-grid dead-space issue (02-005) most visible here.
- **Mobile (390×844):** Functional, but stat-card scroll cost is worst here (02-006); action buttons stack to full-width single column inside cards — usable, generous tap targets.
- **Small mobile (375×667):** No additional clipping beyond mobile; text truncation on card titles (`text-overflow: ellipsis` + `whitespace-nowrap` per `portal.css:740-749`) behaves as designed.
- **Short (1366×650):** Confirmed critical space misuse — header + stats + filters + action-required banner consume the full viewport height; the first actual booking card is entirely below the fold on load (`02-bookings-short-default-01.png`). No content is unreachable (scroll works), but the "above the fold" experience shows zero bookings.

## 16. Accessibility Findings

- Heading outline is minimal but correctly nested: `H1 "My bookings"` → `H2 "Action required — 2 bookings need payment"` (conditional). No H2 for the booking list itself or for filters — acceptable for a single-list page but a landmark/`aria-label` on the list region would help screen-reader users skip to it.
- Search input uses a `<label>` wrapping `<span>` + `<input>` — correctly associated, no `id`/`for` needed. Status `<select>` likewise correctly labelled.
- Keyboard Tab order verified: Search → Status select (logical, matches visual order).
- `PortalDialog` (chat) correctly closes on Escape — verified live (`02-bookings-desktop-chat-drawer-escape-closed-01.png`).
- Cancel confirmation dialog: verified Keep/Cancel buttons both reachable and dismiss works without submitting.
- Icon-only elements: all action buttons (Message the clinic, Chat with your doctor, Reschedule, Cancel booking, Complete payment) pair an icon with visible text — no icon-only-button labeling gap found on this page.
- Meta-item labels (`ORDER`, `COUNTRY`, etc.) are visually distinct via `<em>`/`<strong>` styling but are plain `<span>` markup, not a `<dl>`/`<dt>`/`<dd>` — screen readers won't announce them as a structured label/value pair, just as flowing text. Low-severity semantic gap; recommend `<dl>` if the meta grid is kept in any form.
- Color contrast: the muted meta-label text (`color: var(--portal-muted)`, 10px, 800 weight uppercase) should be checked against `--portal-well` background — visually low-contrast in screenshots (suspected, not measured); flag for exact ratio check by design.
- The disabled-look "Doctor chat locked" pill (span, not button) for unpaid bookings has a `title` attribute but no visible focus target since it's not interactive — acceptable since it correctly isn't focusable, but the same information could be announced via `aria-disabled` on a real (disabled) button for consistency with the enabled sibling button it replaces.

## 17. Content and Microcopy Findings

| Current | Recommended | Note |
|---|---|---|
| "Message the clinic" / "Chat with your doctor" | Keep — both task-specific already, good example | — |
| "Complete payment" | Keep — clear and task-specific | — |
| Stat card labels "Upcoming" / "Payment" / "Meet links" / "History" | If stats are kept in any form, "Meet links" is unclear (ready video calls, not "links") — consider "Ready to join" | Minor |
| Search placeholder "Consultation type, country, status…" | Keep, but fix the underlying bug (02-004) so it actually matches consultation-type labels | — |
| "GP consultation" search returning nothing | See 02-004 — functional fix required, not copy | — |
| Empty meta grid cells (no label shown at all when a field is absent) | No copy issue — fields are conditionally omitted, not shown blank | — |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| `AdminSummaryStrip` usage | `frontend/app/(auth)/account/bookings/page.tsx:63-71` | Replace 4-card strip with inline summary text | Page-specific usage of a shared component | Low | Small |
| Search filter predicate | `frontend/app/(auth)/account/bookings/ui.tsx:286-297` | Filter against `consultLabel()` output, not raw `consultationType` | Page-specific | Low | Small |
| Booking list rendering | `frontend/app/(auth)/account/bookings/ui.tsx:445-641` | Replace flat `PortalMobileCard` loop with `ColumnPriorityTable` config (desktop table + mobile card) | Page-specific consumer of shared primitive | Medium | Medium |
| Meta-item box styling | `frontend/app/portal.css:767-773` | Remove border/background from `.gh-portal-mobile-card__meta-item`, or introduce a plain variant class | Shared (portal.css) — check other `PortalMobileCard` consumers before changing globally | Medium | Small |
| Action-required banner | `frontend/app/(auth)/account/bookings/ui.tsx:397-436` | Flatten outer panel to borderless section | Page-specific | Low | Small |
| List sectioning (Upcoming/History) | `frontend/app/(auth)/account/bookings/ui.tsx` | Add grouping logic + collapse-beyond-N for history | Page-specific | Medium | Medium |

## 19. Recommended Implementation Order

1. Fix search filter bug (02-004) — isolated, low-risk, immediate correctness win.
2. Flatten action-required banner + remove stat-card strip (02-001, 02-002, 02-006) — pure layout/CSS, no data changes.
3. Section the list (Upcoming / History) and add collapse-beyond-N (02-008) — logic-only, no new components.
4. Migrate booking rows to `ColumnPriorityTable` + flatten meta-item boxes (02-003, 02-005) — larger structural change, do last and re-screenshot all viewports after.

## 20. Acceptance Criteria (measurable)

- Searching the exact visible consultation-type label (e.g. "GP consultation") returns all matching bookings.
- At 1366×650, at least one booking card/row is visible above the fold on initial load.
- Stat strip no longer renders 4 separate bordered cards; total vertical height of the "chrome" (header+summary+filters) before the first booking is reduced by ≥40% versus current desktop baseline.
- Booking list at ≥1024px renders as a table (or equivalent dense row layout), not one `PortalMobileCard` per item.
- Meta values inside a booking row no longer render inside individually bordered boxes.
- History section beyond the first ~10 items is collapsed/paginated by default.

## 21. Open Questions

- Should "Payment" and "Meet links" stat counts be preserved anywhere once the strip is removed, or are they redundant with the action-required banner and per-row status pills? (Design call, not answerable from code/browser alone.)
- Is there a product reason the meta grid always reserves 2 columns even for 1-field bookings (future fields planned), or is it simply unstyled for the sparse case? Not determinable from code — flag for design confirmation.
- The floating chat-launcher bubble (02-007) is likely a site-wide widget outside this page's owned files — needs its source located before proposing a page-level fix; out of scope for this file's confirmed root cause.
