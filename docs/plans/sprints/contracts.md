# Sprint Contracts — shared interface surface (single source for parallel agents)

> Pin point between Sprint 1 (produces) and Sprints 2/3 (consume). **Changing a published contract requires notifying the other sprints.** Schema field names are frozen once Sprint 1 Phase 0 merges — see master plan §20.

## Coordination map

```
Sprint 1 (backend money/schema) ──Phase 0 schema────► UNBLOCKS Sprint 2 + Sprint 3
        │                          (day 1, exclusive)
        ├─ billing.syncPlanStripePrice() ───────────► Sprint 2 (admin plan save)
        └─ /api/me/* (subscription, credits, redeem) ─► Sprint 3 (patient UI)
```

Sync points:
1. **Phase 0 merged** → 2 & 3 may import the Prisma client.
2. **`billing` module published** → Sprint 2 swaps its mock for the real Price-sync.
3. **`/api/me/*` published** → Sprint 3 swaps its mock client for real.

---

## Backend module contract (Sprint 1 → Sprint 2)

```ts
// backend/src/modules/billing
syncPlanStripePrice(planId: string): Promise<{ stripeProductId: string; stripePriceId: string }>
// Creates Product (once) + Price; on amount change creates a NEW Price, archives old,
// updates plan.stripePriceId, writes PlanStripePrice. Throws on Stripe failure (caller must surface).

// backend/src/modules/credits  (Sprint 2 manual adjust calls this so the counter stays authoritative)
adjustCredits(input: { userSubscriptionId: string; kind: 'CONSULTATION'|'WELLNESS'; delta: number; reason: 'ADJUSTMENT'|'CLAWBACK'; idempotencyKey: string; actorAdminId: string }): Promise<{ balance: number }>
```

## Patient REST contract (Sprint 1 → Sprint 3)

| Route | Response (shape) |
|---|---|
| `GET /api/me/subscription` | `{ plan, status, currentPeriodEnd, paidMonthsCount, cancelAtPeriodEnd, pendingChange?: { planName, effectiveAt } }` |
| `POST /api/me/subscription` | `{ checkoutUrl }` (Stripe `mode:"subscription"`) |
| `POST /api/me/subscription/change` | `{ pendingChangeEffectiveAt }` |
| `POST /api/me/subscription/cancel` | `{ status, currentPeriodEnd }` |
| `GET /api/me/subscription/portal` | `{ portalUrl }` |
| `GET /api/me/credits` | `{ consultation: { balance, usedThisPeriod }, wellness: { balance }, ledger: [...] }` |
| `GET /api/me/redemptions` | `{ kits: [{ healthTestId, name, requiredWellnessCredits, progress, eligible, reason? }] }` |
| `POST /api/me/redemptions` | `{ redemptionId, checkoutUrl?, status }` (checkoutUrl absent when `shippingCents=0`) |

Envelope: existing repo pattern `{ data, error, meta }`. All require auth (D15). Error codes: `NOT_ELIGIBLE`, `INSUFFICIENT_CREDITS`, `OUT_OF_STOCK`, `NO_ACTIVE_SUBSCRIPTION`.

## Admin REST (Sprint 2, listed for Sprint 1/3 awareness)
`/api/admin/plans*`, `/api/admin/plans/:id/consultation-rules|perks|health-test-rules|translations`, `/api/admin/subscription-perk-grants*`, `/api/admin/subscriptions*`. All gated by `MANAGE_SUBSCRIPTIONS`, audited.

## Ops health (Sprint 1 → Sprint 2 panel, §39)
`GET /api/admin/subscription-health` → `{ lastReconciliationAt, drift: [{ subscriptionId, field, db, stripe }], invariantAlerts: [{ subscriptionId, kind, detail }], priceSyncFailures: [...] }`. Read-only; Sprint 2 renders it.

## planSnapshot JSON (frozen shape — §36.16)
`{ snapshotVersion, monthlyPriceCents, currencyCode, monthlyConsultationCredits, wellnessCreditsPerMonth, familyEnabled, consultationRules: [{ serviceId, isIncluded, usesCredits, creditsPerUse, discountMode, discountPercent, fixedPriceCents, unlockAfterPaidMonths, familyUsable }], perkRules: [{ perkKey, unlockMode, unlockAfterPaidMonths }], healthTestRules: [{ healthTestId, requiredWellnessCredits, unlockAfterPaidMonths }] }`

## Status enum (shared)
`UserSubscription.status`: `INCOMPLETE | ACTIVE | PAST_DUE | CANCELED | PAUSED`. Benefits eligible when `ACTIVE`, or `PAST_DUE`/`cancelAtPeriodEnd` while `now < currentPeriodEnd` (§21). Redemption requires `ACTIVE` (incl. `cancelAtPeriodEnd` in-period), not `PAST_DUE` (D6).
