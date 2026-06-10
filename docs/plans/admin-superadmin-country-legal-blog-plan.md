# Admin / Superadmin Upgrade Plan — Queue, Manual Booking, Country Legal, Categories, Doctor Profile, Blog

**Status:** Draft — grounded against the live codebase (2026-06-10)
**Owner:** TBD
**Source:** AI agent prompt "Superadmin, Manual Booking, Country Legal Settings, Categories, Doctor Profile, and Blog Country/Translation Improvements" (original spec preserved verbatim in Appendix A).

> This document is the **reviewed and codebase-grounded** version of the original prompt. Every requirement has been checked against the actual Prisma schema (`backend/prisma/schema.prisma`), backend services/routes, and the Next.js admin frontend. Several requested features **already exist** and only need verification; others are net-new and require migrations. The original 19-section spec is preserved at the bottom so nothing is lost.

---

## 1. Executive summary

The platform is far more mature than the prompt assumes. Findings:

| # | Requirement | Reality | Work needed |
|---|-------------|---------|-------------|
| 1 | Queue: filter by doctor name | No doctor filter in queue (only status/country/type/search) | **Small** — add param + where-clause + UI |
| 2 | Manual booking: country first | Frontend is **already** country-first (Step 1 = country) | UI: scope service/doctor lists to country (mostly done) |
| 3 | Manual booking: doctor filtered by country+service | Backend validates service↔country only; **no** doctor↔service / doctor↔country check; UI shows all country doctors | **Small** — backend guard (anti-tamper) + UI filter |
| 4 | Manual booking scheduling uses country timezone | Availability/public booking is fully TZ-aware (luxon, DST). **Manual booking stores the admin's input as literal UTC** — a real bug | **Small** — convert wall-clock→UTC with country TZ |
| 5 | Spring/autumn DST | **Done** for slot generation (`doctor-availability/timezone.ts`, IANA, luxon) | Verify manual booking inherits it |
| 6 | Country business + legal + registration fields | `Country` has none; `CountryFooter` has contact-only | **Large** — new model(s) + migration |
| 7 | Country legal documents (rich text + PDF) | No model; legal pages are hardcoded i18n; upload route is image-only | **Large** — new model + PDF upload + public render |
| 8 | Configurable data-protection naming (GDPR/LGPD) | "GDPR" hardcoded in templates + UI | **Medium** — config field + template wiring |
| 9 | Dispute resolution info | None | **Medium** — fields on legal model + render |
| 10 | Categories filter/sort by country | `Service`/`Specialty` are country-scoped with `sortOrder`; specialties have a country matrix UI; **no bulk reorder endpoint**, no explicit country filter on services list | **Small/Medium** — reorder endpoints + filter UI |
| 11 | Doctor profile: email + phone admin-only | **Already correct** — admin sees `loginUser.email` + `whatsappNumber`; public payload omits both; doctor portal is self-scoped | Optional polish: explicit contact columns + render on detail page |
| 12 | Blog: assign to multiple countries | `BlogPost.countryId` is single nullable | **Medium** — M:N join + migration |
| 13 | Blog: manual translations | Row-per-locale today (`@@unique([slug, locale, countryId])`); other entities use child translation tables | **Large** — adopt `BlogTranslation` + backfill |
| 14 | Blog admin filters | Only status/locale/search | **Small** — add country/author/date/translation-status |

**Tech stack:** pnpm monorepo (`backend` Fastify + Prisma/Postgres, `frontend` Next.js App Router). Admin UI under `frontend/app/(admin)/admin/*`. Auth via `verifyAdminAccess` → `evaluateAdminAccess` (allows `ADMIN | SUPER_ADMIN | LOCAL_ADMIN`, rejects `PATIENT | DOCTOR`).

### ⚠️ Migration blocker (must clear before any schema phase)

A prior peak-pricing migration is recorded as **BLOCKED by a pre-existing broken migration**. Phases 2–4 below add Prisma models/columns and therefore require migrations. **Resolve the broken migration first** (inspect `backend/prisma/migrations/`, repair or `migrate resolve`) so `prisma migrate dev` runs clean. Until then, ship only the **zero-schema** Phase 0/1 work.

---

## 2. Phased roadmap

Ordered by value-to-risk. Phase 0 ships immediately (no migration). Phases 2–4 are gated on clearing the migration blocker.

### Phase 0 — Booking + queue hardening (zero schema) ✅ start here

Self-contained, testable, no migration. Matches spec §1–5, §16.

| Item | Files | Change |
|------|-------|--------|
| **1. Queue doctor-name filter** | `backend/src/validations/admin-appointments.schema.ts`, `backend/src/modules/appointments/appointments.service.ts` (`buildAppointmentWhereClause` ~357), `frontend/app/(admin)/admin/appointments/page.tsx` (~167) | Add `doctorName?` query param → case-insensitive `Doctor.fullName` substring in the where-clause; add a search input that composes with existing status/country/type/date/payment filters |
| **3. Manual booking backend guard (anti-tamper)** | `backend/src/modules/appointments/manual-booking.service.ts` (~148) | After service+doctor lookup, reject when the doctor is not active, not bookable for the service (`ServiceDoctor` active+`status='active'`), or not in the country (`Doctor.countryId === country.id` OR active `DoctorCountry`). New error classes → 422. **Enforced server-side even if the frontend is bypassed.** |
| **2. Manual booking UI doctor filter** | `frontend/app/(admin)/admin/appointments/new/page.tsx` (~98), `frontend/lib/admin/admin-api.ts` | Disable doctor dropdown until country+service chosen; filter list to `service.assignedDoctors`; optional `?serviceId=` on `fetchAdminDoctors` |
| **4. Manual booking timezone fix** | `manual-booking.service.ts` (~244), `new/page.tsx` (~309), reuse `doctor-availability/timezone.ts:zonedWallClockToUtc` | Treat the admin's `scheduledAt` as **clinic-local wall-clock**, convert to UTC with `Country.bookingSetting.timezone`; relabel UI "Scheduled at (UTC)" → "(Ireland local time · Europe/Dublin)" |
| **Audit** | reuse `recordAudit` | Log `APPOINTMENT_CREATED` already exists; ensure manual booking path records it |

### Phase 1 — Categories + doctor polish (zero schema)

| Item | Files | Change |
|------|-------|--------|
| **10. Reorder + country filter** | `backend/src/routes/admin-services.route.ts`, `backend/src/modules/services/services.service.ts`, `backend/src/validations/admin-services.schema.ts`, `frontend/app/(admin)/admin/services/page.tsx`, `frontend/app/(admin)/admin/specialties/page.tsx` | Add `PATCH /api/admin/services/reorder` + `/specialties/reorder` (bulk `sortOrder`); add explicit country-picker filter on the services list (specialties already have the matrix). All behind `verifyAdminAccess` |
| **11. Doctor contact render** | `frontend/app/(admin)/admin/doctors/[id]/page.tsx`, `doctors.service.ts` admin include | Email/phone are already admin-gated; surface them cleanly on the **detail** page (read-only block) with a "Internal — not public" badge. Verify public payload still omits `loginUser`/`whatsappNumber` |

> **Optional schema (defer to a schema phase):** if "internal contact email/phone distinct from login email" is required, add `Doctor.contactEmail` / `Doctor.contactPhone` (nullable). Until then, `User.email` + `whatsappNumber` satisfy the requirement.

### Phase 2 — Country business + legal + registration + dispute (migration)

Spec §6, §9. New models (keeps `Country` slim; one-to-one + child rows):

```prisma
/// Company / legal entity + registration + regulator + dispute-resolution
/// details per country. One row per country. Admin-edited from the country
/// form; consumed by footer, legal pages, invoices, generated PDFs.
model CountryLegalProfile {
  id                      String   @id @default(cuid())
  countryId               String   @unique
  country                 Country  @relation(fields: [countryId], references: [id], onDelete: Cascade)

  // Company / contact
  legalCompanyName        String?
  legalAddress            String?   // multiline
  publicPhones            String[]  @default([])
  publicEmails            String[]  @default([])
  supportEmail            String?
  billingEmail            String?

  // Registration / regulatory
  companyRegistrationNumber String?
  taxVatNumber              String?
  medicalRegistrationNumber String?
  healthcareLicenseDetails  String?
  regulatorName             String?
  regulatorWebsite          String?

  // Legal backlinks (each nullable https URL)
  companyRegistryUrl        String?
  medicalRegulatorUrl       String?
  healthcareAuthorityUrl    String?
  dataProtectionAuthorityUrl String?
  disputeResolutionUrl      String?
  consumerProtectionUrl     String?

  // Data-protection naming (spec §8) — overrides hardcoded "GDPR"
  dataProtectionLawName     String?  @default("GDPR")  // e.g. "GDPR", "LGPD"
  dataProtectionPolicyTitle String?
  dpoName                   String?
  dpoEmail                  String?

  // Dispute resolution (spec §9)
  disputeBodyName           String?
  disputeEmail              String?
  disputePhone              String?
  disputeProcessText        String?
  legalJurisdictionText     String?
  consumerRightsText        String?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

- **Backend:** extend `adminCountryInclude`, `createAdminCountry`/`updateAdminCountry` (upsert `CountryLegalProfile` in the same transaction), validation schema in `admin-countries.schema.ts`. Audit via `COUNTRY_FOOTER_UPDATED`-style action (add `COUNTRY_LEGAL_UPDATED`).
- **Frontend:** new collapsible fieldsets in `country-fields.tsx` (Company, Registration, Legal links, Dispute). Keep the form long but grouped.
- **Public:** render legal-entity block in `SiteFooter.tsx`; expose dispute + regulator links in the legal section.
- **Timezone surfacing (spec §4):** the country form already edits `BookingSetting.timezone`. Keep TZ on `BookingSetting` (it is already wired into slot generation) — do **not** duplicate onto `Country`. Just ensure the field is visible/required and validated as IANA (it already is).

### Phase 3 — Country legal documents + data-protection naming (migration)

Spec §7, §8.

```prisma
enum CountryLegalDocumentType {
  TERMS
  PRIVACY
  DATA_PROTECTION       // GDPR / LGPD / local equivalent
  MEDICAL_CONSENT
  REFUND_CANCELLATION
  DISPUTE_RESOLUTION
  ADDENDUM
}

/// Per-country, per-locale legal document. Rich text, PDF, or both.
model CountryLegalDocument {
  id              String   @id @default(cuid())
  countryId       String
  country         Country  @relation(fields: [countryId], references: [id], onDelete: Cascade)
  documentType    CountryLegalDocumentType
  locale          LocaleCode
  customDisplayName String?            // overrides default label (e.g. "LGPD Terms")
  richTextHtml    String?              // sanitized HTML (reuse sanitizeBlogHtml)
  pdfStorageKey   String?              // S3 key; never a public URL
  pdfFileName     String?
  effectiveFrom   DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([countryId, documentType, locale])
  @@index([countryId, documentType])
}
```

- **Constraint (spec §16):** service-layer guard requires at least one of `richTextHtml` / `pdfStorageKey`.
- **PDF upload — reuse, don't reinvent:** the existing `admin-media-upload` route (migrated to an `onRequest` auth hook in commit `8c45583f`) is image-only. Extend it (or add a sibling) to accept `application/pdf` with a **`%PDF-` magic-byte sniff** (mirror the existing image-byte sniffing for XSS safety), 10 MB cap, key `legal-documents/{countryId}/{type}-{locale}-{uuid}.pdf`. Reuse `putObject`/`deleteObject` from `services/object-storage.ts`.
- **Public render:** new route `frontend/app/(site)/[country]/[lang]/legal/[type]/page.tsx` — render `richTextHtml` (sanitized) or embed/download the PDF; locale fallback via `resolveTranslation` semantics.
- **Data-protection naming (spec §8):** replace hardcoded "GDPR" — start with `backend/src/modules/generated-documents/document-template-utils.ts` (`ABSENCE_DEFAULT_REASON`) and booking consent copy — reading `CountryLegalProfile.dataProtectionLawName` (default "GDPR"). Ireland→GDPR, Brazil→LGPD.

### Phase 4 — Blog: multi-country + manual translations + filters (migration)

Spec §12, §13, §14. **Recommended: adopt the existing translation child-table pattern** (consistent with `ServiceTranslation` et al.) and add a country join.

```prisma
model BlogPost {
  id                  String        @id @default(cuid())
  slug                String
  status              PublishStatus @default(DRAFT)
  category            String?
  publishedAt         DateTime?
  lastReviewedAt      DateTime?
  isActive            Boolean       @default(true)
  coverAssetId        String?
  // title/excerpt/body/locale/author/reviewer/seo* MOVE to BlogTranslation
  translations        BlogTranslation[]
  countries           BlogPostCountry[]   // M:N; empty/global handled in service
  // ...
  @@unique([slug])    // slug now globally unique (or keep per-primary-country if needed)
}

model BlogTranslation {
  id                  String     @id @default(cuid())
  blogPostId          String
  locale              LocaleCode
  title               String
  excerpt             String?
  body                String
  authorDisplayName   String?
  reviewerDisplayName String?
  seoTitle            String?
  seoDescription      String?
  isComplete          Boolean    @default(true)   // completeness tracking (spec §13)
  blogPost            BlogPost   @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  @@unique([blogPostId, locale])
}

model BlogPostCountry {
  id         String   @id @default(cuid())
  blogPostId String
  countryId  String
  blogPost   BlogPost @relation(fields: [blogPostId], references: [id], onDelete: Cascade)
  country    Country  @relation(fields: [countryId], references: [id], onDelete: Cascade)
  @@unique([blogPostId, countryId])
}
```

- **"Global" semantics (spec §12):** zero `BlogPostCountry` rows = global (shows everywhere). If any country rows exist, the post is scoped to those. Document this rule in the admin UI ("No countries selected = Global").
- **Backfill (migration):** for each existing `BlogPost`, create one `BlogTranslation` from its current columns; collapse same-`slug` rows across locales into one `BlogPost` + N translations; map old `countryId` → one `BlogPostCountry` (null stays global). Deterministic: newest row wins on conflict. **Snapshot table before migrating.**
- **Public locale fallback:** reuse `backend/src/modules/shared/resolve-translation.ts` (requested → country default → first → none) and `locale-support.ts` chain — same as services.
- **Admin filters (spec §14):** country, language/translation-status (missing-locale), published/draft, category, author, date range in `buildAdminBlogWhere`.
- **Frontend:** tabbed editor (one tab per locale, shared metadata) in `blog-fields.tsx`; translation-status grid in the list; multi-select country picker.

---

## 3. Validation rules (spec §16) — consolidated

Enforce **server-side** (not just UI):

- Manual booking: `countryCode` required; service must belong to the country; doctor (if set) must be **active**, **assigned to the service** (`ServiceDoctor` active), and **in the country** (`Doctor.countryId` or active `DoctorCountry`). → 422 with a typed error.
- Manual booking slot: generated/interpreted in the country timezone; **stored in UTC**.
- Country `timezone` must be a valid IANA zone (already validated via `isValidTimeZone`).
- `CountryLegalDocument`: at least one of rich text / PDF.
- Blog: at least one country **or** explicitly global; translation locale must be supported for the post's countries (`assertLocaleSupported`).
- Doctor email/phone: never in any public payload (regression-test it).
- PDF upload: magic-byte sniff, MIME allowlist, size cap, admin-only (`onRequest` auth hook).

---

## 4. Testing checklist (spec §18)

Co-locate unit tests next to services (the repo already does this, e.g. `manual-booking.temp-password.test.ts`, `peak-pricing.service.test.ts`).

- **Queue:** doctor-name filter alone + combined with country/service/status/date/payment; empty-result message.
- **Manual booking:** country→service→doctor happy path; backend rejects (a) doctor from another country, (b) GP doctor on a specialist service, (c) inactive/unapproved doctor — even with a forged frontend payload; slot displayed + stored correctly across a **DST boundary** (Europe/Dublin spring + autumn, Europe/Prague, Europe/Lisbon, Europe/Madrid, Europe/Bucharest, Europe/Malta, America/Sao_Paulo).
- **Country mgmt:** add/edit company address, phones/emails, registration + medical numbers, legal links, dispute links; upload a PDF legal doc; create a rich-text legal doc; rename GDPR→LGPD and confirm it propagates to templates + public page.
- **Categories:** filter by country; reorder persists; country assignment correct.
- **Doctor:** email+phone visible to admin/superadmin/local-admin; **absent** from public API (assert on the JSON).
- **Blog:** assign to multiple countries; filter by country/language/missing-translation; manual translation save; missing-translation fallback; public country page shows only relevant posts.

---

## 5. Enhancements added beyond the original spec

1. **Anti-tamper framing for §3** — the original asks for frontend+backend filtering; this plan makes the **backend the source of truth** with typed 422 errors, so a manipulated frontend cannot book an unassigned doctor. (Security-review per project rules.)
2. **Reuse existing TZ engine** — manual booking should call the already-correct `zonedWallClockToUtc` rather than a second timezone implementation. Fixes a latent UTC-storage bug.
3. **Reuse the translation pattern** (`resolve-translation.ts`) for blog instead of inventing a new fallback — consistency with Service/Specialty/HealthTest/Doctor.
4. **Reuse the media-upload pipeline** for legal PDFs (with PDF magic-byte sniffing) instead of a new storage path.
5. **Keep timezone on `BookingSetting`** (already wired) rather than duplicating onto `Country` — avoids two sources of truth.
6. **Audit every new admin mutation** via the existing `recordAudit` helper (add `COUNTRY_LEGAL_UPDATED`); the platform already has a rich append-only `AuditLog`.
7. **LOCAL_ADMIN country scoping** on all new country-legal + blog-country endpoints (respect `allowedCountryFolders` / `AdminScope`).
8. **"No countries = Global"** explicit rule for blog, surfaced in the UI to avoid the ambiguity the spec flags in §12.
9. **Migration safety** — snapshot blog rows before the translation backfill; resolve the known broken migration before any schema phase.

---

## 6. Sequencing & estimate

| Phase | Schema? | Rough size | Gate |
|-------|---------|-----------|------|
| 0 — booking/queue hardening | No | ~1–2 days | none — **ship now** |
| 1 — categories reorder + doctor polish | No | ~1–2 days | none |
| 2 — country legal/business/dispute | Yes | ~3–4 days | clear migration blocker |
| 3 — legal documents + GDPR naming | Yes | ~4–5 days | Phase 2 |
| 4 — blog multi-country + translations | Yes | ~1 week (backfill) | clear migration blocker |

---

## Appendix A — Original spec (preserved verbatim)

> The original AI agent prompt covered 19 sections: (1) queue doctor-name filter; (2) manual booking separate country selection first; (3) filter doctors by country+service with backend enforcement; (4) manual booking uses country timezone; (5) spring/autumn DST via IANA names; (6) extended country business/legal/registration fields; (7) country legal documents as rich text + PDF; (8) configurable data-protection naming (GDPR/LGPD); (9) dispute-resolution info; (10) categories filter/sort by country; (11) doctor profile email/phone visible to internal admin roles only; (12) blog posts assignable to multiple countries; (13) blog manual translations only (no AI); (14) blog admin filters; (15) backend/data-model relationships; (16) validation rules; (17) frontend/admin UX; (18) testing checklist; (19) final expected result. The full text is retained in the source ticket; this plan maps each section to concrete files, current state, and gaps above.
