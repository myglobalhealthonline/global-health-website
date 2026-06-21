# Sprint 2 — Super-Admin Plan Management (Wave 1)

> Master plan: [subscription-plan-implementation.md](../subscription-plan-implementation.md), §4, §13, §25.1, §36.10–36.13. Builds the admin surface to create/configure/manage subscription plans. Runs **in parallel** with Sprint 1 (Phases 1–6) and Sprint 3 once Sprint 1 Phase 0 (schema) is merged.

## Agent role
Full-stack admin engineer. Owns the admin REST routes for plan config + the admin UI screens. Follows the existing admin CRUD template exactly (`admin/services/*`).

## Prerequisites (hard gate)
- **Sprint 1 Phase 0 merged** (schema + Prisma client). Until then, build against the §20 field lists as the typed contract; do not start route handlers that import the new models.
- Calls `billing.syncPlanStripePrice(planId)` from Sprint 1 after plan create / price edit — coordinate the signature via `docs/plans/sprints/contracts.md`.

## Parallelization map / file ownership
**OWNED:**
- `backend/src/routes/admin-plans.route.ts`, `admin-plan-rules.route.ts`, `admin-subscription-perk-grants.route.ts`, `admin-subscriptions.route.ts` (new)
- `backend/src/modules/plans/**` (admin service layer — plan/rule/translation CRUD)
- `backend/src/validations/admin-plans.schema.ts` (Zod)
- `frontend/app/(admin)/admin/plans/**` (new — list/new/[id]/edit + rules/perks/health-tests/translations sub-screens)
- `frontend/app/(admin)/admin/_components/plan-*.tsx` (new form components)
- Additions to `frontend/lib/admin/admin-api.ts` (append plan methods — coordinate merge; this file is admin-only so only Sprint 2 touches it)

**OUT of scope:** schema (Sprint 1), `payments.route.ts`/`orders.route.ts`/credit logic (Sprint 1), all patient frontend (Sprint 3).

**Shared file caution:** the backend route index/registration file — append your routes; rebase often to avoid conflict with Sprint 1's new route registrations.

---

## Architecture to follow (copy these patterns)
- List page: `frontend/app/(admin)/admin/services/page.tsx`
- Edit page: `frontend/app/(admin)/admin/services/[id]/edit/page.tsx` + `_components/service-fields.tsx`
- Backend route: `backend/src/routes/admin-services.route.ts` + `backend/src/modules/services/services.service.ts`
- Server-only API client: `frontend/lib/admin/admin-api.ts`
- Role gate: `verifyAdminAccess()` (`backend/src/utils/admin-auth.ts`) — additionally require the **`MANAGE_SUBSCRIPTIONS`** scope (§25.1) for all mutations.
- Audit every mutation via `recordAudit()` (`backend/src/modules/audit/audit.service.ts`) with the §24 actions.

---

## Phase 1 — Plan CRUD (backend + frontend)
- [ ] `GET /api/admin/plans?countryId=` (list per country), `POST` (create), `GET/PATCH/DELETE /api/admin/plans/:id` — **DELETE = deactivate-only** (soft `isActive:false`; never hard-delete when subscriptions/rules/Price exist, §25.1).
- [ ] `POST /api/admin/plans/:id/reorder` (displayOrder).
- [ ] On create + on `monthlyPriceCents` change → call `billing.syncPlanStripePrice` (Sprint 1). Surface a hard error if sync fails (§39) — do not save a plan that has no Price.
- [ ] Frontend: list (per-country picker, follows `country-picker.tsx`), create, edit forms for all Plan fields incl. `monthlyConsultationCredits`, `wellnessCreditsPerMonth`, `vatMode`/`vatRatePct`, `familyEnabled` (seeded false, Wave 5), `isFeatured`/`badgeLabel`, `displayOrder`.

## Phase 2 — Consultation rules (the service-picker, §36.10)
- [ ] `GET/POST/DELETE /api/admin/plans/:id/consultation-rules`.
- [ ] **Service picker scoped to `plan.countryId`** (Service is per-country). On write, set `PlanConsultationRule.countryId = plan.countryId`. **Reject `serviceId` where `Service.kind = PRESCRIPTION`** (D12, §36.11) AND where `Service.countryId != plan.countryId` (clean error; the two composite FKs are the hard guarantee).
- [ ] Per-rule fields: `isIncluded`, `usesCredits`, `creditsPerUse`, `discountMode` (NONE/PERCENT/FIXED), `discountPercent`/`fixedPriceCents`, `unlockAfterPaidMonths`, `familyUsable`.
- [ ] UI distinguishes GP/GENERAL vs SPECIALIST services; specialist = a rule with a discount.

## Phase 3 — Perk rules + manual-approval queue (§36.13)
- [ ] `GET/POST/DELETE /api/admin/plans/:id/perks` (`PlanPerkRule`: `perkKey`, `unlockMode`, `unlockAfterPaidMonths`). No `isApproved` here.
- [ ] **Per-subscriber** approval: `GET /api/admin/subscription-perk-grants?status=PENDING` (queue) + `POST /api/admin/subscription-perk-grants/:id/approve`. UI = a pending-approval queue screen.

## Phase 4 — Health-test redemption rules + translations + preview
- [ ] `GET/POST/DELETE /api/admin/plans/:id/health-test-rules` (`HealthTestKitRedemptionRule`: `healthTestId`, `requiredWellnessCredits`, `unlockAfterPaidMonths`; active-sub always required, no toggle — D6).
- [ ] `GET/PUT /api/admin/plans/:id/translations/:locale` (`PlanTranslation`, `locale = LocaleCode`).
- [ ] `GET /api/admin/plans/:id/preview?locale=` → resolved plan with translations applied (read-only render).

## Phase 5 — Admin subscriptions view + manual adjust
- [ ] `GET /api/admin/subscriptions` (filter status/plan/country).
- [ ] `POST /api/admin/subscriptions/:id/adjust-credits` (manual grant/clawback) — audited, idempotency key `admin:{adminId}:{requestId}` (§36.15). Writes via Sprint 1's credit module (`credits.adjustCredits`, see contracts.md) to keep the counter authoritative.
- [ ] Audit-log section already exists; ensure new §24 actions render.
- [ ] **Subscription-health panel (§39):** admin screen surfacing the latest reconciliation diff + invariant alerts that Sprint 1's ops jobs produce (Stripe↔DB drift, ledger↔balance mismatch, price-sync failures). Sprint 1 owns the jobs + a read endpoint (`GET /api/admin/subscription-health`); Sprint 2 owns this UI. Coordinate the endpoint shape in contracts.md.

---

## Acceptance criteria (maps to §15)
- Super Admin can create/edit/deactivate/reorder per-country plans; set price + currency per country; Stripe Price synced.
- Can link Services to a plan with included/credit/discount/fixed/unlock config; **cannot** attach a PRESCRIPTION or cross-country Service.
- Can configure wellness credits, redemption rules, perk unlock rules, translations.
- Manual perk approval is per-subscriber via the queue.
- Every mutation writes an audit row; all gated by `MANAGE_SUBSCRIPTIONS`.
- DELETE never destroys a plan with subscribers.

## Test plan (TDD)
Unit: Zod validation (reject PRESCRIPTION/cross-country serviceId, reject negative credits). Integration: each CRUD route + audit row written + role gate (403 without `MANAGE_SUBSCRIPTIONS`); plan create triggers Price sync (mock Sprint 1's `billing` module). E2E (Playwright): create plan → add rules → preview shows resolved plan; deactivate hides from new signups. Target ≥80%.

## Risks
- `admin-api.ts` is large + shared within admin — append only, rebase frequently.
- Stripe Price sync coupling to Sprint 1 — mock the `billing` interface until Sprint 1 Phase 1 lands; integrate at a sync point.
