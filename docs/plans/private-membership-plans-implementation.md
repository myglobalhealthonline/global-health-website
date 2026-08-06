# Private Membership Plans — Implementation Plan

**Status:** approved requirements, not started
**Date:** 2026-08-07
**Branch target:** `Dev-hassaan`
**First market:** Ireland (`ie`)

---

## 1. Scope

A new, entirely separate benefit system: **private membership plans**. Admin-created,
never visible on the public site, usable only by the people an admin has enrolled.

This is benefit source **#4**, alongside three that already exist and are **not
modified structurally** by this work:

| Source | Engine | Lives in |
| --- | --- | --- |
| Public plans | `PricingPlan` + `UserSubscription`, Stripe monthly, credits | `modules/subscriptions`, `modules/plans` |
| Corporate | `CorporatePlan` + `CorporateCompany`, offline annual, auto-discount | `modules/corporate` |
| Insurance | `InsuranceCompany` + `InsuranceServiceCoverage`, negotiated flat price | `modules/insurance-companies`, `modules/pricing` |
| **Private membership (new)** | `MembershipPlan` + `MembershipEnrollment`, no billing, allowance/discount | `modules/memberships` (new) |

**Explicit decision: no reuse.** Private memberships get their own tables, their own
service module, their own admin screens and their own resolver. Nothing in the
subscription, corporate or insurance tables is extended to carry membership data.
The only shared surfaces are the booking flow, the cart/order tables (new nullable
columns), and the checkout price composition.

### 1.1 Decisions log (agreed in requirements discussion)

| # | Decision |
| --- | --- |
| 1 | Own model tree; no reuse of public-plan / corporate / insurance tables |
| 2 | Plan → levels as child rows. A plan with no levels gets one implicit default level |
| 3 | Allowance is a fixed pool for the term. No monthly/annual auto-reset |
| 4 | Enrollment has a start date and an optional end date. Expiry stops benefits |
| 5 | Membership ID is supplied by the partner, unique globally |
| 6 | Benefits require login. Guests may book, at full price |
| 7 | Membership resolved from the session; a claim form (ID + enrolled email) covers email mismatches |
| 8 | Benefit rows target a service kind, overridable per service. Types: allowance / percent / fixed / excluded |
| 9 | A plan belongs to exactly one country |
| 10 | Import pre-enrolls as `PENDING`, auto-links on login/signup. Invite email is a manual admin action |
| 11 | Family optional per level: dependents from the import *or* member-added up to `maxDependents`. Pool `SHARED` or `PER_PERSON` |
| 12 | Booking gets one benefit step, placed where the insurance step sits today, covering all four sources |
| 13 | Eligible benefits auto-detected and pre-selected. Toggle off = full price |
| 14 | Every eligible source is priced and listed with its resulting price. Allowance options labelled "uses 1 of your N" |
| 15 | Payer fields are optional metadata. No payer login, no invoices, no charging |
| 16 | Allowance spent at booking, refunded on cancellation, kept on no-show. Idempotent, ledger-backed |
| 17 | Price locked at booking. Suspension/expiry affects new bookings only. Removal is soft |
| 18 | Consultations only (`GENERAL`, `SPECIALIST`) |
| 19 | A person may hold multiple private memberships |
| 20 | Member page + digital card. Verification is staff/admin-only, no public URL |
| 21 | `MEMBERSHIP_CONFIG` (a real `SUPER_ADMIN` **or** `ADMIN` session) edits plans/levels/benefits; `MANAGE_MEMBERSHIPS` enrolls/suspends/imports. Revised 2026-08-07: requiring a super admin for every price rule made routine setup unusable. `LOCAL_ADMIN` and the master token stay out of both |
| 22 | CSV import with preview-then-commit |
| 23 | Plan and level names + descriptions translated per locale |
| 24 | A benefit row carries an allowance plus an optional fallback (percent or fixed) used once the allowance is exhausted |
| 25 | Benefit chosen once per cart, applied to all eligible lines; partial allowance coverage falls to the fallback and is shown before payment |
| 26 | Admin manual bookings get the same benefits. `SUPER_ADMIN`-only override with mandatory reason, audited |
| 27 | Emails: enrollment confirmed, manual invite, allowance exhausted. No expiry warning |
| 28 | Ireland first. Ireland's configured locales with English fallback. Import runs synchronously with a row cap |
| 29 | Percent applies to the peak-adjusted price. A fixed price overrides peak, as insurance does |
| 30 | Doctor is paid on the full list price. The discount comes out of clinic margin. No per-plan payout config |
| 31 | €0 orders skip Stripe, confirm immediately, and still send the normal confirmation email |
| 32 | Per-plan usage view plus per-member drill-down, booking metadata only, audited |
| 33 | Insurance keeps its existing lifecycle (alone in cart, no Stripe charge, admin verification) even though it appears in the unified dropdown |

### 1.2 Standing assumptions

1. Benefits never stack. One source per cart, always.
2. A member booking in a country other than the plan's country gets no benefit.
3. All pricing is re-derived server-side at checkout. Anything the client sends is
   display-only; a forged membership id, enrollment id or level id falls through to
   full price, never cheaper.
4. Cancellation returns the allowance unit. A no-show does not.
5. Enrollment matching is on a lowercased, trimmed email.
6. A `PENDING` enrollment grants nothing until it is linked to an account.

### 1.3 Out of scope

- Charging the payer (no Stripe, no invoices, no payer portal).
- Allowance auto-reset / recurring periods.
- Benefits on lab tests, health-test kits, prescriptions, home delivery.
- Public verification URL for membership cards.
- Expiry-warning emails.
- Per-plan doctor payout overrides.

---

## 2. Glossary

- **Plan** — `MembershipPlan`. One partner programme in one country (e.g. "MEMS Ireland").
- **Level** — `MembershipLevel`. A tier inside a plan (Gold, Silver). Every plan has at
  least one; a plan without tiers gets an auto-created default level.
- **Benefit row** — `MembershipBenefit`. What a level gives for a service kind or a
  specific service.
- **Enrollment** — `MembershipEnrollment`. One person on one level. `PRIMARY` or `DEPENDENT`.
- **Membership ID** — partner-supplied string on the enrollment, globally unique.
- **Allowance** — a fixed count of included consultations for the term.
- **Holder** — the enrollment that owns an allowance balance. Self under `PER_PERSON`,
  the primary enrollment under `SHARED`.

---

## 3. Data model

All new. Prisma models go at the end of `backend/prisma/schema.prisma`, in their own
commented section mirroring the corporate block's layout.

### 3.1 Enums

```prisma
enum MembershipEnrollmentStatus {
  PENDING     // imported, no account linked yet — grants nothing
  ACTIVE
  SUSPENDED   // admin-paused, benefits off, row and history retained
  EXPIRED     // endDate passed
  REMOVED     // soft delete; re-import of the same email revives this row
}

enum MembershipMemberType {
  PRIMARY
  DEPENDENT
}

enum MembershipAllowancePool {
  SHARED      // one pool for the primary + all their dependents
  PER_PERSON  // each covered person gets their own pool
}

enum MembershipBenefitType {
  ALLOWANCE   // N included consultations, then fallback
  PERCENT
  FIXED
  EXCLUDED    // explicitly no benefit (used to carve a service out of a kind rule)
}

enum MembershipFallbackType {
  NONE
  PERCENT
  FIXED
}

enum MembershipLedgerReason {
  SPEND
  REFUND
  ADMIN_ADJUST
}

enum MembershipImportStatus {
  PREVIEW
  COMMITTED
  CANCELLED
}
```

Also extend the existing cart/order benefit-source concept with a **new** enum rather
than touching `BenefitSelection`:

```prisma
enum CartBenefitSource {
  NONE          // patient toggled the benefit section off → full price everywhere
  UNSET         // default; nothing chosen yet (pre-selection has not run)
  MEMBERSHIP
  CORPORATE
  PUBLIC_PLAN
  INSURANCE
}
```

`UNSET` matters: it distinguishes "patient has not reached the benefit step" from
"patient explicitly declined". Only `NONE` suppresses corporate's automatic discount.

### 3.2 Plan and level

```prisma
model MembershipPlan {
  id            String  @id @default(cuid())
  countryId     String
  country       Country @relation(fields: [countryId], references: [id], onDelete: Cascade)
  slug          String
  name          String              // internal/default name; patient-facing copy is translated
  internalNotes String?
  isActive      Boolean @default(true)

  // Payer metadata — all optional (§15). Never charged, never surfaced to patients.
  payerName        String?
  payerEmail       String?
  payerPhone       String?
  payerAmountCents Int?
  payerCurrency    String?
  payerNotes       String?

  levels       MembershipLevel[]
  translations MembershipPlanTranslation[]
  enrollments  MembershipEnrollment[]
  importBatches MembershipImportBatch[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([countryId, slug])
  /// FK target for the (planId, countryId) composite FKs added in raw SQL.
  @@unique([id, countryId])
  @@index([countryId, isActive])
}

model MembershipPlanTranslation {
  id          String         @id @default(cuid())
  planId      String
  plan        MembershipPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  locale      LocaleCode
  name        String
  description String?

  @@unique([planId, locale])
}

model MembershipLevel {
  id        String         @id @default(cuid())
  planId    String
  plan      MembershipPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  /// Always == plan.countryId. App-enforced and composite-FK enforced.
  countryId String
  slug      String
  name      String
  sortOrder Int     @default(0)
  /// Exactly one level per plan carries true. Auto-created for tier-less plans
  /// and used as the import default when the CSV has no `level` column.
  isDefault Boolean @default(false)
  isActive  Boolean @default(true)

  // Family (§11)
  familyEnabled  Boolean                 @default(false)
  maxDependents  Int                     @default(0)
  allowancePool  MembershipAllowancePool @default(PER_PERSON)

  benefits     MembershipBenefit[]
  translations MembershipLevelTranslation[]
  enrollments  MembershipEnrollment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([planId, slug])
  @@unique([id, countryId])
  @@index([planId, isActive])
}

model MembershipLevelTranslation {
  id          String          @id @default(cuid())
  levelId     String
  level       MembershipLevel @relation(fields: [levelId], references: [id], onDelete: Cascade)
  locale      LocaleCode
  name        String
  description String?

  @@unique([levelId, locale])
}
```

### 3.3 Benefit rows

```prisma
/// What a level gives. Targets EITHER a service kind (GENERAL / SPECIALIST only)
/// OR one specific service in the plan's country. A service row always beats a
/// kind row for that service (§6.2).
model MembershipBenefit {
  id        String          @id @default(cuid())
  levelId   String
  level     MembershipLevel @relation(fields: [levelId], references: [id], onDelete: Cascade)
  /// Always == level.countryId (composite FK against Service).
  countryId String

  serviceKind ServiceKind?  // GENERAL | SPECIALIST only — validated at the API
  serviceId   String?
  service     Service?      @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  benefitType     MembershipBenefitType
  /// ALLOWANCE only: included consultations for the term.
  allowanceCount  Int?
  /// PERCENT only: 0 < percent <= 100.
  percentOff      Float?
  /// FIXED only: the price the member pays, in the service's currency.
  fixedPriceCents Int?

  /// Used once the allowance hits zero (ALLOWANCE rows only) — §24.
  fallbackType       MembershipFallbackType @default(NONE)
  fallbackPercent    Float?
  fallbackFixedCents Int?

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  balances MembershipAllowanceBalance[]

  @@unique([levelId, serviceKind])
  @@unique([levelId, serviceId])
  @@index([levelId, isActive])
}
```

**Invariants enforced at the API (and by a CHECK constraint in raw SQL):**

- exactly one of `serviceKind` / `serviceId` is non-null;
- `serviceKind` ∈ {`GENERAL`, `SPECIALIST`};
- `benefitType = ALLOWANCE` → `allowanceCount >= 1`;
- `benefitType = PERCENT` → `0 < percentOff <= 100`;
- `benefitType = FIXED` → `fixedPriceCents >= 0`;
- `fallbackType` non-`NONE` only when `benefitType = ALLOWANCE`;
- a `serviceId` row's service must belong to `countryId` and have
  `kind IN (GENERAL, SPECIALIST)`.

### 3.4 Enrollment

```prisma
model MembershipEnrollment {
  id        String          @id @default(cuid())
  planId    String
  plan      MembershipPlan  @relation(fields: [planId], references: [id], onDelete: Cascade)
  levelId   String
  level     MembershipLevel @relation(fields: [levelId], references: [id])
  /// Always == plan.countryId.
  countryId String

  /// Partner-supplied. Globally unique across every plan (§5). NO `@unique`
  /// here — PostgreSQL's plain unique is case-sensitive, so `ABC1` and `abc1`
  /// could coexist while lookups compare case-insensitively. Uniqueness is a
  /// raw-SQL unique index on lower(membershipId) (§3.8), and every lookup
  /// (claim form, staff verify, import) queries via lower().
  membershipId String
  /// Lowercased + trimmed at write time. The linking key (§ assumption 5).
  email        String
  firstName    String
  lastName     String
  phone        String?
  dateOfBirth  DateTime?

  /// Set when the account is linked (login/signup match, or claim form).
  userId     String?
  user       User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  linkedAt   DateTime?
  /// Set only when linked via the manual claim form, for audit.
  claimedAt  DateTime?

  memberType          MembershipMemberType  @default(PRIMARY)
  primaryEnrollmentId String?
  primaryEnrollment   MembershipEnrollment?  @relation("MembershipDependents", fields: [primaryEnrollmentId], references: [id], onDelete: Cascade)
  dependents          MembershipEnrollment[] @relation("MembershipDependents")
  relationship        String?

  status    MembershipEnrollmentStatus @default(PENDING)
  startDate DateTime
  /// null = open-ended. A past date kills benefits (live check + daily cron).
  endDate   DateTime?

  importBatchId    String?
  importBatch      MembershipImportBatch? @relation(fields: [importBatchId], references: [id], onDelete: SetNull)
  createdByAdminId String?
  /// Free-text admin note (why suspended, partner reference, …).
  adminNotes       String?

  balances       MembershipAllowanceBalance[]
  ledgerEntries  MembershipUsageLedger[]
  inviteLogs     MembershipInviteLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([planId, email])
  @@index([email])
  @@index([userId, status])
  @@index([planId, status])
  @@index([primaryEnrollmentId])
}
```

Notes:

- **Inverse relations.** Prisma requires both sides of every relation, so the
  migration change-set also touches existing models: `Country` gains
  `membershipPlans MembershipPlan[]`, `Service` gains
  `membershipBenefits MembershipBenefit[]`, `User` gains
  `membershipEnrollments MembershipEnrollment[]`, and `MembershipEnrollment`
  gains `carts Cart[]` for the `Cart.membershipEnrollment` relation. Run
  `prisma validate` before generating any SQL — the snippets in this doc show
  only the new-model side.
- **No `@@unique([planId, email])` in the schema.** The real constraint is the
  raw-SQL partial index on `(planId, lower(email)) WHERE status <> 'REMOVED'`
  (§3.8) — a plain Prisma unique would be case-sensitive *and* would block
  re-adding a removed member, and leaving it declared would make every future
  `migrate diff` try to re-add it. Same treatment as `membershipId`.
- `membershipId` is unique globally per decision 5. Dependents also need one —
  the import supplies theirs, and the member-added path generates
  `<primaryMembershipId>-D1`, `-D2`, … (checked for collision).
- Dependents inherit `planId`, `levelId`, `countryId`, `startDate`, `endDate`
  from their primary. The API rejects any attempt to set them independently.

### 3.5 Allowance balances and ledger

```prisma
/// One counter per (benefit row, holder). Holder is the enrollment that owns the
/// pool: self under PER_PERSON, the primary enrollment under SHARED (§11).
/// Created lazily on first use; `allocated` is snapshotted from the benefit row
/// at creation so a later admin edit does not silently change a live term.
model MembershipAllowanceBalance {
  id                 String               @id @default(cuid())
  benefitId          String
  benefit            MembershipBenefit    @relation(fields: [benefitId], references: [id], onDelete: Cascade)
  holderEnrollmentId String
  holderEnrollment   MembershipEnrollment @relation(fields: [holderEnrollmentId], references: [id], onDelete: Cascade)
  allocated          Int
  used               Int                  @default(0)
  /// Term this counter belongs to — copied from the holder's startDate. A term
  /// renewal (new startDate) creates a NEW balance row rather than resetting.
  termStart          DateTime
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  ledgerEntries MembershipUsageLedger[]

  @@unique([benefitId, holderEnrollmentId, termStart])
}

/// Append-only. Every allowance movement, with the order line that caused it.
model MembershipUsageLedger {
  id           String                      @id @default(cuid())
  balanceId    String
  balance      MembershipAllowanceBalance  @relation(fields: [balanceId], references: [id], onDelete: Cascade)
  /// WHO consumed it (may be a dependent while the balance holder is the primary).
  enrollmentId String
  enrollment   MembershipEnrollment        @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  delta        Int                         // -1 spend, +1 refund, ± admin adjust
  reason       MembershipLedgerReason
  orderId      String?
  orderItemId  String?
  appointmentId String?
  actorAdminId String?                     // ADMIN_ADJUST only
  note         String?
  /// `${orderItemId}:SPEND` / `${orderItemId}:REFUND` — makes retries safe.
  idempotencyKey String                    @unique
  createdAt      DateTime                  @default(now())

  @@index([balanceId, reason])
  @@index([enrollmentId])
  @@index([orderId])
}
```

`used` on the balance is the authority; the ledger is the audit trail. Both are
written in the same transaction, and `idempotencyKey` makes a retried checkout a
no-op.

### 3.6 Import batch and invite log

```prisma
model MembershipImportBatch {
  id               String                 @id @default(cuid())
  planId           String
  plan             MembershipPlan         @relation(fields: [planId], references: [id], onDelete: Cascade)
  fileName         String
  uploadedByAdminId String?
  status           MembershipImportStatus @default(PREVIEW)
  rowCount         Int                    @default(0)
  createdCount     Int                    @default(0)
  revivedCount     Int                    @default(0)
  rejectedCount    Int                    @default(0)
  /// Server-side parse result. The commit step reads THIS, never a client payload.
  previewData      Json
  committedAt      DateTime?
  createdAt        DateTime               @default(now())

  enrollments MembershipEnrollment[]

  @@index([planId, status])
}

/// A nudge email only — linking is by email, so there is no token to redeem.
model MembershipInviteLog {
  id           String               @id @default(cuid())
  enrollmentId String
  enrollment   MembershipEnrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  email        String
  sentByAdminId String?
  sentAt       DateTime?
  error        String?
  createdAt    DateTime             @default(now())

  @@index([enrollmentId])
}
```

### 3.7 Cart / Order additions

New nullable columns only — nothing existing changes shape.

```prisma
model Cart {
  // …
  /// Cart-level benefit choice (§25). UNSET until the benefit step runs.
  benefitSource           CartBenefitSource     @default(UNSET)
  membershipEnrollmentId  String?
  membershipEnrollment    MembershipEnrollment? @relation(fields: [membershipEnrollmentId], references: [id], onDelete: SetNull)
}

model OrderItem {
  // …
  /// Membership audit trail — set when the membership engine priced this line.
  /// `unitPriceCents` is ALREADY the member price; these record how it got there.
  membershipEnrollmentId String?
  membershipBenefitId    String?
  membershipDiscountCents Int?
  /// true when an allowance unit paid for this line (unit price is then 0).
  membershipAllowanceUsed Boolean @default(false)
}
```

Mirrors `corporateDiscountCents` / `corporateCompanyId`, which already exist for the
corporate engine — same convention, separate columns.

`Appointment` needs no new columns: the order line carries the audit trail, and the
member page reads through `OrderItem`.

### 3.8 Migration strategy

`prisma migrate dev` is broken in this repo (shadow-DB issue). Follow the documented
workaround:

**Baseline database: `backend/.env.dev`** (`hayabusa…:49401/railway`) — a
separate Railway instance from production (`trolley…:31877`). Never diff or
deploy against `backend/.env`, which is production, until dev is verified.

0. **Confirm dev is schema-current with production first.** The diff baseline
   must match prod, or the generated script will carry drift DDL and fail to
   apply. Compare the tail of `_prisma_migrations` on both; if dev is behind,
   bring it up to date before generating anything.
1. Edit `schema.prisma`, including the inverse relations (§3.4 note), then
   `prisma validate`.
2. `prisma migrate diff --from-url <dev DB> --to-schema-datamodel schema.prisma --script`
   → save as `backend/prisma/migrations/<timestamp>_membership_plans/migration.sql`.
   **Drift guard:** review the generated script line-by-line and delete any DDL
   not belonging to this feature. The reviewed script is what gets committed and
   deployed — never a re-generated one.
3b. `prisma migrate deploy` against **dev**, then exercise the feature there.
3. Append the raw-SQL pieces Prisma cannot express:
   - composite FK `MembershipLevel(planId, countryId) → MembershipPlan(id, countryId)`;
   - composite FK `MembershipBenefit(serviceId, countryId) → Service(id, countryId)`;
   - composite FK `MembershipEnrollment(levelId, countryId) → MembershipLevel(id, countryId)`;
   - CHECK constraints for the §3.3 invariants;
   - CHECK `(memberType = 'DEPENDENT') = (primaryEnrollmentId IS NOT NULL)`;
   - partial unique index on `MembershipEnrollment(planId, lower(email))
     WHERE status <> 'REMOVED'` (so a removed row does not block a re-add, while
     the plain `@@unique([planId, email])` is dropped in favour of it);
   - unique index on `lower("membershipId")` on `MembershipEnrollment` — the
     case-insensitive global uniqueness §3.4 relies on;
   - partial unique index on `MembershipLevel("planId") WHERE "isDefault"` —
     enforces the "exactly one default level per plan" rule §3.2 states but
     Prisma cannot express;
   - `ALTER TYPE "AuditAction" ADD VALUE …` for this phase's actions (§4.2).
     Precedent: migration `20260802040127_…`. Postgres will not let an enum
     value be added and used in the same transaction, so these go in their own
     migration step ahead of anything referencing them;
4. Production deploy only after dev is verified, and **only on the user's
   explicit go-ahead** — never as part of a phase's own work.

**Two migrations, not one.** The membership tables ship in Phase 1; the
`Cart` / `OrderItem` columns and `CartBenefitSource` ship in a **second
migration in Phase 4**, next to the code that reads them. Splitting them keeps
Phase 1 free of columns nothing uses yet, and matches §17.

`Cart.benefitSource` defaults to `UNSET`, so the **Phase 5 deploy runs
`UPDATE "Cart" SET "benefitSource" = 'NONE' WHERE "benefitSource" = 'UNSET'`** —
not the Phase 4 migration. A Phase-4-time backfill would only cover carts that
existed then; every cart created between Phase 4 and Phase 5 would still be
`UNSET` when the §6.4 switch goes live. See §6.4 for the belt-and-braces
runtime rule that makes a missed backfill non-fatal.

⚠ `backend/.env` points at **production**. Any script run with `--env-file=.env`
writes live data. Every membership script gets a `--dry-run` default and requires
`--apply` to write.

---

## 4. Backend

New module: `backend/src/modules/memberships/`.

```
memberships/
  membership-plans.service.ts        # plan/level/benefit CRUD + validation
  membership-translations.service.ts # plan + level translations
  membership-enrollments.service.ts  # enroll, suspend, remove, dependents, claim
  membership-linking.service.ts      # email → enrollment linking on login/signup
  membership-import.service.ts       # CSV parse → preview → commit
  membership-pricing.service.ts      # price one service for one enrollment
  membership-allowance.service.ts    # balance resolve, spend, refund, ledger
  membership-reporting.service.ts    # per-plan usage + per-member drill-down
  membership-expiry.job.ts           # daily ACTIVE → EXPIRED sweep
  *.test.ts
```

Plus one cross-source resolver that the booking step and checkout both call:

```
backend/src/modules/benefits/
  benefit-options.service.ts   # prices EVERY eligible source for a service
  benefit-selection.service.ts # validates + persists the cart-level choice
```

`benefit-options.service.ts` is the only new place that knows about all four
sources. It calls into the existing subscription, corporate and insurance services
rather than duplicating them.

### 4.1 Routes

New files under `backend/src/routes/`:

| File | Endpoints |
| --- | --- |
| `admin-membership-plans.route.ts` | plan + level + benefit CRUD, translations |
| `admin-membership-enrollments.route.ts` | list/create/update/suspend/remove, dependents, manual allowance adjust, invite send |
| `admin-membership-import.route.ts` | upload → preview, commit, cancel |
| `admin-membership-reports.route.ts` | per-plan usage, per-member drill-down, CSV export |
| `admin-membership-verify.route.ts` | staff card lookup by membership id |
| `me-membership.route.ts` | member's own memberships, card, allowance, dependents, claim |
| `me-benefit-options.route.ts` | eligible benefit options priced for a service/slot |
| `me-cart-benefit.route.ts` | set / clear the cart-level benefit choice |

No registration step: `app.ts` autoloads every `**/*.route.ts` via
`@fastify/autoload`. Dropping the file in `src/routes/` is enough — which is
precisely why the Semgrep authorization rule in §14 exists, since a new route
file is live the moment it lands.

#### Admin API

```
GET    /api/admin/membership-plans?countryId=&includeInactive=
POST   /api/admin/membership-plans                       [MEMBERSHIP_CONFIG]
GET    /api/admin/membership-plans/:planId
PATCH  /api/admin/membership-plans/:planId               [MEMBERSHIP_CONFIG]
POST   /api/admin/membership-plans/:planId/deactivate    [MEMBERSHIP_CONFIG]
GET    /api/admin/membership-plans/:planId/translations/:locale
PUT    /api/admin/membership-plans/:planId/translations/:locale   [MEMBERSHIP_CONFIG]

POST   /api/admin/membership-plans/:planId/levels        [MEMBERSHIP_CONFIG]
PATCH  /api/admin/membership-levels/:levelId             [MEMBERSHIP_CONFIG]
DELETE /api/admin/membership-levels/:levelId             [MEMBERSHIP_CONFIG]  # only when 0 enrollments
PUT    /api/admin/membership-levels/:levelId/translations/:locale [MEMBERSHIP_CONFIG]

GET    /api/admin/membership-levels/:levelId/benefits
POST   /api/admin/membership-levels/:levelId/benefits    [MEMBERSHIP_CONFIG]
PATCH  /api/admin/membership-benefits/:benefitId         [MEMBERSHIP_CONFIG]
DELETE /api/admin/membership-benefits/:benefitId         [MEMBERSHIP_CONFIG]

GET    /api/admin/membership-enrollments?planId=&status=&q=&page=
POST   /api/admin/membership-enrollments                 [MANAGE_MEMBERSHIPS]
PATCH  /api/admin/membership-enrollments/:id             [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/suspend     [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/reactivate  [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/remove      [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/invite      [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/dependents  [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-enrollments/:id/allowance-adjust  [SUPER_ADMIN, reason required]
       ↑ Phase 5, with the ledger. Nothing spends allowance before then, so in
         Phase 2 its only possible effect is creating an empty balance row.

POST   /api/admin/membership-imports                     [MANAGE_MEMBERSHIPS]  # multipart CSV → PREVIEW
GET    /api/admin/membership-imports/:batchId
POST   /api/admin/membership-imports/:batchId/commit     [MANAGE_MEMBERSHIPS]
POST   /api/admin/membership-imports/:batchId/cancel     [MANAGE_MEMBERSHIPS]

GET    /api/admin/membership-reports/:planId/usage?from=&to=
GET    /api/admin/membership-reports/enrollment/:id/usage
GET    /api/admin/membership-verify?membershipId=         [admin/staff session]
```

#### Member API

```
GET  /api/me/memberships                  # all enrollments for the session user
GET  /api/me/memberships/:id/card         # card payload (name, id, plan, level, status, term)
GET  /api/me/memberships/:id/allowance    # per-benefit remaining
POST /api/me/memberships/claim            # { membershipId, email } → link if both match
POST /api/me/memberships/:id/dependents   # member-added dependents, capped by level
DELETE /api/me/memberships/dependents/:id
```

#### Booking API

```
GET /api/me/benefit-options?serviceId=&timeSlotId=&doctorId=
    → { options: [{ source, refId, label, unitPriceCents, allowanceRemaining, note, recommended }] }

PUT /api/me/cart/benefit
    body { source: NONE|MEMBERSHIP|CORPORATE|PUBLIC_PLAN|INSURANCE, refId?: string }
```

`GET /api/me/benefit-options` requires auth and returns `401` for guests — the UI
then renders "log in to use a membership or plan", matching how
`/api/me/cart-preview` already behaves.

### 4.2 Permissions

New guard `backend/src/utils/manage-memberships-auth.ts`, modelled exactly on
`manage-subscriptions-auth.ts`:

- base check via `verifyAdminAccess`;
- `LOCAL_ADMIN` **denied** (membership config and member PII span the whole plan);
- `requireManageMemberships(request, reply)` returns the resolved actor for audit
  stamping, or sends the error and returns `null`;
- a second helper `requireMembershipConfigRole(auth, reply)` for the
  plan/level/benefit writes, checking `method === "session"` and
  `actorRole` in { `SUPER_ADMIN`, `ADMIN` }. The session requirement is the part
  that matters: the master-token fallback resolves to `ADMIN` with no named
  actor, and a shared token must not be able to rewrite what members pay.
  The allowance override (Phase 5) keeps its own `SUPER_ADMIN` check - it
  moves money on a live member, which plan setup does not.

Every mutation calls `recordAudit` with the actor, entity type
(`MembershipPlan` / `MembershipLevel` / `MembershipBenefit` / `MembershipEnrollment`),
entity id, and a diff of the changed fields.

**`AuditAction` is a Prisma enum**, so each phase's actions must be added to it
by migration (§3.8) before any code references them. Phase 1:
`MEMBERSHIP_PLAN_CREATED` / `_UPDATED` / `_DEACTIVATED`,
`MEMBERSHIP_LEVEL_CREATED` / `_UPDATED` / `_DELETED`,
`MEMBERSHIP_BENEFIT_CREATED` / `_UPDATED` / `_DELETED`. Later phases add their
own (enrollment lifecycle, import commit, allowance adjust, report access).

---

## 5. Enrollment lifecycle

### 5.1 States

```
           import / manual add
                   │
                   ▼
               PENDING ──── login or signup with matching email ────► ACTIVE
                   │                                                    │
                   │                                    admin suspend ──┤
                   │                                                    ▼
                   │                                                SUSPENDED
                   │                                                    │
                   │                                    admin reactivate┘
                   │
                   └──── endDate passes (cron or live check) ─────► EXPIRED
                   
   any state ── admin remove ──► REMOVED  (soft; re-import of same email revives)
```

Only `ACTIVE` grants benefits, and only while
`startDate <= now AND (endDate IS NULL OR endDate >= now)`.

### 5.2 Linking (`membership-linking.service.ts`)

**Linking requires a verified email.** An email match alone proves nothing —
anyone can register an account with someone else's address and would otherwise
walk away with that person's membership, card and allowance. The gate is
`User.emailVerifiedAt IS NOT NULL` (the existing verification-token flow sets
it — `auth.service.ts` `consumeEmailVerificationToken`).

Called from three places:

1. **Email verification** — the primary trigger: the moment
   `emailVerifiedAt` is set, run the linker for that user.
2. **Signup** — only when the created account is already verified by
   construction (e.g. invite-token flows that flip `emailVerifiedAt`).
3. **Login** — one lookup on every successful login **of a verified user**. This
   is the backstop for enrollments imported *after* the user verified. No cache:
   it is a single `findMany` on an indexed `email` column, once per successful
   login, which is not a hot path.

Every place that sets `emailVerifiedAt` must call the linker, not just the
signup/verify pair — currently `auth.service.ts` (`consumeEmailVerificationToken`,
invite-token reset), `corporate-invite.service.ts`, and the admin patient-profile
route. A member verified through any other path would otherwise never link.

Logic:

```
require user.emailVerifiedAt != null          // else do nothing
findMany MembershipEnrollment where
  email == lower(user.email)
  AND userId IS NULL
  AND status == PENDING
→ for each: set userId, linkedAt
            status = (endDate != null && endDate < now) ? EXPIRED : ACTIVE
→ send the "enrollment confirmed" email once per enrollment
```

**A future `startDate` links as `ACTIVE`, not `EXPIRED`.** Only a passed
`endDate` expires a row. `EXPIRED` is terminal — nothing walks it back — so
treating "term has not started yet" as expired would permanently kill a
correctly-imported future membership. The benefit itself is still withheld,
because pricing re-checks `startDate <= now` live (§5.1/§6.2); the member page
shows "starts on <date>" for that window.

The linker is idempotent by its own query: once `userId` is set the row is no
longer returned, so neither the link nor the email can repeat.

A dependent links the same way, with its own email. Tests must cover: an
unverified account never links on signup or login; verification links
already-imported enrollments; an import that lands after verification links on
next login.

### 5.3 Claim form (§7)

`POST /api/me/memberships/claim { membershipId, email }`:

- rate-limited per user and per IP (5/hour), because it is a lookup by a
  partner-supplied, potentially sequential id;
- the session user's email must be verified (`emailVerifiedAt` set) — same
  gate as §5.2, same reason;
- both fields must match the **same** enrollment row (membership id compared
  via `lower()`), which must have `userId IS NULL`;
- on success: link to the session user, `claimedAt = now`, status → `ACTIVE`, audit row;
- on failure: one generic message ("we could not find a membership matching those
  details"), never revealing which field was wrong.

### 5.4 Expiry job

`membership-expiry.job.ts`, wired into the existing internal scheduler
(`src/lib/internal-scheduler.ts`), daily:

- `ACTIVE` rows with `endDate < today` → `EXPIRED`;
- dependents follow their primary.

The cron is a convenience only. **Pricing always re-checks the dates live**, so a
missed run cannot leak a benefit.

---

## 6. Pricing and benefit resolution

### 6.1 Where it runs

Three call sites, one implementation:

1. `GET /api/me/benefit-options` — the booking step's list.
2. `PUT /api/me/cart/benefit` + cart preview — keeps displayed totals honest.
3. Checkout in `orders.route.ts` — **authoritative**. Everything is recomputed here;
   client input is display-only.

### 6.2 Resolving a membership price for one line

```
input: enrollment, service, doctor, timeSlot
1. enrollment.status == ACTIVE and within term          → else no benefit
2. service.countryId == enrollment.countryId            → else no benefit  (assumption 2)
3. service.kind ∈ { GENERAL, SPECIALIST }               → else no benefit  (§18)
4. benefit row = MembershipBenefit for enrollment.levelId where
        serviceId == service.id                          (wins)
     else serviceKind == service.kind
   none found, or benefitType == EXCLUDED               → no benefit
5. peakPrice = computeSlotPrice(...)   // existing peak-pricing service
6. by benefitType:
     PERCENT → round(peakPrice * (100 - percentOff) / 100)          (§29)
     FIXED   → fixedPriceCents                                       (overrides peak)
     ALLOWANCE →
        remaining = balance.allocated - balance.used
        remaining > 0 → 0, and flag allowanceUsed
        remaining == 0 → apply fallbackType:
             PERCENT → round(peakPrice * (100 - fallbackPercent)/100)
             FIXED   → fallbackFixedCents
             NONE    → peakPrice (no benefit)
```

Rounding: `Math.round`, half-up, to whole cents — same as the corporate engine, so
member and corporate discounts round identically.

### 6.3 Cross-source options list

`benefit-options.service.ts` builds, for a given service + slot:

| Source | How the price comes out |
| --- | --- |
| `MEMBERSHIP` | one option **per active enrollment** (§19), priced by §6.2 |
| `CORPORATE` | existing `resolveCorporateDiscountsForItems` on a single synthetic line |
| `PUBLIC_PLAN` | existing `previewConsultationPricing` (credit or discount) |
| `INSURANCE` | one option per insurer covering the service, via `loadValidatedInsurancePrice` |

Each option carries `{ source, refId, label, unitPriceCents, allowanceRemaining?, note, badge }`.

- Sorted ascending by `unitPriceCents`. Ties broken by a stable source order
  (`MEMBERSHIP`, `CORPORATE`, `PUBLIC_PLAN`, `INSURANCE`) then by label.
- `recommended: true` on the cheapest (§13/§14). The UI pre-selects it.
- Allowance options carry `note: "uses 1 of your N remaining"` (§14).
- Insurance options carry `note` explaining the deferred-charge lifecycle (§33).

### 6.4 Checkout composition (`orders.route.ts`)

The existing chain is: insurance price → subscription engine → corporate engine.
It becomes a single switch on `cart.benefitSource`:

```
NONE      → no engine runs. Full (peak) price on every line.
              Corporate's automatic discount is SUPPRESSED here — this is the
              only behavioural change to an existing engine.
UNSET     → resolve the patient's eligible sources server-side:
              none eligible → treat as NONE and proceed (guest, no insurers,
                              no memberships — the benefit step never ran, and
                              there was nothing to choose anyway)
              some eligible → reject checkout with "benefit step not completed",
                              so the patient never pays a price they were not shown.
            This runtime rule — not the backfill — is what guarantees no cart
            can be bricked by reaching checkout without passing the step
            (cart created before the Phase 5 deploy, added from a surface that
            skips the wizard, or a missed backfill).
MEMBERSHIP→ membership engine only. Subscription and corporate engines skipped.
CORPORATE → existing corporate engine only.
PUBLIC_PLAN → existing subscription engine only.
INSURANCE → existing insurance path, unchanged (alone-in-cart, no Stripe charge,
              admin verification) — §33.
```

This preserves "no stacking" structurally: exactly one engine can run per order.

Per-line, when `MEMBERSHIP`:

1. re-resolve §6.2 for the line's service/slot from the DB (never trust the cart's
   snapshot price);
2. if the resolved enrollment is not the cart's `membershipEnrollmentId`, or the
   enrollment does not belong to the session user (or a dependent whose primary is
   the session user), fail the checkout with a 400 — never silently downgrade;
3. spend allowance units in cart order (§25): the first N eligible lines get the
   remaining units, later lines fall to the fallback or full price;
4. write `membershipEnrollmentId`, `membershipBenefitId`, `membershipDiscountCents`,
   `membershipAllowanceUsed` onto each `OrderItem`.

All of it inside the existing checkout transaction.

### 6.5 Zero-total orders (§31)

If the recomputed order total is `0`:

- skip the Stripe session entirely (Stripe rejects zero-amount sessions anyway);
- mark the order paid/confirmed inline, in the same transaction;
- mint the appointment by calling the existing shared completion path,
  `completeOrderPayment` (`modules/orders/complete-order-payment.service.ts`) —
  the same function the Stripe webhook, manual booking and corporate invoice
  flows already call. One appointment-creation implementation, not two;
- send the normal order-confirmation email;
- the allowance ledger rows are written in that same transaction.

Precedent: the insurance path already creates orders that skip the Stripe charge
at checkout, so "order without immediate payment" is a known shape.

### 6.6 Doctor payout (§30)

**Verified in code — nothing to build for decision 30.** The payout is
`ServiceDoctor.doctorAmountCents`, a fixed per-unit amount independent of the
price charged, so the doctor is automatically paid the same for a membership
line as for a full-price one.

**Commission-model trap (Brazil-type markets).** `computeOrderCommission`
(`commission.service.ts`) enforces `commission = lineTotal − payout`; a membership
line priced below the payout (any allowance €0 line, and many discounted ones)
produces a negative commission, which the service clamps to 0 **and fires a
critical ops alert per line** ("Doctor payout exceeds the price charged").
Ireland has `commissionReceiptEnabled = false`, so launch is unaffected — but:

- the API must **reject creating a `MembershipPlan` in a country with
  `commissionReceiptEnabled = true`** until the commission interaction is
  designed (alert suppression + how a €0 line appears on the fiscal receipt);
- a test pins that rejection.

---

## 7. Allowance accounting

`membership-allowance.service.ts`.

```ts
resolveHolder(enrollment, level)
  → level.allowancePool === "SHARED" && enrollment.memberType === "DEPENDENT"
      ? enrollment.primaryEnrollmentId
      : enrollment.id

getOrCreateBalance(tx, benefit, holderEnrollment)
  → upsert on (benefitId, holderEnrollmentId, termStart = holder.startDate)
    with allocated = benefit.allowanceCount

spend(tx, { balance, enrollment, orderItemId, orderId })
  → 1. INSERT ledger { delta: -1, reason: SPEND,
                       idempotencyKey: `${orderItemId}:SPEND` }
       ON CONFLICT (idempotencyKey) DO NOTHING
       0 rows inserted → this spend already happened (retry) → return "spent", touch nothing
    2. conditional update:  used = used + 1  WHERE id = ? AND used < allocated
       0 rows affected → no unit available: DELETE the ledger row just inserted
                         (same tx) and return "unavailable"; caller falls back (§6.2)
       1 row affected  → return "spent"

refund(tx, { orderItemId })
  → 1. INSERT ledger { delta: +1, reason: REFUND,
                       idempotencyKey: `${orderItemId}:REFUND` }
       ON CONFLICT DO NOTHING
       0 rows inserted → already refunded → no-op
    2. require a SPEND row for orderItemId exists (else delete the REFUND row, no-op)
    3. used = used - 1  (floored at 0)
```

Ordering matters: **the ledger insert is the idempotency gate**, and the counter
moves only when the insert actually created a row. (Increment-first would make a
retried request hit the unique key *after* touching the counter — an error path,
not a no-op, and a chance for the two to diverge.) Both statements share one
transaction; the conditional `WHERE used < allocated` is what makes concurrent
checkouts safe without a table lock.

**The Stripe boundary.** The checkout commits its order transaction *before*
calling Stripe, so the allowance is spent while the order is still unpaid. Every
path where the payment never materialises must release the unit:

- **Session-creation failure** (Stripe error, missing config, network): the
  catch block around the Stripe call runs `refund` for the order's membership
  lines immediately — a compensating write, since the spend's transaction has
  already committed;
- **abandoned/never-paid orders**: the existing pre-payment cancel cron
  (`pre-payment-flow.service.ts`, stage-3 cancel) and the abandoned-order
  cleanup in `payments.route.ts` both call `refund` when they cancel — the
  same places that release reserved subscription credits today;
- **reconciliation backstop**: a check in the membership expiry job flags any
  SPEND ledger row whose order is CANCELLED with no matching REFUND row.

The `${orderItemId}:REFUND` idempotency key makes it harmless when two of these
paths race.

**Other refund call sites** (paid orders that later cancel):

- order cancellation / refund in the admin order flow;
- appointment cancellation paths (`admin-appointments.route.ts`,
  `doctor-actions.route.ts`, patient-initiated cancellation).

A no-show does **not** refund (§16). Verified: `AppointmentStatus` has no
`NO_SHOW` value (`REQUEST_RECEIVED / UNDER_REVIEW / CONTACTED / CANCELLED /
COMPLETED`), and the refund helper is wired to cancellation paths only — so a
no-show (which never passes through `CANCELLED`) keeps the unit spent
automatically. No status check needed.

**Admin adjust.** `POST /allowance-adjust` (SUPER_ADMIN, reason mandatory) writes a
`ADMIN_ADJUST` ledger row with `actorAdminId` and adjusts `used`. Used for goodwill
and for correcting a bad import.

---

## 8. CSV import

### 8.1 Columns

Required: `membershipId`, `email`, `firstName`, `lastName`
Optional: `level`, `phone`, `dateOfBirth`, `startDate`, `endDate`, `notes`
Dependent rows: `primaryMembershipId`, `relationship`

A row with `primaryMembershipId` set is a dependent; its `level`, `startDate` and
`endDate` are ignored and inherited from the primary.

### 8.2 Preview → commit (§22)

1. `POST /api/admin/membership-imports` (multipart, plan id in the body).
2. Server parses, validates every row, and stores the outcome in
   `MembershipImportBatch.previewData` with `status = PREVIEW`. **Nothing is written
   to `MembershipEnrollment` yet.**
3. The response drives the preview table: per row an outcome of
   `CREATE` / `REVIVE` (a `REMOVED` row for this email exists) /
   `LINK` / `REJECT` with a reason.

   **`LINK` requires a *verified* account.** An existing account whose
   `emailVerifiedAt` is null imports as `PENDING` like any other row and links
   on verification. Linking an unverified account here would be a hole straight
   through the gate §5.2 exists to build — the import is exactly the path an
   attacker would use, since they choose the email.

   **`REVIVE` precedence.** Matching is within the plan, on `lower(email)`,
   against the **most recent** `REMOVED` row (the partial unique index permits
   several). Revive is an update, not just a status flip: the CSV's
   `membershipId`, names, level and term overwrite the old row's, and the status
   becomes `PENDING` (or `ACTIVE` if the account is already verified). This
   matters because a returning member usually comes back with a *new* partner
   membership id, and the old id must stop being theirs.

   Independently of that: reject the row when its `membershipId` is already held
   by **any other** enrollment, `REMOVED` or not — `lower(membershipId)` is
   globally unique with no status exclusion (§3.8), so a removed row still owns
   its id until something overwrites it.
4. `POST /.../commit` first **claims the batch atomically**:
   `UPDATE MembershipImportBatch SET status = 'COMMITTED', committedAt = now()
   WHERE id = ? AND status = 'PREVIEW'` — 0 rows means another request (a
   double-click, a retry, or a racing cancel) got there first; respond with the
   batch's current state instead of applying anything. Only the request that won
   the claim re-reads `previewData` server-side and applies it, in the same
   transaction as the claim, so a mid-apply failure rolls the status back to
   `PREVIEW` too.
5. `POST /.../cancel` uses the same guard:
   `... SET status = 'CANCELLED' WHERE id = ? AND status = 'PREVIEW'` — it can
   never cancel a batch that a concurrent commit already claimed. Both endpoints
   are idempotent: repeating a terminal transition returns the existing result.

Commit applies **primary rows before dependent rows**, since a dependent's
primary may be created by the same file.

A batch older than 24 hours in `PREVIEW` is re-validated on commit (services,
levels and emails may have changed underneath).

### 8.3 Rejection reasons

- malformed or missing email;
- `membershipId` already used by a different enrollment (global uniqueness);
- duplicate `membershipId` or `email` **within the same file**;
- email already enrolled in this plan and not `REMOVED`;
- `primaryMembershipId` not found in this plan or in the same file;
- dependent when the target level has `familyEnabled = false`, or over
  `maxDependents` — counted as **existing enrollments plus rows in this file**,
  not file rows alone;
- `endDate` before `startDate`;
- unknown `level` slug.

### 8.4 Size

Synchronous, capped at **2,000 rows** per file (§28). Above the cap the API returns a
clear error asking the admin to split the file. Revisit with a background job only if
a partner actually needs more.

---

## 9. Admin portal

New section at `frontend/app/(portal)/(admin)/admin/memberships/`.

**Nav placement** (`admin/_components/admin-shell.tsx`): membership plans are
per-country (decision 9), so the entry goes in `COUNTRY_HREFS` with
`ORDER["/admin/memberships"] = 7.5` — beside country-scoped **Plans**, not
global **Corporate**. Deliberately **no** `HREF_TO_FEATURE_KEY` entry: that map
hides an item unless the country's `enabledFeatures` contains the key, and no
existing country's array can contain a key that did not exist when it was
written, so an entry would hide the section everywhere.

```
memberships/
  page.tsx                          # plan list
  new/page.tsx                      # create plan
  [planId]/
    page.tsx                        # plan overview: levels, payer, translations
    levels/[levelId]/page.tsx       # level editor: benefits table + family + translations
    members/page.tsx                # enrollment list (search, status filter, bulk actions)
    members/[enrollmentId]/page.tsx # member detail: card, allowance, dependents, usage
    import/page.tsx                 # CSV upload + preview + commit
    usage/page.tsx                  # per-plan usage report
  _components/
    membership-plan-form.tsx
    membership-level-form.tsx
    membership-benefit-table.tsx
    membership-member-table.tsx     # ColumnPriorityTable config
    membership-import-preview.tsx
    membership-usage-report.tsx
```

Rules from `CLAUDE.md` that apply:

- **List/table pages use a `ColumnPriorityTable` config** (`ResponsiveField`
  priority 1–4 + drawer flag). Never hand-write twin table + card markup.
- **Dropdowns / dialogs / drawers use `AppMenu`, `PortalDialog`,
  `AppSheet` / `RecordDetailsDrawer`.** Nothing hand-rolled.
- **All portal-only CSS goes in `frontend/app/portal.css`**, not `globals.css`.
  Any new glass/backdrop class must also be added to that file's
  `@media (pointer: coarse)` and `@supports not (backdrop-filter)` fallback blocks.
- **Form actions (Save / Done / Publish) are right-aligned** on every portal form.

### 9.1 Level editor — the benefit table

One row per benefit, columns:

| Target | Type | Value | Allowance | Fallback | Active |
| --- | --- | --- | --- | --- | --- |
| `GENERAL` (kind) | Allowance | — | 4 | 20% off | ✓ |
| `SPECIALIST` (kind) | Percent | 20% | — | — | ✓ |
| Cardiology (service) | Fixed | €45 | — | — | ✓ |

Adding a row: pick **Service kind** or **Specific service** (the service picker is
scoped to the plan's country and to `GENERAL`/`SPECIALIST` services), then a type,
then the type's fields. A live preview line shows "a €60 evening slot costs the
member €48" so the peak interaction from §29 is visible while configuring.

### 9.2 Member list

`ColumnPriorityTable` columns: name (p1), membership id (p1), email (p2),
level (p2), status (p1), allowance remaining (p3), term (p3), linked account (p4).
Row actions in an `AppMenu`: view, suspend, reactivate, remove, send invite.
Bulk actions: suspend, remove, send invite.

### 9.3 Member detail

Card preview, term, allowance per benefit with a progress bar, dependents list,
usage table (date, service, doctor, price paid, benefit applied), and the admin
actions. The usage table is **booking metadata only** — no clinical content — and
opening it writes an audit row (§32).

---

## 10. Member portal

`frontend/app/(portal)/(auth)/account/membership/`:

- `page.tsx` — list of the member's memberships (usually one).
- `[enrollmentId]/page.tsx` — plan and level name (translated), membership id,
  status, term dates, allowance remaining per benefit, the benefit list in plain
  language ("20% off specialist consultations"), dependents, and the digital card.
- `claim/page.tsx` — the "my membership isn't listed" form (§7).

The **digital card** is rendered from the enrollment — there is no card table.
It shows name, membership id, plan + level, status and validity, is printable, and
is styled with the portal's existing `lux-*` system. **No public verification URL**
(§20); verification is `GET /api/admin/membership-verify` behind an admin/staff
session, surfaced as a small lookup box in the admin members area.

Dependents: when the level has `familyEnabled` and `maxDependents > 0`, the member
can add dependents up to the cap, and remove ones they added. Each dependent gets a
generated membership id and its own `PENDING` enrollment that links when that person
logs in.

---

## 11. Booking flow

### 11.1 Today

`frontend/app/[country]/[lang]/book/page.tsx` is a URL-param wizard:
`service → (insurance) → doctor/time → details`. The insurance step exists only when
`selectedService.insuranceOptions.length > 0`, and step numbers shift by one when it
does (`insuranceOffset`). The chosen insurer rides in `?insurance=<companyId|none>`
and reaches `consultation-booking-form.tsx` as `selectedInsurance`.

### 11.2 Target

The insurance step becomes the **benefit step**, in the same position (before time
selection, because a fixed member price and an insurance price both change what each
slot costs).

**When the step appears:**

```
showBenefitStep =
     insuranceOptions.length > 0
  || (loggedIn && eligibleBenefitSourceCount > 0)
```

A guest booking a service with no insurance options sees exactly the flow they see
today — no extra click. `eligibleBenefitSourceCount` comes from a small server-side
call on the `/book` page render.

**URL param:** `?benefit=<source>:<refId>`, e.g. `benefit=membership:enr_123`,
`benefit=insurance:cmp_9`, `benefit=corporate`, `benefit=plan`, `benefit=none`.
The legacy `?insurance=` param is still accepted and mapped
(`insurance=X` → `benefit=insurance:X`, `insurance=none` → `benefit=none`) so live
links and any indexed URLs keep working.

**Step UI:**

1. Toggle: *"I have a membership, insurance or plan"*. Off → `benefit=none`, full price.
2. On → the options list from `GET /api/me/benefit-options`, each showing its label
   and its resulting price for this service, cheapest first, cheapest pre-selected
   (§13/§14).
3. Allowance options show "uses 1 of your N remaining".
4. Insurance options show the deferred-charge notice (§33) and, once picked, the
   existing policy-number field.
5. Guests see "Log in to use a membership, plan or corporate benefit" with a login
   link that returns to the same step, plus the insurance options (which do not
   require an account today).

**Selection is persisted** to the cart via `PUT /api/me/cart/benefit` when the
patient continues, so the cart, the preview and the checkout all agree.

### 11.3 Downstream behaviour by source

| Source | Cart rule | Payment |
| --- | --- | --- |
| `NONE` | normal | Stripe, full price |
| `MEMBERSHIP` | normal, multi-line allowed | Stripe, or skipped when total is €0 |
| `CORPORATE` | normal | Stripe |
| `PUBLIC_PLAN` | normal | Stripe (existing credit rules) |
| `INSURANCE` | **alone in cart** (existing rule) | **no charge at checkout**; admin verifies, then charges |

### 11.4 Files touched

- `frontend/app/[country]/[lang]/book/page.tsx` — step computation, param mapping,
  benefit step render.
- `frontend/app/[country]/[lang]/book/_components/` — new `benefit-step.tsx`
  (replaces the insurance-only step component), plus the options list.
- `frontend/app/[country]/[lang]/consult/[serviceSlug]/_components/consultation-booking-form.tsx`
  — the details step reads the resolved benefit instead of only `selectedInsurance`;
  the price summary line explains which benefit applied.
- `frontend/lib/content/get-country-collections.ts` — extend the option type used by
  the step (currently `InsuranceOption`) into a general `BenefitOption`.
- `backend/src/routes/cart.route.ts` — accept and validate the cart-level benefit;
  keep the existing per-line insurance handling untouched.
- `backend/src/routes/orders.route.ts` — the §6.4 switch.
- `backend/src/routes/me-cart-preview.route.ts` — include membership lines.

### 11.5 Admin manual booking (§26)

`frontend/app/(portal)/(admin)/admin/appointments/new/` +
`backend/src/modules/appointments/manual-booking.service.ts`:

- after the patient is chosen, load that patient's benefit options with the same
  service and show the same list;
- allowance spend, ledger and order-line audit columns behave identically;
- a `SUPER_ADMIN`-only **override** lets an admin apply a benefit the patient does
  not hold. It requires a written reason, writes an `AuditLog` row, and stamps the
  order line so reporting can separate real usage from goodwill.

---

## 12. Emails (§27)

Three templates, all through the existing `wrapHtml` Clinical Editorial shell, all
translated for Ireland's configured locales with English fallback:

1. **Enrollment confirmed** — sent once, when an enrollment links to an account.
   Contains plan + level, membership id, term, what the benefits are, and a link to
   the membership page.
2. **Manual invite** — admin-triggered (single or bulk). "You've been enrolled in
   *plan*. Register or log in with *this email* to see your benefits." No token: the
   link is the ordinary signup/login URL, because linking is by email.
   Result logged to `MembershipInviteLog`.
3. **Allowance exhausted** — sent when a spend takes remaining to `0`. Explains what
   applies from now on (the fallback discount, or full price).

**Locale resolution.** A `PENDING` enrollment has no `User`, so there is no
`preferredLocale` to read: the **invite** email uses the plan's country
`defaultLocale`, English fallback. The **enrollment-confirmed** and
**allowance-exhausted** emails go to a linked account, so they use
`User.preferredLocale`, falling back to the country default then English.

Send through the existing outbox/`sendEmail` path so retries and the capture hook
behave as they do elsewhere. No expiry-warning email.

---

## 13. Validation

### 13.1 Zod schemas

New `backend/src/validations/`:
`admin-membership-plans.schema.ts`, `admin-membership-enrollments.schema.ts`,
`admin-membership-import.schema.ts`, `me-membership.schema.ts`,
`me-benefit-options.schema.ts`.

Notable rules:

- `slug`: `/^[a-z0-9-]+$/`, 2–60 chars.
- `membershipId`: trimmed, 3–64 chars, printable ASCII; stored verbatim, compared
  case-insensitively.
- `email`: parsed, then lowercased and trimmed before any DB use.
- `percentOff` / `fallbackPercent`: `> 0 && <= 100`.
- `fixedPriceCents` / `fallbackFixedCents`: integer `>= 0`.
- `allowanceCount`: integer `1..999`.
- `maxDependents`: integer `0..20`; `> 0` requires `familyEnabled`.
- `endDate > startDate` when both present.
- benefit target: exactly one of `serviceKind` / `serviceId`; `serviceKind` limited
  to `GENERAL` | `SPECIALIST`.

### 13.2 Server-side re-validation at checkout

Non-negotiable (assumption 3). At checkout, for every line:

- the enrollment is re-loaded from the DB and must belong to the session user, or be
  a dependent whose primary is the session user;
- status, term dates, plan country and service kind are re-checked;
- the benefit row is re-resolved and the price recomputed;
- the allowance is spent with the conditional update, not a read-then-write.

A mismatch between what the client sent and what the server resolves is a `400`, not
a silent downgrade — a silent downgrade would charge a different price than the one
displayed.

---

## 14. Security

| Risk | Mitigation |
| --- | --- |
| Register with someone else's email → steal their membership | Linking (auto and claim) requires `emailVerifiedAt` — proof of mailbox control, not just a matching string (§5.2) |
| Guessable partner membership ids | Benefits require login (§6). The claim form needs id **and** the enrolled email, is rate-limited, and returns a single generic failure message |
| Membership enumeration via the claim form | Generic errors, per-user and per-IP rate limits, audit row on every attempt |
| Member list exposure | No public verification URL (§20). Staff lookup sits behind an admin session |
| Forged enrollment/level/benefit ids in cart or checkout | Everything re-resolved server-side; ownership re-checked; failure = full price or `400`, never cheaper |
| Allowance double-spend (double-click, retried webhook) | Conditional `used < allocated` update + unique `idempotencyKey` on the ledger |
| Cross-country benefit leakage | Composite FKs pin level/benefit/enrollment to the plan's country; the resolver re-checks `service.countryId` |
| Privilege creep | `LOCAL_ADMIN` denied outright; config writes need a real admin session (never the master token); the allowance override stays `SUPER_ADMIN` |
| PHI adjacency in usage reports | Reports carry booking metadata only (date, service, doctor, price, benefit). No clinical content. Access is audit-logged (§32) |
| Import as a bulk-write weapon | Preview-then-commit, server-side `previewData`, 2,000-row cap, full audit row with file name and counts |
| Goodwill override abuse | `SUPER_ADMIN` only, mandatory reason, audit row, separated in reporting |

Repo-specific gates that must pass:

- `.semgrep/rules/` — the five repo authorization rules. New admin routes must use
  the guard helpers, not ad-hoc role checks. Run custom rules **per-file, never as
  one multi-file batch** (see the security runbook).
- **`gh-admin-route-missing-auth-hook` must be extended, not suppressed.** The
  rule recognises exactly four gates (`verifyAdminAccess`,
  `verifyGlobalAdminAccess`, `requireManageSubscriptions`,
  `dependencies.verifyAdminAccess`), so every new membership route would fire it.
  Add a `pattern-not-inside` arm for `requireManageMemberships` and extend
  `.semgrep/tests/gh-admin-route-missing-auth-hook.ts` with a passing and a
  failing fixture. A `nosemgrep` here would blind the rule to genuinely
  unguarded membership routes — the exact thing it exists to catch.
- `backend/src/routes/authz-matrix.test.ts` — add every new endpoint with its
  expected allow/deny per role.
- Playwright `e2e-authz` — add a membership admin route and a member route.
- Any suppression is `// nosemgrep: <rule-id> -- <specific reason>` on the line
  immediately before Semgrep's reported line.

---

## 15. Reporting (§32)

**Per-plan usage** (`/admin/memberships/[planId]/usage`):

- members by status (pending / active / suspended / expired / removed);
- consultations booked in the date range, split by benefit type;
- allowance units used vs allocated across the plan;
- total discount given, in cents;
- CSV export.

**Per-member drill-down** (`/admin/memberships/[planId]/members/[id]`):

- each booking: date, service, doctor, list price, price paid, benefit applied,
  allowance unit consumed y/n, order number;
- **no clinical content**;
- viewing writes an `AuditLog` row (actor, enrollment id, timestamp).

Both read the ledger joined to `OrderItem` — no separate aggregation table.

---

## 16. Testing

### 16.1 Unit (node:test, alongside the services)

- `membership-pricing.service.test.ts` — every benefit type × peak on/off; percent
  applies to the peak price; fixed overrides peak; excluded row beats a kind rule;
  service row beats kind row; wrong country → no benefit; wrong service kind → no
  benefit; expired / suspended / pending → no benefit.
- `membership-allowance.service.test.ts` — spend decrements; spend at zero returns
  "unavailable" and falls back; refund restores; double refund is a no-op; **a
  retried spend with the same `idempotencyKey` is a clean no-op, not a unique-key
  error, and moves the counter exactly once**; refund without a prior spend is a
  no-op; concurrent spends cannot exceed `allocated`; Stripe-failure compensating
  release restores the unit.
- `membership-import.service.test.ts` — every rejection reason from §8.3; preview
  writes nothing; commit is transactional; a `REMOVED` row is revived, not
  duplicated; **two concurrent commits apply once; commit racing cancel — exactly
  one wins; repeated terminal calls return the existing result**; membership ids
  differing only in case are rejected as duplicates.
- `membership-linking.service.test.ts` — `PENDING` links on login; **an
  unverified account never links (signup or login); verification triggers the
  link; an import landing after verification links on next login**; case and
  whitespace in emails; a linked enrollment is not re-linked; expired term links as
  `EXPIRED`.
- `benefit-options.service.test.ts` — ordering, cheapest gets `recommended`, ties
  broken deterministically, allowance option labelled, guests get nothing.

### 16.2 Integration

- `admin-membership-plans.route.test.ts` — the auth matrix (401 / 403 / 200) for
  `MANAGE_MEMBERSHIPS` and the config split (ADMIN allowed, master token not);
  validation errors.
- `admin-membership-enrollments.route.test.ts` — suspend, remove, revive,
  dependents over the cap, allowance adjust requires `SUPER_ADMIN` + reason.
- `orders.route.membership.test.ts` — the §6.4 switch: exactly one engine runs;
  `NONE` suppresses the corporate auto-discount; a forged enrollment id is rejected;
  partial allowance across two lines; €0 order skips Stripe and still mints the
  appointment and sends the email.
- `me-membership.route.test.ts` — claim form success and failure, rate limit,
  generic error message, no enumeration.
- `authz-matrix.test.ts` — extended with every new endpoint.

### 16.3 E2E (Playwright)

- Member logs in, books a consultation, allowance applies, price is €0, order
  confirms without a Stripe redirect, allowance drops by one on the membership page.
- Member with an exhausted allowance gets the fallback discount, and the price shown
  on the benefit step equals the price charged.
- Guest books the same service and pays full price; the benefit step shows the login
  prompt.
- Admin imports a CSV, sees the preview counts, commits, and the member appears.
- `e2e-authz`: a non-admin cannot reach the membership admin routes; a member cannot
  read another member's enrollment.

### 16.4 Gates before "done"

- `pnpm --filter backend exec tsc --noEmit` and the same for `frontend`
  (**not** root `pnpm typecheck` — it fails on pre-existing locale drift).
- Backend test suite green.
- Semgrep custom rules, run per-file.
- A browser pass over the booking benefit step and the admin level editor, with
  screenshots.

---

## 17. Rollout

| Phase | Contents | Ships behind |
| --- | --- | --- |
| 1 | Membership tables migration (+ `AuditAction` values, Semgrep rule extension), `memberships` module, admin plan/level/benefit CRUD + those admin screens, translations | admin-only, no patient impact |
| 2 | Enrollment CRUD, verified-email linking, CSV import, invite email, **enrollment-confirmed email** (it is the linker's own side effect — §5.2 — so it ships with the linker, not in Phase 3) | admin-only |
| 3 | Member portal page + card, claim form | member-visible; still no pricing effect |
| 4 | Pricing resolver, benefit-options endpoint, **second migration**: `Cart` / `OrderItem` columns + `CartBenefitSource` | API only, not wired into the UI |
| 5 | Booking benefit step (replaces the insurance step), checkout switch, €0 path, allowance ledger, allowance-exhausted email, **`UNSET → NONE` cart backfill at deploy** | **the behavioural change** — corporate's silent discount becomes selection-driven |
| 6 | Admin manual booking + override, usage reporting, expiry cron | — |

Phase 5 is the one that changes an existing flow for existing users. Ship it with a
quick manual pass over: a corporate member booking (must still get their discount via
pre-selection), an insurance booking (must still be alone-in-cart and uncharged), and
a public-plan credit booking.

---

## 18. Open items

1. Ireland's exact locale set for the plan/level translations and the three emails —
   read from `CountryLocale` for `ie` at implementation time.
2. Commission-model markets (§6.6): membership plans are blocked in
   `commissionReceiptEnabled` countries for now. Design the commission interaction
   (alert handling + fiscal receipt for €0/discounted lines) before Brazil gets
   memberships.

Resolved during code review (2026-08-07):

- Doctor payout is a fixed per-unit `ServiceDoctor.doctorAmountCents`, price-independent —
  decision 30 needs no code (§6.6).
- No `NO_SHOW` appointment status exists; refund-on-cancel-only already implements
  "no-show keeps the unit" (§7).
- Shared order-completion path is `completeOrderPayment` — the €0 branch calls it (§6.5).
- `Service` carries `@@unique([id, countryId])`, so the §3.8 composite FKs are valid.
