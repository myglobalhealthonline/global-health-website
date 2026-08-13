# 08 — Prescriptions

## 1. Page Identification

- **Name**: Prescriptions
- **Route**: `/account/prescriptions`
- **Entry points**: Patient sidebar → Care → "Prescriptions"; breadcrumb `Account > Prescriptions`
- **Role**: Patient (server component, session-gated by `(auth)` route group)
- **Related frontend files**:
  - `frontend/app/(auth)/account/prescriptions/page.tsx` (server component, only file for this route)
  - `frontend/app/(auth)/account/prescriptions/loading.tsx`
  - `frontend/lib/api/prescriptions-api.ts` (`fetchPatientPrescriptions`)
  - `frontend/lib/api/last-booking-country.ts` (`resolveBookConsultationHref`)
- **Shared components**: `PageHeader`, `AdminSummaryStrip`, `AdminCard`, `AdminEmptyState`, `SectionHeader`, `Btn`, `Pill` — all re-exported from `frontend/components/portal-atoms.ts` → canonical source `frontend/app/(admin)/admin/_components/atoms.tsx`
- **APIs observed**: Server-side fetch inside `fetchPatientPrescriptions()` (not visible on the network tab — SSR'd at request time); page is `export const dynamic = "force-dynamic"` so it always re-fetches.
- **Audit date**: 2026-07-12
- **Viewports tested**: desktop (1440×900), laptop (1280×720), tabletl (1024×768), tabletp (768×1024), mobile (390×844), smobile (375×667), short (1366×650)
- **Account data state**: This patient account currently has 0 doctor-issued prescriptions and 0 online prescription orders — every list on this page is genuinely empty (confirmed via the summary strip counts, all `0`, and no network 404/error — unlike page 09). Populated-list layout (`<ul>` item rows) is therefore **code-derived**, not screenshot-derived.

## 2. Page Purpose

Single destination for two distinct kinds of "prescription": (a) clinical prescriptions a doctor issued during a signed consultation (read-only), and (b) online prescription-product orders the patient purchased through checkout (has payment status). The page exists so a patient doesn't have to dig through booking history to find what medication was prescribed or ordered.

## 3. Primary User Tasks (priority order)

1. Check what a doctor prescribed after a recent consultation (drug, dose, instructions, refills).
2. Request a refill for a prescription that has refills remaining.
3. Check payment/fulfillment status of an online prescription order.
4. Jump back to the originating booking for either kind of record.
5. Start a new online prescription order.

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader` — eyebrow "Account", H1 "Prescriptions", one-line description.
2. `AdminSummaryStrip` — 4 stat cards: Doctor issued, Online orders, Paid orders, Needs action (all derived client-side counts of the same two arrays — no separate metric source).
3. Optional amber inline banner if the server fetch failed (`result.ok === false`) — not observed in this account (fetch succeeded).
4. `AdminCard` #1 "Issued by your doctor" — `SectionHeader` (title + hint) then either `AdminEmptyState` or a `<ul>` of prescription rows.
5. `AdminCard` #2 "Online orders" — `SectionHeader` (title + hint + "Order new" primary button on the right) then either `AdminEmptyState` or a `<ul>`/divide-y list of order rows.

No tabs, no filters, no pagination, no search — the whole page is two static read-only lists.

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
div.gh-patient-page.gh-patient-prescriptions-page
├── header.gh-portal-page-header (PageHeader)                     [necessary]
├── section.gh-admin-summary-strip (AdminSummaryStrip)            [necessary — but see §9]
│   └── div.gh-admin-summary-item × 4                             [necessary]
├── div (amber warning banner)                                    [conditional, not seen]
├── div.gh-admin-card.gh-card-jewel  ("Issued by your doctor")    [necessary — primary content container]
│   ├── div.gh-portal-section-header (SectionHeader)              [necessary]
│   └── div.p-5                                                   ← REDUNDANT wrapper: AdminCard already
│       └── AdminEmptyState  OR  ul.grid.gap-3                       accepts a `padding` prop; page passes
│           └── li.gh-patient-prescription-card                      padding=0 to AdminCard then re-adds
│               (border + bg-well + p-4)                             its own `div.p-5` — a card-inside-a-
│                                                                     card visually (rounded border+bg well
│                                                                     nested inside the white AdminCard)
├── div.gh-admin-card  ("Online orders")                          [necessary]
│   ├── div.gh-portal-section-header (SectionHeader, + "Order new" btn)
│   └── div.p-5                                                   ← same redundant wrapper pattern
│       └── AdminEmptyState  OR  ul.divide-y
│           └── li.gh-patient-list-row (no card treatment — good, plain divider row)
```

- **Unnecessary level**: `.gh-patient-prescription-card` (bordered, `bg-[var(--portal-well)]` panel) nested *inside* the already-white `AdminCard`. This is a card-in-a-card: the outer `AdminCard` provides the white surface + shadow + radius; each doctor-issued prescription then gets its *own* mini bordered card. The "Online orders" list right below solves the identical problem (list of records) with a plain `divide-y` row — no card. The two sections should use the same pattern.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "View booking" (empty state, Issued section) | Link button | Inspected href | `/account/bookings` | Generic destination — doesn't deep-link to any specific booking (there are none for this account, so acceptable when empty, but see code path for populated state) | `08-prescriptions-desktop-default-01.png` |
| "Order new" (Online orders header) | Link button | Inspected href | `/` (homepage) | Sends patient to the marketing homepage, not a filtered "prescription products" listing — same target as "Browse products →" in the empty state | `08-prescriptions-desktop-default-02.png` |
| "Browse products →" (empty state, Online orders) | Link button | Inspected href | `/` (homepage) | Duplicate CTA to the same destination as "Order new" above it (two buttons, one purpose) | `08-prescriptions-desktop-default-02.png` |
| Refill button (populated state) | Link button, code-derived | Not reachable (0 issued prescriptions) | N/A | `title` attribute says "Refills aren't one-click yet — this starts a new consultation booking so a doctor can approve the refill" but the visible label is just "Refill" with no visual cue it's not instant — misleading affordance. Code-derived from `page.tsx:129-138`. | N/A — code-derived |
| "Open" button per order row (populated state) | Link button, code-derived | Not reachable (0 orders) | N/A | Routes to `/account/bookings`, not to an order/appointment detail page — same generic destination regardless of which order was clicked. Code-derived from `page.tsx:209-216`. | N/A — code-derived |
| Heading structure | A11y probe | Playwright `h1..h6` walk | `H1: Prescriptions`, `H3: Issued by your doctor`, `H3: No prescriptions issued yet…`, `H3: Online orders`, `H3: No online prescription orders yet.` | No `H2` anywhere — jumps straight from H1 to four sibling H3s that mix section titles with empty-state messages at the same nominal level | N/A — Playwright console output |
| Keyboard focus order | A11y probe | Tab from body | Confirmed via code: all interactive elements are real `<a>`/`<button>` via `Btn`, no custom click-only divs | No issue found | N/A |

## 7. Screenshots

| File | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `08-prescriptions-desktop-default-01.png` | 1440×900 | Default (empty, top) | Baseline header + stat strip + empty "Issued" section | 08-001, 08-002 |
| `08-prescriptions-desktop-default-02.png` | 1440×900 | Default (empty, scrolled) | Both empty states + duplicate CTAs | 08-003 |
| `08-prescriptions-mobile-default-01.png` | 390×844 | Default (empty, top) | Stat strip stacks to 1 column on mobile | 08-002 |
| `08-prescriptions-short-default-01.png` | 1366×650 | Default, short viewport | Confirms stat strip + header consume ~440px before any task content is visible | 08-002 |

## 8. UX Problems

### 08-001 — Card-in-a-card for doctor-issued prescription rows
- **Severity**: Medium
- **Category**: Card overuse / container nesting
- **Browser evidence**: Code-derived (0 rows in this account) — `frontend/app/(auth)/account/prescriptions/page.tsx:90-92`
- **Screenshot**: N/A (code-derived; empty state shown in `08-prescriptions-desktop-default-01.png`)
- **User impact**: When prescriptions exist, each one renders inside its own bordered/filled panel *inside* the already-bordered white `AdminCard` — doubled visual framing competes with the "Online orders" list two sections below, which renders the equivalent record as a plain divider row. Inconsistent list treatment on the same page.
- **Root cause**: `li` in the "Issued by your doctor" `<ul>` carries `rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-4`; the "Online orders" `<ul>` correctly uses `divide-y` with no per-row card.
- **Recommended resolution**: Drop the border/bg/radius from `.gh-patient-prescription-card`; use the same `divide-y` + `py-3` row pattern as the online-orders list, keeping only the `Refill`/`View booking` buttons as trailing actions. Reserve card treatment for the two section containers, not for individual rows within them.

### 08-002 — Both AdminCard sections re-wrap with a redundant `p-5` div
- **Severity**: Low
- **Category**: Nesting / space misuse
- **Browser evidence**: Code-derived — `page.tsx:65,74,158,172` (`AdminCard padding={0}` then inner `<div className="p-5">`)
- **Screenshot**: `08-prescriptions-desktop-default-01.png`
- **User impact**: No visible defect today, but it's an unnecessary extra DOM wrapper doing what `AdminCard`'s own `padding` prop already does — makes the component harder to reason about and is the kind of pattern that drifts (e.g. someone changes `AdminCard`'s default padding and this page silently double-pads).
- **Root cause**: `AdminCard padding={0}` used purely to opt out of default padding so a custom `p-5` div can be substituted, instead of just passing `padding={20}` to `AdminCard` directly.
- **Recommended resolution**: Pass `padding={20}` (or the design token equivalent) to `AdminCard` directly and delete the inner `div.p-5` wrapper.

### 08-003 — Duplicate "browse products" CTA in Online Orders section
- **Severity**: Low
- **Category**: Microcopy / redundant action
- **Browser evidence**: `08-prescriptions-desktop-default-02.png`
- **User impact**: Two visually distinct buttons ("Order new" in the section header, "Browse products →" in the empty state body) both route to `/`, the marketing homepage — not a filtered product/prescription catalog. A patient clicking either expects to land somewhere prescription-specific and instead lands on the generic homepage, then has to re-navigate.
- **Root cause**: `page.tsx:167-169` (`Order new` → `/`) and `page.tsx:180-182` (`Browse products →` → `/`) — no dedicated prescription-products route exists to link to.
- **Recommended resolution**: Either deep-link both to an actual prescription-products landing/category page (if one exists site-wide) or, if none exists, keep a single CTA (drop "Order new" from the header when the list is empty — the empty-state action already covers it) instead of two buttons with identical destinations.

### 08-004 — Ambiguous "Refill" button hides that it starts a whole new booking
- **Severity**: Medium
- **Category**: Microcopy / user impact
- **Browser evidence**: Code-derived — `page.tsx:129-138`
- **Screenshot**: N/A (0 populated rows in this account)
- **User impact**: The button text is plain "Refill" with a refresh icon — reads as a one-click action. The real behavior (start a brand-new consultation booking for doctor approval) is only disclosed via a `title` tooltip, which is not discoverable on touch devices and easy to miss on desktop.
- **Root cause**: `page.tsx:135` — `title="Refills aren't one-click yet — this starts a new consultation booking..."` used as the only disclosure mechanism.
- **Recommended resolution**: Change the visible label to "Request refill" or "Book refill consultation" and drop the reliance on a hover-only tooltip for the actual behavior.

### 08-005 — Heading hierarchy skips H2, mixes section titles and empty-state copy at H3
- **Severity**: Low
- **Category**: Accessibility
- **Browser evidence**: Playwright heading walk — `H1: Prescriptions` → `H3: Issued by your doctor` → `H3: No prescriptions issued yet...` → `H3: Online orders` → `H3: No online prescription orders yet.`
- **User impact**: Screen-reader users navigating by heading level get a flat list of five same-level items after the page H1, with no way to distinguish "this is a section" from "this is a status message" by heading level alone.
- **Root cause**: `SectionHeader` (portal-atoms) renders its title as `<h3>`; `AdminEmptyState` also renders its title as `<h3>` — both consumed unchanged on this page. Shared across all portal pages using these two atoms (see also pages 09/10).
- **Recommended resolution**: Portal-wide fix in `atoms.tsx`: `SectionHeader` → `<h2>`, `AdminEmptyState` title → stays a paragraph or `<h3>` nested under its parent `SectionHeader`'s h2. Out of scope for a single-page fix; flag for the shared-component owner.

## 9. Visual Design Problems

- Four stat cards (`AdminSummaryStrip`) sit above two content sections that are *also* empty — for a first-time or low-activity patient, the page is dominated by "0 / 0 / 0 / 0" numerals before any real content or guidance appears. The stat strip earns its place once a patient has history, but for the empty-account default state it pushes the single actionable thing on the page ("View booking" / "Browse products") below the fold on `short` (1366×650) — confirmed in `08-prescriptions-short-default-01.png`, where only the header, stat strip, and the top of "Issued by your doctor" are visible with zero scroll.
- The four stat cards restate data already visible one glance below (Doctor issued=count of the list right under it; Online/Paid/Needs-action=derived slices of the second list) — for a page with only two lists and no filtering, the strip functions as a filter-less dashboard summary rather than a functional control (it's not clickable/filterable), which is more decoration than utility here (contrast with an admin list page where a stat strip often doubles as a quick filter).

## 10. Information Hierarchy Problems

- "Doctor issued" is the clinically primary task (task #1 in §3) but visually gets equal weight to the transactional "Online orders" section — same card size, same heading style, same position pattern. Nothing distinguishes "this is medical record data from a doctor" from "this is an e-commerce order history," even though the two have very different weight to a patient (one is medical guidance, the other is a receipt).
- The "Order new" primary-styled (green) button in the Online Orders `SectionHeader` visually outranks both section titles in saturation — on a page whose real primary task is reviewing existing prescriptions, the strongest visual pull is toward *starting a new purchase*, which is a secondary task (§3 priority 5).

## 11. Section Ordering Review

**Current order**: 1) Header 2) Stat strip 3) Issued by your doctor 4) Online orders.

**Recommended order**: unchanged — 1) Header 2) Issued by your doctor 3) Online orders 4) Stat strip (or drop the strip / demote it to inline counts in each section's `SectionHeader`).

**Reasoning**:
- Position 1 (Header): keep — orientation is always first.
- Move the stat strip to *last* or remove it: it is a summary of content the patient is about to read directly below; leading with four zero/low-signal numbers delays the primary task (reviewing prescriptions) and, on short viewports, pushes it off-screen. If kept at all, it's more useful as small inline counts inside each `SectionHeader` ("Issued by your doctor · 3") than as a standalone strip.
- "Issued by your doctor" before "Online orders": keep this order — clinical data outranks transactional data for a health portal, and it already matches current order.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — two clearly-scoped, always-visible sections work better than tabs here; the content volume per patient is low (few prescriptions/orders at a time), and a patient benefits from seeing both without an extra click. No change recommended to the sectioning model itself, only to the stat-strip position (§11) and per-row card treatment (§8, issue 08-001).

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged).
2. `AdminCard` "Issued by your doctor" — `SectionHeader` with inline count in the title (e.g. "Issued by your doctor (3)"), then `divide-y` row list (no per-row card) or `AdminEmptyState`.
3. `AdminCard` "Online orders" — `SectionHeader` with inline count + single "Order new" CTA (only shown when list is non-empty; empty state owns its own CTA), then `divide-y` row list or `AdminEmptyState`.
4. (Optional, only if product analytics show patients want it) A compact single-line summary at the very bottom: "X paid · Y pending" — not a 4-card strip.

## 14. Proposed Container Simplification

- `AdminSummaryStrip` (4 cards): **remove** from top position; either delete entirely or fold into `SectionHeader` inline counts (§13).
- `.gh-patient-prescription-card` bordered `<li>`: **flatten** to a plain `divide-y` row matching the online-orders list (remove border/bg/radius/padding-4, use `py-3` divider row like `.gh-patient-list-row`).
- Redundant `div.p-5` inside `AdminCard padding={0}`: **remove**; use `AdminCard padding={20}` directly.
- Two sections (`AdminCard` "Issued"/"Online orders"): **keep** as-is — this is the correct top-level structure.

## 15. Responsive Findings

- **desktop/laptop (1440/1280)**: Stat strip is a clean 4-up row; both sections render at full width with generous empty-state illustrations. No issues.
- **tabletl (1024)**: Same 4-up strip, comfortable. No issues.
- **tabletp (768)**: Layout holds; empty-state illustration and copy remain centered and legible.
- **mobile (390) / smobile (375)**: Stat strip collapses to a single column of 4 stacked cards (`08-prescriptions-mobile-default-01.png`) — on a 390px-wide screen this pushes the first content section ("Issued by your doctor") roughly 700px down, meaning a patient must scroll past ~4 stat cards before seeing any actionable content. Compounds §11's recommendation to de-prioritize the strip.
- **short (1366×650)**: Header + 4-card strip alone consume the entire visible viewport height before any scrolling (`08-prescriptions-short-default-01.png`) — a patient on a short/laptop-in-a-window viewport sees zero prescription content without scrolling on first paint.

## 16. Accessibility Findings

- Heading hierarchy skips H2 (see 08-005) — portal-wide, shared-component issue.
- All interactive elements (`Btn`) render as real `<a>`/`<button>` — no custom non-semantic click targets found; keyboard operability is sound by code inspection.
- Empty-state and stat-strip icons are correctly `aria-hidden` (`icon` props render with `aria-hidden` in `atoms.tsx`).
- "Refill" button's real behavior is disclosed only via the `title` attribute (hover tooltip) — not exposed to screen readers as part of the accessible name, and inaccessible to touch/keyboard-only users who don't trigger native title tooltips reliably. See 08-004.
- No `aria-live` region for the (currently unseen) amber "backend unavailable" banner — if the server fetch fails, the inline warning appears with no announcement to assistive tech. Code-derived from `page.tsx:58-62`.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Refill" (button label) | "Request refill" | Discloses that it's a request/booking flow, not instant, without relying on a tooltip (see 08-004). |
| "Open" (order row button) | "View order" or "View booking" | "Open" is a vague verb — "View" states the actual action (read-only navigation to booking). |
| "Order new" / "Browse products →" (two buttons, same destination) | Pick one; if kept as two, differentiate destinations (e.g., "Order new" → dedicated prescription-product catalog page) | Removes duplicate/confusing CTA (08-003). |
| "Needs action" (stat label) | Keep, but pair with a real action if this becomes clickable/filterable in the future — currently decorative. | N/A — flag only. |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Prescription row markup | `frontend/app/(auth)/account/prescriptions/page.tsx` | Remove `.gh-patient-prescription-card` border/bg, switch to `divide-y` row | Page-specific | Low | Small |
| `AdminCard` padding usage | `frontend/app/(auth)/account/prescriptions/page.tsx` | Replace `padding={0}` + inner `div.p-5` with `AdminCard padding={20}` | Page-specific | Low | Small |
| Refill button copy | `frontend/app/(auth)/account/prescriptions/page.tsx` | Change label text | Page-specific | Low | Trivial |
| Stat strip position/removal | `frontend/app/(auth)/account/prescriptions/page.tsx` | Move to bottom or fold into `SectionHeader` counts | Page-specific | Low | Small |
| `SectionHeader`/`AdminEmptyState` heading levels | `frontend/app/(admin)/admin/_components/atoms.tsx` | `<h3>` → `<h2>`/restructure | **Shared** (affects admin/doctor/patient portals) | Medium (touches every portal page using these atoms) | Medium — needs cross-portal regression pass |

## 19. Recommended Implementation Order

1. 08-004 (Refill label) — trivial, immediate clarity win.
2. 08-001 + 08-002 (row/card flattening) — page-scoped, low risk.
3. 08-003 (duplicate CTA) — needs a product decision on the actual target route first.
4. §11 stat-strip reposition — page-scoped, low risk, do after row cleanup so visual QA is on final layout.
5. 08-005 heading hierarchy — defer to a dedicated shared-component pass across all portals (not this page alone).

## 20. Acceptance Criteria

- [ ] Doctor-issued prescription rows render without their own border/background panel; visually match the `divide-y` row style used in Online Orders.
- [ ] No duplicate wrapper div between `AdminCard` and its content (`padding` prop used directly).
- [ ] "Refill" button's visible label communicates it starts a new booking (no information conveyed only via `title` tooltip).
- [ ] "Order new" and "Browse products" either point to different, product-specific destinations, or one of the two is removed.
- [ ] On a 1366×650 viewport, at least one prescription/order row (or its empty-state message) is visible without scrolling.
- [ ] Page passes an automated heading-order check with no level skipped (tracked as part of the shared-component fix, not blocking this page's other items).

## 21. Open Questions

- Is there a dedicated "prescription products" catalog/category page this site already has, that "Order new"/"Browse products" should link to instead of `/`? Could not determine from this page's code alone — needs product/IA confirmation.
- What does the populated (non-empty) state actually look like for "Issued by your doctor" with multiple prescriptions, several with refills > 0, at mobile width? Could not screenshot — this account has 0 records and creating test data is outside audit scope (no destructive/seed actions performed per brief).
