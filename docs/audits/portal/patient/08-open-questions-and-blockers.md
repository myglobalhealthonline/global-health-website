# Open Questions & Blockers — Patient Portal Audit

Date: 2026-07-12. Only items that browser + code inspection could not resolve. Full per-page list in each page file §21; consolidated and deduplicated here.

## Blockers (prevented audit coverage)

| # | Blocker | Pages affected | What's needed |
|---|---|---|---|
| B1 | Test account already has an ACTIVE subscription → `/account/subscribe` redirects before render; entire subscribe form untestable live | 13 | A non-subscribed patient test account (or temporary guard bypass in dev) |
| B2 | Test account has no corporate link → populated corporate view untestable | 20 | A corporate-linked patient test account |
| B3 | 0 prescriptions / 0 medical files on account (and 09 list API is dead — 09-001) → populated list states code-derived | 08, 09 | Seed data after 09-001 fix |
| B4 | 0/6 wellness credits → redeem flow unreachable; brief prohibits mutation | 12 | Seeded credits on a disposable account |
| B5 | Mutating/destructive/payment actions intentionally not executed (live DB) | 03 submit, 04 cart→pay, 11 cancel/change confirm, 15/16 Pay Now, 17-19 saves, 18 remove | Disposable test records + staging DB for the implementation-verification phase |

## Product decisions required before implementation

1. **03-001**: was reschedule-on-single-click intentional? Fix direction assumed: add confirm step (Critical either way — subtitle currently promises a confirmation that doesn't exist).
2. **IA-2**: merge Calendar into Bookings as view toggle — approve/reject.
3. **IA-1 / 04-001**: portal-chromed booking wizard variant — approve/reject (public-funnel risk).
4. **15-001**: order-level payment completion requires a backend order-payment-url endpoint — confirm API owner. (Only audit finding requiring a new backend contract.)
5. **17 §21**: Profile "Personal" tab split (Contact / Medical) — confirm whether `/api/account/profile` PATCH semantics allow per-tab saves without backend change.
6. **11 §21**: RESERVED + USED 0-delta ledger rows — merge server-side or relabel client-side?
7. **AdminSummaryStrip removal from 12+ pages** — design sign-off against DESIGN2.md (stat strip may be considered part of portal identity; audit position: dashboards only, Rule S3).
8. **20-001**: gate `/account/corporate` server-side or give it a "not linked" explainer state?
9. **18 §21**: family-ineligible tiers can open the Add-member form (soft paywall?) — intentional?

## Needs re-test in prod build (dev-environment artifacts)

- 07-001 mark-all-read latency (Fast Refresh suspected).
- 19-002 focus order (dev-overlay interference).
- 17-006 / 19-004 short-viewport skeleton captures (hydration timing vs real stall).

## Backend/data questions

- 06-§21: two visually identical threads with same order number — distinct services or data dup? Needs backend query check.
- 16-001: blank invoice status — Stripe sync gap vs frontend mapping? Needs backend inspection.
- 10: does any account exceed 20 access-log entries (pagination never rendered)?

## Out of scope, noted for later phases

- Doctor/Admin/Corporate portal audits (blocked on approval of this one).
- Assistive-technology (screen reader) pass and measured contrast ratios.
- Make-or-buy on i18n of new microcopy strings (all new strings need the 6-locale treatment per portal i18n setup).
