# Doctor Dashboard Parity — Build Plan

> Source of truth for the Mongo→Prisma parity work that closes feature gaps between the legacy doctor-dashboard (MongoDB / Mongoose) and the current Global Health website (Postgres / Prisma). Update checkboxes as work ships. Each ticket lists end-to-end touch points (patient → doctor → admin → PDF) so changes stay coherent across roles.

---

## Status legend

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — done & merged
- `[!]` — blocked (note why inline)
- `[-]` — descoped (note why)

---

## 0. Decisions (defaults — override before T1 ships)

| # | Question | Default | Status |
|---|---|---|---|
| Q1 | Add `GeneratedDocumentType.OTHER` for misc PDFs? | INCLUDE — small lift, parity with legacy "Review & Send" UX | `[x]` confirmed |
| Q2 | Third-party insurance billing fields? | SKIP — assume direct-pay via Stripe | `[x]` confirmed |
| Q2b | Link patient to brand's own `PricingPlan`? | INCLUDE — single FK `PatientProfile.pricingPlanId` | `[x]` confirmed |
| Q3 | Persistent preferred pharmacy on profile? | INCLUDE — `PatientProfile.preferredPharmacy`, prefills `Appointment.pharmacy` | `[x]` confirmed |
| Q4 | Per-doctor `canCreateManualAppointments` flag? | INCLUDE — default `false`, admin grants per doctor | `[x]` confirmed |
| Q5 | Resurrect `Doctor.barCode` for PDFs? | SKIP — legacy; add later only if a scanner exists | `[x]` confirmed |

---

## 1. Scope summary

### In scope

| Track | Ticket | Title |
|---|---|---|
| Schema | T1 | Single Prisma migration covering all confirmed deltas |
| Schema | T2 | Backfill scripts (`Doctor.imcRegistration` → `DoctorCountry`) |
| Backend | T3 | `DoctorCountry` registration CRUD (admin) |
| Backend | T4 | `PatientProfile` identity / address / alerts / plan / pharmacy CRUD |
| Backend | T5 | Appointment clinic / location wiring (schedule + view) |
| Backend | T6 | Login audit hooks (`LOGIN` / `LOGOUT` / `LOGIN_FAILED`) |
| Backend | T7 | `GET /api/doctor/patients/:email/documents` aggregator |
| Backend | T8 | `Doctor.canCreateManualAppointments` permission gate |
| Backend | T9 | `GeneratedDocumentType.OTHER` + `customLabel` PDF path |
| Admin UI | T10 | Doctor edit page — Registrations tab + manual-entry toggle |
| Admin UI | T11 | Patient detail page — identity / address / alerts / plan / pharmacy editor |
| Admin UI | T12 | Appointment schedule form — clinic picker |
| Admin UI | T13 | Audit log — "Logins" filter chip + IP column |
| Doctor UI | T14 | Patient chart — identity / address / alerts panel + "All documents" tab |
| Doctor UI | T15 | Generated docs panel — "Other" option with `customLabel` |
| Patient UI | T16 | `/account/profile` — identity / address / plan / pharmacy fields |
| Patient UI | T17 | Booking form — optional identity field per-country toggle |
| Patient UI | T18 | `/account/appointments/[id]` — "Where" block for in-person visits |
| PDF / Email | T19 | Rx + cert templates pick correct registration + identity by country |
| PDF / Email | T20 | Booking confirmation email — "Where" block |
| Tests | T21 | Schema migration test |
| Tests | T22 | Service unit tests (per touched service) |
| Tests | T23 | Route auth + validation tests |
| Tests | T24 | Documents aggregator route test |
| Tests | T25 | UI smoke checklist (9 flows) |
| Tests | T26 | Backfill verification SQL |
| Ops | T27 | Migration run book + rollback notes published |

### Out of scope (explicitly)

- Third-party insurance billing (claim submission / EDI).
- Refactor of `PatientProfile.medicalNotes Json[]` → dedicated `PatientNote` model (functional parity exists today; defer).
- Importing legacy Mongo data into Postgres (separate ETL project).
- `ReviewInvite` rating-field renaming.
- 1-D barcodes on PDFs.
- Multi-tenant / `businessName` field.
- Wix-sync glue.

---

## 2. Architecture decisions

1. **Doctor registrations live on `DoctorCountry`** (extend existing M:N link), not a new table.
2. **Patient identifiers are 3 separate columns** (`nationalIdNumber`, `taxIdNumber`, `passportNumber`) — no type+value discriminator. Reason: same patient often has multiple (e.g. PT patient = NIF + Passport), and per-column makes PDF template lookup trivial.
3. **Address lives on `PatientProfile` only** — not duplicated on `User`. `Order.ship*` stays per-order so checkout can ship elsewhere.
4. **Clinical alerts are doctor-write, patient-invisible.** Audit-logged via new `PATIENT_ALERT_UPDATED` action.
5. **In-person location** = soft FK to `Clinic` OR optional free-text `locationAddress`. UI enforces exactly one.
6. **Login audit rides existing `AuditLog`** — only adds 3 enum values. No new table.
7. **All-documents view is a route**, not a denormalized column.
8. **PricingPlan link** uses the existing model; FK added on `PatientProfile`.

---

## 3. Schema delta

```prisma
// --- ENUMS ---
enum AuditAction {
  // existing values…
  LOGIN
  LOGOUT
  LOGIN_FAILED
  PATIENT_ALERT_UPDATED
}

enum GeneratedDocumentType {
  ABSENCE_CERTIFICATE
  EXAMS_PRESCRIPTION
  PRESCRIPTION
  OTHER
}

// --- Doctor ---
model Doctor {
  // existing fields…
  canCreateManualAppointments Boolean @default(false)
  // imcRegistration String?  KEEP in T1; drop in follow-up migration after backfill verified.
}

// --- DoctorCountry (extend) ---
model DoctorCountry {
  // existing: id, doctorId, countryId, sortOrder, active, createdAt
  chamberEntity      String?
  registrationNumber String?
  isVerified         Boolean   @default(false)
  verifiedAt         DateTime?

  @@index([countryId, isVerified])  // admin verification queue
}

// --- PatientProfile (extend) ---
model PatientProfile {
  // existing…
  nationalIdNumber   String?
  taxIdNumber        String?
  passportNumber     String?
  addressLine1       String?
  addressLine2       String?
  addressCity        String?
  addressPostalCode  String?
  addressCountryCode String?
  preferredPharmacy  String?
  statusAlert        String?
  clinicAlert        String?
  pricingPlanId      String?
  pricingPlan        PricingPlan? @relation(fields: [pricingPlanId], references: [id], onDelete: SetNull)

  @@index([pricingPlanId])
}

model PricingPlan {
  // existing…
  patientProfiles PatientProfile[]   // inverse
}

// --- Appointment (extend) ---
model Appointment {
  // existing…
  clinicId         String?
  locationAddress  String?
  clinic           Clinic?  @relation(fields: [clinicId], references: [id], onDelete: SetNull)

  @@index([clinicId])
}

model Clinic {
  // existing…
  appointments Appointment[]   // inverse
}

// --- BookingSetting (extend) ---
model BookingSetting {
  // existing…
  requireNationalId Boolean @default(false)
}
```

**All deltas additive.** No `DROP COLUMN` / no `NOT NULL` retrofits in T1. `Doctor.imcRegistration` removal is a follow-up migration after backfill verified.

---

## 4. Migration plan (T1)

- [x] Schema deltas applied to `prisma/schema.prisma` (enums + columns)
- [x] Migration written by hand at `prisma/migrations/20260522010000_doctor_dashboard_parity_phase_1/migration.sql` (DB not reachable locally — used hand-crafted additive DDL instead of `migrate dev`)
- [x] `prisma validate` + `prisma generate` clean
- [x] `tsc --noEmit` clean (after adding `OTHER` to TITLES map)
- [ ] Deploy backend with new Prisma client + migration in same release.
- [ ] `pnpm prisma migrate deploy` auto-runs via `postinstall` / startup hook.
- [ ] Verification SQL:
  ```sql
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name IN ('DoctorCountry','PatientProfile','Appointment','BookingSetting','Doctor');
  ```
- [ ] Snapshot prod DB before deploy (Railway → Postgres → restore point).

**Rollback path:** additive deltas mean rollback = `git revert` the deploy; new columns stay as NULL — harmless.

---

## 5. Backfill scripts (T2)

### `backend/scripts/backfill-doctor-registrations.ts`

- [x] Reads every `Doctor` where `imcRegistration` is not null (via raw SQL so it survives the future column drop).
- [x] Upserts `DoctorCountry { doctorId, countryId: <IE country id> }` with `chamberEntity="IMC"`, `registrationNumber=<old>`, `isVerified=true`, `verifiedAt=NOW()`.
- [x] `--dry` flag prints intended writes, performs none.
- [x] `--country=XX` flag allows backfilling a different country (default IE).
- [x] Logs `{processed, written, skipped}` counts.
- [x] Built-in drift check after the run — prints offenders + sets exit 1 if any row mismatches.
- [ ] Dry-run executed against prod
- [ ] Real run executed against prod

### Post-run validation

- [ ] Run validation SQL — must return 0 rows:
  ```sql
  SELECT d."fullName", d."imcRegistration", dc."registrationNumber", dc."chamberEntity"
  FROM "Doctor" d
  LEFT JOIN "DoctorCountry" dc
    ON dc."doctorId" = d.id
   AND dc."countryId" = (SELECT id FROM "Country" WHERE code = 'IE')
  WHERE d."imcRegistration" IS NOT NULL
    AND (dc."registrationNumber" IS NULL OR dc."registrationNumber" <> d."imcRegistration");
  ```

---

## 6. Backend tickets

### T3 — DoctorCountry registration CRUD (admin)

- [x] Route: `PATCH /api/admin/doctors/:doctorId/registrations/:countryId` (upsert chamber + number + verified)
- [x] Route: `GET /api/admin/doctors/:doctorId/registrations` (list with country names joined)
- [x] Service: `backend/src/modules/doctor-registrations/doctor-registrations.service.ts`
- [x] Audit: emit `AuditAction.DOCTOR_UPDATED` on every write with `metadata.registration = { countryCode, chamberEntity, registrationNumber }`
- [x] `tsc` clean
- [x] Helper `getDoctorRegistrationByCountryCode` exposed for later PDF integration (T19)

### T4 — PatientProfile CRUD

- [x] `GET /api/account/profile` (patient self) — returns identity / address / plan / pharmacy
- [x] `PATCH /api/account/profile` (patient self) — **excludes alerts** (schema doesn't list them; `.strict()` rejects)
- [x] `GET /api/doctor/patients/:email/profile` (doctor) — full incl. alerts
- [x] `PATCH /api/doctor/patients/:email/profile` (doctor) — alerts editable
- [x] `GET /api/admin/patients/:email/profile` (admin) — full
- [x] `PATCH /api/admin/patients/:email/profile` (admin) — full
- [x] Validation: identifiers trimmed + ≤ 64 chars
- [x] Validation: alerts trimmed + ≤ 500 chars
- [x] Validation: `pricingPlanId` rejected when plan country ≠ patient's most-recent appointment country
- [x] Emit `AuditAction.PATIENT_ALERT_UPDATED` on alert change (doctor + admin write paths only)
- [x] `tsc` clean

### T5 — Appointment clinic + location wiring

- [x] `PATCH /api/admin/appointments/:id/schedule` accepts `clinicId | locationAddress` (mutually exclusive via Zod refine)
- [x] Validation: if `consultationMode = IN_PERSON`, at least one of `clinicId` / `locationAddress` required (422 otherwise)
- [x] Email helper `sendAppointmentScheduledEmail` accepts optional `where` and renders "📍" block; CTA hidden for in-person
- [x] Route fills `where` from joined `Clinic` row or `locationAddress` and skips the Meet CTA for IN_PERSON
- [ ] `GET /api/account/appointments/:id` includes `clinic { name, city, address }` OR `locationAddress` (deferred — patient view ships with T18 frontend work)
- [x] `tsc` clean

### T6 — Login audit hooks

- [x] `recordAudit({ action: LOGIN, ... })` on successful login
- [x] `recordAudit({ action: LOGIN_FAILED, ... })` on bad-password branch (`actorUserId=null`)
- [x] `recordAudit({ action: LOGOUT, ... })` on `/api/auth/logout` (snapshots session before clearing cookie)
- [x] Each row carries `ipAddress` (via `recordAudit`'s `resolveIp`) and `metadata.email`
- [x] `tsc` + tests clean (108/108)

### T7 — Patient documents aggregator

- [x] Route: `GET /api/doctor/patients/:email/documents`
- [x] Response unions `AppointmentDocument` + `GeneratedDocument` for every appointment the doctor shares with the patient
- [x] Filter: `appointment.doctorId = auth.doctorId` (no cross-doctor leakage)
- [x] Empty-set fast-path when doctor has no appointments with that email
- [x] `tsc` clean

### T8 — Manual-entry permission gate

- [x] Helper `verifyManualEntryPermission(request)` in `utils/doctor-auth.ts` — ADMIN bypasses, DOCTOR needs flag
- [x] Denial returns 403 with the exact message from the plan
- [x] New `GET /api/doctor/me/permissions` so the doctor-portal UI can show/hide the manual-entry CTA
- [ ] Existing manual-create-appointment route doesn't exist yet — when added, import + call the helper as the first line (note left in ticket; no actual create endpoint to gate in this codebase)
- [x] `tsc` clean

### T9 — `OTHER` generated-document type

- [x] Service accepts `documentType = OTHER` + `fields.customLabel`
- [x] Title resolves: `customLabel || "Document"` fallback
- [x] Storage filename slugifies `customLabel` so the patient sees a recognisable filename
- [x] Persist `customLabel` in `GeneratedDocument.metadata` (already passes through `fields` Json)
- [x] `sendGeneratedDocumentEmail` reads `metadata.customLabel` for the subject + body when type is OTHER
- [x] Route validates `fields.customLabel` is present when type=OTHER (400 otherwise)
- [x] `tsc` clean

---

## 7. Admin UI tickets

### T10 — Doctor edit page

- [x] New "Medical registrations" card in `frontend/app/(admin)/admin/doctors/[id]/page.tsx`
- [x] New component `_components/registrations-card.tsx` (form per associated country)
- [x] Inline edit: chamber · number · verified checkbox per row · Save button
- [x] Verified state stamps `verifiedAt` automatically on transition
- [x] Checkbox: `canCreateManualAppointments` added to the edit form's right sidebar (`/admin/doctors/[id]/edit`)
- [x] `doctor-form-parse.ts` + admin-doctors schema + service write path all propagate the new flag
- [x] `tsc` clean (backend + frontend)

### T11 — Patient detail editor

- [x] New `PatientProfileEditor` card on `/admin/users/[id]`, gated to `role=PATIENT`
- [x] Sections (single form, sectioned headings — simpler than tabs): Identity · Address · Plan & Pharmacy · Clinical alerts · Vitals
- [x] Bound to `PATCH /api/admin/patients/:email/profile`
- [x] Inline preview banners (red / amber) above the form when alerts are set
- [x] `tsc` clean

### T12 — Schedule form clinic picker

- [x] Picker section renders only when `consultationMode === IN_PERSON`
- [x] `<select>` of active clinics for the appointment's country + "Other (custom address)" option
- [x] Free-text `locationAddress` used when "Other" is selected
- [x] New backend route `GET /api/admin/clinics?countryCode=XX` returns `{ clinics: [...] }`
- [x] Appointment DTO + service projections extended to expose `consultationMode`, `clinicId`, `locationAddress`
- [x] `tsc` clean

### T13 — Audit log filters

- [x] Backend `action` query param now accepts comma-separated lists (e.g. `LOGIN,LOGOUT,LOGIN_FAILED`) → translated to Prisma `{ in: [...] }`
- [x] Quick-filter chips at the top of the page: Logins · Patient alerts · Consultations · Clear
- [x] New ACTION_LABEL + ACTION_TONE entries for LOGIN / LOGOUT / LOGIN_FAILED / PATIENT_ALERT_UPDATED
- [x] New "IP" column in the audit table
- [x] `tsc` clean

---

## 8. Doctor UI tickets

### T14 — Patient chart panel

- [x] `patient-profile-panel.tsx` rewritten with sectioned form:
  - Identity (national ID / tax ID / passport)
  - Address (5 fields)
  - Plan & Pharmacy
  - Vitals (weight/height/blood type/allergies)
  - Clinical alerts (doctor-only writes; render red/yellow banners at top)
- [x] New server component `all-documents-card.tsx` consumes T7 aggregator
  and lists Doctor uploads + Generated PDFs across every appointment
- [x] Wired into `/doctor/patients/[email]` page under the appointment history
- [x] `tsc` clean

### T15 — Generated docs "Other" option

- [x] Dropdown gains "Other (custom)"
- [x] `customLabel` text input shown only when OTHER is selected, required (≤80 chars)
- [x] POST payload: `{ type: "OTHER", fields: { customLabel, body? } }`
- [x] `tsc` clean

---

## 9. Patient UI tickets

### T16 — `/account/profile` editor

- [x] New `PatientProfileSection` ("Medical identity") added beneath the existing user profile form
- [x] Identity block (national ID / tax ID / passport)
- [x] Address block (5 fields)
- [x] Pharmacy block (text input)
- [x] Plan link surfaces via the patient detail when a `pricingPlanId` is set (no inline edit yet — server-side validates against country mismatch)
- [x] New frontend proxy `app/api/account/profile/route.ts` forwards GET/PATCH to backend
- [x] `tsc` clean

### T17 — Booking form identity field

- [x] Country-aware label resolver (`idLabelForCountrySlug`) covers IE/PT/ES/CZ/RO/BR + fallback
- [x] Field is always shown as optional today (works in every country); the per-country `bookingSetting.requireNationalId` gate is wired on the backend and will flip the field to required in a follow-up
- [x] On submit, logged-in patients (not booking-for-other) fire a fire-and-forget PATCH `/api/account/profile` so the ID lands on PatientProfile
- [x] Guest patients keep the field; it persists once they sign up + claim
- [x] `tsc` clean

### T18 — Appointment "Where" block

- [x] `listAppointmentsForUser` LEFT JOINs Clinic and surfaces
  `consultationMode/clinicName/clinicCity/locationAddress` on the
  patient-facing payload
- [x] AccountAppointment frontend type extended to match
- [x] `WhereBlock` component on /account/bookings renders sky-blue
  card with primary line (clinic name OR locationAddress) + secondary
  city + Google Maps directions link
- [x] Only renders when `consultationMode === IN_PERSON` AND a location
  source is present
- [x] `tsc` clean + tests 108/108 pass

---

## 10. PDF + email integration

### T19 — Rx / cert PDFs pick correct fields by country

Edit `backend/src/modules/generated-documents/generated-documents.service.ts`:

- [x] Fetch `DoctorCountry` row via `getDoctorRegistrationByCountryCode(doctorId, appointment.countryCode)`
- [x] Header prints `${chamberEntity}: ${registrationNumber}` when set; appends `(unverified)` if `isVerified=false`
- [x] Missing registration → emit "Registration (XX): not on file" placeholder + `console.warn`
- [x] Fetch `PatientProfile` by `appointment.email` (case-insensitive lookup via lower())
- [x] `buildPatientIdLine` picks the right ID per country (PT→NIF / BR→CPF / IE→PPS / ES→DNI, fallback "Tax ID" or "National ID" or "Passport")
- [x] `buildAddressLines` emits 1–4 lines depending on which fields are populated
- [x] Missing profile = silent blank, no crash
- [x] `tsc` clean, 108/108 tests pass

### T20 — Booking confirmation email "Where"

- [x] `sendAppointmentScheduledEmail` accepts optional `where` + nullable `meetingUrl` (landed in T5)
- [x] Admin schedule route fills `where` from joined clinic name+city or `locationAddress`, suppresses Meet CTA for IN_PERSON (also T5)
- [x] **Reminder path** extended in this batch: `sendAppointmentReminderEmail` now mirrors the same `where`/`meetingUrl` optional pair
- [x] `reminders.route.ts` no longer skips IN_PERSON appointments — the cron picks them up when clinic OR locationAddress is set and passes `where` accordingly
- [x] `tsc` clean, 108/108 tests pass

---

## 11. Test plan

### T21 — Schema migration test

- [x] `doctor-dashboard-parity-migration.test.ts` — 12 assertions on the raw SQL file:
  - No DROP COLUMN / DROP TYPE / DROP TABLE / DROP CONSTRAINT (purely additive)
  - All 4 new AuditAction enum values wrapped in `ADD VALUE IF NOT EXISTS`
  - OTHER added to GeneratedDocumentType with `IF NOT EXISTS`
  - All new columns present (Doctor / DoctorCountry / PatientProfile / Appointment / BookingSetting)
  - Both new FKs use `ON DELETE SET NULL`
  - Boolean columns carry `NOT NULL DEFAULT false`
- [x] Verification SQL documented at the bottom of `scripts/backfill-doctor-registrations.ts` — exits 1 if drift detected.

### T22 — Service unit tests

- [x] `generated-documents-fields.test.ts` — 16 tests covering `buildPatientIdLine` + `buildAddressLines` (pure helpers, no DB)
- [x] `doctor-registrations.service.test.ts` — 6 tests covering upsert idempotency, `verifiedAt` stamp on transition, clear on unverify, list join, country-code lookup, and `DoctorOrCountryNotFoundError` (DB-backed; gracefully skips when Postgres unreachable)
- [x] `account-profile.alerts.schema.test.ts` — 6 tests on the patient-self Zod schema: rejects statusAlert/clinicAlert, rejects unknown keys via `.strict()`, enforces 64-char identity caps
- [x] `auth.route.test.ts` — 3 tests covering bad-payload 400, bad-password LOGIN_FAILED audit row, logout reachability (DB-backed gracefully skip)

### T23 — Route auth + validation tests

- [x] `admin-appointments-schedule-location.schema.test.ts` — 8 cases covering the schedule body schema
- [x] `admin-doctor-registrations.route.test.ts` — 3 tests covering unauthenticated GET/PATCH 401 + Zod schema rejects extra keys + 64-char cap
- [x] `account-profile.alerts.schema.test.ts` doubles as the patient-self alert-rejection check (see T22)

### T24 — Aggregator route test

- [x] `doctor-patient-documents.route.test.ts` — 2 tests covering unauthenticated 401 + malformed email param 400/401 (DB-backed gracefully skip)
- [-] Full integration seed-and-verify (2 appts × 2 uploads × 1 generated → assert union; cross-doctor doesn't leak) deferred to the integration harness. Cross-doctor scoping is enforced by a single `where: { doctorId: auth.doctorId, ... }` Prisma filter, covered by the smoke checklist.

### T25 — UI smoke checklist (run against your local dev server before merge)

| # | Flow | Pass criteria |
|---|---|---|
| 1 | Admin sets PT registration on a doctor at `/admin/doctors/[id]` | Row persists, `isVerified=true`, audit log shows `DOCTOR_UPDATED` |
| 2 | Patient updates national ID via `/account/profile` "Medical identity" section | PATCH returns 200, value re-renders on reload |
| 3 | Doctor sets `statusAlert` "Penicillin allergy" from patient chart | Red banner at top of chart; `PATIENT_ALERT_UPDATED` audit row |
| 4 | Admin schedules IN_PERSON appointment with a clinic picker choice | Patient `/account/bookings` shows "Where" card + 📍 in confirmation email |
| 5 | Doctor generates `OTHER` doc with label "Lab requisition" | PDF title = "Lab requisition"; patient receives attachment with that subject |
| 6 | Login + logout + bad-password login | 3 rows visible under `/admin/audit-log` "Logins" filter chip; IP column populated |
| 7 | Doctor opens patient "All documents" card | All uploads + generated docs across appointments listed; cross-doctor never visible |
| 8 | Toggle `canCreateManualAppointments=false` on a doctor → log in as that doctor | `GET /api/doctor/me/permissions` returns `false`; manual-entry helper rejects with 403 |
| 9 | Rx PDF generated against a PT appointment | Header shows "OM: {number}" + patient NIF + address block |
| 10 | Booking form on a PT consult | Country-aware "NIF / Cartão de Cidadão (optional)" field shown; submit persists to `/account/profile` for signed-in patient |

### T26 — Backfill verification

- [x] Drift check baked into `scripts/backfill-doctor-registrations.ts` — runs after every non-dry execution; prints any rows where `Doctor.imcRegistration` doesn't match `DoctorCountry.registrationNumber` for IE, exits 1 if drift detected.
- [ ] Pre-backfill: count `Doctor.imcRegistration NOT NULL` → N (deploy-time step)
- [ ] Post-backfill: count `DoctorCountry` rows for IE with `chamberEntity='IMC'` AND `registrationNumber NOT NULL` → exactly N (deploy-time step)
- [ ] PDF regression: re-generate prescription for 3 known IE doctors → registration number unchanged from pre-migration output (deploy-time step on staging first)

---

## 12. Acceptance criteria (Definition of Done per ticket)

A ticket is **done** only if **all** of:

- [ ] `pnpm exec tsc --noEmit` clean (backend + frontend)
- [ ] At least one happy-path test + one auth-failure test for any new service/route
- [ ] UI smoke checklist row(s) for the touched flow pass
- [ ] No regression in existing tests (`pnpm test` exit 0 except DB-offline-skipped)
- [ ] Audit-log row emitted on every write that touches clinical or permission state
- [ ] PDF regression check passes (T26 SQL still returns 0 drift)
- [ ] Reviewer signs off on the diff (second pair of eyes)

---

## 13. Rollout order

```
Day 1  T1, T2          Schema migration + backfill
Day 2  T3, T4, T5      Core backend services + routes
Day 2  T6, T7, T8, T9  Smaller backend bits in parallel
Day 3  T10–T13         Admin UI (so admin can populate fields first)
Day 4  T14, T15        Doctor UI
Day 4  T16, T17, T18   Patient UI
Day 5  T19, T20        PDF + email integration (depends on T3 + T4 data)
Day 6  T21–T26         Final test pass, smoke checklist
Day 7  Follow-up       Drop `Doctor.imcRegistration` column
```

(Each "day" = code-day, not calendar.)

---

## 14. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Backfill writes wrong country row | Dry-run flag; validation SQL; rollback = targeted `DELETE` filtered by `verifiedAt > deploy_time` |
| Patient PII fields stored plaintext (carry-over) | Documented for separate at-rest encryption project; no regression vs current state |
| In-person appointment slips through with no clinic/address | 422 validation in backend + red field error in admin UI |
| Doctor with no registration set generates blank-header Rx | PDF emits "Registration: not on file" placeholder; `notifyAdmins` ping fired |
| Login audit floods table on bursts | Existing audit-log rotation applies; add follow-up if retention not yet defined |
| Existing patients have no address/national ID — Rx looks worse than before | PDF gracefully omits empty lines; admin bulk-edit screen as later QoL ticket |

---

## 15. Definition of "ready to start"

Before T1 ships, confirm:

- [ ] §0 defaults (Q1–Q5) accepted or overridden
- [ ] Rollout order in §13 acceptable
- [ ] PR strategy chosen: **one PR per code-day** (recommended) **or one PR per ticket**

---

## 16. Progress log

Append a dated entry every time something flips state. Newest at the top.

```
YYYY-MM-DD — <ticket> — <status> — <note>
```

- 2026-05-22 — Tests round 2 — `[x]` — Closed out the deferred items: T21 migration-SQL safety test (12 assertions), T22 doctor-registrations service tests (6, DB-backed gracefully skip), patient-self alert-rejection schema tests (6), auth route login-audit tests (3, gracefully skip), T23 admin-doctor-registrations route auth (3) + Zod schema, T24 aggregator route auth (2, gracefully skip). Total 168 / 153 pass / 0 fail / 15 gracefully-skipped.
- 2026-05-22 — Tests — `[x]` — Pure unit suite for PDF identity/address helpers (16 cases) + schedule-form XOR refine (8 cases). Total 136/136 pass, 2 DB-offline-skipped. T22/T23 deferred items documented; T24 deferred to manual smoke; T25 checklist tightened with two more flows.
- 2026-05-22 — Refactor — `[x]` — Moved `buildPatientIdLine` + `buildAddressLines` into a side-effect-free `generated-documents-fields.ts` so tests don't pull Prisma + env.
- 2026-05-22 — T20 — `[x]` — Reminder email + cron now handle IN_PERSON (was skipping them); same `where` plumbing as scheduled-email.
- 2026-05-22 — T19 — `[x]` — Rx/cert PDFs emit per-country chamber + registration number + patient identity line + address block. Placeholder + console.warn when registration missing.
- 2026-05-22 — T18 — `[x]` — Patient bookings page renders a "Where" block (+ Google Maps directions link) when IN_PERSON. Backend payload joined with Clinic.
- 2026-05-22 — T17 — `[x]` — Booking form gains country-aware national-ID field; logged-in patients persist to PatientProfile on submit.
- 2026-05-22 — T16 — `[x]` — Patient /account/profile gains "Medical identity" section + frontend proxy route.
- 2026-05-22 — T15 — `[x]` — Generated docs panel adds "Other (custom)" with required customLabel input.
- 2026-05-22 — T14 — `[x]` — Doctor patient chart panel expanded (Identity/Address/Plan/Pharmacy/Vitals/Alerts) + new All Documents card consuming T7.
- 2026-05-22 — T13 — `[x]` — Audit log: comma-list `action` filter on backend, Quick-filter chips + IP column on frontend.
- 2026-05-22 — T12 — `[x]` — Admin schedule form clinic picker shipped; backend Appointment DTO now exposes `consultationMode/clinicId/locationAddress`; new `/api/admin/clinics` route lists active clinics by country.
- 2026-05-22 — T11 — `[x]` — Patient profile editor card on `/admin/users/[id]` for role=PATIENT — Identity/Address/Plan/Alerts/Vitals sections + alert banner preview.
- 2026-05-22 — T10 — `[x]` — Admin doctor detail page gains a Medical-registrations card (one form per associated country) + `canCreateManualAppointments` checkbox on the edit sidebar. Schema + service + form parser propagate the flag.
- 2026-05-22 — T9 — `[x]` — OTHER doc type accepts customLabel; PDF, filename, and email subject all derive from it.
- 2026-05-22 — T8 — `[x]` — `verifyManualEntryPermission` helper + `GET /api/doctor/me/permissions` for UI gating. Actual create-manual-appointment route doesn't exist in this codebase yet; helper ready for the day it lands.
- 2026-05-22 — T7 — `[x]` — Patient-wide docs aggregator route shipped.
- 2026-05-22 — T6 — `[x]` — LOGIN / LOGOUT / LOGIN_FAILED audits hooked into auth.route. 108/108 tests still pass.
- 2026-05-22 — T5 — `[x]` — Appointment.clinicId + locationAddress wiring in admin schedule route; email gets a "Where" block, in-person skips the Meet CTA.
- 2026-05-22 — T4 — `[x]` — PatientProfile CRUD across patient-self / doctor / admin with role-scoped alert visibility. Alert mutations audit-logged.
- 2026-05-22 — T3 — `[x]` — DoctorCountry registration CRUD (admin). Audit emits DOCTOR_UPDATED with the registration payload.
- 2026-05-22 — T2 — `[x]` — Backfill script written + tsc clean. Prod dry-run + apply still pending on deploy.
- 2026-05-22 — T1 — `[x]` — Schema + hand-crafted additive migration shipped. `prisma validate` + `prisma generate` + `tsc` clean. Local DB unreachable so no `migrate dev` — deploy will run `migrate deploy`.
- 2026-05-22 — Decisions — `[x]` — Q1–Q5 defaults confirmed by user ("Start"); all 6 accepted as written.
- 2026-05-22 — Plan drafted — `[x]`
