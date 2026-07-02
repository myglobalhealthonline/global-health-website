# My Global Health — Monthly Subscription Plans & Super Admin Management Plan

## 1. Purpose

Create a flexible monthly subscription plan system where the Super Admin can manage:

- Plan prices
- Country-specific prices
- GP/general consultation credits
- Included consultations
- Specialist consultation discounts
- Fixed discounted consultation prices
- Wellness credits
- Health test kit redemption rules
- Perks that unlock after 2 paid months

Important: My Global Health offers online/video consultations only. The wording should not suggest physical consultations.

---

## 2. Universal Plan Note

Use this on all pricing cards:

**Selected perks unlock after 2 paid months.**

Use this on detailed plan pages:

> **AMENDED by D25 (2026-07-02):** all plan benefits — GP consultation credits
> AND specialist discounts — unlock from the **2nd successful monthly payment**
> (`PricingPlan.benefitsUnlockAfterPaidMonths`, default 2, snapshot-carried).
> Wellness points earn from the first payment. Existing subscribers are
> grandfathered until their next renewal snapshot. The Month-1 copy below is
> superseded.

~~Core online consultation credits start from Month 1.~~ Plan benefits unlock after your 2nd successful monthly payment. Wellness rewards start immediately.

Tooltip:

This perk becomes available after your second successful monthly payment.

---

## 3. User-Facing Plans

### Essential Care Plan

#### €20 / month

Affordable monthly access to online GP care.

Best for individuals who need occasional online medical support and discounted access to selected specialist consultations.

Includes:

- 1 online GP consultation credit per month
- Secure online/video medical consultation
- Access to general online consultation booking
- Specialist consultations available separately
- Discount available on selected specialist consultations, where applicable
- Selected perks unlock after 2 paid months

---

### Comprehensive Care Plan

#### €39 / month

More monthly GP access for regular healthcare needs.

Designed for members who want more online GP support each month, with added savings on selected specialist care.

Includes:

- 2 online GP consultation credits per month
- Secure online/video medical consultations
- Access to general online consultation booking
- Specialist consultations available separately
- Discount available on selected specialist consultations, where applicable
- Selected perks unlock after 2 paid months

---

### Premium Wellness Care Plan

#### €49 / month

Online care for individuals and families, with added wellness rewards.

A monthly online healthcare plan with more GP consultation credits, specialist savings, and wellness credits toward eligible home health test kits.

> **v1 copy note (D20):** family usage ships in **Wave 5**. Do NOT show the family bullet on the live Premium card until then (or mark it "coming soon"). The line below is the Wave-5 wording, held back for v1.

Includes:

- 3 online GP consultation credits per month
- _(Wave 5)_ Credits can be used by any registered family member, when family is enabled
- Secure online/video medical consultations
- Access to general online consultation booking
- Specialist consultations available separately
- Higher discounts on selected specialist consultations, where applicable
- Earn wellness credits every paid month
- Collect the required wellness credits to redeem eligible health test kits
- Selected perks unlock after 2 paid months

Better blood test wording:

Earn 1 wellness credit each month. Collect 6 wellness credits to redeem 1 General Health Home Blood Test package.

---

## 4. Super Admin Plan Management

The Super Admin should be able to create, edit, activate, deactivate, and reorder plans.

Each plan should include:

- Plan name
- Internal plan code/slug
- Short description
- Long description
- Monthly price
- Currency
- Billing interval
- Country availability
- Active/inactive status
- Display order
- Featured/recommended badge
- Number of GP/general consultation credits
- Specialist discount rules
- Wellness credit rules
- Health test kit redemption rules
- Perk unlock rules
- Plan notes and terms

---

## 5. Country-Specific Rules

Each country can have its own version of the same plan.

Super Admin should be able to manage per country:

- Plan price
- Currency
- Plan availability
- Consultation availability
- Consultation pricing
- Specialist discount percentage
- Fixed discounted consultation price
- Wellness credits earned
- Health test kits available
- Required wellness credits for redemption
- Perk unlock rules

Fallback logic (**revised per D11 — per-country rows, no global/default merge**):

1. Each country's plan row is self-contained — there is no canonical/global plan to fall back to.
2. If a country has no row for a given plan or no `PlanConsultationRule` for a service, that plan/consultation is simply **not offered** in that country (hide it; show "not available in your country" on the pricing page, not a blank page).

---

## 6. Consultation Rules Inside Each Plan

Each plan can have multiple consultations linked to it.

> **Note (D16 — Service-only):** these are not a separate "consultation type" entity. Each is an existing per-country `Service` row (kind `GENERAL`/`SPECIALIST`) that the admin links via `PlanConsultationRule.serviceId`. Nutrition / mental-health / follow-up require their own `Service` rows to exist first. `PRESCRIPTION` services are excluded (D12, §36.11). "Available in all/selected countries" is implicit — a plan is per-country, so it only links Services from its own country (§36.10).

Examples (each must exist as a `Service` row):

- GP consultation
- General consultation
- Specialist consultation
- Mental health consultation
- Nutrition consultation
- Follow-up consultation
- Any future consultation added by admin

For every consultation inside a plan, Super Admin should control:

- Is this consultation included?
- Does it use monthly credits?
- How many credits does it consume?
- Is it discounted?
- Is the discount percentage-based?
- Is the discounted price fixed?
- Is it available from Month 1?
- Does it unlock after 2 paid months?
- Is it available in all countries or selected countries only?
- Can family members use it?

---

## 7. Pricing Logic

The system should support 3 pricing modes:

### 1. Included With Plan Credit

Example:

User has 1 GP credit.
They book a GP consultation.
Final price becomes €0.

### 2. Percentage Discount

Example:

Specialist consultation price: €80
Plan discount: 10%
User pays €72.

### 3. Fixed Discounted Price

Example:

Specialist consultation normal price: €80
Fixed plan price: €60
User pays €60.

Recommended checkout priority:

1. If consultation is included and user has available credits, charge €0.
2. If fixed discounted price is configured, use fixed discounted price.
3. If percentage discount is configured, apply percentage discount.
4. If no discount applies, use normal consultation price.

---

## 8. Monthly Consultation Credits

Super Admin should control:

- Number of GP/general credits per plan
- Which consultations use credits
- Whether credits can be used by family members (Q3=D, per plan; family deferred to Wave 5 — D20)
- Whether credits start from Month 1 or after 2 paid months

> **Fixed by decisions (not admin toggles):** credits **reset every billing month** and **never roll over** (Q1=A) — "whether credits reset / roll over" are not configurable. Reset is anchored to the subscription anniversary (`currentPeriodStart`, D13), executed at grant time (§36.2). Wellness credits are separate and never expire (Q4=A/D13).

Locked behavior:

- ~~GP/general consultation credits start from Month 1.~~ **AMENDED by D25:**
  consultation credits (and all other benefits) unlock from the 2nd paid month
  (`benefitsUnlockAfterPaidMonths`, default 2). Month-1 grants 0 credits (a
  locked credit would be wiped by the month-2 reset before it could be used).
- Credits reset every billing month; unused credits do **not** roll over (Q1=A).
- Credits are issued only after successful payment.
- Specialist consultations are not included unless Super Admin enables them (per-`PlanConsultationRule`).

---

## 9. Selected Perks Unlock After 2 Paid Months

This should apply to all plans.

Admin should be able to mark each benefit as:

- Available from Month 1
- Unlocks after 2 paid months
- Unlocks after custom number of paid months
- Requires manual approval
- Not available on this plan

Examples of perks that may unlock after 2 paid months:

- Specialist consultation discounts
- Family member usage
- Wellness credit redemption
- Health test kit redemption
- Premium member perks
- Higher discount tiers

---

## 10. Wellness Credits

Wellness credits must be separate from consultation credits.

Wellness credits should only apply to health test kits.

Super Admin should manage:

- Whether a plan earns wellness credits (Premium-only by config — D12)
- Number of wellness credits earned per successful monthly payment
- When credits are issued
- ~~Whether credits expire~~ — **fixed: wellness credits never expire (Q4=A/D13)**, not a toggle; they only decrement on redemption
- Which health test kits are redeemable
- How many credits are required per health test kit
- Whether redemption unlocks after 2 paid months

Recommended Premium setup:

- User earns 1 wellness credit per successful monthly payment.
- User needs 6 wellness credits to redeem 1 General Health Home Blood Test package.
- Wellness credits can only be used for eligible health test kits.
- Wellness credits cannot be used for GP or specialist consultations.

---

## 11. Health Test Kit Redemption

Super Admin should manage:

- Health test kit name
- Country availability
- Standard price
- Required wellness credits
- Eligible plans
- ~~Whether active subscription is required~~ — **fixed: always required (D6=A)**, not a toggle; enforced at redemption (flow step 4)
- Whether redemption unlocks after 2 paid months
- Stock/availability status, if needed
- Delivery/shipping requirements, if needed

Redemption is a **shipping-only paid checkout** (kit line = €0 covered by credits; postage line is charged — D24). It mirrors the consultation reserve/commit pattern: **reserve** credits + stock at checkout, **commit** on shipping-payment success, **release** on abandon/failure.

Flow:
1. User logs in; opens dashboard.
2. Eligibility checks (atomic with the reserve, step 5): wellness balance ≥ required (counter, §36.1); active subscription (D6=A; `ACTIVE` incl. `cancelAtPeriodEnd` in-period); perk unlocked (`paidMonthsCount`); country eligible; `HealthTest.stock` available.
3. User selects the kit; system shows postage (`HealthTest.shippingCents`).
4. **Reserve (one tx):** decrement wellness counter by `requiredWellnessCredits` (ledger **`RESERVED` deltaCredits = −N** with `reservationId = HealthTestRedemption.id`, §20), **reserve 1 stock unit**, create `HealthTestRedemption` (status `REQUESTED`), create the `Order`. **Order shape (explicit — no new schema):** **one `OrderItem` of kind `HEALTH_TEST`** with `healthTestId` + `unitPriceCents = 0` (kit covered by credits); **postage goes in `Order.shippingCents`** (the existing field — there is no `SHIPPING` `CartItemKind`/`OrderItem` kind). Stripe Checkout charges `Order.shippingCents` only.
5. **Commit** on shipping `payment_succeeded` (or immediately if `Order.shippingCents = 0`): redemption → `APPROVED`, stock decrement made permanent, wellness ledger **terminal `REDEEMED` deltaCredits = 0** (same `reservationId`). **Release** on payment failure / abandon past TTL: wellness terminal **`RELEASED` deltaCredits = +N** (counter +N) + restore reserved stock; redemption → `CANCELED`.
6. Admin/team processes + ships the kit; status `FULFILLED`.

**Shipping & stock — v1 DECISION (D24 LOCKED):**
- **Credits cover the kit only; postage = `Order.shippingCents`** (copied from `HealthTest.shippingCents`), NOT a separate line item (no `SHIPPING` kind exists). The `HEALTH_TEST` `OrderItem` is `unitPriceCents = 0`; order total = `Order.shippingCents`. If `shippingCents = 0`, it behaves as a €0 order and commits at confirm (no Stripe payment, mirrors §36.3).
- **Stock**: `null` = unlimited; `0` = blocked ("out of stock", nothing reserved). Reserved at step 4, decrement made permanent at commit, restored on release.
- **Credits + stock are only ever permanently spent once shipping payment succeeds** (or instantly when `shippingCents = 0`) — never before. Cancellation before fulfillment restores both; after `FULFILLED`, no restore.

---

## 12. User Dashboard

The user dashboard should show:

- Current active plan
- Monthly plan price
- Next billing date
- Plan status
- Available GP/general consultation credits
- Used consultation credits
- Remaining consultation credits
- Locked perks
- Perk unlock date or unlock condition
- Specialist discount eligibility
- Wellness credit balance
- Health test kits available for redemption
- Family member usage eligibility, if enabled
- Cancel/change plan option, if supported

Example text:

You have 2 GP consultation credits remaining this month.

Specialist consultation discount unlocks after your 2nd successful monthly payment.

You have 4 wellness credits. Collect 2 more to redeem a General Health Home Blood Test package.

---

## 13. Super Admin Dashboard Sections

The Super Admin dashboard should include:

1. Plans
2. Country pricing
3. Plan consultations
4. Discount rules
5. Perk unlock rules
6. Wellness credits
7. Health test kits
8. Plan preview
9. Audit log

---

## 14. Suggested Data Model

> Superseded by **§20** (final, decision-locked model). Original brainstorm list kept for history. Note: `PlanCountryOverride` and `ConsultationType` were dropped (D11 per-country rows, D16 Service-only).

Main entities:

- Plan
- ~~PlanCountryOverride~~ (dropped — D11)
- ~~ConsultationType~~ (dropped — D16)
- PlanConsultationRule
- UserSubscription
- ConsultationCreditLedger
- WellnessCreditLedger
- HealthTestKit
- HealthTestKitRedemptionRule
- PlanPerkRule
- FamilyMember, if family usage is enabled

---

## 15. Acceptance Criteria

The feature is complete when:

- Super Admin can create and edit monthly plans.
- Super Admin can set plan price **per country** (each country has its own plan rows — D11; no global price).
- Super Admin can link consultations to each plan.
- Super Admin can define how many GP/general consultations are included.
- Super Admin can mark consultations as included, discounted, fixed-price, or unavailable.
- Super Admin can apply different discounts by country.
- Super Admin can set wellness credits earned per paid month.
- Super Admin can set required wellness credits for health test kit redemption.
- Wellness credits only apply to health test kits.
- Consultation credits only apply to consultations.
- Selected perks display as locked until after 2 successful paid months.
- Users can see remaining consultation credits in their dashboard.
- Users can see wellness credit balance.
- Users can see health test kit redemption progress.
- Checkout calculates the correct price based on plan, country, credits, discounts, fixed price, and unlock rules.
- Failed payments do not issue new credits.
- Cancelled users keep benefits until the paid billing period ends (Q5=A; global rule — the "unless admin changes" clause is dropped, no per-plan cancel-policy field).
- Plan content avoids wording that suggests physical consultations.

---

## 16. Questions To Finalize

> ⚠️ **ALL RESOLVED — see §35 (Decisions Log, LOCKED).** The A–E options and per-question "Recommended:" lines below are the original framing and are **superseded by §35**. Where a "Recommended" line here differs from §35, **§35 wins** (e.g. Q1 final = A not D; Q4 final = A; Q6 final = A; Q10 final = B). Kept for history only.

### 1. Should unused GP/general consultation credits roll over?

A. No, credits expire every month
B. Yes, credits roll over for 1 extra month
C. Yes, credits roll over while subscription is active
D. Super Admin decides per plan
E. Custom answer

Recommended: D, with default as A.

### 2. Should specialist discounts unlock from Month 1 or after 2 paid months?

A. Month 1
B. After 2 paid months
C. Super Admin decides per plan
D. Super Admin decides per consultation
E. Custom answer

Recommended: D.

### 3. Can family members use consultation credits?

A. Only Premium Plan
B. Comprehensive and Premium only
C. All plans
D. Super Admin decides per plan
E. Custom answer

Recommended: D, with default as Premium only.

### 4. Should wellness credits expire?

A. No, they remain active while subscription is active
B. Yes, expire after 6 months
C. Yes, expire after 12 months
D. Super Admin decides per country/plan
E. Custom answer

Recommended: D.

### 5. What happens when a user cancels?

A. Benefits remain until the paid billing period ends
B. Benefits stop immediately
C. User keeps wellness credits but loses consultation credits
D. Super Admin decides per plan
E. Custom answer

Recommended: A.

### 6. Should health test kit redemption require active subscription?

A. Yes, user must have active subscription
B. No, user can redeem if they earned enough credits before cancellation
C. Super Admin decides per plan
D. Super Admin decides per country
E. Custom answer

Recommended: C, with default as A.

### 7. Should plan prices be different by country?

A. Yes, every country can have different price and currency
B. No, same plan price globally
C. Same plan price, but different currency display
D. Super Admin decides per country
E. Custom answer

Recommended: A.

### 8. Should wellness credits apply only to health test kits?

A. Yes, only health test kits
B. No, also allow consultations
C. Super Admin decides
D. Custom answer

Recommended: A.

### 9. Should Super Admin be able to set fixed discounted prices?

A. Yes, fixed discounted prices and percentage discounts both supported
B. No, only percentage discounts
C. No, only fixed discounted prices
D. Custom answer

Recommended: A.

### 10. Should users be allowed to upgrade/downgrade plans mid-cycle?

A. Yes, immediately with prorated billing
B. Yes, but change applies next billing cycle
C. Only upgrade immediately, downgrade next cycle
D. No, cancel and resubscribe manually
E. Custom answer

Recommended: C.

---

# 17. Codebase Integration Review (as of 2026-06-21)

This section grounds the plan against the actual repository. Stack: **backend** Fastify + Prisma + PostgreSQL (`backend/prisma/schema.prisma`), **frontend** Next.js App Router. Payment provider: **Stripe (one-off only today)**.

Headline: the feature is **~95% greenfield**. Only a skeleton `PricingPlan` model and a complete `HealthTest` entity exist. Everything else (credits, perks, recurring billing, plan admin, dashboard cards, pricing engine) is unbuilt.

## 17.1 Coverage Table — Spec Section vs Code

| Spec | Status | Code reality (file:line) |
|---|---|---|
| §3 Plans | SKELETON | `PricingPlan` model `backend/prisma/schema.prisma:827-844` (id, countryId, slug, name, description, priceCents, currencyCode, interval, isActive). Missing displayOrder, featured/badge, shortDescription. Frontend `frontend/data/pricing-plans.ts` is an empty array. Nothing renders plans. |
| §4 Admin plan mgmt | MISSING | No `/admin/pricing-plans` route/page, no `POST/PATCH/DELETE /api/admin/pricing*` route. |
| §5 Country rules | RESOLVED | `PricingPlan` is already **one row per country** via `countryId` FK. D11 keeps this per-country shape (no canonical/override). Extend the row (§20); no fallback/merge (§5 revised). |
| §6 Consultation-in-plan rules | MISSING | No `PlanConsultationRule`. Consultation "types" are only the `ServiceKind` enum `schema.prisma:35-41` (GENERAL, SPECIALIST, PRESCRIPTION, HEALTH_TEST, HOME_DELIVERY). Mental-health / nutrition / follow-up are **not modeled**. |
| §7 Pricing 3 modes | MISSING | Authoritative price calc = `computeSlotPrice()` `backend/src/modules/pricing/peak-pricing.service.ts:60-80`, invoked at checkout (`getServicePeakConfig` at `orders.route.ts:160`, `computeSlotPrice` at `:163-171`, subtotal at `:177`). Never reads user plan. Note: `PatientProfile.pricingPlanId` (`schema.prisma:1282`) **is not dead code** — it is validated on write (`patient-profile.service.ts:200-239`; plan/country match is **lenient** — a first-time patient with no prior appointment accepts any plan id), writable via account/admin/doctor profile routes, and displayed in admin UI — but the **pricing engine never consults it**, so it has zero effect on checkout price. Its write/validate/display call sites must be migrated when `UserSubscription` replaces it (not a bare column drop). |
| §8 Consultation credits | MISSING | No ledger, balance, grant, or decrement anywhere. |
| §9 Perks unlock after 2 paid months | MISSING | No `PlanPerkRule`. And no recurring billing means **no "paid month" counter exists to gate on**. This is the spec centerpiece with zero support. |
| §10 Wellness credits | MISSING | No credit / wallet / loyalty / points concept anywhere in schema. |
| §11 Health-kit redemption | PARTIAL | `HealthTest` is full and orderable via cart: `schema.prisma:846-891` (price, shipping, stock, translations at `:897-918`). No credit-redemption path; pay-per-use only. |
| §12 User dashboard | PARTIAL | Patient dashboard exists `frontend/app/(auth)/account/page.tsx:40-410` (bookings-focused) + payments page `frontend/app/(auth)/account/payments/page.tsx`. No plan / credit / perk / redemption cards. |
| §13 Super-admin dashboard | PARTIAL | Admin shell mature; **AuditLog excellent** (`schema.prisma:2232-2253`, `recordAudit()` `backend/src/modules/audit/audit.service.ts:59-84`, ~200 actions `schema.prisma:151-211`). 7 of 9 plan sections missing. |
| §14 Data model | 2 of 11 | Exist: `PricingPlan` (skeleton), `HealthTest` (partial). The other 9 entities are missing. |
| §15 Acceptance criteria | ~0 met | None of the 21 criteria are currently satisfied. |
| Recurring billing (implied) | MISSING | Stripe is **one-off** `mode:"payment"` only. No Subscriptions API, billing portal, proration, or dunning. See §22. |

## 17.2 Reusable Existing Assets (do NOT rebuild)

| Asset | Location | Reuse for |
|---|---|---|
| Stripe client + webhook + idempotency | `backend/src/lib/stripe/client.ts:30-58`, `backend/src/routes/payments.route.ts:228-501`, `ProcessedWebhookEvent` `schema.prisma:1748-1753` | Recurring billing webhooks; idempotent credit issuance |
| Cart → Order → Appointment pipeline | `backend/src/routes/orders.route.ts:97-359`, `Order` `schema.prisma:1598-1654`, `OrderItem` `:1680-1723` | Wellness-credit health-kit redemption as a €0 / credit-paid order |
| Authoritative server price recompute | `orders.route.ts:126-175` (anti-tamper) | Insertion point for plan pricing (see §21) |
| AuditLog + `recordAudit()` | `schema.prisma:2232-2253`, `backend/src/modules/audit/audit.service.ts:59-84` | New subscription/credit audit actions (§24) |
| Email + automation engine (7 flows) | `backend/src/modules/automation/automation-catalog.ts:11-72`, `backend/src/lib/email/templates.ts` | Renewal / credit-issued / perk-unlocked emails |
| Admin CRUD template | `frontend/app/(admin)/admin/services/*`, `backend/src/routes/admin-services.route.ts`, `frontend/lib/admin/admin-api.ts` | All new admin plan screens follow this exact pattern |
| Role gating | `AdminScope` enum + `backend/src/utils/admin-access-evaluator.ts`, `verifyAdminAccess()` `backend/src/utils/admin-auth.ts` | Gate all new `/api/admin/*` plan routes |
| Country + Currency foundation | `Currency` `schema.prisma:258-266`, `Country.currencyId` `:278-279` | Per-country plan pricing + currency |

---

# 18. Plan Shape — DECIDED: Per-Country Rows (Option B)

**Decision (D11): keep per-country plan rows.** Prices, currency, and even *which plans exist* vary by country, so each country independently declares its own plans. The existing `PricingPlan` shape (one row per `(country, slug)`) is kept and extended (§20). No canonical Plan, no `PlanCountryOverride`, no country→default fallback/merge — each country's plan is self-contained.

Consequences:
- Simpler: no override-merge logic; admin edits one country's plan without touching others.
- `PlanTranslation` is still per-locale (keyed by the per-country plan row id).
- A "plan" the user sees = a single `PricingPlan` row scoped to their country.
- `PatientProfile.pricingPlanId` is deprecated in favor of `UserSubscription` (§20), which points at the specific per-country plan row.

---

# 19. Missing Features the Spec Omitted (code-forced)

The original spec (§1–§16) is internally coherent but silent on these. Each is required by codebase reality:

1. **Recurring billing mechanics.** Spec says "successful monthly payment" but never defines how. Code has no recurring Stripe. Requires Stripe Subscriptions, billing portal, **failed-payment dunning/retry**, SCA. See §22.
2. **Plan-change mechanics.** Q10 = B (next cycle, no proration). Credit re-grant + proration-invoice handling specified in §36.4.
3. **Plan content translations.** Repo has per-locale CMS (Service/HealthTest translations). Plan name/description/perks/notes need a `PlanTranslation` table. Added in §20.
4. **Two booking paths.** Code has `/api/appointments` (manual, UNPAID) and cart-first `/api/cart/checkout` (PAID, `orders.route.ts`). Resolution in §36.17: v1 applies credits/plan pricing on the **cart-first path only**; manual path stays out-of-scope. Mixed carts handled in §36.17.
5. **Account requirement vs guest checkout.** Cart supports **guest** (no userId). Credits/subscriptions require an account. Spec must state login is required to use credits and how a guest converts.
6. **Consultation-type modeling.** RESOLVED — D16 locks **Service-only**: no `ConsultationType` entity; `PlanConsultationRule.serviceId` → existing per-country `Service`. Nutrition / mental-health / follow-up require corresponding `Service` rows to exist (admin creates them), not a type enum.
7. **Refund / chargeback → credit clawback.** Code handles `charge.refunded` (`payments.route.ts:457-488`). Spec covers failed payment but not refund-after-credits-issued. Policy + ledger clawback needed (§20 ledgers include `CLAWBACK`).
8. **Credit-issuance idempotency + reset anchor.** Webhook retries exist (`ProcessedWebhookEvent`). Credit grants must be idempotent per billing period (ledger `idempotencyKey`). And "reset every billing month" must be anchored — **subscription start-date anniversary**, not calendar month (repo is timezone-sensitive).

Minor:
- Patient-facing notifications: existing `Notification` model is doctor-only. Add a patient channel for subscription events.
- §11 redemption flow should reuse the existing `Order`/`OrderItem` pipeline, not a standalone order concept.
- Manual-booking path (`backend/src/routes/appointments.route.ts:138-187`) does not recompute peak price; if credits/plan pricing apply there too, that path needs the same hook.

---

# 20. Revised Data Model (supersedes §14)

Legend: **[EXISTS]** present today, **[EXTEND]** add fields to existing, **[NEW]** create. Field lists are indicative, not final Prisma.

### Plan **[EXTEND** `PricingPlan]` — per-country row (§18 Option B)
`id, countryId, slug, name, shortDescription, longDescription, monthlyPriceCents, currencyCode, billingInterval (enum: MONTHLY), isActive, displayOrder, isFeatured, badgeLabel, notesTerms, monthlyConsultationCredits (int, default 0 — the GP/general credits granted each paid month), wellnessCreditsPerMonth (default 0), familyEnabled (bool, default false), vatMode (enum: EXEMPT|STANDARD, default EXEMPT — D21), vatRatePct? (when STANDARD), stripeProductId, stripePriceId (current Price — immutable; edits create a new Price, §22), createdAt, updatedAt` — unique `(countryId, slug)`.
Relations: `consultationRules[]`, `perkRules[]`, `healthTestRules[]`, `translations[]`, `subscriptions[]`. `monthlyConsultationCredits` is the **single source** the snapshot/grant reads (Essential 1, Comprehensive 2, Premium 3 — §31), NOT derived from rules. Wellness is data-driven: only the Premium plan sets `wellnessCreditsPerMonth = 1` (D12 — wellness is Premium-only, enforced by config not a separate flag).

### ~~PlanCountryOverride~~ **[DROPPED]** (D11)
Not needed — plans are already per-country rows.

### PlanTranslation **[NEW]**
`id, planId, locale (LocaleCode enum — EN/PT/ES/CS/RO/DE, matching `HealthTestTranslation`, not a free String), name, shortDescription, longDescription, notesTerms` — unique `(planId, locale)`. Base columns on the plan row = default-locale fallback (matches existing translation-table pattern).

### ~~ConsultationType~~ **[DROPPED]** (D16 — Service-only)
No new entity. Plan rules reference existing per-country `Service` rows (`schema.prisma` `Service`) directly. Admin selects which `Service` rows a plan covers.

### PlanConsultationRule **[NEW]** — keyed on `serviceId` (D16)
`id, planId, countryId (copied from `plan.countryId` on write), serviceId, isIncluded, usesCredits, creditsPerUse (default 1), discountMode (enum: NONE/PERCENT/FIXED), discountPercent?, fixedPriceCents?, unlockAfterPaidMonths (int, 0 = month 1), familyUsable, isActive` — unique `(planId, serviceId)`. **Two composite FKs (raw SQL) make cross-country corruption structurally impossible:** (a) `(serviceId, countryId) → Service(id, countryId)` proves the Service is in `countryId`; (b) `(planId, countryId) → PricingPlan(id, countryId)` proves the Plan is in the same `countryId`. Together: Plan, rule, and Service are all the same country — no app-logic trust needed. Requires `@@unique([id, countryId])` on **both** `Service` and `PricingPlan`. Excludes any `Service` with `kind = PRESCRIPTION` (D12). Specialist discount = a rule on a `kind = SPECIALIST` service with `discountMode = PERCENT/FIXED` (D2 — admin sets per consultation).

### UserSubscription **[NEW]** (replaces `PatientProfile.pricingPlanId`)
`id, userId, patientProfileId, planId, countryCode, status (enum: ACTIVE/PAST_DUE/CANCELED/PAUSED/INCOMPLETE), stripeSubscriptionId (unique), stripeCustomerId, stripePriceId (the grandfathered Price this sub is billed on — D22, may differ from the plan's current `stripePriceId`), currentPeriodStart, currentPeriodEnd, paidMonthsCount, cancelAtPeriodEnd, pendingPlanId?, pendingStripePriceId?, pendingChangeEffectiveAt?, stripeSubscriptionScheduleId?, planSnapshot (JSON — resolved terms, contents enumerated in §36.16/§38.9), snapshotVersion (int), startedAt, canceledAt, createdAt, updatedAt`. `paidMonthsCount` drives all perk-unlock checks. Pricing + grants read `planSnapshot`, not the live plan (D18). **Pending plan change (Q10=B):** a scheduled downgrade/upgrade sets `pendingPlanId`/`pendingStripePriceId`/`pendingChangeEffectiveAt` (= `currentPeriodEnd`) and, if implemented via Stripe Subscription Schedules, `stripeSubscriptionScheduleId`; the UI "changes on <date>" reads these. At the next renewal the pending fields are applied (new snapshot captured) and cleared. **Partial unique** (raw SQL): one active sub per user — `WHERE status IN ('ACTIVE','INCOMPLETE','PAST_DUE')` (§36.8).

### ConsultationCreditLedger **[NEW]** (append-only)
`id, userSubscriptionId, userId, deltaCredits, reason (enum: MONTHLY_GRANT/RESET_EXPIRE/RESERVED/CONSUMED/RELEASED/ADJUSTMENT/CLAWBACK), balanceAfterHint (advisory only), reservationId? (cuid, groups a RESERVED row with its terminal CONSUMED/RELEASED), orderItemId?, serviceId?, appointmentId? (cart-first path only — never manual/appointments.route.ts, §36.17), reservedUntil? (TTL for RESERVED), billingPeriodStart, idempotencyKey (unique, NOT NULL), createdAt`.

**Reservation lifecycle (explicit deltas):** a credit booking writes `RESERVED deltaCredits = -1` (the counter is decremented in the same tx, §36.1) carrying a fresh `reservationId` + `reservedUntil`. Exactly one terminal row follows: `CONSUMED deltaCredits = 0` (already deducted at reserve — just marks final) **or** `RELEASED deltaCredits = +1` (returns the credit; counter +1). **Terminal uniqueness:** raw-SQL partial unique index on `reservationId WHERE reason IN ('CONSUMED','RELEASED')` — a reservation can be committed or released **at most once**, never both (this is what makes commit/release mutually exclusive, §36.3). Commit/release both re-check inside the tx that no terminal row already exists for that `reservationId`.

**Spend authority = `SubscriptionCreditBalance` counter (§36.1)**, NOT the ledger sum — the ledger is the append-only audit/reconciliation trail (`SUM(deltaCredits)` rebuilds the counter on demand). `RESET_EXPIRE` zeroes prior unused credits at the monthly grant (Q1=A, no rollover). Reserve at checkout; commit (`CONSUMED`) on payment success **or at €0-order confirm** (§36.3); release (`RELEASED`) on abandon past `reservedUntil`.

### WellnessCreditLedger **[NEW]** (append-only, SEPARATE from consultation credits)
`id, userSubscriptionId, userId, deltaCredits, reason (enum: MONTHLY_EARN/RESERVED/REDEEMED/RELEASED/ADJUSTMENT/CLAWBACK), balanceAfterHint (advisory only), reservationId? (= the `HealthTestRedemption.id` this reservation belongs to), reservedUntil?, healthTestId?, redemptionId?, idempotencyKey (unique, NOT NULL), createdAt`. **Spend authority = `SubscriptionCreditBalance(kind=WELLNESS)` counter (§36.1)**, not this ledger's hint.

**Reservation lifecycle (mirrors consultation, §36.6):** redemption checkout writes `RESERVED deltaCredits = -N` (counter −N, same tx) with `reservationId = HealthTestRedemption.id` + `reservedUntil`. Exactly one terminal row follows: `REDEEMED deltaCredits = 0` (commit on shipping payment / €0) **or** `RELEASED deltaCredits = +N` (abandon/fail; counter +N). **Terminal uniqueness:** raw-SQL partial unique on `reservationId WHERE reason IN ('REDEEMED','RELEASED')` — committed or released at most once (idempotent, mutually exclusive).

Spendable **only** on health test kits. **No monthly reset/expiry** — wellness credits persist until redeemed (D13). Earned only on Premium (D12).

### PlanPerkRule **[NEW]**
`id, planId, perkKey (enum: SPECIALIST_DISCOUNT/FAMILY_USAGE/WELLNESS_REDEMPTION/TEST_KIT_REDEMPTION/HIGHER_DISCOUNT_TIER), unlockMode (enum: MONTH_1/AFTER_PAID_MONTHS/MANUAL_APPROVAL/NOT_AVAILABLE), unlockAfterPaidMonths?, createdAt` — unique `(planId, perkKey)`. **Per-subscriber manual approval lives on `SubscriptionPerkGrant` (§36.13/§36.16), NOT here** — `isApproved` on this rule would unlock for ALL subscribers.

### HealthTestKitRedemptionRule **[NEW]**
`id, planId, healthTestId, requiredWellnessCredits, unlockAfterPaidMonths (int), isActive` — unique `(planId, healthTestId)`. Active-subscription is **always required** (D6=A, hard rule — no per-rule toggle). Country scope is implicit (plan is per-country). `HealthTest` itself = **[EXISTS]**, no core change.

### HealthTestRedemption **[NEW]**
`id, userId, userSubscriptionId, healthTestId, orderId?, wellnessCreditsSpent, status (enum: REQUESTED/APPROVED/FULFILLED/CANCELED), createdAt`. Reuses `Order`/`OrderItem` for fulfillment.

### FamilyMember **[NEW]** (Wave 5 — D20)
`id, primaryUserId, patientProfileId?, fullName, email?, dateOfBirth?, relationship, canUseCredits, createdAt`. Distinct from existing `OrderItem.bookingForOther` (`schema.prisma:1706`), which is email-only and not account-linked.

### SubscriptionCreditBalance **[NEW]** — spend authority (§36.1)
`id, userSubscriptionId, kind (enum: CONSULTATION|WELLNESS), balance (int), updatedAt` — unique `(userSubscriptionId, kind)`. The **only** source of truth for spend checks; mutated via atomic conditional `UPDATE ... WHERE balance >= n`. Ledger `SUM(deltaCredits)` reconciles/rebuilds it (§39 invariant).

### SubscriptionPerkGrant **[NEW]** — per-subscriber perk state (§36.13)
`id, userSubscriptionId, perkKey, status (enum: PENDING/APPROVED/DENIED/AUTO), approvedByAdminId?, approvedAt, createdAt` — unique `(userSubscriptionId, perkKey)`. Manual-approval perks live here, **not** on `PlanPerkRule` (approving the rule would unlock for all subscribers). Admin queue + approve routes in §25.1.

### SubscriptionInvoice **[NEW]** — account-page mirror of Stripe-hosted invoices (§38.1)
`id, userSubscriptionId, stripeInvoiceId (unique), number, amountPaidCents, currency, taxCents, periodStart, hostedInvoiceUrl, pdfUrl, status, createdAt`. Written from `invoice.payment_succeeded`; **Stripe remains the system of record** — this only renders account → payments and links the hosted PDF. No local PDF/number generation.

### PlanStripePrice **[NEW, optional]** — price-version history (§22)
`id, planId, stripePriceId, amountCents, currency, active, createdAt, archivedAt?`. Audit trail of immutable Stripe Price versions per plan. Optional but recommended for reconciliation.

### Wave 0 schema checklist (authoritative — build from this list)

| Model | Type | Key constraints |
|---|---|---|
| `PricingPlan` | EXTEND | rename `priceCents→monthlyPriceCents`, `interval→billingInterval` enum; add `shortDescription, longDescription, displayOrder, isFeatured, badgeLabel, notesTerms, monthlyConsultationCredits, wellnessCreditsPerMonth, familyEnabled, vatMode, vatRatePct?, stripeProductId, stripePriceId`; raw-SQL `@@unique([id, countryId])` (FK target for `PlanConsultationRule.(planId, countryId)`) |
| `PlanTranslation` | NEW | unique `(planId, locale)`, `locale = LocaleCode` |
| `PlanConsultationRule` | NEW | has `countryId` (= `plan.countryId`); unique `(planId, serviceId)`; **two** raw-SQL composite FKs — `(serviceId, countryId)→Service(id, countryId)` AND `(planId, countryId)→PricingPlan(id, countryId)` — so plan, rule, service share one country (§36.10) |
| `PlanPerkRule` | NEW | unique `(planId, perkKey)`; no `isApproved` |
| `HealthTestKitRedemptionRule` | NEW | unique `(planId, healthTestId)` |
| `UserSubscription` | NEW | unique `stripeSubscriptionId`; raw-SQL partial unique on `userId` for active states; holds `planSnapshot`+`snapshotVersion`+`stripePriceId`+pending-change fields |
| `SubscriptionCreditBalance` | NEW | unique `(userSubscriptionId, kind)` — spend authority |
| `ConsultationCreditLedger` | NEW | `idempotencyKey` unique NOT NULL; raw-SQL partial unique on `reservationId WHERE reason IN ('CONSUMED','RELEASED')` |
| `WellnessCreditLedger` | NEW | `idempotencyKey` unique NOT NULL; raw-SQL partial unique on `reservationId WHERE reason IN ('REDEEMED','RELEASED')` (reservationId = `HealthTestRedemption.id`) |
| `SubscriptionPerkGrant` | NEW | unique `(userSubscriptionId, perkKey)` |
| `HealthTestRedemption` | NEW | FK `userSubscriptionId`, `orderId?`; invariant `Order.userId == redemption.userId` when set |
| `SubscriptionInvoice` | NEW | unique `stripeInvoiceId` |
| `PlanStripePrice` | NEW (opt) | price-version history |
| `Service` | EXTEND | add raw-SQL `@@unique([id, countryId])` so the consultation-rule composite FK can target it |
| `FamilyMember` | NEW (Wave 5) | seeded off in v1 |
| `PatientProfile.pricingPlanId` | DEPRECATE | after `UserSubscription` live (§32 step 6) |

New `BillingInterval`, ledger-reason (incl. wellness `RESERVED`/`RELEASED`), status, `vatMode`, `perkKey`, `unlockMode`, `discountMode` enums per the field lists above. Partial-unique + composite-FK constraints are **raw SQL** in the Wave 0 migration (Prisma `@@unique` can't express them — §36.16).

---

# 21. Pricing Engine Integration

**Authoritative calc:** `computeSlotPrice()` (`backend/src/modules/pricing/peak-pricing.service.ts:60-80`), invoked per consultation item in checkout at `backend/src/routes/orders.route.ts:160-171`.

**Hook point:** after line 171 (effective peak price set) and before line 177 (subtotal). For a logged-in user (no guest — D15) with a subscription **in good standing for the current period** — `status = ACTIVE`, OR (`PAST_DUE`/`cancelAtPeriodEnd`) while `now < currentPeriodEnd` (benefits persist to period end per Q5=A/§36.7) — resolve the `PlanConsultationRule` by the cart item's `serviceId` (D16), then apply checkout priority:

1. Included + credit available → reserve 1 credit (`ConsultationCreditLedger` reason `RESERVED`), price = €0.
2. Else `discountMode = FIXED` → `fixedPriceCents`.
3. Else `discountMode = PERCENT` → apply `discountPercent` to peak/base price.
4. Else normal (peak/base) price.

**Reserve vs commit (see §36.1/§36.3 for the authoritative rules):** reserve credit at checkout against the `SubscriptionCreditBalance` counter via atomic conditional `UPDATE` (15-min hold; §36.3 TTL). **Commit trigger = `max(payment-success webhook, order-confirm for €0 orders)`** — a fully-credit-covered (€0) booking produces no Stripe payment, so it commits (`RESERVED → CONSUMED`) at order/appointment confirmation, NOT on a webhook that never fires (§36.3). Commit and release are mutually exclusive per reservation; release (`RELEASED`) only when the checkout/order is terminally abandoned AND past TTL, re-checking no `CONSUMED` row exists. Balance reads use the counter (§36.1), never the ledger sum.

**Guards:** plan country must match cart `countryCode`; perk-gated discounts require `paidMonthsCount >= unlockAfterPaidMonths`. All rule values read from `UserSubscription.planSnapshot` (D18), not the live plan.

**Eligibility rule (resolves §21↔§36.7):** consultation credits **and** plan discounts both remain usable through the **current paid period** even when `PAST_DUE` (Stripe is mid-retry) or `cancelAtPeriodEnd` — i.e. while `now < currentPeriodEnd`. Once the period ends without a successful renewal (`CANCELED`, or `PAST_DUE` past `currentPeriodEnd`), no plan pricing applies. `INCOMPLETE` = no benefits (first invoice unpaid). Wellness **redemption** is stricter — it requires `ACTIVE`-incl-`cancelAtPeriodEnd`-in-period but not `PAST_DUE` (D6=A, §36.6).

---

# 22. Recurring Billing (Stripe Subscriptions) — New Requirement

Switch from one-off `mode:"payment"` to recurring:

- One Stripe **Product** per plan (store `stripeProductId` on the plan), and one Stripe **Price** per plan row (per country/currency); store the **current** `stripePriceId`.
- **Stripe Prices are immutable — amount cannot be edited.** On a price edit, **create a NEW Price** under the same Product, archive (`active:false`) the old one, and update `stripePriceId` to the new id. Rule (ties to §38.6/D22): **the new `stripePriceId` is used for NEW subscribers only; existing subscribers keep the price snapshotted on their `UserSubscription` (grandfathered, D22) until they cancel.** Optional `PlanStripePrice` history table `(id, planId, stripePriceId, amountCents, currency, active, archivedAt)` for an audit trail of price versions. Never reuse a Price for a different amount.
- Subscribe via Checkout `mode:"subscription"` (preferred — collects SCA + off-session mandate, §38.2) or `customers.create()` + `subscriptions.create()`.
- **Billing portal** (`billingPortal.sessions.create()`) for self-serve cancel / payment-method update.
- New webhook events to handle in `backend/src/routes/payments.route.ts`:
  - `invoice.payment_succeeded` → increment `paidMonthsCount` (when `billing_reason ∈ {subscription_create, subscription_cycle}` AND `amount_paid > 0` — the **first** paid invoice is `subscription_create`, renewals are `subscription_cycle`; **proration `subscription_update` and €0 invoices are excluded** — §36.2), set `currentPeriodEnd`, **zero prior unused consultation credits then grant the new month's** (no rollover, Q1=A); grant wellness credits **only if the snapshot's `wellnessCreditsPerMonth > 0`** (Premium, D12); fire perk-unlock if threshold reached. All grant amounts read from `UserSubscription.planSnapshot` (D18/§36.9), **not** the live plan row. **Idempotency key = `sub:{subId}:period:{currentPeriodStart}`** (per billing period, NOT per invoice — §36.2). This is also what promotes INCOMPLETE → ACTIVE and issues month-1 credits (consistent with §25.3).
  - `invoice.payment_failed` → status `PAST_DUE`, start dunning, **issue no credits**.
  - `customer.subscription.updated` / `deleted` → sync status, `cancelAtPeriodEnd`. Plan changes take effect **next cycle only** (Q10=B), `proration_behavior: 'none'` — no mid-cycle proration.
- Cancel policy: keep benefits until `currentPeriodEnd` (Q5 = A), then status `CANCELED`.

---

# 23. Build Phases

| Wave | Scope | Blocking? |
|---|---|---|
| **0** | Extend `PricingPlan` (+ rename per §36.16) + add §20/§36.16 models + migration (raw-SQL partial-unique + composite-FK); Stripe **Product+Price** sync; add `subscriptions` feature key (strict opt-in, §36.15) | Blocks all |
| **1** | Super-admin CRUD: per-country plans, consultation rules (`serviceId` + country guard), perk rules, health-test redemption rules, translations, plan preview, audit-log section, `MANAGE_SUBSCRIPTIONS` scope, deactivate-only delete. Follow `admin/services/*` template. | After 0 |
| **2** | Subscription lifecycle: Stripe Subscriptions (`mode:"subscription"` + SCA/off-session), billing portal, full webhook set (§25.3), period-keyed grants, INCOMPLETE→ACTIVE, dunning, cancel/period-end | After 0 |
| **3** | Checkout pricing engine: 3 modes + reserve/commit (€0 path)/release + refund clawback + rounding (§21/§36/§38.3) | After 0, 2 |
| **4** | Patient dashboard cards + wellness redemption (shipping/stock, D24) + `SubscriptionInvoice` on payments page (§38.1) | After 2, 3 |
| **5** | Patient notifications + email/legal terms (§40), family usage (D20), §24 audit actions, QA vs §15 | After 1–4 |
| **Ops** | Reconciliation jobs + invariant checks + alerts (§39); land alongside Wave 2–3 | With 2–3 |

> Note: repo migrations were previously blocked by a broken cart-first migration; use the diff-from-live-DB + `migrate deploy` workaround when authoring the Wave 0 migration.

---

# 24. New Audit Actions (append to `AuditAction` enum)

`SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_CANCELED`, `SUBSCRIPTION_REFUNDED`, `PLAN_CREATED`, `PLAN_UPDATED`, `PLAN_DEACTIVATED`, `PLAN_REORDERED`, `PLAN_CONSULTATION_RULE_SET`, `PERK_RULE_SET`, `PERK_UNLOCKED`, `PERK_MANUALLY_APPROVED`, `CONSULTATION_CREDIT_GRANTED`, `CONSULTATION_CREDIT_CONSUMED`, `CONSULTATION_CREDIT_CLAWED_BACK`, `WELLNESS_CREDIT_EARNED`, `WELLNESS_CREDIT_REDEEMED`, `WELLNESS_CREDIT_CLAWED_BACK`, `HEALTH_TEST_REDEEMED`.

---

# 25. API Contracts

All admin routes gated by `verifyAdminAccess()`; mutations record audit (§24). Patient routes require an authenticated session (no guest). Follow the existing envelope pattern (`{ data, error, meta }`).

## 25.1 Admin (Super Admin)

**Access scope:** plan/billing management is gated by a **dedicated `MANAGE_SUBSCRIPTIONS` permission**, not generic admin access — it touches money + subscriber data. Map it to `SUPER_ADMIN` (and optionally a billing-admin role); a `LOCAL_ADMIN` may view their country's plans but mutating Stripe Prices / issuing manual credit adjustments / viewing subscriber billing requires the dedicated scope. All mutations audited (§24).

**Deletion semantics:** `DELETE /api/admin/plans/:id` is **deactivate-only** (soft — set `isActive:false`), **never** a hard delete once any `UserSubscription`, rule, or Stripe Price references the plan. Same for consultation/perk/test-kit rules — deactivate, don't destroy, so existing subscribers' snapshots and audit trail stay intact.

| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/api/admin/plans?countryId=` | list (per country) / create plan |
| GET/PATCH/DELETE | `/api/admin/plans/:id` | read / edit / **deactivate only** (soft; never hard-delete with subscribers) |
| POST | `/api/admin/plans/:id/reorder` | set displayOrder |
| GET/PUT | `/api/admin/plans/:id/translations/:locale` | read / upsert `PlanTranslation` |
| GET/POST/DELETE | `/api/admin/plans/:id/consultation-rules` | manage `PlanConsultationRule` (`serviceId`) |
| GET/POST/DELETE | `/api/admin/plans/:id/perks` | manage `PlanPerkRule` |
| GET/POST/DELETE | `/api/admin/plans/:id/health-test-rules` | manage `HealthTestKitRedemptionRule` |
| GET | `/api/admin/subscription-perk-grants?status=PENDING` | **pending-approval queue** (per-subscriber, `SubscriptionPerkGrant`) |
| POST | `/api/admin/subscription-perk-grants/:id/approve` | approve a **per-subscriber** perk grant (NOT plan-wide — §36.13) |
| GET | `/api/admin/plans/:id/preview?locale=` | plan with translations applied (plan already country-scoped) |
| GET | `/api/admin/subscriptions` | list subscriptions (filter status/plan/country) |
| POST | `/api/admin/subscriptions/:id/adjust-credits` | manual credit grant/clawback (audited) |

## 25.2 Patient

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/me/subscription` | active plan, status, currentPeriodEnd, paidMonthsCount |
| POST | `/api/me/subscription` | start subscription → Stripe Checkout `mode:"subscription"` URL |
| POST | `/api/me/subscription/change` | upgrade/downgrade — scheduled for next cycle, no proration (Q10=B) |
| POST | `/api/me/subscription/cancel` | cancel at period end |
| GET | `/api/me/subscription/portal` | Stripe billing-portal URL |
| GET | `/api/me/credits` | consultation + wellness balances, ledger history |
| GET | `/api/me/redemptions` | eligible health-test kits + progress |
| POST | `/api/me/redemptions` | start redemption → **reserve** wellness credits + stock, create `HealthTestRedemption` + shipping-only Order, return Stripe shipping **Checkout URL** (commit on payment / instant if `shippingCents=0`, §11) |

## 25.3 Internal (webhook side effects)

All handled inside existing `backend/src/routes/payments.route.ts` webhook; gated by `ProcessedWebhookEvent` idempotency; ordering-tolerant (§38.7). The webhook router must branch subscription events vs the existing one-off order events (today metadata `kind:"order"`).

| Event | Action |
|---|---|
| `checkout.session.completed` (mode `subscription`) | Link the Stripe subscription + customer to `UserSubscription`; set status from the subscription (ACTIVE or INCOMPLETE); capture the snapshot (D18) + `stripePriceId`. |
| `customer.subscription.created` | Create/confirm `UserSubscription` row; status from Stripe (often INCOMPLETE until first invoice paid). |
| `invoice.payment_succeeded` | Period-keyed grant (§36.2): `paidMonthsCount`, credits, perks, `currentPeriodEnd`. Fires for **both** `subscription_create` (first invoice → also promotes INCOMPLETE → ACTIVE + month-1 credits) **and** `subscription_cycle` (renewals). |
| `invoice.payment_action_required` / `invoice.finalization_failed` | **SCA / auth-required** (§38.2) — distinct from a hard fail; surface the hosted-invoice authentication link; do NOT cancel. |
| `invoice.payment_failed` | status `PAST_DUE`; no credits; dunning owned by Stripe (§38.5). |
| `customer.subscription.updated` | sync status / `cancelAtPeriodEnd` / period; plan change next-cycle only (Q10=B). |
| `customer.subscription.deleted` | status `CANCELED` (after period end / dunning exhausted). |
| `charge.refunded` | refund clawback + guard (§36.5). |
| `charge.dispute.created` (chargeback) | treat as a refund event — clawback + flag the subscription for review (§39); do not auto-grant. |

**Initial state:** a new subscription starts **INCOMPLETE**; only the first paid invoice promotes it to ACTIVE and issues month-1 credits. No credits/perks on INCOMPLETE.

---

# 26. Edge Cases & Concurrency

| Case | Resolution |
|---|---|
| Two concurrent bookings spend the same last credit | Atomic conditional decrement inside `prisma.$transaction` (check balance + insert ledger row in one tx); second booking falls through to paid price. |
| Credit reserved at checkout, payment abandoned | `RESERVED` row + TTL (mirror cart `heldUntil`); a sweep job (or next balance read) emits `RELEASED` after expiry. |
| Refund request (D17) | Refund allowed **only within 7 days** of the charge **AND only if no consultation credit was used that billing month**. If either fails → refund denied. On approved refund → `CANCELED` + clawback that month's unused credits. Enforced in the admin refund action + patient self-serve guard. |
| Subscription country A, booking country B | Plan pricing/credits apply only when `subscription.countryCode == cart.countryCode`; else normal price. |
| Plan deactivated while users subscribed | Existing subscriptions keep running on snapshotted rule values; plan hidden from new signups. Rules read from a versioned snapshot, not live plan row. |
| Wellness credits partial (e.g. 4/6) at cancel | Wellness credits **never expire and never auto-reset** (D13); they only decrement on redemption. Retained while data exists; redemption requires active subscription (D6=A). |
| Consultation credit reset (D13) | Consultation credits reset **every plan-month**, anchored to Stripe `currentPeriodStart` (subscription anniversary), not calendar. Reset = the new monthly grant; prior unused consultation credits are zeroed at grant time (no rollover, Q1=A). Wellness credits are untouched by this. |
| Duplicate `invoice.payment_succeeded` (Stripe retry / multiple invoices per period) | Idempotency key = **`sub:{subId}:period:{currentPeriodStart}`** (per period, NOT per invoice — §36.2); ledger unique constraint blocks double grant. |
| Specialist discount but perk not yet unlocked | Pricing engine checks `paidMonthsCount >= unlockAfterPaidMonths` before applying discount. |
| Plan change mid-cycle (Q10=B) | No mid-cycle change. Schedule the switch for next renewal via Stripe `subscription.update` with `proration_behavior: 'none'` + `billing_cycle_anchor` unchanged (or schedule). Current plan's price + credits stay until `currentPeriodEnd`; new plan price + credits begin next cycle. UI shows "changes on <date>". |

---

# 27. Test Plan (target ≥80% per repo standard)

**Unit**
- Pricing priority resolver: credit → fixed → percent → normal, all branches.
- Perk-unlock gate: month1 / after-N / manual / not-available × `paidMonthsCount`.
- Ledger balance math incl. reserve/commit/release/clawback and negative balance.
- Monthly grant zeroes prior unused consultation credits (no rollover); wellness balance untouched.
- Refund guard: allowed only ≤7 days AND no consultation credit used that month (D17).
- Wellness redemption requires active subscription (D6); blocked otherwise.

**Integration**
- Webhook `invoice.payment_succeeded` grants exactly once (idempotency — duplicate invoices for the same period grant once, §36.2).
- `invoice.payment_failed` → `PAST_DUE`, no credits.
- Checkout deducts/reserves credit; abandoned checkout releases.
- Redemption deducts wellness credits and creates Order.
- Admin CRUD + audit row written.

**Concurrency / money-race (mandatory — these are the §36 CRITICALs)**
- **Concurrent "last credit"** — two simultaneous bookings, 1 credit: exactly one gets €0, the other pays (no double-spend, §36.1).
- **Concurrent wellness redemption** — two redemptions at exactly the required balance: only one succeeds (§36.6).
- **€0 order confirmation** — fully-credit booking commits at confirm with no payment webhook; credit never re-released (§36.3).
- **Mixed cart** — one €0 credit line + one paid line in a single checkout: paid line charges, €0 line carries no Stripe line-item, both fulfill (§36.17).
- **Duplicate invoices, same period** — period-keyed idempotency grants once (§36.2).
- **Refund from Stripe Dashboard** — `charge.refunded` runs clawback + 7-day/credit-used guard without the admin UI (§36.5).
- **Dispute / chargeback** — `charge.dispute.created` claws back + flags for review (§25.3/§39).
- **Out-of-order webhooks** — stale `subscription.updated` after `CANCELED` does not re-activate (§38.7).

**E2E (Playwright)**
- Subscribe → see plan card + credits on dashboard.
- Book included consultation → €0 at checkout.
- Redeem blood-test after 6 credits.
- Cancel → benefits persist to period end.

---

# 28. Scheduled Jobs

| Job | Cadence | Action |
|---|---|---|
| Reservation release | every 5 min | Release expired `RESERVED` consultation credits + redemption holds (abandoned checkouts), per the `reservedUntil` TTL + terminal-uniqueness guard (§20/§36.3). |
| Cancel-after-grace | daily | When Stripe has exhausted retries / a defined grace window elapses on a `PAST_DUE` sub, transition it to `CANCELED`. **No customer dunning emails here.** |
| Internal ops digest | daily | Internal-only digest of `PAST_DUE` count + recovery rate to the ops channel (§39). Not customer-facing. |
| Renewal reminder | daily | Optional pre-renewal email N days before `currentPeriodEnd` (a reminder, not dunning). |

**Dunning ownership (resolves §28↔§38.5):** **Stripe owns customer dunning** — Stripe Smart Retries + Stripe hosted failed-payment / authentication-required emails. The app cron does **NOT** send subscription dunning emails; it only (a) cancels after grace and (b) emits internal ops digests. The existing automation engine must not send subscription dunning either.

No consultation-credit expiry sweep needed: monthly reset happens **at grant time** in the `invoice.payment_succeeded` webhook (zero prior unused + grant new). Wellness credits **never expire** (D13), so no wellness sweep. Note: repo cron has a known fail-open issue — jobs must fail closed (no silent grant on error) and be idempotent.

---

# 29. Frontend Surfaces

| Surface | Location | State today |
|---|---|---|
| Public pricing page | `frontend/data/pricing-plans.ts` + site pricing route | Empty `[]` — build from resolved Plan API |
| Plan select / subscribe | new under site booking flow | none |
| Upgrade / downgrade UI | account area | none |
| Subscription + credits cards | `frontend/app/(auth)/account/page.tsx` (insert ~line 245) | none |
| Locked-perk badges + unlock date | dashboard + pricing cards | none |
| Wellness redemption progress + kit redeem | account + `tests/[testSlug]` page | none |
| Admin plan screens | `frontend/app/(admin)/admin/plans/*` (copy `admin/services/*`) | none |

All public surfaces follow `DESIGN.md` / `gh2-*` system. Copy must avoid wording implying physical consultations (§1).

---

# 30. Email & Notification Catalog

Add a **patient** notification channel (existing `Notification` model is doctor-only). Templates + i18n keys (base-locale fallback; CommonLocale lacks per-key fallback so provide all active locales):

| Event | Trigger | i18n key root |
|---|---|---|
| Subscription confirmed | `subscription_create` first paid invoice | `email.subscription.confirmed` |
| Monthly payment + credits issued | `invoice.payment_succeeded` (renewal) | `email.subscription.renewed` |
| ~~Payment failed / dunning~~ | — | **Owned by Stripe** (hosted dunning + auth-required emails, §28/§38.5). App sends **no** failed-payment email. |
| Perk unlocked | `paidMonthsCount` reaches a rule's `unlockAfterPaidMonths` in `invoice.payment_succeeded` | `email.perk.unlocked` |
| Wellness credit earned (Premium only) | grant in `invoice.payment_succeeded` | `email.wellness.earned` |
| Redemption confirmed | redemption committed (shipping paid / €0) | `email.redeem.confirmed` |
| Renewal reminder | scheduled (§28) | `email.subscription.reminder` |
| Cancellation confirmed | cancel | `email.subscription.canceled` |

UI copy keys for §2 universal note + tooltip also required: `subscription.note.universal`, `subscription.note.detailed`, `subscription.tooltip.perkUnlock`.

---

# 31. Seed Data

Per D14: seed these as **starter placeholders** for the pilot country; all values editable from the admin portal post-launch. Seeded against one country's `PricingPlan` rows (per-country shape, §18).

| Plan | slug | monthlyPrice | GP credits/mo | Specialist discount | Wellness/mo | Family |
|---|---|---|---|---|---|---|
| Essential Care | `essential-care` | €20 | 1 | per-rule (discount available) | 0 | no |
| Comprehensive Care | `comprehensive-care` | €39 | 2 | per-rule | 0 | no |
| Premium Wellness Care | `premium-wellness-care` | €49 | 3 | per-rule (higher tier) | **1 (Premium only)** | Wave 5 (`familyEnabled` seeded **false**) |

Wellness is **Premium-only** (D12): only this plan has `wellnessCreditsPerMonth = 1`. Rule: earn 1/month, **6 credits → 1 General Health Home Blood Test**; wellness credits never expire (D13). All perks `unlockAfterPaidMonths = 2` except GP credits (`MONTH_1`). **`familyEnabled` is seeded `false` on all plans** — family ships in Wave 5 (D20); do not advertise it as live until then (§3 copy must reflect this). Admin can change any of this later.

---

# 32. Migration & Rollout

1. Wave 0 migration: extend `PricingPlan` with the §20 fields + add the new models. Author via diff-from-live-DB + `migrate deploy` (cart-first migration blocker workaround).
2. No canonical/override backfill needed (Option B) — existing `PricingPlan` rows stay per-country; just populate the new columns.
3. Create one Stripe **Product** per plan (`stripeProductId`) + one **Price** per plan row; store current `stripePriceId`. Price edits create a NEW Price + archive old (immutable — §22); a **Stripe-price-sync failure must hard-fail and alert** (§39), never silently leave a plan without a Price.
4. Seed §31 plans for the pilot country (idempotent seed script).
5. Gate rollout per country via `Country.enabledFeatures` (`subscriptions`, strict opt-in §36.15); launch in 1 pilot country first. **Per-country go-live checklist:** accountant confirms `Plan.vatMode` for that country (D21), Stripe Tax/`tax_rate` set accordingly, terms copy localized (§40), reconciliation alerts wired (§39) — then add the `subscriptions` flag for that country.
6. Deprecate `PatientProfile.pricingPlanId` after `UserSubscription` live (keep column one release for safety).

---

# 33. Security / PHI / GDPR

- Subscription, credit ledgers, and payment IDs are sensitive; restrict patient routes to the owning user; admin reads gated + audited.
- Manual credit adjustments and subscription views by admins → audit (§24), mirror `DOCTOR_BANK_VIEWED` reveal pattern.
- Rate-limit redemption + subscribe endpoints (anti-abuse).
- No card data stored locally (Stripe holds it); store only `stripeCustomerId` / `stripeSubscriptionId`.
- Right-to-erasure: ledgers anonymize on account deletion but retain financial records per legal retention.

---

# 34. Analytics & Metrics

Track: MRR, active subscribers by plan/country, churn + cancel reasons, credit utilization (granted vs consumed), wellness redemption rate, failed-payment/dunning recovery rate, perk-unlock conversion. Emit on webhook + ledger events; surface in admin dashboard.

---

# 35. Decisions Log — LOCKED (2026-06-21)

All decisions answered by product owner. Build may proceed once Q10 is confirmed.

| # | Decision | FINAL |
|---|---|---|
| Q1 | Consultation credit rollover | **A — expire monthly, no rollover** |
| Q2 | Specialist discount unlock timing | **D — admin decides per consultation (per `PlanConsultationRule`)** |
| Q3 | Family credit usage | **D — per plan (default Premium-only)** |
| Q4 | Wellness credit expiry | **A — never expire while data exists** (see D13: only decrement on redemption) |
| Q5 | On cancel | **A — benefits until period end** |
| Q6 | Redemption needs active sub | **A — yes, active subscription required** |
| Q7 | Per-country plan prices | **A — price + currency per country** |
| Q8 | Wellness credits scope | **A — health test kits only** |
| Q9 | Fixed + percentage discounts | **A — support both** |
| Q10 | Upgrade/downgrade mid-cycle | **B — change applies next billing cycle (no mid-cycle proration)** |
| D11 | Plan shape | **Per-country rows (Option B)** — each country has its own plans/prices; no canonical+override |
| D12 | Subscription scope | **GP included; admin selects which `Service` rows a plan covers; specialist = optional admin-set discount; wellness = Premium plan only; NO prescription (discontinued)** |
| D13 | Credit reset / wellness | **Consultation credits reset each plan-month (anniversary). Wellness credits never reset/expire — only decrement when a kit is redeemed** |
| D14 | Seed values | **Seed placeholders now; all editable from admin portal later** |
| D15 | Login required | **Yes — no guest subscriptions/credits** |
| D16 | Consultation-type modeling | **Service-only — no new entity; `PlanConsultationRule.serviceId` → existing `Service`** |
| D17 | Refund policy | **No refund after 7 days; AND no refund if any consultation credit used that month. Otherwise refund + clawback unused credits** |
| D18 | Admin plan edits vs current subscribers | **Snapshot at signup/renewal** — existing subscribers keep their terms; edits apply next period only (§36.9) |
| D19 | Partial refunds for subscriptions | **Not supported in v1** — full refund only (§36.5) |
| D20 | Family usage in v1? | **Deferred to Wave 5** — Premium-only; not in initial launch (§36.12) |
| D21 | VAT treatment for medical subscription per country | **LOCKED** — default **VAT-EXEMPT** (medical telemedicine), **per-country configurable** via `Plan.vatMode` (EXEMPT/STANDARD) + optional `vatRatePct`, applied through Stripe Tax. Legal answer flips a config, not code. **Launch-gate:** accountant confirms each country's treatment before that country goes live (operational checklist, not a build blocker). Stripe-hosted invoices are the record (§38.1) |
| D22 | Price change for existing subscribers | **Grandfather** at snapshotted price until they cancel — no forced migration (§38.6) |
| D23 | Free trials / promo coupons in v1 | **No** — out of scope v1; block coupons/trials on the subscription Price (§38.8) |
| D24 | Health-kit redemption shipping/stock | **LOCKED** — shipping charged separately (credits cover kit only); stock decremented at confirm; cancel restores credits + stock (§11) |
| D25 | Benefit unlock timing (2026-07-02) | **LOCKED** — ALL plan benefits (GP credits + specialist discounts) unlock from the **2nd paid month**: `PricingPlan.benefitsUnlockAfterPaidMonths` (default 2), snapshot-carried; resolver takes `max(planLevel, rule.unlockAfterPaidMonths)`; month-1 grants **0** consultation credits (a locked credit would be wiped by the month-2 reset). Wellness earns from payment 1. Existing subscribers grandfathered until next renewal snapshot. **Supersedes the §2/§8/§31 "Month 1" copy.** |

---

# 36. Review Hardening (resolves the 43-finding code-review audit)

A 4-lens adversarial review (consistency, code-feasibility, billing-logic, completeness) surfaced 43 findings. The stale-contradiction findings are fixed in place above (§5, §11, §15, §16 banner, §17.1, §19). This section specifies the **billing-correctness, concurrency, and flow** items that were underspecified. **These are mandatory build rules — most CRITICAL findings are double-spend / double-grant money bugs.**

## 36.1 Credit concurrency — the ledger alone is NOT safe

Append-only ledger + read-balance-then-insert under Postgres default isolation (READ COMMITTED) **will double-spend the last credit** (two txns both read balance=1, both insert −1). Required primitive:

- Add a **`SubscriptionCreditBalance`** row per `(userSubscriptionId, kind)` holding the live `balance` integer. **[NEW]**
- Spend = atomic `UPDATE SubscriptionCreditBalance SET balance = balance - 1 WHERE id = ? AND balance >= 1` — rowcount 0 ⇒ no credit (fall through to paid price). Then write the ledger row in the **same** `prisma.$transaction`.
- The ledger remains the audit trail; the balance row is the authority for spend checks. Same pattern for wellness redemption (§36.6).
- Alternative if a counter row is rejected: `pg_advisory_xact_lock(userSubscriptionId)` at txn start. Do **not** rely on plain transactions.

## 36.2 Monthly reset + grant — one atomic op, keyed per PERIOD

- Reset-prior-unused and grant-new-month must be a **single `prisma.$transaction`** with **one idempotency key per billing period**: `sub:{subId}:period:{currentPeriodStart}` — **NOT** `{stripeInvoiceId}` (Stripe emits multiple invoices per period on retries/proration).
- Net effect = set consultation balance to the **snapshot's** monthly credit count (`UserSubscription.planSnapshot`, D18 — never the live plan row; record `RESET_EXPIRE(−old)` + `GRANT(+new)` under the one key). Idempotent: a retry is a no-op.
- `paidMonthsCount` increments + credits grant on invoices with `billing_reason ∈ {subscription_create, subscription_cycle}` AND `amount_paid > 0` — **`subscription_create` = the first paid invoice** (issues month-1 credits, promotes INCOMPLETE→ACTIVE); `subscription_cycle` = renewals. **Exclude** proration `subscription_update` and €0 coupon/trial invoices. The period key `sub:{subId}:period:{currentPeriodStart}` makes first-invoice and any same-period retry grant exactly once.

## 36.3 €0 (fully-credit) booking commit path — close the double-spend

A consultation fully covered by a credit is **€0 → no Stripe payment → no payment webhook**. The reserve-then-commit-on-webhook design would leave the credit `RESERVED` forever, then the sweep `RELEASED` it → free credit re-spent.

- Rule: **commit trigger = the payment-success webhook when a charge exists, OR order/appointment confirmation when total = €0.** For €0 orders, `RESERVED → CONSUMED` atomically at confirmation; never wait on a webhook that won't fire.
- `COMMIT` and `RELEASE` are mutually exclusive per reservation (same per-reservation lock); the release sweep must re-check no `CONSUMED` row exists before releasing.
- TTL alignment: reservation hold ≥ sweep interval + max Stripe payment latency (set hold 15 min, sweep 5 min) so a slow-but-valid payment can't be swept. Cron must fail **closed** (repo cron is fail-open).

## 36.4 Plan change (Q10 = B) — exactly-once credits

- `/api/me/subscription/change` schedules the switch for next renewal via Stripe `subscription.update` with `proration_behavior: 'none'`. No mid-cycle charge, no mid-cycle credit change.
- The renewal grant (§36.2) fires only on the next `subscription_cycle` invoice → new plan's credits then. A proration/`subscription_update` invoice must **not** run the monthly grant. This guarantees exactly-once.
- Downgrade: current credits untouched until period end. Upgrade: same (Q10=B — no immediate upgrade grant), avoiding the double-grant entirely.

## 36.5 Refund enforcement lives in the webhook, not just the UI

Two distinct surfaces — **the policy guard is pre-refund; the webhook is post-refund reconciliation and can never deny a refund that already happened:**
- **Policy guard (pre-refund, on the request):** the patient self-serve refund button and the admin "issue refund" action both check D17 **before** calling Stripe: allowed only if **within 7×24h of Stripe `charge.created` (UTC epoch, compared in UTC)** AND no consultation credit was used that period. If it fails, the refund is **not issued**. This is where a refund is actually denied.
- **Webhook (post-refund, `charge.refunded`):** by the time this fires the money is **already refunded** (could be a Stripe-Dashboard refund that bypassed our guard). So the webhook **always reconciles** — idempotently `CLAWBACK` unused credits, set `CANCELED`, decrement `paidMonthsCount`, re-lock perks — and **flags a policy violation for ops review** if the refund broke D17 (e.g. a dashboard refund after a credit was used). It never tries to "reverse" the refund; it reconciles state to match reality and alerts (§39). Existing handler `payments.route.ts:457-488` only marks `REFUNDED` today — extend it with this reconciliation.
- "credit used this month" = exists a `CONSUMED` consultation-ledger row with `billingPeriodStart == current period` (`RESERVED`/`RELEASED` do not count).
- **DECIDED (D19): partial refunds are not supported for subscriptions in v1 — full refund only.**

## 36.6 Wellness redemption — atomic + active-sub semantics

- Balance-check + `REDEEMED` decrement + `HealthTestRedemption` insert in **one transaction** with the §36.1 conditional-update primitive (two concurrent 6-credit redemptions must not both succeed).
- "Active for redemption" (D6=A) = `ACTIVE`, **including `cancelAtPeriodEnd` while still inside the paid period**; `PAST_DUE` / `CANCELED` = blocked. An already-`APPROVED` redemption is honored even if the sub later cancels.

## 36.7 Dunning + recovery reconciliation

- `invoice.payment_failed` → `PAST_DUE`, no grant. Current-period credits persist until `currentPeriodEnd` (Q5=A).
- A later **recovered** `invoice.payment_succeeded` runs the normal period-keyed grant (§36.2) → grants once, advances `paidMonthsCount` once even if days late.
- App-level dunning/cancel (§28) must not fight Stripe's own retry schedule — let Stripe retry; app cancels only after Stripe exhausts retries (`customer.subscription.deleted`) or a defined grace window. Debounce perk-unlock emails (don't fire on a recovered-then-cancelled blip).

## 36.8 Subscribe idempotency & customer reuse

- Enforce **one ACTIVE/INCOMPLETE `UserSubscription` per user** (partial unique index on `userId WHERE status IN ('ACTIVE','INCOMPLETE','PAST_DUE')`). If one exists on subscribe, return it / route to billing portal — never create a second Stripe subscription.
- **Reuse one `stripeCustomerId` per user** (lookup-or-create), so billing history isn't fragmented.

## 36.9 Rule snapshotting (or drop the promise)

§26 promises active subscribers run on a snapshot, but §20 rules are live mutable rows — editing a discount/credit count today silently re-prices every subscriber.

**DECIDED (D18): snapshot at subscribe + each renewal.** Add `UserSubscription.planSnapshot` (JSON of the resolved rule set) **[NEW]**; the pricing engine and credit grants read the **snapshot**, not live rows. Admin edits to a plan apply to *new* periods only — existing subscribers keep the terms they signed up under until their next renewal, when a fresh snapshot is captured.

## 36.10 Admin service-picker + country-integrity guard

- **DB guard (now structural — §20):** `PlanConsultationRule` carries `countryId` (= `plan.countryId`) and has **two composite FKs** — `(serviceId, countryId)→Service(id, countryId)` and `(planId, countryId)→PricingPlan(id, countryId)` — so the DB itself guarantees plan, rule, and Service are all the same country. No reliance on app logic. Still validate `countryId == plan.countryId` in `POST/PATCH /api/admin/plans/:id/consultation-rules` for a clean error message, but the FKs are the real guarantee against cross-country corruption.
- Admin service-picker UI: list scoped to `plan.countryId`, GP vs SPECIALIST distinguished, per-rule fields (`discountMode`, `creditsPerUse`, `unlockAfterPaidMonths`, `familyUsable`). This is a named **Wave 1** deliverable.

## 36.11 Prescription exclusion — enforce in 3 places

D12 (no prescription) — note PRESCRIPTION still exists in code (`ServiceKind.PRESCRIPTION` `schema.prisma:38`, prescription pages live; this plan does **not** remove them). Exclude from subscriptions by:
1. Server validation in `POST/PATCH .../consultation-rules`: reject `serviceId` where `Service.kind = PRESCRIPTION`.
2. Filter `PRESCRIPTION` out of the admin service-picker list.
3. Defensive guard in the §21 pricing engine (never apply plan pricing to a PRESCRIPTION service).

## 36.12 Family flow (Q3=D) — make it buildable

**DECIDED (D20): family usage is deferred to Wave 5 — not in v1 launch.** Premium-only when shipped. Currently only a `FamilyMember` entity + per-rule `familyUsable` flag — no flow. When built, add:
- **Plan-level `familyEnabled` flag** on the plan row **[NEW]**, default **false**, so "family per plan" (Q3=D) has a home. **Seeded `false` for ALL plans in v1** (family is Wave 5 — D20); the Wave 5 family migration flips Premium to `true`. Do not seed it `true` while the flow is unbuilt.
- Patient endpoints `/api/me/family` (CRUD family members) + account UI surface.
- Booking-on-behalf at checkout: select a registered family member → pass into §21 credit resolution; credit attributed to the subscription, `familyUsable` + perk-unlock checked. (Distinct from email-only `OrderItem.bookingForOther`.)
- Own sub-spec in **Wave 5**.

## 36.13 Manual-approval perks — per-subscriber, with a queue

`PlanPerkRule.isApproved` is plan-wide → approving once unlocks for ALL subscribers. Manual approval must be **per-subscriber**: move approval state to a `UserSubscription`↔perk join (or `SubscriptionPerkGrant` **[NEW]**). Add an admin **pending-approval queue** endpoint/screen + a patient request action + a dashboard "pending approval" state.

## 36.14 Public pricing country resolution + empty state

- Public pricing route must be **country-scoped** (`/[country]/[lang]/pricing`) so `resolveCountry` (`frontend/lib/routing/resolve-country.ts`, default fallback `ie`) yields the path slug. (No `/pricing` route exists today — `pricing-plans.ts` is empty `[]` — so build it country-scoped from the start; this is a build rule, not a fix to a leaking page.)
- Define the **empty state**: when the resolved country has zero active plan rows → "not available in your country", not a blank page (matches revised §5).
- Anonymous → subscribe conversion (D15 no guest): pricing CTA routes to login/register, then resumes the subscribe action.

## 36.15 Feature flag + ledger key hygiene

- `Country.enabledFeatures` does **not** yet include `subscriptions` (`schema.prisma:287`). Add the `subscriptions` key to the backend + frontend feature constants and the admin "Pages" shell mapping.
- ⚠️ **Legacy-default trap:** the frontend helper `frontend/lib/content/country-features.ts:34` treats a **missing/empty `enabledFeatures` array as ENABLED** (everything on). So a naive add would make subscriptions appear in **every** country with no flags set. **`subscriptions` must be strictly opt-in:** treat it as enabled **only when the key is explicitly present** in the array — bypass the "empty = enabled" fallback for this key specifically (or backfill every existing country's `enabledFeatures` with an explicit list that omits `subscriptions`). Verify both the public pricing route AND `POST /api/me/subscription` enforce the explicit-presence check (defense in depth — never trust the frontend gate alone).
- This is how the pilot-country-only rollout (§32) is enforced; only the pilot country gets `subscriptions` added.
- Ledger `idempotencyKey` must be **NOT NULL** (Postgres treats multiple NULLs as distinct, defeating the unique constraint). Manual `ADJUSTMENT` rows use a server-generated key `admin:{adminId}:{requestId}`.

## 36.16 Schema deltas to §20 (from this section)

> **These are now folded into §20 — the §20 "Wave 0 schema checklist" is authoritative.** This subsection is kept for the rationale + the `planSnapshot` field enumeration.

- **[NEW]** `SubscriptionCreditBalance` `(id, userSubscriptionId, kind: CONSULTATION|WELLNESS, balance, updatedAt)` — unique `(userSubscriptionId, kind)`. **Sole authority for spend checks** (§36.1) for BOTH consultation and wellness balances.
- **[NEW]** `UserSubscription.planSnapshot` (JSON) + `snapshotVersion` (int) — resolved terms captured at subscribe and at **each renewal** (§36.9). **Must contain** (enumerated so two implementers snapshot the same shape): `monthlyPriceCents`, `currencyCode`, `monthlyConsultationCredits`, `wellnessCreditsPerMonth`, `familyEnabled`; each `PlanConsultationRule` (`serviceId`, `isIncluded`, `usesCredits`, `creditsPerUse`, `discountMode`, `discountPercent`, `fixedPriceCents`, `unlockAfterPaidMonths`, `familyUsable`); each `PlanPerkRule` (`perkKey`, `unlockMode`, `unlockAfterPaidMonths`); each `HealthTestKitRedemptionRule` (`healthTestId`, `requiredWellnessCredits`, `unlockAfterPaidMonths`). The pricing engine (§21) and grants (§36.2) read **only** the snapshot; `serviceId`/`healthTestId` resolve against live rows for display only, never for price.
- **[NEW]** `Plan.familyEnabled` (bool, default false) (§36.12). Seeded **false** in v1 (family is Wave 5 — D20); the Wave 5 migration flips Premium on.
- **[NEW]** `SubscriptionPerkGrant` `(id, userSubscriptionId, perkKey, status, approvedByAdminId?, createdAt)` — per-subscriber manual approval (§36.13).
- **[CHANGE]** `PricingPlan` field reconciliation — **rename, do NOT add parallel columns**: existing `priceCents` (Int) → `monthlyPriceCents`; existing `interval` (String) → `billingInterval` (new `BillingInterval` enum, values incl. `MONTHLY`) with data backfill. The Stripe Price sync (§32) and §21 engine read the one canonical price column.
- **[CHANGE]** both ledgers: `idempotencyKey` **NOT NULL** (§36.15); `balanceAfter` is **demoted to advisory** (`balanceAfterHint`, never read for decisions — the counter row is authority; balance is reconstructable as `SUM(deltaCredits)` for audit). `PlanTranslation.locale` typed as the existing `LocaleCode` enum (not free String), matching `HealthTestTranslation`.
- **[RAW SQL]** the active-subscription uniqueness and the country-integrity guard are **not expressible as Prisma `@@unique`** — author as raw SQL in the Wave 0 migration (the repo already uses diff-from-live-DB + `migrate deploy`): partial unique `CREATE UNIQUE INDEX user_active_sub_ux ON "UserSubscription"("userId") WHERE status IN ('ACTIVE','INCOMPLETE','PAST_DUE')` (§36.8); and for §36.10 hard DB guard, add `countryId` to `PlanConsultationRule` + composite FK `(serviceId, countryId) → Service(id, countryId)` (needs `@@unique([id, countryId])` on `Service`).

## 36.17 Acceptance-criteria & sequencing notes

- §15 "cancelled users keep benefits … unless admin changes this rule" → clause **dropped** (Q5=A global; §15 updated).
- Marketing copy "after 2 paid months" (§2/§9/§30) must be **data-driven** from each rule's `unlockAfterPaidMonths` (i18n number token), since Q2/Q3=D make it configurable — not hardcoded.
- Manual booking path (`appointments.route.ts`): **DECIDED** — cart-first `/api/cart/checkout` only for v1; manual path stays admin/UNPAID, no credits. Mixed carts (a €0 credit line + a paid line in one checkout): allowed — §21 resolves per-item; the €0 line carries no Stripe line-item, paid lines proceed normally.

---

# 37. Audit Resolution Log

Full traceability for the 4-lens review (43 findings). Every finding and where it is resolved in this doc. Status: ✅ fixed in plan · ▶️ build-time rule (specified, enforced during implementation).

## CRITICAL (6)

| # | Finding | Resolution | Where |
|---|---|---|---|
| C1 | Append-only ledger + read-then-insert double-spends last credit | `SubscriptionCreditBalance` counter + atomic conditional `UPDATE`, ledger in same tx | §36.1, §36.16 ▶️ |
| C2 | Monthly reset/grant keyed on invoiceId → retry double-zero / zero-without-grant | Single tx, idempotency key **per billing period** | §36.2 ▶️ |
| C3 | €0 credit booking has no payment webhook → reserved-forever then released → re-spend | Commit at order-confirm for €0; commit/release mutually exclusive | §36.3 ▶️ |
| C4 | Q10 pending blocked Waves 2/3; credit re-grant on change undefined | Q10=B locked; exactly-once via `billing_reason` distinction | §35 Q10, §36.4 ✅ |
| C5 | Prescription exclusion (D12) unenforced; admin could attach PRESCRIPTION | Enforce 3 places (API validate + picker filter + pricing guard) | §36.11 ▶️ |
| C6 | Admin service-picker unspecified; `PlanConsultationRule` lacks countryId → cross-country corruption | Picker scoped to `plan.countryId` + hard country-match guard | §36.10, §25.1 ▶️ |

## HIGH (13)

| # | Finding | Resolution | Where |
|---|---|---|---|
| H1 | §16 Q1 stale rec (rollover) contradicts lock | §16 banner + §8 fixed (no rollover, Q1=A) | §16, §8 ✅ |
| H2 | §16 Q4 stale rec (wellness expiry) | §16 banner + §10 fixed (never expires) | §16, §10 ✅ |
| H3 | §16 Q6 stale rec + `requiresActiveSubscription` toggle | §16 banner + §11/§20 hard-pinned (D6=A) | §16, §11, §20 ✅ |
| H4 | §16 Q10 stale rec C; tech sections assumed proration | §16 banner + §26/§22/§25.2 set to B | §16, §26, §22 ✅ |
| H5 | Q2/Q3 not marked resolved | §16 banner (all → §35) | §16 ✅ |
| H6 | Refund via Stripe Dashboard bypasses admin UI; "credit used" ambiguous | Clawback in `charge.refunded` webhook; precise definition | §36.5 ▶️ |
| H7 | Plan-change double-grant (proration invoice) | Renewal grant only on `subscription_cycle` invoice | §36.4 ▶️ |
| H8 | Reservation-release vs commit race; TTL misalignment | Conditional atomic release; hold ≥ sweep + latency; fail-closed | §36.3, §28 ▶️ |
| H9 | Dunning + recovered-payment grant path undefined | Period-keyed grant on recovery; reconcile with Stripe retries | §36.7 ▶️ |
| H10 | Family flow missing; no plan-level enable | `familyEnabled` flag + endpoints; deferred Wave 5 (D20) | §36.12, §35 D20 ✅/▶️ |
| H11 | Public pricing country resolution + empty state | Country-scoped route + "not available" empty state | §36.14, §5 ✅/▶️ |
| H12 | §15 "unless admin changes" cancel rule unsatisfiable | Clause dropped (Q5=A global) | §15 ✅ |
| H13 | Manual booking path + mixed carts undecided | v1 cart-first only; mixed carts per-item | §36.17, §19.4 ✅ |

## MEDIUM (12)

| # | Finding | Resolution | Where |
|---|---|---|---|
| M1 | §16 Q5/Q7/Q8/Q9 stale framing | §16 banner | §16 ✅ |
| M2 | §5 fallback logic contradicts D11 | §5 rewritten (per-country, no merge) | §5 ✅ |
| M3 | §19.6 ConsultationType posed as open | Closed — D16 Service-only | §19.6 ✅ |
| M4 | §6 "types" implies dropped entity | Reworded to Service-row mapping | §6 ✅ |
| M5 | Prescription filter not propagated to admin UI | Picker filter specified | §36.11, §6 ▶️ |
| M6 | §11 active-sub toggle + redemption race | Toggle removed; atomic redemption | §11, §36.6 ✅/▶️ |
| M7 | §17.1 "pricingPlanId dead code" inaccurate | Reworded (validated/shown, not priced); migrate call sites | §17.1 ✅ |
| M8 | Subscribe idempotency / duplicate subs | One active sub per user (partial unique idx); reuse customer | §36.8, §36.16 ▶️ |
| M9 | Rule-snapshot promised, no entity | `UserSubscription.planSnapshot` (D18) | §36.9, §36.16, §35 D18 ✅/▶️ |
| M10 | `paidMonthsCount` semantics underspecified | Increment only on `subscription_cycle` + `amount_paid>0`; refund decrements | §36.2, §36.5 ▶️ |
| M11 | `Country.enabledFeatures` lacks `subscriptions` | Add flag; gate pricing/subscribe/admin | §36.15, §32 ▶️ |
| M12 | Manual-approval perk plan-wide not per-subscriber | `SubscriptionPerkGrant` + approval queue | §36.13, §36.16, §20 ✅/▶️ |

## LOW (8)

| # | Finding | Resolution | Where |
|---|---|---|---|
| L1 | §14 lists dropped entities | Kept as history (struck through) | §14 ✅ |
| L2 | "2 paid months" copy hardcoded | Data-driven from `unlockAfterPaidMonths` | §36.17 ▶️ |
| L3 | D12 implies prescription removed from code | Clarified: still in code, only excluded from plans | §36.11, §17.1 ✅ |
| L4 | Anchor `orders.route.ts:160-171` imprecise | Corrected to `:163-171`, subtotal `:177` | §17.1 ✅ |
| L5 | Anchor `account/page.tsx:40-370` | Corrected to `:40-410` | §17.1, §12-row ✅ |
| L6 | Anchor `AuditLog:2232-2260` | Corrected to `:2232-2253` | §17.1, §17.2 ✅ |
| L7 | Ledger `idempotencyKey` nullable defeats uniqueness | NOT NULL; manual key `admin:{adminId}:{requestId}` | §36.15, §36.16 ▶️ |
| L8 | Guest → login subscribe conversion unspecified | CTA → login/register → resume subscribe | §36.14 ▶️ |

**Summary:** 43/43 addressed — 24 fixed in-doc ✅, 19 specified as build-time rules ▶️. No finding left open.

---

# 38. Second-Review Hardening (recurring-billing realism — 29 further findings)

A second adversarial pass (regression + schema-integrity + real-world + code-feasibility) found 29 NEW issues, incl. 2 CRITICAL gaps the plan never scoped (VAT, SCA). All folded below. Contradictions and schema items are fixed in place (§3, §20, §22, §26, §31, §36.2, §36.5, §36.16); the new real-world scope is specified here.

## 38.1 VAT / tax + subscription invoicing **[CRITICAL — needs product/legal input]**

The repo's only invoice path (`generate-invoice.service.ts` `generateInvoiceForOrder`) fires from a paid **Order**; Stripe subscription charges create **no Order**, so the per-country `InvoiceCounter` (IE-00001…) + Make.com accounting webhook never run for subscription revenue. There is **no Stripe Tax** today and the `Invoice` model has **no tax/line-item/subtotal columns** (just number + country + email; VAT today is exempt-footer text in `invoice-pdf.ts`).

**v1 DECISION (LOCKED — D21):**
- **Stripe-hosted invoices are the system of record for subscription revenue** — Stripe owns invoice numbering, VAT lines, and the PDF. Do NOT route subscription charges through the existing Order→`generateInvoiceForOrder` path (`InvoiceCounter` stays order-only, avoiding number-sequence collisions).
- **Store a lightweight `SubscriptionInvoice` [NEW]** `(id, userSubscriptionId, stripeInvoiceId, number, amountPaidCents, currency, taxCents, periodStart, hostedInvoiceUrl, pdfUrl, status, createdAt)` from `invoice.payment_succeeded` — used only to **render the account → payments page** and link the Stripe-hosted PDF. No local PDF generation.
- **Email:** rely on Stripe's hosted invoice/receipt email (toggle on) — single source, no double emails; the §30 renewal email links the `hostedInvoiceUrl`.
- **VAT model (configurable, not code):** each plan row carries `vatMode` (`EXEMPT` default / `STANDARD`) + optional `vatRatePct`. Default = **EXEMPT** (medical telemedicine). Stripe Tax (`automatic_tax`) or a per-country `tax_rate` is set from this field; capture customer `tax_id`/VAT at checkout where `STANDARD`. **Changing a country's treatment = an admin config edit, no deploy.**
- **Launch-gate (operational, not a build blocker):** before enabling `subscriptions` for a country, an accountant confirms that country's `vatMode` (IE/PT/BR may differ from a one-off consultation; Portugal's "no local invoice" rule is moot since Stripe-hosted is the record). This is a go-live checklist item per country, so the build proceeds now with the EXEMPT default.

## 38.2 SCA / 3-D Secure + off-session renewals **[CRITICAL]**

Today everything is one-off `mode:"payment"` with **zero** `off_session` / `setup_future_usage` / mandate handling. EU PSD2 SCA requires: first charge **customer-authenticated** + a **mandate** so merchant-initiated renewals charge off-session.

Required:
- Use Stripe **Checkout `mode:"subscription"`** (collects SCA + mandate on first charge) or PaymentIntent `setup_future_usage='off_session'`; store the PM as off-session usable.
- Handle **`invoice.payment_action_required`** as a distinct state (not a hard fail) — surface the Stripe hosted-invoice authentication link in dunning emails; otherwise renewals soft-decline and dunning never recovers.

## 38.3 Currency rounding (percentage discounts)

`computeSlotPrice` returns integer cents; `discountPercent` produces fractional cents (10% off 7999 = 7199.1). **Rule: round-half-up to nearest cent — `Math.round(baseCents * pct / 100)`** — applied **once, server-side**; the engine output MUST equal the Stripe charge amount (anti-tamper recompute must reproduce the same integer). Unit-test fractional-cent cases.

## 38.4 GDPR erasure vs active subscription

§33 says "anonymize ledgers, retain financial records" but not the active-sub case. Runbook:
- On deletion request with an **ACTIVE** sub: **cancel the Stripe subscription first** (or block deletion until cancelled) — never leave off-session charges hitting an anonymized user.
- **Forfeit** outstanding wellness-credit balance; **cancel** pending `HealthTestRedemption`s with notice.
- Anonymize PII but retain `Invoice`/ledger financial rows under a **legal-hold tag** for the statutory EU retention period (reconcile with erasure).

## 38.5 Dunning — single owner

Three systems could email a `PAST_DUE` user (Stripe Smart Retries + hosted emails, the §28 cron, the existing automation engine). **Designate one owner:** rely on **Stripe Smart Retries + Stripe hosted dunning emails**; reduce the §28 app cron to **cancel-after-grace only**; the automation engine **must NOT** send subscription dunning. (Or the inverse — but exactly one owner.)

## 38.6 Price change for existing subscribers

Stripe `Price` objects are immutable and D18's snapshot covers *rules*, not the monthly price. A price change requires a **new Price** + migrating each subscription's items. **Policy (D22 LOCKED — grandfather):** existing subscribers keep their snapshotted price until they cancel — no forced migration. Snapshot the **active `stripePriceId` + `monthlyPriceCents` per subscription**, not just rules. (If a future forced migration is ever needed, it must use `proration_behavior:'none'` + a statutory advance-notice email per EU consumer law.)

## 38.7 Webhook ordering / replay tolerance

Stripe does not guarantee event order; `ProcessedWebhookEvent` only dedupes, not orders. **Make status/period writes monotonic:** ignore an event whose subscription `current_period_start` (or `event.created`) is older than the last synced value; on ambiguity, **re-fetch the live subscription from Stripe** rather than trusting the payload. Period-keyed grant idempotency (§36.2) is the backstop against a late/duplicated renewal.

## 38.8 Trials & coupons — scope

A trial / 100%-coupon invoice has `amount_paid = 0`, which §36.2 excludes from credit grants and `paidMonthsCount`. **Decision (D23): no free trials or promo coupons in v1** — ensure no Stripe coupon/trial can be applied to the subscription Price. If later added, define whether a trial month grants credits and counts toward perk unlock, and the coupon×VAT×rounding interaction.

## 38.9 Schema / migration notes (from schema-integrity lens)

- **Balance authority:** `SubscriptionCreditBalance` is the **sole** spend authority for both kinds; ledger `balanceAfter` demoted to advisory `balanceAfterHint` (§36.16, §20 updated).
- **`PricingPlan` rename** (no parallel columns): `priceCents → monthlyPriceCents`, `interval(String) → billingInterval(BillingInterval enum)` + backfill (§36.16).
- **`planSnapshot` field list** enumerated + `snapshotVersion` (§36.16).
- **`PlanTranslation.locale` = `LocaleCode` enum** (§20).
- **Partial unique index** (one active sub/user) + **composite-FK country guard** are **raw SQL** in the Wave 0 migration — not Prisma `@@unique` (§36.16).
- `HealthTestRedemption` insert **before** the wellness ledger row (§36.6); invariant: if `orderId` set, `Order.userId == redemption.userId`.

## 38.10 Decisions added — now LOCKED (mirrored in §35)

| # | Decision | LOCKED |
|---|---|---|
| D21 | VAT treatment for medical subscription per country (IE/PT/BR) | **Default EXEMPT, per-country configurable** (`Plan.vatMode`); accountant confirms per country at go-live (launch-gate, not a build blocker); Stripe-hosted invoices are the record |
| D22 | Price change for existing subscribers | **Grandfather** at snapshotted price until cancel (no forced migration) |
| D23 | Free trials / promo coupons in v1 | **No** — out of scope v1 |
| D24 | Health-kit redemption shipping/stock | **Shipping separate; stock at confirm; cancel restores** |

## 38.11 Second-review resolution log (29)

| Severity | Finding | Resolution | Status |
|---|---|---|---|
| CRIT | VAT/tax + subscription invoicing absent | §38.1; D21 LOCKED (configurable `vatMode`, EXEMPT default, go-live gate) | ✅ |
| CRIT | SCA/3DS + off-session renewals absent | §38.2 | ▶️ |
| HIGH | Idempotency key still `{invoiceId}` in §22/§26 (regression) | Fixed → period key | ✅ |
| HIGH | `planSnapshot` contents unspecified; grant read live | §36.16 enumerated; §36.2/§22 read snapshot | ✅ |
| HIGH | `PricingPlan` field collision (priceCents/interval) | Rename decision §36.16 | ✅ |
| HIGH | Dual/triple balance authority (consultation) | Counter sole authority; hint demoted | ✅ |
| HIGH | Dual balance authority (wellness) | Same — counter authority | ✅ |
| HIGH | % discount rounding undefined | Round-half-up §38.3 | ✅ |
| HIGH | GDPR erasure vs active sub | Runbook §38.4 | ▶️ |
| HIGH | Dunning owned by 3 systems | Single owner §38.5 | ✅ |
| HIGH | Price change for existing subs | §38.6; D22 | ✅ + decision |
| HIGH | Webhook ordering/replay | Monotonic + re-fetch §38.7 | ▶️ |
| MED | §3/§31 family promises deferred feature | §3 copy + §31 seed false | ✅ |
| MED | Seed `familyEnabled=true` vs deferral | Seed false §31/§36.12 | ✅ |
| MED | `PlanTranslation.locale` should be enum | `LocaleCode` §20 | ✅ |
| MED | Partial unique index ≠ Prisma `@@unique` | Raw SQL note §36.16 | ✅ |
| MED | Redemption insert order / invariant | §36.6 note §38.9 | ✅ |
| MED | Refund 7-day anchor/timezone | UTC `charge.created` §36.5 | ✅ |
| MED | Trials/coupons unscoped | Out of scope v1, D23 | ✅ |
| LOW | §20 "balance = sum of deltas" vs counter | Counter named authority §20 | ✅ |
| LOW | Country guard DB-level | Composite-FK option §36.16 | ✅ |
| LOW | `appointmentId` cart-first only | Field comment §20 | ✅ |
| LOW | `familyEnabled` additive safe | Confirmed; drop-back-relation note | ✅ |
| LOW | §36.14 `/pricing` route doesn't exist | Clarified build-rule wording | ✅ |
| LOW | `pricingPlanId` validation lenient | Noted §17.1 | ✅ |
| LOW | `Invoice` model has no tax columns | Tied into §38.1 | ✅ |
| LOW | `billing_reason` Stripe fact | Confirmed sound — no change | ✅ |
| LOW | Partial unique feasibility caveat | Raw SQL §36.16 | ✅ |
| LOW | resolve-country fallback `ie` | Confirmed accurate | ✅ |

**Summary:** 29/29 addressed. 3 decisions raised and now **all LOCKED** (D21 VAT = configurable EXEMPT-default + go-live gate, D22 grandfather price, D23 no trials/coupons). Plan covers recurring-billing realism end-to-end.

---

# 39. Operational Safety — Reconciliation, Invariants & Alerts

Analytics (§34) cover product metrics; this covers **money/ops safety**. Money systems silently drift — every item below fails **closed** and alerts on error.

| Job / check | Cadence | Purpose |
|---|---|---|
| **Stripe ↔ DB reconciliation** | daily | Compare every `ACTIVE`/`PAST_DUE` `UserSubscription` against the live Stripe subscription (status, `current_period_end`, latest invoice). Flag drift (e.g. Stripe `canceled` but DB `ACTIVE`, or a paid invoice with no grant). Self-heal the safe cases; alert the rest. |
| **Ledger ↔ balance invariant** | daily | Assert `SubscriptionCreditBalance.balance == SUM(ledger.deltaCredits)` per `(sub, kind)`. Any mismatch = alert + freeze spend on that subscription until reviewed (drift = a double-spend or lost grant). |
| **Invoice grant coverage** | daily | Every `invoice.payment_succeeded` with `billing_reason ∈ {subscription_create, subscription_cycle}` AND `amount_paid>0` has exactly one period-keyed grant — **including the first invoice (`subscription_create`)**, else month-1 missing grants never alert. Missing/duplicate → alert. |
| **Expired-reservation alert** | hourly | `RESERVED` rows past TTL that the 5-min release sweep didn't clear (sweep stuck / cron fail-open) → alert. |
| **Webhook failure alert** | realtime | A subscription webhook that errors/throws after retries → alert (don't let a dropped event silently skip a grant or a cancel). |
| **Stripe Price-sync failure** | on edit | Creating/archiving a Price failed → hard-fail the admin action + alert; never leave a plan without a valid `stripePriceId`. |
| **Dunning / failed-renewal digest** | daily | Count of `PAST_DUE` + recovery rate; alert on spikes (issuer/SCA problems). |

Route alerts to the existing ops channel; each check is **idempotent** and logs what it found. Add a small admin "subscription health" panel surfacing the latest reconciliation diff.

---

# 40. Legal / Terms Copy (subscription-specific)

Recurring billing has statutory disclosure requirements (EU consumer law / PSD2). Plan `notesTerms` is not sufficient — add subscription terms to the **legal/terms surfaces** (terms page, checkout consent, confirmation email), country-aware (ties to `CountryLegalProfile`).

Must cover:
- **Recurring billing authorization / mandate** — explicit consent that the card is charged **automatically every month** until cancelled (SCA mandate text, §38.2).
- **Auto-renewal** — renews each month at the then-current price; renewal date = subscription anniversary.
- **Cancellation timing** — cancel anytime; benefits continue until the **end of the paid period**, no partial-month refund (Q5=A).
- **Refund policy** — D17/D19: no refund after **7 days**, none if a consultation credit was used that month; no partial refunds.
- **Price-change notice** — existing subscribers grandfathered (D22); any future change communicated with statutory advance notice.
- **Country-specific tax / consumer wording** — VAT treatment per country (D21) and any local cooling-off / withdrawal rights.
- **Service scope** — **online/video consultations only** (no physical visits, §1); GP-led; specialist as discount; **no prescriptions** (D12).
- **Credits & wellness terms** — credits expire monthly with no rollover (Q1); wellness credits redeemable only for eligible kits, non-cash, non-transferable; perks unlock after 2 paid months.
- **Family usage** — only when shipped (Wave 5, D20) — omit from v1 terms.

Add a checkout **consent checkbox** ("I authorize the recurring monthly charge and accept the subscription terms") gating the subscribe action.

---

# 41. Cleanup Resolution Log (owner review)

| Item | Resolution | Where |
|---|---|---|
| §22/§26 grant key still `{invoiceId}` | Already fixed prior turn (period key) — verified | §22, §26 ✅ |
| §20 ledger-sum as authority | Already fixed prior turn (counter authority) — verified | §20 ✅ |
| §21 commit only on webhook | Folded €0 order-confirm commit | §21 ✅ |
| Stripe Price versioning (immutable) | `stripeProductId` + new-Price-on-edit + grandfather rule + optional history | §22, §32, §20 ✅ |
| Subscription checkout webhook coverage | `checkout.session.completed`, INCOMPLETE→ACTIVE, SCA action-required, finalization-failed, dispute | §25.3 ✅ |
| Invoices/VAT/receipts v1 | Stripe-hosted = record; `SubscriptionInvoice` for account page; `Plan.vatMode` EXEMPT default (D21 LOCKED) | §38.1 ✅ |
| Feature-flag legacy "empty = enabled" trap | Strict opt-in; explicit-presence check + backfill; backend+frontend | §36.15 ✅ |
| Reconciliation + ops alerts | New ops section | §39 ✅ |
| §27 money-race tests | Added 8 concurrency/refund/dispute cases | §27 ✅ |
| Health-test shipping/stock | D24: shipping separate, stock at confirm, cancel restores | §11 ✅ |
| Admin: DELETE=deactivate + scope | Soft-delete only + `MANAGE_SUBSCRIPTIONS` scope | §25.1 ✅ |
| Legal subscription terms | New legal-copy section | §40 ✅ |

New decision **D24 — LOCKED**: redemption shipping paid separately, stock at confirm, cancel restores credits+stock.

**All decisions D1–D24 are now LOCKED.** No open product/legal blockers remain in the plan; D21's per-country VAT confirmation is an operational go-live checklist item (configurable, EXEMPT default), not a build dependency.

---

# 42. Pre-Implementation Cleanup (3rd owner pass)

| Blocker | Resolution | Where |
|---|---|---|
| Initial month credits never grant (`subscription_cycle` only; first invoice is `subscription_create`) | Grant + `paidMonthsCount` now fire on **both** `subscription_create` (first, paid) and `subscription_cycle` (renewals); proration/€0 still excluded; period key dedups | §22, §36.2, §25.3 ✅ |
| Reservation had no identity | Added `reservationId`, `orderItemId?`, `reservedUntil` + explicit deltas (RESERVED −1 / CONSUMED 0 / RELEASED +1) + raw-SQL **terminal uniqueness** (one CONSUMED-or-RELEASED per reservation) | §20, §21, §36.3 ✅ |
| Redemption €0-order vs separate shipping contradiction | Redemption = **shipping-only paid checkout**; credits + stock **reserved** then **committed on shipping-payment success** (or instant if `shippingCents=0`), released on abandon | §11 ✅ |
| Dunning ownership contradiction | **Stripe owns customer dunning**; app cron = cancel-after-grace + internal ops digest only; app sends no failed-payment email | §28, §30, §38.5 ✅ |
| Perk-approve route was plan-shaped | Route now per-subscriber: `GET/POST /api/admin/subscription-perk-grants[...]/approve` + pending queue (`SubscriptionPerkGrant`) | §25.1, §36.13 ✅ |
| Data model split across sections | All models + fields folded into §20 with an authoritative **Wave 0 schema checklist** (incl. `SubscriptionCreditBalance`, `SubscriptionPerkGrant`, `SubscriptionInvoice`, `UserSubscription.planSnapshot/snapshotVersion/stripePriceId`) | §20 ✅ |

§20 is now the single source for Wave 0 migration work.

---

# 43. Pre-Implementation Cleanup (4th owner pass)

| Blocker | Resolution | Where |
|---|---|---|
| `monthlyConsultationCredits` had no source field | Added to `PricingPlan` as the single source the snapshot/grant reads (not derived from rules) | §20 ✅ |
| `PlanConsultationRule` lacked `countryId` for the composite FK | Added `countryId` (= `plan.countryId`) + documented; `Service` gets `@@unique([id, countryId])` as FK target | §20 ✅ |
| `WellnessCreditLedger` had no reservation identity | Added `RESERVED`/`RELEASED` reasons, `reservationId` (= `HealthTestRedemption.id`), `reservedUntil`, terminal-uniqueness index | §20, §11 ✅ |
| Pricing `ACTIVE`-only vs §36.7 PAST_DUE-keeps-credits | Eligibility = `ACTIVE` OR (`PAST_DUE`/`cancelAtPeriodEnd` while `now < currentPeriodEnd`); credits + discounts persist to period end; redemption stricter | §21 ✅ |
| Plan-change had no pending fields | Added `pendingPlanId?`, `pendingStripePriceId?`, `pendingChangeEffectiveAt?`, `stripeSubscriptionScheduleId?` to `UserSubscription` | §20 ✅ |
| Refund guard couldn't deny a completed Stripe refund | Split: policy guard runs **pre-refund** (request) and can deny; `charge.refunded` webhook **always reconciles/claws back** post-refund + flags violations | §36.5 ✅ |
| §25.2 redemption route said "deduct → Order" | Now "reserve credits/stock + return shipping Checkout URL" | §25.2 ✅ |
| §15 "set plan price globally" stale | Changed to per-country (D11) | §15 ✅ |

---

# 44. Pre-Implementation Cleanup (5th owner pass)

| Blocker | Resolution | Where |
|---|---|---|
| Country guard only proved service↔rule, not rule↔plan | Added **second** composite FK `(planId, countryId)→PricingPlan(id, countryId)` + `@@unique([id, countryId])` on PricingPlan — now plan, rule, service are provably one country at the DB level | §20, §36.10 ✅ |
| Wellness "REDEEMED-as-reserve" contradicted new lifecycle | Flow now: `RESERVED` (−N) at reserve, terminal `REDEEMED` (0) at commit / `RELEASED` (+N) on abandon — matches §20 | §11 ✅ |
| Redemption "shipping line" but no SHIPPING kind exists | Explicit: one `HEALTH_TEST` `OrderItem` `unitPriceCents=0`, postage in `Order.shippingCents` (existing field) | §11 ✅ |
| Ops invoice-grant check only `subscription_cycle` | Now includes paid `subscription_create` (first invoice) so month-1 missing grants alert | §39 ✅ |
| §36.10 stale ("no countryId") | Updated to the two-FK structural guarantee | §36.10 ✅ |
