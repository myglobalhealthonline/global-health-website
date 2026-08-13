# Patient Portal — Information Architecture Review

Date: 2026-07-12. Basis: route inventory (20 routes), browser walkthroughs, per-page §11/§12 recommendations.

## 1. Verdict on the current top-level nav

The 5-group sidebar (Overview / Care / Membership / Billing / Account, `account/layout.tsx:82-125`) is fundamentally sound and matches the patient mental model. **Do not redesign the nav skeleton.** The IA problems are inside pages and at the seams, not in the grouping:

## 2. IA changes recommended

| # | Change | Current | Proposed | User reason | Business reason | Dependencies / risk |
|---|--------|---------|----------|-------------|-----------------|---------------------|
| IA-1 | Keep patients inside portal chrome while booking | "Book consultation" jumps to public site header/footer; only route back is an unlabeled avatar (04-001/002) | Portal-aware variant of the booking wizard shell (portal breadcrumb + "Back to my account"), same wizard inside | Patients lose orientation mid-task; keyboard users pay 15 Tab stops per step (04-003) | Booking is the portal's #1 revenue action | Touches shared public `/book` route — needs variant flag, cross-checked against public funnel (see impact map §Booking) |
| IA-2 | Merge Calendar into My bookings as a view toggle | Two sibling nav items render the same consultations as list vs month grid | `/account/bookings` with List / Calendar tabs (URL-synced); retire standalone nav item | One concept ("my appointments") in one place; today the two pages even disagree in stat framing | Halves maintenance of duplicated stat strips/queries | Medium effort; keep `/account/calendar` redirecting. Defer if contested — not blocking |
| IA-3 | Booking deep links | Dashboard/bookings "Open" buttons all land on the generic list (01-005) | Per-booking detail (existing drawer, URL-addressable `?booking=<id>` or `/account/bookings/[id]`) | "Open" that opens nothing specific erodes trust | Support burden ("where is my booking?") | Needs drawer deep-link wiring; no backend change |
| IA-4 | Make `/account/subscribe` fail loudly | Active subscribers get silently redirected (13-001, Critical) | Redirect + banner on membership page ("You already have an active plan") via query param | Silent teleport = dead end; marketing links break invisibly | Plan-upgrade funnel measurability | One-line redirect param + banner reuse |
| IA-5 | Move Access history under Security (visual subordination, not URL change) | Peer of Profile/Family in nav | Keep route; render as secondary link from Security page, drop from main nav OR keep nav but demote below Security | It's an audit artifact, not a task; 16-item nav is at the edge of scannability | — | Cosmetic; zero route/permission change |
| IA-6 | Gate or purpose the Corporate route | Hidden from nav for non-corporate patients but directly reachable showing an empty shell (20-001) | Server-side gate → redirect to membership with note, or an explanatory "not linked" state | Confusing dead room | Corporate upsell surface if given real copy | Product call; either is one guard |
| IA-7 | Orders vs Payments boundary | Two Billing pages overlap ("needs action" money state lives on both; invoice vs order unclear) | Keep both routes but define ownership: Orders = fulfillment state; Payments = money state. Cross-link per record. Payment completion for an order must exist on the order (15-001) | Patient chasing "pay this" must not guess between two pages | Unpaid-order recovery = direct revenue | 15-001 needs a backend order-payment-url endpoint (flagged) |

## 3. Nav after changes (16 → 14 items)

```
OVERVIEW   Overview · Book consultation (portal-chromed)
CARE       My bookings (list+calendar tabs) · Messages · Prescriptions · Medical files
MEMBERSHIP Membership · Rewards · [Corporate — only when linked]
BILLING    My orders · Payments
ACCOUNT    Profile · Notifications · Family members · Security (→ Access history)
```

## 4. Dashboard as IA (task-oriented home)

Per 01-002/003 and §D digest: the dashboard's job is triage, not statistics. Proposed model (details in `pages/01-dashboard.md`):

1. Welcome band (identity + single Book CTA)
2. **Needs attention** — conditional action rows (unpaid order 15-001, unconfirmed requests, unread doctor message, verification gaps). Replaces the 3 stat cards + 4 pseudo-stat cards; each row deep-links to the owning page (depends on IA-3).
3. Next appointment (or Book empty-state)
4. Recent bookings (deep-linked) + quick actions
5. Membership summary (compact; details live on Membership page)

Rationale: every current stat card fails the "what should I do" test — "TOTAL 27" and "MARKETS 1" answer nothing. The needs-attention band converts the same data into tasks, which is the only thing a returning patient wants above the fold.

## 5. What was deliberately NOT changed

- No new top-level sections; no renames of medical/legal terms (flagged separately in microcopy).
- Messages stays in Care (not merged with Notifications — different mental objects: conversation vs system event).
- Family stays in Account (it's account administration, not care delivery).
- All changes preserve existing routes, permissions, and backend contracts except where explicitly flagged (IA-7 endpoint; IA-3 optional route).
