# MyGlobalHealth — Feature Implementation Plan (Sprint Edition)

**App:** MyGlobalHealth / Global Health telemedicine — monorepo
(`backend/` Express + Prisma + Postgres, `frontend/` Next.js App Router).
**Author:** Planning pass, 2026-06-10.
**Goal:** Ship the patient / doctor / admin / service-page / GDPR / document / booking / portal feature set defined in the product spec, organized into **sequential sprints** with explicit deliverables, dependencies, and acceptance gates.

> **Companion document:** [`patient-portal-expansion-plan.md`](./patient-portal-expansion-plan.md) covers the *same* feature set organized for **parallel agents** (one blocking schema wave + independent vertical tracks). Use that document when you want to fan work out across many agents. Use **this** document when you want a phased, sequential, dependency-ordered delivery roadmap. The two are kept consistent — schema, models, and contracts are identical between them.

---

## 0. Locked product decisions (do not re-litigate)

| # | Decision | Implementation rule |
|---|----------|---------------------|
| 1 | **Global Health Number** | Generated immediately at patient registration (not after ID verification). Format `GH-YYYY-000001`. Unique, permanent, never reused, never editable. |
| 2 | **Nationality / documents** | **Dual nationality only** — max **2** records per patient (slot 1 + slot 2). No unlimited support. |
| 3 | **Trustpilot reviews** | Reminder/link only. **Do not** store whether the patient actually reviewed. |
| 4a | **ID verification** | Support document upload + admin status management. **No automated verification** integration yet. |
| 4b | **Insurance** | Fields exist but are **optional** — must not block registration or booking unless existing logic already requires it. |
| 4c | **GDPR withdrawal** | Save + audit consent changes. **No automatic service blocking** yet (notify/flag admin only). |
| 4d | **Email/phone verification** | Wire status to existing email-verification flow if present; otherwise add the status field and prepare for future OTP. |

---

## 1. Grounding — what already exists (verified against `backend/prisma/schema.prisma`)

Reuse these. Do **not** rebuild.

| Concern | Existing asset (schema line) | Implication for this plan |
|---|---|---|
| Patient record | `PatientProfile` (`schema.prisma:1031`), keyed on `email`, optional `userId`; gov IDs **already field-encrypted** (commit `f319130b`, H18) | All new patient fields hang off `PatientProfile`; reuse the existing encryption helper for new secret-grade fields |
| Roles + email verify | `UserRole = PATIENT \| ADMIN \| DOCTOR`; `User.emailVerifiedAt` (`schema.prisma:1432`) | Email-verified status is already derivable |
| Doctor languages | `Doctor.languages String[]` (`schema.prisma:308`) | **No new language model needed** — Sprint 7 = admin UI + booking filter only |
| Service ↔ doctor | `ServiceDoctor` M:N join, status/sortOrder (`schema.prisma:634`) | Language booking filter builds on this join |
| One-time payments | `Payment` (`schema.prisma:1393`) + `ProcessedWebhookEvent` idempotency ledger (`schema.prisma:1413`) + `Order`/`OrderItem` | Billing sprint reads these |
| Audit trail | `AuditLog` + `AuditAction` enum (`schema.prisma:1844`, `:148`) | **Distinct** from the new patient-facing `MedicalAccessLog` — do not conflate |
| Doctor docs | `AppointmentDocument` (S3 `storageKey`, `schema.prisma:1869`), `GeneratedDocument`, `MedicalNote`, `ExamResult`, `Prescription`, `Consultation` | Medical-files sprint adds patient upload + `visibleToPatient` flag |
| Global FAQ | `Faq` (`schema.prisma:1527`) is **country/locale/placement-scoped, not service-linked** | Add a **dedicated `ServiceFaq`** model — do not overload `Faq` |
| Review invites | `ReviewInvite` (`schema.prisma:1143`) + `review-invites.route.ts` + `reviews-config.route.ts` | Trustpilot sprint reuses the config/locale URL; adds no tracking |
| Object storage | `backend/src/services/object-storage.ts` (S3) | All sensitive docs use `storageKey` + signed URLs — never public URLs |

**Existing route surface** (`backend/src/routes/`): `auth`, `account-profile`, `account-payments`, `account-prescriptions`, `account-appointments`, `admin-patient-profile`, `admin-services`, `admin-doctors`, `services`, `doctors`, `payments`, `appointment-documents`, `patient-upload`, `doctor-patient-documents`, `doctor-patient-profile`, `exam-results`, `consultations`, `reviews-config`, `review-invites`, `reminders`, and more.

**Frontend route groups** (`frontend/app/`): `(site)`, `(auth)` (patient account), `(admin)`, `(doctor)`, `api`.

> **Note:** `backend/src/services/` currently holds only `object-storage.ts`. Every `*.service.ts` referenced below is a **new file** — no collision with existing service code.

---

## 2. Sprint map (sequential delivery order)

Order follows the spec's §18 implementation order. Each sprint merges to base before the next begins, except where "Parallelizable with" is noted.

| Sprint | Title | Spec § | Depends on | Parallelizable with |
|---|---|---|---|---|
| **S0** | Schema foundation + Global Health Number + backfill | §5, §15, all models | — | nothing (blocking) |
| **S1** | Service FAQ (admin CRUD + public page) | §1 | S0 | S2–S8 |
| **S2** | Patient profile: GHN display, insurance, verification status, dual nationality | §3, §4, §6, §12 | S0 | S1, S3+ |
| **S3** | Document system: patient upload, doctor upload, exam requests, secure download | §9 | S0 | S1, S2 |
| **S4** | Medical access logging | §7 | S2, S3 (wraps their reads) | — |
| **S5** | GDPR consent management | §8 | S0 (tab mounts into S2 shell) | S6, S7, S8 |
| **S6** | Payments / invoices portal (patient + admin) | §2 | S0 | S5, S7, S8 |
| **S7** | Doctor language management + booking language filter | §11, §14 | S0 | S5, S6, S8 |
| **S8** | Trustpilot review reminder (3-day window) | §10 | S0 | S5, S6, S7 |
| **S9** | Portal nav unification + security/permissions QA + E2E | §12, §13, §16, §17 | all | — |

```
S0 (schema + GHN) ── BLOCKING ──┐
                                ▼
   ┌──── parallel-capable after S0 ─────────────────────┐
   │  S1 FAQ                                              │
   │  S2 Profile ──┐                                      │
   │  S3 Documents ┴──► S4 Access Log (wraps S2+S3 reads) │
   │  S5 GDPR (tab → S2 shell)                            │
   │  S6 Billing                                          │
   │  S7 Language booking                                 │
   │  S8 Trustpilot                                       │
   └───────────────────────┬──────────────────────────────┘
                           ▼
                  S9 Nav + QA + security + E2E
```

---

## Sprint S0 — Schema foundation + Global Health Number (BLOCKING)

**Spec:** §5 (GHN), §15 (migration/backfill), all data-model sections.
**Why first:** every later sprint reads new columns/models. Land them in **one migration** so the schema file has a single author and no later sprint touches `schema.prisma`.

### Owns (exclusive)
- `backend/prisma/schema.prisma`
- `backend/src/db/ensure-schema.ts`
- `backend/prisma/migrations/<new>/migration.sql`
- `backend/src/lib/global-health-number.ts` *(new — GHN generator)*
- `backend/src/routes/auth.route.ts` *(surgical edit — issue GHN inside registration transaction)*

### Schema changes

**`PatientProfile` additions:**
```prisma
globalHealthNumber       String?   @unique   // GH-2026-000001, issued at registration
insuranceProviderName    String?
insurancePolicyNumber    String?             // encrypt (reuse H18 field-encryption helper)
insuranceDocumentKey     String?             // S3 storageKey, not a public URL
insuranceDocumentStatus  VerificationStatus  @default(NOT_VERIFIED)
idVerificationStatus     VerificationStatus  @default(NOT_VERIFIED)
phoneVerificationStatus  VerificationStatus  @default(NOT_VERIFIED)
emailVerificationStatus  VerificationStatus  @default(NOT_VERIFIED)  // mirror User.emailVerifiedAt
idDocumentKey            String?             // S3 storageKey for uploaded ID
idVerificationReviewedBy String?             // nullable — supports manual now, automated later
idVerificationReviewedAt DateTime?
stripeCustomerId         String?   @unique
```

**New enum:**
```prisma
enum VerificationStatus { NOT_VERIFIED PENDING VERIFIED REJECTED }
```

**New models** (full field lists in the companion plan §3.2 — identical here):
- `ServiceFaq` — `serviceId`, `question`, `answer`, `sortOrder`, `isVisible`, timestamps; index `[serviceId, isVisible, sortOrder]`; FK `Service onDelete: Cascade`.
- `PatientNationalityDocument` — `patientProfileId`, `slotNumber (1|2)`, `nationalityCountry`, `documentType`, `documentNumber` (encrypt), `frontFileKey`, `backFileKey`, `expiryDate`, `verificationStatus`, `adminNotes`, timestamps; **unique `[patientProfileId, slotNumber]`**.
- `MedicalDocument` — `patientProfileId`, `globalHealthNumber`, `uploadedByUserId`, `uploadedByRole`, `documentType`, `title`, `description`, `fileKey`, `mimetype`, `byteSize`, `relatedAppointmentId`, `relatedConsultationId`, `visibleToPatient` (default false), timestamps; indexes `[patientProfileId, documentType]`, `[relatedAppointmentId]`.
- `PatientConsent` — append-only history: `patientProfileId`, `consentType`, `consentValue`, `consentVersion`, `source`, `createdAt`; index `[patientProfileId, consentType, createdAt]`. *(latest row per type = current state)*
- `MedicalAccessLog` — `patientProfileId`, `globalHealthNumber`, `accessedByUserId`, `accessedByRole`, `accessedResourceType`, `accessedResourceId`, `accessAction`, `accessReason`, `relatedAppointmentId`, `ipAddress`, `userAgent`, `createdAt`; index `[patientProfileId, createdAt]`. **Read-only — no update/delete code path.**

> Optional `Language` lookup table is **out of scope** — `Doctor.languages String[]` is sufficient for Sprint 7. Add a managed master list only in a later follow-up if admin needs one.

### GHN generation (§5)
- `global-health-number.ts`: format `GH-<YEAR>-<zero-padded-sequence>`.
- Issue inside the **registration transaction** (`auth.route.ts`) — atomic + permanent.
- Use a DB sequence or `SELECT … FOR UPDATE` counter for uniqueness. **Do not** use `count()+1` (race condition). On unique-collision, retry safely.
- **Never** expose a GHN write path to patient or admin.

### Backfill (§15)
- Migration backfills `globalHealthNumber` for all existing `PatientProfile` rows (no duplicates).
- Verification statuses default: ID `NOT_VERIFIED`, phone `NOT_VERIFIED`, email derived from `User.emailVerifiedAt` where present else `NOT_VERIFIED`.
- Insurance left empty. Consent rows created lazily on first portal visit (or via migration if required).
- Existing doctors keep their `languages` array as-is (empty = excluded from language-filtered booking until admin assigns — document this; see Sprint 7).

### Acceptance gate
- [ ] Migration applies clean on fresh DB **and** on a copy of prod data; all existing profiles backfilled with a unique GHN.
- [ ] `ensure-schema.ts` matches; `prisma generate` + backend `tsc` pass.
- [ ] New registration issues a unique GHN atomically (concurrency test: N parallel registrations → N distinct GHNs, zero collisions).
- [ ] Branch merged to base **before** any S1+ sprint starts.

---

## Sprint S1 — Service FAQ

**Spec:** §1. **Model:** `ServiceFaq`.

### Owns
- Backend: `routes/admin-services.route.ts` (add FAQ sub-resource CRUD + reorder), `routes/services.route.ts` (public read — visible FAQs only), `services/service-faq.service.ts` *(new)*, `validations/` FAQ schema.
- Frontend: admin `(admin)/.../services/[id]/` FAQ panel; public `(site)/` service-detail FAQ accordion component.

### Endpoints
- `GET/POST/PATCH/DELETE /admin/services/:id/faqs`
- `PATCH /admin/services/:id/faqs/reorder`
- Public `GET /services/:slug` → include `faqs` filtered `isVisible = true`, ordered by `sortOrder`.

### Tasks
- Admin: add / edit / delete / reorder (drag or up-down) / enable-disable, scoped per service.
- Public: accordion near page bottom; only active FAQs; **section hidden entirely when zero visible FAQs**; works desktop + mobile.

### Acceptance (§1, §17-FAQ)
- [ ] Admin creates FAQ for Service A without affecting Service B.
- [ ] Public service page shows only that service's visible FAQs, in `sortOrder`.
- [ ] Disabled FAQ does not appear publicly.
- [ ] Empty FAQ → no blank space (section gone).

---

## Sprint S2 — Patient profile: GHN + Insurance + Verification + Dual Nationality

**Spec:** §3, §4 (display + upload + admin status), §6, §12 (profile), §5 (display only).
**Models:** `PatientProfile` (new cols), `PatientNationalityDocument`.

### Owns
- Backend: `routes/account-profile.route.ts` (insurance read/write, verification status read, ID upload, nationality CRUD), `routes/admin-patient-profile.route.ts` (admin view + verification-status update + **GHN search**), `routes/patient-upload.route.ts` (extend for ID / nationality / insurance doc upload to S3), `services/patient-nationality.service.ts` *(new — enforces max-2 with count guard + slot unique check)*.
- Frontend: `(auth)/account/profile/` **tabbed shell** + tabs: Personal / Insurance / Verification / Dual Nationality. GHN displayed read-only.

### Tasks
- **GHN display:** read-only on patient profile + dashboard; admin profile shows it near top; doctor sees it in appointment/medical context (doctor wiring lands with S3/S9).
- **Insurance (§3):** provider name, policy number (encrypted), document upload/replace, status badge (`NOT_VERIFIED/PENDING/VERIFIED/REJECTED`). Optional — save profile without it. Admin views + downloads doc, sets status, leaves notes.
- **Verification (§4):** status cards/badges for ID / phone / email. ID upload (passport / ID card / residence card / other; front+back where needed; `documentType`, `documentNumber`, `issuingCountry`, `expiryDate`). Statuses **not patient-editable** — admin-only. Admin views doc, sets status, adds rejection note, sees upload date.
- **Dual nationality (§6):** Nationality 1 + optional Nationality 2; country, doc type, number (encrypted), front/back upload, expiry. **"Add nationality" hidden/disabled at 2 records** with message `You can register a maximum of two nationality documents.` Slot uniqueness enforced server-side. Admin views both + downloads + verify/reject + notes.

### Contracts to publish (so later sprints attach cleanly)
- **Profile tab-shell registration API** — S5 mounts `<GdprPreferencesTab/>` into this shell.
- **`logAccess()` stub signature** — S2 calls a stub on every sensitive read (ID/nationality/insurance/sensitive-profile); S4 implements it.

### Security (§13)
- Docs stored as S3 `storageKey`, never public URL; download via signed URL behind access check.
- `insurancePolicyNumber` + `documentNumber` encrypted (H18 helper). GHN stays plaintext (searchable identifier).
- Every patient read resolves `auth userId → PatientProfile`; never trust client-supplied patient id.

### Acceptance (§17-Insurance, §17-Verification, §17-Dual Nationality, §3/§4/§6)
- [ ] Patient saves profile without insurance; can add insurance later; admin views insurance doc.
- [ ] Verification status cards show for ID/phone/email; patient uploads ID; admin updates status + sees rejection reason.
- [ ] GHN shown in patient + admin views; admin search by GHN works.
- [ ] Patient adds Nationality 1, optionally Nationality 2; **cannot exceed 2**; admin views both; docs private.

---

## Sprint S3 — Document system (patient + doctor uploads, exam requests, secure download)

**Spec:** §9. **Model:** `MedicalDocument`; reuse `ExamResult` / `Prescription` / `GeneratedDocument` / `AppointmentDocument` (read).

### Owns
- Backend: `routes/medical-documents.route.ts` *(new — patient upload + ownership-scoped list/download)*, `routes/appointment-documents.route.ts` (extend `visibleToPatient`), `routes/doctor-patient-documents.route.ts` (extend doctor upload results + exam-request docs), `routes/exam-results.route.ts` (extend if needed), `services/medical-document.service.ts` *(new)*.
- Frontend: `(auth)/account/medical-files/` (tabs: uploaded reports / doctor results / exam requests / prescriptions / consult summaries); `(doctor)/.../` doctor upload + create-exam-request UI + visibility toggle.

### Tasks
- **Patient:** upload reports; view + download own docs and `visibleToPatient=true` doctor docs; download exam requests / prescriptions / consult summaries.
- **Doctor:** upload medical results + consult summary + prescription PDF; create/upload lab/exam request; link doc to appointment/consultation; set `visibleToPatient`.
- **Admin:** view all patient docs, upload admin docs, download, see uploader + role.
- **Exam-request flow:** doctor creates exam-request doc → appears under patient's exam requests → patient downloads.
- Doc card shows: title, type, uploaded-by, uploaded-date, related appointment/service, download button.

### Contract
- Calls the same `logAccess()` stub on every view/download (implemented in S4).

### Security (§13)
- Allowed types per existing upload validation (PDF/JPG/PNG/DOC(X)); enforce mimetype + byte-size.
- Patient sees own + `visibleToPatient` only; doctor restricted to authorized appointments; **short-lived signed S3 URLs** behind access check.

### Acceptance (§9, §17-Medical Documents)
- [ ] Patient uploads + downloads own reports.
- [ ] Doctor uploads results + creates downloadable exam requests.
- [ ] Patient downloads doctor-uploaded exam request.
- [ ] Docs linked to correct patient; private + access-controlled.
- [ ] Every view/download is access-logged (verified once S4 lands).

---

## Sprint S4 — Medical access logging

**Spec:** §7. **Model:** `MedicalAccessLog`.
**Why after S2+S3:** F wraps the sensitive-read endpoints they created — landing it after avoids editing their files mid-flight.

### Owns
- Backend: `lib/access-log.ts` *(new — implements the `logAccess()` contract S2 & S3 stubbed)*, an access-logging middleware/wrapper, `routes/account-access-log.route.ts` *(new — patient read-only own log)*. Adds log-call lines into S2/S3 endpoints **after** they merge.
- Frontend: `(auth)/account/access-history/` (or Privacy → Medical Access History).

### Logged events (§7)
Doctor opens patient medical file; view/download of medical doc / report / prescription / exam-request / exam-result; doctor uploads consult summary/result; admin opens/downloads sensitive patient doc; sensitive-profile / ID / nationality access.

### Patient view shows
Who (name), role, datetime, **general** resource type, related appointment/consult, access action (view/download/upload/edit/delete), reason/context. **Do not** expose internal admin notes or technical metadata to the patient. Admin sees full metadata (incl. IP/user-agent).

### Rules (§7, §13)
- Patient sees **own** log only; cannot see other patients' logs.
- Logs **read-only** — no update/delete code path; not editable by normal admins.

### Acceptance (§7, §17-Access History)
- [ ] Doctor + admin viewing a medical file creates a log row.
- [ ] Patient sees own access history; cannot see another patient's.
- [ ] Logs immutable.

---

## Sprint S5 — GDPR consent management

**Spec:** §8. **Model:** `PatientConsent` (append-only history).

### Owns
- Backend: `routes/consents.route.ts` *(new — patient read latest + update; appends history row)*, `routes/admin-consents.route.ts` *(new — admin read-only consent + history; separate file to avoid colliding with `admin-patient-profile.route.ts`)*.
- Frontend: `<GdprPreferencesTab/>` mounted into S2's profile shell + Privacy section.

### Consent types (§8)
`STORE_MEDICAL`, `SHARE_WITH_DOCTOR`, `MARKETING`, `THIRD_PARTY_LAB`, `NOTIFICATIONS` (appointment/service comms), `FOLLOW_UP` (prescription processing). Each shows current status (Accepted/Declined/Withdrawn), accepted date, withdrawn date, latest policy version.

### Logic
- Every change **appends** a row (patientProfileId, GHN, type, value, version, source, timestamp); latest row per type = current.
- **No automatic service blocking** (deferred per decision 4c) — save + log + flag/notify admin only. Keep flexible for future blocking logic.

### Acceptance (§8, §17-GDPR)
- [ ] Patient views + updates consent choices with last-updated + explanation.
- [ ] Full history stored (never overwritten).
- [ ] Admin views consent status + history + policy version + withdrawal flag.
- [ ] No automatic blocking added.

---

## Sprint S6 — Payments / invoices portal

**Spec:** §2. **Models:** `Payment` (read), `Order`/`OrderItem` (read), `Appointment` (read).

### Owns
- Backend: `routes/account-payments.route.ts` (extend), `routes/admin-payments.route.ts` *(new or extend admin view)*, `services/stripe-receipt.service.ts` *(new — resolve Stripe receipt URL / invoice PDF link)*.
- Frontend: `(auth)/account/billing/` payments + invoices page.

> **Collision guard:** does **not** touch the `payments.route.ts` Stripe webhook handler. Read payment rows only.

### Patient view (§2)
Appointment/service name, doctor (if any), payment date, amount, currency, status, payment method (if available), invoice/receipt number, **download invoice/receipt** button. Statuses: Paid / Pending / Failed / Refunded / Partially refunded / Cancelled.

### Invoice download
- Invoice PDF + receipt PDF. **Missing invoice → render `Invoice not available`, never a broken button** (§2, §15).

### Admin view
Patient payment history, linked appointment, status, invoice/receipt download, payment-provider reference.

### Security (§13)
- Scope every query by `auth userId → PatientProfile`. **Never** expose another patient's payment. Admin path separately gated.

### Acceptance (§2, §17-Payments)
- [ ] Patient sees own payments only; downloads available receipts/invoices.
- [ ] Missing invoice does not crash the page.
- [ ] Admin views any patient's payment history.

---

## Sprint S7 — Doctor language management + booking language filter

**Spec:** §11, §14. **Models:** `Doctor.languages` (exists), `ServiceDoctor` (exists). **No new model.**

### Owns
- Backend: `routes/doctors.route.ts` (extend public list to filter by **service + language + availability**), `routes/admin-doctors.route.ts` (extend doctor edit to manage `languages` array). Scope edits to the language handler if files are large.
- Frontend: booking flow under `(site)/` — language dropdown after service select; doctor cards show `Languages: …`; admin doctor-edit language multi-select.

### Booking flow (§14)
- **Path A (from service page):** service preselected → pick language → matching doctors/slots → pick doctor/time → pay → booking created.
- **Path B (from booking page):** pick service → pick language → filtered doctors → slots → pick slot → pay → booking created.
- **Filter = ALL of:** doctor active/approved **AND** assigned to service (`ServiceDoctor.status=active`) **AND** `language ∈ Doctor.languages` **AND** has available slot **AND** not marked busy **AND** slot not booked.
- **No match →** show: `No doctors are currently available for this service in the selected language. Please choose another language or check again later.`
- **Store language on the appointment:** add `consultationLanguageCode` (or `consultationLanguageId`) to the booking record. Checkout must preserve the selected language.

> **Backfill note (§15):** existing doctors with empty `languages` are excluded from language-filtered booking until admin assigns. Document this. (Optional fallback: default existing doctors to English-only — only if business requires it.)

### Acceptance (§11, §14, §17-Language Booking)
- [ ] Language dropdown present; service-page entry preselects service.
- [ ] Doctors filtered correctly by service + language + availability.
- [ ] Slots shown only for matching doctors.
- [ ] Appointment stores consultation language; checkout preserves it.
- [ ] No-doctor-available message works.
- [ ] Admin manages doctor languages.

---

## Sprint S8 — Trustpilot review reminder

**Spec:** §10. **Models:** none new — reuse `Consultation`/`Appointment` COMPLETED state + `reviews-config` for the Trustpilot URL/locale.

### Owns
- Backend: expose `consultationCompletedAt` on existing account/consultation read endpoints if not already present (read-only addition).
- Frontend: `(auth)/account/` dashboard CTA component + completed-consultation detail CTA. Optional reminder email **only** by hooking the existing notification flow (do not build new email infra).

### Logic (§10)
- Show Trustpilot CTA for **3 days after `consultationCompletedAt`** (COMPLETED only). Hide after.
- Never show for cancelled / no-show / pending.
- External link to the official Trustpilot review page. **No internal review tracking** (decision 3).
- Copy example: "How was your consultation? Leave us a review on Trustpilot." Button: "Review us on Trustpilot."

### Acceptance (§10, §17-Trustpilot)
- [ ] CTA appears on dashboard + completed-consult page for 3 days post-completion.
- [ ] CTA hidden after 3 days and for non-completed consults.
- [ ] Button links to Trustpilot; no review-status tracking added.

---

## Sprint S9 — Portal nav unification + security/permissions QA + E2E

**Spec:** §12, §13, §16, §17.

### Patient portal nav (§12)
Wire unified nav: **Dashboard** (GHN, verification summary, upcoming appointments, Trustpilot reminder) / **Appointments** / **Medical Files** / **Exam Requests** / **Payments-Billing** / **Profile** {Personal, Insurance, Verification, Nationality, GDPR} / **Access History**.

### Doctor portal (§12)
Profile (languages, services) · Appointment details (patient GHN + selected consultation language + relevant docs) · Patient medical file (view allowed docs, upload results/summaries/exam-requests/prescriptions) · access logging on view/download.

### Admin portal (§12)
Service FAQs · patient management (search by GHN, verification statuses, insurance, dual nationality, consent status/history, payment/invoice history, medical docs, access logs) · doctor management (assign services + languages, view capability matrix) · payments/billing · documents (view/download + upload source + audit).

### UI/UX (§16)
Cards/sections, no clutter, mobile-responsive. Status badges: Verified=green, Pending=yellow/orange, Not-verified=gray, Rejected=red. Empty states: "No payments found yet." / "No medical documents uploaded yet." / "No access history available yet." / FAQ section hidden when empty.

### Security & permissions matrix (§13)
- **Patient** accesses only own profile / payments / invoices / medical docs / consent / access history.
- **Doctor** accesses only patients linked to their appointments; docs relevant to their consultations; GHN only in appointment/medical context.
- **Admin** per role permissions; sensitive admin actions audit-logged (`AuditLog`).
- All uploaded docs private (no public folder); URLs non-guessable; signed URLs / protected download endpoints.
- Data integrity: GHN unique; docs link to correct patient; payments link to correct patient/appointment; consent + access-log immutable/append-only.

### Testing (§17 — run full checklist)
- End-to-end permissions matrix: patient cannot reach another patient's records/GHN/logs; doctor limited to authorized patients; admin sensitive actions logged.
- Playwright E2E for headline flows; visual check at 320 / 768 / 1024 / 1440.
- **80% coverage** target on new service-layer code.

### Acceptance (§17 + §19 final outcome)
- [ ] Unified portal nav across patient/doctor/admin per spec.
- [ ] Full §17 testing checklist passes.
- [ ] Permissions matrix holds end-to-end; sensitive admin actions audit-logged.

---

## 3. Shared conventions (every sprint)

- **GHN propagation:** include `globalHealthNumber` on every new patient-linked row (denormalized intentionally) and surface in patient/admin/doctor views + invoice metadata where relevant.
- **File storage:** sensitive docs = S3 `storageKey` (mirror `AppointmentDocument`), never public URL; download via short-lived signed URL behind an access check.
- **Encryption:** reuse the H18 field-encryption helper for new secret-grade fields (`insurancePolicyNumber`, `documentNumber`). GHN stays plaintext (searchable identifier).
- **Audit vs access-log:** `AuditLog` = admin/clinician mutations (existing). `MedicalAccessLog` = patient-facing "who saw my data" (new). Don't conflate.
- **Ownership scoping:** every patient read path resolves `auth userId → PatientProfile`; never trust a client-supplied patient id.
- **Immutability:** `PatientConsent` + `MedicalAccessLog` are append-only / read-only — no update or delete code paths.
- **Branch naming:** `feat/s<N>-<slug>`; small focused commits; conventional-commit messages.
- **Per-sprint gate:** backend `tsc` + lint + new unit tests green before opening PR; CI passing; up to date with base.

---

## 4. Cross-sprint coordination contracts

Agree these signatures **before** coding the dependent sprints (lets S2/S3/S5 proceed alongside S4/S6):

1. **`logAccess(params)`** — implemented by **S4**, *stubbed by S2 & S3* in their sprint.
2. **Profile tab-shell registration** — owned by **S2**; **S5** provides `<GdprPreferencesTab/>`.
3. **Stripe webhook ownership** — the `payments.route.ts` webhook stays untouched in **S6** (read-only billing). (Subscription/recurring webhooks are out of this plan's scope — see companion plan Track C if subscriptions are added.)
4. **`consultationCompletedAt` read shape** — exposed once (S8) and reused by the dashboard.

---

## 5. Final expected outcome (§19)

After all sprints:

- [ ] Each service page has its own admin-managed FAQ section.
- [ ] Patient portal shows payment history + invoice/receipt downloads.
- [ ] Patient profile includes insurance details + ID/phone/email verification status + dual-nationality docs.
- [ ] Every patient has a Global Health Number generated at registration; searchable by admin; shown to doctor/patient where relevant.
- [ ] Patient + doctor upload/download medical documents; doctor creates downloadable exam requests.
- [ ] Patient sees who accessed their medical info and when (immutable logs).
- [ ] Patient manages GDPR consent; full history preserved; admin views it.
- [ ] Trustpilot reminder/link shows 3 days after a completed consultation only.
- [ ] Booking supports consultation-language filtering; appointment stores the language.
- [ ] Admin, doctor, and patient records are linked cleanly and securely.
