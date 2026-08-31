# Careers recruitment implementation plan

**Status:** implementation-ready plan; no production changes have been made  
**Prepared:** 2026-08-31  
**Reference:** WebDoctor/BambooHR careers list and job-detail behavior  
**Scope:** Careers only. The existing Press/PR page is not part of this work.

## 1. Outcome

Build a small, secure recruitment module inside the existing Global Health website and admin portal:

1. A global admin creates a country- and language-specific job listing in the portal.
2. The listing appears on that market's public `/{country}/{lang}/careers` page, grouped by department.
3. Every job has its own permanent, shareable public URL and a rich detail page.
4. A candidate applies on that page with basic contact details and one PDF CV.
5. The backend validates and virus-scans the PDF before storing anything.
6. Clean CVs are stored privately; they are never published as media URLs or attached to notification email.
7. Global admins review applications in a country-filterable portal inbox and download a CV through an authenticated, audited endpoint.
8. Application data is automatically deleted after six months unless legal review sets a different country policy before launch.

This deliberately is **not** a full applicant tracking system. It is a job publisher plus a secure recruitment inbox.

---

## 2. Decisions locked for version 1

These are the defaults agreed in the discovery conversation. Any change to them alters the estimate and should be decided before implementation starts.

| Decision | Version 1 behavior |
|---|---|
| Product surface | Careers only; Press/PR remains unchanged |
| Admin access | Existing `ADMIN` and `SUPER_ADMIN` users only |
| Local admins | No `LOCAL_ADMIN` access in version 1; the current admin layout already excludes that role |
| Market model | One country and one locale per job |
| Public listing | Only jobs for the current country and exact route locale |
| Department | Short free-text label used to group the public list |
| Job body | Existing rich-text HTML editor; headings, paragraphs, links, ordered/unordered lists |
| Publishing | Draft, published, or archived |
| Closing | Optional closing timestamp; after it passes the job is no longer public or open to applications |
| Share links | The canonical job URL is the share link; copy-link and social-share buttons generate URLs client-side |
| Campaign tracking links | Not included |
| Application fields | Full name, email, optional phone, optional message, required privacy-notice acknowledgement, one required PDF CV |
| CV count/type | Exactly one PDF, maximum 5 MiB |
| Virus scanning | Self-hosted ClamAV; synchronous and fail-closed before storage |
| Candidate login | None |
| Candidate workflow | No stages, scoring, interview scheduling, comments, assignments, or automated rejection |
| Admin review state | `NEW` or `REVIEWED` only |
| Email notification | Send a minimal alert to `careers@myglobalhealth.online` after a durable application save |
| CV in email | Never attach it and never include a direct unauthenticated link |
| Retention | Purge all recruitment submissions six months after receipt; a hired person's employment records must be moved into the separate HR process |
| Deletion request | Global admin can manually purge an application and its CV |

### Deliberate simplifications

- No translation relationship between job records. To publish the same role in two languages, an admin duplicates it and edits the copy.
- No reusable “department management” table. Department is text because the current requirement is only grouping.
- No custom application-question builder.
- No salary model in version 1. If salary must be disclosed, it can be written in the rich description. Add structured salary fields only when the business needs filtering or salary-specific JobPosting markup.
- No private candidate portal or application-status emails.
- No separate share-link database. A public job already has a stable URL.
- No inline PDF preview. Admins download the file as an attachment, reducing browser attack surface.

---

## 3. User journeys

### 3.1 Admin creates and publishes a job

1. Admin opens **Admin → Careers → Jobs**.
2. Admin selects **New job**.
3. Admin completes:
   - country;
   - content language;
   - title;
   - department;
   - location label;
   - workplace mode;
   - employment type;
   - optional minimum-experience label;
   - optional closing date/time;
   - rich description.
4. The slug is generated from the title and may be edited before first publish.
5. Admin saves a draft or publishes it.
6. On publish, the backend verifies:
   - all required fields;
   - locale belongs to the selected country;
   - slug is unique within country and locale;
   - rich HTML remains non-empty after sanitization;
   - object storage and ClamAV configuration are present.
7. The admin sees the exact public URL with **Open** and **Copy link** actions.
8. Public caches for that country's careers list and the new detail page are invalidated.

### 3.2 Candidate finds and opens a job

1. Candidate visits `/{country}/{lang}/careers`.
2. The page loads only active, published, unexpired jobs for that country and exact language.
3. Jobs are grouped alphabetically by department; jobs within a group are ordered newest first, then title.
4. A row shows title and location/workplace label.
5. Candidate opens `/{country}/{lang}/careers/{slug}`.
6. The page shows:
   - back link to job openings;
   - title, department, location/workplace mode;
   - rich description;
   - a sticky desktop metadata/apply card;
   - copy-link and social-share actions;
   - application form.

### 3.3 Candidate applies

1. Candidate enters the required contact fields, accepts the recruitment privacy notice, and selects one PDF.
2. Frontend performs convenience checks for missing fields, `.pdf` extension, declared MIME, and size.
3. Backend repeats all validation; frontend checks are never trusted.
4. Backend checks the job is still public and open.
5. Backend checks declared type, extension, byte size, and PDF magic bytes.
6. Backend streams the in-memory buffer to ClamAV using `INSTREAM`.
7. If the scan is clean, backend uploads the file to private object storage, creates the application row, and queues/sends a minimal admin email.
8. Candidate sees one neutral success message and the form cannot be double-submitted.

### 3.4 Admin reviews an application

1. Admin opens **Admin → Careers → Applications**.
2. Admin filters by country, job, review state, or submitted date.
3. Admin opens an application detail.
4. The page shows contact fields, message, job snapshot/context, submission time, scan time, retention date, and download action.
5. CV download:
   - re-authenticates through the existing admin cookie flow;
   - records a critical audit event;
   - streams from private storage;
   - forces attachment download with no-cache and no-sniff headers.
6. Admin marks the record reviewed or leaves it new.
7. A manual purge action requires an explicit confirmation and removes the object before deleting the database record.

---

## 4. Architecture and data flow

```text
Admin portal
  └─ server actions → authenticated admin API → PostgreSQL
                                         └─ public cache invalidation

Public careers page
  └─ server-rendered read → public jobs API → PostgreSQL

Candidate application
  └─ same-origin Next route
       └─ raw multipart proxy + trusted client-IP headers
            └─ Fastify application endpoint
                 ├─ validate text and privacy acknowledgement
                 ├─ validate PDF extension/MIME/magic bytes/size
                 ├─ ClamAV INSTREAM scan over private TCP
                 ├─ private S3-compatible object storage
                 ├─ PostgreSQL application row
                 └─ minimal recruitment inbox email

Admin CV download
  └─ same-origin authenticated streaming proxy
       └─ Fastify authorization + critical audit
            └─ private object storage stream
```

### Data classification

- Job content is public business content.
- Candidate name, email, phone, message, CV, original filename, IP-derived abuse metadata, and application history are personal data.
- A clinician CV can contain professional registration information and other sensitive personal information. Treat it as confidential PII even when it is not patient PHI.
- Do not put application PII into:
  - public URLs or query strings;
  - client browser storage;
  - analytics events;
  - structured logs;
  - exception messages;
  - notification email attachments;
  - public media routes.

### Trust boundaries

1. **Browser → Next route:** untrusted fields and file.
2. **Next route → Fastify:** still untrusted; proxy does not validate on behalf of backend.
3. **Fastify → ClamAV:** raw candidate file on private network; ClamAV TCP must never be public.
4. **Fastify → object storage:** only a clean buffer is written.
5. **Admin → download endpoint:** authenticated but still authorization-checked and audited.

---

## 5. Database design

Add the following to `backend/prisma/schema.prisma` and create one normal Prisma migration. Do not use `ensure-schema.ts` for this feature: the tables and enums should be represented by migration history and deployed through the existing Railway `prisma migrate deploy` step.

### 5.1 Enums

```prisma
enum JobListingStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum JobWorkplaceMode {
  REMOTE
  HYBRID
  ONSITE
}

enum JobApplicationStatus {
  NEW
  REVIEWED
}
```

### 5.2 JobListing

```prisma
model JobListing {
  id                String            @id @default(cuid())
  countryId         String
  locale            LocaleCode
  slug              String
  title             String
  department        String
  location          String
  workplaceMode     JobWorkplaceMode
  employmentType    String
  minimumExperience String?
  descriptionHtml   String
  status            JobListingStatus  @default(DRAFT)
  publishedAt       DateTime?
  closesAt          DateTime?
  createdByUserId   String?
  updatedByUserId   String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  country            Country          @relation(fields: [countryId], references: [id], onDelete: Restrict)
  applications       JobApplication[]

  @@unique([countryId, locale, slug])
  @@index([countryId, locale, status, closesAt])
  @@index([updatedAt])
}
```

Notes:

- `status` is the single lifecycle field. Do not add redundant `isActive` or `archivedAt` fields.
- `publishedAt` is set the first time a job becomes published and is not reset by ordinary edits.
- `closesAt` is optional. A published row is publicly open only while `closesAt IS NULL OR closesAt > now()`.
- Creator/updater IDs are intentionally nullable and not foreign keys. Existing admins can be deleted/purged without blocking job records; durable action history lives in `AuditLog`.
- Store all timestamps in UTC. Admin date/time input must make its timezone explicit before conversion.
- Add the `jobListings` relation to `Country`. Application country is derived through `JobApplication.jobListing.country`.

### 5.3 JobApplication

```prisma
model JobApplication {
  id               String               @id @default(cuid())
  jobListingId     String
  fullName         String
  email            String
  phone            String?
  message          String?
  status           JobApplicationStatus @default(NEW)
  privacyAcknowledgedAt DateTime
  privacyNoticeVersion  String
  cvStorageKey     String               @unique
  cvByteSize       Int
  cvScannedAt      DateTime
  submittedAt      DateTime             @default(now())
  reviewedAt       DateTime?
  retentionUntil   DateTime
  updatedAt        DateTime             @updatedAt

  jobListing       JobListing           @relation(fields: [jobListingId], references: [id], onDelete: Restrict)

  @@index([jobListingId, submittedAt])
  @@index([retentionUntil])
}
```

Notes:

- Do not duplicate `countryId` on the application. Derive country through its required job relation; job country and locale become immutable after first publication.
- Do not accept a country from the browser.
- Store `email` trimmed and lowercased server-side. A second normalized-email column is unnecessary in version 1.
- Do not enforce one application per email/job. A candidate may intentionally submit a corrected CV. Rate limiting handles abuse without blocking legitimate resubmission.
- `privacyNoticeVersion` records the notice identifier shown at submission, for example `recruitment-privacy-v1`. The acknowledgement proves delivery of the notice; it does not declare consent as the legal basis for processing.
- `retentionUntil` is calculated server-side from `submittedAt` using a calendar-month helper, not a client date.
- If the person is hired, their employment file is established separately. This application record is still purged on schedule.

### 5.4 Audit actions

Add narrowly scoped actions to the existing `AuditAction` enum:

- `JOB_CREATED`
- `JOB_UPDATED`
- `JOB_PUBLISHED`
- `JOB_ARCHIVED`
- `JOB_APPLICATION_RECEIVED`
- `JOB_APPLICATION_LIST_VIEWED`
- `JOB_APPLICATION_VIEWED`
- `JOB_APPLICATION_CV_DOWNLOADED`
- `JOB_APPLICATION_STATUS_CHANGED`
- `JOB_APPLICATION_PURGED`

Rules:

- Never store name, email, phone, message, original filename, or CV storage key in audit metadata.
- Acceptable metadata: country code, job listing ID, previous/new status, and purge reason category.
- Application list/detail and CV download are confidential-PII reads. Use `recordCriticalAudit` and fail closed if the audit cannot be written. Manual/scheduled purge writes its audit row in the same Prisma transaction as the database delete.
- Routine job content changes can use `recordAudit`.
- Application list access is not audited per row. Opening an application detail is.

---

## 6. Validation and lifecycle rules

### 6.1 Job input schema

Create shared backend Zod schemas in a focused recruitment module.

| Field | Rule |
|---|---|
| `countryId` | cuid/non-empty; must resolve to active country |
| `locale` | existing `LocaleCode` enum; must be enabled for selected country |
| `title` | trim; 3–140 characters |
| `slug` | lowercase ASCII slug; 3–160; `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `department` | trim; 2–80 characters |
| `location` | trim; 2–120 characters |
| `workplaceMode` | enum |
| `employmentType` | trim; 2–80 characters |
| `minimumExperience` | optional; trim; maximum 100 |
| `descriptionHtml` | maximum 100 KiB before sanitization; required and non-empty after `sanitizeRichHtml` and text extraction |
| `status` | enum; transitions enforced server-side |
| `closesAt` | optional valid ISO timestamp; must be in the future when first publishing |

Slug behavior:

- Generate from title in the admin form for convenience.
- Backend never silently changes a collision. Return a field error so the admin chooses a distinct slug.
- Slug may change while draft.
- After first publish, make slug read-only in version 1. This avoids breaking shared links and needing redirects.

### 6.2 Public-open predicate

Use one shared backend predicate in list, detail, and apply paths:

```text
status = PUBLISHED
AND country is active
AND job locale equals requested locale
AND (closesAt is null OR closesAt > now)
```

The apply endpoint must query this predicate again inside its request. A browser that loaded the page before the closing time must not be able to submit afterward.

### 6.3 Status transitions

| From | To | Allowed? | Notes |
|---|---|---:|---|
| Draft | Draft | Yes | Normal edits |
| Draft | Published | Yes | Full validation and configuration gate |
| Published | Published | Yes | Content edits; keep original `publishedAt` |
| Published | Archived | Yes | Immediate removal from public list/detail/apply |
| Draft | Archived | Yes | Discard unused draft without hard delete |
| Archived | Any | No in V1 | Duplicate the job if it must be reopened |

No public or admin hard-delete endpoint is needed for jobs. Applications retain their parent reference and archived jobs remain reportable.

After first publication, `countryId`, `locale`, and `slug` are immutable. All three participate in the shared URL and country ownership, so changing any one would break links or make existing applications appear under another market.

### 6.4 Application text fields

| Field | Rule |
|---|---|
| `fullName` | required; trim/collapse spaces; 2–120 |
| `email` | required; valid email; maximum 254; trim and store lowercase |
| `phone` | optional; trim; maximum 40; no aggressive international normalization in V1 |
| `message` | optional; trim; maximum 2,000; plain text only |
| `privacyAcknowledged` | must be literal accepted value |
| `website` | hidden honeypot; if non-empty, return the same neutral success response without storing anything |
| `cv` | exactly one required file |

Do not log parsed form fields. Validation errors identify field names and rules, never echo values.

---

## 7. PDF intake and malware scanning

### 7.1 File policy

- Exactly one multipart file named `cv`.
- Maximum 5 MiB.
- Original filename must end in `.pdf` case-insensitively.
- Accepted declared MIME: `application/pdf`. Do not trust it by itself.
- Reuse `sniffFileMime` / `verifySniffedMime` to require PDF magic bytes.
- Validate the original name only for the `.pdf` extension, then discard it; do not persist applicant-supplied filenames.
- Do not parse or render the PDF server-side.
- Do not persist a rejected or unscanned buffer to disk, database, object storage, logs, or a quarantine bucket.

### 7.2 ClamAV client

Add `backend/src/services/malware-scan.ts` using Node's built-in `node:net`. Do not add an npm ClamAV wrapper.

Protocol:

1. Open TCP connection to configured private host/port.
2. Set connect/overall timeout.
3. Send `zINSTREAM\0`.
4. Send the buffer in bounded chunks. Each chunk is prefixed by a four-byte big-endian length.
5. Send a zero-length chunk.
6. Read until the NUL-terminated reply.
7. Normalize result into one of:
   - `CLEAN`;
   - `INFECTED`;
   - `ERROR`.
8. Always close/destroy the socket in a `finally` path.

Never expose the ClamAV signature name to the candidate. It may be logged as a security code only if the log contains no applicant identifiers.

### 7.3 Fail-closed result matrix

| Condition | HTTP result | Storage/DB result | Candidate message |
|---|---:|---|---|
| Valid clean PDF | 201 | Store object and application | “Application received.” |
| Extension/MIME/magic mismatch | 400 | Nothing stored | “Please upload a valid PDF.” |
| Over 5 MiB | 413 | Nothing stored | “The PDF must be 5 MB or smaller.” |
| Malware found | 422 | Nothing stored | “This PDF could not be accepted.” |
| ClamAV not configured | 503 | Nothing stored | “Applications are temporarily unavailable. Please try again later.” |
| ClamAV timeout/unreachable/error | 503 | Nothing stored | Same temporary-unavailable text |
| Object storage unavailable | 503 | No DB row | Same temporary-unavailable text |
| DB write fails after object upload | 500/503 | Delete the uploaded object best-effort; no application row | Generic retry message |
| Email notification fails | Candidate already received 201 | Application and outbox remain stored; dispatcher retries | No candidate resubmission |

### 7.4 Safe write order

1. Validate job and text fields.
2. Validate file limits and magic bytes.
3. Scan buffer with ClamAV.
4. Generate a PII-free random storage key:
   `recruitment/cv/{randomUUID}.pdf`.
5. Upload with `putObject` using `application/pdf` and private storage.
6. Start one Prisma transaction.
7. Inside the transaction, re-read the job with the public-open predicate. This closes the race where an admin archives or closes it while ClamAV is scanning.
8. If still open, create the `JobApplication` row, PII-free notification outbox row, and `JOB_APPLICATION_RECEIVED` audit row in that transaction.
9. If the job is no longer open or the transaction fails, call `deleteObject` for the just-created key and log only an opaque operation/job ID.
10. Return success after the transaction commits; the existing outbox dispatcher sends the email without attaching the file.

This order guarantees the durable database never points to an infected file, the object bucket is not used as pre-scan quarantine, and an archived-during-scan job cannot accept a late application.

### 7.5 ClamAV configuration

Add to `backend/src/config/env.ts` and `backend/.env.example`:

```dotenv
CLAMAV_HOST=
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
RECRUITMENT_NOTIFICATION_EMAIL=careers@myglobalhealth.online
RECRUITMENT_RETENTION_MONTHS=6
RECRUITMENT_RETENTION_ENFORCE=false
```

Rules:

- Blank ClamAV host means scanning is unavailable, not bypassed.
- Validate port 1–65535, timeout 1,000–60,000 ms, retention 1–36 months.
- `RECRUITMENT_RETENTION_ENFORCE` defaults false. The sweep reports due rows but performs no deletion until written legal/privacy approval is recorded and production explicitly enables it.
- Do not default production ClamAV host to a public address.
- Never expose ClamAV port publicly in production.
- Do not put credentials in code; ClamAV TCP has no authentication or encryption, so private networking is mandatory.

### 7.6 Local Docker

Extend root `docker-compose.yml` with an official, version-pinned `clamav/clamav` service:

- bind port `3310` to `127.0.0.1` only because the backend normally runs on the host;
- persist `/var/lib/clamav` in a named volume so signatures survive restarts;
- use the image's health check;
- document that first boot may take time while signatures initialize;
- allocate at least 3 GiB RAM to Docker, preferably 4 GiB, per ClamAV's official guidance.

Development environment:

```dotenv
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
```

### 7.7 Production Railway

Provision ClamAV as a separate private Railway service/container:

- pin an official stable version, not `latest` or `unstable`;
- attach a persistent volume for virus definitions;
- enable its container health check;
- give it at least 3 GiB RAM and verify peak update memory;
- expose only Railway private networking;
- set backend `CLAMAV_HOST` to the private service DNS name;
- set `CLAMAV_PORT=3310`;
- verify FreshClam updates and clamd reloads definitions;
- alert if signature age crosses the operational threshold selected by the team (recommended: warning at 24 hours, critical at 48 hours).

The backend `/ready` endpoint should **not** fail the entire telemedicine API when ClamAV is down. Recruitment upload alone fails closed. Add authenticated `GET /api/admin/recruitment/health`, returning only storage/scanner configured and scanner reachable booleans plus a safe status code. The Careers admin page shows a blocking warning when recruitment intake is not ready. Never return hosts, ports, bucket names, credentials, or raw scanner errors.

---

## 8. Backend modules and APIs

Keep recruitment cohesive; do not spread business rules through route handlers.

### 8.1 Proposed files

```text
backend/prisma/schema.prisma
backend/prisma/migrations/<timestamp>_careers_recruitment/migration.sql
backend/src/config/env.ts
backend/.env.example
backend/src/modules/recruitment/recruitment.schema.ts
backend/src/modules/recruitment/recruitment.service.ts
backend/src/modules/recruitment/recruitment-retention.service.ts
backend/src/modules/recruitment/recruitment-email.ts
backend/src/services/malware-scan.ts
backend/src/modules/outbox/outbox.ts
backend/src/routes/jobs.route.ts
backend/src/routes/admin-jobs.route.ts
backend/src/routes/admin-job-applications.route.ts
backend/src/lib/internal-scheduler.ts
backend/src/routes/media-public.route.ts
docker-compose.yml
```

Tests sit beside the relevant modules/routes using the repository's existing `node:test` pattern.

### 8.2 Public endpoints

#### `GET /api/public/jobs`

Query:

- `countryCode` required;
- `locale` required.

Response item:

```json
{
  "id": "job-id",
  "slug": "general-practitioner-remote",
  "title": "General Practitioner",
  "department": "Medical",
  "location": "Ireland (Remote)",
  "workplaceMode": "REMOTE",
  "employmentType": "Contract",
  "minimumExperience": "Experienced",
  "publishedAt": "2026-08-31T00:00:00.000Z",
  "closesAt": null,
  "updatedAt": "2026-08-31T00:00:00.000Z"
}
```

Behavior:

- return only public-open records;
- select only public columns;
- order `department ASC, publishedAt DESC, title ASC`;
- use a sensible hard cap, for example 200; no pagination UI until real volume requires it;
- response can be cached by the frontend data cache for 60 seconds with recruitment tags.

#### `GET /api/public/jobs/:slug`

Query:

- `countryCode` required;
- `locale` required.

Response includes list fields plus sanitized `descriptionHtml`.

Behavior:

- query with country + exact locale + slug + public-open predicate;
- return 404 for draft, archived, expired, wrong-country, wrong-locale, or unknown records;
- never reveal which hidden condition caused the 404.

#### `POST /api/public/jobs/:id/applications`

- multipart only;
- route-specific limits: one file, six text fields, 5 MiB file;
- explicit rate limit: 5 attempts per hour per trusted client IP, `skipOnError: false`;
- no authentication;
- always re-check the public-open predicate;
- response headers: `Cache-Control: no-store`;
- success response includes only a neutral message. It does not expose an application ID.

Do not include applicant values in the response.

### 8.3 Admin jobs endpoints

All routes call `verifyGlobalAdminAccess` (or the exact existing global-admin equivalent), not the broader local-admin helper.

#### `GET /api/admin/jobs`

Filters:

- `countryId`;
- `locale`;
- `status`;
- `search` across title, department, location;
- page/pageSize with a capped page size.

Return summary counts for draft/published/archived and application count per job.

#### `GET /api/admin/jobs/:id`

Return full editor record and computed public URL parts. No application PII.

#### `POST /api/admin/jobs`

- validate and sanitize;
- create draft or publish;
- set actor IDs from session;
- audit the action;
- return record.

#### `PATCH /api/admin/jobs/:id`

- validate complete resulting record, not only isolated patch fields;
- enforce status transitions and immutable post-publish slug;
- sanitize on every save;
- set `publishedAt` on first publication;
- audit update plus publish/archive transition as applicable.

No `DELETE` route.

#### `GET /api/admin/recruitment/health`

- global-admin only;
- check object-storage configuration without writing an object;
- send a bounded ClamAV `PING`;
- return safe configured/reachable booleans;
- never expose connection details;
- use it for the Careers warning banner and deployment smoke test;
- do not alter general backend readiness.

### 8.4 Admin applications endpoints

#### `GET /api/admin/job-applications`

Filters:

- country;
- job;
- status;
- submitted-from/submitted-to;

Return only list-safe fields:

- application ID;
- applicant name;
- country;
- job title;
- status;
- submitted/reviewed/retention timestamps.

Do not return storage keys.

Pagination is mandatory because applications contain PII and the table must never fetch an unlimited dataset.

Record one `JOB_APPLICATION_LIST_VIEWED` critical audit per successful request, with only country/job/status/date filter identifiers and result count. Never log candidate values.

#### `GET /api/admin/job-applications/:id`

- return detail fields but not the storage key;
- record `JOB_APPLICATION_VIEWED`;
- return a same-origin CV download path, not a bucket URL.

#### `PATCH /api/admin/job-applications/:id`

Only accepted change:

```json
{ "status": "REVIEWED" }
```

Allow changing back to `NEW` if an admin made a mistake. Set/clear `reviewedAt` accordingly and audit previous/new state.

#### `GET /api/admin/job-applications/:id/cv`

1. Authorize global admin.
2. Load application.
3. Record critical download audit before streaming.
4. Fetch private object.
5. Return:
   - `Content-Type: application/pdf`;
   - safe `Content-Disposition: attachment` using the existing helper;
   - `Cache-Control: private, no-store`;
   - `X-Content-Type-Options: nosniff`;
   - restrictive `Content-Security-Policy: sandbox`.
6. Never redirect to a public/presigned URL.

#### `DELETE /api/admin/job-applications/:id`

This is the one intentional hard-delete:

1. require global admin;
2. require a reason category such as `DATA_SUBJECT_REQUEST` or `ADMIN_CORRECTION`;
3. delete the object first;
4. if object deletion succeeds or the object is already absent, delete the application row and create `JOB_APPLICATION_PURGED` in one Prisma transaction;
5. return a generic success;
6. UI requires explicit confirmation naming the applicant and warning the action cannot be undone.

### 8.5 Public media defense-in-depth

The existing public media route already restricts prefixes. Explicitly add `recruitment/` to its sensitive-prefix denylist and add a regression test proving a known recruitment key returns 404/403 through public media.

---

## 9. Frontend public implementation

### 9.1 Data layer

Add `frontend/lib/content/get-public-jobs.ts`:

- typed normalizers for list/detail API shapes;
- `listPublicJobs(countryCode, locale)`;
- `getPublicJob(countryCode, locale, slug)`;
- cache tags:
  - `public-jobs`;
  - `public-jobs:{countryCode}:{locale}`;
  - `public-job:{countryCode}:{locale}:{slug}`;
- no fallback to another language;
- on API outage, list returns a controlled unavailable state, not a false “no openings” state.

The distinction matters:

- **empty:** API succeeded and zero jobs are open;
- **unavailable:** API failed;
- **loaded:** jobs exist.

### 9.2 Careers list page

Refactor `frontend/app/[country]/[lang]/careers/page.tsx`:

- keep the existing localized hero/brand content where it still helps;
- replace the current mailto-driven “roles” section with **Open positions**;
- fetch exact-country/exact-locale jobs;
- group by department in a pure tested helper;
- render semantic headings and a list/table-like layout matching the reference:
  - department heading;
  - title link;
  - right-aligned location/workplace label on desktop;
  - stacked metadata on mobile;
- empty state: “There are no open positions in this market right now” plus the careers email;
- unavailable state: honest retry copy, not the empty message;
- remove the generic mailto application CTA when jobs exist;
- preserve contact/regulator context only where useful.

Accessibility:

- one page `h1`;
- departments use `h2`;
- job titles are links with descriptive accessible names;
- visible keyboard focus;
- layout does not rely on color alone;
- mobile rows have at least 44px tap targets.

### 9.3 Job detail route

Add:

`frontend/app/[country]/[lang]/careers/[slug]/page.tsx`

Server responsibilities:

- validate country and locale using existing routing helpers;
- fetch exact job;
- call `notFound()` on unknown, hidden, expired, wrong-locale, or API-confirmed absent;
- do not convert a backend outage into a 404; render a temporary unavailable state or throw to error boundary;
- generate metadata from title, department, location, and organization;
- render Breadcrumb JSON-LD and JobPosting JSON-LD;
- compute canonical URL;
- do not create hreflang links for non-existent translation records.

Layout:

- main description column;
- sticky desktop sidebar with Apply button, canonical link copy control, share buttons, location, department, employment type, workplace mode, and minimum experience;
- application form section below/alongside the content;
- mobile stacks sidebar above form;
- rich HTML rendered inside a recruitment-specific prose wrapper;
- run frontend sanitization as defense-in-depth even though backend sanitized on save;
- no iframe/BambooHR script.

### 9.4 Application form

Add a focused client component, for example:

`frontend/app/[country]/[lang]/careers/[slug]/_components/job-application-form.tsx`

Fields:

- full name;
- email;
- phone (optional);
- short message (optional);
- PDF file;
- required privacy-notice acknowledgement checkbox with a link to the applicable privacy/recruitment notice;
- hidden honeypot.

The honeypot is visually hidden, excluded from the tab order, labelled as non-user content for assistive technology, and has autocomplete disabled so password managers do not accidentally fill it.

Behavior:

- use native input types and validation attributes;
- file input `accept="application/pdf,.pdf"`;
- show selected filename and formatted size;
- client size check at 5 MiB;
- submit once; disable button and show progress text while pending;
- post `FormData` to same-origin endpoint;
- map known status codes to safe localized messages;
- clear sensitive file input after success;
- do not store form content in local/session storage;
- do not send form fields to analytics;
- keep non-file text in memory on recoverable 503 so the candidate can retry;
- success state has no application PII in the URL.

The notice link points to the current country/locale privacy document and a recruitment-specific anchor. Before launch, add approved recruitment wording there covering purpose, legal basis, controller/contact, recipients, storage, six-month retention, candidate rights, and any cross-border processing. Stored `privacyNoticeVersion` identifies that exact approved wording.

### 9.5 Same-origin application proxy

Add:

`frontend/app/api/public/jobs/[id]/applications/route.ts`

- allow POST only;
- validate ID length before building upstream URL;
- reject `Content-Length` above 6 MiB before reading, then reject the actual buffered multipart body above 6 MiB; the extra 1 MiB covers bounded fields and multipart framing around the 5 MiB CV;
- use `getBackendOrigin`;
- forward raw multipart bytes with the original content type so binary and boundary remain intact;
- forward trusted client-IP headers using `proxyClientIpHeaders`;
- do not log request body;
- no-store upstream and response;
- pass through only safe response headers/content type;
- return a generic 503 if backend is not configured.

A dedicated route is preferred over broadening the current public catch-all because the catch-all uses a static exact-path allowlist and reconstructs `FormData`. The dedicated proxy creates a narrow, auditable upload boundary.

### 9.6 Sharing

No database work is required.

- Copy link uses the canonical job URL.
- LinkedIn share:
  `https://www.linkedin.com/sharing/share-offsite/?url={encodedCanonical}`.
- Facebook share:
  `https://www.facebook.com/sharer/sharer.php?u={encodedCanonical}`.
- X share:
  `https://twitter.com/intent/tweet?url={encodedCanonical}&text={encodedTitle}`.
- Open in a new tab with `noopener,noreferrer`.
- Use Web Share API on supported mobile browsers and copy-link fallback elsewhere.
- Do not add applicant/campaign identifiers to links.

### 9.7 SEO

Job detail only:

- canonical self URL;
- title and meta description;
- Open Graph/Twitter metadata;
- `JobPosting` JSON-LD containing only visible, accurate fields:
  - title;
  - full sanitized description;
  - datePosted from `publishedAt`;
  - validThrough only when `closesAt` exists;
  - employmentType mapped when it matches a supported value, otherwise omit;
  - hiringOrganization;
  - jobLocation for onsite/hybrid;
  - `jobLocationType: TELECOMMUTE` for remote;
  - applicant-location requirements at country level for remote jobs;
  - identifier based on job ID.
- do not place JobPosting markup on the list page.

Sitemap:

- extend `frontend/app/sitemap.ts` with published, unexpired job detail URLs;
- include only the record's real country/locale URL;
- use `updatedAt` as `lastModified`;
- do not emit fake hreflang clusters;
- remove expired/archived jobs automatically on the next dynamic sitemap request;
- add “job” to the sitemap stamp accounting only if the careers hub's `lastModified` is derived from child jobs.

Expiration:

- expired/archived detail API returns 404;
- Next page emits no JobPosting markup because it no longer renders;
- sitemap stops listing the URL;
- submit manual/automated Search Console removal/indexing work only if the project later adopts Google's Indexing API; do not add that API in this version.

### 9.8 Localization

Add careers/job/form strings to `frontend/locales/*/company.json` or a focused careers namespace while preserving locale-key parity.

Required strings include:

- open positions;
- department/location labels;
- job metadata labels;
- apply/copy/share actions;
- empty and unavailable states;
- all application labels/helpers;
- upload limit/type errors;
- malware/unavailable/generic server errors;
- privacy-notice acknowledgement text;
- success confirmation;
- expired/not-found copy if a designed 404 state is used.

Run `pnpm --filter frontend typecheck` because it also runs the locale-key check.

---

## 10. Admin portal implementation

### 10.1 Navigation

Add one global `/admin/careers` — “Careers” link in `frontend/app/(portal)/(admin)/admin/layout.tsx`. The Careers pages provide Jobs and Applications tabs. Do not refactor the entire navigation or change country feature toggles; this is a global-admin surface with its own country filters.

### 10.2 Admin data module

Add `frontend/lib/admin/admin-api/careers.ts` and export it from the existing barrel.

Include:

- DTOs for job list/detail and application list/detail;
- fetch/create/update jobs;
- fetch/update/purge applications;
- no CV byte fetching through server actions—the browser uses the streaming route.

### 10.3 Job list

Add `frontend/app/(portal)/(admin)/admin/careers/page.tsx`.

Reuse:

- `PageHeader`;
- `AdminSummaryStrip`;
- `AdminCard`;
- `ResponsiveFilterBar`;
- `ColumnPriorityTable`;
- `Pill` and existing buttons.

Columns/cards:

- title/slug;
- country and locale;
- department;
- location/workplace;
- status;
- published/closing dates;
- application count;
- edit/open actions.

Filters:

- search;
- country;
- locale;
- status.

States:

- loading skeleton;
- API error with retry;
- no jobs;
- no filter matches.

### 10.4 Create/edit form

Add:

```text
frontend/app/(portal)/(admin)/admin/careers/new/page.tsx
frontend/app/(portal)/(admin)/admin/careers/[id]/edit/page.tsx
frontend/app/(portal)/(admin)/admin/careers/_components/job-fields.tsx
frontend/app/(portal)/(admin)/admin/careers/_components/job-form-parse.ts
```

Reuse the existing lazy rich text field. Do not create a second editor.

Form behavior:

- country selection controls locale choices using admin country data;
- title suggests slug until the admin manually edits slug;
- published job slug is disabled/read-only;
- closing time clearly states timezone and previewed UTC result;
- buttons:
  - Cancel;
  - Save draft/Save changes;
  - Publish;
  - Archive with confirmation;
- show server field errors near the corresponding fields;
- after success, invalidate public recruitment cache tags and redirect with a success message;
- show public URL/open/copy controls after publish.

### 10.5 Application list

Add `frontend/app/(portal)/(admin)/admin/careers/applications/page.tsx`.

Summary:

- new;
- reviewed;
- expiring within 30 days;
- total matching filters.

Filters:

- country;
- job;
- state;
- from/to date;

Columns/cards:

- candidate;
- job;
- country;
- submitted;
- state;
- retention date;
- view action.

Privacy:

- no phone/message/CV filename in the bulk list;
- pagination default 25, maximum 100;
- no CSV export in version 1;
- no application data in client-side persistence.
- no candidate name/email search query in version 1, because URL filters would place PII in browser history and server access logs; add a POST/body-based search only when inbox volume proves it is necessary.

### 10.6 Application detail

Add `frontend/app/(portal)/(admin)/admin/careers/applications/[id]/page.tsx`.

Sections:

1. applicant contact;
2. application message;
3. job and country;
4. CV metadata: clean scan timestamp and file size;
5. lifecycle: received, reviewed, retention;
6. actions: download CV, mark new/reviewed, manual purge.

The CV download button points to a same-origin streaming proxy:

`frontend/app/api/admin/careers/applications/[id]/cv/route.ts`

Copy the existing support-document download pattern:

- forward cookie;
- stream upstream body;
- preserve content type, disposition, cache control, no-sniff, and CSP;
- never buffer the entire CV in the frontend server.

---

## 11. Email behavior

Create a small recruitment-specific template and dispatch it through the existing durable `Outbox`. Add a PII-free outbox kind whose payload contains only `applicationId`; insert it in the same transaction as the application and receipt audit. The dispatcher loads the current application and calls the existing `sendEmail` transport.

Recipient:

- `RECRUITMENT_NOTIFICATION_EMAIL`, defaulting to `careers@myglobalhealth.online`.

Subject:

- `New job application — {job title} — {country}`.

Body:

- job title;
- country;
- received timestamp;
- link to the authenticated admin application detail;
- instruction that the CV is available only inside the portal.

Exclude:

- CV attachment;
- storage key;
- public/presigned CV link;
- phone;
- message body;
- full CV filename;
- malware details.

Delivery semantics:

- application success depends on object + database durability, not email;
- notification retries use the existing outbox backoff/failed-row behavior;
- on email failure, log a non-PII operation warning and raise the existing permanent-failure ops alert after retry exhaustion;
- do not retry by accepting a duplicate application;
- in production, a mail transport “log-only” result does not count as delivered;
- if the application was legally purged before a delayed outbox attempt, the dispatcher treats the missing record as a completed no-op.

No automatic applicant confirmation email in version 1; the on-page success confirmation is enough. Add one only when copy, localization, sender reputation, and privacy/legal language are approved.

---

## 12. Retention and deletion

### 12.1 Policy

Default:

- `retentionUntil = submittedAt + 6 calendar months` for every application.
- This avoids adding an ATS outcome model merely to decide whether someone was “unsuccessful.”
- If hired, the business separately moves required employment records into the HR system with its own legal basis and retention policy.

Before production launch, the privacy owner must approve:

- six-month period for each of Ireland, Czechia, Portugal, Spain, Romania, and Brazil;
- recruitment privacy-notice text and version;
- whether a specific country requires a shorter/longer rule;
- controller/contact details and candidate-rights process.

If country-specific periods are required, add a simple server mapping/config at that time. Do not create a generic policy-builder UI unless legal requirements actually differ and admins need to change them.

### 12.2 Automated purge

Add `runRecruitmentRetentionSweep` and schedule it daily through the existing advisory-locked internal scheduler.

Implementation:

1. use a new unique advisory lock key;
2. query at most 100 expired applications ordered oldest first;
3. for each row:
   - call `deleteObject`;
   - treat object-not-found as already deleted;
   - after storage is gone, delete the DB row and create a non-PII purge audit in one Prisma transaction;
4. continue the batch after individual failures;
5. log only counts and application IDs, not applicant values;
6. repeat on the next daily run until backlog is empty.

When `RECRUITMENT_RETENTION_ENFORCE=false`, run the query and report due/overdue counts but do not delete anything. Enabling the flag in production is a separate, recorded post-legal-approval step.

Idempotency:

- object deletion can safely repeat;
- if object deletion succeeds but DB deletion fails, the next run sees the row, treats the absent object as deleted, then deletes the row;
- do not delete the DB row first, because that would orphan an undiscoverable CV object.

Metrics/log summary:

- candidates;
- purged;
- storage missing;
- failed;
- oldest overdue age.

Raise an ops alert when:

- any record is more than 48 hours overdue;
- repeated object deletion failures occur;
- the scheduler has not completed successfully for more than 48 hours.

### 12.3 Manual privacy deletion

- Use the admin purge endpoint described above.
- Confirm identity/request outside this module using the organization's privacy process.
- Do not expose a public unauthenticated deletion endpoint based only on email.
- Preserve the minimal audit event after purge without retaining applicant PII.

---

## 13. Security and privacy controls

### Authentication and authorization

- Global admin authorization on every admin route, including reads and downloads.
- Do not rely on hidden navigation.
- Do not broaden the admin layout to local admins in this version.
- Application country is derived from its job, never browser input.

### Input and XSS

- Zod at every API boundary.
- Sanitize rich HTML on every create/update.
- Sanitize again before public rendering.
- Plain text application message only.
- Reject unexpected multipart fields/files.
- Use existing safe content-disposition helper.

### File security

- type, size, extension, and magic-byte validation;
- ClamAV clean result required;
- random, non-guessable storage key;
- private object storage and server-side encryption already provided by the storage service;
- `recruitment/` denied by public media route;
- authenticated, audited attachment download;
- no inline preview.

### Abuse prevention

- 5 application attempts/hour/IP; fail closed if limiter store fails;
- hidden honeypot;
- exact job-open check;
- request/multipart limits;
- neutral success/error copy;
- do not add CAPTCHA until logs show bots bypass the honeypot/rate limit.

### Logging

- never log request bodies or multipart fields;
- never log CV buffer, storage key, original filename, email, phone, or message;
- log opaque application/job IDs and result codes;
- redact socket errors before client response;
- retain existing auth/cookie header redaction.

### Storage and transport

- HTTPS browser/frontend/backend path;
- ClamAV TCP private-network only;
- storage bucket private;
- existing S3 `AES256` server-side encryption;
- no public/presigned CV URL;
- `private, no-store` for all application/admin responses.

### Browser and analytics

- no PII in route/search params;
- no form persistence in local/session storage;
- no analytics event containing field values or application ID;
- no third-party script receives the form or file.

### Backups

- confirm PostgreSQL and object-storage backup retention does not silently preserve recruitment PII forever;
- confirm bucket versioning/lifecycle behavior: deletion must remove the current CV and any retained prior version must age out under the approved backup policy;
- document how deletion propagates to backups or when backup copies age out;
- restrict backup access to the same or narrower operations group.

---

## 14. Failure handling and recovery

| Failure | Expected system behavior | Operator action |
|---|---|---|
| ClamAV cold start | Apply returns 503; jobs remain readable | Wait for healthy/signature load; do not bypass scan |
| ClamAV outage | Apply fails closed | Restart/scale scanner; inspect private connectivity and memory |
| Stale signatures | Application may still scan but alert fires | Fix FreshClam/volume/network; consider pausing recruitment if critical |
| S3 outage | Apply returns 503; no DB row | Restore storage; candidate retries |
| DB outage before upload | No object written | Restore DB |
| DB outage after upload | Cleanup object best-effort | Review orphan-cleanup log if cleanup fails |
| Email outage | Application remains in portal | Admin checks portal; repair mail; no candidate resubmit |
| Admin download object missing | 404/410-style admin error; audit attempt | Investigate retention/manual deletion/storage drift |
| Cache invalidation failure | Public page updates after normal TTL | Retry save/revalidation; no data loss |
| Retention deletion fails | Row retained for retry; alert on overdue | Fix storage/DB and rerun sweep |
| Job closes while form open | Apply endpoint rejects as no longer open | Candidate sees closed message; no file stored |
| Duplicate submit click | UI disables button; backend may still receive retries | Both records are allowed; rate limit limits abuse |

### Orphan reconciliation

Do not build a bucket-wide orphan scanner in version 1. The safe write-order cleanup plus retention sweep covers known records. Add a reconciliation tool only if monitoring shows orphan creation or storage billing drift.

---

## 15. Test-driven implementation plan

Follow RED → GREEN → REFACTOR for each phase. Use the existing backend `node:test` and frontend Vitest setup. Database integration tests must use the isolated test database; never use `backend/.env` because it points to production.

### 15.1 Backend unit tests

#### Job schema/lifecycle

- valid draft;
- trimmed fields;
- invalid slug;
- unsupported country locale;
- description empty after sanitization;
- unsafe script/event handlers removed;
- invalid closing date;
- every allowed/forbidden status transition;
- published slug immutability;
- public-open predicate before/after close boundary.

#### Application schema

- required name/email/privacy acknowledgement/file;
- optional phone/message;
- maximum lengths;
- normalized email;
- honeypot branch;
- retention date exactly six calendar months across month-end/leap-year boundaries.

#### Malware client

Use a local mock TCP server:

- clean reply;
- infected reply;
- error reply;
- fragmented reply across packets;
- NUL termination;
- connection refused;
- connect timeout;
- response timeout;
- unexpected/malformed response;
- socket closes early;
- chunk framing and zero-length terminator;
- buffer smaller/larger than one chunk;
- ensure socket is destroyed on every terminal path.

Use an EICAR fixture only against the isolated ClamAV integration test, never place a real malicious file in the repo.

#### File validation

- real minimal PDF signature accepted;
- renamed text file rejected;
- wrong declared MIME rejected;
- uppercase `.PDF` accepted;
- extra extension rejected;
- over-limit rejected;
- applicant-supplied filename is not persisted;
- generated storage key contains no applicant data.

### 15.2 Backend route/integration tests

#### Public reads

- list only current country/locale published open jobs;
- draft/archived/expired excluded;
- detail rejects wrong country/locale;
- no application/private fields in public response.

#### Admin job routes

- unauthenticated 401;
- patient/doctor/local-admin 403;
- admin/super-admin allowed;
- unique slug conflict;
- sanitize on create and patch;
- first publish sets `publishedAt`;
- edit keeps `publishedAt`;
- archive removes public visibility;
- audit actions.

#### Application upload

- non-multipart rejected;
- missing/extra file rejected;
- too many fields rejected;
- closed job rejected before scanning;
- invalid PDF never reaches ClamAV;
- infected PDF never reaches storage/DB;
- scanner error never reaches storage/DB;
- clean scan uploads and creates exactly one application, one PII-free outbox row, and one receipt audit atomically;
- outbox payload contains only the opaque application ID;
- job archived/expired during the scan is rejected by the final transaction and the object is removed;
- DB failure invokes object cleanup;
- storage failure creates no row;
- email dispatch failure retries through the existing outbox without losing or duplicating the application;
- rate limit is enforced;
- honeypot stores nothing;
- response contains no PII.

#### Admin applications

- auth matrix on list/detail/status/download/purge;
- pagination and country/job/status/date filter correctness;
- list-view audit contains no applicant/filter values;
- detail audit;
- download audit, attachment/no-store/no-sniff/CSP headers;
- missing object safe response;
- status timestamp set/cleared;
- purge object-first ordering;
- public media route blocks `recruitment/`.

#### Retention

- only expired rows selected;
- enforcement-off mode reports but never deletes;
- batch cap;
- object-not-found still deletes row;
- storage failure retains row;
- DB delete failure is retryable after object removal;
- no PII in summary/audit metadata;
- advisory lock prevents concurrent sweep.

### 15.3 Frontend unit/component tests

- API normalization rejects malformed records;
- list grouping and order;
- empty vs unavailable state;
- detail metadata and canonical path;
- JobPosting JSON-LD only on detail and matches visible content;
- remote vs onsite location markup;
- application form required fields;
- PDF extension/type/size client messages;
- submit disabled/pending/success/error;
- sensitive values are not placed in URL/storage;
- copy/share URLs encode correctly;
- published slug disabled in editor;
- admin form parses timezone/closing time;
- application list filters and responsive card fields.

### 15.4 End-to-end tests

Critical happy path:

1. admin signs in;
2. creates an Ireland/English Medical job;
3. saves draft and verifies it is not public;
4. publishes and verifies list grouping/detail/share URL;
5. candidate submits clean PDF;
6. success confirmation appears;
7. admin filters Ireland applications;
8. opens detail;
9. downloads PDF with correct filename/content;
10. marks reviewed;
11. archives job;
12. public list/detail/application no longer expose it.

Security paths:

- EICAR PDF-like test upload rejected with no row/object;
- scanner unavailable returns 503 with no storage;
- unauthenticated CV URL rejected;
- local admin rejected;
- public media key cannot fetch CV;
- script pasted into job body is stripped.

Responsive/a11y:

- mobile careers list;
- mobile job detail/form;
- keyboard-only submit/share/download;
- labels and error associations;
- focus moves to submission result/error summary;
- no horizontal overflow at supported widths.

### 15.5 Coverage and commands

Target at least 80% for the new recruitment modules and all security branches.

Run per package:

```powershell
pnpm --filter backend test
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter frontend test
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm e2e
pnpm --filter backend build
pnpm --filter frontend build
```

Also run:

- `pnpm audit`/project security scan according to repository policy;
- Prisma migration against the isolated test database;
- ClamAV EICAR integration test against local container;
- Google Rich Results Test against a staging job detail page.

---

## 16. Implementation phases and gates

### Phase 0 — approvals and fixtures

Tasks:

- confirm version-1 decisions in section 2;
- obtain privacy/legal approval for notice text, legal basis, and six-month policy;
- create sanitized sample jobs and safe sample PDFs;
- confirm Railway resources/private network;
- define production recruitment inbox recipient and portal users.

Gate:

- no public application form ships without approved privacy notice and a working scanner/storage deployment.

### Phase 1 — schema and contracts

Tasks:

- write schema/lifecycle tests first;
- add Prisma enums/models/relations/audit actions;
- create and review migration SQL;
- add DTO/Zod contracts and pure lifecycle/public-open helpers;
- run migration only against isolated test DB.

Gate:

- migration applies and rolls back in staging/test plan;
- no production command has been run;
- schema tests pass.

### Phase 2 — ClamAV and secure file pipeline

Tasks:

- add local Docker service and env validation;
- implement/test stdlib INSTREAM client;
- implement file validator and PII-free key generation;
- provision staging ClamAV private service;
- prove clean/EICAR/unavailable paths.

Gate:

- EICAR rejection and scanner-outage fail-closed behavior demonstrated;
- no rejected buffer reaches object storage;
- scanner port cannot be reached publicly.

### Phase 3 — backend jobs

Tasks:

- implement service and admin/public job APIs;
- enforce global-admin access;
- sanitize rich HTML;
- audit changes;
- test lifecycle/public visibility.

Gate:

- draft/publish/archive works by API;
- hidden jobs cannot be fetched publicly.

### Phase 4 — backend applications

Tasks:

- implement multipart route and write ordering;
- private storage;
- atomic PII-free outbox notification;
- admin list/detail/status/download/purge;
- public media deny;
- audit and rate limit tests.

Gate:

- full backend clean/infected/unavailable/auth matrix passes.

### Phase 5 — admin portal

Tasks:

- navigation;
- job list/create/edit;
- rich editor reuse;
- application list/detail/download/status/purge;
- loading/error/empty states;
- component tests.

Gate:

- admin can operate the complete flow without direct API calls;
- no application PII appears in URLs or browser storage.

### Phase 6 — public pages and SEO

Tasks:

- dynamic careers list;
- detail layout;
- form/proxy;
- share controls;
- metadata/JobPosting/sitemap;
- translations and accessibility.

Gate:

- staging clean application reaches portal;
- expired/archived jobs disappear from public API, page, markup, and sitemap;
- locale parity and Rich Results Test pass.

### Phase 7 — retention and operations

Tasks:

- daily advisory-locked purge;
- health/ops signals;
- runbook;
- backup-retention confirmation;
- production resource configuration.

Gate:

- enforcement-off mode reports but does not delete a seeded expired application;
- with the flag explicitly enabled in staging, the seeded application and object are purged;
- deletion failure retries safely;
- alerts contain no PII.

### Phase 8 — final review and controlled rollout

Tasks:

- code review;
- TypeScript-specific review;
- security review;
- privacy checklist;
- full tests/build;
- staging UAT with recruiter/admin;
- production migration and services;
- publish one low-risk test job only after smoke test.

Gate:

- all acceptance criteria below signed off.

---

## 17. Deployment, rollout, and rollback

### Deployment order

1. Deploy/provision ClamAV and persistent signature volume.
2. Verify private `PING` and EICAR scan from staging backend.
3. Verify private object storage.
4. Deploy backend migration and API.
5. Deploy frontend admin/public code.
6. Verify admin scanner/storage status.
7. Keep `RECRUITMENT_RETENTION_ENFORCE=false` through rollout.
8. Create a draft job.
9. Publish one staging/production test job as agreed.
10. Submit a clean test PDF.
11. Verify portal record, outbox/email alert, audited download, and manual deletion.
12. Publish real jobs.
13. Enable destructive retention only after written legal/privacy approval and a staging purge rehearsal.

### Migration safety

- additive tables/enums/relations only;
- no backfill of existing careers text;
- existing static Careers page remains renderable until jobs are published;
- migration reviewed for locks and indexes;
- production deploy uses existing Railway pre-deploy migration command;
- never run development migration commands against `backend/.env`.

### Rollback

Frontend rollback:

- revert to the prior Careers page; backend tables can remain unused.

Backend rollback before applications:

- roll back route deployment; leave additive tables in place rather than destructive emergency migration.

Backend rollback after applications:

- do not drop tables or bucket objects;
- disable publishing/application UI;
- keep admin access and retention available until data is safely handled;
- restore the last known-good API.

ClamAV outage:

- applications remain unavailable; do not add a bypass switch.
- If business needs a temporary alternative, use the careers email only after privacy/security approves how CV attachments will be handled. That is an operational decision, not an automatic code fallback.

---

## 18. Observability and runbook

### Structured counters

No PII labels:

- `recruitment_application_attempt_total{result}`;
- `recruitment_scan_duration_ms`;
- `recruitment_scan_result_total{clean|infected|error}`;
- `recruitment_storage_result_total{success|error}`;
- `recruitment_notification_result_total{success|error}`;
- `recruitment_retention_total{purged|missing_object|error}`.

If the current platform has no metrics backend, emit structured log events with these names and aggregate in Railway/log tooling. Do not introduce a metrics vendor solely for this feature.

### Alerts

- ClamAV unhealthy/unreachable for 5 minutes;
- signature database older than agreed threshold;
- scan error rate above baseline;
- repeated storage/DB compensation failures;
- recruitment email failures;
- retention sweep missed/overdue;
- abnormal upload-rate-limit volume.

### Runbook checks

1. Is ClamAV service healthy and within memory?
2. Is FreshClam updating?
3. Can backend private network resolve/connect to port 3310?
4. Is object storage configured and writable?
5. Did DB migration apply?
6. Is the job still published/unexpired?
7. Is the rate limiter/Redis healthy?
8. Does the admin application appear despite email failure?
9. Are retention objects and rows consistent?

---

## 19. Acceptance criteria

### Admin publishing

- [ ] Admin and super-admin can create, edit, publish, and archive a job.
- [ ] Patient, doctor, corporate admin, local admin, and unauthenticated users cannot.
- [ ] Country and locale are required and valid together.
- [ ] Job body supports headings, paragraphs, links, and lists.
- [ ] Unsafe HTML is removed.
- [ ] Published slug cannot change.
- [ ] Public URL is visible and copyable in portal.

### Public experience

- [ ] Careers list is scoped to route country and exact locale.
- [ ] Jobs are grouped by department and show location.
- [ ] Each job has a canonical shareable URL.
- [ ] Detail layout works desktop/mobile and resembles the reference behavior.
- [ ] Copy/Web Share/social-share actions use canonical URL.
- [ ] Draft, archived, expired, wrong-country, and wrong-locale jobs are not public.
- [ ] Empty and API-unavailable states are different.

### Applications

- [ ] Candidate can submit required details and one PDF no larger than 5 MiB.
- [ ] Backend validates all text/file constraints independently.
- [ ] Only a ClamAV-clean PDF is stored.
- [ ] Malware/scanner failure stores no object or row.
- [ ] Application is assigned to the job's country automatically.
- [ ] Success response and URL contain no PII.
- [ ] Notification email contains no CV attachment or direct CV URL.
- [ ] Rate limiting and honeypot work.

### Admin application access

- [ ] Applications can be filtered by country/job/status/date/search.
- [ ] Bulk list is paginated and omits unnecessary sensitive fields.
- [ ] Detail access and CV download require global admin.
- [ ] CV downloads as attachment with private/no-store/no-sniff controls.
- [ ] Public media route cannot serve a recruitment key.
- [ ] Detail/download/status/purge events are audited without PII metadata.
- [ ] Manual purge removes object then row.

### Retention and operations

- [ ] Every application has a server-calculated retention date.
- [ ] Daily sweep is advisory-locked, bounded, idempotent, and retryable.
- [ ] Enforcement defaults off and reports due records without deletion.
- [ ] An expired object/row pair is deleted.
- [ ] Failures retain enough state to retry and raise a non-PII alert.
- [ ] Backup retention and legal notice are approved.
- [ ] ClamAV is private, healthy, signature-updated, and resource-sized.

### Quality

- [ ] New recruitment modules meet 80%+ coverage.
- [ ] Backend/frontend tests, typechecks, lints, and builds pass.
- [ ] Critical E2E flow passes.
- [ ] Accessibility keyboard/mobile checks pass.
- [ ] Security and code reviews have no unresolved critical/high findings.
- [ ] Google Rich Results Test passes for a staging job.

---

## 20. File-level checklist

### Backend

- [ ] `backend/prisma/schema.prisma` — models, enums, Country relations, audit actions
- [ ] `backend/prisma/migrations/.../migration.sql` — additive migration
- [ ] `backend/src/config/env.ts` — recruitment/ClamAV env validation
- [ ] `backend/.env.example` — documented variables
- [ ] `backend/src/services/malware-scan.ts` — stdlib ClamAV client
- [ ] `backend/src/modules/recruitment/recruitment.schema.ts` — boundary validation
- [ ] `backend/src/modules/recruitment/recruitment.service.ts` — job/application logic
- [ ] `backend/src/modules/recruitment/recruitment-email.ts` — minimal notification
- [ ] `backend/src/modules/recruitment/recruitment-retention.service.ts` — purge
- [ ] `backend/src/modules/outbox/outbox.ts` — PII-free recruitment notification kind/dispatcher
- [ ] `backend/src/routes/jobs.route.ts` — public list/detail/apply
- [ ] `backend/src/routes/admin-jobs.route.ts` — admin job CRUD-without-delete
- [ ] `backend/src/routes/admin-job-applications.route.ts` — inbox/detail/download/purge
- [ ] `backend/src/routes/media-public.route.ts` — recruitment denylist
- [ ] `backend/src/lib/internal-scheduler.ts` — daily locked purge
- [ ] `docker-compose.yml` — local ClamAV

### Frontend public

- [ ] `frontend/lib/content/get-public-jobs.ts` — cached typed reads
- [ ] `frontend/app/[country]/[lang]/careers/page.tsx` — dynamic grouped list
- [ ] `frontend/app/[country]/[lang]/careers/[slug]/page.tsx` — job detail
- [ ] `frontend/app/[country]/[lang]/careers/[slug]/_components/job-application-form.tsx`
- [ ] `frontend/app/api/public/jobs/[id]/applications/route.ts` — raw upload proxy
- [ ] `frontend/app/sitemap.ts` — current job URLs
- [ ] `frontend/locales/*/company.json` — public strings
- [ ] `frontend/app/globals.css` — public careers/detail/form selectors only

### Frontend admin

- [ ] `frontend/lib/admin/admin-api/careers.ts` — server API wrapper
- [ ] `frontend/lib/admin/admin-api.ts` — barrel export
- [ ] `frontend/app/(portal)/(admin)/admin/layout.tsx` — one global Careers nav link
- [ ] `frontend/app/(portal)/(admin)/admin/careers/page.tsx`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/new/page.tsx`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/[id]/edit/page.tsx`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/_components/job-fields.tsx`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/_components/job-form-parse.ts`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/applications/page.tsx`
- [ ] `frontend/app/(portal)/(admin)/admin/careers/applications/[id]/page.tsx`
- [ ] `frontend/app/api/admin/careers/applications/[id]/cv/route.ts`
- [ ] `frontend/app/portal.css` — admin-only selectors only

### Tests/docs

- [ ] backend unit/route/integration tests beside new modules
- [ ] frontend data/component/page tests
- [ ] Playwright clean/EICAR/auth/archive flow
- [ ] production recruitment runbook in the existing docs structure
- [ ] privacy notice/version documented

---

## 21. Explicitly out of scope

Do not implement these unless separately requested:

- Press/PR CMS changes;
- BambooHR or any external ATS integration;
- candidate accounts;
- resume parsing, OCR, AI scoring, ranking, or extraction;
- pipeline stages beyond new/reviewed;
- recruiter notes/assignments;
- interview calendars;
- offer/rejection templates;
- custom form-builder questions;
- multiple attachments or DOC/DOCX;
- public CV links;
- CV email attachments;
- campaign/share token records;
- referral tracking;
- duplicate detection;
- CAPTCHA before abuse is observed;
- department administration;
- salary filtering/model;
- Google Indexing API;
- application CSV export.

---

## 22. Research and policy anchors

- Behavioral reference: [WebDoctor careers](https://www.webdoctor.ie/careers/) and its BambooHR-style department list/job detail.
- ClamAV protocol: [official clamd protocol and INSTREAM framing](https://docs.clamav.net/manual/Usage/ClamdProtocol.html).
- ClamAV deployment/resources: [official Docker guidance](https://docs.clamav.net/manual/Installing/Docker.html).
- Job SEO: [Google JobPosting structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/job-posting).
- EU retention/minimization principle: [European Commission GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en).
- Brazil privacy principle: [ANPD LGPD FAQ](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes).

The legal links support planning principles, not a final legal determination. Country-specific recruitment notice and retention approval remain a launch gate.
