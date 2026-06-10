# Patient Portal Expansion — Parallel Agent Implementation Plan

**App:** MyGlobalHealth telemedicine (monorepo: `backend/` Express + Prisma + Postgres, `frontend/` Next.js App Router)
**Author:** Planning pass, 2026-06-10
**Goal:** Ship 12 patient/doctor/admin features. This plan is structured so **multiple agents run in parallel** with minimal merge collisions.

---

## 0. How to read this plan

The original spec listed 10 sequential phases (all DB models first, then features). That serializes everything behind one schema file and is slow for parallel agents.

This plan instead uses **one blocking schema wave** followed by **independent vertical tracks**. Each track = one agent = one feature slice (DB usage + backend route + frontend + admin), with an explicit **file-ownership list** and **collision warnings** so two agents never edit the same file at the same time.

```
WAVE 0 (1 agent, BLOCKING)      →   WAVE 1 (8 agents, PARALLEL)   →   WAVE 2 (2 agents)
schema + migration + GHN gen        A B C D E G H I                   F (access log) + QA/integration
```

> **Hard rule for every agent:** Do **not** edit `backend/prisma/schema.prisma` or `backend/src/db/ensure-schema.ts` after Wave 0. All schema is landed in Wave 0. If you discover a missing column, request a Wave-0 amendment — do not add it yourself, or you will collide with another track.

---

## 1. Decisions (locked for this plan)

**Confirmed:**
- Global Health Number (GHN) generated **immediately at patient registration**.
- Dual nationality **only** → max **2** nationality/document records per patient.
- Monthly subscriptions via **Stripe recurring payments**.
- Trustpilot review is a **reminder/link only** — no internal review tracking.

**Deferred (do NOT block on these — build flexible data, wire behavior later):**
- ID verification manual vs automated → store status enum + nullable reviewer fields; no automation now.
- Insurance optional vs required → fields **optional** for now.
- GDPR withdrawal auto-blocking → **store consent history only**, no service blocking.

---

## 2. What already exists (reuse — do NOT rebuild)

Grounded in the current `backend/prisma/schema.prisma` and routes:

| Concern | Existing asset | Implication |
|---|---|---|
| Doctor languages | `Doctor.languages String[]` already present | Track I = admin assign UI + booking filter only, **no new model** |
| Service ↔ doctor filter | `ServiceDoctor` M:N join (status/sortOrder) | Language booking filter builds on this join |
| One-time payments | `Payment` (Stripe, per-appointment) + `ProcessedWebhookEvent` idempotency ledger | Billing track reads these; subscription track adds recurring |
| Audit trail | `AuditLog` (`AuditAction` enum, entityType/entityId, actorRole) | Medical-access-log track extends this enum + adds patient-facing read |
| Doctor docs | `AppointmentDocument` (S3 `storageKey`), `GeneratedDocument`, `MedicalNote`, `ExamResult`, `Prescription` | Medical-files track adds patient upload + `visibleToPatient` flag |
| FAQ | `Faq` model exists but is **country/locale-scoped, not service-linked** | FAQ track adds `serviceId` (decision below) |
| Patient record | `PatientProfile` keyed on **`email`** (optional `userId`); gov IDs **already encrypted** (commit H18) | All new patient fields hang off `PatientProfile`; respect existing encryption pattern |
| Review invites | `ReviewInvite` model + `review-invites.route.ts` + `reviews-config.route.ts` | Trustpilot track reuses config/locale; does not add tracking |
| Roles | `UserRole = PATIENT \| ADMIN \| DOCTOR`; `User.emailVerifiedAt` exists | Email-verified status already derivable |

**Existing routes** (`backend/src/routes/`): `account-profile.route.ts`, `account-payments.route.ts`, `account-prescriptions.route.ts`, `account-appointments.route.ts`, `admin-patient-profile.route.ts`, `admin-services.route.ts`, `services.route.ts`, `doctors.route.ts`, `payments.route.ts`, `appointment-documents.route.ts`, `patient-upload.route.ts`, `doctor-patient-documents.route.ts`, `exam-results.route.ts`, `consultations.route.ts`, `admin-doctors.route.ts`.

**Frontend route groups** (`frontend/app/`): `(site)`, `(auth)/account`, `(admin)`, `(doctor)`, `api`.

---

## 3. WAVE 0 — Schema + GHN (BLOCKING, single agent)

**Owner:** 1 agent. **Everyone else waits for this to merge.** Goal: land every model/column/enum in **one migration** so the schema file has a single author.

### 3.1 Files this agent owns (exclusive)
- `backend/prisma/schema.prisma`
- `backend/src/db/ensure-schema.ts`
- `backend/prisma/migrations/<new>/migration.sql`
- `backend/src/lib/global-health-number.ts` (new — GHN generator)
- `backend/src/routes/auth.route.ts` (registration hook — GHN issue) ⚠️ small surgical edit only

### 3.2 Models / columns to add

**`PatientProfile` additions:**
```prisma
globalHealthNumber       String?   @unique   // GH-2026-000001, issued at registration
insuranceProviderName    String?
insurancePolicyNumber    String?
insuranceDocumentKey     String?             // S3 storageKey, not public URL
idVerificationStatus     VerificationStatus  @default(NOT_VERIFIED)
phoneVerificationStatus  VerificationStatus  @default(NOT_VERIFIED)
emailVerificationStatus  VerificationStatus  @default(NOT_VERIFIED) // mirror User.emailVerifiedAt
idDocumentKey            String?             // S3 storageKey for uploaded ID
idVerificationReviewedBy String?             // nullable — supports manual OR automated later
idVerificationReviewedAt DateTime?
stripeCustomerId         String?   @unique
```
> Apply the **same field-level encryption** used for `nationalIdNumber`/`passportNumber` (H18) to `insurancePolicyNumber`. GHN is an identifier, not a secret — leave plaintext + unique index for admin search.

**New enum:**
```prisma
enum VerificationStatus { NOT_VERIFIED PENDING VERIFIED REJECTED }
```

**New models:**
```prisma
model ServiceFaq {
  id        String   @id @default(cuid())
  serviceId String
  question  String
  answer    String
  sortOrder Int      @default(0)
  isVisible Boolean  @default(true)
  service   Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([serviceId, isVisible, sortOrder])
}

model PatientNationalityDocument {
  id                 String             @id @default(cuid())
  patientProfileId   String
  globalHealthNumber String?
  nationalityCountry String
  documentType       String
  documentNumber     String?            // encrypt (reuse H18 pattern)
  frontFileKey       String?            // S3 storageKey
  backFileKey        String?
  expiryDate         DateTime?
  verificationStatus VerificationStatus @default(NOT_VERIFIED)
  patientProfile     PatientProfile     @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  @@index([patientProfileId])
  // Max-2 enforced in service layer + a count guard; see Track D.
}

model MedicalDocument {
  id                   String   @id @default(cuid())
  patientProfileId     String
  globalHealthNumber   String?
  uploadedByUserId     String?
  uploadedByRole       String   // PATIENT | DOCTOR | ADMIN
  documentType         String   // REPORT | EXAM_REQUEST | EXAM_RESULT | CONSULT_SUMMARY | OTHER
  title                String
  description          String?
  fileKey              String   // S3 storageKey
  mimetype             String
  byteSize             Int
  relatedAppointmentId String?
  relatedConsultationId String?
  visibleToPatient     Boolean  @default(false)
  patientProfile       PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  @@index([patientProfileId, documentType])
  @@index([relatedAppointmentId])
}

model PatientConsent {
  id                 String   @id @default(cuid())
  patientProfileId   String
  globalHealthNumber String?
  consentType        String   // STORE_MEDICAL | SHARE_WITH_DOCTOR | NOTIFICATIONS | FOLLOW_UP | THIRD_PARTY_LAB | MARKETING
  consentValue       Boolean
  consentVersion     String?
  source             String   // PATIENT_PORTAL | ADMIN | SYSTEM
  patientProfile     PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  createdAt          DateTime @default(now())   // append-only history; latest row per type = current
  @@index([patientProfileId, consentType, createdAt])
}

model PatientSubscription {
  id                   String   @id @default(cuid())
  patientProfileId     String
  globalHealthNumber   String?
  stripeCustomerId     String
  stripeSubscriptionId String   @unique
  planId               String
  status               String   // active | trialing | past_due | canceled | incomplete
  cancelAtPeriodEnd    Boolean  @default(false)
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?
  patientProfile       PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  @@index([patientProfileId])
}

model MedicalAccessLog {
  id                   String   @id @default(cuid())
  patientProfileId     String
  globalHealthNumber   String?
  accessedByUserId     String?
  accessedByRole       String   // DOCTOR | ADMIN | SUPER_ADMIN | STAFF | PATIENT
  accessedResourceType String   // MEDICAL_DOC | CONSULT_NOTE | PRESCRIPTION | EXAM_REQUEST | EXAM_RESULT | ID_DOC | NATIONALITY_DOC | SENSITIVE_PROFILE
  accessedResourceId   String?
  accessAction         String   // VIEWED | DOWNLOADED | UPDATED
  accessReason         String?
  relatedAppointmentId String?
  patientProfile       PatientProfile @relation(fields: [patientProfileId], references: [id], onDelete: Cascade)
  createdAt            DateTime @default(now())   // read-only; never updated/deleted by app code
  @@index([patientProfileId, createdAt])
}
```

> **`ServiceFaq` vs reusing `Faq`:** chose a dedicated `ServiceFaq` model. Existing `Faq` is country/locale/placement-scoped global FAQ; bolting `serviceId` onto it muddies two concerns. New model is cleaner and isolates Track A.

> **Doctor languages:** no schema change — `Doctor.languages String[]` already exists. (If admin needs a managed master list later, add a `Language` lookup table in a follow-up; not in scope.)

### 3.3 GHN generation
- New `backend/src/lib/global-health-number.ts`: format `GH-<YEAR>-<zero-padded-sequence>` (e.g. `GH-2026-000001`).
- Issue inside the **registration transaction** in `auth.route.ts` so it is atomic and permanent. Use a DB sequence or `SELECT ... FOR UPDATE` counter to guarantee uniqueness; do **not** rely on `count()+1` (race).
- Backfill existing `PatientProfile` rows in the migration.
- GHN is **never** editable via any patient/admin write path.

### 3.4 Wave 0 acceptance
- [ ] Migration applies clean on a fresh DB and on a copy of prod data (existing profiles backfilled with GHN).
- [ ] `ensure-schema.ts` updated to match.
- [ ] New patient registration issues a unique GHN atomically.
- [ ] `prisma generate` + backend `tsc` pass. Branch merged to base before Wave 1 starts.

---

## 4. WAVE 1 — Parallel tracks (8 agents)

Each track is a self-contained branch. **File-ownership lists are exclusive** — if a file appears under two tracks, the ⚠️ note says who owns it and how the other coordinates.

### Track A — Service FAQ
**Spec ref:** §1. **Models:** `ServiceFaq`.
**Backend files (own):** `backend/src/routes/admin-services.route.ts` (add FAQ sub-resource CRUD + reorder), `backend/src/routes/services.route.ts` (public read: visible FAQs only), `backend/src/validations/` (new FAQ schema), `backend/src/services/service-faq.service.ts` (new).
**Frontend files (own):** `frontend/app/(admin)/.../services/[id]/` FAQ management panel, `frontend/app/(site)/` service detail page FAQ section component.
**Endpoints:** `GET/POST/PATCH/DELETE /admin/services/:id/faqs`, `PATCH /admin/services/:id/faqs/reorder`, public `GET /services/:slug` includes `faqs` (filtered `isVisible=true`, ordered by `sortOrder`).
**Acceptance:** per-service FAQ CRUD + reorder + visibility in admin; public page shows only visible FAQs; **section hidden entirely when zero visible FAQs**.

### Track B — Billing / Invoices (read + downloads)
**Spec ref:** §2. **Models:** `Payment` (read), `Order`, `Appointment` (read).
**Backend files (own):** `backend/src/routes/account-payments.route.ts` (extend), `backend/src/routes/admin-payments.route.ts` (new or extend admin view), `backend/src/services/stripe-receipt.service.ts` (new — fetch Stripe receipt URL / invoice PDF link).
**Frontend files (own):** `frontend/app/(auth)/account/billing/` payments + invoices page.
⚠️ **Collision:** does **not** touch `payments.route.ts` webhook — that is Track C. Read payment rows only.
**Logic:** one-time appointment → Stripe **receipt** link; subscription invoices come from Track C's data once available (degrade gracefully if Track C not merged: show appointment payments only). Missing invoice → render `Invoice not available yet`, **never a broken button**.
**Security:** scope every query by authenticated `userId` → `PatientProfile` → GHN. Never expose another patient's payment. Admin path separately gated.
**Acceptance:** patient sees payment history (service, doctor, date, amount, currency, status, method summary), downloads available receipts/invoices, ownership-enforced.

### Track C — Stripe Subscription + webhooks
**Spec ref:** §9. **Models:** `PatientSubscription`, `PatientProfile.stripeCustomerId`.
**Backend files (own):** `backend/src/routes/subscriptions.route.ts` (new), `backend/src/routes/payments.route.ts` (⚠️ **owns the Stripe webhook handler** — adds `customer.subscription.*` + `invoice.payment_*` cases alongside existing one-time handling), `backend/src/services/stripe-subscription.service.ts` (new).
**Frontend files (own):** `frontend/app/(auth)/account/subscription/` plan page (+ "Open Stripe Customer Portal" button if used).
**Webhooks:** `customer.subscription.created|updated|deleted`, `invoice.payment_succeeded|failed`. Dedupe via existing `ProcessedWebhookEvent` ledger.
⚠️ **Coordination with B:** C writes subscription rows + invoice links; B reads them. Agree the read shape (a `getSubscriptionInvoices(patientProfileId)` service export) before both merge.
**States to render:** active / trialing / past_due / cancel-at-period-end / canceled / incomplete, with the spec's copy for active / payment-failed / canceled.
**Acceptance:** patient views/upgrades/downgrades/cancels/reactivates plan; status syncs via webhook; Stripe customer linked to `PatientProfile`.

### Track D — Patient profile: GHN + Insurance + Verification + Dual Nationality
**Spec ref:** §3, §4, §5 (display), §6. **Models:** `PatientProfile` (new cols), `PatientNationalityDocument`.
**Backend files (own):** `backend/src/routes/account-profile.route.ts` (extend: insurance read/write, verification status read, ID upload, nationality CRUD), `backend/src/routes/admin-patient-profile.route.ts` (extend: admin view + update verification status, GHN search), `backend/src/routes/patient-upload.route.ts` (⚠️ extend for ID/nationality/insurance doc upload to S3 — **Track D owns this file**), `backend/src/services/patient-nationality.service.ts` (new, enforces **max-2** with a count guard + unique check).
**Frontend files (own):** `frontend/app/(auth)/account/profile/` **tabbed shell** + Personal / Insurance / Verification / Dual Nationality tabs. GHN displayed read-only here.
⚠️ **Collision with Track G:** D builds the profile tab shell. G mounts its **GDPR tab** as a self-contained component into D's shell. Define the tab-registration contract early (D exports the shell; G provides `<GdprPreferencesTab/>`).
⚠️ **Collision with Track F:** every sensitive read (ID doc, nationality doc, sensitive profile) must emit a `MedicalAccessLog`. D exposes the read endpoints; **F injects the logging** (Wave 2). D should call a `logAccess()` stub that F implements — agree the signature now.
**Rules:** verification fields not patient-editable (admin-only status updates); ID/nationality/insurance docs stored as S3 `storageKey` (never public URL); "Add nationality" hidden/disabled at 2 records with message `You can register a maximum of two nationality documents.`
**Acceptance:** GHN shown in patient + admin + doctor views; insurance section editable; verification status cards (email/phone/ID with NOT_VERIFIED/PENDING/VERIFIED); ID upload; ≤2 nationality docs; admin GHN search works.

### Track E — Medical files + exam requests + patient upload + visibility
**Spec ref:** §10. **Models:** `MedicalDocument`, reuse `ExamResult`/`Prescription`/`GeneratedDocument`/`AppointmentDocument` (read).
**Backend files (own):** `backend/src/routes/appointment-documents.route.ts` (extend: `visibleToPatient`), `backend/src/routes/doctor-patient-documents.route.ts` (extend: doctor upload results + exam-request docs), `backend/src/routes/exam-results.route.ts` (extend if needed), new `backend/src/routes/medical-documents.route.ts` (patient upload + patient list/download, ownership-scoped), `backend/src/services/medical-document.service.ts` (new).
**Frontend files (own):** `frontend/app/(auth)/account/medical-files/` (uploaded reports / doctor results / exam requests / prescriptions / consult summaries tabs); `frontend/app/(doctor)/.../` doctor upload + create-exam-request UI + visibility toggle.
⚠️ **Collision with Track F:** every view/download of a medical doc must emit `MedicalAccessLog`. Same `logAccess()` contract as Track D. E exposes endpoints; F wires logging in Wave 2.
**Doc types:** PDF/JPG/PNG/DOC(X) per existing upload validation. Each doc stores patient/GHN/uploader/role/type/title/fileKey/relatedAppointment/relatedConsultation/visibleToPatient.
**Exam request flow:** doctor creates exam-request doc → appears under patient's exam requests → patient downloads.
**Security:** patient sees own + `visibleToPatient=true` only; doctor restricted to authorized appointments; signed/short-lived S3 URLs for download.
**Acceptance:** patient uploads + downloads own reports; doctor uploads results + creates downloadable exam requests; visibility enforced; downloads go through access-checked signed URLs.

### Track G — GDPR consent preferences
**Spec ref:** §8. **Models:** `PatientConsent`.
**Backend files (own):** `backend/src/routes/consents.route.ts` (new: patient read latest + update; append-only history), `backend/src/routes/admin-patient-profile.route.ts` ⚠️ **read-only consent-history view** — Track D owns this file, so G provides a `getConsentHistory()` service and D mounts it, OR G adds a separate `admin-consents.route.ts` (preferred to avoid the collision).
**Frontend files (own):** `<GdprPreferencesTab/>` component mounted into Track D's profile shell + Privacy section.
**Logic:** every change appends a row (patientProfileId, GHN, type, value, version, source, timestamp); latest row per type = current state. **No service blocking** (deferred). Six consent types per spec.
**Acceptance:** patient views/updates consents with last-updated + explanation; full history stored; admin can view history.

### Track H — Trustpilot reminder/link
**Spec ref:** §11. **Models:** none (reuse `Consultation`/`Appointment` completed state, `ReviewInvite`/`reviews-config` for the Trustpilot URL/locale).
**Backend files (own):** none new likely — expose `consultationCompletedAt` on existing account/consultation read endpoints if not already present (coordinate: read-only addition).
**Frontend files (own):** `frontend/app/(auth)/account/` dashboard CTA component + completed-consultation detail CTA. Optional email reminder only if hooking existing notification flow (don't build new email infra).
**Logic:** show Trustpilot CTA for **3 days after `consultationCompletedAt`** (COMPLETED only); hide after. Never show for cancelled/no-show/pending. External link only — **no internal review tracking**.
**Acceptance:** CTA appears on dashboard + completed consult page for 3 days post-completion, links to official Trustpilot, hidden otherwise.

### Track I — Consultation language selection in booking
**Spec ref:** §12. **Models:** `Doctor.languages` (exists), `ServiceDoctor` (exists).
**Backend files (own):** `backend/src/routes/doctors.route.ts` (⚠️ extend public doctor list to filter by `service + language + availability`), `backend/src/routes/admin-doctors.route.ts` (⚠️ extend doctor edit to manage `languages` array). If these files are large, scope edits to the language-filter handler only.
**Frontend files (own):** booking flow page(s) under `frontend/app/(site)/` — add language dropdown after service select; doctor cards show `Languages: …`; admin doctor edit language multi-select.
**Filter logic:** patient picks service → picks language → list = doctors assigned to service (`ServiceDoctor.status=active`) **AND** `language ∈ Doctor.languages` **AND** has available slots. Hide unavailable doctors.
**Acceptance:** language dropdown in booking; doctors filtered by service + language + availability; languages shown on cards; admin manages doctor languages.

---

## 5. WAVE 2 — Cross-cutting + integration (2 agents)

### Track F — Medical Access History (depends on D + E read endpoints)
**Spec ref:** §7. **Models:** `MedicalAccessLog`.
**Why Wave 2:** F must wrap the sensitive-read endpoints that D and E create. Landing it after them avoids editing their files mid-flight.
**Backend files (own):** `backend/src/lib/access-log.ts` (new — implements the `logAccess()` contract D & E stubbed), `backend/src/middleware/` access-logging wrapper, `backend/src/routes/account-access-log.route.ts` (new — patient read-only own log). May add small log-call lines into D/E endpoints **after** they merge.
**Frontend files (own):** `frontend/app/(auth)/account/access-history/` (or Privacy → Medical Access History tab).
**Logged events:** medical doc/report/prescription/exam-request/exam-result viewed|downloaded, consult note viewed, sensitive profile / ID / nationality accessed.
**Patient view shows:** who (name), role, datetime, resource type, related appointment/consult, action, reason.
**Rules:** patient sees **own** log only; logs **read-only** (no update/delete path); not editable by normal admins.
**Acceptance:** every sensitive view/download writes a log; patient sees their own access history; logs immutable.

### Track QA — Integration, permissions matrix, E2E
- Verify the **permissions matrix** (spec §"Permissions and Security Rules") end-to-end: patient can't reach another patient's records/GHN/logs; doctor only sees authorized patients; admin sensitive actions audit-logged.
- Wire the unified **patient portal nav** (Dashboard / Appointments / Medical Files / Exam Requests / Payments / Subscription / Profile{Personal,Insurance,Verification,Nationality,GDPR} / Access History) — tabs vs pages per spec's suggested structure.
- Playwright E2E for the headline flows; visual check key breakpoints (320/768/1024/1440).
- Confirm 80% coverage target on new service-layer code.

---

## 6. Dependency graph

```
Wave 0 (schema+GHN) ── must merge first ──┐
                                          ▼
   ┌──────── PARALLEL (Wave 1) ─────────────────────────────┐
   │  A FAQ      B Billing ◄────reads──── C Subscription      │
   │  D Profile  E MedicalFiles  G GDPR(tab→D)  H Trustpilot  │
   │  I Language                                              │
   └──────────────────────┬──────────────────────────────────┘
                          ▼
   Wave 2:  F Access-Log (wraps D+E reads)   →   QA / integration / E2E
```

**Critical coordination contracts to agree before coding (so parallel works):**
1. `logAccess(params)` signature — owned by F, **stubbed by D & E** in Wave 1.
2. `getSubscriptionInvoices(patientProfileId)` — owned by C, **consumed by B**.
3. Profile tab-shell registration — owned by D, **GDPR tab provided by G**.
4. Stripe webhook handler in `payments.route.ts` — **owned by C only**; B stays read-only.

---

## 7. Shared conventions (every track)

- **GHN propagation:** include `globalHealthNumber` on every new patient-linked row (it's denormalized onto the new models intentionally) and surface it in patient/admin/doctor views + invoice metadata where relevant.
- **File storage:** sensitive docs stored as **S3 `storageKey`** (mirror `AppointmentDocument`), never a public URL. Downloads via short-lived signed URLs behind an access check.
- **Encryption:** reuse the H18 field-encryption pattern for new secret-grade fields (`insurancePolicyNumber`, `documentNumber`). GHN stays plaintext (it's a searchable identifier).
- **Audit vs access-log:** `AuditLog` = admin/clinician mutations (existing). `MedicalAccessLog` = patient-facing "who saw my data" (new). Don't conflate.
- **Ownership scoping:** every patient read path resolves `auth userId → PatientProfile → GHN`; never trust a client-supplied patient id.
- **Immutability:** consent + access-log tables are append-only / read-only; no update or delete code paths.
- **Branch naming:** `feat/track-<letter>-<slug>` per agent; small focused commits; conventional-commit messages.
- **Per-track gate:** backend `tsc` + lint + new unit tests green before opening PR.

---

## 8. Final acceptance criteria (whole epic)

- [ ] Each service page shows service-specific FAQs; empty/hidden → section gone (A).
- [ ] Admin manages FAQs per service (A).
- [ ] Patient views payment history + downloads available receipts/invoices; ownership-enforced (B).
- [ ] Patient manages Stripe monthly subscription; status syncs via webhook (C).
- [ ] Patient profile has insurance fields + ID/phone/email verification status + ID upload (D).
- [ ] GHN generated at registration; appears across patient/admin/doctor/records; admin can search by it (Wave 0 + D).
- [ ] Patient adds **max 2** nationality docs (D).
- [ ] Patient uploads medical reports; doctor uploads results + creates downloadable exam requests; visibility enforced (E).
- [ ] Patient manages GDPR consents; full history stored; admin views history (G).
- [ ] Trustpilot reminder/link shows for 3 days after completed consult only (H).
- [ ] Patient selects consultation language; doctors filtered by service + language + availability; languages on cards (I).
- [ ] Patient sees who accessed their medical info + when; logs read-only (F).
- [ ] Permissions matrix holds end-to-end; sensitive admin actions audit-logged (QA).
