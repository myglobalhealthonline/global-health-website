# Subscription Flow, Active-Plan Display & Family Booking — Fix Plan

**Status:** Draft for approval · **Date:** 2026-06-26 · **Branch (suggested):** `feat/subscription-flow-family-v2`
**Scope:** Plans page active-plan marking · cart-style purchase funnel · portal subscription status page · plan-gated booking benefits · "book for someone else" gating · backend enforcement.

> Builds on the already-shipped subscription system (`docs/plans/subscription-plan-implementation.md`, ~90% built and live behind the `subscriptions` country flag). This plan **does not** rebuild that system — it closes the seven UX/enforcement gaps in the user brief and **re-instates the family/benefit-selection feature that was rolled back on 2026-06-26.**

---

## 0. TL;DR

| # | Requirement | Verdict after code review | Effort |
|---|-------------|---------------------------|--------|
| 1 | Mark active plan on plans page | **Missing** — pricing page never reads the user's subscription | S |
| 2 | Purchase via cart/checkout, not a portal bounce | **Partly real bug** — works via Stripe `mode:subscription`, but the fake driver round-trips to the portal with no activation; flow is also disjoint from cart | M (decision-gated) |
| 3 | Portal subscription status page | **Mostly exists** at `/account/membership`; not in the sidebar, missing benefit/limit detail | S–M |
| 4 | "Use my plan benefits / continue without" on booking | **Reverted** — was built in commit `82588ba6`, now gone; live code silently auto-applies best benefit | M |
| 5 | Gate "Book for someone else" on the active plan | **Ungated today** — checkbox shows for every logged-in user | M |
| 6 | Backend enforcement (sole authority) | **Partly there** — counter is sole spend authority; family/benefit gates were reverted | M |
| 7 | Coherent end-to-end behavior | Integration of 1–6 | — |

**Biggest accelerator:** the rolled-back feature is fully **recoverable** from git (`82588ba6` + `1427b2b6` still exist as objects / reflog / dangling). Requirements 4, 5 and 6 are largely "recover the commit, re-apply its additive migration, adapt the UX to this brief" rather than a from-scratch rebuild.

**One decision needed before WS-2 (see §3.1):** do subscriptions ride the existing one-off cart (Option B, high risk) or get a dedicated cart-styled checkout lane (Option A, recommended)? Everything else can proceed regardless.

---

## 1. Current state (grounded, with file references)

### 1.1 Plans / pricing page
- `frontend/app/(site)/[country]/[lang]/pricing/page.tsx:92` fetches `getCountryPlans(code, lang)` **and** `getServerAuthUser()` — but only computes `isAuthenticated = Boolean(user)` (`:93`). It **never fetches the user's subscription**, so it cannot know which plan is active.
- `PricingPlanCard` (`.../pricing/_components/PricingPlanCard.tsx:14-19`) receives only `{ plan, t, note, ctaHref }`. No active/current state; the CTA (`:161-176`) is always an enabled "Choose plan" link.
- The subscribe CTA builds `/account/subscribe?plan=…&country=…&lang=…(&returnTo=…)` (`page.tsx:52-64`).
- **Gap:** no "Current Plan" marker, no disabled state, no awareness of an existing subscription.

### 1.2 Subscribe / purchase flow
- `frontend/app/(auth)/account/subscribe/page.tsx:34-39` already redirects to `/account/membership` if an `ACTIVE`/`PAST_DUE` sub exists (one-sub-per-user).
- `SubscribeForm` → `startSubscription(planId, returnTo?)` (`frontend/lib/api/me-subscription.ts:168-170`) → `POST /api/me/subscription` → returns `{ checkoutUrl }` → `window.location.assign(checkoutUrl)`.
- Backend `startSubscription` (`backend/src/modules/subscriptions/subscription.service.ts:50`) creates a Stripe **`mode:subscription`** Checkout Session via `billing.createSubscriptionCheckout` (`:122-131`); `successUrl = {siteBase}{returnTo ?? "/account"}?subscription=ok` (`:126`).
- **Root cause of the "bounces back to the portal" complaint:** the default **fake** billing driver (`backend/src/modules/billing/billing.fake.ts:79-89`) returns `https://fake-billing.local/checkout/{id}?return={successUrl}` — not a real payment page — and **no `customer.subscription.created`/`invoice.paid` webhook fires in dev**, so the row stays `INCOMPLETE`. The user lands back on `/account?subscription=ok` with no active plan and no payment. It *looks* broken even though the production Stripe path is correct.
- **Architectural fact:** subscriptions are **entirely decoupled from the shopping cart**. The cart checkout is one-off `mode:payment` (`POST /api/cart/checkout`); it has no `SUBSCRIPTION` item kind.

### 1.3 Portal status page
- `/account/membership` (`frontend/app/(auth)/account/membership/page.tsx` + `_components/ManagePanel.tsx`) already renders: plan name + price, status badge (ACTIVE/PAST_DUE/INCOMPLETE/CANCELED/PAUSED), next billing date, cancel-at-period-end notice, pending plan change, return-state banners, and cancel / change / billing-portal actions.
- Dashboard cards in `account/_components/SubscriptionDashboard.tsx` show plan, consultation credits (balance/used/granted), wellness progress, perks, and a credit-activity ledger.
- **Gaps vs. brief:** (a) **no sidebar entry** — `account/layout.tsx:71-84` lists Overview, Notifications, Bookings, Calendar, Orders, Prescriptions, Medical Files, Access History, Payments, Profile, Security — **no Membership/Subscription**; it's only reachable via dashboard cards. (b) Membership page doesn't consolidate **included benefits, remaining GP credits, discount benefits, and plan restrictions/limits** in one place (credits live on the dashboard, not membership).
- Source data already exists: `GET /api/me/subscription` (`subscription-read.service.ts:7-23` → status, plan, `currentPeriodEnd`, `paidMonthsCount`, `cancelAtPeriodEnd`, `pendingChange`) and `GET /api/me/credits`.

### 1.4 Booking form & cart
- Booking form `frontend/app/(site)/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx`:
  - `bookingForOther` state (`:102`); checkbox rendered for **every** logged-in user (`:442-451`, guarded only by `{me ? … : null}`).
  - When on, collects free-text patient name/email/phone/DOB (`:522-580`). This is a **one-off "treat someone else"** toggle — **not** a saved dependent, **not** tied to any plan.
- Cart: `CartItem` (`frontend/lib/api/cart-types.ts:7-41`) carries a `patient` snapshot incl. `bookingForOther: boolean` (`:39`) — **no `benefitSelection`, no `familyMemberId`** (reverted).
- `PlanCoverage` (`frontend/components/cart/PlanCoverage.tsx`) calls `GET /api/me/cart-preview` and renders per-line coverage badges, total saved, credits-left, guest login prompt, and a non-subscriber upsell. It **auto-shows** best coverage; there is no "use / don't use my plan" choice.
- Checkout (`.../checkout/page.tsx`) is one-off only; shows a "Consultations in order" section with an "on their behalf" badge when `bookingForOther`.

### 1.5 Backend subscription/credit engine (intact)
- `SubscriptionCreditBalance` counter is the **sole spend authority** (atomic reserve/commit/release/grant); ledgers are advisory audit trails.
- `resolveConsultationPrice` (`backend/src/modules/subscriptions/pricing-resolver.ts:55`) currently takes `{ rule, basePriceCents, creditsAvailable, paidMonthsCount }` and **auto-selects** the best benefit (credit → fixed → percent → normal). **No `benefitSelection`/`familyEligible` params** (reverted).
- `checkout-pricing.service.ts` `reserveAndPriceConsultations` (`:46`) and `previewConsultationPricing` (`:169`) auto-apply; no family context.
- **Dormant family infra survives the rollback** (safe to build on):
  - `PlanSnapshot.familyEnabled` (`plan-snapshot.ts:42-52`) and `SnapshotConsultationRule.familyUsable` (`:27`).
  - Schema: `FamilyMember` model (present, **0 references**), `PricingPlan.familyEnabled`, `PlanConsultationRule.familyUsable`, `PerkKey.FAMILY_USAGE` — all present, all currently `false`/unused.
  - `SubscriptionStatus` enum: `INCOMPLETE | ACTIVE | PAST_DUE | CANCELED | PAUSED`.

### 1.6 What the 2026-06-26 rollback removed (now recoverable)
Commit **`82588ba6`** "feat(subscriptions): per-line benefit choice + Premium family appointment-claim" and **`1427b2b6`** "fix(admin): stop server-only import…" were reset off `main` (HEAD now `3775a937`, which re-applied the server-only fix). Both commit objects **still exist** (`git cat-file -t` = commit; visible in `git reflog` HEAD@{10}/{11} and `git fsck` dangling). The DB migration `20260626000000_benefit_selection_family` was reversed on the Railway DB (4 columns + `BenefitSelection` enum + `_prisma_migrations` row dropped); `FamilyMember` was left intact.

That commit contained, end to end:
- **Schema/migration:** `BenefitSelection` enum (`PAY_NORMAL | USE_PLAN_CREDIT | USE_PLAN_DISCOUNT`); `CartItem.benefitSelection`, `CartItem.familyMemberId`, `OrderItem.benefitSelection`, `OrderItem.familyMemberId` (all nullable/default → additive).
- **Backend:** `family-eligibility.ts` pure gate; `resolveConsultationPrice` extended with `benefitSelection` + `familyEligible` (returns `reason` / `eligibleSelections`); `checkout-pricing.service.ts` batch-loads `FamilyMember` by `primaryUserId` (spoof guard) in reserve + preview; cart/orders routes carry the new fields; admin Premium-only family guards (schema refine + `PlanFamilyNotPremiumError`; `setConsultationRule` forces `familyUsable=false` off-Premium); new `family.route.ts` + `family.schema.ts` (patient CRUD scoped by `authUser.sub`).
- **Frontend:** per-line benefit segmented selector + `patchItem` on `CartContext`; `PlanCoverage` reason chips + beneficiary + `refreshKey`; booking "Who is this for?" family dropdown (approved members only); checkout `PlanCoverage` panel; `/account/family` page + `family-client.ts`; i18n in all 6 locales.
- **Security:** two HIGH name-disclosure fixes — `enrichConsultationLines` filters family lookup by cart owner; `mergeCarts` nulls `familyMemberId` (guest cookie carts can't own dependents).

**Strategy:** recover this as the baseline for WS-4/5/6, then adapt to the brief's simpler "use my benefits / continue" toggle and checkbox-gating. See §3.2.

---

## 2. Goals & non-goals

**Goals**
1. Plans page clearly marks the active plan and prevents re-buying it.
2. A coherent purchase funnel that ends in a real payment and a portal that reflects the new active sub.
3. A first-class portal page consolidating subscription status, benefits, credits, discounts, renewal date, and limits.
4. Booking respects the active plan: an explicit "use my plan benefits / continue without" choice, shown only when eligible.
5. "Book for someone else" is plan-gated (family-enabled plans only), with a clear disabled explanation otherwise.
6. All of the above enforced server-side; the frontend cannot bypass credit/discount/family rules.

**Non-goals (this pass)**
- Recurring-billing rework (Stripe `mode:subscription` stays the mechanism).
- Proration / mid-cycle plan upgrades with immediate charge (unchanged; next-cycle change only).
- Persisting dependents as full medical profiles (family members stay lightweight beneficiaries).
- Removing the lightweight pay-full "book for someone else" path for non-subscribers (see §3.3).

---

## 3. Cross-cutting decisions

### 3.1 DECISION A — How subscriptions enter checkout (gates WS-2)

The brief says "add the plan to the cart and continue through the normal checkout." The technical constraint: recurring subscriptions require a Stripe **`mode:subscription`** session; the existing cart checkout is one-off **`mode:payment`** and cannot carry a recurring line.

- **Option A — Dedicated subscription checkout lane that mirrors the cart (RECOMMENDED).** Plan card "Choose plan" → a cart-styled **review page** (plan, monthly price, included benefits, billing terms, T&Cs consent) → "Proceed to secure payment" → Stripe `mode:subscription` → return to the portal **only on success** (`?subscription=ok`), where the now-ACTIVE plan is visible. Reuses the existing `/account/subscribe` plumbing; the work is UX (make it feel like checkout) + a reliable activation/return path + the dev-mode fix below. **Low risk, Stripe-correct, respects every locked money decision.**
- **Option B — True unified cart.** Add a `SUBSCRIPTION` `CartItemKind`; allow a subscription to sit beside one-off items; at checkout, if a subscription is present, build a `mode:subscription` session (Stripe permits one-off line items inside subscription mode). **High risk:** mixes recurring + one-off billing, tax, refund/clawback semantics, and the €0-credit commit path; touches the money core. Not recommended for v1.

**Recommendation: Option A.** It satisfies the brief's intent (a real, consistent funnel that lands in the portal only after payment) without destabilizing the billing core. The rest of this plan assumes Option A; §4-WS2 notes the Option B delta.

**Dev/local activation fix (independent of A/B, fixes the perceived bug):** in fake-driver mode, make the success return path activate the `INCOMPLETE` sub (a guarded dev-only "simulate paid" step, or a local webhook-replay), so subscribing actually produces an ACTIVE plan during testing. Production already activates via the real Stripe webhook.

### 3.2 DECISION B — Re-instate the reverted family feature by recovery, not rebuild
Recover `82588ba6` (`git show`/`format-patch`/cherry-pick) as the implementation baseline for WS-4/5/6, then adapt. Re-apply the additive migration via the **diff-from-live-DB + `migrate deploy`** workaround (migrate-dev is broken in this repo — see `reference_migration_shadow_db_workaround`). Because the migration row was dropped, re-applying is clean (no `_prisma_migrations` conflict). Re-run the mandatory security review (payment-adjacent) — re-confirm the two name-disclosure fixes survive the adaptation.

### 3.3 DECISION C — "Book for someone else" vs "family benefits" are two different gates
Keep them distinct to avoid breaking existing behavior:
- **Pay-full for another person** (the current `bookingForOther` toggle): may remain available to everyone (a non-subscriber booking and paying full price for a relative is legitimate). 
- **Use plan benefits for another person** (family usage): gated on an **active, family-enabled plan** (`PricingPlan.familyEnabled`, Premium-only) **and** an approved family member.

The brief's requirement 5 ("hide/disable the checkbox unless the plan supports it") is honored by gating the **plan-benefit-for-family** control, while the basic pay-full path stays open. **If the product owner instead wants the checkbox itself fully hidden for non-family plans, that is a one-line stricter variant** — flag at review. This is the only place the brief's literal wording and existing behavior diverge.

### 3.4 Constraints carried from the existing system
- Login required for all subscription benefit use (D15); guests get a login prompt.
- One active subscription per user (§36.8).
- Snapshot at signup/renewal is authoritative for pricing (D18) — admin edits never re-price live subs.
- `SubscriptionCreditBalance` counter remains the sole spend authority; never trust a client-supplied price.
- Subscriptions ship dark behind the `subscriptions` country flag (strict opt-in); all new UI must respect it.
- Family fields are **Premium-only** by guard (mirrors wellness gating).

---

## 4. Workstreams

### WS-1 — Active plan on the plans page  *(Req 1)*
**Backend:** none (reuse `GET /api/me/subscription`).
**Frontend**
1. `pricing/page.tsx`: alongside `getCountryPlans` + `getServerAuthUser`, fetch the current subscription server-side (`getServerSubscription()`); derive `activePlanId` + `activeStatus` when `ACTIVE`/`PAST_DUE`.
2. Pass `isActivePlan` (and `isAnyPlanActive`) into `PricingPlanCard`.
3. `PricingPlanCard`: when `isActivePlan`, render a **"Current plan"** badge, swap the CTA to a disabled `Current plan` control (or a link to `/account/membership` labelled "Manage plan"), and visually distinguish the card (accent ring/check). When another plan is active, relabel other cards' CTA to "Switch to this plan" → routes to membership's change-plan flow (next-cycle change), **not** a second purchase.
4. i18n: add `currentPlan`, `managePlan`, `switchToThisPlan` to `subscription.pricing` across all 6 locales.

**Acceptance:** a subscriber viewing the plans page sees their plan flagged; its purchase button is not actionable; other plans offer "switch," not "buy again."

---

### WS-2 — Purchase funnel  *(Req 2)* — *gated by Decision A (Option A)*
**Backend**
1. Keep `POST /api/me/subscription` → Stripe `mode:subscription`. Verify `successUrl`/`cancelUrl` land on a clear destination: success → `/account/membership?subscription=ok`; cancel → return to the review page (not a dead bounce).
2. **Dev activation:** add a guarded fake-driver activation so the success return flips `INCOMPLETE → ACTIVE` and grants the first period (reuse the existing webhook handler with a canned event; gate behind `BILLING_DRIVER=fake` + non-prod). This removes the "looks broken / stuck INCOMPLETE" experience in local/test.
3. Confirm `previewConsultationPricing` / cart-preview re-fetch after return so coverage shows immediately.

**Frontend**
1. Reshape `/account/subscribe` into a **cart-style review/checkout** screen: plan summary, monthly price, included benefits (credits, discounts, wellness, family if applicable), billing cadence + auto-renew + cancel terms, T&Cs consent (existing gate), and a primary **"Proceed to secure payment"** button. Keep the `returnTo` funnel.
2. On success return, route to the portal subscription page with a success banner; on cancel, return to the review screen with an info notice (never silently dump to an unrelated page).
3. From WS-1, the plans-page CTA enters this lane.

**Option B delta (only if chosen):** add `SUBSCRIPTION` `CartItemKind` + cart rendering; branch `POST /api/cart/checkout` to build a `mode:subscription` session when a subscription line is present; extend reserve/commit + webhook + refund to the mixed cart. Materially larger; separate review.

**Acceptance:** selecting a plan leads to an explicit payment step; the portal reflects the active sub **only after** payment; cancelling doesn't strand the user. In dev, the sub actually activates.

---

### WS-3 — Portal subscription status page  *(Req 3)*
**Backend**
1. Extend `GET /api/me/subscription` (or have the page also call `GET /api/me/credits`) so the page can show, in one place: status, plan, **remaining GP consultation credits** (balance/used/granted), **discount benefits** (specialist discount %/fixed from the snapshot rules), included benefits/perks, renewal/expiry date, and **restrictions/limits** (e.g. credits per period, family-enabled yes/no, wellness Premium-only). Prefer composing existing reads over a new endpoint; add a thin `subscription-benefits` view-model if it reduces client glue.

**Frontend**
1. Add a **"Membership"** (or "Subscription") entry to the portal sidebar (`account/layout.tsx:71-84`) with an appropriate icon, between Payments and Profile.
2. Enrich `/account/membership` (or a new `/account/subscription`) to present the consolidated benefit/credit/limit view described above — reusing `SubscriptionDashboard`'s credit/perk widgets so logic isn't duplicated. Keep existing manage actions (cancel/change/portal).
3. Empty/non-subscriber state: a clear "no active subscription" panel with a link to plans.

**Acceptance:** from the sidebar, a user reaches one page that explains exactly what they have, what they can use, when it renews, and what's limited.

---

### WS-4 — "Use my plan benefits / continue without" on booking  *(Req 4)*
**Recover** the per-line benefit selection from `82588ba6`, then **simplify** to the brief's model.

**Backend**
1. Re-add `BenefitSelection` enum + `CartItem.benefitSelection`/`familyMemberId` + `OrderItem.*` (additive migration; see §5).
2. Restore `resolveConsultationPrice(rule, basePriceCents, creditsAvailable, paidMonthsCount, benefitSelection, familyEligible)` returning `{ mode, unitPriceCents, creditsToReserve, reason, eligibleSelections }`. **Default = `PAY_NORMAL`** (never silently consume a credit) — this is the behavioral change the brief asks for vs. today's auto-apply.
3. Restore `reserveAndPriceConsultations` / `previewConsultationPricing` to honor per-line `benefitSelection` and to validate eligibility server-side (active sub, credits left, rule allows it).

**Frontend**
1. On the booking details page (and/or cart line), when the user has an **active eligible** subscription, show a clear two-way control: **"Use my plan benefits"** vs **"Continue without using my plan."** Default to *not* consuming unless chosen (or default to "use" but make it explicit and reversible — confirm at review).
2. Reuse `PlanCoverage` reason chips to show what each choice costs (Included €0 / Plan discount / Pay normal).
3. Hide the control entirely for non-subscribers / ineligible lines (no active sub → no benefit option).

**Acceptance:** benefits are applied only when explicitly chosen; the chosen state is reflected in cart/checkout pricing; non-subscribers never see it.

---

### WS-5 — Plan-gated "Book for someone else" + family usage  *(Req 5)*
**Backend** (recover from `82588ba6`, keep Decision C split)
1. Re-add `family.route.ts` + `family.schema.ts`: patient CRUD for family members scoped by `authUser.sub`; only **family-enabled (Premium)** plans may add usable members.
2. Re-add admin Premium-only guards: `familyEnabled` settable only on `PREMIUM` plans (`plans.service.ts`), `setConsultationRule` forces `familyUsable=false` off-Premium (`plan-rules.service.ts`), schema refine + `PlanFamilyNotPremiumError`.
3. `family-eligibility.ts` pure gate: a member is benefit-usable iff active sub **and** `snapshot.familyEnabled` **and** the rule's `familyUsable` **and** the member is approved/owned by the payer.

**Frontend**
1. Booking form: derive `familyAllowed` from the active plan. 
   - If `familyAllowed`: render the "Who is this for?" selector (self + approved family members) and allow benefit use for the chosen member.
   - If **not** `familyAllowed` (or no sub): per Decision C, keep the basic pay-full "book for someone else" toggle, but **disable the plan-benefit-for-family control** with copy: *"Booking for someone else is not included in your current subscription plan."* / *"Your current plan does not support family member bookings."* (i18n keys, all 6 locales.) *(Stricter variant: hide the whole checkbox — flag at review.)*
2. Restore `/account/family` management page + `family-client.ts` (recovered), reachable from the portal.
3. Restore the security fixes: `enrichConsultationLines` filters family lookup by cart owner; `mergeCarts` nulls `familyMemberId`.

**Acceptance:** family booking + family benefit use appears only for active family-enabled plans with approved members; everyone else sees the disabled control + explanation; guests can't use family benefits.

---

### WS-6 — Backend enforcement (sole authority)  *(Req 6)*
The server must independently validate every rule the UI exposes. Recovered code already centralizes most of this; verify each:
1. **Active sub?** — gate benefit application on a current `ACTIVE`/(grace) status with a non-expired period.
2. **Which plan / what it grants** — read the **snapshot** (D18), not the live plan, for credits, discount mode/value, `familyEnabled`, `familyUsable`.
3. **Family allowed?** — `family-eligibility.ts` gate (active + familyEnabled + rule.familyUsable + member approved/owned).
4. **Credits/discounts apply to this line?** — rule must exist for the service; benefit must be eligible; resolver decides price.
5. **Credits remaining?** — `SubscriptionCreditBalance` counter via atomic reserve; never trust a client price; commit on order confirm, release on cancel/failure.
6. **No bypass** — recompute pricing at reserve/commit; reject any client-asserted `benefitSelection`/`familyMemberId` that fails the gate (return a typed error, fall back to PAY_NORMAL or 4xx, never silently grant).
7. Mandatory **security review** (payment + PHI adjacent) before merge, per repo policy.

**Acceptance:** crafted requests (spoofed `familyMemberId`, benefit on an ineligible line, over-spending credits, inactive sub) are all rejected server-side; tests cover each.

---

### WS-7 — End-to-end integration  *(Req 7)*
Wire 1–6 into the single narrative from the brief: plans page (active marked) → choose/switch → review → pay → portal shows active plan + benefits → booking offers "use benefits / continue," with family gated by plan → credits/discounts apply per the snapshot → backend enforces throughout. Add the cross-surface i18n and the success/cancel banners that tie the funnel together.

---

## 5. Data model & migration
**Additive only** (re-applying the reverted shape):
- `enum BenefitSelection { PAY_NORMAL, USE_PLAN_CREDIT, USE_PLAN_DISCOUNT }`
- `CartItem.benefitSelection BenefitSelection?` · `CartItem.familyMemberId String?` (FK → `FamilyMember`, nullable)
- `OrderItem.benefitSelection BenefitSelection?` · `OrderItem.familyMemberId String?`
- (Dormant already present — **no change**: `PricingPlan.familyEnabled`, `PlanConsultationRule.familyUsable`, `FamilyMember`, `PerkKey.FAMILY_USAGE`.)
- **Optional (deferred, plan Phase 5 of the original):** `ConsultationCreditLedger.familyMemberId` / `Appointment.familyMemberId` provenance columns.

**Mechanics:** migrate-dev is broken here. Generate the migration via **diff-from-live-DB**, apply with **`prisma migrate deploy`**; run `prisma generate` locally for typecheck. The previously-dropped `_prisma_migrations` row means no conflict on re-apply. (See `reference_migration_shadow_db_workaround`.)

---

## 6. Sequencing

**Phase 0 — Recover & branch (½ day).** New branch; `git show 82588ba6`/`1427b2b6` → extract patches; cherry-pick or re-apply onto `3775a937`; resolve conflicts (notably anything touching `subscriber-ledger.tsx` server-only, already re-fixed in `3775a937`). Land schema + migration. **Verify build green.**

**Phase 1 — Independent quick wins (parallelizable).**
- WS-1 (active plan display) — no backend dep.
- WS-3 (portal page + sidebar) — read-only.

**Phase 2 — Family/benefit core.**
- WS-6 backend gates + WS-4 backend resolver (recovered) → tests on real Postgres.
- WS-4 / WS-5 frontend controls + `/account/family`.

**Phase 3 — Funnel.**
- WS-2 (Option A review screen + dev activation) once Decision A is confirmed.

**Phase 4 — Integration, i18n, review.**
- WS-7 wiring; translate all new keys (6 locales); mandatory security + code review; E2E.

> Phases 1 and 2-backend can run in parallel via separate agents; Phase 3 needs Decision A; Phase 4 is the gate.

---

## 7. Testing
- **Backend (node:test + real Postgres):** resolver per `benefitSelection` × eligibility; family gate truth table (active/inactive × familyEnabled × familyUsable × approved/owned); credit over-spend rejection; spoofed `familyMemberId` rejection; snapshot-not-live pricing; preview = dry-run (counter untouched). Extend `makeSubscriptionFixture` (`test-support.ts`). Run `pnpm --filter backend test`.
- **Frontend (vitest):** pricing card active/disabled states; booking benefit toggle visibility by sub state; family selector gating; portal benefit view-model formatting.
- **E2E (Playwright):** subscribe → (dev-activate) → portal shows active → book with "use benefits" → credit decrements → book for family member on Premium → blocked on non-family plan. Per repo web testing rules, screenshot key breakpoints; verify both themes if applicable.
- **Coverage:** keep ≥ 80% on changed modules.

---

## 8. Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Mixing recurring + one-off in cart destabilizes billing | Choose Option A (dedicated lane); keep `mode:subscription` isolated. |
| Re-applying migration on a DB where it was reversed | Diff-from-live-DB + `migrate deploy`; row already dropped → clean. |
| Family name disclosure (PHI) regressions | Restore both reverted fixes; re-run security-reviewer; owner-scoped lookups + guest cart nulling. |
| Silent benefit consumption surprises users | Default `PAY_NORMAL`; explicit, reversible "use my benefits" choice. |
| Frontend bypass of gates | Server recomputes price + re-checks every gate at reserve/commit; typed rejections. |
| Feature leaks outside pilot | Respect the strict `subscriptions` country flag on every new surface. |
| Brief's checkbox-hide vs. keep-pay-full divergence (Decision C) | Default to the safe split; flag the stricter hide-everything variant for owner sign-off. |

---

## 9. File-touch index (anticipated)
**Frontend**
- `app/(site)/[country]/[lang]/pricing/page.tsx` · `_components/PricingPlanCard.tsx` (WS-1)
- `app/(auth)/account/subscribe/page.tsx` · `_components/SubscribeForm.tsx` (WS-2)
- `app/(auth)/account/layout.tsx` (sidebar) · `account/membership/*` or new `account/subscription/*` (WS-3)
- `.../consult/[serviceSlug]/_components/consultation-booking-form.tsx` (WS-4/5)
- `components/cart/CartContext.tsx` · `components/cart/PlanCoverage.tsx` · `lib/api/cart-types.ts` (WS-4/5)
- `app/(auth)/account/family/*` + `lib/api/family-client.ts` (WS-5, recovered)
- `lib/api/me-subscription.ts` · i18n `subscription.json` ×6, plus any `account.json`/`coverage` keys
**Backend**
- `modules/subscriptions/pricing-resolver.ts` · `checkout-pricing.service.ts` · `family-eligibility.ts` (recovered) · `subscription-read.service.ts` (WS-3 view-model)
- `modules/subscriptions/subscription.service.ts` + `billing/billing.fake.ts` (WS-2 dev activation)
- `routes/family.route.ts` + `schemas/family.schema.ts` (recovered) · cart/orders routes (carry new fields)
- `modules/plans/plans.service.ts` · `plan-rules.service.ts` (Premium-only guards)
- `prisma/schema.prisma` + new additive migration

---

## 10. Open decisions (need owner sign-off)
1. **Decision A** — Option A (dedicated subscription checkout lane, recommended) vs. Option B (true unified cart). *Gates WS-2.*
2. **Decision C** — For non-family plans, **disable the family-benefit control with an explanation** (recommended, keeps pay-full open) vs. **hide the "book for someone else" checkbox entirely** (brief's literal wording).
3. **WS-4 default** — When eligible, default the benefit toggle to **off (PAY_NORMAL)** or **on**? (Recommend off — explicit opt-in.)
4. **WS-3 route** — Enrich existing `/account/membership` vs. introduce `/account/subscription` and redirect. (Recommend enrich in place + add sidebar link.)

---

### Appendix — recovery commands (reference)
```bash
# Inspect the reverted feature commit
git show 82588ba6 --stat
# Extract as a patch to re-apply/adapt onto the current HEAD
git format-patch -1 82588ba6 -o ../recovered-patches
git format-patch -1 1427b2b6 -o ../recovered-patches
# Or cherry-pick (expect conflicts around subscriber-ledger.tsx already fixed in 3775a937)
git cherry-pick -n 82588ba6
```
