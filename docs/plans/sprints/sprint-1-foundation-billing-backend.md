# Sprint 1 — Foundation, Billing & Money Backend (LEAD SPRINT)

> Master plan: [subscription-plan-implementation.md](../subscription-plan-implementation.md). This sprint implements the schema + all money/billing/credit logic. **It is the gate**: Phase 0 (schema migration) must merge before Sprints 2 & 3 can compile against the Prisma client.

## Agent role
Backend / payments engineer. Owns the database, Stripe integration, credit ledgers, pricing engine, webhooks, ops jobs, and the patient-facing money APIs (the frontends in Sprints 2/3 only *consume* these).

## Parallelization map
- **Phase 0 (schema) is exclusive and first.** Sprints 2 & 3 are blocked until the migration + regenerated Prisma client are on the shared integration branch. Target: land Phase 0 within day 1.
- After Phase 0, Sprint 1 Phases 1–6 run **in parallel** with Sprint 2 and Sprint 3.
- **Coordinate via the API contracts in §"Contracts produced"** — Sprints 2/3 build against these signatures; do not change a published contract without notifying them.

## Files OWNED (do not let other sprints touch)
- `backend/prisma/schema.prisma` + `backend/prisma/migrations/**` (EXCLUSIVE — schema is the contention point)
- `backend/src/modules/subscriptions/**` (new)
- `backend/src/modules/credits/**` (new)
- `backend/src/modules/billing/**` (new)
- `backend/src/lib/stripe/**` (extend)
- `backend/src/routes/payments.route.ts` (extend webhook — billing events)
- `backend/src/routes/orders.route.ts` (pricing-engine hook only, §21)
- `backend/src/routes/me-subscription.route.ts`, `me-credits.route.ts`, `me-redemptions.route.ts` (new patient APIs)
- `backend/src/jobs/**` subscription jobs (new)
- `backend/src/modules/pricing/peak-pricing.service.ts` (read; add the subscription price resolver alongside)

## Files OUT of scope (other sprints own)
- Any `frontend/**` (Sprints 2 & 3)
- `backend/src/routes/admin-plans*.route.ts` and admin plan service layer (Sprint 2)

---

## Phase 0 — Schema & migration (BLOCKING, do first)

Source of truth = master plan **§20 "Wave 0 schema checklist"**. Author the migration via the repo workaround (diff-from-live-DB + `migrate deploy`) — the dev `migrate` is broken (see [[reference_migration_shadow_db_workaround]]).

- [ ] **Extend `PricingPlan`**: rename `priceCents→monthlyPriceCents`, `interval→billingInterval` (new `BillingInterval` enum, `MONTHLY`). Add `shortDescription, longDescription, displayOrder, isFeatured, badgeLabel, notesTerms, monthlyConsultationCredits (int default 0), wellnessCreditsPerMonth (int default 0), familyEnabled (bool default false), vatMode (enum EXEMPT|STANDARD default EXEMPT), vatRatePct?, stripeProductId, stripePriceId`. Backfill old columns into the renamed ones.
- [ ] Raw-SQL `@@unique([id, countryId])` on **`PricingPlan`** and on **`Service`** (FK targets for the country-integrity guard, §36.10).
- [ ] **New models** (exact fields in §20): `PlanTranslation`, `PlanConsultationRule` (with `countryId` + the **two** composite FKs), `PlanPerkRule`, `HealthTestKitRedemptionRule`, `UserSubscription` (incl. `planSnapshot`, `snapshotVersion`, `stripePriceId`, pending-change fields), `SubscriptionCreditBalance`, `ConsultationCreditLedger`, `WellnessCreditLedger`, `SubscriptionPerkGrant`, `HealthTestRedemption`, `SubscriptionInvoice`, `PlanStripePrice` (optional), `FamilyMember` (Wave 5 — create table, seed off).
- [ ] **Raw-SQL constraints** (Prisma `@@unique` can't express these — author by hand):
  - Partial unique `UserSubscription(userId) WHERE status IN ('ACTIVE','INCOMPLETE','PAST_DUE')`
  - Partial unique `ConsultationCreditLedger(reservationId) WHERE reason IN ('CONSUMED','RELEASED')`
  - Partial unique `WellnessCreditLedger(reservationId) WHERE reason IN ('REDEEMED','RELEASED')`
  - Composite FKs `PlanConsultationRule(serviceId, countryId)→Service(id, countryId)` and `(planId, countryId)→PricingPlan(id, countryId)`
- [ ] Add `subscriptions` to the `Country.enabledFeatures` vocabulary (backend constant). **Do NOT enable by default** (§36.15). **Backfill data step:** make `subscriptions` strict-opt-in despite the frontend "empty = enabled" default (`country-features.ts:34`) — either special-case the key to require explicit presence, OR backfill every existing `Country.enabledFeatures` with an explicit list that omits `subscriptions`. Verify the gate server-side (pricing route + `POST /api/me/subscription`), never trust the frontend.
- [ ] New `AuditAction` enum values (§24) + `MANAGE_SUBSCRIPTIONS` scope on the admin role/permission model (§25.1).
- [ ] Deprecation note only (no drop yet): keep `PatientProfile.pricingPlanId` for one release. **But migrate its live call sites** (§17.1/§38.9): it is validated on write (`patient-profile.service.ts:200-239`), written via account/admin/doctor profile routes, and shown in admin UI — point new reads/writes at `UserSubscription` and stop persisting `pricingPlanId` once subscriptions are live (actual column drop deferred to §32 step 6, a later release).
- [ ] Regenerate Prisma client; **push the branch + announce "Phase 0 merged" to Sprints 2/3.**

**Exit criteria:** migration applies on a clone of prod; Prisma client compiles; `enabledFeatures` strict-opt-in helper updated server-side.

---

## Phase 1 — Stripe product/price sync + subscribe lifecycle (§22, §38.1, §38.2)
- [ ] On plan create/edit (called by Sprint 2's admin service via a shared `billing` module function — expose `syncPlanStripePrice(planId)`): create Stripe **Product** (once) + **Price**; on amount change create a NEW Price, archive old, update `stripePriceId`, write `PlanStripePrice` history. **Hard-fail + alert on sync error** (§39); never leave a plan without a Price.
- [ ] **Stripe Tax / VAT (§38.1, D21):** drive `automatic_tax` (or per-country `tax_rate`) off the plan's `vatMode`/`vatRatePct` — `EXEMPT` default = no VAT line. Capture customer `tax_id`/VAT at checkout where `STANDARD`. Stripe-hosted invoices are the record; write `SubscriptionInvoice` mirror in Phase 5. (Per-country `vatMode` is an accountant go-live checklist item, §32 step 5 — configurable, not a code change.)
- [ ] **Seed (§31):** idempotent seed script for the pilot country's 3 plans — Essential €20 / `monthlyConsultationCredits=1`, Comprehensive €39 / 2, Premium €49 / 3 + `wellnessCreditsPerMonth=1`. Run **after** Price sync (needs `stripePriceId`). `familyEnabled=false` on all (Wave 5). Values are placeholders, admin-editable (D14).
- [ ] `POST /api/me/subscription` → Checkout `mode:"subscription"` (collects SCA + off-session mandate, §38.2). Enforce **login required** (D15) and **one active sub per user** (§36.8). Reuse one `stripeCustomerId` per user.
- [ ] `GET /api/me/subscription/portal` → billing portal session.
- [ ] `POST /api/me/subscription/cancel` → cancel at period end (Q5=A).
- [ ] `POST /api/me/subscription/change` → schedule next-cycle change (Q10=B), set pending-change fields + `stripeSubscriptionScheduleId`, `proration_behavior:'none'`.

## Phase 2 — Webhooks (§25.3, §36.2, §38.7) — extend `payments.route.ts`
- [ ] Branch subscription events vs existing `kind:"order"` events.
- [ ] `checkout.session.completed (subscription)` → link sub+customer, capture `planSnapshot` (D18 — enumerated fields in §36.16) + `stripePriceId`, set status.
- [ ] `invoice.payment_succeeded` → **period-keyed grant** `sub:{subId}:period:{currentPeriodStart}` for `billing_reason ∈ {subscription_create, subscription_cycle}` AND `amount_paid>0`. First invoice (`subscription_create`) promotes INCOMPLETE→ACTIVE + month-1 credits. Reset prior unused consultation credits then grant `monthlyConsultationCredits` from snapshot; grant wellness if snapshot `wellnessCreditsPerMonth>0`; fire perk-unlock. **One atomic tx.**
- [ ] `invoice.payment_action_required` / `finalization_failed` → SCA state, surface hosted auth link, do NOT cancel.
- [ ] `invoice.payment_failed` → `PAST_DUE`, no credits (Stripe owns dunning, §38.5).
- [ ] `customer.subscription.updated/deleted` → sync status/period; apply pending change at renewal then clear pending fields.
- [ ] **Re-snapshot at each renewal (§36.9/D18):** on the `subscription_cycle` invoice, re-capture `planSnapshot` (+ bump `snapshotVersion`) from the now-current plan so admin edits take effect from the new period — existing period keeps its old snapshot. Subscribe captures the first snapshot; renewal refreshes it.
- [ ] `charge.refunded` → **always reconcile/clawback** + flag policy violations (§36.5). `charge.dispute.created` → clawback + flag.
- [ ] **Ordering tolerance** (§38.7): ignore events older than last-synced `current_period_start`; re-fetch sub from Stripe on ambiguity; period-keyed idempotency is the backstop.

## Phase 3 — Credit system (§36.1, §36.2, §36.3)
- [ ] `SubscriptionCreditBalance` counter is the **sole spend authority**; all spends via atomic `UPDATE ... WHERE balance >= n`. Ledger `balanceAfterHint` advisory only.
- [ ] Reservation lifecycle: `RESERVED -1` (+`reservationId`,`reservedUntil`) → terminal `CONSUMED 0` or `RELEASED +1`; terminal-uniqueness guard enforces commit/release mutual exclusion.
- [ ] Monthly reset = at grant time in the webhook (no sweep).

## Phase 4 — Pricing engine (§21) — `orders.route.ts` hook
- [ ] Insert after the peak-price calc (`orders.route.ts:163-171`, before subtotal `:177`). Eligibility = `ACTIVE` OR (`PAST_DUE`/`cancelAtPeriodEnd` while `now < currentPeriodEnd`).
- [ ] Resolve `PlanConsultationRule` by `serviceId` from the **snapshot**. Priority: credit→€0 (reserve) → fixed → percent (round-half-up `Math.round(base*pct/100)`, §38.3) → normal.
- [ ] **Commit on payment success OR €0-order confirm** (§36.3); release sweep handled in Phase 6.
- [ ] Mixed cart: €0 credit line carries no Stripe line-item; paid lines proceed (§36.17). Cart-first path only; manual `appointments.route.ts` out of scope (§36.17).

## Phase 5 — Patient money APIs (consumed by Sprint 3)
- [ ] `GET /api/me/credits` → consultation + wellness balances (from counter) + ledger history.
- [ ] `GET /api/me/redemptions` → eligible kits + progress.
- [ ] `POST /api/me/redemptions` → **reserve** wellness + stock, create `HealthTestRedemption` + an Order (one `HEALTH_TEST` `OrderItem` `unitPriceCents=0`, postage in `Order.shippingCents`), return shipping Checkout URL; commit on shipping payment / instant if `shippingCents=0` (§11).
- [ ] `SubscriptionInvoice` rows written from `invoice.payment_succeeded` for the account page (§38.1).

## Phase 6 — Ops jobs (§39) + scheduled (§28)
- [ ] Reservation-release sweep (5 min, conditional/atomic, fail-closed).
- [ ] Cancel-after-grace (daily) — **no customer dunning emails** (§38.5).
- [ ] Daily Stripe↔DB reconciliation, ledger↔balance invariant, invoice-grant coverage (incl. `subscription_create`), price-sync-failure + webhook-failure alerts.
- [ ] `GET /api/admin/subscription-health` — expose the latest reconciliation diff + open invariant alerts for Sprint 2's admin health panel (§39).

## Out of scope for these 3 sprints (deferred — Wave 5 / later)
- **Family usage flow** (D20): `FamilyMember` table is created + seeded off in Phase 0, but the family endpoints (`/api/me/family`), booking-on-behalf, and flipping `familyEnabled` are a **separate Wave 5 sprint** — not built here.
- **`PatientProfile.pricingPlanId` column drop** (§32 step 6) — a later release after `UserSubscription` is proven live.

---

## Contracts PRODUCED (publish these signatures to Sprints 2 & 3 on day 1)
- `billing.syncPlanStripePrice(planId): Promise<{ stripeProductId, stripePriceId }>` — Sprint 2 calls this after plan create/price edit.
- Patient REST: `GET/POST /api/me/subscription`, `/change`, `/cancel`, `/portal`, `GET /api/me/credits`, `GET|POST /api/me/redemptions` — response shapes documented in `docs/plans/sprints/contracts.md` (create + keep updated).
- Webhook + grant are internal (no consumer).

## Acceptance criteria
- Subscribe → first invoice (`subscription_create`) grants month-1 credits, sub ACTIVE. Renewal grants once (idempotent on retry/duplicate invoice).
- Failed payment → PAST_DUE, no credits, benefits persist to period end.
- Pricing: credit→€0 / fixed / percent(rounded) / normal, exactly as §21; concurrency-safe (no double-spend on last credit).
- Refund via Stripe Dashboard still claws back via webhook.
- Redemption reserves then commits on shipping payment; cancel restores credits+stock.
- All §15 backend criteria + §27 money-race tests pass.

## Test plan (TDD — §27)
Unit: pricing priority + rounding; perk-unlock gate; ledger reserve/commit/release/clawback; snapshot grant amounts. Integration: full webhook set incl. first-invoice; idempotent grant; reservation release; redemption reserve→commit. **Concurrency: last-credit race, concurrent wellness redemption, €0 confirm, duplicate invoices same period, dashboard refund, dispute, out-of-order webhooks.** Target ≥80%.

## Risks
- Broken dev migration → use diff-from-live + `migrate deploy`.
- Schema is the conflict hotspot → land Phase 0 fast, freeze field names once published.
