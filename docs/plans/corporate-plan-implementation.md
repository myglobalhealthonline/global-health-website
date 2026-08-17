# Corporate Plan (Private B2B) — Implementation Plan

> **Built and remediated. Sections 0–9 below are the ORIGINAL 2026-07-05 plan
> and are kept as the design record — where they disagree with §10, §10 wins.**
> Read [§10 Post-build conformance](#10-post-build-conformance-2026-08-14) for
> what actually shipped, which spec lines were interpreted differently, and
> what is still open.

> Status: APPROVED FOR EXECUTION · Branch: `Dev-hassaan` · Date: 2026-07-05
> Source of truth for business rules: user brief 2026-07-05 ("latest rule wins"):
> **Corporate Standard · €180/employee/year · 10% GP discount (configurable) · max 5 beneficiaries/employee · corporate-only consultations hidden from public.**

This document is execution-grade: every model, route, guard, status transition,
integration point, and file path is specified against the *actual* codebase
(verified 2026-07-05 by three codebase-mapping passes).

---

## 0. Verified codebase facts this plan builds on

| Fact | Where |
|---|---|
| Fastify backend, Prisma/Postgres, `backend/prisma/schema.prisma` (3595 lines) | backend/ |
| `UserRole` enum: `PATIENT, ADMIN, DOCTOR, LOCAL_ADMIN, SUPER_ADMIN` | schema.prisma:43 |
| Auth: JWT cookie, `requireAuth` sets `request.authUser {sub, role, email}` | backend/src/utils/require-auth.ts:36 |
| Admin gate: `verifyAdminAccess` allows ADMIN/SUPER_ADMIN/LOCAL_ADMIN | backend/src/utils/admin-auth.ts:6 |
| `Service` model: `kind (GENERAL/SPECIALIST/PRESCRIPTION/HEALTH_TEST/HOME_DELIVERY)`, `isActive`, `slug`, `countryId`, `basePriceCents` — **no visibility field yet** | schema.prisma:759 |
| Public service listing filters only `isActive: true` | backend/src/modules/services/services.service.ts:228–288 |
| Checkout server-side pricing: `reserveAndPriceConsultations()` inside Order tx | backend/src/modules/subscriptions/checkout-pricing.service.ts:106–219 |
| Cart preview (dry-run same resolver): `previewConsultationPricing()` | checkout-pricing.service.ts:266–340; route me-cart-preview.route.ts |
| Single-service benefit preview: `previewServiceBenefit()` | checkout-pricing.service.ts:342+; route me-benefit-preview.route.ts |
| Subscription discount resolver (PERCENT round-half-up) | backend/src/modules/subscriptions/pricing-resolver.ts:102–167 |
| Invite-token precedent: `PasswordResetToken.isInvite` (7-day TTL, auto-login on consume; used for doctor invites) | schema.prisma:2142–2160 |
| Email: Gmail API preferred + SendGrid fallback, `wrapHtml()` templates | backend/src/lib/email/send-email.ts, templates.ts |
| WhatsApp: LIVE WaSender integration `sendWhatsAppText({to, message})`, E.164 normalize, 6s gap, retries | backend/src/lib/whatsapp/wasender.ts |
| In-app `Notification` model + `NotificationType` enum (22 values, extensible via migration) | schema.prisma:2569, :94 |
| Appointment: `serviceId`, `doctorId`, `timeSlotId`, `paymentStatus`, `AppointmentStatus (REQUEST_RECEIVED…COMPLETED)` | schema.prisma:1316–1479 |
| CartItem: `kind`, `serviceId`, `timeSlotId`, `benefitSelection`, patient snapshot fields | schema.prisma:1795–1862 |
| Booking wizard: `frontend/app/(site)/[country]/[lang]/book/page.tsx` (service-first / doctor-first / gp quick) | verified |
| Portal layouts: `(auth)/account`, `(doctor)/doctor`, `(admin)/admin` — server `getServerAuthUser()` + role redirect | verified |
| Login redirect switch: `frontend/app/(auth)/(public)/login/ui.tsx:66–78` | verified |
| Admin FE pattern: server components + `adminRequest<T>()` (`frontend/lib/admin/admin-api/core.ts`), atoms in `app/(admin)/_components/atoms/` | verified |
| Cron pattern: token-gated POST endpoints (`X-Cron-Token`) | cron-subscriptions.route.ts |
| **Migration caveat:** `prisma migrate dev` BROKEN (shadow-DB fails on old cart-first migration). Use diff-from-live-DB → author SQL into `prisma/migrations/<ts>_corporate_plan/` → `prisma migrate deploy`. | docs + memory `reference_migration_shadow_db_workaround` |
| Design systems: public `gh2-*`/`gh-*` (DESIGN.md), portals Obsidian-Ivory `lux-*` (DESIGN2.md authoritative for portals) | DESIGN.md / DESIGN2.md |

Key architectural decision — **corporate benefits are a separate engine from
`PricingPlan` subscriptions**. The existing plan machinery is monthly-Stripe-billed,
credit-based, per-user opt-in (`benefitSelection`). Corporate is: company-billed
annually offline, automatic % discount, membership-derived. Entangling them
would poison both. The corporate discount hooks into the SAME checkout/preview
functions but AFTER plan-benefit resolution, as an independent step.

---

## 1. Data model (Prisma) — new + changed

### 1.1 New enums

```prisma
enum ServiceVisibility {
  PUBLIC                  // default — today's behaviour
  CORPORATE_ONLY          // bookable only by corporate members in onboarding (pre-assessment)
  CORPORATE_REQUEST_ONLY  // bookable only against an open CorporateServiceRequest
  ADMIN_ONLY              // internal
}

enum CorporateCompanyStatus { ACTIVE SUSPENDED EXPIRED }

enum CorporateEmployeeStatus {
  DRAFT INVITED INVITE_SENT INVITE_FAILED REGISTERED
  PROFILE_INCOMPLETE PROFILE_COMPLETE
  PREASSESSMENT_PENDING PREASSESSMENT_BOOKED
  ACTIVE SUSPENDED REMOVED
}

enum CorporateBeneficiaryStatus {
  INVITED INVITE_SENT INVITE_FAILED REGISTERED
  PROFILE_INCOMPLETE ACTIVE SUSPENDED REMOVED
}

enum CorporateInviteType { EMPLOYEE BENEFICIARY }

enum CorporateMemberType { EMPLOYEE BENEFICIARY }

enum CorporateCardStatus { ACTIVE SUSPENDED EXPIRED }

enum CorporateRequestType { ILLNESS_BENEFIT FIT_FOR_WORK }

enum CorporateRequestStatus {
  REQUESTED EMPLOYEE_NOTIFIED BOOKED COMPLETED CANCELLED EXPIRED
}
```

### 1.2 Changed enums

```prisma
enum UserRole {
  PATIENT
  ADMIN
  DOCTOR
  LOCAL_ADMIN
  SUPER_ADMIN
  CORPORATE_ADMIN   // NEW — company HR/admin; portal /corporate
}

enum NotificationType {
  ... existing 22 values ...
  CORPORATE_REQUEST_CREATED   // employee bell: “Your company requested a Fit-for-Work consultation”
  CORPORATE_MEMBERSHIP        // membership activated / suspended / card issued
}
```

Employees and beneficiaries stay `PATIENT` — they use the existing patient
portal, booking, checkout. Corporate membership is a *relation*, not a role.

### 1.3 Changed model: `Service`

```prisma
model Service {
  ...
  visibility ServiceVisibility @default(PUBLIC)   // NEW
  ...
}
```

### 1.4 New models

```prisma
model CorporatePlan {
  id                          String   @id @default(cuid())
  slug                        String   @unique            // "corporate-standard"
  name                        String                       // "Corporate Standard"
  annualPricePerEmployeeCents Int                          // 18000
  currencyCode                String   @default("EUR")
  maxBeneficiariesPerEmployee Int      @default(5)
  isActive                    Boolean  @default(true)
  benefitRules                CorporateBenefitRule[]
  companies                   CorporateCompany[]
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}

/// Configurable discount rules. v1 seed: one rule
/// { serviceKind: GENERAL, discountPercent: 10, appliesToBeneficiaries: true }
model CorporateBenefitRule {
  id                     String       @id @default(cuid())
  corporatePlanId        String
  corporatePlan          CorporatePlan @relation(fields: [corporatePlanId], references: [id], onDelete: Cascade)
  serviceKind            ServiceKind?  // rule matches by kind (GENERAL = GP)…
  serviceId              String?       // …or pinned to one service (takes precedence)
  service                Service?      @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  discountPercent        Float         // 10.0
  appliesToBeneficiaries Boolean       @default(true)
  isActive               Boolean       @default(true)
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt
  @@index([corporatePlanId, isActive])
}

model CorporateCompany {
  id                    String                 @id @default(cuid())
  name                  String
  registrationNumber    String?
  addressLine1          String?
  addressLine2          String?
  city                  String?
  postalCode            String?
  countryCode           String                 // ISO-2 lower, matches Country.code convention
  billingEmail          String
  contactName           String
  contactEmail          String
  contactPhone          String?                // WhatsApp-capable
  status                CorporateCompanyStatus @default(ACTIVE)
  planId                String
  plan                  CorporatePlan          @relation(fields: [planId], references: [id])
  adminUserId           String?                @unique   // the CORPORATE_ADMIN login
  adminUser             User?                  @relation("CorporateCompanyAdmin", fields: [adminUserId], references: [id], onDelete: SetNull)
  preAssessmentDoctorId String?                // "selected Doctor/Admin" for pre-assessments
  preAssessmentDoctor   Doctor?                @relation(fields: [preAssessmentDoctorId], references: [id], onDelete: SetNull)
  contractStartAt       DateTime               @default(now())
  contractEndAt         DateTime?              // null = open; past date ⇒ treated EXPIRED (discounts stop)
  employees             CorporateEmployee[]
  beneficiaries         CorporateBeneficiary[]
  serviceRequests       CorporateServiceRequest[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
}

model CorporateEmployee {
  id            String                  @id @default(cuid())
  companyId     String
  company       CorporateCompany        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  userId        String?                 // linked at invite accept
  user          User?                   @relation(fields: [userId], references: [id], onDelete: SetNull)
  firstName     String
  lastName      String
  email         String
  phone         String?                 // WhatsApp
  addressLine1  String?
  addressLine2  String?
  city          String?
  postalCode    String?
  dateOfBirth   DateTime?
  employeeCode  String?                 // optional internal employee ID
  department    String?
  jobTitle      String?
  status        CorporateEmployeeStatus @default(DRAFT)
  preAssessmentAppointmentId String?    @unique
  preAssessmentAppointment   Appointment? @relation(fields: [preAssessmentAppointmentId], references: [id], onDelete: SetNull)
  beneficiaries CorporateBeneficiary[]
  invites       CorporateInvite[]
  benefitCard   CorporateBenefitCard?
  serviceRequests CorporateServiceRequest[]
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt
  @@unique([companyId, email])
  @@index([userId])
  @@index([companyId, status])
}

model CorporateBeneficiary {
  id           String                     @id @default(cuid())
  employeeId   String
  employee     CorporateEmployee          @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  companyId    String
  company      CorporateCompany           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  userId       String?
  user         User?                      @relation(fields: [userId], references: [id], onDelete: SetNull)
  firstName    String
  lastName     String
  email        String
  phone        String?
  relationship String                     // Spouse / Child / Parent / Other
  addressLine1 String?
  city         String?
  postalCode   String?
  dateOfBirth  DateTime?
  notes        String?
  status       CorporateBeneficiaryStatus @default(INVITED)
  invites      CorporateInvite[]
  benefitCard  CorporateBenefitCard?
  createdAt    DateTime                   @default(now())
  updatedAt    DateTime                   @updatedAt
  @@unique([employeeId, email])
  @@index([userId])
  @@index([companyId, status])
}

/// Secure invite. Raw token NEVER stored — sha256 hash only (same posture as
/// PasswordResetToken). Raw token carries no PII. 7-day expiry. Single use.
model CorporateInvite {
  id             String              @id @default(cuid())
  type           CorporateInviteType
  tokenHash      String              @unique
  employeeId     String?
  employee       CorporateEmployee?  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  beneficiaryId  String?
  beneficiary    CorporateBeneficiary? @relation(fields: [beneficiaryId], references: [id], onDelete: Cascade)
  email          String
  expiresAt      DateTime
  usedAt         DateTime?
  emailSentAt    DateTime?
  whatsappSentAt DateTime?
  lastSendError  String?
  createdAt      DateTime            @default(now())
  @@index([employeeId])
  @@index([beneficiaryId])
}

model CorporateBenefitCard {
  id            String               @id @default(cuid())
  cardNumber    String               @unique   // "GHC-" + 10 uppercase base32 chars
  memberType    CorporateMemberType
  employeeId    String?              @unique
  employee      CorporateEmployee?   @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  beneficiaryId String?              @unique
  beneficiary   CorporateBeneficiary? @relation(fields: [beneficiaryId], references: [id], onDelete: Cascade)
  status        CorporateCardStatus  @default(ACTIVE)
  validFrom     DateTime             @default(now())
  validUntil    DateTime             // company contractEndAt or +1y
  createdAt     DateTime             @default(now())
  updatedAt     DateTime             @updatedAt
}

model CorporateServiceRequest {
  id                String                  @id @default(cuid())
  companyId         String
  company           CorporateCompany        @relation(fields: [companyId], references: [id], onDelete: Cascade)
  employeeId        String
  employee          CorporateEmployee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  type              CorporateRequestType
  serviceId         String                  // resolved corporate service for the company country
  service           Service                 @relation(fields: [serviceId], references: [id])
  requestedByUserId String                  // corporate admin or platform admin User.id
  reason            String?
  status            CorporateRequestStatus  @default(REQUESTED)
  appointmentId     String?                 @unique
  appointment       Appointment?            @relation(fields: [appointmentId], references: [id], onDelete: SetNull)
  expiresAt         DateTime?               // default +60 days; cron expires
  notifiedAt        DateTime?
  completedAt       DateTime?
  cancelledAt       DateTime?
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  @@index([companyId, status])
  @@index([employeeId, status])
}
```

Back-relations to add on existing models: `User.corporateCompanyAdmin`,
`User.corporateEmployees`, `User.corporateBeneficiaries`, `Doctor.corporatePreAssessmentCompanies`,
`Service.corporateBenefitRules`, `Service.corporateServiceRequests`,
`Appointment.corporateEmployeePreAssessment`, `Appointment.corporateServiceRequest`.

### 1.5 Migration procedure (shadow DB broken — MUST follow)

1. Edit `schema.prisma`.
2. `npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<UTC-ts>_corporate_plan/migration.sql`
3. Review SQL (enum ADD VALUE statements, new tables, `Service.visibility` column with default backfill).
4. `npx prisma migrate deploy` (records + applies against live DB).
5. `npx prisma generate`.

Note: Postgres `ALTER TYPE … ADD VALUE` cannot run inside a transaction block in
older PG; prisma migrate runs each migration in a tx. Adding values to an
*existing* enum (`UserRole`, `NotificationType`) inside a tx is supported on
PG ≥ 12 as long as the new value is not used in the same tx. Our migration only
adds values + creates tables ⇒ safe. Do NOT seed in the migration.

---

## 2. Status machines (authoritative)

### 2.1 Employee

```
DRAFT ──(send invite)──▶ INVITED ──(email/WA dispatched ok)──▶ INVITE_SENT
INVITED/INVITE_SENT ──(all sends failed)──▶ INVITE_FAILED ──(resend)──▶ INVITE_SENT
INVITE_SENT ──(accept: account created/linked)──▶ REGISTERED
REGISTERED ──(profile check: missing fields)──▶ PROFILE_INCOMPLETE
REGISTERED/PROFILE_INCOMPLETE ──(profile complete)──▶ PROFILE_COMPLETE ──(auto)──▶ PREASSESSMENT_PENDING
PREASSESSMENT_PENDING ──(appointment created for company's pre-assessment service)──▶ PREASSESSMENT_BOOKED
PREASSESSMENT_BOOKED ──(appointment status → COMPLETED, or admin override)──▶ ACTIVE  [+ issue benefit card]
ACTIVE ⇄ SUSPENDED (admin/corporate action; card → SUSPENDED, discount stops)
any ──(remove)──▶ REMOVED (terminal; card → EXPIRED; beneficiaries → REMOVED)
```

Profile-complete check (server): user linked AND user.dateOfBirth AND
employee.addressLine1 AND phone present. Evaluated at accept + at profile PATCH
(hook in `me-corporate` status recompute endpoint, called by portal).

### 2.2 Beneficiary

```
INVITED ▶ INVITE_SENT ▶ (accept) REGISTERED ▶ [PROFILE_INCOMPLETE ▶] ACTIVE [+ card]
                                        (no pre-assessment requirement)
SUSPENDED / REMOVED as above. Employee SUSPENDED/REMOVED ⇒ cascade-suspend/remove its beneficiaries.
```

Beneficiary becomes ACTIVE immediately when profile complete — card issued then.

### 2.3 Corporate service request

```
REQUESTED ──(notification dispatched)──▶ EMPLOYEE_NOTIFIED
EMPLOYEE_NOTIFIED ──(employee books; appointment linked)──▶ BOOKED
BOOKED ──(appointment COMPLETED)──▶ COMPLETED
REQUESTED/EMPLOYEE_NOTIFIED ──(cancel by corporate/admin)──▶ CANCELLED
REQUESTED/EMPLOYEE_NOTIFIED ──(expiresAt passed; cron)──▶ EXPIRED
```

### 2.4 Discount eligibility (evaluated server-side at every price computation)

Member eligible ⇔ ALL of:
- membership row status == ACTIVE (employee or beneficiary)
- company.status == ACTIVE
- company.contractEndAt is null OR > now()
- matching active `CorporateBenefitRule` on the company's plan
  (serviceId match first, else serviceKind match; beneficiary additionally
  requires `appliesToBeneficiaries`)

---

## 3. Backend — module `backend/src/modules/corporate/`

New files (module pattern mirrors `subscriptions/`):

| File | Purpose |
|---|---|
| `corporate.types.ts` | shared TS types + zod schemas |
| `corporate-guards.ts` | `requireCorporateAdmin` (preHandler: authUser.role === CORPORATE_ADMIN → load company by adminUserId, attach), `getActiveMembershipForUser(userId)` |
| `corporate-company.service.ts` | company CRUD, billing summary (`activeCount × plan.annualPricePerEmployeeCents`; activeCount = employees NOT IN (DRAFT, REMOVED)) |
| `corporate-employee.service.ts` | employee CRUD, bulk create, status recompute, suspend/remove cascade |
| `corporate-beneficiary.service.ts` | beneficiary CRUD (server-enforced `count < plan.maxBeneficiariesPerEmployee` inside tx), suspend/remove |
| `corporate-invite.service.ts` | token mint (32B random → sha256 hash stored), send (email via `sendEmail` + `wrapHtml`, WhatsApp via `sendWhatsAppText`, fire-and-forget with status writeback), resend, accept (tx: create-or-link User, set consents, link employee/beneficiary, mark used, recompute status, auto-login JWT like doctor invite) |
| `corporate-card.service.ts` | issue card (idempotent, unique cardNumber `GHC-XXXXXXXXXX`), suspend/expire sync with membership, public verify lookup |
| `corporate-request.service.ts` | create request (resolve corporate service by type+country), notify employee (email+WA+in-app `CORPORATE_REQUEST_CREATED`), link booking, cancel, cron-expire |
| `corporate-benefit.service.ts` | **discount engine**: `resolveCorporateDiscount({userId, serviceId, serviceKind, baseCents})` → `{ discountPercent, discountCents, companyName } | null`, plus `assertCorporateServiceBookable({userId, serviceId})` for visibility gating |
| `corporate-status.service.ts` | transition helpers (single place that mutates employee/beneficiary status + card side-effects + notifications) |

### 3.1 Routes

**`backend/src/routes/admin-corporate.route.ts`** — guard `verifyAdminAccess`
(mutations restricted to ADMIN/SUPER_ADMIN; LOCAL_ADMIN read-only, filtered to
`allowedCountryFolders` by `company.countryCode`):

```
GET    /api/admin/corporate/plans
PATCH  /api/admin/corporate/plans/:id                      (price, maxBeneficiaries, isActive)
GET    /api/admin/corporate/plans/:id/rules
POST   /api/admin/corporate/plans/:id/rules
PATCH  /api/admin/corporate/rules/:ruleId
DELETE /api/admin/corporate/rules/:ruleId
GET    /api/admin/corporate/companies?query&status
POST   /api/admin/corporate/companies                      (creates company + optional CORPORATE_ADMIN user invite)
GET    /api/admin/corporate/companies/:id                  (profile + counts + billing calc)
PATCH  /api/admin/corporate/companies/:id                  (details, status, preAssessmentDoctorId, contract dates)
POST   /api/admin/corporate/companies/:id/admin-invite     (create/replace corporate admin login → PasswordResetToken isInvite flow)
GET    /api/admin/corporate/companies/:id/employees?status
POST   /api/admin/corporate/companies/:id/employees        (single or bulk array)
PATCH  /api/admin/corporate/employees/:id                  (edit, suspend, remove, force-activate)
POST   /api/admin/corporate/employees/:id/resend-invite
GET    /api/admin/corporate/companies/:id/beneficiaries
PATCH  /api/admin/corporate/beneficiaries/:id              (suspend/remove/resend handled via action field)
POST   /api/admin/corporate/beneficiaries/:id/resend-invite
GET    /api/admin/corporate/companies/:id/requests?status
POST   /api/admin/corporate/companies/:id/requests         (admin-created request)
PATCH  /api/admin/corporate/requests/:id                   (cancel)
```

**`backend/src/routes/corporate.route.ts`** — corporate portal, guard
`requireAuth` + `requireCorporateAdmin`:

```
GET    /api/corporate/company                (own company + plan + billing summary)
PATCH  /api/corporate/company               (name, address, billing/contact fields ONLY — not status/plan/doctor)
GET    /api/corporate/employees?status&query
POST   /api/corporate/employees             (single)
POST   /api/corporate/employees/bulk        (array ≤ 500; per-row validation results)
PATCH  /api/corporate/employees/:id         (edit contact fields while DRAFT/INVITED; suspend/remove any time)
POST   /api/corporate/employees/:id/resend-invite
GET    /api/corporate/employees/:id         (onboarding detail: status, beneficiary COUNT only, pre-assessment booked/completed flags — NO medical data, NO beneficiary PII)
GET    /api/corporate/requests?status
POST   /api/corporate/requests              ({employeeId, type, reason})
PATCH  /api/corporate/requests/:id          (cancel own, while REQUESTED/EMPLOYEE_NOTIFIED)
GET    /api/corporate/billing-summary       ({employeeCount, pricePerEmployeeCents, totalAnnualCents, currency})
```

Privacy hard rule enforced here: corporate responses NEVER include appointment
notes, consultation records, beneficiary contact details, or any medical field.
Only status labels + booleans + counts.

**`backend/src/routes/corporate-invites.route.ts`** — public:

```
GET  /api/corporate/invites/:token   (валid? → {type, firstName, maskedEmail, companyName, prefill{...non-sensitive}, expiresAt}; 404/410 otherwise)
POST /api/corporate/invites/:token/accept
     body: { password?, profile {dateOfBirth, addressLine1, city, postalCode, phone}, consents {terms, privacy, dataProcessing} — all three REQUIRED true }
     behaviour: hash token lookup; if User with invite email exists → require `password` matches login (or body.mode="login" with password) and LINK; else create User (role PATIENT, emailVerifiedAt=now — invite proves mailbox); set auth cookie (same as doctor invite consume); mark invite used; recompute status; fire notifications.
```

**`backend/src/routes/me-corporate.route.ts`** — guard `requireAuth` (PATIENT):

```
GET    /api/me/corporate                    (membership: none | {memberType, companyName, planName, status, onboarding {profileComplete, preAssessment {required, booked, completed, serviceSlug, doctorId}}, card?, openRequests[]})
GET    /api/me/corporate/card               (card payload for wallet UI incl. verify URL)
GET    /api/me/corporate/beneficiaries      (employee only)
POST   /api/me/corporate/beneficiaries      (employee only; server-enforced max via tx count; sends invite)
PATCH  /api/me/corporate/beneficiaries/:id  (edit while not ACTIVE; remove)
POST   /api/me/corporate/beneficiaries/:id/resend-invite
```

**Public card verify** (mirrors certificate-verify pattern):
```
GET /api/corporate/card-verify/:cardNumber → {valid, memberName, companyName, memberType, planName, status, validUntil}
```

**Cron** — extend `cron-subscriptions.route.ts` daily handler or new
`cron-corporate.route.ts` (token-gated): expire requests past `expiresAt`,
expire cards/companies past `contractEndAt`, invite reminders (one reminder at
+3 days if not used).

### 3.2 Service visibility enforcement (server-side, all paths)

1. `services.service.ts` `listServices` / `listServicesByCountry` / public
   `getServiceBySlug`: add `visibility: "PUBLIC"` to where-clauses. Admin list
   endpoints unchanged (show all + visibility column).
2. **Cart add** (`cart.route.ts` add-item for GENERAL/SPECIALIST service): if
   `service.visibility !== PUBLIC` → require auth + `assertCorporateServiceBookable`:
   - `CORPORATE_ONLY` (pre-assessment): requester must be employee of a company
     whose `preAssessmentService` matches, status in PROFILE_COMPLETE/
     PREASSESSMENT_PENDING/PREASSESSMENT_BOOKED (rebook allowed while not ACTIVE).
   - `CORPORATE_REQUEST_ONLY`: requester must be the employee of an OPEN
     (REQUESTED/EMPLOYEE_NOTIFIED) `CorporateServiceRequest` for that service.
   - else 403.
3. **Direct appointment create paths** (appointments.route.ts POST, admin
   manual booking): same assertion (admin bypasses).
4. Doctor availability/slot endpoints keyed by serviceId: same gate (slots for
   corporate services return empty for unauthenticated/ineligible callers).
5. Sitemap/SEO service page generation: non-PUBLIC services excluded (frontend
   fetches public list ⇒ automatic once (1) done). Direct slug page hits 404 via (1).

Pre-assessment service→company resolution: pre-assessment Service is seeded
per-country with slug `corporate-pre-assessment`. Company's booking uses
`company.preAssessmentDoctorId` as the pinned doctor: `/book?service=corporate-pre-assessment&doctor=<id>`
deep link from the employee portal. Server double-checks doctor pin: for
CORPORATE_ONLY bookings the `doctorId` MUST equal the member company's
`preAssessmentDoctorId` (if set).

### 3.3 Discount engine hook (checkout + previews)

In `checkout-pricing.service.ts`:

- `reserveAndPriceConsultations()` (line ~106): after existing plan-benefit
  resolution per line —
  ```
  if (linePricedNormally && userId) {
    const corp = await resolveCorporateDiscount({ userId, serviceId, serviceKind, baseCents: unitPriceCents });
    if (corp) { unitPriceCents -= corp.discountCents; line.corporateDiscount = corp; }
  }
  ```
  “Priced normally” = plan resolver returned NOT_COVERED / LOCKED / etc. (no
  credit, no plan discount applied). No stacking with subscription benefits —
  best-for-user is fine later; v1 = plan benefit wins if used, else corporate.
- `previewConsultationPricing()` and `previewServiceBenefit()`: same call,
  return `corporateDiscount {percent, amountCents, companyName}` in the line
  payload so cart/checkout/booking UIs can render “Corporate Standard −10%”.
- Discount math reuses `percentDiscountAmountCents()` (round-half-up) from
  pricing-resolver.ts.
- Order line snapshot: store discount in existing OrderItem price fields
  (unit price already discounted server-side) — add `corporateDiscountCents Int?`
  + `corporateCompanyId String?` columns to OrderItem for audit (small,
  worthwhile for reconciliation).

Eligibility function implements §2.4 exactly; one query with includes, cached
per-request.

### 3.4 Notifications matrix

| Event | Email | WhatsApp | In-app |
|---|---|---|---|
| Employee invited / reminder / resend | ✔ invite link | ✔ if phone | — |
| Beneficiary invited / resend | ✔ | ✔ if phone | — |
| Employee registered (→ corporate admin) | ✔ to contactEmail | — | — |
| Employee booked pre-assessment (→ corporate admin + selected doctor) | ✔ | — | doctor: existing APPOINTMENT_ASSIGNED covers it |
| Employee ACTIVE + card issued | ✔ member | ✔ | CORPORATE_MEMBERSHIP |
| Beneficiary ACTIVE + card | ✔ | ✔ | CORPORATE_MEMBERSHIP |
| Corporate request created | ✔ employee | ✔ employee | CORPORATE_REQUEST_CREATED |
| Request booked/completed (→ corporate admin) | ✔ | — | — |
| Membership suspended/expired | ✔ member | — | CORPORATE_MEMBERSHIP |

All sends fire-and-forget (`.catch` → log + writeback `lastSendError` /
INVITE_FAILED), never block the mutation tx. Copy in English v1 (i18n later),
templates in `backend/src/modules/corporate/corporate-emails.ts` using `wrapHtml`.

---

## 4. Frontend

### 4.1 Corporate portal — `frontend/app/(corporate)/corporate/`

Layout clone of `(doctor)` layout skeleton, Obsidian-Ivory `lux-*` portal system
(DESIGN2.md): server `getServerAuthUser()`; `role !== "CORPORATE_ADMIN"` →
redirect (`PATIENT→/account`, admin→`/admin`, none→`/login?next=/corporate`).

Pages:
- `/corporate` — dashboard: company card, onboarding funnel (counts by status:
  Invited / Registered / Pre-assessment booked / Active), billing summary card
  (employees × €180 = total), recent requests.
- `/corporate/employees` — table (name, email, dept, status pill, beneficiary
  count, actions: resend invite, suspend, remove); Add-employee drawer/form;
  **Bulk upload**: textarea/CSV file → client parse (header row: firstName,
  lastName, email, phone, address, dateOfBirth, employeeCode, department,
  jobTitle) → preview table with per-row validation → POST bulk → per-row
  results. Then “Send invites” action (or auto-send on save — YES, auto-send per brief).
- `/corporate/employees/[id]` — onboarding detail (status timeline, invite
  history, request history; counts only, no PII of beneficiaries).
- `/corporate/requests` — list + “New request” (employee select, type radio
  Illness Benefit / Fit-for-Work, reason textarea).
- `/corporate/settings` — editable company details.

Login redirect: add `CORPORATE_ADMIN → /corporate` to `login/ui.tsx:74` switch
+ widen role unions in `frontend/lib/api/auth-api.ts` and `server-auth.ts`.
Also add redirect guards in the other three portal layouts (account/doctor/admin
each bounce CORPORATE_ADMIN to /corporate).

API access: new `frontend/lib/corporate/corporate-api.ts` (clone of
admin-api/core.ts pattern — server-only fetch, cookie forward, same envelope).

### 4.2 Admin pages — `frontend/app/(admin)/admin/corporate/`

- `/admin/corporate` — companies table (+ New company).
- `/admin/corporate/new` — form incl. plan select (Corporate Standard), country,
  corporate-admin email (sends admin invite).
- `/admin/corporate/[id]` — tabs: **Overview** (details, status, contract dates,
  billing calc, corporate-admin login block w/ resend), **Employees** (full
  table incl. onboarding + pre-assessment status, resend/suspend/remove/force-
  activate), **Beneficiaries**, **Requests** (view/create/cancel), **Settings**
  (pre-assessment doctor select from country doctor roster, plan rules view/edit:
  discountPercent, serviceKind, appliesToBeneficiaries; annual price,
  maxBeneficiaries).
- Nav: add “Corporate” to admin sidebar Global section (ADMIN/SUPER_ADMIN only).

Uses existing atoms (`AdminTable`, `PageHeader`, `AdminCard`, `Pill`, `Btn`).

### 4.3 Invite accept — `frontend/app/(auth)/(public)/corporate-invite/[token]/`

Public page: fetch invite info → show company + prefilled name/masked email →
password create (or “I already have an account” → password login-link mode) →
missing profile fields → 3 consent checkboxes (required) → submit → cookie set
by backend → redirect: employee → `/account/corporate?welcome=1`,
beneficiary → `/account/corporate?welcome=1`. Expired/used → clear error state
with “ask your company admin to resend”.

### 4.4 Patient portal — `frontend/app/(auth)/account/corporate/`

Add nav item “Corporate” (Membership group) — rendered only when
`GET /api/me/corporate` returns membership (layout fetch, cheap).

Page sections:
1. **Onboarding checklist** (employee, until ACTIVE): profile complete ✓/✗ →
   book pre-assessment CTA (deep link `/{country}/{lang}/book?service=corporate-pre-assessment&doctor=<pinned>`)
   → status auto-advances.
2. **Digital benefit card** — lux dark card: GH logo, member name, company,
   “Corporate Standard”, member type, card number, valid from/until, status
   pill, QR (SVG via tiny inline QR lib or verify-URL text code — reuse
   whatever certificate-verify page uses; fallback: monospaced verify code +
   `/card-verify/<number>` URL). Suspended/expired → greyed with banner.
3. **Beneficiaries** (employee only): list (name, relationship, status pill,
   resend/remove), Add form (max 5 — counter “3 of 5 used”), server errors surfaced.
4. **Requests**: open Illness-Benefit / Fit-for-Work requests with “Book now” CTA
   (deep link to the requested service booking).

### 4.5 Checkout/cart discount UI

Cart + checkout summaries already render benefit lines from preview endpoints —
add `corporateDiscount` rendering: line “Corporate Standard (−10%)” with saved
amount, same styling as plan-benefit rows. Booking step benefit preview
(`me-benefit-preview`) same.

Public card verify page `frontend/app/(site)/card-verify/[code]/page.tsx` —
minimal: valid/invalid, member name, company, type, validity.

---

## 5. Seed — `backend/scripts/seed-corporate-plan.ts`

Idempotent (upsert by slug):
1. `CorporatePlan` `corporate-standard`: €18000 cents? — **careful: 18000 cents = €180.00** ✔, EUR, max 5 beneficiaries.
2. `CorporateBenefitRule`: `{serviceKind: GENERAL, discountPercent: 10, appliesToBeneficiaries: true, isActive: true}`.
3. Per active country (or `--country=xx` flag): three Services, `isActive: true`:

| slug | name | kind | visibility | price |
|---|---|---|---|---|
| `corporate-pre-assessment` | Pre-assessment Consultation | GENERAL | CORPORATE_ONLY | €0 |
| `corporate-illness-benefit` | Illness Benefit Consultation | GENERAL | CORPORATE_REQUEST_ONLY | €0 |
| `corporate-fit-for-work` | Fit-for-Work Consultation | GENERAL | CORPORATE_REQUEST_ONLY | €0 |

€0 base price v1 (included in plan; admin can set price later). €0 lines skip
Stripe payment path — verify checkout handles zero-total order (existing free
paths: plan-credit checkout already produces €0 lines ⇒ supported).

No changes to public pricing pages — corporate plan lives only in these new
tables; acceptance #17 satisfied by construction.

---

## 6. Security checklist (enforcement points)

| Rule | Enforced at |
|---|---|
| Invite tokens: 32-byte crypto random, sha256 hash stored, 7-day expiry, single-use, no PII in token | corporate-invite.service.ts |
| Invite GET leaks only maskedEmail/company/prefill-non-sensitive | corporate-invites.route.ts |
| Corporate admin sees only own company (company loaded via `adminUserId === authUser.sub`, all child queries scoped by companyId) | corporate-guards.ts on EVERY /api/corporate/* route |
| Corporate admin NEVER receives medical notes / appointment content / beneficiary PII | response shapers in corporate-company/employee services (status labels + counts only) |
| Employee/beneficiary access only own membership (`userId === authUser.sub`) | me-corporate.route.ts |
| Max 5 beneficiaries in tx with count re-check (race-safe) | corporate-beneficiary.service.ts |
| Corporate-only service visibility: list-filter + cart-add + appointment-create + slot endpoints | §3.2 |
| Discount eligibility recomputed server-side inside Order tx (never trusted from client) | checkout-pricing.service.ts hook |
| Suspension/expiry kills discount + card immediately | §2.4 evaluated live at pricing time; card status synced |
| LOCAL_ADMIN: read-only, country-scoped | admin-corporate.route.ts guard |
| Rate limiting: reuse global Fastify rate-limit; invite accept + card-verify get tighter per-IP limits like password-reset | route config |

---

## 7. Execution order (small safe steps, each compiles)

| Step | Content | Verify |
|---|---|---|
| 1 | Schema edit + migration SQL (diff-from-live) + `migrate deploy` + `prisma generate` | migration applies clean; `tsc` green |
| 2 | Seed script + run | rows exist; public `/api/services` does NOT list corporate slugs |
| 3 | Corporate module services + guards (no routes yet) | unit tests: status transitions, discount resolver, max-5 |
| 4 | Service-visibility enforcement (services.service, cart, appointments, slots) | test: public list excludes; ineligible cart-add 403 |
| 5 | Routes: admin-corporate, corporate, corporate-invites, me-corporate, card-verify + route registration in app.ts | route tests light; manual curl |
| 6 | Checkout hook + previews + OrderItem audit columns (same migration as step 1) | test: 10% on GP for active member, none when suspended, none stacking |
| 7 | Notifications (emails module + WA + in-app enum usage) | log-mode send in dev |
| 8 | FE: login/role plumbing + corporate portal | build green, screenshots |
| 9 | FE: admin corporate pages | screenshots |
| 10 | FE: invite accept + account/corporate (card, beneficiaries, onboarding) + checkout discount line | screenshots incl. discount at checkout |
| 11 | Cron endpoint + reminders | curl with token |
| 12 | Full pass: `tsc` backend+frontend, backend tests, `next build`, acceptance walkthrough below | all green |

---

## 8. Acceptance criteria → coverage map

| # | Criterion | Covered by |
|---|---|---|
| 1 | Admin creates company + assigns plan | §3.1 admin routes, §4.2 |
| 2 | Corporate user adds company details | §4.1 settings, PATCH /api/corporate/company |
| 3 | Corporate user adds employees | §4.1 employees (+bulk) |
| 4 | Email/WhatsApp invites | §3 invite service (SendGrid/Gmail + WaSender) |
| 5 | Accept → profile → book pre-assessment | §3.1 invites route, §4.3, §4.4 checklist |
| 6 | Pre-assessment hidden publicly | §3.2 (visibility=CORPORATE_ONLY) |
| 7/8 | Illness/Fit-for-work requests | §3.1 requests, §4.1 |
| 9 | Hidden publicly | §3.2 (CORPORATE_REQUEST_ONLY) |
| 10 | ≤5 beneficiaries | tx-enforced, §6 |
| 11 | Beneficiary invites + profiles | invite service type=BENEFICIARY |
| 12 | Digital cards both | §3 card service, §4.4 |
| 13 | Configured GP discount both | §3.3 engine + CorporateBenefitRule |
| 14 | Only active members | §2.4 |
| 15 | Corporate user no medical data | §6 response shapers |
| 16 | Server-side checks | §6 table |
| 17 | Not on public site | separate tables; no public pricing render; visibility filter |
| 18 | Billing = count × €180 | billing-summary endpoint (config from CorporatePlan) |

---

## 9. Recheck notes (logic holes found & resolved during plan review)

1. **Race on max-5** → count inside the same tx as create, `SELECT … FOR UPDATE`-equivalent via tx isolation; reject at 5.
2. **Existing-user invite collision** (employee email already has platform account) → link path in accept flow (login-link mode); never create duplicate user; if linked user already member of another company → 409, admin resolves.
3. **Guest checkout can't get corporate discount** → correct by design (discount requires authenticated membership); corporate services additionally require auth at cart-add.
4. **Zero-price corporate services vs Stripe** → existing €0/credit checkout path already supported; verify in step 6 tests.
5. **Employee removed after booking pre-assessment** → appointment stays (medical record), membership REMOVED, card EXPIRED, discount dead via §2.4; request rows cancelled.
6. **Company expiry mid-year** → `contractEndAt` in eligibility check ⇒ discounts + cards die automatically; daily cron flips company.status → EXPIRED + notifies.
7. **Discount stacking with subscription plans** → explicit precedence: plan benefit (if selected & applied) else corporate; never both on one line.
8. **Pre-assessment doctor unset** → booking allowed with any doctor assigned to the service (fallback), warning surfaced in admin company page; when set, server pins doctorId.
9. **LOCAL_ADMIN leakage** → read-only + countryCode scope filter.
10. **WhatsApp absent** (no phone) → email-only, no INVITE_FAILED unless BOTH channels fail (email fail = fail; WA fail alone with email ok = INVITE_SENT + lastSendError note).
11. **Status recompute idempotency** → all transitions through corporate-status.service with explicit allowed-from sets (no accidental regressions, e.g. ACTIVE never demoted by profile edit).
12. **Enum migration safety** → new enum values not referenced in same migration tx (seed is a separate script) — PG-safe.
13. **`NotificationType` additions** — verified enum is extensible (subscription values were added post-freeze memory note; that note is stale).
14. **Appointment→request linkage** — cart/appointment creation for CORPORATE_REQUEST_ONLY service stamps `CorporateServiceRequest.appointmentId` + status BOOKED in same tx as appointment mint; appointment COMPLETED webhook/status-change hook flips request COMPLETED + (for pre-assessment) employee ACTIVE. Hook lives where AppointmentStatus is PATCHed (admin appointments route + doctor actions route) — single helper `onAppointmentStatusChanged()` called from both.

---

## 10. Post-build conformance (2026-08-14)

Written after a full spec-vs-code review of the shipped feature plus a
remediation pass. Every claim here was checked against the code on the date
above, not against this plan's own §0–9.

### 10.1 Discount is selected, not silently applied (spec deviation — CLOSED)

The 2026-07-05 brief reads as though an active member's 10% GP discount
applies automatically at checkout. It does not, and that is deliberate:
the phase-5 memberships work (§6.4 of the memberships plan) put **every**
benefit source behind one choice, and corporate was folded into it.

`backend/src/routes/orders.route.ts` branches the same way for all of them:

| Source | Applies when |
|---|---|
| Public plan credit/discount | `benefitSource === "PUBLIC_PLAN"` |
| Corporate | `benefitSource === "CORPORATE"` |
| Membership | `benefitSource === "MEMBERSHIP"` |
| Insurance | per-line `insuranceCompanyId` |

Corporate therefore behaves **exactly like the other plans**, which is the
required behaviour. Two guards stop it from costing a member money:

- The booking form pre-selects the cheapest option and switches the benefit
  toggle ON (`consultation-booking-form.tsx`, `opts.find(o => o.recommended)`).
  For a corporate member with nothing cheaper, that is the corporate discount
  — so the patient sees it applied without doing anything, and may opt out.
- A cart whose choice never ran (`benefitSource === "UNSET"`) while the
  patient IS eligible is refused at checkout with `BENEFIT_STEP_INCOMPLETE`
  rather than quietly charged full price.

**Do not "fix" this by making corporate auto-apply.** It would desynchronise
corporate from every other benefit source and reintroduce stacking questions
§9.7 already settled.

### 10.2 Fixed in the 2026-08-14 remediation pass

| Area | Was | Now |
|---|---|---|
| Invite reminders | `reminderSentAt` stamped on the row `mintAndSendInvite` then deleted ⇒ every unaccepted invitee re-mailed every 3 days forever, removed employees included | Stamped on the invite that is actually created; cron filters on member status; `REMOVE` deletes outstanding invites |
| Invite proxy | Forwarded no client-IP headers ⇒ 30 lookups / 10 accepts per hour shared by the whole platform | `proxyClientIpHeaders()` + 20s timeout, same as the `/api/auth` proxy |
| `POST /api/appointments` | No visibility check ⇒ anyone knowing a slug could book a private corporate consultation | `assertCorporateServiceBookable` before the appointment row is created |
| Admin beneficiaries + requests reads | No LOCAL_ADMIN country scope | All four company-scoped reads share `canReadCompany()` |
| Invite accept | Re-found "newest beneficiary for this user"; token claimed non-atomically | Returns `memberId`; claims the token inside the tx (`updateMany where usedAt: null`) |
| Corporate invoices | `round(amount/qty)` drifted the line total off the order total; currency from the plan while the series came from the country | `priceCorporateInvoiceLine` refuses non-divisible amounts; currency from the company's country |
| Pre-assessment linkage | Hook fired only on the paid-order webhook | Also fires from direct booking and admin manual booking |
| Status machine | `canTransition*` referenced only by its own test | Drives `setEmployeeStanding` / `setBeneficiaryStanding`, idempotent on repeats |
| Booking deep links | Hardcoded `/en` | `memberBookingLocale()` — user preference, else country default |
| Card verification | Returned member + company name for expired/suspended cards | Identity fields only when `valid` |
| Bulk import | 500 rows × one awaited email each | 200-row cap, sends in bounded parallel |
| Notifications | Nothing on profile completion or contract expiry | `notifyCompanyMemberProfileComplete`, `notifyCompanyExpired` |
| Service visibility | Settable only by the seed script | Admin service form field (`ASYNC_PRESCRIPTION` still forced `ADMIN_ONLY`) |
| Doctor portal | A pre-assessment looked like any other booking | `corporateFlow` badge in the queue (no company name, no medical detail) |

Also: `companyIsLive` now honours `contractStartAt`; benefit-card creation
retries only on `P2002`; admin employee-create de-duplicates by email;
`FORCE_ACTIVATE` 404s on an unknown id.

### 10.3 Known-and-accepted

- **`REGISTERED` and `PROFILE_COMPLETE` are never written.** Invite accept goes
  straight to `PROFILE_INCOMPLETE` or `PREASSESSMENT_PENDING` — the two skipped
  states describe the same instant. The enum values stay (removing them is a
  migration for no gain); the corporate portal's status filter no longer offers
  them.
- **No QR code on the benefit card** — no QR library in the repo. The card
  carries a verification code and `/card-verify/<code>`, which the brief allows.

### 10.4 Still open

1. **`scripts/seed-corporate-plan.ts` has not been run on production.** Without
   `CorporatePlan` + `CorporateBenefitRule` + the three corporate services,
   discounts resolve to null and request creation 409s. Needs an explicit
   go-ahead — it writes to the live database.
2. ~~**No end-to-end walk-through on a real company yet**: invite → accept →
   pre-assessment → card → discount at checkout.~~ Superseded by §10.6: the
   checkout, cart-add gate, cart preview, manual booking, lifecycle hook and
   doctor badge were all exercised against the dev database. Invite → accept
   remains covered only by the earlier browser pass.
3. **`frontend/locales/*/doctor.json` drift (pre-existing, unrelated):** 20 EN
   keys missing in the five other locales (`medicalAccessDenied.*`,
   `crossBorderRx.*`) and 2 extra. `deepMergeLocale` falls back to EN, so those
   strings render in English rather than breaking.

### 10.5 Second-pass remediation (2026-08-14)

An independent second-pass review ran against the dev database and drove the
frontend in a browser. What it found, and what changed. Every item below has a
runnable check (an assertion harness against the dev DB + the running server, or
a rendered-HTML assertion); the ones that were not executed are called out.

**The feature was unreachable from every UI surface.** The booking wizard builds
its service list from the public country catalogue, which filters
`visibility: "PUBLIC"`, so a corporate slug never resolved and every product link
(`/api/me/corporate` `bookPath`, the request email, the in-app notification,
`/account/corporate`) landed on "this service is not available in this country".
The service-detail read compounded it: `fetchServiceDetail` is an ISR-cached
`apiRequest`, so it forwarded no cookie and the backend saw an anonymous
requester.

- The cached public path stays PUBLIC-only. Making it auth-aware would turn a
  404 into a cross-user cache leak — `services.route.ts` already documents why
  that response carries no `Cache-Control`.
- `frontend/lib/corporate/corporate-api.ts` gained
  `fetchCorporateBookableService`: per-request, `cache: "no-store"`,
  cookie-forwarded, and it accepts only `CORPORATE_ONLY` /
  `CORPORATE_REQUEST_ONLY` rows.
- `book/page.tsx` runs that ONE extra lookup when `?service=` did not resolve
  against the public list, and merges the row in — `selectedService`,
  `currentStep`, `itemKind` and every downstream href are all derived from
  membership in that array, so slug resolution alone would have fixed the 404
  and still shown the banner. `getPublicServiceBySlug` now also returns
  `assignedDoctorIds` (the detail read stripped them, which left the merged row
  with no clinicians to offer at the doctor step).
- The pre-assessment deep link carries the pinned doctor as an **id**, and the
  wizard matched `?doctor=` on slug only — it now accepts either.

**Money, benefits and PII.**

| Was | Now |
|---|---|
| Invoice form labelled "Amount (EUR)" and prefilled the plan total, while the document was minted in the country's currency (a BR company produced `BR-00005 · R$360.00` from a €360 figure) | `computeBillingSummary` returns `documentCurrencyCode` (the company's country, the same source the document uses); the form labels that currency and **refuses the prefill**, with an explicit note, when the plan currency differs |
| Employee-side beneficiary REMOVE set status + expired the card but left invites live — the token lookup kept returning the removed person's name, company and masked email | The route delegates to `setBeneficiaryStanding`, so both sides share one removal path |
| Card verification ignored the company: a SUSPENDED company verified `valid: true` forever (the nightly sweep only matches `EXPIRED`), and a contract that ended overnight verified until the cron ran | `valid` also requires `companyIsLive` |
| "Race-safe max-N" was a comment: READ COMMITTED let 8 concurrent POSTs all read the pre-burst count (measured 8 rows on a cap of 5) | `SELECT … FOR UPDATE` on the employee row inside the transaction, with a raised interactive-transaction timeout so the queued callers do not time out against a remote DB |
| The request-only gate only READ the open request, and the `REQUESTED → BOOKED` flip was a fire-and-forget hook — two simultaneous bookings both succeeded | `claimCorporateRequest` (updateMany + status guard) runs inside the appointment's own transaction via `createAppointmentWithOptionalOwner`'s new `onCreatedInTx`; the loser gets 409. The paid-order hook claims the same way |
| A SUSPENDED employee could add beneficiaries — each one a card and a 10% discount | Beneficiary management requires an employee in good standing |
| `getActiveMembershipForUser` resolved beneficiaries without looking at the parent employee, and `setBeneficiaryStanding("REACTIVATE")` used `syncCardStatus` (an `updateMany`, silently a no-op with no card row) | The resolver requires `employee: { status: "ACTIVE" }`; REACTIVATE goes through `activateBeneficiary`, so a card always exists |
| A SUSPENDED company kept a fully working portal: employees added, invites sent and accepted, billable headcount growing | Growth actions (employee create, bulk, resend, new request) sit behind `requireLiveCompany`; `acceptInvite` refuses when the company is not live. Reads stay open |
| A pinned pre-assessment doctor was only checked when the booking named a doctor — a booking with no slot skipped it | The gate takes `bookingIntent`; booking call sites require the pin to be met. Read-only visibility checks are unaffected (they carry no doctor and must not 404) |
| `PROFILE_INCOMPLETE` was terminal: the invite form left phone/address optional, the pre-assessment gate refused, and `PATCH /api/me/corporate/profile` did not exist | The invite form requires exactly what completeness requires, and the new `PATCH /api/me/corporate/profile` (plus a form on `/account/corporate`) recomputes status — employee → `PREASSESSMENT_PENDING`, beneficiary → `activateBeneficiary` |
| Bulk upload previewed 500 rows and offered to upload them; the server caps at 200, so a 201-row paste failed with raw English Zod text and imported nothing | Client cap is the server's 200, message localised in all six locales |

**PT corporate billing is manual, by decision.** `invoicePrefix()` has no PT entry
(Portugal uses InvoiceExpress), so the Invoices tab used to render a form that
400s on submit. It now renders an explicit "issued through InvoiceExpress" state
instead. Wiring the corporate path into `pt-invoicexpress.service.ts` is a
separate piece of work with tax consequences — that service is built around
patient orders, while corporate mints synthetic ones.

**Sweep items** (read-only leads in the review, each verified before acting):
the CORPORATE_ONLY linkage hook now scopes its employee match to the booking's
country; the bookability gate takes `serviceCountryCode` so a member cannot book
another country's row of a corporate service; `resolveCorporateDiscount` filters
to GENERAL/SPECIALIST like its batch sibling; both resend-invite routes carry a
route-level rate limit; Suspend is only rendered where the transition table
allows it; the bulk-upload CSV parser is quote-aware (an address containing a
comma used to shift every later column).

**Deferred, needs the owner's number:** a per-country corporate plan row
(`corporate-standard-br` with its own `annualPricePerEmployeeCents` +
`currencyCode`). `companyInputSchema.planSlug` and the slug-keyed `CorporatePlan`
already support it with no migration. Stamping an FX rate on a fiscal document is
an audit liability and drifts against the signed contract, so the BR price has to
come from the contract, not from a conversion.

### 10.6 Third pass (2026-08-14) — scope removal, checks, end-to-end verification

**C3: the corporate subscription-invoice generator is removed.** The brief asks
the admin and corporate dashboards to *show* the annual price calculation and a
billing summary (employees × price per employee per year = total). It never asks
the platform to *issue* the company's Invoice / Receipt / Credit-note: the
company is billed offline under a signed agreement and no money moves through the
platform. That capability was self-inflicted scope and it produced three of the
second pass's worst defects — wrong currency on a fiscal document, a dead PT
path, and a buyer-identity hole. Deleting it retires them rather than guarding
them, and it retires the outstanding "BR corporate price" question with them:
there is no document left to denominate.

Production was confirmed clean first (read-only, `backend/.env`):
`order.count({ corporateCompanyId: { not: null } })` = 0 and
`invoice.count({ order: { corporateCompanyId: { not: null } } })` = 0, so no
number from a national fiscal series was ever consumed on production. (The
`BR-00005..00007` numbers spent during remediation were on the dev database.)

Removed:

- `corporate-invoice.service.ts` — `generateCorporateSubscriptionInvoice`,
  `priceCorporateInvoiceLine`, `renderAndSendCorporateInvoice`, and the
  `subscription` half of `listCorporateInvoiceDocuments`. The module is now
  purely the employees' consultation-document listing. Its query keeps a
  `corporateCompanyId: null` filter so a legacy synthetic billing order can
  never surface as a consultation document.
- `admin-corporate.route.ts` — `POST /api/admin/corporate/companies/:id/invoices`
  and its Zod schema. The `GET` listing stays behind `canReadCompany`.
- `corporate-invoice.service.test.ts` — it only covered
  `priceCorporateInvoiceLine`.
- The admin company page's "Generate document" form and "Subscription documents"
  section, **including the `currencyMismatch` refusal and the
  `ISSUED_EXTERNALLY` / InvoiceExpress PT state added during remediation** —
  both existed only to protect the generator. The tab now renders one card,
  "Employee consultation documents", which states that the company's own annual
  plan is invoiced offline under contract.
- `postCorporateInvoice` in `frontend/lib/admin/admin-api/corporate.ts`;
  `fetchCorporateInvoices` now returns `{ consultations }` only.

Kept deliberately: `documentCurrencyCode` on `computeBillingSummary` (the
settings page and company header still show a contract value in the company's own
currency); `Order.corporateCompanyId` and `CorporateCompany.subscriptionOrders`
(dropping a column buys nothing and costs a migration on a live database where
`prisma migrate dev` is known broken); and the company's postal address fields
(*company address* is a required Step 1 detail independent of invoicing — only
its printing on a fiscal document went away).

Verified: `POST .../invoices` → **404**; `GET .../invoices` → `{ consultations:
[…] }`; the rendered admin Invoices tab contains "Employee consultation
documents" and "invoiced offline under contract" and contains neither "Generate
document" nor "Subscription documents"; backend and frontend `tsc --noEmit` both
clean with the test file removed.

**Two checks on the remediation itself.**

- *`assignedDoctorIds` on a public read.* Safe, and the endpoint is not shared-
  cached. `services.route.ts` sets no `Cache-Control` on `GET /api/services/:slug`
  precisely because the response is auth-dependent; the only still-cached
  sibling, `/api/services/:slug/faqs`, returns `service.faqs` alone. Of the two
  frontend callers, `fetchServiceDetail` is the ISR path and forwards no cookie,
  so its cached entry is anonymous by construction (`allowCorporate: false` →
  PUBLIC rows only), while `fetchCorporateBookableService` is `cache: "no-store"`
  with cookies. The field itself is not new information: the ISR public
  country-services list already publishes the same ids as
  `assignedDoctors[].doctorId` (`get-country-collections.ts`).
- *`?doctor=` accepting an id.* It cannot reach an unassigned clinician:
  `SelectedServiceFlow` resolves the doctor only out of `serviceDoctors`, which
  is `doctors ∩ service.assignedDoctorIds`. But the id form did not actually
  work — that resolver matched on `doctor.slug` only, while `/api/me/corporate`
  emits `&doctor=<Doctor.id>`, so the pin was silently dropped and the employee
  landed in the generic time-then-doctor flow. **Fixed**: the lookup now accepts
  slug or id, matching the page-level resolver.

**Verification pass that A1 unblocked** — run against the dev database and the
running dev server, each with an assertion harness:

| What | Result |
|---|---|
| Real checkout, `benefitSource: "CORPORATE"` (Stripe test card, then `POST /api/payments/sync-order`) | 25% of €39.00 applied: order `ORD-000191` total **€29.25**, `OrderItem.corporateDiscountCents` **975**, `corporateCompanyId` stamped; invoice **IE-00177** (`INVOICE_RECEIPT`) built by `buildInvoicePdfData` at **€29.25**; appointment created |
| `me-cart-preview.route.ts` corporate path | `corporateDiscount { percent: 25, amountCents: 975 }`, `totalFinalCents` 2925 |
| Cart-add gate, all three corporate services | anon → **404** "Sign in to book this service" (×3); non-corporate patient and ACTIVE employee → **403** on pre-assessment; employee with no open request → **403** on illness-benefit and fit-for-work; employee **with** an open request clears the visibility gate (falls through to the 400 for a missing slot) |
| Admin manual booking (**U2**) | Charges the **full** €39.00 — `discountPercent`/`discountCents` null, `corporateDiscountCents` null. `manual-booking.service.ts` reads the corporate benefit engine nowhere; its only corporate references are the lifecycle hook and a comment about the same net-price convention. **No contradiction with the brief** — the discount does not apply outside the platform |
| Corporate lifecycle hook on the manual-booking path | Admin booking of the CORPORATE_ONLY pre-assessment advanced the employee `PROFILE_COMPLETE → PREASSESSMENT_BOOKED` with `preAssessmentAppointmentId` set |
| Doctor-portal corporate badge (`doctor.route.ts`) | The queue row for that appointment carries `corporateFlow: "PRE_ASSESSMENT"` |
| **U1 / criterion 17** — Corporate Standard on the public pricing page | Zero occurrences of "corporate" in the served HTML of `/{ie/en, pt/pt, br/pt, es/es, cz/cs, ro/ro}/pricing` |
| Email templates | All seven corporate emails rendered through the real `sendEmail` path (captured via `setEmailCaptureHook`): member invite (employee + beneficiary reminder), admin invite, request, card-activated, membership-status, company notice. Full shell, non-empty text alternative, company name HTML-escaped |
| Mobile + the four non-EN/PT locales | `/account/corporate` at 375×812 in ES, CS, RO and DE: content translated, `documentElement.scrollWidth === 375` (no horizontal overflow) in every one |

Two cosmetic findings from that pass, not fixed here: the portal shell keeps
`<html lang="en">` whatever locale it renders, and the corporate page's
breadcrumb title ("Corporate") and the company status pill ("ACTIVE") stay
untranslated.

One deliberate behaviour worth naming: the cart-add gate answers **404** to an
anonymous caller but **403** with a specific message to a signed-in non-corporate
patient (`reply.status(corporateUserId ? 403 : 404)`). That is an existence
oracle for any logged-in user. It is intentional — an eligible-looking member
needs to know *why* — but it is a deviation from the "same 404 as a nonexistent
slug" rule the rest of the gate follows.

**Step 1 is inverted, and the brief is amended to match the build.** The brief
has the corporate user log in, enter company details, then add employees. The
implementation has a platform admin create the company
(`POST /api/admin/corporate/companies`) and invite the CORPORATE_ADMIN, who can
then only edit what exists; there is no corporate self-onboarding path.
**Decision (2026-08-14): keep the implemented flow and amend the brief.** A
corporate plan is a contracted B2B agreement at €180/employee/year — nobody
should be able to self-provision one, and the admin-provisioned path is the
correct design for it. No self-registration route is planned. This supersedes the
brief's Step 1 wording.

---

## 11. Coverage model — the 7-plan matrix (2026-08-17)

The commercial plan range is seven plans (Basic, Basic +, Standard, Standard +,
Premium, Premium +, Premium ++), each sold at a price per employee per year, and
each column of the matrix marks a benefit as included (✓), excluded (✕) or
subject to a fixed co-pay (€20 general consultation on the Premium tier, €40
physiotherapy/chiropractic up to 5× on Premium ++). The v1 engine could express
only a percentage discount, so three of those four states had no representation.

### 11.1 Decisions

1. **A plan is bought by the COMPANY, for all of its employees.** Employees are
   not individually assignable to different plans. `CorporateCompany.planId`
   already models this and did not change. A company that genuinely needs two
   plans becomes two company records.
2. **A co-pay is a fixed price override, not a discount.** The member pays
   exactly the co-pay whatever the service costs; the plan absorbs the rest,
   recorded on `OrderItem.corporateDiscountCents` for reconciliation only —
   nothing is billed to the company for it (the annual per-employee fee is
   billed offline).
3. **The comparison matrix is sales content; the database stores only rules that
   fire at pricing time.** The four non-bookable rows (operational activities,
   health data management, corporate reporting, follow-up & monitoring) are
   service commitments with nothing to price, and an EXCLUDED row would be a row
   that does nothing — the ABSENCE of a rule is exclusion.
4. **Annual limits are enforced**, by counting order lines rather than running a
   balance.

### 11.2 Schema

```prisma
enum CorporateCoverage { INCLUDED  COPAY  DISCOUNT }

model CorporateBenefitRule {
  coverage    CorporateCoverage @default(DISCOUNT)
  copayCents  Int?      // COPAY only, in the PLAN's currency
  annualLimit Int?      // null = unlimited
  limitGroup  String?   // rules sharing a group share ONE counter
}
model CorporatePlan { tier String?  sortOrder Int  priceNote String? }
model OrderItem     { corporateBenefitRuleId String? }
```

Migration `20260817180000_corporate_coverage_rules` — additive only; every
existing rule keeps its behaviour because `DISCOUNT` is the enum default.

`tier` / `sortOrder` exist because the range is **not monotonic in price**
(Basic + at €350 sits above Standard at €180), so nothing can be ordered by
price. `priceNote` carries the "pending due to season delays" footnote.

### 11.3 Pricing rules (`corporate-benefit.service.ts`)

- `memberPriceCents()` — INCLUDED → 0; COPAY → `min(copayCents, base)`;
  DISCOUNT → percentage. **The co-pay is clamped to the list price**: a €20
  co-pay on a €15 service charges €15. Charging a member more than the public
  price because their employer bought them a benefit is the one outcome this
  must never produce.
- `pickRule()` — a rule pinned to the exact service still beats a kind rule
  (unchanged). What is new is that a tier can hold several rules, so **within a
  tier the best member price wins**. That is what lets a Premium plan carry both
  the sitewide 15% employee-benefit-program row and a €20 co-pay row on GENERAL:
  the co-pay wins at €39–60, and on a service cheaper than €20 the co-pay stops
  being a benefit and the 15% takes over instead of the member losing coverage.
  Selecting by array order would make the price depend on row insertion order.
- A rule that leaves the member at full price is not a match, so it never burns
  an annual-limit use for nothing.

### 11.4 Annual limits — counted, not balanced

`OrderItem.corporateBenefitRuleId` is stamped whenever a rule priced the line
(including when it saved nothing), and the counter is
`SUM(quantity)` over those lines for the member's user, inside the company's
current contract year (`contractStartAt` anniversary), excluding CANCELLED and
REFUNDED orders.

No balance row, no ledger, no release path: **cancelling or refunding an order
gives the use back by itself**, which is the property the membership allowance
system needs an expiry job to emulate. PENDING orders count — an unpaid checkout
is holding the use, and the 15-minute pay window cancels it if it never pays.

Two known ceilings, both marked `ponytail:` in the code:
- concurrent checkouts racing for the last covered visit can both pass (the read
  is not locked). Cost: one extra covered consultation, never money charged to
  the member.
- in-cart allocation counts one use per line while history counts `quantity`;
  consultation lines are quantity 1 in every flow that reaches the resolver.

An exhausted rule is removed BEFORE tiering, so the member falls through to the
next-best rule (15%) rather than to full price.

Limits do NOT apply to `CorporatePlanService` bookings — those carry no price
and no order line, so there is nothing to count.

### 11.5 What was seeded, and what admins must still configure

`seed-corporate-plan.ts` now seeds all seven plans (prices, tier, matrix order,
price notes), the 15% employee-benefit-program row on every plan, and the €20
GENERAL co-pay on the three Premium plans. `corporate-standard` keeps its slug —
it is the plan already live in production.

Not seeded, and why:
- pre-assessment / occupational / fit-for-work / illness-injury rows are
  `CorporatePlanService` consultations, each naming one delivering doctor per
  market — an admin decision the script cannot make;
- the physiotherapy / chiropractic €40 co-pay (5 per year, shared limit group)
  must be pinned to specific Service rows, because a kind-wide SPECIALIST rule
  would co-pay cardiology too. **Physiotherapy exists**
  (`physiotherapy-specialist-consultation`, `nutrition-specialist-consultation`);
  **chiropractic has no Service row in any market** and must be created first;
- legal health tests: the price is still pending, and the engine deliberately
  covers GENERAL/SPECIALIST consultations only.

### 11.6 Still open (needs a business answer)

1. Chiropractic services — create per country, or leave the matrix row as
   sales-only copy?
2. The 5-visit cap counts **per member** (a beneficiary spends their own),
   not per employee household. Confirm.
3. Currency: plans are priced in EUR with one price each, but companies exist in
   CZ/RO. The co-pay is denominated in the plan's currency; per-country plan
   pricing is not modelled.
4. Row-to-service mapping for "Online Consult (Occup./Prof.)", "Fit-for-work",
   "Illness/Injury Benefit" and "Legal Health Tests", per country.
5. The employee benefit program is seeded as 15% on GENERAL only. Extending it
   to chiropractic / nutrition / physiotherapy needs pinned SPECIALIST rules —
   a kind-wide SPECIALIST row would discount every specialty.
