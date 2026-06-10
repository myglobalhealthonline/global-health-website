# MyGlobalHealth Phase 2 — Medical Data Access, GDPR Consent Levels, Country Folders, Verification, Audit, and Security Plan

> **Status:** Draft for implementation. Saved 2026-06-10.
> **Reality check + improvements:** see the **[REVIEW](#review--repo-reality-check--improvements)** section appended at the end of this document. Roughly 40% of the data model in this plan already exists in `backend/prisma/schema.prisma` — read the REVIEW before building anything so you extend existing models instead of duplicating them.

You are working on the MyGlobalHealth / Global Health telemedicine platform.

This phase focuses on medical-record access control, country-based patient folders, GDPR consent levels, doctor confidentiality rules, login/security logging, automatic ID verification, patient data retention, and one-patient-one-file rules.

This plan must be implemented carefully because the platform handles sensitive medical data.

---

# 1. Confirmed Product Decisions

Use these decisions exactly.

## 1.1 ID Verification

ID verification should ideally be **automatic upon submission** of an identity document such as:

* Passport
* National ID card
* Residence card
* Other government ID document

The system should support automated verification, but also include manual admin fallback.

Required flow:

1. Patient uploads ID document/photo.
2. System sends document for automated verification.
3. Verification result is saved.
4. If verification fails or needs review, admin can manually approve/reject.
5. Doctor dashboard must show whether the patient is verified or not.

Important:

* ID verification should be highly recommended.
* ID verification should not block booking for now unless later changed by business/legal team.
* After booking, the patient should receive a link to confirm data and request ID verification via photo/document upload.

---

## 1.2 Global Health Number

The Global Health Number must be created **right after profile creation**.

Do not wait for ID verification.

Example format:

`GH-2026-000001`

Rules:

* Generated immediately after patient profile is created.
* Unique.
* Permanent.
* Used as the main patient identifier across admin, doctor, patient, appointment, medical file, invoice, prescription, and audit records.

---

## 1.3 Insurance Details

Insurance is **optional**.

Reason:

* Patient may not have insurance.
* Patient should still be able to create profile and book consultation without insurance.

Insurance fields should exist in profile but must not block the user.

---

## 1.4 GDPR Withdrawal

GDPR withdrawal should **not simply block all services**.

Instead, GDPR withdrawal should control the **level of access to the patient’s medical records**.

The system needs multiple levels of medical data processing/access consent.

Recommended levels:

1. **Direct Medical Professional Access**

   * Only the doctor/medical professional carrying out the consultation can access the patient’s medical record.

2. **Country Clinic / National Medical Team Access**

   * Doctors/providers within the patient’s selected country clinic/team can access records for safe continuity of medical care.
   * This mainly applies to clinic countries such as PT, CZ, IE.

3. **Global Health Medical Network Access**

   * Patient gives broader consent for their data to be viewed by the Global Health Medical Network.
   * This should be an explicit separate consent level.

If the patient withdraws a GDPR category, the system should reduce or remove that access scope.

---

# 2. Same Database, Country Folder Structure

## Objective

Use the same main database, but organize patient medical records using logical country folders/scopes.

This is not necessarily physical folders in storage only. It should be implemented as a strict access-control model using country scope, patient origin country, consent level, and role permissions.

## Core Rule

Each patient must be stored under a country-of-origin medical folder/scope.

Example:

* Patient origin country: Portugal
* Folder/scope: `PT`
* Patient file belongs to PT national folder.

## Countries Mentioned

Clinic countries:

* PT — Portugal
* CZ — Czechia
* IE — Ireland

Platform countries:

* BR — Brazil
* ES — Spain
* RO — Romania

The system should allow adding more countries later.

---

# 3. Country Access Models

There are two different access models.

---

## 3.1 Clinic Country Model — PT, CZ, IE

For countries where Global Health operates as a clinic or clinic network:

* PT
* CZ
* IE

Doctors/providers from the same clinic country may have access to patient medical records nationwide, where consent allows, for safe continuity of medical care.

Example:

A patient belongs to Portugal folder `PT`.

If the patient has consented to country clinic access, then approved Portugal clinic doctors/providers may access the patient’s medical records for continuity of care.

## Access Rule

Doctors in the same country clinic can access the patient file only if:

* Doctor belongs to same country clinic.
* Doctor is active/approved.
* Doctor has accepted confidentiality agreement.
* Patient has consented to country clinic access.
* Access is logged.
* Access reason/context is stored.

## 3.2 Platform Country Model — BR, ES, RO

For countries where Global Health acts mainly as a platform:

* BR
* ES
* RO

Only the medical provider conducting the service should have access to the patient’s medical file by default.

## Access Rule

For BR, ES, RO patients:

Only the specific doctor/provider assigned to the appointment/service can access the patient’s medical records, unless the patient gives broader consent.

If another doctor/provider needs access, the system must request patient authorization first.

---

# 4. Admin Access Rules

## 4.1 Local Admin

Local admin should have access only to national/country folders assigned to them.

Example:

* Portugal local admin can access PT folder.
* Ireland local admin can access IE folder.
* Brazil local admin can access BR folder.

Local admin cannot access all countries unless explicitly granted.

## 4.2 Global Admin

Global admin can access everything.

Global admin should have access to:

* All country folders
* All patient files
* All admin logs
* All medical access logs
* All consent records
* All verification records
* All security alerts

## 4.3 Access Logging for Admins

Every time a local or global admin opens a patient folder, the system must log it.

Log:

* Admin ID
* Admin name
* Role
* Country scope
* Patient ID
* Global Health Number
* Date/time
* IP address
* User agent
* What was accessed
* Reason if provided

---

# 5. Medical Access Consent Levels

## Objective

At booking and inside the patient portal, the patient must explicitly choose the level of medical-record access they allow.

Booking a consultation must not automatically mean full GDPR consent.

The patient must actively tick/select consent options.

## 5.1 Consent Level 1 — Direct Professional Only

Label:

`Only the medical professional carrying out my consultation may access my medical records.`

Meaning:

* Only the assigned doctor/provider for that appointment can access the file.
* Other doctors cannot access the file.
* If a different doctor needs access later, the patient must approve again.

Use case:

* Default for platform countries such as BR, ES, RO.
* Also available for all patients who want strict access.

## 5.2 Consent Level 2 — Country Clinic / Country Medical Team

Label:

`I agree that doctors and medical providers within my selected country clinic/team may access my medical records for continuity of care.`

Meaning:

* Relevant doctors/providers from the same country clinic/team can access the medical file.
* Applies mainly to countries where Global Health acts as a clinic: PT, CZ, IE.

Rules:

* Access must still be logged.
* Doctor must belong to same country/team.
* Doctor must have accepted confidentiality agreement.
* Access must be for valid continuity-of-care reason.

## 5.3 Consent Level 3 — Global Health Medical Network

Label:

`I agree that my medical records may be viewed by the Global Health Medical Network where required for my care.`

Meaning:

* Broader network access.
* This should be explicit and separate.
* Do not assume this consent automatically.

Rules:

* Patient must actively select it.
* Patient can withdraw it.
* Access must be logged.
* Admin should be able to review when this level was accepted/withdrawn.

---

# 6. Booking Consent Form

## Objective

During booking, patient must be shown a clear consent form. The consent must be separate from simply booking the consultation.

## Booking Flow Update

1. Patient selects service.
2. Patient selects country/clinic/service location if applicable.
3. Patient selects doctor/language/time.
4. Patient reaches consent step.
5. Patient chooses medical data access level.
6. Patient confirms required GDPR/legal notices.
7. Patient proceeds to payment/confirmation.

## Required Consent Text Logic

For PT, IE, CZ clinic model, show a clear consent tickbox:

`I consent to my medical file being accessible by the selected country clinic and its medical providers for continuity of care.`

For BR, ES, RO platform model, show direct-provider access by default:

`I consent to the medical professional conducting this service accessing my medical records for this consultation.`

Also allow optional broader access if business/legal team enables it:

`I consent to wider access by country doctors or the Global Health Medical Network.`

## Important Rule

Booking a consultation does not automatically grant full GDPR consent. The patient must actively select the consent level.

---

# 7. Cross-Country Access and Patient Travel

## Objective

If a patient travels to or books a consultation in a different country, they must confirm that their medical file can be opened by the relevant team in the other country.

## Example

Patient origin country: Portugal. Patient books consultation in Spain.

At booking, system must ask:

`You are booking a consultation in a different country from your original medical folder. Do you consent to your medical file being opened by the relevant medical team in this country for this consultation?`

## Rules

* Cross-country access requires explicit patient approval.
* Approval can be requested during booking, via secure platform notification, via secure email link, or via secure SMS link.
* Approval must be logged.
* Doctor in country X cannot access patient file from country Y unless authorized.

---

# 8. Doctor Requesting Access to Another Country File

## Objective

If a doctor in country X needs to request access to a patient file from country Y, the doctor must ask the patient for authorization.

## Required Flow

1. Doctor opens patient record request page.
2. Doctor selects reason for access.
3. System sends secure authorization request to patient.
4. Patient receives request via platform notification, email secure link, or SMS secure link.
5. Patient approves or denies.
6. If approved, doctor gets access according to allowed scope and time.
7. All actions are logged.

## Access Request Fields — `MedicalAccessRequest`

* `id`
* `patientId`
* `globalHealthNumber`
* `requestingDoctorId`
* `requestingDoctorCountry`
* `patientOriginCountry`
* `requestedAccessScope`
* `reason`
* `status` — Pending | Approved | Denied | Expired | Revoked
* `requestedAt`
* `approvedAt`
* `deniedAt`
* `expiresAt`
* `patientResponseIp`
* `createdAt`
* `updatedAt`

## Acceptance Criteria

* Doctor cannot open another country’s patient file without approval.
* Patient can approve or deny.
* Approval is time-limited if possible.
* Local/global admins can see request history.

---

# 9. Doctor Confidentiality Agreement

## Objective

Doctors must sign/accept a confidentiality agreement inside the system. This should happen once on first login or before accessing any patient file.

## Required Rule

Doctors must confirm they understand:

* Patient files are confidential.
* Entering a patient file unrelated to patient care is a breach of confidentiality.
* Access must only be for care, consultation, prescription, review, or authorized medical processing.
* Unauthorized access may be handled internally and may trigger compliance/security review.

## Flow

On doctor’s first login:

1. Show confidentiality agreement.
2. Doctor must tick confirmation.
3. Doctor signs electronically by clicking accept.
4. Store date/time, IP, user agent, doctor ID, agreement version.
5. Doctor cannot access patient records until accepted.

## Data Model — `DoctorConfidentialityAgreement`

* `id`
* `doctorId`
* `agreementVersion`
* `accepted`
* `acceptedAt`
* `ipAddress`
* `userAgent`
* `createdAt`

## Acceptance Criteria

* Doctor sees agreement on first login.
* Doctor cannot access patient file before accepting.
* Signed agreement is stored.
* Admin can view agreement acceptance status.

---

# 10. Patient Access History View

## Objective

Patient must be able to see which doctors/admins accessed their medical files.

## Patient Portal Section

`Patient Portal → Medical File → Access History`

Show:

* Doctor/admin name
* Role
* Country/team
* Date/time accessed
* What was accessed
* Access type: View | Download | Upload | Edit | Request access
* Reason if available

## Important

Patient should clearly see: `Doctor X accessed your medical file on [date/time].`

## Admin View

Admin should have a more detailed audit view including IP address, user agent, login session, country folder, access reason, resource ID, related appointment ID, whether access was normal or abnormal.

---

# 11. Medical Access Logging

## Objective

All entries and access into a patient folder must be registered. Every opening, viewing, download, upload, or edit must be logged.

## Required Logs

Log every: patient folder open, medical file view, medical document view, medical document download, prescription view/download, consultation note view/edit, lab/test request view/download, doctor upload, admin upload, patient upload, cross-country access request, consent-level change, ID verification access, insurance document access.

## Log Fields — `MedicalAccessLog`

* `id`
* `patientId`
* `globalHealthNumber`
* `patientCountryFolder`
* `actorId`
* `actorName`
* `actorRole`
* `actorCountry`
* `accessType` — View | Download | Upload | Edit | Delete | Request | Approve | Deny
* `resourceType` — PatientProfile | MedicalFile | MedicalDocument | Prescription | ConsultationNote | LabRequest | ExamResult | InsuranceDocument | IdentityDocument | ConsentRecord
* `resourceId`
* `appointmentId`
* `reason`
* `consentLevelUsed`
* `ipAddress`
* `userAgent`
* `loginSessionId`
* `isAbnormal`
* `abnormalReason`
* `createdAt`

## Acceptance Criteria

* Every medical file access creates a log.
* Patient can see simplified access history.
* Admin can see full access log.
* Logs cannot be edited by normal users.
* Logs should not be casually deleted.

---

# 12. Abnormal Access Detection and Alerts

## Objective

If there is any abnormality in the system, local admin and global admin must be warned directly through the system.

## Abnormality Examples

Flag access as abnormal if: doctor opens a file with no appointment relationship; doctor opens file from another country without authorization; doctor downloads unusually many records; admin accesses many patient files unusually fast; user fails login repeatedly; user logs in from unusual IP/location; doctor accesses file outside their service/country scope; consent level does not allow the attempted access; expired access link is used; suspicious duplicate patient file is detected.

## Alert Recipients

Relevant local admin, global admin, super admin/compliance role if available.

## Data Model — `SecurityAlert`

* `id`
* `severity` — Low | Medium | High | Critical
* `alertType`
* `patientId`
* `globalHealthNumber`
* `actorId`
* `actorRole`
* `countryFolder`
* `description`
* `status` — Open | Reviewing | Resolved | False Positive
* `createdAt`
* `resolvedAt`
* `resolvedByAdminId`

## Acceptance Criteria

* Abnormal access creates alert.
* Local and global admins can see alert.
* Alert has status workflow.
* Alert links to access log.

---

# 13. Encryption and Data Security

## Objective

Encryption of medical data and all sensitive data is required.

## Requirements

* Encryption at rest for database/storage.
* Encryption in transit using HTTPS/TLS.
* Private document storage.
* Signed/protected download URLs.
* Role-based access control.
* Country-folder scoped authorization.
* Strong session handling.
* Secure password storage.
* Environment variables for secrets.
* No sensitive documents in public folders.
* No medical records exposed via public URL.

## Sensitive Data

Medical files, medical reports, prescriptions, consultation notes, lab/test requests, exam results, ID documents, insurance documents, consent records, payment/invoice details, login/security logs.

---

# 14. Double Authentication / 2FA

## Objective

Double authentication should be required for logins, especially for admin and doctor accounts.

## Required 2FA Rules

* Global admin: 2FA required
* Local admin: 2FA required
* Doctor: 2FA required
* Patient: 2FA recommended, optional initially unless business decides otherwise

## Supported Methods

Email OTP, SMS OTP, Authenticator app. Preferred: authenticator app or email OTP for admins/doctors; SMS/email OTP for patients if enabled.

## Acceptance Criteria

* Admin cannot access dashboard without 2FA.
* Doctor cannot access patient records without 2FA.
* Login attempts are logged.
* Failed 2FA attempts are logged.
* Recovery flow exists for admins.

---

# 15. Login Logging

## Objective

All login entries must be stored with date, IP address, and user details.

## Data Model — `LoginAuditLog`

* `id`
* `userId`
* `userRole`
* `email`
* `loginStatus` — Success | Failed | 2FA Failed | Locked
* `ipAddress`
* `userAgent`
* `countryDetected`
* `deviceInfo`
* `createdAt`

## Acceptance Criteria

* Every login attempt is logged.
* Admin can view login history.
* Suspicious login patterns can trigger security alert.
* Logs include IP and user.

---

# 16. Patient Email and Phone Change Rules

## Objective

Only authorized users can change patient email and phone number.

## Rule

Patient email and phone number can be changed only by local admin, global admin, or a verified patient through secure verification flow.

## Patient Self-Change Flow

1. Patient requests change.
2. System verifies current login.
3. System sends OTP or confirmation to old and/or new contact.
4. Once confirmed, update details.
5. Save audit log.

## Admin Change Flow

Admin must provide reason. Change is logged. Patient should be notified.

## Data Model — `PatientContactChangeLog`

* `id`
* `patientId`
* `changedById`
* `changedByRole`
* `fieldChanged` — Email | Phone
* `oldValue`
* `newValue`
* `reason`
* `ipAddress`
* `createdAt`

## Acceptance Criteria

* Unverified patient cannot freely change email/phone.
* Verified patient can change through secure verification.
* Admin changes are logged.
* Patient is notified of changes.

---

# 17. ID Verification Flow After Booking

## Objective

After booking consultation, patient should receive a link to confirm personal data and complete ID verification by photo/document.

## Flow

1. Patient books consultation.
2. System sends secure link by email/SMS.
3. Link opens patient verification page.
4. Patient confirms personal details.
5. Patient uploads ID photo/document.
6. Automated ID verification runs.
7. Status updates: Verified | Pending review | Failed | Rejected.
8. Doctor dashboard displays patient verification status during consultation.

## Doctor Dashboard Requirement

On appointment detail page, show patient verification status, ID verified (Yes/No/Pending/Failed), Global Health Number, patient country folder, consent/access level.

## Acceptance Criteria

* Booking triggers verification link.
* Patient can verify after booking.
* Doctor can see verification status.
* ID verification does not block booking for now.

---

# 18. One Patient, One File Policy

## Objective

Each patient should have one medical file only. If duplicates are found, admin must be able to merge both files, and patient must be informed.

## Duplicate Detection

Same email, same phone, same ID document number, same passport number, same name + date of birth, similar name + same date of birth. Same Global Health Number should never duplicate.

## Admin Merge Flow

1. System flags possible duplicate.
2. Admin reviews both patient profiles.
3. Admin chooses primary patient file.
4. Admin merges duplicate file into primary.
5. All appointments, documents, invoices, prescriptions, logs, consents are moved/linked to primary file.
6. Old duplicate record is marked as merged.
7. Patient is informed.

## Data Model

Add to patient table: `mergedIntoPatientId`, `isMerged`, `mergedAt`, `mergedByAdminId`.

### `PatientMergeLog`

* `id`
* `primaryPatientId`
* `duplicatePatientId`
* `globalHealthNumberPrimary`
* `globalHealthNumberDuplicate`
* `mergedByAdminId`
* `reason`
* `patientInformed`
* `createdAt`

## Acceptance Criteria

* Admin can merge duplicate patient files.
* Medical records are not lost.
* Audit history is preserved.
* Patient is informed.
* Duplicate file cannot remain active after merge.

---

# 19. Medical Data Retention

## Objective

Medical data storage must follow local legal/regulatory guidelines.

## Requirement

Do not hardcode one global retention period. Create configurable retention policy by country.

Known guidance: Brazil 20 years; Europe average 10 years; exact rules confirmed with legal entities.

## Data Residency Note

Storage of Brazilian medical files in EU or Brazil must be confirmed with legal entities. The system should support configurable data residency and retention rules per country.

## Data Model — `CountryDataPolicy`

* `id`
* `countryCode`
* `countryName`
* `retentionYears`
* `storageRegion` — EU | BR | Other
* `requiresLocalStorage`
* `legalNotes`
* `isActive`
* `createdAt`
* `updatedAt`

## Acceptance Criteria

* Retention period is configurable by country.
* Storage region can be configured by country.
* System does not delete medical records just because patient requested deletion if local regulation requires retention.
* Patient deletion requests should be logged and reviewed.
* Legal confirmation should be required before automated deletion.

---

# 20. GDPR Data Deletion Request Handling

## Objective

Patient may request their data to be deleted. However, medical records may need to remain stored for X years according to local regulation.

## Flow

1. Patient submits data deletion request.
2. System explains that some medical records may need to be retained.
3. Request is logged.
4. Admin/legal team reviews.
5. Data that can be deleted/anonymized is processed.
6. Medical records that must be retained are restricted but not deleted until retention period ends.
7. Patient is notified of the result.

## Data Model — `DataDeletionRequest`

* `id`
* `patientId`
* `globalHealthNumber`
* `requestStatus` — Submitted | Under Review | Partially Completed | Completed | Rejected
* `requestedAt`
* `reviewedByAdminId`
* `reviewedAt`
* `legalReasonForRetention`
* `completedAt`
* `patientNotificationSent`

## Acceptance Criteria

* Patient can request deletion.
* System does not automatically delete medical records that must legally remain.
* Admin can review request.
* Patient receives response.

---

# 21. Country Folder / Access Data Model

Add to patient profile: `globalHealthNumber`, `originCountryCode`, `currentCountryCode`, `countryFolderCode`, `medicalAccessConsentLevel`, `idVerificationStatus`, `isVerified`, `profileCreatedAt`.

Add to doctor profile: `doctorCountryCode`, `clinicCountryCode`, `allowedCountryFolders`, `confidentialityAgreementAccepted`, `twoFactorEnabled`.

Add to admin profile: `adminScope` (Local | Global | SuperAdmin), `allowedCountryFolders`, `twoFactorEnabled`.

---

# 22. Access Permission Logic

Before allowing access:

1. Identify actor: Patient | Doctor | Local Admin | Global Admin.
2. Identify patient: Patient ID, Global Health Number, country folder, consent level.
3. Check role permission.
4. Check country folder permission.
5. Check consent level.
6. Check appointment relationship if required.
7. Check doctor confidentiality agreement.
8. Check 2FA/session validity.
9. Create access log.
10. If abnormal, create security alert.

## Doctor Access Rules

### Direct Professional Access
* Doctor assigned to patient’s appointment/service.
* Patient consented to direct professional access.
* Appointment valid/current/recent enough.
* Access logged.

### Country Clinic Access
* Doctor belongs to same country clinic/team.
* Patient consented to country clinic access.
* Country under clinic model.
* Access for continuity of care.
* Access logged.

### Global Network Access
* Patient consented to Global Health Medical Network access.
* Doctor part of approved network.
* Access reason provided.
* Access logged.

### Cross-Country Access
* Patient explicitly approved access request.
* Approval valid/not expired.
* Access logged.

---

# 23. Patient Portal Updates

## Dashboard
Global Health Number, verification status, country folder, GDPR medical access level, upcoming appointments, Trustpilot reminder if applicable.

## Profile
Personal details, insurance details, dual nationality, ID verification, email/phone verification, Global Health Number.

## Privacy & Consent
Direct professional access consent, country clinic/team access consent, Global Health Medical Network access consent, marketing consent, lab/pharmacy sharing consent, consent history, withdraw/change consent options.

## Medical File
Patient-uploaded reports, doctor-uploaded results, prescriptions, lab/test requests, consultation summaries, access history.

## Access Requests
Pending doctor access requests, country/cross-border access requests, approve/deny buttons, expiry time.

## Data Requests
Request data deletion, request data export if needed, request correction.

---

# 24. Doctor Portal Updates

Doctor dashboard must show patient Global Health Number, patient country folder, patient verification status, patient consent/access level, whether doctor is allowed to access medical file, reason if access is blocked, secure request access button if access is not allowed, upload documents/results, view/download allowed documents, access logs created automatically.

Before doctor can access files: 2FA must be complete; confidentiality agreement must be accepted; access permission must pass; access must be logged.

---

# 25. Admin Portal Updates

## Local Admin
Access assigned national folders, view patient files in assigned country, view access logs for assigned country, review abnormal alerts for assigned country, manage ID verification fallback, review consent status, review duplicate patient files, merge duplicates if permitted, view doctor confidentiality agreement status for local doctors.

## Global Admin
Access all folders, view all patients, view all logs, view all security alerts, manage country policies, manage retention policies, manage cross-country access rules, manage admin/doctor permissions, review duplicate merges.

---

# 26. Security Alerts Dashboard

`Admin → Security & Compliance Alerts`

Show: abnormal medical access, suspicious login, cross-country blocked attempts, consent mismatch attempts, duplicate patient warnings, failed ID verification, failed 2FA attempts.

Each alert: severity, patient, actor/user, country folder, description, date/time, status, action buttons (Mark reviewing, Resolve, False positive, Escalate).

---

# 27. Implementation Order

1. Country folder/scope model.
2. Global Health Number generation after profile creation.
3. Role and country-based access control.
4. GDPR medical access consent levels.
5. Booking consent form update.
6. Doctor confidentiality agreement.
7. 2FA for doctors/admins.
8. Login audit logging.
9. Medical access logging.
10. Patient access history view.
11. Cross-country access request flow.
12. Automatic ID verification with manual fallback.
13. Doctor dashboard verification display.
14. Patient email/phone secure change rules.
15. Security/abnormality alerts.
16. One-patient-one-file duplicate detection and merge.
17. Country data retention and storage policy configuration.
18. GDPR deletion request handling.
19. Full QA and compliance testing.

---

# 28. Testing Checklist

(Original checklist retained — see source. Covers country folder access, clinic vs platform model, consent levels, cross-country access, audit logs, security alerts, doctor agreement, 2FA, ID verification, contact changes, duplicate merge, retention.)

---

# 29. Final Expected Result

After this phase: one database with country-based patient medical folders/scopes; PT/CZ/IE clinic continuity-of-care access where consent allows; BR/ES/RO direct-provider-only access by default; local admins access only national folders; global admins access everything; every patient file access logged; patient can see who accessed their file; doctors must sign confidentiality agreement; booking has explicit GDPR/medical-access consent choices; GDPR withdrawal reduces access level instead of blocking all services; cross-country access requires patient authorization; medical data encrypted and securely stored; admins/doctors require 2FA; all logins stored with date/IP/user; automatic ID verification with manual fallback; doctor sees verification status; patient email/phone changes controlled; duplicate files merge under one-patient-one-file; retention/storage configurable per country.

---
---

# REVIEW — Repo Reality Check & Improvements

> Added 2026-06-10 after auditing `backend/prisma/schema.prisma` (2100 lines, 70+ models). **Read this before building.** Roughly 40% of the plan's data model already exists. Build on it; do not duplicate it.

## A. Already built — DO NOT rebuild

| Plan section | Status | Where it lives today |
|---|---|---|
| §1.2 Global Health Number `GH-YYYY-000001`, atomic, unique, permanent | ✅ **DONE** | `PatientProfile.globalHealthNumber` (`@unique`, indexed) + `GhnCounter` (year + `lastSeq BigInt` for atomic issuance) |
| §1.3 Optional insurance (never blocks) | ✅ **DONE** | `PatientProfile.insuranceProviderName / insurancePolicyNumber` (PHI-encrypted) `/ insuranceDocumentKey / insuranceDocumentStatus` |
| §1.1 / §17 ID-verification fields | 🟡 **PARTIAL** | `idVerificationStatus / idDocumentKey / idDocumentBackKey / idDocumentType / idDocumentNumber / idDocumentIssuingCountry / idDocumentExpiryDate / idVerificationReviewedBy / idVerificationReviewedAt`. **Manual admin only — NO automated provider.** |
| §5 Consent storage | 🟡 **PARTIAL** | `PatientConsent` (append-only, no `updatedAt`, has `consentType / consentValue / consentVersion / source / changedByRole`). Flat booleans — **not** the 3-level Direct/Country/Network model yet. |
| §11 Medical access log | 🟡 **PARTIAL** | `MedicalAccessLog` exists with `accessedByRole / accessedResourceType / accessAction / accessReason / relatedAppointmentId / ipAddress / userAgent`. **Missing:** `patientCountryFolder`, `actorCountry`, `consentLevelUsed`, `isAbnormal`, `abnormalReason`, `loginSessionId`. |
| §13 Encryption at rest (PHI) | 🟡 **PARTIAL** | `phi:v1:` AES-256-GCM envelope already in use on `nationalIdNumber`, `insurancePolicyNumber`. Reuse the same helper for new secrets. |
| §15 Login logging | 🟡 **PARTIAL** | `AuditLog` + `AuditAction` already has `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, plus `USER_ROLE_CHANGED`, `PATIENT_PROFILE_UPDATED`, etc. A separate `LoginAuditLog` table would be a **second silo** — see improvement #2. |

## B. Real gaps — greenfield work this phase

- **No local-vs-global admin.** `enum UserRole { PATIENT, ADMIN, DOCTOR }` only. `ADMIN` = full global access today. No `SUPER_ADMIN`, no `adminScope`, no `allowedCountryFolders`. **This is the riskiest gap** — every existing `role === 'ADMIN'` check assumes global access. Splitting is a breaking change; audit every call site.
- **No 2FA anything.** Grep for `twoFactor|totp|mfa|otpSecret` = empty. Fully greenfield (§14).
- **No clinic-vs-platform country flag.** `Country` has `code`, `isActive`, `enabledFeatures[]` but no access-model type. Need `accessModel CLINIC | PLATFORM` (§3).
- **No country folder on patient.** `PatientProfile` has `addressCountryCode` but no `originCountryCode / countryFolderCode / currentCountryCode / medicalAccessConsentLevel` (§21).
- **No doctor folder/agreement fields.** `Doctor` has `countryId` (primary) + `additionalCountries` (`DoctorCountry` M:N) — but no `confidentialityAgreementAccepted`. Note: `DoctorCountry` **already models doctor↔multiple countries** — use it as `allowedCountryFolders`, don't add a parallel array (see #improvement-A).
- **Missing models (all greenfield):** `MedicalAccessRequest` (§8), `DoctorConfidentialityAgreement` (§9), `SecurityAlert` (§12), `PatientContactChangeLog` (§16), `PatientMergeLog` + merge fields (§18), `CountryDataPolicy` (§19), `DataDeletionRequest` (§20).

## C. Improvements — apply these

**1. Fold the 3 consent levels into the existing `PatientConsent` table — don't invent a new structure.**
Add three `consentType` values: `MEDICAL_ACCESS_DIRECT`, `MEDICAL_ACCESS_COUNTRY_CLINIC`, `MEDICAL_ACCESS_GLOBAL_NETWORK`. Because the table is append-only with `consentVersion` + `source`, you get a free, immutable consent + withdrawal audit trail: withdrawal = new row with `consentValue=false`. "Current level" = latest row per type. Booking writes rows with `source='BOOKING_FORM'` (already supported). Mirror the latest values onto `PatientProfile.medicalAccessConsentLevel` only as a denormalized read cache for fast guard checks.

**2. Extend `AuditLog`, don't add a second `LoginAuditLog` silo.**
`AuditLog` already carries `LOGIN / LOGOUT / LOGIN_FAILED` + actor relation. Add `TWO_FACTOR_FAILED`, `ACCOUNT_LOCKED` to `AuditAction` and a structured `detail Json` (or `ipAddress/userAgent/countryDetected` columns) rather than a parallel table. One audit pipeline = one place to query for the security dashboard. (If volume/retention rules force a split later, do it then — YAGNI now.)

**3. ONE server-side access guard is the linchpin of this whole phase.**
The plan scatters access rules across §3, §4, §5, §7, §8, §22. That guarantees drift and a PHI leak. Build a single `assertMedicalAccess({ actor, patient, resourceType, resourceId, reason })` that:
   - runs the §22 checks in order,
   - returns `{ allowed, consentLevelUsed, denyReason }`,
   - **writes the `MedicalAccessLog` row as a side effect** (no caller can forget),
   - **raises a `SecurityAlert` on abnormal/denied** access.
   Then make EVERY read path call it — doctor portal, admin portal, REST API, PDF/document download, **share links**, exports. No PHI read may bypass it. This is the single most important deliverable; build it in step 3, not last.

**4. Append-only logs need DB-level enforcement, not just "no `updatedAt`."**
Acceptance says "logs cannot be edited/deleted by normal users" — Prisma can't guarantee that. In Postgres: `REVOKE UPDATE, DELETE ON medical_access_log, patient_consent, ... FROM <app_role>;` or add a `BEFORE UPDATE OR DELETE` trigger that raises. Otherwise tamper-proofing is fiction.

**5. Automated ID verification — pick a provider, go async, fail-open to the existing manual queue.**
Recommend **Stripe Identity** (Stripe is already integrated — `stripeCustomerId` exists), or Onfido/Veriff/iDenfy/Regula as alternatives. Flow: upload → create provider session → webhook updates the existing `idVerificationStatus`. Add `idVerificationProvider`, `idVerificationProviderRef`, `idVerificationConfidence`, `idVerificationRawResult Json`. **Never hard-auto-reject** — route low-confidence to the manual admin fallback that already exists. Keep §1.1's "does not block booking" rule.

**6. 2FA: TOTP-first for staff, opt-in for patients.**
Authenticator app (`otpauth` + `qrcode`) for `ADMIN/DOCTOR/SUPER_ADMIN`; email OTP as patient option. Add to `User`: `twoFactorEnabled`, `twoFactorSecret` (encrypt with the existing `phi:v1` envelope), `twoFactorBackupCodes String[]` (store **hashed**), `twoFactorVerifiedAt`. Enforce at session issuance — a staff session without a passed 2FA step must not resolve the medical guard.

**7. Cross-country / doctor request = a real capability grant with TTL, checked live by the guard.**
`MedicalAccessRequest` approval must mint a time-boxed, scoped grant the guard reads — not just a status the UI trusts. Add a `MedicalAccessGrant { patientId, doctorId, scope, expiresAt, revokedAt }` (or reuse the existing `ShareLink` signing infra for the patient-approval link). The guard checks live, unexpired grants. This closes the "doctor in country X reads country Y file" hole properly.

**8. Abnormal detection — deterministic rules now, async, deduped. No ML.**
Cheap rules inside the guard + a queued sweep: no-appointment access, cross-country with no grant, volume threshold per actor/window, off-scope country, expired link reuse, repeated login fail. `SecurityAlert` needs a `dedupeKey` (actor+type+day) to avoid alert storms. Don't block the request on detection — log + alert async.

**9. Patient merge is the highest-blast-radius op — make it transactional, reversible-ish, and exhaustive.**
   - Wrap in a single transaction; snapshot **both full records as JSON** into `PatientMergeLog` before touching anything.
   - Enumerate EVERY table holding `patientProfileId` and re-point FKs: `Appointment`, `MedicalDocument`, `MedicalNote`, `Prescription`, `Consultation`, `ExamResult`, `Order`, `PatientConsent`, `MedicalAccessLog`, `PatientNationalityDocument`, `AppointmentDocument`, `FormSubmission`, … (run `grep -l patientProfileId` to get the full list — don't trust memory).
   - Duplicate stays a **soft tombstone** (`isMerged=true`, `mergedIntoPatientId`) — never hard delete.
   - **Dedup detection blocker:** `nationalIdNumber` etc. are AES-encrypted — you **cannot** `LIKE`/match on ciphertext. Add deterministic **blind-index hash columns** (`emailHash`, `phoneHash`, `idDocHash`, `nameDobHash`) computed with an HMAC key, and match on those.

**10. GDPR deletion vs retention → model as ANONYMIZATION, not deletion.**
When `CountryDataPolicy.retentionYears` blocks deletion, scrub direct PII (name/contact/address/ID) but keep the clinical record under the GHN pseudonym. Add `PatientProfile.anonymizedAt`. This satisfies both "right to erasure" and medical retention law (Brazil 20y / EU ~10y as planned). `DataDeletionRequest` drives the workflow.

**11. Data residency is infra, not just a column.**
`CountryDataPolicy.storageRegion / requiresLocalStorage` is fine as policy config, but real residency = per-country S3 bucket/region routing in the storage layer. **Flag BR-PHI-in-EU as a legal blocker** to resolve with counsel before storing Brazilian PHI — a column alone does not satisfy LGPD.

**12. Audit logs are themselves PII — give them a retention policy too.**
The plan logs IP + UA + session everywhere (correct for security) but never says when those get purged. Under GDPR that's over-collection if kept forever. Define rotation for `MedicalAccessLog` / login audit (e.g. partition by month, purge/aggregate after policy window). Also: `MedicalAccessLog` will grow fast — partition by month and keep the patient-facing "who accessed" view reading the denormalized `accessedByName` (already stored) so it never joins to `User`.

**13. Versioned consent text, provable.**
`PatientConsent.consentVersion` exists ✅ — back it with a small `ConsentDocument { key, version, locale, bodyText, effectiveFrom }` registry so you can later prove the exact wording a patient saw. Booking + portal both reference the active version.

## D. Sequencing correction to §27

§27 order is mostly right, but make the access foundation a **blocking Wave 0** (matches the existing `patient-portal-expansion-plan.md` Wave-0 pattern):

- **Wave 0 (blocking, one migration):** `UserRole.SUPER_ADMIN` + `adminScope` + admin/doctor `allowedCountryFolders` (reuse `DoctorCountry`); `Country.accessModel`; `PatientProfile.originCountryCode/countryFolderCode/currentCountryCode`; the central **`assertMedicalAccess` guard** (#3); blind-index hash columns (#9). Everything downstream depends on these.
- **Parallel track A:** 2FA (#6) + extend `AuditLog` (#2).
- **Parallel track B:** 3-level consent on existing `PatientConsent` (#1) + booking consent form + portal Privacy/Consent screen.
- **Parallel track C:** automated ID verification (#5) + doctor dashboard verification display.
- **Then:** cross-country grants (#7), confidentiality agreement, abnormal alerts (#8), contact-change log.
- **Last (highest risk):** patient merge (#9), retention/residency (#10/#11), GDPR deletion/anonymization (#10).

## E. Open questions for business/legal before coding

1. When `ADMIN` splits into Local/Global/Super, which existing admins become Global? (Migration default matters — defaulting all current admins to Global is safest for continuity but must be a conscious choice.)
2. Stripe Identity coverage for PT/CZ/IE/BR/ES/RO document types — confirm before committing the provider.
3. BR medical-record residency: EU or BR storage? (Hard blocker for any BR PHI write — #11.)
4. Exact retention years per country (Brazil 20 / EU ~10 are placeholders until legal confirms — #10).
5. Patient 2FA: opt-in only at launch, or required for medical-file access? (#6)
