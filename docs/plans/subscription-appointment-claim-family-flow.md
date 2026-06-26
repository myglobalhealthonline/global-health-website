# Subscription Appointment-Claim Flow — Per-Line Benefit Choice & Premium Family Usage

**Date:** 2026-06-26
**Branch base:** `main`
**Status:** Implementation plan. **No code changed yet.** Investigation complete and grounded against current source (line numbers verified 2026-06-26).
**Author intent:** Let a GP/Specialist booker (a) see whether their plan covers/discounts a consultation, (b) *choose* per line to pay normally / use a credit / use a discount, and (c) use eligible benefits for an **approved family member** — but only on **Premium**. Backend is the single source of truth.

---

## 0. Executive summary (read first)

The subscription engine is **far more complete than the brief assumes**. The pricing resolver, atomic credit reserve/commit/release ledger, plan snapshot, anti-tamper server-side recompute at checkout, and the read-only cart coverage preview are **already built, wired, and test-covered** on `main`. This is a **targeted extension + harden**, not a greenfield build.

Two facts make the family work much cheaper than expected:

1. **The plan snapshot already carries everything family eligibility needs.** `PlanSnapshot.familyEnabled` (`plan-snapshot.ts:48`) and `SnapshotConsultationRule.familyUsable` (`plan-snapshot.ts:27`) are captured at subscribe + each renewal. **No snapshot shape change is required** to decide family eligibility.
2. **`FamilyMember` exists but is 100% unused** (`schema.prisma:3254`) — no API, no UI, no enforcement. It is a clean greenfield surface; nothing to migrate or unwind.

### What is genuinely missing (the scope of this plan)

| # | Gap | Where it lands |
|---|-----|----------------|
| G1 | **Per-line benefit choice.** Today checkout *auto-applies* the best benefit. The brief requires an explicit per-line `PAY_NORMAL / USE_PLAN_CREDIT / USE_PLAN_DISCOUNT`, and **no credit consumed unless chosen** (req #2, #8). | `pricing-resolver.ts`, `checkout-pricing.service.ts`, new `CartItem.benefitSelection` |
| G2 | **Family-member targeting with real proof.** `CartItem.bookingForOther` is a free bool — *not* proof of an approved dependent. Need a `FamilyMember` FK + ownership check (req #3, #4, #12). | new `CartItem.familyMemberId`, cart/checkout routes |
| G3 | **Family eligibility enforcement.** No code checks family usage anywhere yet. Need a backend predicate combining active sub + Premium + `familyEnabled` + `familyUsable` + member ownership + `canUseCredits` + unlock + credits (req #5). | new `family-eligibility.ts`, integrated into pricing |
| G4 | **Premium-only family guard for admins.** `familyEnabled` can currently be set `true` on *any* plan type; `familyUsable` on any rule (req #6, #13). | `plans.service.ts`, `admin-plans.schema.ts`, `plan-rules.service.ts` |
| G5 | **Family member management.** No way for a user to create/list/approve dependents (prerequisite for G2). | new `family.route.ts`, `/account/family` UI |
| G6 | **Frontend choice UI.** Per-line benefit selector, family dropdown, richer coverage/eligibility states (req #10). | booking form, cart page, `PlanCoverage.tsx`, checkout page |
| G7 | **Test matrix** for all of the above (req #14). | new backend integration tests |

### What must NOT regress (already correct — keep it)

- **Backend is the only pricing authority.** Checkout re-derives every consultation price from current peak config (`orders.route.ts:131` `computeEffectivePrices`) and re-runs the subscription resolver inside the order transaction (`orders.route.ts:174`). **The frontend sends no prices** (verified: `checkoutBodySchema` carries only payer/shipping contact). Preserve this.
- **Atomic credit reservation.** `reserveCredits` is a conditional `UPDATE … WHERE balance >= amount` (sole authority `SubscriptionCreditBalance`, `schema.prisma:3121`). Commit/release are mutually exclusive via a raw-SQL partial unique on `reservationId`. Never bypass.
- **Release on failure/expiry.** The reservation sweep + webhook `expired`/`async_payment_failed` paths already release. New `PAY_NORMAL` lines must simply **never reserve** in the first place.

---

## 1. Current architecture (grounded map)

### 1.1 The pure pricing core — `backend/src/modules/subscriptions/`

| File:line | Symbol | Role |
|-----------|--------|------|
| `pricing-resolver.ts:55` | `resolveConsultationPrice(input)` | **Pure.** Priority: CREDIT (€0, reserve N) → FIXED → PERCENT → NORMAL. Gated by `paidMonthsCount >= rule.unlockAfterPaidMonths`. No I/O. **← primary injection point for G1 + G3.** |
| `pricing-resolver.ts:36` | `percentDiscountAmountCents` | Round-half-up discount, applied once server-side (anti-tamper reproducible). |
| `pricing-resolver.ts:115` | `isPerkUnlocked` | `MONTH_1` / `AFTER_PAID_MONTHS` / `MANUAL_APPROVAL` / `NOT_AVAILABLE` gate. |
| `subscription-eligibility.ts:21` | `isBenefitEligible` | **Pure.** ACTIVE always (unless `cancelAtPeriodEnd` past period); PAST_DUE until period end; INCOMPLETE/CANCELED never. |
| `plan-snapshot.ts:18` | `SnapshotConsultationRule` | Frozen per-rule snapshot — **includes `familyUsable` (`:27`)**. |
| `plan-snapshot.ts:42` | `PlanSnapshot` | Frozen plan snapshot — **includes `familyEnabled` (`:48`)**. `asPlanSnapshot` (`:132`) narrows the `Json?`. |

### 1.2 Checkout pricing integration — `checkout-pricing.service.ts`

| File:line | Symbol | Role |
|-----------|--------|------|
| `:46` | `reserveAndPriceConsultations(tx, input)` | Inside order tx: loads ACTIVE/PAST_DUE sub (`:59`), reads snapshot (`:79`), mirrors the live consultation counter (`:84`), iterates items, calls the resolver (`:96`), **atomically reserves** credit (`:105`), returns `lines: Map<itemId, PlanLine>`. **← G1/G3 integration.** |
| `:103-129` | (credit branch) | On `mode==="CREDIT"`: `reserveCredits`, 15-min TTL; lost-race fallback to discount/normal. |
| `:169` | `previewConsultationPricing(input)` | **Dry-run sibling** — same resolver, reserves/writes NOTHING. Returns `CartCoverage` (per-line `mode`, `savedCents`, totals, `consultationCreditsRemaining`). **← mirror every G1/G3 change here so preview matches checkout.** |
| `:276` | `linkReservationsToOrderItems` | After `order.create`, link each `RESERVED` ledger row to its `OrderItem`. |
| `:293` / `:316` | `commitOrderCreditReservations` / `releaseOrderCreditReservations` | Commit on pay/€0-confirm; release on abandon. |

### 1.3 Cart → Order → Webhook flow

| File:line | Symbol | Role |
|-----------|--------|------|
| `routes/cart.route.ts:50` | `addItemBodySchema` | `POST /api/cart/items` body. `patient` sub-object (`:69`) holds the intake snapshot incl. `bookingForOther` (`:77`). |
| `routes/cart.route.ts:101` | `updateItemBodySchema` | `PATCH /api/cart/items/:itemId` — **today only `quantity`.** |
| `routes/cart.route.ts:897` | `prisma.cartItem.create` | Stamps the snapshot incl. `bookingForOther` (`:919`). **← add `benefitSelection` + `familyMemberId`.** |
| `routes/orders.route.ts:99` | `POST /api/cart/checkout` | Anti-tamper recompute (`:131`); calls `reserveAndPriceConsultations` only when `userId` set (`:174`); creates Order + items (`:200-258`); €0 path commits immediately (`:279`); else Stripe session (`:346`); credit-covered (€0) lines excluded from Stripe line items (`:320`). |
| `routes/orders.route.ts:221` | (OrderItem create map) | Copies CartItem snapshot → OrderItem incl. `bookingForOther` (`:241`). **← copy `benefitSelection` + `familyMemberId`.** |
| `routes/payments.route.ts` | webhook | Marks Order PAID, mints Appointments from OrderItems, commits credit reservations. **← stamp Appointment from family member.** |
| `routes/me-cart-preview.route.ts:17` | `GET /api/me/cart-preview` | Auth-required; 401 for guests; calls `previewConsultationPricing`. **← thread selection + family context.** |

### 1.4 Admin plan management

| File:line | Symbol | Current behaviour |
|-----------|--------|-------------------|
| `validations/admin-plans.schema.ts:72` | `planCreateBase` | `familyEnabled: z.boolean().default(false)` (`:90`) — **no `planType` constraint.** |
| `validations/admin-plans.schema.ts:97` | `adminPlanUpdateBodySchema` | `.omit({ … planType })` — planType **immutable** (good). |
| `validations/admin-plans.schema.ts:124` | `consultationRuleBase.familyUsable` | boolean, **no plan-type constraint.** |
| `modules/plans/plans.service.ts:122` | `createAdminPlan` | Already forces `wellnessCreditsPerMonth=0` for non-PREMIUM (`:144`). `familyEnabled` passed through raw (`:146`). **← mirror the wellness guard for `familyEnabled`.** |
| `modules/plans/plans.service.ts:176` | `updateAdminPlan` | `existing` select (`:180`) fetches only `{id, monthlyPriceCents, currencyCode}` — **`planType` not fetched.** **← add `planType` to the select + guard.** |
| `modules/plans/plan-rules.service.ts:83` | `setConsultationRule` | Upserts a rule incl. `familyUsable` — **no Premium/familyEnabled gate.** |

### 1.5 Data model (relevant rows)

```
PricingPlan        :862   planType@869 (immutable), familyEnabled@893 (default false)
PlanConsultationRule:3018 isIncluded/usesCredits/creditsPerUse/discountMode/
                          discountPercent/fixedPriceCents/unlockAfterPaidMonths/
                          familyUsable@3031/isActive
UserSubscription   :3077  status, planSnapshot@3099 (Json), paidMonthsCount
SubscriptionCreditBalance:3121  kind, balance  (SOLE spend authority)
ConsultationCreditLedger:3136  RESERVED→CONSUMED|RELEASED, reservationId, orderItemId,
                          idempotencyKey
CartItem           :1616  …, bookingForOther@1655   ← needs benefitSelection + familyMemberId
OrderItem          :1762  …, bookingForOther@1788   ← needs benefitSelection + familyMemberId
FamilyMember       :3254  primaryUserId, patientProfileId?, fullName, email?, dateOfBirth?,
                          relationship?, canUseCredits@3262   (UNUSED — greenfield)
```

### 1.6 Tests

- Runner: **`node --test` (node:test) + tsx**, real Postgres (no mocks). Backend: `pnpm --filter backend test`.
- Fixture factory: `modules/subscriptions/test-support.ts:54` `makeSubscriptionFixture(prisma, tag, opts)` — creates Currency→Country→User→PricingPlan→UserSubscription(+balances). `MakeFixtureOptions` (`:21`). **Needs extension** to set `planType`, `familyEnabled`, and to create `PlanConsultationRule` + `FamilyMember` + a `planSnapshot`.
- Best templates to copy: `modules/credits/credit-balance.service.test.ts` (races/atomicity), `modules/subscriptions/checkout-pricing.service.test.ts` (reserve+price), `pricing-resolver.test.ts` (pure), `validations/admin-plans.schema.test.ts` (schema).

---

## 2. Design decisions

> Made per the brief's "if ambiguous, make a reasonable decision and document it." Items marked **(confirm)** are worth a quick sign-off; the rest are defaults I will implement.

- **D1 — `benefitSelection` is per line, default `PAY_NORMAL`, and the DB column default is `PAY_NORMAL`.**
  Rationale: req #2/#12 — *never* auto-consume a credit. A line that reaches checkout without an explicit `USE_PLAN_CREDIT` consumes nothing. The **frontend pre-selects the recommended option** (e.g. `USE_PLAN_CREDIT` when a credit is available) and writes it onto the line, so the common path still applies the benefit — but it is an explicit, persisted, user-visible choice, never silent. This is a deliberate behaviour change from today's auto-apply.

- **D2 — Selection + family target are set at add-to-cart and editable on the cart page.**
  Booking form sends initial `benefitSelection` + `familyMemberId`; cart line `PATCH` can change them. Extend `updateItemBodySchema` (`cart.route.ts:101`) beyond `quantity`.

- **D3 — Family eligibility is computed in the service layer (DB lookup) and passed as a boolean into the pure resolver.**
  Keep `resolveConsultationPrice` pure. A new pure predicate `resolveFamilyEligibility(...)` decides yes/no + reason from already-loaded data; `checkout-pricing.service.ts` does the `FamilyMember` lookup.

- **D4 — Premium is enforced via `snapshot.familyEnabled`, which is now write-gated to PREMIUM (G4).**
  The snapshot does **not** carry `planType`. Because G4 guarantees `familyEnabled` can only be `true` on PREMIUM, `familyEnabled === true` *is* the Premium proof at claim time. **(confirm)** Optionally add `planType` to the snapshot for belt-and-suspenders; I recommend **not** doing so (avoids touching the "frozen" snapshot shape; `familyEnabled` already suffices). Legacy snapshots predating the field → `familyEnabled` undefined → falsy → no family benefit (safe default).

- **D5 — `FamilyMember.canUseCredits` is the "approved to use benefits" gate.**
  New members default `canUseCredits=false`; the primary user (or admin) toggles it on. "Approved family member" (req #4) = belongs to user **and** `canUseCredits === true`. No separate approval-status enum in v1 (can add later). **(confirm)**

- **D6 — Family bookings spend the PRIMARY subscriber's credits/discount.**
  Reservations stay on the logged-in user's subscription balance. The family member is the *beneficiary/patient*, not a balance owner. No change to balance ownership.

- **D7 — `USE_PLAN_CREDIT` with insufficient credits falls back to `NORMAL` (full price), not to discount.**
  Surface `NOT_ENOUGH_CREDITS` in the preview so the UI can warn. Do not silently switch to a discount the user didn't pick (req #9 "falls back or blocks" → we fall back to pay-normal + visible reason). `USE_PLAN_DISCOUNT` never reserves a credit.

- **D8 — Specialist parity.** A specialist consultation is `€0`/credit **only** when its `PlanConsultationRule` has `isIncluded && usesCredits` (same engine as GP). Otherwise it is eligible for `FIXED`/`PERCENT` discount **only when the rule says so**, and only under `USE_PLAN_DISCOUNT`. This already falls out of the shared resolver — no special-casing (req #7).

---

## 3. Data-model changes

### 3.1 New enum + columns (`backend/prisma/schema.prisma`)

```prisma
/// Per-consultation-line benefit choice (§ appointment-claim). PAY_NORMAL is the
/// safe default: a line never consumes a credit unless the user explicitly chose
/// USE_PLAN_CREDIT. USE_PLAN_DISCOUNT applies an eligible fixed/percent discount
/// only, never a credit.
enum BenefitSelection {
  PAY_NORMAL
  USE_PLAN_CREDIT
  USE_PLAN_DISCOUNT
}

model CartItem {
  // … existing …
  benefitSelection BenefitSelection @default(PAY_NORMAL)
  /// Approved dependent this consultation is booked for (Premium family usage).
  /// Null = booking for the account holder. FK proves the member belongs to a
  /// real account; ownership (primaryUserId == cart user) is re-checked server-side.
  familyMemberId   String?
  familyMember     FamilyMember? @relation(fields: [familyMemberId], references: [id], onDelete: SetNull)
}

model OrderItem {
  // … existing …
  benefitSelection BenefitSelection @default(PAY_NORMAL)
  familyMemberId   String?
  familyMember     FamilyMember? @relation(fields: [familyMemberId], references: [id], onDelete: SetNull)
}

model FamilyMember {
  // … existing … add inverse relations:
  cartItems  CartItem[]
  orderItems OrderItem[]
}
```

**Optional (provenance, recommended but not required):**

```prisma
model ConsultationCreditLedger {
  // …
  familyMemberId String?   // which dependent a reserved/consumed credit was used for
}
model Appointment {
  // …
  familyMemberId String?   // beneficiary dependent, for the patient portal + audit
}
```

> Keep the optional columns out of v1 if you want the smallest diff; the snapshot patient fields (`patientFullName`/`patientEmail`/…) already carry the family member's identity onto the OrderItem, so appointments still mint correctly without `Appointment.familyMemberId`. I recommend shipping at least `OrderItem.familyMemberId` (audit) and deferring the ledger/appointment columns to a fast-follow.

### 3.2 Migration hazard (must read)

`prisma migrate dev` is **broken in this repo** — a pre-existing cart-first migration references `CartItem` before it exists in the shadow DB (see memory `reference_migration_shadow_db_workaround`). **Do not run `migrate dev`.** Generate the migration with:

```bash
# from backend/
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_benefit_selection_family/migration.sql
# then apply with deploy (prod-safe), never dev:
npx prisma migrate deploy
```

Because all new columns are **nullable or have defaults**, the migration is additive and backfill-free. Verify the generated SQL only `ALTER TABLE … ADD COLUMN` + `CREATE TYPE "BenefitSelection"` + FK constraints; reject anything that drops/rewrites.

---

## 4. Backend changes (smallest safe diffs)

### 4.1 Pure resolver — `pricing-resolver.ts`

Extend `ResolvePriceInput` and branch on selection + family eligibility. Keep the function pure.

```ts
export type BenefitSelection = "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";

export interface ResolvePriceInput {
  rule: SnapshotConsultationRule | null;
  basePriceCents: number;
  creditsAvailable: number;
  paidMonthsCount: number;
  benefitSelection: BenefitSelection;   // NEW — caller passes the line's choice
  familyEligible: boolean;              // NEW — true for self-use; for family, the
                                        //       service computes the full gate first
}
```

Logic (in `resolveConsultationPrice`, around `:55`):

1. `if (!familyEligible) return normal;` — a family line that fails the gate is never benefit-priced.
2. `if (benefitSelection === "PAY_NORMAL") return normal;` — **never reserve.**
3. `if (paidMonthsCount < rule.unlockAfterPaidMonths) return normal;` — existing unlock gate.
4. `USE_PLAN_CREDIT` → run the existing CREDIT branch only; if not includable / not enough credits → `normal` (D7).
5. `USE_PLAN_DISCOUNT` → run FIXED then PERCENT only (never CREDIT); else `normal`.

Add a sibling `coverageReason(...)` (or fold a `reason` into the resolved shape) so the preview can report `LOCKED` / `NOT_ENOUGH_CREDITS` / `FAMILY_UNAVAILABLE` / `NOT_COVERED` distinctly.

### 4.2 New pure predicate — `family-eligibility.ts`

```ts
export type FamilyIneligibleReason =
  | "NOT_OWNED"            // member.primaryUserId !== userId  (spoof guard)
  | "FAMILY_NOT_ENABLED"  // snapshot.familyEnabled === false  (→ non-Premium)
  | "SERVICE_NOT_FAMILY_USABLE" // rule.familyUsable === false
  | "MEMBER_NOT_ALLOWED";       // member.canUseCredits === false

export function resolveFamilyEligibility(input: {
  forFamilyMember: boolean;
  userId: string;
  member: { primaryUserId: string; canUseCredits: boolean } | null;
  snapshotFamilyEnabled: boolean;
  ruleFamilyUsable: boolean;
}): { eligible: boolean; reason?: FamilyIneligibleReason } {
  if (!input.forFamilyMember) return { eligible: true };       // self-use
  if (!input.member || input.member.primaryUserId !== input.userId)
    return { eligible: false, reason: "NOT_OWNED" };
  if (!input.snapshotFamilyEnabled)
    return { eligible: false, reason: "FAMILY_NOT_ENABLED" };
  if (!input.ruleFamilyUsable)
    return { eligible: false, reason: "SERVICE_NOT_FAMILY_USABLE" };
  if (!input.member.canUseCredits)
    return { eligible: false, reason: "MEMBER_NOT_ALLOWED" };
  return { eligible: true };
}
```

This maps 1:1 to req #5's bullet list and is trivially unit-testable with no DB.

### 4.3 Wire selection + family into `checkout-pricing.service.ts`

- Extend `CheckoutCartItem` (`:20`) with `benefitSelection: BenefitSelection` and `familyMemberId: string | null`.
- In `reserveAndPriceConsultations` (`:46`) and `previewConsultationPricing` (`:169`):
  - **Batch-load** the `FamilyMember` rows referenced by the cart's `familyMemberId`s (one `findMany`, `where: { id: { in }, primaryUserId: userId }`) — the `primaryUserId` filter is the **server-side spoof guard**; a foreign id simply won't load → `NOT_OWNED`.
  - Per consultation line, compute `resolveFamilyEligibility(...)` then call `resolveConsultationPrice(...)` with `benefitSelection` + `familyEligible`.
  - The credit reserve (`:105`) only fires when the resolver returns `CREDIT`, which now requires `USE_PLAN_CREDIT` + family-eligible. **`PAY_NORMAL`/`USE_PLAN_DISCOUNT` never reserve** → req #12 satisfied by construction.
- Extend `CoverageLine` (`:139`) with `reason?: FamilyIneligibleReason | "LOCKED" | "NOT_ENOUGH_CREDITS"` and `eligibleSelections: BenefitSelection[]` so the UI shows only the options a line actually supports.

### 4.4 Cart routes — `cart.route.ts`

- `addItemBodySchema` (`:50`): add top-level `benefitSelection: z.enum([...]).optional()` and `familyMemberId: z.string().min(1).max(120).optional()`.
- Validation: if `familyMemberId` present, assert the member exists **and** `primaryUserId === req.user.id` before insert (reject 403 otherwise). Guests (`userId` null) cannot set `familyMemberId`.
- `prisma.cartItem.create` (`:897`): persist `benefitSelection ?? "PAY_NORMAL"` and `familyMemberId ?? null`. When a family member is chosen, prefill the patient snapshot (`patientFullName`/`patientEmail`/`patientDateOfBirth`) from the `FamilyMember` row if the client didn't supply one.
- `updateItemBodySchema` (`:101`): add optional `benefitSelection` + `familyMemberId`; `PATCH` handler re-runs the same ownership check and updates the line. (Lets the cart page change the choice.)

### 4.5 Checkout — `orders.route.ts`

- The `items.map` passed to `reserveAndPriceConsultations` (`:178`) must include `benefitSelection` + `familyMemberId` from each `cart.item`.
- The OrderItem `create` map (`:221`) must copy `benefitSelection` + `familyMemberId` (alongside the existing `bookingForOther` at `:241`).
- **Re-validate family ownership at checkout** (defense in depth — the member could have been removed or `canUseCredits` toggled off after add-to-cart). The batch-load in 4.3 already enforces this because it filters by `primaryUserId`; a now-invalid line silently drops to `NORMAL` and the user pays — acceptable and safe. Surface it in the preview before pay.
- No price ever comes from the client — unchanged.

### 4.6 Webhook — `payments.route.ts`

- When minting the Appointment for an OrderItem that has `familyMemberId`, the patient identity already comes from the OrderItem snapshot (set at add-to-cart from the member). If `Appointment.familyMemberId` is added (optional), stamp it here for portal/audit. Otherwise no change — appointments mint correctly today.
- Credit commit path (`commitOrderCreditReservations`) is unchanged; it commits exactly the lines that reserved (i.e. `USE_PLAN_CREDIT` + eligible).

### 4.7 Admin guard — Premium-only family (G4, req #6/#13)

**`admin-plans.schema.ts`:**
- Add `.refine` to `planCreateBase` (`:72`): `!data.familyEnabled || data.planType === "PREMIUM"` with a clear message on path `["familyEnabled"]`.
- `adminPlanUpdateBodySchema` omits `planType`, so it cannot self-refine — enforce in the service (below).

**`plans.service.ts`:**
- `createAdminPlan` (`:122`): mirror the wellness pattern (`:144`):
  `familyEnabled: input.planType === "PREMIUM" ? input.familyEnabled : false,`
- `updateAdminPlan` (`:176`): extend the `existing` select (`:180`) to include `planType`; before `planWriteData`, guard:
  `if (body.familyEnabled === true && existing.planType !== "PREMIUM") throw new ... ("familyEnabled is Premium-only");`
  Because `planType` is immutable and fetched from the row, this cannot be bypassed by a forged body.

**`plan-rules.service.ts` `setConsultationRule` (`:83`):**
- Load the plan's `planType` + `familyEnabled`; if `body.familyUsable === true` and the plan is not (`PREMIUM` and `familyEnabled`), **force `familyUsable=false`** (or reject). Prevents a `familyUsable` rule on a non-family plan from ever entering a future snapshot. Defense in depth — even if it slipped through, `snapshot.familyEnabled` false blocks it at claim time.

> Net effect: family usage is impossible unless **plan is PREMIUM** (enforced at write) **and** admin explicitly enabled it on both the plan and the specific service rule — exactly req #5/#6.

---

## 5. Family member management (G5)

Minimal surface so a user can maintain the "approved family list" the booking flow selects from.

**Backend — new `routes/family.route.ts` (patient-auth):**

| Method | Path | Body / behaviour |
|--------|------|------------------|
| `GET` | `/api/account/family` | List `FamilyMember` where `primaryUserId === user.id`. |
| `POST` | `/api/account/family` | `{ fullName, relationship?, dateOfBirth?, email? }` → create with `canUseCredits` default per **D5** (false). |
| `PATCH` | `/api/account/family/:id` | Edit fields incl. `canUseCredits` (ownership-checked). |
| `DELETE` | `/api/account/family/:id` | Remove (ownership-checked). FK `onDelete: SetNull` keeps historical order lines intact. |

Zod schema in `validations/family.schema.ts`. All handlers assert `primaryUserId === user.id`.

**Frontend — `app/(auth)/account/family/` page + `lib/api/family-client.ts`** (list/add/edit/remove, toggle "can use plan benefits"). Mirrors the existing account-panel patterns (`SubscriptionDashboard.tsx`, `ManagePanel.tsx`).

> **(confirm)** Whether enabling `canUseCredits` is purely the primary user's choice (self-service) or needs an admin approval step. Default plan: **self-service** (the primary account owner approves their own dependents); ownership + Premium gate already prevent abuse.

---

## 6. Frontend changes (G6)

Data-fetching pattern in this app: **client components + raw `fetch` + `Result<T>`** (no SWR/react-query). Coverage comes from `GET /api/me/cart-preview`.

| File | Change |
|------|--------|
| `consult/[serviceSlug]/_components/consultation-booking-form.tsx` | Replace the bare "Booking for someone else" toggle with **"For me / For a family member"**; when family, render a dropdown fetched from `/api/account/family` (+ "Manage family" link). Send `familyMemberId` + initial `benefitSelection` in the add-to-cart payload. Prefill patient fields from the chosen member. |
| `cart/page.tsx` (`CartItemRow`, `:335`) | Per consultation line: a **segmented selector** Pay normally / Use credit / Use discount, showing only `eligibleSelections` from the preview. On change → `PATCH /api/cart/items/:id { benefitSelection }` → refetch preview. Show the beneficiary ("For: <name>"). |
| `components/cart/PlanCoverage.tsx` | Extend the existing panel to render per-line `reason` chips: *Included €0 / Plan price −€X / Not covered / Locked until N months / Family usage not available / Not enough credits*, plus the existing guest **login** prompt (401) and non-subscriber **subscribe-&-save** upsell. |
| `checkout/page.tsx` | Read-only per-line summary: beneficiary + chosen benefit + final price (from preview). Sends **no prices** (unchanged). |
| `lib/api/me-subscription.ts` | Extend `CartCoverageLine` types with `reason` + `eligibleSelections`. |
| `lib/api/cart-types.ts` / `cart-client.ts` | Add `benefitSelection` + `familyMemberId` to types and the add/update calls. |
| `lib/api/family-client.ts` (new) | Family CRUD wrappers. |

### i18n
Add keys to all **6** locales (`en` authored; `de/ro/cs/es/pt` mirror `en` pending translation — no per-key fallback exists, per memory). New keys under `common.cartPage.*` (`benefitSelector`, `payNormally`, `usePlanCredit`, `usePlanDiscount`, `bookingTarget`, `forMe`, `forFamilyMember`, `manageFamily`) and `subscription.coverage.*` (`locked`, `familyUnavailable`, `notEnoughCredits`, `loginForBenefits`).

---

## 7. Test plan (G7, req #14)

Backend `node:test` integration, real Postgres, `makeSubscriptionFixture`. **First extend** `test-support.ts`:
- `MakeFixtureOptions`: add `planType`, `familyEnabled`, `consultationRule?: Partial<PlanConsultationRule>`, `familyMembers?: Array<{ canUseCredits }>`, and write a real `planSnapshot` (so the pricing path has rules to read).
- Return created `serviceId`, `planConsultationRuleId`, `familyMemberId[]`.

| Test | File | Type | Asserts |
|------|------|------|---------|
| Essential user → no family benefit | `family-eligibility.test.ts` + `checkout-pricing.family.test.ts` | unit + integ | `familyEnabled=false` (forced) → family line prices NORMAL, **no reservation**. |
| Comprehensive user → no family benefit | same | integ | same as above. |
| Premium + eligible member → GP credit used | `checkout-pricing.family.test.ts` | integ | `USE_PLAN_CREDIT` reserves exactly `creditsPerUse`; balance decremented once. |
| Premium but `familyEnabled=false` → blocked | same | integ | reason `FAMILY_NOT_ENABLED`; NORMAL price; no reserve. |
| `PlanConsultationRule.familyUsable=false` → blocked | same | integ | reason `SERVICE_NOT_FAMILY_USABLE`. |
| Cross-account `familyMemberId` (spoof) | `cart.family.route.test.ts` + service | integ | add-to-cart 403; and service batch-load filters it → `NOT_OWNED`, NORMAL. |
| Member with `canUseCredits=false` | `family-eligibility.test.ts` | unit | `MEMBER_NOT_ALLOWED`. |
| `PAY_NORMAL` → no credit consumed | `checkout-pricing.benefit.test.ts` | integ | balance unchanged; no `RESERVED` ledger row. |
| `USE_PLAN_CREDIT` → reserved then committed | same + `checkout-pricing.commit.test.ts` | integ | `RESERVED`→`CONSUMED`; balance −N; idempotent. |
| Not enough credits (`USE_PLAN_CREDIT`) | same | integ | falls back NORMAL; reason `NOT_ENOUGH_CREDITS`; no reserve. |
| Specialist discount only when selected + eligible | `pricing-resolver.test.ts` | unit | `USE_PLAN_DISCOUNT` → FIXED/PERCENT; `PAY_NORMAL` → base; credit branch never taken for specialist w/o `usesCredits`. |
| Checkout recompute rejects forged claim | `orders.checkout.test.ts` | integ | a line marked credit-eligible by client but failing the server gate prices NORMAL; Stripe amount = server total. |
| Admin: `familyEnabled=true` on Essential/Comprehensive blocked | `admin-plans.schema.test.ts` + `plans.service.test.ts` | unit + integ | schema refine rejects create; service forces false; update guard throws. |
| Preview == checkout (dry-run no writes) | `checkout-pricing.preview.test.ts` (extend) | integ | preview reserves nothing; mode/total match a subsequent real checkout. |

Coverage target ≥80% on touched modules (`pricing-resolver`, `family-eligibility`, `checkout-pricing.service`, `plans.service`, `plan-rules.service`, cart/orders/family routes).

---

## 8. Security & integrity checklist (req #12 — must all hold)

- [x] **Atomic reservation** — unchanged `reserveCredits` conditional UPDATE.
- [x] **No double consume** — unchanged terminal partial-unique on `reservationId`.
- [x] **Release on fail/expiry** — unchanged sweep + webhook; new `PAY_NORMAL`/`USE_PLAN_DISCOUNT` lines never reserve, so nothing to leak.
- [x] **`PAY_NORMAL` reserves/consumes nothing** — enforced in the resolver (step 2 in §4.1) and by DB default `PAY_NORMAL`.
- [x] **No `familyMemberId` spoofing** — ownership checked at add-to-cart (403), at `PATCH`, and re-enforced by the `primaryUserId`-filtered batch-load at preview + checkout.
- [x] **Frontend cannot set price** — checkout recomputes; client sends only contact/shipping (unchanged).
- [x] **Premium-only family** — write-gated (`plans.service`/schema) **and** claim-gated (`snapshot.familyEnabled`).
- [ ] Run `security-reviewer` agent over the family-eligibility + cart ownership diff before commit (mandatory per repo rules — auth/user-data + payment-adjacent).

---

## 9. Execution order (phased, smallest safe increments)

**Phase 1 — Backend authority (no UI, fully testable in isolation).**
1. Schema + migration (§3) via `migrate diff` + `deploy` (heed the hazard).
2. `family-eligibility.ts` (pure) + `pricing-resolver.ts` selection/family params (§4.1–4.2) + unit tests.
3. Thread into `reserveAndPriceConsultations` + `previewConsultationPricing` + cart/orders routes (§4.3–4.5) + integration tests.

**Phase 2 — Admin Premium guard (§4.7).** Small, high value, independent. Tests in `admin-plans.schema.test.ts` + `plans.service.test.ts`.

**Phase 3 — Family CRUD (§5).** API + minimal `/account/family` page.

**Phase 4 — Booking + cart UI (§6).** Family dropdown, per-line selector, coverage reasons, checkout summary, i18n.

**Phase 5 — Optional provenance.** `OrderItem.familyMemberId` audit surfacing; `ConsultationCreditLedger.familyMemberId` / `Appointment.familyMemberId` if wanted.

Phases 1–2 deliver the security core and can ship before any UI exists (tested with seeded fixtures). Phase 3 unblocks Phase 4.

---

## 10. Commands

```bash
# typecheck (both packages)
pnpm typecheck
# lint
pnpm lint
# backend tests (real Postgres; CI uses gh_test)
pnpm --filter backend test
# single file while iterating
node --import tsx --test backend/src/modules/subscriptions/checkout-pricing.family.test.ts
# frontend unit
pnpm --filter frontend test
# migration (NEVER migrate dev — see §3.2)
cd backend && npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_benefit_selection_family/migration.sql
cd backend && npx prisma migrate deploy
```

---

## 11. Open decisions to confirm

- **D4** — Rely on `snapshot.familyEnabled` as the Premium proof (recommended) vs also add `planType` to the snapshot. *Default: rely on `familyEnabled`.*
- **D5** — `canUseCredits` self-service approval (recommended) vs admin approval step. *Default: self-service.*
- **D1** — Confirm the deliberate behaviour change: default `PAY_NORMAL`, UI pre-selects recommended benefit. *Default: as written.*
- Scope of optional provenance columns (§3.1 / Phase 5) — ship now or fast-follow. *Default: `OrderItem.familyMemberId` now, rest later.*

---

## 12. File map (implementer quick-ref)

**Backend — edit**
- `prisma/schema.prisma` — enum + `CartItem`/`OrderItem`/`FamilyMember` columns (§3.1)
- `src/modules/subscriptions/pricing-resolver.ts` — selection/family params (§4.1)
- `src/modules/subscriptions/family-eligibility.ts` — **new** pure predicate (§4.2)
- `src/modules/subscriptions/checkout-pricing.service.ts` — reserve + preview wiring (§4.3)
- `src/routes/cart.route.ts` — add/update body + create + ownership (§4.4)
- `src/routes/orders.route.ts` — pass-through + OrderItem copy (§4.5)
- `src/routes/payments.route.ts` — optional Appointment stamp (§4.6)
- `src/modules/plans/plans.service.ts` — Premium family guard (§4.7)
- `src/validations/admin-plans.schema.ts` — `familyEnabled` refine (§4.7)
- `src/modules/plans/plan-rules.service.ts` — `familyUsable` gate (§4.7)
- `src/routes/family.route.ts` + `src/validations/family.schema.ts` — **new** (§5)
- `src/modules/subscriptions/test-support.ts` — fixture extension (§7)

**Frontend — edit**
- `app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx`
- `app/(site)/[country]/[lang]/cart/page.tsx`
- `app/(site)/[country]/[lang]/checkout/page.tsx`
- `components/cart/PlanCoverage.tsx`
- `lib/api/me-subscription.ts`, `lib/api/cart-types.ts`, `lib/api/cart-client.ts`
- `lib/api/family-client.ts` + `app/(auth)/account/family/` — **new**
- `locales/{en,de,ro,cs,es,pt}/{common,subscription}.json`
