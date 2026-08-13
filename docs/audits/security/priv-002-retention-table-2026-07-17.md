# PRIV-002 — Deletion / Anonymization Field Disposition Table

**Date:** 2026-07-17
**Finding:** PRIV-002 (post-launch-hardening-plan-2026-07-17.md, Wave 3, item 9)
**Owner decision:** proceed WITHOUT a prior legal session, on RETENTION-FIRST
defaults — "go according to medical law". Clinical records and invoices are
ALWAYS retained (medical + tax retention obligations); identity/contact/
marketing data is erased; every deletion produces an auditable record.

> ## ⚠️ LEGAL SIGN-OFF PENDING
> This table encodes the ENGINEERING default, not a lawyer-approved retention
> schedule. It errs deliberately on the side of KEEPING regulated records.
> Per-jurisdiction retention minimums (medical-record + tax) still need formal
> legal confirmation before the retention-year hints in
> `country-data-policy.service.ts` (`RETENTION_HINTS`) drive any divergent
> purge behaviour. Today behaviour is identical for every country.

## Dispositions

- **ERASE** — null / scramble / tombstone the value; it does not survive.
- **RETAIN-REGULATED** — keep as-is; medical-record or tax retention basis.
- **RETAIN-TOMBSTONED** — keep the row for FK integrity / clinical linkage,
  but its identity columns are scrubbed (row now keyed only to the GHN + a
  `deleted-<id>@removed.invalid` tombstone email).

### User (login account)

| Field group | Disposition | Basis |
|---|---|---|
| fullName | ERASE → "Deleted user" | identity |
| email | ERASE → `deleted-<userId>@removed.invalid` tombstone (frees address for re-registration; unique constraint honoured) | identity / login credential |
| phone, dateOfBirth | ERASE (null) | identity |
| passwordHash | ERASE → random 32-byte hash (unusable) | auth artifact |
| twoFactorSecret / twoFactorBackupCodes / twoFactorEnabled | ERASE (null / false / []) | auth artifact |
| tokenVersion | BUMP (+1) → every previously-issued JWT invalidated | session revocation |
| isActive | set false | account closed |
| role, id, createdAt | RETAIN-TOMBSTONED | FK integrity for Appointment/Order/AuditLog |

### PatientProfile

| Field group | Disposition | Basis |
|---|---|---|
| fullName, phone, dateOfBirth | ERASE (null) | identity |
| addressLine1/2, addressCity, addressPostalCode | ERASE (null) | contact |
| nationalIdNumber, taxIdNumber, passportNumber, utenteNumber, idDocumentNumber | ERASE (null) — encrypted-at-rest, nulling ciphertext suffices | national IDs |
| insurancePolicyNumber, insuranceProviderName, preferredPharmacy | ERASE (null) | identity / contact |
| idDocumentKey, idDocumentBackKey, insuranceDocumentKey | ERASE (null col) + key recorded for later object purge | personal upload (login-account, not clinical) |
| email | ERASE → `deleted-<profileId>@removed.invalid` tombstone | identity; prevents upsert-relink of a stranger |
| emailHash, phoneHash, nameDobHash | ERASE (null) — blind indexes | dedup safety |
| anonymizedAt | set now() | audit marker |
| globalHealthNumber, countryFolderCode, id, createdAt | RETAIN-TOMBSTONED | clinical-record identifier |
| weightKg, heightM, bmi, bloodType, allergies, chronicDiseases, familyHistory, socialHabits, surgeries, usualMedication, bloodPressure*, medicalNotes | **RETAIN-REGULATED** | medical record (retention overrides erasure) |
| statusAlert, clinicAlert | RETAIN-REGULATED | clinical flags |

### PatientNationalityDocument

| Field group | Disposition | Basis |
|---|---|---|
| documentNumber (encrypted), frontFileKey, backFileKey | ERASE (null); keys recorded for later object purge | national ID |
| row (id, documentType, slotNumber, ...) | RETAIN-TOMBSTONED | FK integrity |

### Sessions / auth artifacts

| Model | Disposition | Basis |
|---|---|---|
| TrustedDevice (all rows for user) | ERASE (deleteMany) | session revocation |
| LoginOtp (all rows for user) | ERASE (deleteMany) | session revocation |
| User.tokenVersion | BUMP | invalidates every outstanding JWT |

### Marketing

| Model | Disposition | Basis |
|---|---|---|
| NewsletterSubscriber (by original email) | ERASE (deleteMany) | marketing consent withdrawn |

### RETAINED-REGULATED (kept, linked to the tombstoned profile/user)

| Model | Basis |
|---|---|
| Appointment / Consultation | medical record |
| MedicalDocument (+ fileKey S3 objects) | medical record — files NOT deleted |
| GeneratedDocument | medical record |
| MedicalNote / medicalNotes | medical record |
| PatientConsent, MedicalAccessLog | clinical audit trail |
| Order, Payment, Invoice / credit notes | tax + financial retention |
| AuditLog | tamper-evident audit trail |

## Storage objects — what could NOT be safely purged in this pass

There is **no object-storage delete pipeline wired into the admin
`anonymizePatient` path** (the self-service grace-period purge in
`auth.service.ts` has one; the admin path does not). Rather than bolt an S3
client onto this refactor, the personal-upload keys (ID front/back, insurance
card, nationality-document scans) are:

1. nulled on their DB columns (no longer reachable through the app), and
2. recorded verbatim in the completion audit record under
   `personalStorageKeysQueuedForPurge`

for a later batch purge job to consume. Clinical `MedicalDocument` file
objects are intentionally left in the bucket (retention).

## Deletion-request fields previously discarded

`createDeletionRequest` accepted only `patientProfileId` + `globalHealthNumber`;
the route's `reason` and `requestType` were parsed then dropped. They are now
threaded through and persisted (into `DataDeletionRequest.notes`, no schema
change needed).

## Known pre-existing bug (NOT fixed here — flagged)

`createDeletionRequest` writes `requestStatus: "PENDING"` and the admin route
filters on `"PENDING" | "IN_REVIEW" | "APPROVED"`, none of which are members of
the `DataDeletionStatus` enum (`SUBMITTED | UNDER_REVIEW | PARTIALLY_COMPLETED
| COMPLETED | REJECTED`). Writing an out-of-enum status will fail at the DB.
This mismatch predates PRIV-002 and touching it means rewriting both route
schemas; left for a dedicated fix.
