# Portal UI Audit — Admin, Doctor, Patient/Account, Corporate

Audit date: 2026-07-11 · Branch: Dev-hassaan · Audit scope: Portals (Audit 2 of 2)
Companions: [`LIST_AND_TABLE_INVENTORY.md`](./LIST_AND_TABLE_INVENTORY.md), [`PORTAL_OVERLAY_STACKING_INVENTORY.md`](./PORTAL_OVERLAY_STACKING_INVENTORY.md), [`DRAWER_ARCHITECTURE_PLAN.md`](./DRAWER_ARCHITECTURE_PLAN.md), shared docs in `../shared/`.

## Executive summary

The portals have strong bones: shared shells with correct `min-w-0` flex plumbing (admin-shell.tsx:474,667), a well-built accessible custom dialog (PortalDialog), a consistently applied desktop-table + `PortalMobileCard` dual pattern, genuinely shared calendar/messages components across doctor and patient, and a spec-backed dense type scale (DESIGN2.md §6.1). **Three systemic decisions produce almost all defects:**

1. **One blanket CSS rule** (`portal.css:5066-5082`, min-width 720px on every table) plus **one fixed switch breakpoint** (`portal.css:911-942`, cards below 760px) — creates a 761–1023px tablet band where every forced-wide table horizontally scrolls despite a working card layout existing, and forces 4-column tables to 720px for no reason. The orders table piles on a forced 1180px (portal.css:2412-2414), scrolling even on 1366px laptops.
2. **No portal-mounted overlays**: PortalDialog is `fixed` without `createPortal` (latent containing-block trap in a glass-heavy codebase), popovers/user-menus are hand-rolled absolute siblings, and sidebar/popovers share `z-40` inside the shell's `isolation:isolate` context so paint order is decided by DOM order (Z-C1).
3. **Dual-markup duplication**: ~20 lists hand-write the same fields twice (table + mobile card); corporate portal skipped the second copy entirely and ships table-only on phones.

Plus one outright bug: the audit-log table wrapper uses `overflow-hidden` where every sibling uses `overflow-x-auto`, silently clipping data.

## Scope & repository areas inspected

All of `frontend/app/(admin)/**`, `(doctor)/**`, `(auth)/account/**`, `(corporate)/**` incl. every `_components` dir (stub pages resolved: general-/specialist-consultations + online-prescriptions render `AdminServicesPage` with `forcedKind`; country-content/country-home are redirects). Shared: `portal-shell.tsx`, `admin-shell.tsx`, `portal-atoms` (AdminTable/Btn/Pill), `PortalDialog.tsx`, `PortalMobileCard.tsx`, `PortalTabs.tsx`, `NotificationPopover.tsx`, `DocumentRow.tsx`, `AppointmentCard.tsx`, calendar suite, `MessagesInbox.tsx`, chat components, `portal.css`, relevant `globals.css` rules. Static analysis only.

## Root causes (systemic)

| # | Root cause | Category | Evidence |
|---|-----------|----------|----------|
| R1 | Blanket table min-width + fixed card-switch breakpoint mismatch (761–1023px gap) | Table architecture, Container sizing, Inconsistent breakpoint | portal.css:5066-5082, 911-942; per-table forces 860–1180px |
| R2 | Column overload on flagship tables (orders 10 cols, corporate 8+7, doctors 8) with P3/P4 fields as permanent columns | Information density, Table architecture | admin-orders-table.tsx:226-343 etc. |
| R3 | Non-portalled overlay layer + shared z-40 inside `isolation:isolate` shell | Stacking context / z-axis failure, Portal mounting failure | PortalDialog portal.css:5203; Z-C1 portal-shell.tsx:232 vs :405 |
| R4 | Dual-markup table/card twins duplicating labels+formatting per route | Duplicate responsive markup | ~20 lists (inventory) |
| R5 | Corporate portal built as "admin-lite" without the mobile half of the pattern | Website/portal inconsistency | zero PortalMobileCard in (corporate)/** |
| R6 | One-off wrong overflow keyword | Clipping (overflow ancestor) | audit-log/page.tsx:324 |
| R7 | Sub-44px touch targets on core mobile workflows (32px icon actions, 24–28px calendar days) | Accessibility | globals.css:1758-1771; MonthCalendar.tsx:126; WeekCalendar.tsx:260 |
| R8 | Filter toolbars split between one proven CSS-grid pattern and ad-hoc fixed-min-width inputs | Filter overflow | good: portal.css:1247-1357; bad: blog/page.tsx:81-117, pages/page.tsx:101-146, requests/page.tsx:149 (no flex-wrap), employees/page.tsx:202 (w-56) |

## Global issues (severity register)

| ID | Severity | Category | Issue | Evidence |
|----|----------|----------|-------|----------|
| P-01 | **High** | Table architecture / Container sizing | 720px blanket min-width + 760px switch = tablet horizontal-scroll band across ~16 lists | portal.css:5066-5082, 911-942 |
| P-02 | **High** | Clipping | audit-log wrapper `overflow-hidden` clips wide content, no scroll access | audit-log/page.tsx:324 |
| P-03 | **High** | Table architecture / Horizontal overflow | Orders table forced 1180px — h-scroll on standard laptops; Meet/Payment/Invoice links are P3 columns | portal.css:2412-2414 |
| P-04 | **High** | Website/portal inconsistency / Information density | Corporate employees (6 col, 5 action forms per row) + requests (7 col) table-only on phones | employees/page.tsx:238-311, requests/page.tsx:176-229 |
| P-05 | Medium | Portal mounting failure | PortalDialog not a DOM portal — latent containing-block trap (10 consumers) | PortalDialog.tsx:75, portal.css:5200-5203 |
| P-06 | Medium | Stacking context | Z-C1 sidebar/popover z-40 tie resolved by DOM order inside isolate shell | portal-shell.tsx:232,405; portal.css:4112 |
| P-07 | Medium | Accessibility | Delete-account modal: no focus trap/restore; documents modal trap Unverified | delete-account-button.tsx:99-150; consultation-documents-modal.tsx |
| P-08 | Medium | Accessibility | Focus rings removed with no replacement: MessagesInbox search, rich-text toolbars ×2 files, country-picker items | MessagesInbox.tsx:125; rich-text-html-field.tsx:249-349; doctor-bio-rich-text-field.tsx:130-241; country-picker.tsx:84 |
| P-09 | Medium | Accessibility | Touch targets: 32px .gh-icon-btn row actions; 24–28px calendar day numbers; 28px user-menu trigger | globals.css:1758-1771; MonthCalendar.tsx:126; WeekCalendar.tsx:260; portal-shell.tsx:384 |
| P-10 | Medium | Filter overflow | Ad-hoc fixed-width filter inputs (blog 5×min-w-[140-180px], pages ×4); corporate requests form lacks flex-wrap | blog/page.tsx:81-117; pages/page.tsx:101-146; requests/page.tsx:149 |
| P-11 | Medium | Duplicate responsive markup | ~20 dual-markup lists; 6 admin lists hand-roll raw tables bypassing AdminTable | inventory T-04..T-08, T-20 |
| P-12 | Low-Medium | Information density | Doctor filter grids compress 5–6 controls into one row from `sm` (640px) | reports/page.tsx:62; appointments/page.tsx:157; invoices/page.tsx:191 |
| P-13 | Low-Medium | Long-content failure | Truncation without access path (emails etc.: FamilyPanel.tsx:374, admin-shell.tsx:611; majority of 38 truncate files lack title) | typography census |
| P-14 | Low | Grid failure | availability grid `lg:grid-cols-[1fr_360px]` missing minmax(0,1fr) (siblings correct) | availability-ui.tsx:205 |
| P-15 | Low-Medium | Typography | 9px badge (reschedule-picker.tsx:227); sub-spec micro sizes | typography census |
| P-16 | Low-Medium | Stacking | sonner toast z unreconciled vs modals | admin-shell.tsx:670-680 |

## Portal-specific notes

- **Admin**: model filter pattern exists (appointments filter grid, portal.css:1247-1357) — adopt everywhere. Appointments list itself is the portal's best list (card-first, E-pattern). AdminTable adoption incomplete (6 raw tables).
- **Doctor**: best column-priority practice already present (invoices `lg:table-cell` gating :275,284; history expand-rows). Documents review/send row can carry 6 buttons — overflow-menu candidate. Doctor works mobile (real usage): prioritize calendar tap targets.
- **Patient/account**: cleanest portal — card-first lists (bookings/orders/prescriptions/notifications/access-history all Pattern A, correct min-w-0). Main fixes: delete-account modal trap, payments dual tables → single config.
- **Corporate**: P-04. Also the only portal without localization of shell chrome (informational).

## Route-by-route findings (defect routes)

### Route: /admin/orders
**Scope**: Portal · **Files**: `admin/orders/_components/admin-orders-table.tsx:226-343`, `admin/orders/page.tsx`, `portal.css:2412-2414`
**Current structure**: 10-col AdminTable + PortalMobileCard twin; inline IconBtns + CopyLinkButton + PortalDialog.
**Reproduction**: Width ≤ ~1460px viewport (1380px shell max − 272px sidebar < 1180px forced table). Data: any orders. Failure: horizontal scroll on primary admin workflow even on desktop. Static-confirmed by arithmetic; runtime screenshot pending.
**Root cause**: forced `min-width:1180px` + P3/P4 fields (Meet link, Payment link, Invoice, Created) as permanent columns.
**Essential (P1/P2)**: Order #, Customer, Total, Status, Created(P2-desktop) · **Secondary (P3/P4)**: Country, Items detail, Meet/Payment/Invoice links.
**Pattern**: **B** (primary columns + drawer) — see drawer plan D-01.
**Container fixes**: drop the forced 2412 rule; per-table budget ≤ 960px.
**Layering**: row menu (if added) = portalled AppMenu; drawer at `--z-drawer`.
**Typography**: keep 13px cells (spec).
**A11y**: drawer focus per AppSheet spec; links keep names.
**Consistency**: first ColumnPriorityTable adoption target.
**Files to change**: admin-orders-table.tsx, portal.css:2412-2414, drawer primitive.
**Risk**: Medium (payments workflow — verify links & copy actions post-migration).
**Acceptance**: no table h-scroll ≥1280px; all links reachable ≤2 interactions; drawer deep-linkable (?order=); zero regression in /admin/orders/[id].

### Route: /admin/audit-log
**Scope**: Portal · **Files**: `audit-log/page.tsx:299-381`
**Reproduction**: container narrower than intrinsic table width (~800–900px w/ IP + metadata) → columns clipped, unreachable. **Root cause**: `overflow-hidden` on wrapper (:324) — sole deviation from sibling `overflow-x-auto`.
**Pattern**: **C**; auditing screen justifies eventual wide table + intentional h-scroll (register in Phase 8).
**Fix**: one-line overflow swap now; later column priority (When/Action/Actor P1; Entity P2; IP/Metadata P3 → expand-row already exists for diffs).
**Risk**: Low. **Acceptance**: full row content reachable via scroll at 768px.

### Route: /corporate/employees + /corporate/requests
**Scope**: Portal · **Files**: `employees/page.tsx:196-311`, `requests/page.tsx:149-229`
**Reproduction**: phone width — table-only (no card fallback anywhere in (corporate)); employees row holds 5 separate action `<form>`s in one cell; requests filter form has no flex-wrap (<360px overflow risk).
**Root cause**: R5 (admin-lite build skipped the mobile half); toolbar R8.
**Essential**: Employee name, Email, Status, Beneficiaries / Request: Employee, Type, Status, Booked · **Secondary**: Department; Created/Expires; action cluster.
**Pattern**: **D** now (add PortalMobileCard), then **B** (drawer holds actions + invite timestamps + beneficiary summary — drawer plan D-04).
**Container fixes**: add flex-wrap (:149); remove redundant nested overflow-x-auto (:238); search w-56 → minmax.
**Risk**: Medium (employer-facing workflows; permissions per-action forms must survive unchanged).
**Acceptance**: employees/requests fully operable at 320–430px without h-scroll; all 5 actions reachable; forms post identically.

### Route: /admin/patients, /admin/users, /admin/invoices, /admin/doctors (B/C-pattern group)
**Scope**: Portal · Reproduction: 761–1023px h-scroll (P-01) + forced widths 820–920px.
**Pattern**: B for patients/users/invoices (drawer plan D-02/D-03/D-05); C for doctors (hide Languages/Consult-type first, keep detail page).
**PHI note (patients)**: drawer content must run through the same access-gates as the detail page (ADMIN_PHI_REQUIRE_REASON flow, phi-reason-gate) — no PHI in the list payload that isn't already there. Healthcare data privacy is a hard constraint.
**Risk**: Medium-High (PHI) — patients migrates late (Phase 4) after the pattern is proven on users.

### Route: /doctor + /account shared components
Fixes: availability grid minmax (P-14); documents-panel action overflow menu (T-30); calendar/icon tap targets (P-09); MessagesInbox focus ring (P-08); delete-account modal migration (P-07); payments/doctor tables to single-config D. All Low/Medium, each independently shippable.

## Zoom-related findings
No anti-zoom mechanisms (verified). Dense fixed-px portal scale (10–14px) means 200% zoom relies fully on reflow: with P-01 fixed (container-driven card switch), zoomed portals fall into card mode naturally — this is the design intent to verify in Phase 0 baseline. Status: Unverified (runtime).

## Clipping & stacking findings
See PORTAL_OVERLAY_STACKING_INVENTORY.md — 17 entries; confirmed: P-02 clip, Z-C1 DOM-order tie, delete-account trap; latent: PortalDialog containing-block; unverified: sonner-vs-modal, manual-booking-form dropdowns.

## Accessibility findings
P-07/P-08/P-09 above; plus table semantics generally real `<table>/<th>` (26 files) — per-table scope/caption completeness Unverified; icon buttons aria-labeled where checked (IconBtn ariaLabel pattern); reduced motion fully handled; landmarks present in all three shells.

## Dependencies
P-01 unblocks most Medium items; drawer plan depends on AppSheet primitive (Phase 2); corporate fixes independent; one-line P-02 ships immediately.

## Verification
Static-only. Runtime matrix, screenshots and overlay assertions per implementation plan Phase 0. No runtime claim is made in this audit.
