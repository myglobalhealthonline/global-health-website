# Prioritized Patient Portal Improvement Plan

Date: 2026-07-12. 108 issues from 20 page audits, prioritized. Owner suggestions: **S** = small isolated task (Sonnet-sized), **F** = needs architectural judgment (Fable review). Complexity: XS <½d · S ½–1d · M 1–3d · L 3d+. No implementation has been performed — plan awaits approval.

## P0 — Blocking (broken function, data loss, wrong medical/payment state)

| Order | Issues | What | Complexity | Owner | Dependencies |
|---|---|---|---|---|---|
| 1 | 09-001 | Medical Files API 404 — rename `[...path]`→`[[...path]]`, verify 0-segment handling | XS | S | None (task chip already spawned) |
| 2 | 02-004 | Bookings search matches raw enum, not visible label — search over translated label | XS | S | None |
| 3 | 03-001 | Reschedule fires on single slot click — add select→Confirm gate | S | S | Product Q1 (assume confirm) |
| 4 | 17-002, 18-002, 19-001 | No unsaved-changes protection (6 profile forms, family add/edit, password) — new shared `useUnsavedChanges` hook + wire | M | F design, S wiring | None |
| 5 | 15-001 | Unpaid order has no payment path — order-level Pay CTA (PayNowButton pattern) | M | F | **Backend endpoint** (open Q4) |
| 6 | 16-001, 16-004, 15-002 | Money-state miscommunication: blank invoice pill, hardcoded "paid" tone, "Awaiting confirmation" on FAILED — status-driven rendering + fallback | S | S | 16-001 backend check (open Q) |
| 7 | 05-006 | "Join video call" enabled on past/unconfirmed booking — gate on confirmed + time window | S | F (shared EventDetailDialog variant) | Impact map §EventDetailDialog |
| 8 | 06-001 | Paid doctor-chat composer unusable at mobile widths | S | S | Doctor-portal regression check |
| 9 | 10-001 | Access-history avatar → full-width pill on mobile (CSS mistarget) | XS | S | None |
| 10 | 13-001 | Subscribe silent redirect — `?subscription=already-active` + banner | XS | S | None |

## P1 — High impact (architecture of pages)

| Order | Issues | What | Complexity | Owner |
|---|---|---|---|---|
| 11 | 01-002/003, 02-001/006, 05-002, 07-002, 09-002, 11-003, 12-002, 14-001/005, 15-004, 16-003, 19-003 | **Stat-strip strategy (Rule S3)**: remove `AdminSummaryStrip` from all list/detail pages → inline meta line in section headers; dashboard keeps a reduced, task-oriented band. Fixes all 8 short-viewport starvation pages + mobile scroll cost in one sweep | L (mechanical per page after pattern set) | F pattern, S rollout |
| 12 | 02-003, 08-001, 14-002/003, 15-006, 17-008 | **Card-flattening (Rules S1/S2)**: bookings/prescriptions/orders → `ColumnPriorityTable`/divided rows; consent cards → list; consolidate order-detail sidebar cards | L | F pattern, S rollout |
| 13 | 17-004/005 + §12 | Profile restructure: split Personal tab (Contact / Medical), 6 tabs, per-tab sticky Save, unsaved-dot on tabs | M | F |
| 14 | 01 §13, 01-005, IA-3 | Dashboard → needs-attention model + booking deep links | M | F |
| 15 | 04-001/002/003/009 | Booking wizard: portal-chrome variant, mobile content-first order | M | F (public-funnel flag) |
| 16 | 05-005/007/008, 05-001/003 | Calendar patient-variant fixes (dialog fields, empty-state copy, row overflow, day badge) | M | F variant, S fixes |
| 17 | 06-002/003 | Thread rows: render subtitle/type, disambiguate duplicates | S | S |
| 18 | 11-001, 11-006 | Membership: non-danger change-plan dialog; actions above fold (follows #11) | S | S |

## P2 — Consistency

| Issues | What | Complexity |
|---|---|---|
| 08-005, 09, 14, 15, 20-002, 15-003, 12-003 | Heading hierarchy via `as` prop on SectionHeader/AdminEmptyState + consumer migration; fix H1 name concat | S+sweep |
| 09-004, 17-003 | PortalTabs: wire PortalTabPanel ARIA; mobile overflow affordance | S |
| 01-001 | Popover opaque fill/blur (both CSS fallback blocks, 3 portals) | S |
| 05 a11y, 06-006, 20, 12 | Accessible-name sweep (day cells, attach, beneficiary buttons, redeem labels) | S |
| 17/19/08 live regions | `role="status"` on async feedback (copy 18's pattern) | XS |
| 02-002/005/007/008, 06-004, 09-003/005, 20-003/004 | Page-local layout/nesting cleanups per page files §14 | S each |
| G-table microcopy | Vague-verb sweep ("Open"→"View booking" etc.) — all new strings through 6-locale i18n | S+translation |
| 18-003, 14/15 statusTone dup | Component reuse hygiene (FamilyMetric→shared; extract status util) | XS |

## P3 — Polish

Identical stat icons (14-005), whitespace on rewards (12-001), ledger wording (11-004, pending Q6), notification stat cards (07-002 remainder), day-agenda grouping (10-002), redundant CTA dedup (08-003, 11-002, 14), inline validation timing (17-001, 18-001), 20 banner ordering.

## Sequencing logic

1. **P0 first, independently shippable** — none depend on the design-system decisions.
2. **#11 before #12** (strip removal changes what's above every list before lists are restyled); both before page-local P2 layout cleanups to avoid re-touching.
3. Shared-component edits follow the impact-map guard (cross-portal screenshot pass per change batch).
4. Re-audit checkpoints: after P0 batch and after #11/#12, re-run the 7-viewport screenshot sweep (helper script exists) and diff.

## Effort estimate (rough)

P0 ≈ 5–7 dev-days (+1 backend endpoint). P1 ≈ 10–14 dev-days. P2 ≈ 5–7. P3 ≈ 3. Total ≈ 4–6 weeks single dev, halved with the pattern/rollout split above.
