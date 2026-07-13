# 14 — Orders (`/account/orders`)

## 1. Page Identification

- **Name:** My Orders
- **Route:** `account/orders`
- **Entry points:** Sidebar nav "My orders" (Billing group), dashboard/overview quick links, order-detail "Back to orders" link
- **Role:** Patient
- **Related frontend files:**
  - `frontend/app/(auth)/account/orders/page.tsx` (server component, full page)
  - `frontend/app/(auth)/account/orders/loading.tsx`
- **Shared components used:** `AdminCard`, `AdminEmptyState`, `AdminSummaryStrip`, `Btn`, `PageHeader`, `Pill`, `SectionHeader` (all re-exported from `frontend/app/(admin)/admin/_components/atoms.tsx` via `frontend/components/portal-atoms.ts`)
- **APIs observed (code-derived):** `fetchAccountOrders()` in `frontend/lib/api/cart-server.ts` → GET account orders list (server-side fetch, no client XHR visible in DevTools since page is server-rendered)
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop (1440x900), laptop (1280x720), tabletl (1024x768), tabletp (768x1024), mobile (390x844), smobile (375x667), short (1366x650)

## 2. Page Purpose

List every health-test and online-prescription order the patient has placed (checkout/cart-originated purchases), with status and total, and let the patient open any order for detail or reorder. Explicitly excludes consultation bookings, which live under "My bookings" — stated in the page subtitle.

## 3. Primary User Tasks (priority order)

1. Check the status of a recent order (paid / pending / cancelled)
2. Open an order to see full details, items, shipping, tracking
3. Reorder a past purchase
4. Start a new order ("Order more")
5. Get a sense of total spend / order count (secondary, stat-strip)

## 4. Current Page Structure (top-to-bottom)

1. Breadcrumb ("Account › Orders") — global portal chrome, not page-owned
2. `PageHeader`: eyebrow "Account", H1 "My orders", description "Health tests + online prescriptions you've ordered. Consultation bookings live under 'My bookings'."
3. `AdminSummaryStrip` — 4 stat cards: Orders (count), Paid (count), Pending (count), Total (sum, formatted price)
4. `AdminCard` (padding 0) wrapping the whole list:
   - `SectionHeader`: title "Order history" (icon + text) + right-aligned "Order more" primary button
   - `div.p-5` → `ul` of order rows (divide-y), each row: order id (`#ORD-000NNN`), status icon, "N item(s)", date, status `Pill`, price, "Open" button with chevron
   - Empty state (`AdminEmptyState`) if zero orders

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
.gh-patient-page.gh-patient-orders-page
├─ header.gh-portal-page-header               [necessary — page identity]
├─ section.gh-admin-summary-strip             [4x stat-card grid]
│   └─ div.gh-admin-summary-item ×4           [CARD — see 14-001]
├─ div.gh-admin-card (padding:0)              [OUTER CARD — wraps entire list]
│   ├─ div.gh-portal-section-header           [title + CTA row]
│   └─ div.p-5                                [inner padding wrapper]
│       └─ ul.divide-y                        [order rows — plain list, correctly NOT cards]
│           └─ li.gh-patient-list-row ×14     [flex row]
```

The `.gh-admin-card` wrapping the list plus its own `.p-5` inner padding is the only structurally redundant layer (padding declared twice: once implicitly by the card's 0-padding override, once explicitly on the inner div) — functionally fine, but it means the list content sits inside two nested boxes for no visual reason since the list itself has no card treatment (it's `divide-y` rows, not per-row cards). Rows themselves are correctly plain list rows, not card-in-card.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Order more" button | Link button | Verified href | Points to `/` (homepage), not a booking/shop deep link | Vague destination for a billing-context CTA | `14-orders-desktop-default-01.png` |
| Order row "Open" button | Link | Clicked-equivalent (href extraction) | Navigates to `/account/orders/<id>` | none | `14-orders-desktop-default-01.png` |
| Order row hover | Hover | Hovered first row | No visible hover affordance beyond default row styling (no background shift observed) | Weak affordance that row is not itself clickable but a discrete button is | `14-orders-desktop-row-hover-01.png` |
| Tab key traversal | Keyboard | 3x Tab from page load | Focus lands on left-nav "Book consultation" link before reaching page content | Sidebar nav intercepts tab order before main content; no skip-to-content link | code-derived + interaction log |
| Status pill text | Static | Visual check | Lowercased raw enum values shown verbatim: "cancelled", "paid", "pending" | Acceptable but terse; see microcopy | `14-orders-desktop-default-02.png` |
| Stat-strip icon badges | Static | Visual check | All 4 cards (Orders/Paid/Pending/Total) render the identical `BarChart3` icon — no per-stat icon passed | Icons carry zero differentiating meaning | `14-orders-desktop-default-01.png` |

## 7. Screenshots

| Filename | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `14-orders-desktop-default-01.png` | 1440x900 | default | Full page, top | 14-001, 14-002, 14-005 |
| `14-orders-desktop-default-02.png` | 1440x900 | scrolled | Full order list (14 rows) | 14-003 |
| `14-orders-mobile-default-01.png` | 390x844 | default | Stat-strip stacking | 14-001 |
| `14-orders-short-default-01.png` | 1366x650 | default | Short-viewport clipping check | 14-004 |
| `14-orders-desktop-row-hover-01.png` | 1440x900 | row hover | Hover affordance check | 14-006 |

## 8. UX Problems

### 14-001 — Four full stat cards for numbers that duplicate the list below
- **Severity:** Medium
- **Category:** Card overuse / information hierarchy
- **Browser evidence:** `14-orders-desktop-default-01.png`, `14-orders-mobile-default-01.png`
- **User impact:** On mobile the 4 stacked stat cards (Orders/Paid/Pending/Total) push the actual order list ~600px down the page, below the fold, before the patient sees a single order. On desktop they consume a full row of vertical rhythm for numbers ("14", "9", "2", "€497") that are trivially re-derivable from the list underneath.
- **Root cause:** `AdminSummaryStrip` (admin-dashboard pattern) reused verbatim on a page whose entire purpose is a single list — this pattern fits a dashboard with multiple unrelated data sources, not a one-list utility page.
- **Recommended resolution:** Replace the 4-card strip with a single inline meta line under the page description, e.g. "14 orders · 9 paid · 2 pending · €497 total" as plain text/dividers (`gh-portal-meta-row` style, no cards), matching the density of a billing/history page. Keep cards only where a stat is itself a distinct navigable entity.

### 14-002 — Redundant AdminCard wrapper around a plain list
- **Severity:** Low
- **Category:** Card overuse / nesting
- **Browser evidence:** `14-orders-desktop-default-01.png`
- **User impact:** No visible harm, but the card-in-card structure (`AdminCard` padding:0 → `SectionHeader` → `div.p-5` → `ul`) adds a full extra DOM/style layer for a section that is functionally a table.
- **Root cause:** `AdminCard` used as a generic section wrapper rather than reserved for genuinely card-like, non-tabular content.
- **Recommended resolution:** Keep the single outer surface but drop the inner `p-5` div — apply padding directly to the `ul`/`SectionHeader`, one container instead of two.

### 14-003 — Order list is a card-styled `<ul>` where a table would communicate columns better
- **Severity:** Low
- **Category:** List presentation
- **Browser evidence:** `14-orders-desktop-default-02.png`
- **User impact:** On desktop, order id / item count / date / status / price are wrapped onto one flexible line per row with no column alignment — prices and statuses don't line up vertically, making the list harder to scan than a table with fixed columns (which is exactly what `ColumnPriorityTable` — used one page over on `account/payments` — already solves).
- **Root cause:** Orders page pre-dates or wasn't migrated to `ColumnPriorityTable` (per project CLAUDE.md, this is the designated shared primitive for exactly this list/table pattern) while Payments was.
- **Recommended resolution:** Migrate to `ColumnPriorityTable` with fields: Order # (priority 1, cardPrimary), Date (priority 2), Items (priority 2), Status (priority 2), Total (priority 2), Action (priority 2, desktopOnly false — mobile card action). This also gets the mobile `PortalMobileCard` fallback for free instead of the current wrapped-flex row.

### 14-004 — Short-viewport (1366x650): stat strip pushes list to the fold, no clipping but poor first-screen usefulness
- **Severity:** Low
- **Category:** Space misuse / short-height viewport
- **Browser evidence:** `14-orders-short-default-01.png`
- **User impact:** At 650px height, only the page header + 4 stat cards are visible; zero order rows are visible without scrolling. No content is clipped/cut off, but the first thing a laptop-with-small-window user sees is 4 numbers, not their actual orders.
- **Root cause:** Same as 14-001 — stat strip height budget crowds the primary task out of the initial viewport.
- **Recommended resolution:** Same fix as 14-001 (inline meta line) directly recovers ~140px of vertical space, putting 2-3 order rows in view at 650px height.

### 14-005 — Identical icon on every stat card
- **Severity:** Low
- **Category:** Visual design / microcopy
- **Browser evidence:** `14-orders-desktop-default-01.png`
- **User impact:** All 4 stat cards (Orders, Paid, Pending, Total) show the same green bar-chart glyph — no icon differentiates a count from a currency total from a status count, reducing the icon to pure decoration.
- **Root cause:** `AdminSummaryStrip` items array (page.tsx lines 43-48) doesn't pass a per-item `icon`; component falls back to default `<BarChart3 />` for all four.
- **Recommended resolution:** Either pass distinct icons (`ShoppingBag`, `CheckCircle2`, `Clock`, `Wallet`/currency icon — several already imported on this page) per stat, or remove the icon badge entirely if the stat strip is kept.

### 14-006 — No hover/focus affordance on order rows despite the whole row reading as clickable
- **Severity:** Low
- **Category:** Interaction feedback
- **Browser evidence:** `14-orders-desktop-row-hover-01.png`
- **User impact:** Only the "Open" button is interactive per row, but the row's visual weight (order id, status, price, all left-aligned with a button on the right) reads like a clickable list item. Hovering anywhere but the button gives no feedback, so a user may click on it expecting navigation and get nothing.
- **Root cause:** `li.gh-patient-list-row` has no `onClick`/link wrapping the full row, only the trailing `Btn`.
- **Recommended resolution:** Either make the full row a link (common list pattern, larger hit target — good for mobile too) or add a subtle row-hover background to signal only the button is actionable.

## 9. Visual Design Problems

- Status pills use ad hoc tone mapping (`statusTone()` in page.tsx) duplicated identically in `orders/[id]/page.tsx` — same function, same 5 lines, copy-pasted rather than shared (code hygiene, not user-visible, noted under Component/Code Impact).
- Row status icon (`CheckCircle2`/`Clock`, emerald/amber) sits directly next to the `Pill` which repeats the same status semantically with color+text — icon and pill say the same thing twice per row (`14-orders-desktop-default-02.png`).

## 10. Information Hierarchy Problems

- The 4 stat cards are visually the heaviest thing on the page (large bold numbers, bordered cards, colored top bar) yet convey the least-actionable information; the actual order list is comparatively plain. Primary-task content (the list) should outweigh secondary summary data. See 14-001.

## 11. Section Ordering Review

**Current order:**
1. Page header
2. Stat strip (4 cards)
3. Order history list

**Recommended order:**
1. Page header — unchanged, sets context
2. Order history list — promote above the fold; this is the entire reason for the page
3. Inline meta line (replacing the stat-card strip) — either directly under the header as a one-line summary, or removed to a details/overview page where a dashboard-style rollup belongs

**Reasoning:** The page has exactly one primary task (review/open orders). Nothing about "Pending: 2" earns a full card and a 25%-of-viewport claim ahead of the list it summarizes.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — single flat list, no tabs/steps warranted. If order volume grows materially, add a status filter (dropdown or segmented control: All / Paid / Pending / Cancelled) next to "Order history" using `AppMenu`, not a new page section.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Inline meta row: `"14 orders · 9 paid · 2 pending · €497 total"` styled as small caps/muted text with mid-dot separators, directly under the header description
3. Single surface: `SectionHeader` ("Order history" + "Order more" CTA) + `ColumnPriorityTable` (Order #, Date, Items, Status, Total, Open) — one container, no nested padding div
4. Empty state unchanged (already correct — icon, asset, title, description, CTA)

## 14. Proposed Container Simplification

| Current | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` (4 cards) | Remove | Replace with plain inline text row |
| Outer `AdminCard` + inner `div.p-5` | Flatten | Collapse to one container; padding applied once |
| `ul.divide-y` rows | Replace | `ColumnPriorityTable` (desktop table / mobile card via `PortalMobileCard`, per project primitive rules) |
| Row status icon + Pill (duplicate signal) | Remove one | Keep the `Pill` (text+color), drop the redundant `CheckCircle2`/`Clock` icon |

## 15. Responsive Findings

- **desktop/laptop (1440/1280):** Stat strip + list both render correctly; row content wraps acceptably at 1280 but item/date/status/price start crowding onto near-adjacent lines (`14-orders-laptop-default-01.png`).
- **tabletl (1024):** Same layout as desktop, no reflow issues observed.
- **tabletp (768x1024, portrait):** Stat strip drops to a 2-up or stacked grid (needs confirmation from `AdminSummaryStrip` CSS — not verified pixel-exact here, but no clipping observed in `14-orders-tabletp-default-01.png`).
- **mobile (390) / smobile (375):** Stat cards stack fully vertically (4 cards ≈ 600px) before the list starts — see 14-001/14-004. No horizontal scroll or clipping.
- **short (1366x650):** No content clipping, but zero order rows visible without scrolling — see 14-004.

## 16. Accessibility Findings

- **Heading outline:** `H1 "My orders"` → `H3 "Order history"` — skips H2 entirely (verified via DOM walk). Not a blocking issue alone, but establishes a pattern (also present on order-detail and payments pages) that should be fixed consistently: promote in-card `SectionHeader` titles to `H2` when they are the only sub-heading on the page.
- **Icon-only buttons:** none found without accessible text (chevron icons on "Open" buttons are decorative, accompanied by visible text) — pass.
- **Tab order:** Sidebar navigation items are reached before main content on a fresh Tab sequence (no skip-to-content link) — code-derived from interaction log, consistent with the shared `PortalShell`, not page-specific; worth fixing once at the shell level rather than per page.
- **Status conveyed by color:** `Pill` combines background color + text label (not color-only) — pass. Row leading icon (`CheckCircle2`/`Clock`) is `aria-hidden`, redundant with the text pill (see 14-003 visual note) but not an a11y failure since it's hidden from AT.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Open" (per-row button) | "View order" or "View #ORD-000137" | "Open" is generic; every list on the portal reuses it (per brief's known pattern) — task-specific label improves scanability for screen-reader users navigating by link text |
| "Order more" | "Order again" or "Start new order" | "More" is vague about what action follows; page already distinguishes reorder vs. new purchase elsewhere ("Reorder" button on detail page) — align verb |
| Status pill raw text: "cancelled" / "paid" / "pending" | Keep as-is | These are plain-English states, not jargon — acceptable |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Order list | `frontend/app/(auth)/account/orders/page.tsx` | Replace `ul.divide-y` with `ColumnPriorityTable` | Page-specific usage of shared primitive | Low — read-only list, no mutation | Medium |
| Stat strip | same file | Replace `AdminSummaryStrip` with inline meta text | Page-specific | Low | Low |
| `statusTone()` helper | duplicated in `orders/page.tsx` and `orders/[id]/page.tsx` | Extract to a shared util (e.g. `lib/format-order-status.ts`) | Shared | Low | Low |

## 19. Recommended Implementation Order

1. Extract shared `statusTone()` util (zero visual change, removes duplication)
2. Replace stat strip with inline meta row (isolated, low risk)
3. Migrate list to `ColumnPriorityTable` (moderate — needs field mapping + verifying mobile card output matches current row content)
4. Row-hover / full-row-link affordance (cosmetic polish, do last)

## 20. Acceptance Criteria

- [ ] At 1366x650, at least 3 order rows are visible without scrolling
- [ ] Stat-strip cards removed or replaced with a single-line summary occupying ≤ 40px height
- [ ] Order list renders as a table on desktop (≥1024px) with aligned columns for Order #, Date, Items, Status, Total
- [ ] Mobile list uses `PortalMobileCard` (via `ColumnPriorityTable`) instead of the current flex-wrap row
- [ ] Heading outline for the page is H1 → H2 (no skipped levels) once shell-wide fix lands
- [ ] No duplicated `statusTone()` implementations remain in the codebase

## 21. Open Questions

- Whether "Order more" should deep-link to `/book` (consultations) or a health-test/shop listing — current href is bare `/`; product intent for this CTA's destination could not be determined from code or browser alone.
- Whether a status filter is needed at current order volumes (14 orders for this test account) — real-world order counts per patient unknown; flagged as a "grows later" recommendation only.
