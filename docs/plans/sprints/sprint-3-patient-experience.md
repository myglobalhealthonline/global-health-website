# Sprint 3 — Patient Experience, Notifications & Legal (Waves 4–5)

> Master plan: [subscription-plan-implementation.md](../subscription-plan-implementation.md), §2, §3, §12, §29, §30, §36.14, §40. Builds everything a patient sees: public pricing page, subscribe/manage flow, dashboard cards, wellness redemption UI, plus the email/notification catalog and legal terms. Runs **in parallel** with Sprints 1 & 2 once Sprint 1 Phase 0 (schema) is merged; consumes Sprint 1's patient APIs.

## Agent role
Patient-facing frontend engineer (+ notification/email templates + legal copy). Owns the public/account UI. Consumes Sprint 1 REST APIs — builds no money logic.

## Prerequisites (hard gate)
- **Sprint 1 Phase 0 merged** (schema/Prisma client) for any shared types.
- Patient APIs from **Sprint 1 Phase 1 & 5** (`/api/me/subscription*`, `/api/me/credits`, `/api/me/redemptions`). Until they land, build UI against the contract in `docs/plans/sprints/contracts.md` with a mock client; swap to real at the sync point.

## Parallelization map / file ownership
**OWNED:**
- `frontend/app/(site)/[country]/[lang]/pricing/**` (new public pricing page — country-scoped, §36.14)
- `frontend/data/pricing-plans.ts` (replace empty `[]` with API-driven data)
- `frontend/app/(auth)/account/**` subscription cards, credits, redemption UI, manage/cancel/upgrade (new components only — don't break existing booking UI)
- `frontend/app/(auth)/account/payments/**` add `SubscriptionInvoice` rows to the list
- Patient notification components + `email.subscription.*` / `email.perk.*` / `email.wellness.*` / `email.redeem.*` templates + i18n keys
- Legal/terms surfaces: subscription terms copy + checkout consent checkbox (§40)

**OUT of scope:** schema (Sprint 1), all `/api/me/*` handlers + credit/billing logic (Sprint 1), admin UI (Sprint 2). Follow `DESIGN.md` / `gh2-*` system; copy must avoid implying physical consultations (§1).

---

## Phase 1 — Public pricing page (§29, §36.14)
- [ ] New **country-scoped** route `/[country]/[lang]/pricing` so `resolveCountry` (`frontend/lib/routing/resolve-country.ts`) yields the slug — never the `ie` default for an anonymous visitor.
- [ ] Render plans from the resolved-plan API (per-country). Plan cards: name, price, `monthlyConsultationCredits`, perks, **universal note "Selected perks unlock after 2 paid months"** (§2). **Do NOT show the family bullet** (Wave 5, D20).
- [ ] Empty state: country with zero active plans → "not available in your country", not a blank page (§5).
- [ ] Anonymous CTA → login/register → resume subscribe (D15 no guest).
- [ ] Gate the page on the `subscriptions` feature flag with the **strict-presence** check (§36.15) — never trust the "empty = enabled" default in `frontend/lib/content/country-features.ts`.

## Phase 2 — Subscribe + manage flow (§22, §25.2)
- [ ] Subscribe CTA → `POST /api/me/subscription` → redirect to Stripe Checkout (`mode:"subscription"`).
- [ ] Manage screen: status, next billing date, **billing portal** link (`/api/me/subscription/portal`), cancel (`/cancel`), upgrade/downgrade (`/change`) showing **"changes on <pendingChangeEffectiveAt>"** (Q10=B, reads pending-change fields).
- [ ] Handle return states: success, SCA `payment_action_required` (link the Stripe hosted-invoice auth), INCOMPLETE (pending first payment).

## Phase 3 — Dashboard cards (§12) — `frontend/app/(auth)/account/page.tsx`
- [ ] Insert a subscription card group (≈ line 245, above recent bookings): active plan, monthly price, next billing date, status.
- [ ] Consultation credits: available / used / remaining this month (from `/api/me/credits`).
- [ ] Wellness balance + redemption progress ("4/6 toward a blood test").
- [ ] Locked perks + unlock condition/date; specialist discount eligibility.
- [ ] Copy is **data-driven** from each rule's `unlockAfterPaidMonths` — not a hardcoded "2 months" (§36.17).

## Phase 4 — Wellness redemption UI (§11)
- [ ] Eligible-kit list + progress from `/api/me/redemptions`.
- [ ] Redeem → `POST /api/me/redemptions` → reserve credits/stock, redirect to **shipping Checkout URL** (postage only); instant confirm if `shippingCents=0`.
- [ ] Show states: reserved/pending shipping payment, approved, fulfilled, released/cancelled (credits restored).
- [ ] Surface on the `tests/[testSlug]` page when the user is eligible.

## Phase 5 — Notifications + email templates (§30)
- [ ] Add a **patient** notification channel (existing `Notification` model is doctor-only) + templates/i18n keys for: subscription confirmed (`subscription_create`), renewal+credits, perk unlocked, wellness earned, redemption confirmed, renewal reminder, cancellation. **No failed-payment/dunning email — Stripe owns that** (§38.5).
- [ ] All active locales (CommonLocale lacks per-key fallback). UI copy keys: `subscription.note.universal/.detailed/.tooltip.perkUnlock`.

## Phase 6 — Legal / terms (§40)
- [ ] Subscription terms on terms surfaces (not just `notesTerms`): recurring billing authorization/mandate, auto-renewal, cancellation timing (benefits to period end), refund policy (7-day + no-credit-used, no partial — D17/D19), country tax wording (D21), online/video-only + no prescriptions (D12), credits/wellness terms, **family omitted for v1**.
- [ ] **Checkout consent checkbox** ("I authorize the recurring monthly charge and accept the subscription terms") gating the subscribe action.

---

## Acceptance criteria (maps to §15)
- Anonymous visitor sees correct **per-country** plans (or a clean empty state), never the wrong country's prices.
- Login-gated subscribe → Stripe Checkout; manage/cancel/upgrade work; "changes on date" shown for scheduled changes.
- Dashboard shows plan, credits (remaining/used), wellness balance + redemption progress, locked perks with unlock condition.
- Redemption flow charges postage only, shows reserve→confirm states, restores credits on cancel.
- Subscription emails fire on the right events (no app dunning email); legal terms + consent checkbox present.
- Both light/dark intentional; copy never implies physical visits.

## Test plan (web — §27, web testing rules)
Visual regression at 320/768/1024/1440 for pricing cards + dashboard cards (light+dark). E2E (Playwright): subscribe → dashboard shows plan+credits; book included consult → €0 (drives Sprint 1's engine); redeem after 6 credits → shipping checkout; cancel → benefits persist to period end. A11y: keyboard + contrast on pricing/subscribe. Unit: pricing-plans data transform, credit/progress formatting. Mock the `/api/me/*` client until Sprint 1 APIs land.

## Risks
- API contract drift with Sprint 1 → pin `contracts.md`; integrate at a sync point, mock until then.
- Don't regress the existing account/booking UI — add components, don't rewire.
- Feature-flag default trap (§36.15) — verify the strict-presence gate, not the leaky default.
