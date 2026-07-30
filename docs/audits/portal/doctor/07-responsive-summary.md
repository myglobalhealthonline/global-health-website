# Responsive Summary — Doctor Portal Audit

Date: 2026-07-12. 7-viewport matrix: desktop 1440×900, laptop 1280×720, tabletl 1024×768, tabletp 768×1024, mobile 390×844, smobile 375×667, short 1366×650. Source: §19 Responsive Findings of each page file.

## Per-viewport failure table

### 1366×650 (short) — the dominant systemic failure across the portal

| Page | What's below the fold on load | Issue ID |
|---|---|---|
| 01 Dashboard | Rest of body below hero + start of stat row; low severity, no sticky trap | 19-002 |
| 02 Appointments | **Every appointment row** (hero + 4 stat cards + filter panel top consume the whole viewport) | 19-002 (evidence for 02-001) |
| 03 Appointment Details | Entire tab strip — compliance banner + header + 4 stat cards alone exceed 650px | IH-001 |
| 04 Calendar | **Entire month grid** — worst-case instance of CAL-04-001 | CAL-04-001 |
| 05 Availability | Sidebar (windows list + form + legend) requires internal scroll sooner than desktop; horizontal, not vertical, is the primary defect on this page | (§19 note) |
| 06 Patients | Search box + patient list — banner + stats alone exceed 650px | 06-001 |
| 07 Patient Record | **Zero clinical content** — banner + hero + 3 stat cards alone exceed 650px | (§19, ties to IH problem) |
| 08 Services | **Zero service cards** — worst case of 08-001 | 08-001 |
| 09 Forms | ~150px of scroll needed before "Your templates" section | (§19) |
| 10 Messages | Thread list visible but only ~2 rows before internal scroll — **acceptable**, list itself is a scroll container, not a page-level fold problem | — |
| 11 Notifications | List pushed below fold by hero+stats | (§11 note) |
| 12 Invoices | Entire consultation table | 12-003 |
| 13 Reports | 5-tile stat row + both breakdown tables | 13-003 |
| 14 Profile picker | Both cards above fold — **pass**, no issue | — |
| 15 Profile (country editor) | No editable field or the "Payout Missing" alert visible | 15-013 |
| 16 Security | **No fold issue** — page short enough that even the compliance banner + header + card all fit | — |
| 17 Confidentiality | No fold issue — content fits; the fixed-height text box actually matches this viewport reasonably well (unlike taller viewports, see below) | — |

**13 of 17 pages fail the short-viewport fold check to some degree; only 3 pages (Messages, Security, Confidentiality) genuinely pass, and Availability's is a horizontal- not vertical-space issue.** This is the single most consistent responsive finding in the audit and is the direct evidence for the fold-stacking rule in `04-cross-portal-design-system-findings.md` §1.

### 390×844 / 375×667 (mobile / smobile)

| Page | Finding | Issue ID |
|---|---|---|
| 01 Dashboard | Stacks correctly, no overflow; floating "N" widget overlaps sidebar footer branding | 19-001 |
| 02 Appointments | `PortalMobileCard`s render correctly (Type/Scheduled/Payment/Meeting meta grid); floating widget overlaps OPEN CONSULTS stat card value text; breadcrumb truncates to "Doctor › A" (single letter) | 19-001, 19-003 |
| 03 Appointment Details | 4 stacked stat cards push tabs below the fold; everything else reflows correctly, no horizontal overflow | VIS-003 |
| 04 Calendar | Grid not visible without scrolling; forms stack single-column correctly below it; smobile first-pass capture caught a hydration-timing loading-spinner artifact (flagged as flaky/untestable, not a bug) | — |
| 05 Availability | **Critical** — week grid clipped to Mon–Wed only, Thu–Sun columns rendered in DOM but visually cut off with **zero way to reach them** | 05-001 |
| 06 Patients | Search input first visible only after ~820px of scroll; list starts past ~1000px; breadcrumb truncation | 06-001, 06-003 |
| 07 Patient Record | 1-column stack; breadcrumb truncated to "Doctor › Pa…" (not yet reaching the PII leak at this width) | (07-001 context) |
| 08 Services | Cards correctly collapse to 1-col; stat strip pushes task content below fold | 08-001 |
| 09 Forms | Stacks correctly; breadcrumb truncates "Forms" → "Fo" | — |
| 10 Messages | Correctly collapses to single-pane with show/hide + back-arrow, confirmed working end-to-end | — |
| 11 Notifications | Content correct after paint; brief loading-splash flash requiring a longer capture wait on mobile (perf watch-item, not a bug) | 11-003 |
| 12 Invoices | Renders correctly; breadcrumb truncation | 12-005 |
| 13 Reports | Renders correctly; breadcrumb truncation | 13-004 |
| 14 Profile picker | 1-col stack, full-width tap targets ≥56px | — (pass) |
| 15 Profile (country editor) | Renders fine on retest; rich-text toolbar wraps to 2 rows, usable; no horizontal overflow. One matrix run caught an intermittent load failure ("Could not load doctor profile") that resolved on immediate retest | 15-012 |
| 16 Security | Breadcrumb truncates to "Se"; otherwise fully usable, backup-codes grid drops to `grid-cols-2` correctly | 16-002 |
| 17 Confidentiality | Breadcrumb truncation; text box scrolls normally via touch | (shared with 16-002) |

### Fold-stacking systemic cause

Every "short viewport" and most "mobile" failures trace to the same three-layer stack documented in `04-cross-portal-design-system-findings.md` §1: **compliance banner (conditional) → PageHeader hero → AdminSummaryStrip**, before any page-specific content. This is not 13 independent bugs — it is one systemic pattern with page-specific severity depending on how much additional chrome (filter panels, explainer cards) each page adds on top.

### Week-grid clip (shared `WeekCalendar`)

**05-001 (Critical)** is the only true horizontal-overflow defect found in this audit. Root cause: a CSS grid item ancestor of the `overflow-x-auto` wrapper lacks `min-w-0`, so per the CSS grid spec the item grows to fit its 720px content instead of shrinking to the available column — the intended horizontal scrollbar never appears because the wrapper never becomes narrower than its content; something upstream (`<main>`) clips it instead. This bug pattern is shared with the admin per-doctor availability editor (not independently verified in this audit pass — flagged as a required check) and does **not** reproduce on `/doctor/calendar`, which uses the separate `MonthCalendar` component.

### `PortalTabs` clip

**03/IH-001 (High)** — the Appointment Details 6-tab strip is clipped at the very bottom edge at 1366×650, with zero actionable content visible above it. This is the same `PortalTabs` component slated for reuse on Patient Record (07), Security (16), and Invoices (12) — the overflow fix must land before those adoptions, not after (see `05-shared-component-impact-map.md` §2).

### Floating "N" widget overlap

Observed on Dashboard (01) and Appointments (02) at mobile/smobile widths — a fixed-position circular support/help badge overlaps sidebar footer branding text on 01 and the OPEN CONSULTS stat-card value on 02. Source component not identified in this audit pass (flagged as an open question — see `09-open-questions-and-blockers.md`); likely a shell-wide z-index issue, not page-specific, since it reproduces identically on two unrelated pages.

### Breadcrumb truncation (mobile)

Reproduces on at least 9 of 17 pages at 390px/375px — see the portal-wide table in `06-accessibility-summary.md`. Ranges from cosmetic (Forms → "Fo") to a data-handling concern (Patient Record, where the same mechanism that truncates elsewhere fails to truncate the PII-bearing email segment before the leak becomes visible, 07-001).

## Pages with clean responsive behavior (no findings beyond breadcrumb truncation)

06 Patients (table→card mode switch clean at all breakpoints), 10 Messages (two-pane→single-pane collapse works end-to-end), 14 Profile picker (2-col→1-col holds cleanly, tap targets ≥56px), 16 Security (no fold issue, backup-codes grid responsive), 17 Confidentiality (no fold issue).
