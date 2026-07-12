# 16 — Payments (`/account/payments`)

## 1. Page Identification

- **Name:** Payments
- **Route:** `account/payments`
- **Entry points:** Sidebar nav "Payments" (Billing group); "View bookings" link from the empty state
- **Role:** Patient
- **Related frontend files:**
  - `frontend/app/(auth)/account/payments/page.tsx` (server component)
  - `frontend/app/(auth)/account/payments/_components/receipt-button.tsx` (client)
  - `frontend/app/(auth)/account/payments/_components/pay-now-button.tsx` (client)
  - `frontend/app/(auth)/account/payments/loading.tsx`
- **Shared components used:** `AdminSummaryStrip`, `PageHeader` (via `portal-atoms`), `ColumnPriorityTable` (`frontend/components/ColumnPriorityTable.tsx`, which itself uses `PortalMobileCard`)
- **APIs observed:**
  - `fetchAccountPayments()` (`frontend/lib/api/account-payments-api.ts`) — consultation-appointment payments
  - `getServerInvoices()` (`frontend/lib/api/me-subscription-server.ts`) — Stripe-style membership/subscription invoices
  - Client fetches on demand: `GET /api/account/payments/{paymentId}/receipt-url` (Receipt button), `GET /api/account/appointments/{appointmentId}/payment-url` (Pay Now button)
- **Audit date:** 2026-07-12
- **Viewports tested:** desktop, laptop, tabletl, tabletp, mobile, smobile, short
- **Account state at audit time:** 2 receipts total (1 consultation payment PAID €39, 1 membership invoice €49 with an anomalous blank status — see 16-001); "Needs action" count = 0 for this account at audit time (no FAILED/REQUIRES_ACTION/UNPAID consultation payment present; the `PayNowButton` code path was inspected but not exercised live — see §6)

## 2. Page Purpose

A combined running log of two distinct payment types: (1) per-consultation appointment payments, and (2) recurring membership/subscription invoices — with receipt/invoice download links and, for failed/unpaid consultation payments, a "Complete payment" action.

## 3. Primary User Tasks (priority order)

1. Find a specific past payment and download its receipt/invoice
2. Resolve a failed or unpaid consultation payment ("Pay Now")
3. Check overall payment health (paid vs needs-action count)
4. Distinguish consultation payments from membership billing

## 4. Current Page Structure (top-to-bottom)

1. `PageHeader`: eyebrow "Account", H1 "Payments" (with `CreditCard` icon inline), description explaining Stripe email receipts
2. `AdminSummaryStrip` — 4 cards: Receipts (count), Paid (count), Needs Action (count), Latest (date)
3. Optional amber warning banner if `fetchAccountPayments()` failed server-side (`unavailable` message)
4. Optional empty state if both lists are empty
5. Consultation payments: bare `gh-card` wrapping `ColumnPriorityTable` (Date, Consultation, Amount, Status, Receipt/Pay-now action)
6. "Membership invoices" `h3` label
7. Membership invoices: second `gh-card` wrapping a second `ColumnPriorityTable` (Date, Description, Amount, Status, Invoice link)

## 5. Current Container Hierarchy (indented tree; mark unnecessary levels)

```
.gh-patient-page.gh-patient-payments-page
├─ header.gh-portal-page-header                [necessary]
├─ section.gh-admin-summary-strip              [4x stat cards — DUPLICATES row counts below]
│   └─ div.gh-admin-summary-item ×4
├─ div.gh-card (overflow-hidden, p-0)          [consultation payments]
│   └─ ColumnPriorityTable
│       ├─ table (desktop, ≥ some breakpoint)
│       └─ PortalMobileCard list (below breakpoint) — correctly uses shared primitive
├─ h3 "Membership invoices"                    [plain label, correctly NOT a card]
└─ div.gh-card (overflow-hidden, p-0)          [membership invoices — separate card]
    └─ ColumnPriorityTable (same pattern)
```

This page is the best-structured of the three audited (orders/order-detail/payments) — it already uses `ColumnPriorityTable` per project convention, and the two payment-type sections are correctly separated by a plain heading rather than another nested card layer. The one recurring pattern carried over from the other two pages is the 4-card `AdminSummaryStrip` duplicating counts the tables already show.

## 6. Interaction Inventory

| Element | Type | Action Tested | Result | Issue | Screenshot |
|---|---|---|---|---|---|
| "Receipt" button (paid consultation row) | Client button | Code-reviewed (not clicked — opens external Stripe URL, avoided per audit rules around unnecessary live network calls to a payment provider) | Fetches `receipt-url` on first click, opens `window.open` in a new tab, subsequent clicks reuse cached URL | None found in code | `16-payments-desktop-default-02.png` |
| Membership invoice STATUS pill | Static | Visual check | Pill renders with **no visible text** — empty colored capsule | Real bug — see 16-001 | `16-payments-desktop-default-02.png` |
| Membership invoice INVOICE column | Static | Visual check | Shows "—" (no `hostedInvoiceUrl`/`pdfUrl` available for this invoice) | Consistent with 16-001 — invoice appears to be in an unresolved/non-finalized state that the UI doesn't communicate | `16-payments-desktop-default-02.png` |
| "Pay Now" / `PayNowButton` | Client button | Code-reviewed only — no FAILED/REQUIRES_ACTION/UNPAID row present in this account to trigger live | Fetches `payment-url`, does `window.location.href = url` (full-page redirect to Stripe) if resolved; if `url` is null, button silently does nothing (no error message shown to user) | Silent failure path — see 16-002 | code-derived |
| "Needs Action" stat card | Static | Visual check | Shows 0 for this account | Could not browser-verify the "1 needs action" state mentioned in the audit brief; account data may have changed since the brief was written, or that state exists on a different test account | `16-payments-desktop-default-01.png` |
| Tab traversal into table rows | Keyboard | Verified `ColumnPriorityTable` renders a real `<table>`/`<a>`/`<button>` structure | Receipt/Pay-now links are focusable | None found | code-derived |

## 7. Screenshots

| Filename | Viewport | State | Reason | Related Issues |
|---|---|---|---|---|
| `16-payments-desktop-default-01.png` | 1440x900 | default, top | Stat strip + consultation table | 16-003 |
| `16-payments-desktop-default-02.png` | 1440x900 | scrolled | Membership invoices table showing blank status pill | 16-001 |
| `16-payments-mobile-default-01.png` | 390x844 | default | Stat-card stacking | 16-003 |
| `16-payments-mobile-default-02.png` | 390x844 | scrolled | Mobile card view of both tables (confirms `PortalMobileCard` fallback works, blank status pill reproduces on mobile too) | 16-001 |
| `16-payments-tabletp-default-01.png` | 768x1024 | default | Confirms `ColumnPriorityTable` switches to card layout at/below 768px, not a plain narrowed table | — |
| `16-payments-short-default-01.png` | 1366x650 | default | Short-viewport check | 16-003 |

## 8. UX Problems

### 16-001 — Membership invoice renders a completely blank status pill and a dash for its invoice link
- **Severity:** High
- **Category:** Content accuracy / data-state handling
- **Browser evidence:** `16-payments-desktop-default-02.png`, reproduced on mobile in `16-payments-mobile-default-02.png`
- **User impact:** The one membership invoice on this account (€49, 9 Jul 2026) shows an empty green pill where a status word should be, and "—" where a "View invoice" link should be. The patient has no way to tell whether this payment succeeded, is pending, or failed, and no way to download proof of payment for a €49 charge.
- **Root cause:** `payments/page.tsx` `invoiceStatusLabel()` (lines 41-54) switches on `(status ?? "").toLowerCase()` across `paid`/`open`/`void`/`uncollectible`, falling through to `default: return status ?? ""`. The invoice's `status` field is evidently `null`/`undefined` or an unmapped value, so the fallback renders an empty string inside a still-colored pill (the pill markup always renders regardless of label content — `invoiceFields` "status" column, lines 184-193). Separately, `hostedInvoiceUrl`/`pdfUrl` are both null for this invoice, so the Invoice column also renders "—" (line 212-214) — consistent with a Stripe invoice that hasn't finalized yet (e.g. still `draft` or processing).
- **Recommended resolution:** (1) Give the status pill a guaranteed non-empty fallback label, e.g. "Processing" or "Pending" when `status` is null/unmapped, so the pill is never visually empty. (2) Style that fallback distinctly (amber/neutral, not the emerald "paid" styling currently hardcoded for all invoice rows regardless of status — see 16-004). (3) Confirm with backend whether a `null`-status, no-URL invoice row should even be surfced to the patient yet, or filtered until Stripe finalizes it.

### 16-002 — "Pay Now" fails silently if the payment-url endpoint returns no URL
- **Severity:** Medium
- **Category:** Forms / error handling
- **Browser evidence:** Code-derived — no live FAILED/REQUIRES_ACTION/UNPAID row exists in this account to reproduce in the browser; based on `frontend/app/(auth)/account/payments/_components/pay-now-button.tsx` lines 21-35
- **User impact:** If the appointment-payment-url endpoint fails or returns `{ ok: false }` / `{ data: { url: null } }`, the button spinner (`pending`) resolves back to the idle "Complete payment" label with zero feedback — the patient has no idea the action failed and no guidance to retry or contact support.
- **Root cause:** `onClick()` only branches on a successful, non-null URL (`if (url) { window.location.href = url }`); there is no `else` path setting an error message, unlike its sibling `ReceiptButton` which does set an `"unavailable"` state and renders explanatory text.
- **Recommended resolution:** Mirror `ReceiptButton`'s pattern — add an error state that renders inline text ("Couldn't start payment — try again" or similar) when the fetch fails or returns no URL.

### 16-003 — Same stat-strip duplication/space-cost pattern as pages 14 and 15
- **Severity:** Medium
- **Category:** Card overuse
- **Browser evidence:** `16-payments-desktop-default-01.png`, `16-payments-mobile-default-01.png`, `16-payments-short-default-01.png`
- **User impact:** Receipts/Paid/Needs Action/Latest are all directly re-derivable from the two tables beneath them; on mobile the 4 stacked cards occupy roughly the same ~600px of vertical space seen on the other two audited pages, pushing the actual payment table below the fold. At 1366x650 (short viewport), zero table rows are visible on load.
- **Root cause:** Same `AdminSummaryStrip` reuse pattern as pages 14/15.
- **Recommended resolution:** Same as 14-001/15-004 — collapse to one inline meta line. This is the third page in a row exhibiting the identical pattern; strongly recommend fixing once as a shared decision (e.g. "list-type billing pages get an inline summary line, dashboard-type pages keep the card strip") rather than three separate one-off fixes.

### 16-004 — Membership invoice status pill is hardcoded to "paid" styling for every row regardless of actual status
- **Severity:** Medium
- **Category:** Visual design / content accuracy
- **Browser evidence:** `16-payments-desktop-default-02.png` (code-confirmed)
- **User impact:** Even if 16-001's blank-label bug is fixed, every invoice row's status pill uses a hardcoded emerald "paid" class (`invoiceFields` status column, line 189: `className="... border-emerald-200 bg-emerald-50 ... text-emerald-800"` applied unconditionally). A genuinely unpaid or void invoice would still display in "paid" green.
- **Root cause:** Unlike the consultation-payments table (which maps `STATUS_PILL` per status via `STATUS_PILL[payment.status]`), the invoice table never varies pill color by status.
- **Recommended resolution:** Map invoice status to tone the same way consultation payments do (paid=green, open/pending=amber, void/uncollectible=slate/red).

## 9. Visual Design Problems

- Two separate `gh-card` wrappers (consultation payments, membership invoices) with a bare `h3` label between them is a reasonable, lighter pattern than the other two audited pages — no additional visual issues found beyond 16-001/16-004.
- `CreditCard` icon inline in the H1 title is a nice, non-redundant use of an icon (contrast with the generic repeated `BarChart3` in the stat strip, 16-003).

## 10. Information Hierarchy Problems

- "Needs Action" is the most important of the 4 stat-card numbers (it's the one that should drive the patient to act) but has no different visual treatment from "Receipts" or "Latest" — all 4 cards share identical neutral styling. If the stat strip is kept in any form, "Needs Action > 0" should be the one state that gets a distinct (amber/red) treatment to draw the eye.

## 11. Section Ordering Review

**Current order:**
1. Header
2. Stat strip
3. (conditional) error banner
4. (conditional) empty state
5. Consultation payments table
6. "Membership invoices" label + table

**Recommended order:**
1. Header — unchanged
2. Inline meta line (replacing stat strip) — see 16-003
3. Error banner — unchanged position (should stay high, above tables, when present)
4. Consultation payments table — unchanged, matches page description's primary focus ("Receipts for consultations you've booked")
5. Membership invoices table — unchanged, correctly subordinate to the page's stated primary purpose

**Reasoning:** Order of the two tables already matches the page's own description ("Receipts for consultations... this page is the running log" — consultations first). Only the stat-strip treatment needs to change.

## 12. Tabs, Steps, or Sectioning Recommendation

N/A for tabs — two clearly labeled sections (heading-separated) is sufficient at current row counts (1-2 rows each in this account). If invoice volume grows, consider a single unified table with a "Type" column (Consultation / Membership) plus a filter, rather than two permanently separate tables — but not warranted at observed data volumes.

## 13. Proposed Page Structure (exact top-to-bottom)

1. `PageHeader` (unchanged)
2. Inline meta row: `"2 receipts · 1 paid · 0 needs action · latest 18 May 2026"`
3. Error banner (unchanged, conditional)
4. Empty state (unchanged, conditional)
5. Consultation payments `ColumnPriorityTable` (unchanged structure, fix 16-002 error state)
6. "Membership invoices" heading + `ColumnPriorityTable` (fix 16-001 blank pill, 16-004 status-tone mapping)

## 14. Proposed Container Simplification

| Current | Action | Detail |
|---|---|---|
| `AdminSummaryStrip` (4 cards) | Remove | Inline meta line, matching 14-001/15-004 recommendation |
| Consultation payments `gh-card` | Keep | Already minimal, single wrapper around table |
| Membership invoices `gh-card` | Keep | Same |
| Invoice status pill | Fix, don't remove | Guaranteed non-empty label + status-mapped tone |

## 15. Responsive Findings

- **desktop/laptop (1440/1280):** Both tables render as real tables with aligned columns; no issues.
- **tabletl (1024):** Table view still holds (not yet switched to card view) — confirmed no clipping.
- **tabletp (768x1024):** `ColumnPriorityTable` switches to `PortalMobileCard` layout at this width — correct responsive behavior per the shared primitive's design, verified via `16-payments-tabletp-default-01.png`.
- **mobile/smobile (390/375):** Card layout, `desktopOnly` columns (Receipt/Invoice action) correctly reappear as `cardActions` at the bottom of each card — confirmed in `16-payments-mobile-default-02.png`.
- **short (1366x650):** No clipping; stat strip again consumes the entire initial viewport (16-003).

## 16. Accessibility Findings

- **Heading outline:** H1 "Payments" → H3 "Membership invoices" — same skip-H2 pattern as pages 14 and 15 (systemic, not page-specific; the `h3` here is a literal `<h3>` in the page, line 283, not from `SectionHeader`).
- **Blank status pill (16-001):** also an accessibility concern beyond visual — a screen reader announces an empty element with no text content, giving AT users zero information about that row's status (worse than a sighted user, who can at least infer "something's off" from the visual blank).
- **Icon-only buttons:** none found without accessible text; `ExternalLink` icons next to "View invoice"/"Receipt" text are `aria-hidden` and appropriately paired with visible text.
- **Table semantics:** `ColumnPriorityTable` renders a real `<table>` (confirmed in `frontend/components/ColumnPriorityTable.tsx` line 66) with `<th>` headers — correct table semantics, better than the plain-div rows on the Orders page (14-003).

## 17. Content and Microcopy Findings

| Current | Recommended | Why |
|---|---|---|
| Empty status pill (invoice row) | Non-empty fallback text, e.g. "Processing" | See 16-001 — currently communicates nothing |
| "Receipt" (button label before fetch resolves) | Keep | Task-specific and clear, good example already present on this page |
| "Complete payment" (Pay Now button, when visible) | Keep | Clear, action-oriented — a good model other pages' generic "Open"/"Manage" labels should follow |
| Page description ("Receipts for consultations you've booked...") | Keep | Accurately scopes the page and explains why some payments won't appear (handled by email instead) |

## 18. Component and Code Impact

| Component | File | Change | Shared/Page-specific | Risk | Complexity |
|---|---|---|---|---|---|
| Invoice status label/pill | `frontend/app/(auth)/account/payments/page.tsx` lines 41-54, 184-193 | Non-empty fallback + status-mapped tone | Page-specific | Low — display only | Low |
| `PayNowButton` error state | `frontend/app/(auth)/account/payments/_components/pay-now-button.tsx` | Add error state mirroring `ReceiptButton` | Shared-pattern (used from this page only currently, but should also back 15-001's future order-payment CTA) | Low | Low |
| Stat strip | `frontend/app/(auth)/account/payments/page.tsx` lines 232-240 | Replace with inline meta line | Page-specific | Low | Low |

## 19. Recommended Implementation Order

1. Fix invoice status pill blank-label + tone mapping (16-001, 16-004) — highest severity, isolated, no dependencies
2. Add `PayNowButton` error state (16-002) — isolated, low risk
3. Replace stat strip with inline meta line (16-003) — cosmetic, do alongside the same fix on pages 14/15 for consistency

## 20. Acceptance Criteria

- [ ] No status pill on this page ever renders with empty/whitespace-only text content
- [ ] Membership invoice status pill color varies by actual status (paid=green, pending/open=amber, void/uncollectible=slate)
- [ ] `PayNowButton` shows a visible error message when the payment-url fetch fails or returns no URL
- [ ] Stat-strip cards replaced with a single-line summary (consistent with pages 14/15)
- [ ] Heading outline fixed to H1 → H2 once the shell-wide fix (flagged on pages 14/15) lands

## 21. Open Questions

- The audit brief indicated "1 needs action exists on this account" for the payments/orders pages; live browser data showed 0 needs-action consultation payments at audit time (2026-07-12). This may reflect account state that changed since the brief was authored, or a different test account/session than the one wired to the provided storage-state file. The order-detail audit (page 15) did independently find a genuinely unpaid order (`ORD-000011`, €39) that has no completion path — see `15-order-details.md` issue 15-001 — which may be the state the brief was referring to, just filed under Orders rather than Payments since order-level payments and consultation-level payments are separate systems on this page.
- Whether the blank-status membership invoice (16-001) reflects a real Stripe sync issue in the underlying data versus a frontend rendering gap — could not be determined without backend/Stripe inspection, out of this audit's scope.
