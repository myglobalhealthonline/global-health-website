# 15 — Order Details (`/account/orders/<id>`)

## 1. Page Identification

- **Name:** Order Detail
- **Route:** `account/orders/[id]` (e.g. `account/orders/cmrcz141m00019oju7xgrij7e`)
- **Entry points:** "Open" button on each row of `/account/orders`
- **Role:** Patient
- **Related frontend files:**
  - `frontend/app/(auth)/account/orders/[id]/page.tsx` (server component)
  - `frontend/app/(auth)/account/orders/[id]/_components/reorder-button.tsx` (client component)
- **Shared components used:** `AdminCard`, `AdminSummaryStrip`, `PageHeader`, `Pill`, `SectionHeader` (via `frontend/components/portal-atoms.ts`)
- **APIs observed (code-derived):** `fetchAccountOrder(id)` in `frontend/lib/api/cart-server.ts` (server-side fetch); client-side `useCart().add()` (via `CartContext`) invoked by the Reorder button, one call per reorderable line item
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop, laptop, tabletl, tabletp, mobile, smobile, short
- **Orders inspected for state coverage:** `ORD-000137` (cancelled/pending payment), `ORD-000074` (cancelled/failed payment), `ORD-000133` (pending fulfillment, paid, €0 health test), `ORD-000011` (pending fulfillment **and** pending payment, €39, unpaid) — this last one is the "needs action" case

## 2. Page Purpose

Show the full detail of a single order: items purchased, pricing breakdown, shipping address, contact info, payment status, and (if shipped) tracking. Secondary purpose: let the patient reorder the same items.

## 3. Primary User Tasks (priority order)

1. Confirm order status and what was ordered
2. **Resolve a payment problem, if one exists** (see 15-001 — this task has no path on this page)
3. Track a shipment, if applicable
4. Reorder
5. Verify shipping/contact details are correct

## 4. Current Page Structure (top-to-bottom)

1. "← Back to orders" link
2. `PageHeader`: eyebrow "Order #ORD-000NNN", H1 = price + status `Pill` inline, description "Placed on <date>"
3. `AdminSummaryStrip` — 4 cards: Status (fulfillment), Payment (payment status + paid date or "Awaiting confirmation"), Items (count), Total (price)
4. Two-column grid (`lg:grid-cols-[1fr_320px]`):
   - **Left (main):** `AdminCard` — "Items" `SectionHeader` + Reorder button → item list (name, kind, unit×qty, line total) → totals `dl` (Subtotal / Shipping / Total)
   - **Right (aside), stacked cards:**
     - Tracking card (conditional — only if `trackingNumber` present)
     - Shipping card (address or "No address on file")
     - Contact card (name, email, phone)
     - Payment card (status label, paid date)
     - "Care record" promo card (static informational, `PackageCheck` icon)

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
.gh-patient-page.gh-patient-order-detail-page
├─ a "Back to orders"                          [necessary]
├─ header.gh-portal-page-header                [necessary]
├─ section.gh-admin-summary-strip              [4x stat cards — DUPLICATES data below]
│   └─ div.gh-admin-summary-item ×4
├─ div.grid.lg:grid-cols-[1fr_320px]
│   ├─ div.gh-admin-card (padding:0)           [Items]
│   │   ├─ SectionHeader (title + Reorder btn)
│   │   └─ div.p-5
│   │       ├─ ul.divide-y (line items)
│   │       └─ dl (subtotal/shipping/total)
│   └─ aside.grid (self-start)
│       ├─ div.gh-admin-card [Tracking]        [conditional]
│       ├─ div.gh-admin-card [Shipping]
│       ├─ div.gh-admin-card [Contact]
│       ├─ div.gh-admin-card [Payment]         [REDUNDANT — repeats stat-strip Payment card]
│       └─ div.gh-admin-card [Care record promo] [decorative, static copy — no data]
```

Six separate `.gh-admin-card` surfaces are stacked on this page (Items + 4-5 sidebar cards), each with its own border/shadow/radius, for what is fundamentally one record with five attribute groups. The "Payment" stat-strip card and the sidebar "Payment" card show the *same field* (`order.paymentStatus`) twice in two different container styles two different amount of details — see 15-001.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| Order #ORD-000011 (pending order, €39, unpaid) | Page state | Navigated directly | Status pill "PENDING", Payment stat card "pending / Awaiting confirmation", sidebar Payment card "Status: PENDING" — **no button, link, or CTA anywhere on the page to pay** | Critical dead-end — see 15-001 | `15-order-details-pending3-desktop-default-01.png` |
| Order #ORD-000074 (cancelled order, failed payment) | Page state | Navigated directly | Payment stat card literally reads "failed" as the big value but the hint underneath still says "Awaiting confirmation" | Mismatched/stale hint text — see 15-002 | `15-order-details-pending-desktop-default-01.png` |
| "Reorder" button | Client button | Verified code path only (not clicked — would mutate live cart) | Adds each reorderable line to cart via `useCart().add()`, then `router.push('/cart')`; consultation-kind lines silently skipped (no healthTestId/serviceId) | No visible indication to the user that some items were skipped if the order mixed reorderable + non-reorderable lines | code-derived, `frontend/.../reorder-button.tsx` lines 39, 45-58 |
| Tracking link (`order.trackingUrl`) | External link | Not present on any inspected order (no tracking data seeded) | N/A | N/A — not testable this session | N/A |
| H1 heading text | Static | DOM heading walk | Renders as `"€45cancelled"` with no space/separator between price and status text in the accessible name | Broken screen-reader text — see 15-003 | code-derived |

## 7. Screenshots

| Filename | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `15-order-details-desktop-default-01.png` | 1440x900 | ORD-000137 (cancelled, pending payment) | Baseline layout | 15-001, 15-004 |
| `15-order-details-pending-desktop-default-01.png` | 1440x900 | ORD-000074 (cancelled, failed payment) | Mismatched hint text | 15-002 |
| `15-order-details-pending2-desktop-default-01.png` | 1440x900 | ORD-000133 (paid, €0 health test) | Confirms no false-positive dead-end on a genuinely resolved order | — |
| `15-order-details-pending3-desktop-default-01.png` | 1440x900 | **ORD-000011 — the "1 needs action" order** (unpaid, €39) | Proves no pay CTA exists | 15-001 |
| `15-order-details-mobile-default-01.png` | 390x844 | ORD-000137 | Mobile stacking of 4 stat cards before content | 15-004 |
| `15-order-details-short-default-01.png` | 1366x650 | ORD-000137 | Short-viewport check | 15-005 |

## 8. UX Problems

### 15-001 — Unpaid order has zero payment-completion path on its own detail page
- **Severity:** Critical
- **Category:** Forms / dead end / primary task
- **Browser evidence:** `15-order-details-pending3-desktop-default-01.png` (order `ORD-000011`, €39, payment status PENDING)
- **User impact:** A patient who placed a €39 prescription order that was never paid opens the order to resolve it and finds only read-only "Status: PENDING" text in two places (stat card + sidebar card). There is no "Pay now" / "Complete payment" button, no link to checkout, nothing actionable. The only interactive element on the entire page besides navigation is "Reorder" — which starts an entirely new cart rather than completing the existing unpaid order.
- **Root cause:** `orders/[id]/page.tsx` never renders a payment-action component for order-level payments. The portal does have a working "pay now" pattern (`PayNowButton` in `frontend/app/(auth)/account/payments/_components/pay-now-button.tsx`), but it's wired only to `appointmentId` (consultation payments), calling `GET /api/account/appointments/{id}/payment-url` — there is no equivalent endpoint/button for order (`orderId`) payments.
- **Recommended resolution:** Add an order-scoped payment-completion action. Minimum viable: if `order.paymentStatus` is `PENDING`/`FAILED`/`UNPAID` and `order.status !== 'CANCELLED'`, render a primary CTA in the Items `SectionHeader` (replacing/alongside Reorder) that resolves a checkout/payment URL for that order id and redirects, mirroring `PayNowButton`'s fetch-then-redirect pattern. Needs a backend endpoint (`/api/account/orders/{id}/payment-url` or equivalent) — flagged under Open Questions since this may already exist under a different name and simply isn't wired to this page.

### 15-002 — Payment "hint" text is hardcoded regardless of actual payment status
- **Severity:** Medium
- **Category:** Content accuracy
- **Browser evidence:** `15-order-details-pending-desktop-default-01.png` — big value reads "failed", hint underneath reads "Awaiting confirmation"
- **User impact:** A patient with a failed payment reads a stat card that says the payment is still "awaiting confirmation" directly under the word "failed" — contradictory and could lead them to believe no action is needed (it will just clear on its own) when in fact it won't.
- **Root cause:** `orders/[id]/page.tsx` line 58: `hint: order.paidAt ? formatAppDateTime(order.paidAt) : a.orders.awaitingConfirmation` — the hint only branches on whether `paidAt` is set, not on the actual `paymentStatus` value, so every non-paid status (PENDING, FAILED, CANCELLED, UNPAID) gets the same generic "awaiting confirmation" hint.
- **Recommended resolution:** Branch the hint per `order.paymentStatus`: PENDING → "Awaiting confirmation", FAILED → "Payment failed — retry needed", CANCELLED → "Payment not completed", etc.

### 15-003 — H1 concatenates price and status pill with no separation in the accessible name
- **Severity:** Medium
- **Category:** Accessibility
- **Browser evidence:** code-derived DOM walk — `outerText` of the H1 renders as `"€45cancelled"` (no space/comma)
- **User impact:** Screen-reader users hear "45 euros cancelled" run together with no pause, and sighted users relying on browser find-in-page or heading navigation (e.g. VoiceOver rotor "Headings" list) see a garbled label.
- **Root cause:** `PageHeader`'s `title` prop is passed a `<span>` containing `{formatPrice(...)}` immediately followed by `<Pill>` with no separating text/whitespace (`orders/[id]/page.tsx` lines 45-50).
- **Recommended resolution:** Add a visually-hidden separator or restructure so the price and status are two distinct phrases, e.g. `aria-label="€45, cancelled"` on the wrapping span, or simply add a comma + space between the price text node and the Pill.

### 15-004 — Same stat-strip duplication pattern as the orders list page, worse here (Payment shown twice)
- **Severity:** Medium
- **Category:** Card overuse / redundancy
- **Browser evidence:** `15-order-details-desktop-default-01.png` — "Payment: pending / Awaiting confirmation" stat card, then a separate "Payment" card in the sidebar reading "Status: PENDING"
- **User impact:** The same single field (`order.paymentStatus`) is rendered in two different visual containers on the same screen, in two different capitalization styles ("pending" vs "PENDING"), inviting the reader to wonder if they're different values.
- **Root cause:** `AdminSummaryStrip` includes a Payment item (line 58) AND a dedicated sidebar "Payment" `AdminCard` (lines 162-175) render the same underlying field independently.
- **Recommended resolution:** Keep one representation. Recommend keeping the stat-strip entry (visible above the fold, consistent with Status/Items/Total) and removing the sidebar Payment card, folding its `paidAt` detail into the stat card's hint (once 15-002 is fixed to be status-aware).

### 15-005 — Short-viewport (1366x650): no clipping, but six stacked cards force excessive scrolling to see all order attributes
- **Severity:** Low
- **Category:** Space misuse / short-height viewport
- **Browser evidence:** `15-order-details-short-default-01.png`
- **User impact:** At 650px height only the header + stat strip + top of the Items card are visible; Shipping/Contact/Payment/Care-record cards require multiple scrolls.
- **Root cause:** Six independent card surfaces each carry their own padding/margin overhead (see hierarchy in §5).
- **Recommended resolution:** Consolidate sidebar cards per 15-006.

### 15-006 — Five separate sidebar cards for what is one "order metadata" block
- **Severity:** Low
- **Category:** Card overuse / nesting
- **Browser evidence:** `15-order-details-desktop-default-01.png`
- **User impact:** Tracking, Shipping, Contact, Payment, and a static "Care record" promo are each wrapped in their own bordered/shadowed card, creating five visually equal-weight boxes for content of very different importance (an actionable tracking link vs. a static marketing blurb get identical visual treatment).
- **Root cause:** Every piece of secondary info defaults to `AdminCard` rather than being grouped into fewer, dividered sections.
- **Recommended resolution:** Merge Shipping + Contact + Payment into a single "Order info" card with three dividered sub-sections (labels + values), keep Tracking as its own card only when present (it's the one genuinely actionable item), and either demote the "Care record" promo to a plain text note or move it off this page entirely (it's static copy unrelated to this specific order).

## 9. Visual Design Problems

- The "Care record" promo card (`PackageCheck` icon, `bg-[var(--portal-well)]`) is the only card with a background tint different from the rest — inconsistent with its low informational priority (static marketing copy) getting the most visually distinct treatment on the page.
- Status `Pill` in the H1 and the identical-looking `Pill` in the stat strip use different visual weight (inline with large price text vs. small card value) for the same status — not wrong, just another instance of the same fact repeated a third time (H1 pill, stat-strip "Status" card, sidebar reference via fulfillment wording).

## 10. Information Hierarchy Problems

- Payment status (the thing most likely to require action) has no more visual prominence than Shipping or Contact — all five sidebar cards are equal-weight. For an order with a payment problem, "Payment" should visually outrank "Contact info" and "Shipping address" (see 15-001, 15-006).

## 11. Section Ordering Review

**Current order:**
1. Back link
2. Header (price + status)
3. Stat strip (Status / Payment / Items / Total)
4. Items + totals (left) / Tracking, Shipping, Contact, Payment, Care-record (right, in that order)

**Recommended order:**
1. Back link — unchanged
2. Header — unchanged
3. **Payment action banner** (new, conditional) — if payment is not resolved, a prominent inline banner/CTA sits directly under the header, above everything else: "Payment pending — Complete payment" with the fix from 15-001. This is the single highest-priority thing an order-detail page can surface.
4. Items + totals — unchanged position, still the core record
5. Consolidated "Order info" sidebar card (Shipping + Contact + Payment status, dividered) — replaces 3 separate cards
6. Tracking card — only when present, keeps its own card since it's actionable
7. Care-record promo — move to bottom or remove; it's the least page-specific content here

**Reasoning:** Surface the one task that requires action before anything else; consolidate read-only reference data; deprioritize static marketing content.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A — this is a single-record detail view, not a multi-section form; tabs would add navigation overhead for content that's already short enough to scroll.

## 13. Proposed Page Structure (exact top-to-bottom)

1. Back link
2. `PageHeader` (price + status, fixed per 15-003)
3. Conditional payment-action banner (15-001)
4. Two-column grid: Items+totals (left) / consolidated Order-info card + conditional Tracking card (right)
5. Care-record note (de-emphasized, bottom of right column or removed)

## 14. Proposed Container Simplification

| Current | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` Payment card | Remove | Superseded by payment-action banner when unresolved; keep Status/Items/Total only |
| Sidebar "Payment" card | Remove | Merge into consolidated Order-info card |
| Shipping card + Contact card | Merge | Single "Order info" card, two dividered sub-sections |
| Tracking card | Keep | Only genuinely actionable sidebar item |
| Care-record promo card | Downgrade | Plain text note, not a bordered/tinted card |

## 15. Responsive Findings

- **desktop/laptop:** Two-column grid holds at 1280px+; sidebar column (320px fixed) starts feeling cramped for the Contact card's email string at 1280 (`15-order-details-laptop-default-01.png` — no wrap failure observed, just tight).
- **tabletl (1024):** Grid likely collapses to single column per Tailwind `lg:` breakpoint (1024 is right at the boundary) — screenshot shows single-column stacking (`15-order-details-tabletl-default-01.png`), correct behavior.
- **tabletp/mobile/smobile:** Single column, all cards stack; no clipping observed.
- **short (1366x650):** No clipping, but see 15-005 for scroll-depth impact.

## 16. Accessibility Findings

- **Heading outline:** H1 → H3 (Items/Shipping/Contact/Payment all H3) — same skip-H2 pattern as the orders list page (see 14-audit §16); should be fixed once, consistently, likely at the `SectionHeader` component level (make it configurable H2 vs H3, default H2 when it's the page's first sub-heading).
- **H1 accessible name malformed:** see 15-003 — confirmed via DOM text extraction, not just visual.
- **Icon-only buttons:** none found without text.
- **Tracking link:** uses `target="_blank" rel="noopener noreferrer"` correctly (external link safety) but has no visible "opens in new tab" indication for screen-reader users beyond the icon-less external link — minor, not flagged as a defect since it's a tracking-carrier link pattern common across the industry.
- **Payment status conveyed via color+text pill** — pass, not color-only.

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| "Awaiting confirmation" (payment hint, all non-paid statuses) | Status-specific text per 15-002 | Currently misleading for FAILED/CANCELLED payments |
| "No address on file" | Keep | Clear, specific |
| Care-record card body (static promo copy) | Flag for content owner — not rewritten here (marketing copy, outside UX-audit scope) | Per brief: flag, don't rewrite |
| Sidebar "Payment" card duplicate label "Payment" (same as stat-strip label) | N/A after 15-006 merge | Resolved by removing the duplicate card |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Payment-action banner/CTA | `frontend/app/(auth)/account/orders/[id]/page.tsx` + new client component (pattern-match `pay-now-button.tsx`) | Add order-scoped pay CTA | Page-specific, may need new backend endpoint | **High** — touches payment flow, needs backend endpoint for order payment URL | Medium-High |
| Payment hint text | same file, line 58 | Branch hint by `paymentStatus` | Page-specific | Low | Low |
| H1 markup | same file, lines 45-50 | Add separator/aria-label | Page-specific | Low | Low |
| Sidebar cards | same file, lines 132-175 | Merge Shipping/Contact/Payment into one card | Page-specific | Low — display only | Medium |
| `statusTone()` | duplicated with `orders/page.tsx` | Extract shared util | Shared | Low | Low |

## 19. Recommended Implementation Order

1. Fix H1 accessible name (15-003) — trivial, no risk
2. Fix payment hint text (15-002) — trivial, no risk
3. Consolidate sidebar cards (15-006) — display-only refactor
4. Extract shared `statusTone()` util
5. **Confirm with backend/product whether an order-payment-resolution endpoint exists or must be built**, then implement the payment-action banner (15-001) — this is the one change with real risk/scope and should not be bundled with the low-risk cleanup above

## 20. Acceptance Criteria

- [ ] A patient with an unpaid order (payment status PENDING/FAILED/UNPAID, order not cancelled) sees an actionable "Complete payment" control on the order-detail page
- [ ] Payment hint text differs for PAID / PENDING / FAILED / CANCELLED / UNPAID states
- [ ] H1 accessible name for a cancelled €45 order reads as "€45, cancelled" (or equivalent, properly separated) via DOM text/aria-label inspection
- [ ] Sidebar reduced from 5 cards to at most 3 (Order info, Tracking [conditional], and one more only if justified)
- [ ] No `paymentStatus` value rendered in two separate containers on the same page

## 21. Open Questions

- Does a backend endpoint for order-level payment-URL resolution already exist under a name not surfaced in the frontend (e.g. reused checkout session logic), or does 15-001 require new backend work? Could not confirm from frontend code alone — needs backend/API inspection out of this audit's scope.
- Whether "Reorder" should also warn the user when it skips non-reorderable (consultation) lines from a mixed order — no order in the test account contained a mixed cart to observe this in the browser; flagged as code-derived only (`reorder-button.tsx` line 39 filters silently).
