# Plans / Subscriptions — Full-Flow Audit & Fix Log

**Date:** 2026-07-05 · **Branch:** `Dev-hassaan` · **Status:** audit complete, confirmed fixes applied, tsc + tests green.

Scope: plans management, subscription lifecycle, pricing display, checkout benefit
application, portal subscription state, admin plan/subscription management,
access control — across public site, patient portal, doctor portal, admin portal,
backend, and DB.

---

## 1. Verdict up front

The system is **architecturally sound and much more complete than assumed**.
It already follows the standard SaaS shape end to end:

- **Public:** `/{country}/{lang}/pricing` (feature-gated per country) → auth-aware
  CTA → `/account/subscribe` confirm → Stripe `mode:subscription` → return with
  webhook-race polling. Active plan is marked ("Current plan" / "Switch to this plan").
- **Portal:** sidebar **Membership** page (status pill for all 5 states, next
  billing, cancel, next-cycle plan change with confirm dialogs, Stripe billing
  portal, pending-change banner) + dashboard credits/wellness/perks/ledger +
  rewards redemption + invoices on Payments.
- **Checkout:** per-line benefit selection (PAY_NORMAL default — never silently
  consumes a credit), coverage preview endpoint shared with the charge path,
  guest login prompt, non-subscriber upsell with `returnTo` funnel.
- **Admin:** plan CRUD + rules + perks + kits + translations + live preview,
  subscriber list + ledger + audit links, perk-approval queue, health panel,
  SUPER_ADMIN-gated support override with mandatory reason.
- **Backend:** single centralized engine — `pricing-resolver` (pure),
  `checkout-pricing`, `credit-balance` (sole spend authority, atomic),
  `subscription-eligibility` (pure gates), snapshot-based grants, idempotent
  webhooks, monotonic status sync, one-active-sub partial unique index,
  cross-country FK constraints. **No duplicated entitlement logic, no hardcoded
  plan data anywhere.**
- **Doctor portal:** zero subscription coupling (correct — doctors see
  appointments, not billing).

**Why it can *look* broken in dev:** with `BILLING_DRIVER=fake`, checkout returns
a `fake-billing.local` URL and no webhook fires, so a sub stays `INCOMPLETE`
unless `POST /api/me/subscription/dev-activate` is used (the SubscribeForm does
this automatically in dev). Production Stripe path is correct and guarded (§B1
misconfiguration block).

No rebuild is warranted. Findings below are targeted defects.

---

## 2. Problems found (by severity)

### HIGH

| # | Finding | Where | Status |
|---|---------|-------|--------|
| H1 | **LOCAL_ADMIN had full global subscription-management API access** (plan CRUD in every country, subscriber list incl. emails/balances, resync/regrant/refund) via `requireManageSubscriptions`, while the admin frontend blocks LOCAL_ADMIN entirely and every other backend surface treats it as country-scoped. API-only privilege hole. | `backend/src/utils/manage-subscriptions-auth.ts` | **FIXED** — LOCAL_ADMIN now 403s; test added. |
| H2 | **Admin refund endpoint gated below adjust-credits.** Refund moves real money + claws back credits, yet required only plain ADMIN, while balance adjustment required SUPER_ADMIN. Inconsistent money-mutation bar. | `backend/src/routes/admin-subscriptions.route.ts` (refund) | **FIXED** — refund now SUPER_ADMIN, same bar as adjust-credits. |

### MEDIUM

| # | Finding | Where | Status |
|---|---------|-------|--------|
| M1 | **Plan reorder endpoint unreachable** — backend registered `POST /api/admin/plans/:id/reorder` (`:id` never read) while the client calls `/api/admin/plans/reorder` → guaranteed 404; feature dead since birth. | `admin-plans.route.ts:169` vs `frontend/lib/admin/plans-api.ts:186` | **FIXED** — backend path now `/api/admin/plans/reorder`. (No UI calls it yet — `displayOrder` is editable per-plan via PATCH; wire a drag UI only if wanted.) |
| M2 | **Ops repair endpoints had no UI** — `resync` (Stripe drift) and `regrant-period` (missed grant) existed backend-only; fixing drift required curl. | admin subscriptions page | **FIXED** — client fns + per-row "Resync from Stripe" / "Re-run period grant" actions (desktop table + mobile cards). Both idempotent/safe. Refund deliberately stays API-only (needs its own confirm/amount UX — follow-up). |
| M3 | **"Switch to this plan" lost the chosen plan** — pricing page routed to `/account/membership` with nothing preselected; user had to re-find the plan in the dropdown. | pricing page → ManagePanel | **FIXED** — `?plan=` rides along; ManagePanel preselects it when it's a valid switch target. |

### LOW (fixed)

| # | Finding | Status |
|---|---------|--------|
| L1 | Tier display names ("Essential Care" …) duplicated in 3 admin files. | **FIXED** — single exported `PLAN_TYPE_LABEL` in `_components/plan-fields.tsx`, imported by edit + new pages. |

### LOW (documented, intentionally not changed)

| # | Finding | Note |
|---|---------|------|
| L2 | Dead nav data: `buildSiteNavigationData().clinicsMenuByCountry` is built but never rendered; it contains a dead `/plans-pricing` href (Wix-era page deleted). `data/routes.ts` is a checklist doc, not runtime. | Never reaches users. Candidate for a nav-data cleanup pass, not a plans bug. |
| L3 | `PAUSED` status: only ever set from a Stripe webhook; portal shows the pill + billing-portal button; benefit gates block it implicitly (not in ACTIVE/PAST_DUE). Safe but implicit — worth one explicit eligibility test. | No pause/resume product feature exists by design. |
| L4 | Terminology: patient UI says "Membership", API/admin say "subscription". Consistent within each surface; users never see the mix. | Cosmetic. |
| L5 | `statusMeta()` tone/label mapping exists in ManagePanel, SubscriptionDashboard, and admin page (different copy sources each). | Three small pure functions; consolidation is optional polish. |
| L6 | `snapshotVersion` always 0 (grandfathering path unused — snapshot re-captured at each renewal per D18); refund window is a hardcoded 7-day constant (D17). | Both are documented product decisions, not defects. |
| L7 | `Order.appointmentIds` string array deprecated in favor of `OrderAppointment` join (2026-07-05 review) — don't query the array. | Transition tracked elsewhere. |

### Non-issues verified (claims from the brief that did NOT reproduce)

- No hardcoded plan data on any surface — public, portal, admin all fetch from API.
- No duplicated entitlement/pricing logic across portals — one resolver, one balance authority.
- Status enums/terminology aligned across backend, frontend types, admin filters.
- Mobile: all plan surfaces responsive (dual table/card layouts, fluid type, no fixed widths).
- Empty/expired/cancelled/unpaid states all handled: no-sub empty states, INCOMPLETE
  "complete payment" CTA, PAST_DUE SCA banner + grace until period end (+14d cron cancel),
  CANCELED "cancels on {date}", webhook-race "still processing" polling.
- Guests: benefit-less checkout + login prompt; subscribing requires auth (D15).
- Card data: none stored locally; Stripe references only; billing portal for card changes.

---

## 3. Architecture recommendation

**Keep the current architecture.** It is already centralized where it matters:

- Entitlement = `pricing-resolver.ts` (pure) + `subscription-eligibility.ts` (pure)
  + `credit-balance.service.ts` (atomic counter). Preview and charge share
  `computeEffectivePrices` so they cannot drift.
- Plan data = DB only, snapshot-at-signup/renewal authoritative for live subs.
- Statuses = one Prisma enum, mapped once per surface.

Do **not** merge subscriptions into the one-off cart (`mode:payment` vs
`mode:subscription` — Decision A, Option A already shipped as the dedicated lane).

Follow-ups worth doing later (not defects):
1. Admin refund UI with explicit confirm (now that the endpoint is SUPER_ADMIN).
2. Explicit `PAUSED` eligibility test + a paused-state notice banner in ManagePanel.
3. Optional: drag-reorder UI for plan cards (endpoint now reachable).
4. Nav-data cleanup: delete unused `clinicsMenuByCountry` + `/plans-pricing` entry.

---

## 4. Changed files (this pass)

**Backend**
- `src/utils/manage-subscriptions-auth.ts` — deny LOCAL_ADMIN (H1) + doc comment.
- `src/utils/manage-subscriptions-auth.test.ts` — LOCAL_ADMIN denial test.
- `src/routes/admin-subscriptions.route.ts` — refund → SUPER_ADMIN (H2).
- `src/routes/admin-plans.route.ts` — reorder path `/api/admin/plans/reorder` (M1).

**Frontend**
- `lib/admin/plans-api.ts` — `postAdminSubscriptionResync` / `postAdminSubscriptionRegrant` (M2).
- `app/(admin)/admin/subscriptions/page.tsx` — resync/regrant server actions + row buttons, desktop + mobile (M2).
- `app/(site)/[country]/[lang]/pricing/page.tsx` — switch CTA carries `?plan=` (M3).
- `app/(auth)/account/membership/page.tsx` — reads `?plan=`, validates against options (M3).
- `app/(auth)/account/membership/_components/ManagePanel.tsx` — `initialPlanId` preselect (M3).
- `app/(admin)/admin/_components/plan-fields.tsx` — export `PLAN_TYPE_LABEL` (L1).
- `app/(admin)/admin/plans/new/page.tsx`, `app/(admin)/admin/plans/[id]/edit/page.tsx` — use shared label (L1).

## 5. Testing

**Done:**
- Backend `tsc --noEmit` — clean.
- Frontend `tsc --noEmit` — clean.
- `manage-subscriptions-auth.test.ts` — 6/6 pass (incl. new LOCAL_ADMIN denial).
- `admin-plans.route.test.ts` — 11/11 pass against real Postgres (covers plan CRUD,
  rules, perk approval through the changed guard).

**Manual verification remaining** (needs live backend + seeded admin/patient sessions):
- Admin: click "Resync from Stripe" / "Re-run period grant" on a subscriber row →
  success banner; regrant on already-granted period → success (idempotent no-op).
- Pricing (subscribed user): "Switch to this plan" → membership page with dropdown preselected.
- Confirm a plain-ADMIN session gets 403 on `POST /api/admin/subscriptions/:id/refund`.
- Confirm a LOCAL_ADMIN session (if any exist) gets 403 on `/api/admin/plans`.

**Risk notes:**
- If any real LOCAL_ADMIN operator relied on the subscription APIs (frontend never
  allowed it, so unlikely), H1 revokes that access — intended.
- Refund gate tightening (H2) affects API callers only; no UI existed.
