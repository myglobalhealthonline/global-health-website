# Subscription, Card Saving, Admin Authority & Claim Flow — Review & Fix Plan

**Date:** 2026-06-22
**Branch reviewed:** `main` (subscription work from `feat/subscriptions` is already merged)
**Scope:** Patient subscription visibility, Stripe card/payment-method handling, recurring renewal behavior, admin authority over credits/wellness, wellness-credit claim/redemption flow, checkout subscription selection, and required tests.
**Status of doc:** Investigation complete. This is a review + targeted fix plan. **No code changed.**

---

## 0. Executive Summary (read this first)

The subscription system is **far more complete than the brief assumes**. The schema, Stripe wiring, webhook-driven renewal/credit engine, redemption flow, and most patient UI are already built and test-covered on `main`. This is **not** a greenfield build — it is a **harden + finish-the-UX** job with two small backend correctness gaps.

The single most important product change requested — *"admins should not be able to freely edit a user's earned balances"* — is **partially in place** (the endpoint is already super-admin-gated) but **not fully separated**: plan-rule configuration and manual balance adjustment share the **same** permission gate, the adjust form is exposed on the main admin subscriptions page, and manual adjustments take a fixed enum reason instead of a required free-text justification. That is the headline fix.

### Status at a glance

| # | Area | Built? | Verdict |
|---|------|--------|---------|
| 1 | Patient subscription visibility | ~95% | Endpoints + UI exist. Fix PAUSED invisibility, add credit-history view, surface paid-months. |
| 2 | Card saving / no local card storage | 100% | **PASS.** `mode:'subscription'`, zero card fields stored, billing portal live, webhook signature verified. No security work needed. |
| 3 | Recurring renewal & credit grants | ~100% | Snapshot-based reset, idempotent, PAST_DUE-safe, invoice mirror, reminder cron. Verify the cron is actually scheduled; add/confirm tests. |
| 4 | Admin authority over credits/wellness | ~60% | **MAIN WORK.** Split plan-config vs balance-adjust permissions; require free-text reason; hide adjust UI behind dedicated gate; expose ledger provenance. |
| 5 | Claim / redemption flow | ~95% | Reserve/commit/release all work. Add country eligibility + `async_payment_failed` release handler. |
| 6 | Checkout subscription selection | ~40% | **MAIN WORK (UX).** Backend pricing/credit auto-apply exists; no plan choice, coverage badge, savings preview, or guest prompt at checkout. |
| 7 | Tests | partial | Renewal/idempotency/redemption covered. Add admin-permission, price-preview, country-eligibility, async-fail tests. |

### What does NOT need work
- **No card data is stored anywhere.** Confirmed scan: no `cardNumber`/`cvv`/`cvc`/`expiry`/`pan`/`last4` columns. Only Stripe references (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `stripeInvoiceId`, `hostedInvoiceUrl`, `pdfUrl`).
- Subscription checkout already uses Stripe **`mode: 'subscription'`** → Stripe saves the card for recurring billing.
- **Billing portal** already exists at `GET /api/me/subscription/portal`.
- Renewal already resets credits from the **plan snapshot** (not the live plan), and **never grants credits on failed payment**.

### Verification log (2026-06-22, claims re-checked directly against code)

Every P0 claim below was confirmed by reading the source, not just subagent reports:

| Claim | Verdict | Evidence |
|-------|---------|----------|
| PAUSED subs invisible | **CONFIRMED** | `subscription-read.service.ts:28` filters `status in [ACTIVE,PAST_DUE,INCOMPLETE,CANCELED]` — PAUSED omitted. |
| Plan-config & adjust-credits share one gate | **CONFIRMED** | `admin-subscriptions.route.ts:43` and every route in `admin-plans.route.ts` (lines 57,70,83,107,137,159,185,197,225) use `requireManageSubscriptions`. |
| Manual adjust has no free-text reason | **CONFIRMED** | `admin-plans.schema.ts:200` `adminAdjustCreditsBodySchema` = `{kind, delta, reason:enum[ADJUSTMENT,CLAWBACK], requestId}`; route passes no note (`admin-subscriptions.route.ts:52`). Ledger models have no `note` column. |
| No price-preview endpoint | **CONFIRMED** | No `price-preview`/`coverage`/`dry-run` route in `backend/src` (only unrelated test files match). |
| Redemption country unvalidated | **CONFIRMED** | `redemption.service.ts:239` stores `shipCountryCode` uppercased but no guard compares it to sub/kit country; no `NOT_ELIGIBLE_COUNTRY` reason. |
| Redemption async-fail not released | **CONFIRMED (sharpened)** | Success (`completed`/`async_payment_succeeded`) commits at `payments.route.ts:321-325`; expiry releases at `:438-441`; the **`async_payment_failed` branch `:480` handles appointments only** — no `kind:'redemption'` release. |
| Renewal cron scheduling | **SHARPENED** | See §3 — route exists + token-gated, but the schedule is external (Railway), not in the repo. |

### Implementation status (2026-06-22, branch `feat/subscription-p0-hardening`)

P0 core **implemented + verified** (backend/frontend typecheck clean; schema, new-auth, redemption, and admin-plans route tests green):

- ✅ **§1a** PAUSED now visible — added `PAUSED` to the read-service status filter (`subscription-read.service.ts`). Frontend already mapped the PAUSED label.
- ✅ **§5b** Redemption released immediately on `checkout.session.async_payment_failed` (`payments.route.ts`).
- ✅ **§5a** (re-scoped) Defensive kit/plan **country-integrity** assert in `startRedemption` — kit must belong to the plan's country. NOT a shipping-address restriction (that would break legitimate gift shipping), so the brief's "country not eligible" *list reason* was intentionally not added (plan-scoping makes a foreign kit unreachable in the list anyway).
- ✅ **§4 (single admin tier — corrected 2026-06-22).** This deployment has only 3 roles (admin, doctor, patient); "super admin" == admin. So balance-adjustment authority is **not** separated by a non-existent SUPER scope — it is gated at the **admin** tier and protected by **friction** instead:
  - **§4a** `requireManageSubscriptions` was relaxed to grant on **any authenticated admin** (it previously required `SUPER_ADMIN`/`adminScope==='SUPER'`, which would have locked out every real admin). The same guard now covers plan config, rules, perks, the subscriber list, **and** manual adjustment — one admin tier. The earlier `manage-subscription-adjustments-auth.ts` SUPER-scope module was **removed**.
  - **§4b** Manual adjustment still requires a mandatory free-text `note` (min 8 chars), persisted to the audit metadata.
  - **§4c** Per-row inline adjust forms removed from the table; replaced by a single de-emphasized **"Support override"** panel (required reason + confirm step + audit). `GET /api/admin/subscriptions` returns `capabilities.canAdjustCredits` (currently always `true` for admins — kept so the UI can re-gate if tiers are ever introduced).
  - **The "admins shouldn't freely edit balances" control is therefore friction + audit, not a role gate** — the only achievable model with a single admin tier. If a stricter lock is wanted later, options are master-token-only or an env-flag toggle (see §8 D-1).

### P1 status (2026-06-23)

- ✅ **§1b + §4d (patient provenance) — DONE.** Patient dashboard now renders a **Recent credit activity** list from the already-fetched `/api/me/credits` ledger, with a data-driven label per reason (Monthly credits / Previous month reset / Reserved / Used for consultation / Redeemed for kit / Released back / **Manual adjustment** / Clawed back), a kind icon (GP vs wellness), signed delta, and date. So a manual admin adjustment is always visible to the patient. New i18n keys added to all 6 locales (en authored; others mirror en pending translation — no per-key fallback exists). Helpers `creditReasonLabel`/`formatCreditDelta` unit-tested.
- ✅ **§1c — DONE.** "Member for N paid months" shown on the dashboard plan card (data-driven from `paidMonthsCount`).
- ✅ **§3a — RESOLVED by prior commit `0c068e21`** (`internal-scheduler.ts` ticks sweep+cancel-grace 5 m, reconciliation hourly, renewal reminders 24 h in-process; the token-gated `/api/cron/subscriptions[/daily]` HTTP endpoints remain for an external scheduler). No operator cron strictly required for the jobs to run.

- ✅ **§6a/§6b/§6d — DONE (2026-06-23).** Read-only `previewConsultationPricing` (sibling of `reserveAndPriceConsultations`, reuses the pure `resolveConsultationPrice`, reserves NOTHING) + new `GET /api/me/cart-preview`. Peak-price recompute extracted to a shared `computeEffectivePrices` (used by both checkout and preview, so the preview can't drift from the charge). Cart page now shows a **PlanCoverage** panel: per-consultation badge (Included €0 / Plan discount / Not covered), total saved, and credits-left — for subscribers; a **login prompt** for guests (401); a **subscribe-&-save upsell** for logged-in non-subscribers. Coverage i18n added to all 6 locales. Tests: 2 new preview cases prove dry-run (counter untouched) + NOT_COVERED.

- ✅ **§4d admin-side — DONE (2026-06-23).** New `GET /api/admin/subscriptions/:id/ledger` (reuses the patient credits read model) + a lazy per-subscriber **"View activity"** expander in the admin subscriptions table, with the same reason labels (incl. **Manual adjustment**). An admin can now see how a balance was reached and that an override was recorded.

Remaining (P2, by choice):
- **§6c** subscribe-in-funnel ("subscribe then return to checkout") — deferred P2; the cart upsell links to the membership/subscribe page instead.

**All P0 + P1 from this review are now complete.** Only the P2 in-funnel subscribe upsell and translation of the new en-authored i18n keys remain.

---

## 1. Patient Subscription Visibility

### Requirement
Logged-in patient clearly sees active plan, status (active/incomplete/past-due/cancelled/paused), monthly price, next billing date, paid months, cancel-at-period-end, pending plan change, remaining consultation credits, wellness balance, perks (eligible/locked), and kit redemption progress — via `GET /api/me/subscription`, `GET /api/me/credits`, `GET /api/me/redemptions`.

### What exists (evidence)
- **`GET /api/me/subscription`** — `backend/src/routes/me-subscription.route.ts:64` → `subscription-read.service.ts:26`. Returns plan{name,price,currency}, status, currentPeriodEnd, paidMonthsCount, cancelAtPeriodEnd, pendingChange{planName,effectiveAt}.
- **`GET /api/me/credits`** — `backend/src/routes/me-credits.route.ts:13` → `credits-read.service.ts:20`. Returns consultation{balance,usedThisPeriod}, wellness{balance}, and a 50-row merged ledger (kind/deltaCredits/reason/createdAt).
- **`GET /api/me/redemptions`** — `backend/src/routes/me-redemptions.route.ts:49` → `redemption.service.ts:54`. Returns per-kit {name, requiredWellnessCredits, progress, eligible, reason}.
- **`GET /api/me/invoices`** (bonus) — `backend/src/routes/me-invoices.route.ts:13`. Hosted invoice + PDF links.
- **UI:** account dashboard `frontend/app/(auth)/account/_components/SubscriptionDashboard.tsx:29` (plan card, consultation credits, wellness progress, perks locked/unlocked); membership `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx:59` (status pill, price, next billing, cancel notice, pending change, plan switch, manage-billing); rewards `…/account/rewards/_components/RewardsPanel.tsx`; payments `…/account/payments/page.tsx`.

### Gaps
1. **PAUSED subscriptions are invisible.** The read service filters `status IN ["ACTIVE","PAST_DUE","INCOMPLETE","CANCELED"]` (`subscription-read.service.ts`), but the enum includes `PAUSED` (`schema.prisma:2916`). A paused subscriber sees "no subscription." The brief explicitly lists *paused* as a status to display.
2. **No credit-history / provenance view.** `GET /api/me/credits` already returns the ledger, but no UI renders it. Item 4 requires showing whether credits were **earned / redeemed / consumed / released / clawed back / manually adjusted** — this is the surface for it.
3. **`paidMonthsCount` not shown as a stat** (only used internally to compute perk unlock). Minor.
4. **Status → friendly-label map is incomplete** for all 5 states (esp. PAUSED and INCOMPLETE messaging: "finish payment to activate").

### Fix tasks
- [ ] **1a** Add `PAUSED` to the read-service status filter and return a `paused`-specific view; map all 5 statuses to friendly labels + guidance copy. *(backend `subscription-read.service.ts`, frontend status pill + dashboard)*
- [ ] **1b** Build a **Credit Activity** list (consultation + wellness) on `/account/credits` (or a tab on the dashboard) rendering the existing `/api/me/credits` ledger with a human label per reason. *(frontend only; backend already returns data)*
- [ ] **1c** Surface `paidMonthsCount` ("Member for N paid months") on the membership page. *(frontend)*
- [ ] **1d** Show INCOMPLETE call-to-action ("complete checkout") linking to the hosted Stripe session / resubscribe. *(frontend)*

---

## 2. Card Saving & Recurring Payments — **PASS**

### Requirement
Never store card details locally; admin never sees full card data. Card saved in Stripe only; DB holds only safe references. Subscription checkout must use `mode:'subscription'`. Billing portal at `GET /api/me/subscription/portal`. Admin sees only safe billing info (status, plan, period, payment status, invoice link, optionally brand/last4 from Stripe).

### What exists (evidence)
- **Checkout mode** — `backend/src/modules/billing/billing.stripe.ts:78` → `mode: "subscription"` (SCA + off-session mandate handled by Stripe). One-time `mode:'payment'` is used only for orders/shipping, never subscriptions.
- **Customer creation** — `billing.stripe.ts:59` `findOrCreateCustomer` stores **only** email/name in Stripe; persists `stripeCustomerId` on `PatientProfile` and `UserSubscription`.
- **Billing portal** — `me-subscription.route.ts:128` `GET /api/me/subscription/portal` → `billing.stripe.ts:93` `billingPortal.sessions.create`. `returnTo` is regex-validated (no open redirect).
- **Card-data scan — PASS.** No `cardNumber`/`cvv`/`cvc`/`expiry`/`pan`/`last4`/`brand` (card) fields in schema or code. Stored references only: `stripeCustomerId` (`schema.prisma:1382`, `:3076`), `stripeSubscriptionId` (`:3075`), `stripePriceId` (`:893`,`:3079`), `stripeProductId` (`:892`), `stripeInvoiceId`/`hostedInvoiceUrl`/`pdfUrl` (`:3212`–`:3219`).
- **Admin billing view** — `admin-subscriptions.service.ts:14` exposes user email/name, plan, credit balances. **No** payment method, brand, or last4.
- **Webhook** — `payments.route.ts:239` verifies `stripe.webhooks.constructEvent` against `STRIPE_WEBHOOK_SECRET`; 10 subscription events handled.

### Gaps
- **None required.** The architecture already satisfies the rule.

### Optional enhancements (P2, not required)
- [ ] **2a** Surface **card brand + last4** by fetching the default payment method **live from Stripe** (never persisted) on the membership page and admin detail, purely for convenience. Read-only, on-demand. Keep "Manage card" pointing at the billing portal.
- [ ] **2b** Confirm the "Manage billing / update card" button is visible for ACTIVE **and** PAST_DUE subscribers (PAST_DUE is exactly when they need to fix their card).

---

## 3. Recurring Monthly Subscription Behavior — essentially complete

### Requirement
First paid invoice activates + grants month-one credits. Each renewal: update status, period dates, increment paidMonths, reset consultation credits from snapshot, grant wellness only if snapshot allows, unlock perks at threshold, write invoice row. Failed payments grant **no** credits; PAST_DUE keeps current-period benefits until period end; redemptions require active subscription.

### What exists (evidence)
- **Webhook router** — `subscription-webhook.service.ts:36` (checkout.completed, subscription.created/updated/deleted, invoice.payment_succeeded/failed, action_required, finalization_failed, charge.refunded, dispute.created).
- **Activation + renewal grant** — `subscription-grant.service.ts:99-212`: sets `ACTIVE`, `currentPeriodStart/End`, `paidMonthsCount+1`, re-captures snapshot at cycle boundary (`:145`), grants from `snapshot.monthlyConsultationCredits` (`:155`).
- **Consultation reset from snapshot** — `credit-balance.service.ts:273` writes `RESET_EXPIRE` of prior balance then grants the new month. Wellness is additive and only when `wellnessCredits>0` (`:309`).
- **Perk unlock** — `syncPerkGrants` (`subscription-grant.service.ts:39`) honors `MONTH_1` / `AFTER_PAID_MONTHS`.
- **Invoice mirror** — `subscription-webhook.service.ts:232` `writeSubscriptionInvoice`.
- **Failed payment** — `onInvoiceFailed` (`:314`) sets `PAST_DUE`, grants nothing; eligibility (`subscription-eligibility.ts:30`) keeps PAST_DUE benefits until `currentPeriodEnd`.
- **Idempotency** — exact event dedupe via `processedWebhookEvent` (`:66`) + period-keyed ledger `idempotencyKey` (`credit-balance.service.ts:251`).
- **Renewal reminder** — `cron-subscriptions.route.ts:56` + `ops/sweep.service.ts:105` `sendDueRenewalReminders` (3-day window, ACTIVE, not cancel-at-period-end).

### Gaps
1. **The cron schedule is NOT in the repo — it must be configured externally (Railway).** Verified: `cron-subscriptions.route.ts` exposes **two** token-gated endpoints (`X-Cron-Token` must equal `CRON_SECRET`; **fails closed** with 503 if `CRON_SECRET` is unset):
   - `POST /api/cron/subscriptions` — **every ~5 min**: reservation sweep + cancel-after-grace.
   - `POST /api/cron/subscriptions/daily` — **once a day**: renewal reminders (24-h dedup; running more often double-sends).
   No scheduler is committed anywhere — `nixpacks.toml` builds the frontend only, `frontend/railway.toml` is frontend, and there is no `.github/workflows` cron. So both jobs only run if a Railway-dashboard cron (or equivalent) is hitting them with the secret. **This cannot be verified from code — an operator must confirm both crons exist with the right cadence and `CRON_SECRET` is set.**
2. **No automated proof for "renewal increments paidMonths and resets, not double-grants"** beyond existing unit tests — extend the test matrix (§7).

### Fix tasks
- [ ] **3a** Confirm/create the external (Railway) scheduler for **both** endpoints — `/api/cron/subscriptions` at ~5 min and `/api/cron/subscriptions/daily` once daily — each sending `X-Cron-Token: $CRON_SECRET`. Verify `CRON_SECRET` is set in the backend service env (route fails closed otherwise). Document the chosen cadence in the repo (e.g. an ops note) so it isn't invisible.
- [ ] **3b** Add the renewal/failed-payment integration tests listed in §7 if not already green.

---

## 4. Admin Authority Over Credits & Wellness — **MAIN WORK**

### Requirement
Admins configure **plan rules** (monthly consultation credits, whether a plan earns wellness, wellness-per-paid-month, redeemable kits, credits-per-kit, included/discounted services). Admins must **not** freely edit a specific user's earned balance as normal functionality. The existing `adjustCredits(...)` must be a restricted **support/finance override** only: hidden from normal admin UI, gated behind a dedicated high permission (`MANAGE_SUBSCRIPTION_ADJUSTMENTS` or Super-Admin), **reason required**, **audit-logged**. UI must label whether credits were earned/redeemed/consumed/released/clawed-back/manually-adjusted. Source of truth stays `SubscriptionCreditBalance`; ledgers stay append-only.

### What exists (evidence)
- **Plan-rule config (legitimate powers):** plan CRUD `admin-plans.route.ts:82`; consultation rules `admin-plan-rules.route.ts:56`; perk rules `:118`; health-test redemption rules `:180`. All audited (`PLAN_*`, `PERK_RULE_SET`).
- **Manual adjustment (the risky power):** `POST /api/admin/subscriptions/:id/adjust-credits` (`admin-subscriptions.route.ts:42`) → `admin-subscriptions.service.ts:72` → `credit-balance.service.ts:418` `adjustCredits`. Floors balance at 0, writes ledger reason `ADJUSTMENT`/`CLAWBACK`, idempotent on `requestId`, audited (`CONSULTATION_CREDIT_GRANTED/CLAWED_BACK`, `WELLNESS_CREDIT_EARNED/CLAWED_BACK`).
- **Permission gate:** **one** gate, `requireManageSubscriptions` (`manage-subscriptions-auth.ts:85`), granting on `role===SUPER_ADMIN` OR `adminScope===SUPER` OR master-token fallback. It guards **both** plan CRUD **and** adjust-credits.
- **Ledger reasons exist:** `ConsultationLedgerReason` = MONTHLY_GRANT, RESET_EXPIRE, RESERVED, CONSUMED, RELEASED, **ADJUSTMENT**, **CLAWBACK** (`schema.prisma:2935`); `WellnessLedgerReason` = MONTHLY_EARN, RESERVED, REDEEMED, RELEASED, **ADJUSTMENT**, **CLAWBACK** (`:2945`).
- **UI exposure:** the adjust form renders inline for **every** subscriber row at `frontend/app/(admin)/admin/subscriptions/page.tsx:204` (kind/delta/reason + "confirm?" only).

### Problems (precise)
1. **No separation of duties.** Plan-rule configuration and per-user balance adjustment require the *exact same* SUPER gate. The brief wants plan config to be a **normal admin** power and balance adjustment to be a **dedicated, higher** power. Today, either everyone with SUPER can do both, or nobody can configure plans.
2. **Reason is a 2-value enum, not a justification.** `reason ∈ {ADJUSTMENT, CLAWBACK}` — there is **no required free-text reason**. The brief requires every manual adjustment to carry a reason.
3. **Adjust UI is front-and-center**, one click from any subscriber row. The brief wants it hidden from normal admin functionality.
4. **No provenance display** of how a balance came to be (ties to §1b).

### Fix tasks
- [ ] **4a — Introduce a dedicated adjustment permission.** Add `MANAGE_SUBSCRIPTION_ADJUSTMENTS` as a distinct gate, **stricter** than `MANAGE_SUBSCRIPTIONS`. Recommended mapping: plan-rule config → `MANAGE_SUBSCRIPTIONS` (can be widened to GLOBAL admins later); manual adjustment → `adminScope===SUPER` **only** (drop the role-only and consider dropping the dev token fallback in prod). New guard `requireManageSubscriptionAdjustments` mirroring `manage-subscriptions-auth.ts`. *(backend)*
- [ ] **4b — Require a free-text reason.** Extend `adminAdjustCreditsBodySchema` with `note: z.string().trim().min(8).max(500)`; persist it on the ledger row (add `note String?` to `ConsultationCreditLedger` + `WellnessCreditLedger`, or store in the audit `metadata`). Keep the `ADJUSTMENT`/`CLAWBACK` enum as the *category*. *(backend + migration)*
- [ ] **4c — Move the adjust form out of the main page.** Remove the inline per-row form; put manual adjustment behind a separate **"Support override"** panel/route visible only when the caller holds `MANAGE_SUBSCRIPTION_ADJUSTMENTS`, with an explicit confirmation that restates user, kind, delta, and the typed reason. Normal admins see read-only balances. *(frontend admin)*
- [ ] **4d — Provenance everywhere.** Render the ledger reason as a labelled tag (Earned / Reset / Reserved / Consumed / Released / **Manually adjusted** / Clawed back) in both the admin subscriber detail and the patient credit-activity view (§1b). Manual rows show the actor + reason. *(frontend both surfaces; data already present in audit + ledger)*
- [ ] **4e — Keep invariants.** Confirm `SubscriptionCreditBalance` remains the only spend authority and ledgers stay append-only (already true — `credit-balance.service.ts`). No regression.

> **Decision needed (D-1):** dedicate via a new permission/scope check **only** (fast, no schema change) vs. a real RBAC permission row. Given there is no permission table today (it's role+scope), the scope-based guard in **4a** is the lighter path. See §8.

---

## 5. Claim / Redemption Flow for Wellness Points — ~95%

### Requirement
Active plan + enough wellness credits → clear Claim/Redeem action. Show balance, eligible kits, progress ("4/6 collected"), Claim button when eligible, reason when not (insufficient / locked perk / inactive sub / country not eligible / out of stock). On claim: reserve credits + stock; if shipping required → Stripe checkout for shipping only; if free → complete immediately; on success → APPROVED; on fail/abandon → release credits + stock.

### What exists (evidence)
- **`GET /api/me/redemptions`** — `redemption.service.ts:54` returns name, requiredWellnessCredits, progress, eligible, reason (`INSUFFICIENT_CREDITS`/`OUT_OF_STOCK`/`NOT_ELIGIBLE`).
- **`POST /api/me/redemptions`** — `redemption.service.ts:140` `startRedemption`: eligibility gate (`subscription-eligibility.ts:41` ACTIVE-only, PAST_DUE blocked for redemptions), atomic **stock decrement** (`:183` `WHERE stock>=1`), **wellness reserve** (`:206` ledger `RESERVED`, 15-min TTL), creates €0 kit Order + shipping line (`:221`).
- **Shipping path** — if `shippingCents>0` → Stripe `mode:'payment'` for shipping only (`:272`, metadata `kind:'redemption'`); if `0` → `commitRedemption` immediately → `APPROVED` (`:266`).
- **Commit / release** — webhook success `payments.route.ts:317` → `commitRedemption` (`redemption.service.ts:312`, RESERVED→REDEEMED, Order PAID, audit `WELLNESS_CREDIT_REDEEMED` + `HEALTH_TEST_REDEEMED`); expiry `payments.route.ts:429` → `releaseRedemption` (`:368`, restore credits+stock, status CANCELED). Orphan **sweep** in `ops/sweep.service.ts`.
- **Frontend** — `RewardsPanel.tsx` renders balance, progress bar, eligibility messaging, Claim button, shipping form, Stripe redirect, success/cancelled banners.

### Gaps
1. **Country eligibility not enforced.** `startRedemption` accepts any `shipCountryCode` with no check that the kit/sub country matches; `listRedemptions` has no country reason. Kits are *implicitly* filtered because rules are per-plan/per-country, but the brief lists "country not eligible" as an explicit reason and shipping country is unvalidated. *(`redemption.service.ts`)*
2. **No `checkout.session.async_payment_failed` handler for redemptions.** Verified: the success path (`completed`/`async_payment_succeeded`) commits the redemption at `payments.route.ts:321-325`, and the `expired` path releases it at `:438-441`, but the `async_payment_failed` branch at `:480` only handles legacy appointments (logs "without appointmentId — skipping" at `:491`). On a hard shipping-payment failure, credits/stock therefore stay reserved until the 24-h expiry sweep instead of releasing immediately.
3. **`RedemptionStatus.FULFILLED` is unused** — flow stops at APPROVED; actual dispatch/fulfilment tracking is future scope.

### Fix tasks
- [ ] **5a** Add country eligibility to `listRedemptions` (new reason `NOT_ELIGIBLE_COUNTRY`) and validate `shipCountryCode` against the subscription country / kit availability in `startRedemption`. *(backend)*
- [ ] **5b** Add an `async_payment_failed` branch in the webhook for `kind:'redemption'` → `releaseRedemption(redemptionId)`. *(backend `payments.route.ts`)*
- [ ] **5c** *(optional)* Wire `FULFILLED` + a tracking field when fulfilment/dispatch is built. *(future)*

---

## 6. Subscription Selection at Checkout — **MAIN WORK (UX)**

### Requirement
At checkout/booking the user can: continue pay-as-you-go; select a plan before checkout; subscribe first then apply benefits; see whether the consultation is included/discounted/not-covered; auto-use consultation credits where eligible; see the final price before paying. Guests must log in / create an account before using subscriptions/credits/wellness — guest checkout gets no subscription benefits.

### What exists (evidence)
- **Cart/checkout** — book `frontend/app/(site)/[country]/[lang]/book/page.tsx`; cart `…/cart/page.tsx`; checkout `…/checkout/page.tsx`; backend `cart.route.ts`, `orders.route.ts`.
- **Credit auto-application (server-side) already works** — `orders.route.ts:219` calls `reserveAndPriceConsultations` (`checkout-pricing.service.ts:46`) **only when `userId` is set**: loads active sub, reads balance, looks up `PlanConsultationRule` per service, and prices as CREDIT(€0)/FIXED/PERCENT/NORMAL (`pricing-resolver.ts:55`). Credit-covered lines are filtered out of the Stripe line items.
- **Eligibility** — `isBenefitEligible` (`subscription-eligibility.ts:21`): ACTIVE always; PAST_DUE until period end; CANCELED/INCOMPLETE never.
- **Guest gating (implicit)** — guests resolve `userId=null` (`orders.route.ts:82`) → no subscription pricing; subscribing requires auth (`me-subscription.route.ts` `requirePatient`).

### Gaps (all UX / preview; the pricing engine is done)
1. **No plan selection at checkout/booking.** Subscribing lives entirely in `/account/subscribe`; nothing links booking → subscribe.
2. **No coverage/savings display.** Pricing is computed **inside the order transaction** and never previewed. The user never sees "included with your plan / €0", "20% off with plan", "not covered", remaining credits, or total savings **before** paying.
3. **Guests get normal price silently** — no "Log in to use your plan / credits" prompt, no "Save with a plan" CTA.
4. **No "subscribe first, then apply" path** within the booking funnel.

### Fix tasks
- [ ] **6a — Price-preview endpoint (keystone).** Add `POST /api/cart/price-preview` (or `GET /api/me/cart-coverage`) that runs the existing `reserveAndPriceConsultations` logic in **dry-run** (no reservation, no DB writes) and returns per-line coverage: `{serviceId, mode: INCLUDED|DISCOUNTED|NOT_COVERED|NORMAL, creditsUsed, unitPriceCents, savedCents}` plus totals + remaining credit balance. *(backend — refactor the resolver to a pure pricing function reused by both preview and checkout)*
- [ ] **6b — Render coverage at cart + checkout.** Show per-item badge ("Covered by your plan", "Plan price €X — save €Y", "Not covered by your plan"), remaining credits, and a clear **final price before pay**. *(frontend)*
- [ ] **6c — Plan selection / upsell in the funnel.** On cart/checkout for a non-subscriber: a "Continue pay-as-you-go" vs "Subscribe & save €Y" choice; the latter routes to subscribe then returns to checkout (`returnTo`). *(frontend + reuse existing subscribe flow)*
- [ ] **6d — Guest auth prompt.** When a guest's cart contains a plan-coverable consultation, show "Log in or create an account to use plan benefits/credits." Guest checkout stays available at normal price. *(frontend)*
- [ ] **6e — Idempotent preview vs commit.** Ensure preview never reserves; checkout remains the only path that reserves/commits credits (already true). Guard against preview/commit price drift by recomputing at commit (already done server-side). *(backend test)*

> **Decision needed (D-2):** "subscribe-first-then-apply" mid-checkout (6c) is the most complex UX. Recommend shipping **6a/6b/6d first** (preview + coverage + guest prompt) and treating the in-funnel subscribe upsell (6c) as a fast-follow. See §8.

---

## 7. Required Tests

The brief asks for tests on renewal, failed payments, credit grants, card update, redemption, and admin permission checks. Existing coverage is good for the webhook engine; the new work needs the rest.

| Area | Test | Type | Exists? |
|------|------|------|---------|
| Renewal | invoice.paid (cycle) → status ACTIVE, period rolled, `paidMonthsCount+1`, consultation reset from snapshot, wellness additive | integration | extend |
| Renewal | duplicate invoice (same period, new event id) → no double grant, no paidMonths bump | integration | partial (idempotency tests exist) |
| Failed payment | invoice.payment_failed → PAST_DUE, **no** credits; benefits valid until `currentPeriodEnd`, then blocked | integration | extend |
| Credit grant | first invoice → month-one credits + ACTIVE; INCOMPLETE before payment grants nothing | integration | extend |
| Card update | `GET /api/me/subscription/portal` returns a portal URL; `returnTo` validated; available for ACTIVE + PAST_DUE | unit/integration | add |
| Redemption | free kit → immediate APPROVED; paid shipping → Stripe session, success commits (RESERVED→REDEEMED), expiry releases (credits+stock restored) | integration | partial |
| Redemption | **country not eligible** → blocked; **async_payment_failed** → released | integration | **add (new gaps 5a/5b)** |
| Admin perms | plan-rule config allowed for `MANAGE_SUBSCRIPTIONS`; **adjust-credits forbidden** unless `MANAGE_SUBSCRIPTION_ADJUSTMENTS`/SUPER; reason required; audit row written | unit/integration | **add (new 4a/4b)** |
| Price preview | dry-run preview matches checkout pricing; preview makes **no** reservation/writes; covered line = €0 | integration | **add (new 6a)** |
| Visibility | PAUSED subscription is returned and labelled | unit | **add (new 1a)** |

Coverage target: keep ≥80% on touched modules (`subscription-*`, `redemption.service`, `checkout-pricing.service`, `manage-subscription*-auth`).

---

## 8. Open Decisions (need your call)

- **D-1 — Adjustment gating mechanism (§4a).** Recommend a scope-based guard (`adminScope===SUPER` only) since the repo has no permission table — fast, no schema churn. Alternative: build a real RBAC permission row (`MANAGE_SUBSCRIPTION_ADJUSTMENTS`) — more work, more future-proof. **Recommendation: scope-based now.**
- **D-2 — Checkout subscribe depth (§6c).** Ship preview + coverage + guest prompt (6a/6b/6d) first; treat in-funnel "subscribe then return" as a fast-follow. **Recommendation: phase it.**
- **D-3 — Plan-config audience.** Should *normal* admins (GLOBAL scope) be able to configure plan rules, or stay SUPER-only as today? The brief implies normal admins should. If yes, widen `requireManageSubscriptions` for plan-rule routes while keeping adjustments SUPER-only.
- **D-4 — Card brand/last4 surfacing (§2a).** Show it (extra Stripe read on each page load) or leave card management entirely inside the billing portal? **Recommendation: optional, P2.**
- **D-5 — Dev master-token fallback.** Should the master admin token still satisfy adjustment auth in production? **Recommendation: disable token fallback for adjustments in prod.**

---

## 9. Suggested Execution Order

**P0 — correctness & the headline product fix**
1. §4a–4d Admin authority separation (dedicated gate, required reason + migration, hide UI, provenance tags).
2. §5a–5b Redemption country eligibility + `async_payment_failed` release.
3. §1a PAUSED visibility fix.
4. §3a Confirm renewal cron is scheduled in prod.

**P1 — finish the patient & checkout UX**
5. §6a Price-preview endpoint (refactor resolver to pure function).
6. §6b/§6d Coverage badges + final-price display + guest prompt.
7. §1b Credit-activity (ledger) view; §1c paid-months.
8. §7 Fill the test matrix for everything above.

**P2 — enhancements**
9. §6c In-funnel subscribe upsell.
10. §2a Card brand/last4 surfacing.
11. §5c Redemption `FULFILLED`/dispatch tracking.

---

## 10. Key File Map (for implementers)

**Backend**
- Stripe primitives: `backend/src/modules/billing/billing.stripe.ts`
- Subscribe / portal / change / cancel: `backend/src/modules/subscriptions/subscription.service.ts`, routes `backend/src/routes/me-subscription.route.ts`
- Webhook engine: `backend/src/modules/subscriptions/subscription-webhook.service.ts`, grant `…/subscription-grant.service.ts`, eligibility `…/subscription-eligibility.ts`
- Credits: `backend/src/modules/credits/credit-balance.service.ts` (incl. `adjustCredits`), read `…/credits/credits-read.service.ts`
- Redemption: `backend/src/modules/subscriptions/redemption.service.ts`, webhooks in `backend/src/routes/payments.route.ts`
- Checkout pricing: `backend/src/modules/subscriptions/checkout-pricing.service.ts`, `…/pricing-resolver.ts`, order route `backend/src/routes/orders.route.ts`
- Admin: `backend/src/routes/admin-subscriptions.route.ts`, `…/admin-plans.route.ts`, `…/admin-plan-rules.route.ts`; auth `backend/src/utils/manage-subscriptions-auth.ts`
- Cron/sweep: `backend/src/routes/cron-subscriptions.route.ts`, `backend/src/modules/subscriptions/ops/sweep.service.ts`
- Schema + enums: `backend/prisma/schema.prisma` (PricingPlan `:853`, subscription models `:3068`+, enums `:2905`+)

**Frontend**
- Dashboard: `frontend/app/(auth)/account/_components/SubscriptionDashboard.tsx`
- Membership: `frontend/app/(auth)/account/membership/_components/ManagePanel.tsx`
- Rewards/claim: `frontend/app/(auth)/account/rewards/_components/RewardsPanel.tsx`
- Payments: `frontend/app/(auth)/account/payments/page.tsx`
- Admin subscriptions: `frontend/app/(admin)/admin/subscriptions/page.tsx`
- API clients: `frontend/lib/api/me-subscription.ts`, `…/me-subscription-server.ts`
- Checkout/cart/book: `frontend/app/(site)/[country]/[lang]/{checkout,cart,book}/page.tsx`
