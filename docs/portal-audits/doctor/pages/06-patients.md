# 06 — Patients (list)

## 1. Page Identification
- **Name:** My patients
- **Route:** `/doctor/patients`
- **Entry points:** Doctor portal sidebar → Practice → Patients
- **Role:** DOCTOR
- **Workflow:** Doctor looks up a patient they have treated to review history or jump into a record
- **Frontend files:**
  - `frontend/app/(doctor)/doctor/patients/page.tsx` (server component, RSC data fetch)
  - `frontend/app/(doctor)/doctor/patients/loading.tsx`
- **Shared components:** `AdminSummaryStrip`, `PageHeader` (`components/portal-atoms.tsx`), `ColumnPriorityTable` (`components/ColumnPriorityTable.tsx`), `ComplianceBanner` (`app/(doctor)/doctor/_components/compliance-banner.tsx`, rendered by the doctor route-group layout, not this page)
- **APIs observed:** `GET /api/doctor/patients` → proxies to backend `GET /api/doctor/patients` (`backend/src/routes/doctor.route.ts:420`)
- **Date:** 2026-07-12
- **Viewports tested:** desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650 (all 7 — browser-verified)
- **States tested:** default/populated (5 patients), full-page scroll (mobile). Not triggerable safely without seed changes: empty (no patients), error/API-down, loading skeleton — these are **code-derived** below.

## 2. Page Purpose
A doctor-scoped roster of every distinct patient who has booked with this doctor, used as a lookup/launch pad into a patient's clinical record. It is intentionally **not** a contact directory — email/phone are withheld per the GDPR plan (`lib/api/doctor-api.ts:190-198`).

## 3. Primary Doctor Tasks (priority order)
1. Find a specific patient by name (search).
2. Scan recent/frequent patients to decide who to open next.
3. Open a patient's record to review history before/after a consultation.

## 4. Clinical/Operational Importance
Medium-high. Not a live clinical action page itself (no vitals, no notes are entered here), but it's the entry ramp to the clinical record (07). A slow or confusing list here delays chart review before appointments.

## 5. Current Page Structure (top-to-bottom)
1. `ComplianceBanner` (shared layout, not page-owned) — 2FA/confidentiality nudge, dismissible per session
2. `PageHeader` — eyebrow "PATIENT RECORDS", title "My patients", description
3. `AdminSummaryStrip` — 3 stat cards: Patients / Bookings / Markets
4. Filter card — single "Patient name" search input + Apply + (conditional) Reset
5. Table/card list (`ColumnPriorityTable`) — Patient, Country, First seen, Bookings, Open

## 6. Current Container Hierarchy
```
page
└─ ComplianceBanner (gh-admin-card)              [shared layout surface]
└─ PageHeader                                    [no card — text block]
└─ AdminSummaryStrip (3× stat card)               level 1
└─ gh-card gh-doctor-filter-card (p-4)             level 1
   └─ form (no nested surface)
└─ gh-card gh-doctor-table-card (p-0)              level 1
   └─ table (no nested surface — confirmed via computed-style crawl:
      surface depth from a table cell to <body> = 1)
```
Verified via `page.evaluate` surface-crawl (border/shadow/background test) from a table row up to `<body>`: **depth 1** (only `.gh-doctor-table-card`). Container hierarchy on this page is already flat — no nested cards inside cards. Nothing to flatten here.

## 7. Interaction Inventory
| Element | Type | Action | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Patient name" input | text input | type + Apply | server-side `?q=` filter, client-side substring match on `fullName` only | Search matches name only — no country/GHN search; acceptable per code comment (email hidden by design) | 06-patients-laptop-default-01.png |
| Apply button | submit | submits form | reloads with `?q=` | none | — |
| Reset link | link | visible only when `q` set | returns to `/doctor/patients` | none | — |
| Row "Open" link (desktop) | link | navigate | → `/doctor/patients/[email]` | none | 06-patients-desktop-default-01.png |
| "Open patient record" (mobile card) | link/button | navigate | → `/doctor/patients/[email]` | none | 06-patients-mobile-full-01.png |
| Column headers | static | none | not sortable (Bookings/First seen are not clickable) | Medium — see §11 | — |
| Dismiss (×) on compliance banner | button | dismiss | hides banner for session (sessionStorage) | shared-layout, not page-owned; see §10 | — |

## 8. Page States Tested
| State | Browser | Code | Result | Issue |
|---|---|---|---|---|
| Default/populated (5 patients) | ✅ | — | renders table (desktop) / cards (mobile) correctly | none |
| Search with match | ✅ (`?q=` reload verified in code path) | — | filters by name, stat strip hint changes to "N matching" | none |
| Search — no match | code-derived | `page.tsx:161-164` | shows `d.patients.emptySearch` in a dashed empty-state card | not verified in browser (no non-matching term tried, low risk) |
| Empty (zero patients) | code-derived | `page.tsx:161-164` | shows `d.patients.emptyNone` | not triggered — would require a doctor account with 0 patients |
| API error (`result.ok === false`) | code-derived | `page.tsx:155-160` | shows `result.message` in a warning card; stat strip and filter card are also suppressed (`result.ok ? ... : null` at line 107) | not triggered |
| Loading | code-derived | `loading.tsx` exists | Next.js route-level skeleton | not screenshotted (RSC resolves in one server round trip, hard to catch client-side) |

## 9. Screenshots
All under `docs/portal-audits/doctor/screenshots/06-patients/`.
| File | Viewport | State | Reason | Issues shown |
|---|---|---|---|---|
| 06-patients-desktop-default-01.png | 1440×900 | default | matrix | none |
| 06-patients-laptop-default-01.png | 1280×720 | default | matrix | none |
| 06-patients-tabletl-default-01.png | 1024×768 | default | matrix | none |
| 06-patients-tabletp-default-01.png | 768×1024 | default | matrix | card-mode kicks in |
| 06-patients-mobile-default-01.png | 390×844 | default (above fold) | matrix | 06-001, breadcrumb truncation |
| 06-patients-mobile-full-01.png | 390×844 | default, full page | scroll-to-content evidence | 06-001 |
| 06-patients-smobile-default-01.png | 375×667 | default | matrix | 06-001 (worst case) |
| 06-patients-short-default-01.png | 1366×650 | default | short-viewport fold check | 06-001 |

## 10. UX Problems
**06-001 — High.** Compliance banner + hero header + 3 stat cards consume the entire first viewport on mobile/short screens, pushing the search box and patient list below the fold.
- Evidence: `06-patients-mobile-full-01.png` — on a 390×844 viewport the search input first becomes visible only after ~820px of scroll; the actual patient list starts past ~1000px. `06-patients-short-default-01.png` (1366×650) shows the same on a short laptop fold.
- Doctor impact: the doctor's #1 task on this page (find/open a patient) requires scrolling past three read-only stat tiles and a dismissible-but-recurring compliance nudge every session.
- Root cause: `ComplianceBanner` (`app/(doctor)/doctor/_components/compliance-banner.tsx`) is rendered unconditionally by the doctor layout above all page content when compliance is incomplete, and `page.tsx` stacks `PageHeader` + full `AdminSummaryStrip` + filter card before the list with no compact/collapsed variant for short viewports.
- Recommendation: on `sm`/short-height breakpoints, collapse `AdminSummaryStrip` to a single inline line (e.g. "5 patients · 15 bookings · 1 market") instead of 3 stacked cards, and/or move the search field to the `PageHeader` row (`right` slot exists on `FormSection`-style headers elsewhere) so it's above the fold even before stats.

**06-002 — Low.** Table columns (Country, First seen, Bookings) are not sortable.
- Evidence: code — `page.tsx:46-91`, `ColumnPriorityTable` fields have no `sortable`/`onSort` prop wired.
- Doctor impact: a doctor with more patients than the current 5-row test panel can't sort by "most bookings" or "most recent" — list order is fixed to whatever the backend returns (`firstSeen` desc, confirmed in `doctor.route.ts`).
- Recommendation: low priority while panels stay small (endpoint caps at 500 rows); revisit if `ColumnPriorityTable` gains generic sort support elsewhere first (avoid one-off sort logic here).

**06-003 — Low.** Breadcrumb truncates mid-word on mobile ("Doctor › Pa…") with no ellipsis or scroll affordance.
- Evidence: `06-patients-mobile-default-01.png`.
- Doctor impact: cosmetic only here (label is "Patients", non-sensitive) — see 07-001 for the same mechanism producing a PHI-adjacent leak on the record page.
- Recommendation: bundle with 07-001 fix (see below) — same component (`useBreadcrumbs` in `components/portal-shell.tsx`).

## 11. Visual Design Problems
- Each `AdminSummaryStrip` tile carries an identical generic bar-chart icon (📊) regardless of what it represents (Patients/Bookings/Markets) — decorative, not informative. Not a "remove the strip" case (owner keeps stat strips per brief), just flag the icon as non-differentiating. Low priority.
- No other border/shadow/radius overuse — this page is already close to the target flat hierarchy (§6).

## 12. Information Hierarchy Problems
- None severe. Patient name is the correct `cardPrimary`/priority-1 column; Country/First seen/Bookings are appropriately secondary; "Open" is the clear terminal action. The one gap is search only covering name (see §21 microcopy) which is a deliberate GDPR tradeoff, not an oversight — no change recommended.

## 13. Current Section Order
1. Compliance banner (shared)
2. Header
3. Stat strip
4. Filter/search
5. List

## 14. Recommended Section Order
Unchanged for desktop. For mobile/short only: **Header (compact) → Search → Stat strip (collapsed to one line) → List**, so the actionable control (search) and the list are reachable without scrolling past 3 stat cards. Reasoning: task priority (§3) puts "find a patient" above "see aggregate counts" — the stats are context, not the task.

## 15. Tabs/Steps/Sectioning Recommendation
Not needed. This is a single-purpose list page; a tab system would be over-structuring a 5-field page.

## 16. Save & Finalization Recommendation
N/A — no editable state on this page (search is idempotent, `Apply`/`Reset` are the only "commits" and both are clear single-purpose buttons already).

## 17. Proposed Page Structure (exact top-to-bottom)
1. Compliance banner (unchanged, shared)
2. `PageHeader` (title + description), with search field moved into the header's action slot on `<768px` widths
3. `AdminSummaryStrip` — full 3-card at ≥768px; single-line compact summary below 768px or when viewport height <700px
4. List (`ColumnPriorityTable`, unchanged)

## 18. Proposed Container Simplification
- **Keep:** filter card, table card, stat strip (per brief — don't recommend wholesale stat-strip removal).
- **Flatten:** none needed — already flat (§6).
- **Move:** search input into the header row at narrow/short viewports only (CSS/markup reorder, not a new component).
- **No new cards, no new nesting.**

## 19. Responsive Findings
| Viewport | Finding |
|---|---|
| desktop 1440 | Clean, table mode, no issues |
| laptop 1280 | Clean, table mode |
| tabletl 1024 | Clean, table mode |
| tabletp 768 | Switches to card mode; fine |
| mobile 390 | 06-001 (fold), 06-003 (breadcrumb truncation) |
| smobile 375 | 06-001, worse — search + list start even further down |
| short 1366×650 | 06-001 — same content order, height-constrained; stats + banner alone exceed 650px |

## 20. Accessibility Findings
- Search input is properly wrapped in a `<label>` (verified via `page.evaluate`: `hasLabelWrap: true`), not just a placeholder — good, no fix needed.
- Heading structure: only one `<h1>` ("My patients") on the page; eyebrow/stat labels are styled `<span>`/`<div>`, not headings — acceptable for a page this simple, no orphaned heading levels.
- Keyboard tab order (verified via `Tab` walk): skip-link → nav items in visual order → main content; nav links show `outline: none` computed but have a custom `:focus-visible` box-shadow ring defined in `portal.css:4290` — not a missing-focus-indicator bug, just non-native styling (confirmed intentional design system pattern).
- Muted text contrast spot-check: `rgb(109,109,109)` on white ⇒ **5.17:1**, passes WCAG AA (4.5:1) for normal text. No contrast issue found.
- Row "Open" links have no `aria-label` beyond visible "Open" text + patient name is in the same row — acceptable (row context provides the accessible name via table semantics), not flagged.

## 21. Content & Microcopy Findings
| Current | Recommended | Reason |
|---|---|---|
| "Open" (row action) | Keep, but consider "Open record" on desktop too (mobile card already says "Open patient record") | Consistency between the two density modes — currently desktop says bare "Open", mobile says "Open patient record" for the identical action |
| Stat hint "Visible in your panel" | Keep — clear | — |
| Search placeholder "Patient name" | Keep — accurately scopes what's searchable | — |

## 22. Component & Code Impact
| Component | Path | Change | Shared? | Risk | Complexity |
|---|---|---|---|---|---|
| Patients list page | `frontend/app/(doctor)/doctor/patients/page.tsx` | Reorder header/search/stats at narrow breakpoints; align "Open" label with mobile card copy | No (page-only) | Low | Small |
| `AdminSummaryStrip` | `components/portal-atoms.tsx` | Add optional compact/inline rendering mode for narrow or short viewports | Yes — used across admin/doctor portals | Medium (must not change other consumers' default look) | Medium |
| `useBreadcrumbs` | `components/portal-shell.tsx:86-108` | Truncate with ellipsis/scroll rather than hard cut mid-word (bundle with 07-001) | Yes — shell-wide | Low | Small |

## 23. Backend or Business-Logic Impact
Frontend-only for every finding on this page. No API/schema change needed.

## 24. Recommended Implementation Order
1. 06-003 / breadcrumb truncation fix (shared component, do together with 07-001 — see that file, it's the higher-severity twin of this bug).
2. 06-001 fold fix (compact stat strip + header search on narrow/short viewports).
3. 06-002 sortable columns (defer — low value at current panel sizes).

## 25. Acceptance Criteria (measurable)
- On a 390×844 viewport, the search input is visible within the first 700px of scroll (currently ~820px).
- On a 1366×650 viewport, at least the first patient row is visible without scrolling.
- `AdminSummaryStrip` compact mode renders all 3 values in one row ≤ 60px tall on mobile.
- No change to desktop/laptop/tabletl rendering (regression check via existing matrix screenshots).

## 26. Open Questions
- Is the compliance-banner dismissal intentionally per-session (not persisted server-side)? Confirmed in code (`sessionStorage`, `compliance-banner.tsx:9-15`) — flagging for Fable/product awareness since it recurs on every page in the doctor portal, not just this one; not treated as a bug to fix on this page alone.
- Any plan to let doctors search by country or GHN, or is name-only intentional long-term (GDPR)? Treated as intentional per code comment — confirm before changing.
