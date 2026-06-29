# Security Audit Report

## 1. Executive Summary

This audit reviewed the local repository as a Next.js/Fastify/Prisma health platform, not as the Django/React Nashaa Sports platform described in the pasted global instructions. The codebase has several strong controls: HttpOnly JWT cookies, server-side role helpers, Stripe webhook signature verification, Zod validation on many routes, public media key validation, audit/security-alert tables, and CI typecheck/lint/test jobs.

Overall risk rating: Critical.

Most dangerous issue: medical access checks for sensitive patient records are shipped in shadow mode by default. The guard logs and alerts denied decisions but does not block access unless `MEDICAL_ACCESS_ENFORCE=true`.

Production readiness: not production-ready for real patient health data or paid subscriptions until the Critical and High findings are fixed.

Top 5 immediate actions:
- Enable fail-closed medical access enforcement in production and add regression tests proving denied doctors/admins receive 403.
- Rotate and remove the tracked globalhealthonline.com test credentials from docs/scripts.
- Replace 100-year patient upload tokens with short-lived, revocable, single-use database-backed tokens.
- Hard-fail production boot if real Stripe billing is not configured, and remove/strictly gate the fake billing activation endpoint.
- Upgrade vulnerable dependencies, especially `sanitize-html` and `next`, and add dependency/secret scanning to CI.

## Findings Summary

| Severity | Count |
|---|---:|
| Critical | 2 |
| High | 4 |
| Medium | 4 |
| Low | 3 |
| Informational | 3 |

## Top Priority Fixes

| Priority | Finding ID | Severity | Fix | Estimated Effort | Risk If Ignored |
|---:|---|---|---|---|---|
| 1 | SEC-001 | Critical | Make medical access guard fail closed in production and test 403 paths | Medium | PHI exposure across patient records |
| 2 | SEC-002 | Critical | Remove tracked shared credentials and rotate affected accounts | Small | Admin/doctor/patient account compromise |
| 3 | SEC-003 | High | Replace 100-year upload bearer tokens with short-lived revocable tokens | Medium | Long-lived PHI upload abuse after link leakage |
| 4 | SEC-004 | High | Disable fake billing in production and remove self-activation from customer prod | Medium | Users can receive subscription benefits without payment |
| 5 | SEC-006 | High | Upgrade vulnerable packages and add audit gates | Small | Known XSS, proxy bypass, DoS, SSRF vulnerabilities remain exploitable |

## Endpoint Risk Table

| Endpoint | Auth? | Role Check? | Input Validation? | Rate Limited? | Risk |
|---|---:|---:|---:|---:|---|
| `GET/PATCH /api/doctor/patients/:email/profile` | Yes | Doctor | Partial Zod | No route limit found | Critical: PHI guard can log-only and still return profile |
| `GET/POST /api/public/patient-upload` | Bearer link | Token-bound only | Partial | Yes | High: bearer token lasts about 100 years and is not revocable |
| `POST /api/me/subscription/dev-activate` | Yes | Patient | Minimal | Yes | High: fake billing can activate benefits if production is misconfigured |
| `POST /api/payments/sync-order` | No | No | Zod body | No | Medium: unauthenticated state-changing payment reconciliation surface |
| `POST /api/payments/webhook` | Stripe signature | Provider signature | Raw body/signature | No | Low: strong signature verification, but should monitor replay/dedupe |
| `POST /api/auth/login` | No | No | Zod body | Yes | Low: core login controls are present |
| `/api/admin/*` | Yes | Admin helper or subscription-management helper | Varies by route | Mostly no | Medium: broad privileged surface without consistent rate/fresh-auth controls |
| `POST /api/account/profile/*upload` | Yes | Patient session | MIME allowlist only | No route limit found | Medium: sensitive docs trust client MIME/content type |
| `GET /api/media/*` | No | Public key policy | Key validation | Yes | Low: public media blocks PHI prefixes and validates media keys |
| `/api/cron/*`, `/api/internal/run-*` | Shared secret | Secret header/body | Secret required | No | Low: fail-closed when `CRON_SECRET` missing, but secrets need rotation/monitoring |

## 2. Application Map

### 2.1 Tech Stack

| Area | Observed Stack |
|---|---|
| Frontend | Next.js `16.2.4`, React `19.2.4`, TypeScript, Tailwind CSS 4, App Router, edge `proxy.ts` auth gate |
| Backend | Fastify 5, TypeScript, Zod, Prisma 7.8, PostgreSQL |
| Auth | Custom email/password auth, bcryptjs hashing, JWT cookie `gh_auth`, optional TOTP 2FA |
| Database | PostgreSQL via Prisma schema/migrations |
| Payments | Stripe Checkout/webhooks for orders and subscriptions; fake billing port for dev/test |
| Email | SendGrid fallback, Gmail API sender support |
| Messaging | WaSender WhatsApp integration |
| Storage | S3-compatible object storage, local disk fallback |
| Background jobs | HTTP cron/internal endpoints protected by `CRON_SECRET`; no separate worker process observed |
| AI/LLM | No direct LLM provider or agent feature found in reviewed source |
| Hosting/deployment | Railway-oriented configs (`railway.json`, `nixpacks.toml`, frontend Dockerfile) |
| CI/CD | GitHub Actions: install, typecheck, lint, backend tests with Postgres, frontend tests, standalone lockfile checks |

### 2.2 Frontend Routes

| Route | Purpose | Public/Protected | Role Required | Backend/Data Used | Risk Notes |
| ----- | ------- | ---------------: | ------------- | ----------------- | ---------- |
| `/`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms` | Public marketing and legal pages | Public | None | Public API/content | Lower risk, depends on sanitized CMS content |
| `/:country/:lang/*` | Country/language public portal: services, doctors, tests, pricing, booking/cart/checkout | Public plus transactional flows | None or session for account linking | Public catalog, cart, payments | Payment/cart routes must not trust client-side price |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth flows | Public | None | `/api/auth/*` | Rate limits exist on backend auth routes |
| `/account/*` | Patient portal: bookings, profile, medical files, payments, family, subscription | Protected | Patient | `/api/account/*`, `/api/me/*` | PHI and payment data surface |
| `/doctor/*` | Doctor portal: appointments, patients, notes, prescriptions, documents, availability | Protected | Doctor | `/api/doctor/*` | PHI access depends on medical guard enforcement |
| `/admin/*` | Admin CMS, doctors, patients, orders, invoices, users, audit log, subscriptions | Protected | Admin/local admin/super admin | `/api/admin/*` | Broad privileged surface; needs fresh auth/MFA/audit discipline |
| `/patient-upload` | Public upload form reached through signed link | Public token | Link token | `/api/public/patient-upload` | High risk due token lifetime/revocation gap |
| `/reviews/rate` | Public review form reached through signed link | Public token | Link token | `/api/public/reviews/rate` | Token abuse and spam should be rate limited |
| `/verify/certificate/:id`, `/share/consults/:token` | Public verification/share-token views | Public token/id | Token/id | `/api/public/*`, `/api/share-links/:token` | Expiration and minimal data exposure required |
| `/print/*` | Printable appointment/consult/form/invoice views | Mixed | Caller-specific | API fetches | Ensure private documents are not browser-cacheable |
| `/api/*` Next route handlers | Frontend proxy layer to backend APIs | Mixed | Mostly backend-enforced | `proxy-forward.ts` | Frontend proxy must not become auth bypass |

### 2.3 API / Server Routes

| Method | Endpoint | Purpose | Auth Required | Role Required | Input Sources | Data Touched | Risk Notes |
| ------ | -------- | ------: | ------------- | ------------- | ------------- | ------------ | ---------- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Auth session lifecycle | No for register/login | None | JSON body, cookies | User, audit logs | Good rate limits on register/login; JWT revocation is not server-side |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-email` | Token auth flows | No | None | Email/reset token | User tokens | Tokens are hashed/single-use; rate limits present |
| POST/GET | `/api/auth/2fa/*` | Optional TOTP 2FA | Mixed | Authenticated user | TOTP/pending token | User 2FA fields | 2FA exists but is not mandatory for all privileged roles |
| GET/PATCH/POST | `/api/account/*` | Patient portal profile, appointments, payments, uploads, documents | Yes | Patient | Params, JSON, multipart | PHI, orders, files | Upload validation gaps and PHI encryption-off defaults matter |
| GET/POST/PATCH/DELETE | `/api/doctor/*` | Doctor appointments, patients, documents, notes, prescriptions, chat | Yes | Doctor | Params, JSON, multipart | PHI, clinical records | PHI guard shadow mode is the key boundary failure |
| GET/POST/PATCH/DELETE | `/api/admin/*` | Admin CMS/users/doctors/patients/orders/plans/audit | Yes | Admin/local admin/super admin | Params, JSON, multipart | All platform data | Broad surface; needs consistent rate limiting and fresh auth |
| GET | `/api/countries/*`, `/api/services/*`, `/api/doctors/*`, `/api/blog/*` | Public catalog/content | No | None | Route/query params | Public content | CMS HTML sanitizer and CSP are important |
| POST | `/api/appointments`, `/api/cart/*`, `/api/cart/checkout` | Booking/cart/order creation | Mostly public or optional session | None/patient | JSON body/cart cookie | Appointments, orders, slots | Server recomputes prices; checkout is rate limited |
| POST | `/api/payments/checkout-session` | Stripe checkout creation | No | None | Appointment/order identifiers | Payment/session rows | Rate limited and uses server-side price |
| POST | `/api/payments/sync-order` | Stripe reconciliation fallback | No | None | `orderId` or `stripeSessionId` | Order payment status | Unauthenticated, state-changing, no route rate limit |
| POST | `/api/payments/webhook` | Stripe webhook receiver | Provider signature | Stripe | Raw body/signature | Payments/orders/subscriptions | Signature verification and dedupe present |
| GET/POST | `/api/public/patient-upload` | Patient document upload by signed link | Signed link | Link token | Token, multipart | Patient docs, appointment docs | Token lifetime/revocation and MIME sniffing are weak |
| GET/POST | `/api/public/reviews/rate` | Review-token fetch/submit | Signed link | Link token | Token/body | Review rows | Needs spam/replay checks |
| GET | `/api/media/*` | Public marketing media | No | None | Key path | S3/local objects | Validates key and blocks PHI prefixes |
| POST | `/api/cron/*`, `/api/internal/run-*` | Scheduled jobs/reminders | Shared secret | Cron/internal | Header/body secret | Automations/reminders | Fail closed when missing secret; monitor and rotate |

### 2.4 Sensitive Data Inventory

| Data Type | Where Collected | Where Stored | Who Can Access | Retention Risk | Security Concern |
| --------- | --------------- | ------------ | -------------- | -------------- | ---------------- |
| Patient PII/profile | Registration, booking, account profile, admin/doctor edits | `User`, `PatientProfile` | Patient, admins, doctors under guard | Long-lived medical/customer records | Medical guard shadow mode; encryption optional |
| PHI/clinical notes | Doctor portal notes, prescriptions, exam results, generated docs | Prisma clinical tables, object storage | Doctors/admins/patients depending route | Medical retention/legal obligations | Consent/2FA/confidentiality must be enforced |
| Government/ID/insurance docs | Patient profile uploads | S3/local `patient-docs/*` keys | Patient/admin/guarded routes | Very sensitive documents | MIME sniffing absent; some fields plaintext if key unset |
| Chat/messages/internal notes | Patient/doctor/admin message routes | Prisma message tables, attachments | Participants/admins | Support/clinical history | Attachment and authorization controls critical |
| Payments/orders/subscriptions | Checkout/cart/subscription flows | Stripe, orders, invoices, credits | Patient/admin/support | Financial records | Fake billing and sync endpoints require hardening |
| Auth secrets/tokens | Login/reset/2FA/upload links | Cookies, token tables, signed link payloads | User/browser/server | Token leakage impact | Upload tokens too long; JWT no server-side revocation |
| Audit/security logs | Auth, admin, medical access helper | Prisma audit/log tables | Admins | Incident evidence | Some audit failures are swallowed by design |

### 2.5 External Integrations

| Integration | Use | Security Notes |
|---|---|---|
| Stripe | Checkout, payment webhooks, subscriptions | Webhook signature verification exists; fake billing fallback must be fail-closed in production |
| SendGrid/Gmail | Transactional email | Secrets are env-driven; docs mention tokens from logs for manual testing |
| Google OAuth/Calendar/Meet | Meeting links and Gmail send | Refresh token scope separation documented in env example |
| WaSender | WhatsApp notifications | Token via env; avoid logging full provider responses containing phone/PII |
| S3-compatible storage | Public media and private PHI documents | Public media route blocks PHI prefixes; upload sniffing inconsistent |
| Railway/Postgres | Deployment/database | Railway-oriented configs present; local Docker default password only safe for dev |

## 3. Security Model and Trust Boundaries

The application is a single platform with role-based access: visitor, patient, doctor, admin, local admin, and super admin. Public visitors can browse content, book, checkout, open tokenized review/upload/share links, and verify certificates. Patients can access their own portal data through JWT-cookie authentication. Doctors can access their own appointment/patient workflows through doctor-linked user accounts. Admins can administer content, users, doctors, orders, patients, subscriptions, audit logs, and settings. Local admin scoping exists through country/folder concepts.

Primary trust boundaries are:
- Browser to frontend Next.js proxy/API route handlers.
- Frontend proxy to backend Fastify routes.
- JWT cookie to backend `requireAuth`, `verifyDoctorAccess`, and `verifyAdminAccess`.
- Doctor/admin/patient role checks to Prisma row queries.
- Tokenized public links to private workflows such as patient uploads, reviews, and consultation shares.
- Stripe webhook signatures to payment state transitions.
- S3/local storage keys to public/private file delivery.

What prevents bypassing the UI is backend route enforcement, not React route visibility. This is generally present through helper functions, but several important surfaces rely on configuration or token assumptions. The highest-risk boundary is clinical access: `guardMedicalRead` records would-be denials but, by default, does not enforce them. A second important boundary is payment: production can fall back to fake billing if real Stripe configuration is missing. A third is long-lived bearer links for patient uploads.

## 4. Critical Findings

### [CRITICAL] Medical access guard logs denials but does not block by default

**ID:** SEC-001  
**Severity:** Critical  
**Confidence:** High  
**Exploitability:** Easy  
**Affected Area:** Authorization / Privacy / Backend  
**Affected Files:**
- `backend/src/config/env.ts`
- `backend/src/lib/medical-access-guard.ts`
- `backend/src/utils/guard-medical-read.ts`
- `backend/src/routes/doctor-patient-profile.route.ts`
- `backend/src/routes/medical-documents.route.ts`
- `backend/src/routes/account-profile.route.ts`
- `backend/src/routes/admin-patient-profile.route.ts`

**Summary:**  
Sensitive medical access checks default to shadow mode. Denied decisions are logged and alerted, but the request continues unless `MEDICAL_ACCESS_ENFORCE=true`.

**Evidence:**  
`env.ts` documents `MEDICAL_ACCESS_ENFORCE` as unset/false by default and computes enforcement only when explicitly set to true. `medical-access-guard.ts` states that shadow mode returns `{ allowed:false }` without throwing, and `denyDecision()` only throws when `env.MEDICAL_ACCESS_ENFORCE` is true. `guard-medical-read.ts` repeats that shadow mode "never throws" on deny. `doctor-patient-profile.route.ts` calls `guardMedicalRead()` and then returns `serializeProfile(profile, { includeAlerts: true })`; in default shadow mode a denied doctor still receives the profile.

**Why This Is Dangerous:**  
This is a direct PHI access-control failure. A doctor or local admin who fails confidentiality, 2FA, consent, country-folder, or live-grant checks can still receive patient medical data if production is not explicitly configured for enforcement.

**Possible Exploit Scenario:**  
A doctor with an appointment for a patient opens `/api/doctor/patients/:email/profile`. If the doctor has not completed 2FA or confidentiality agreement, the guard writes a denied access log but does not throw in default mode. The route continues and returns sensitive profile fields and alerts.

**Recommended Fix:**  
Make production fail closed. In `env.ts`, throw during production boot unless `MEDICAL_ACCESS_ENFORCE=true`. Consider allowing shadow mode only in `NODE_ENV !== "production"` or behind a clearly named temporary migration flag. Change route helpers to always check `result.allowed` and return 403 even if the guard does not throw. Add a deployment check that refuses production if confidentiality/2FA/consent backfill is incomplete.

**Suggested Regression Test:**  
Integration test: create a doctor and patient appointment, omit doctor 2FA/confidentiality or required consent, call `GET /api/doctor/patients/:email/profile`, and assert HTTP 403 plus a `MedicalAccessLog` row. Repeat for medical document download.

**References:**  
OWASP API1:2023 Broken Object Level Authorization, OWASP ASVS 4.3 Access Control, CWE-862 Missing Authorization, CISA Secure by Design.

### [CRITICAL] Production-looking shared credentials are committed in manual test docs/scripts

**ID:** SEC-002  
**Severity:** Critical  
**Confidence:** High  
**Exploitability:** Easy  
**Affected Area:** Secrets / Auth / Admin  
**Affected Files:**
- `docs/manual-tests/TEST-EXECUTION-ORDER.md`
- `docs/manual-tests/TEST-RESULTS.md`
- `docs/manual-tests/run-api-smoke.ps1`
- `docs/manual-tests/run-final-remaining-tests.ps1`
- `docs/manual-tests/run-last-2-percent.ps1`
- `docs/manual-tests/run-phase0-api.ps1`
- `docs/manual-tests/run-remaining-window-tests.ps1`

**Summary:**  
Manual testing files contain real-looking shared credentials for patient, doctor, and admin accounts at the production-looking `globalhealthonline.com` domain. The password is masked here as `GHAd...qL9!` and must be treated as exposed.

**Evidence:**  
`TEST-EXECUTION-ORDER.md` lists wildcard globalhealthonline.com credentials. `TEST-RESULTS.md` lists `patient@globalhealthonline.com`, `doctor@globalhealthonline.com`, and `admin@globalhealthonline.com` with the same password. Several PowerShell smoke scripts assign the same password to `$Pass` and log in as those accounts.

**Why This Is Dangerous:**  
If any of these accounts exist in production or staging, anyone with repository access can log in. The admin account would allow privileged data access and configuration changes. Even if these are test-only, the pattern encourages credential reuse and makes rotation/audit difficult.

**Possible Exploit Scenario:**  
An attacker obtains repository access, searches for `password`, logs in with `admin@globalhealthonline.com` and the documented password, then exports patient/order data or changes doctor/admin records.

**Recommended Fix:**  
Immediately rotate or disable all listed accounts in every environment. Replace hardcoded credentials in docs/scripts with environment variables such as `$env:GH_TEST_ADMIN_PASSWORD`. Remove real domains from manual docs or mark them as synthetic non-production accounts. Add a secret scanner to CI and block future credentials in docs/tests.

**Suggested Regression Test:**  
Add `gitleaks` or `trufflehog` CI scanning with a custom rule for `globalhealthonline.com` plus password-like literals. Add a test that manual smoke scripts fail fast when required env vars are missing.

**References:**  
OWASP Secrets Management Cheat Sheet, OWASP ASVS 2.10, CWE-798 Hard-coded Credentials, NIST SSDF PW.4.

## 5. High Findings

### [HIGH] Patient upload bearer links last about 100 years and are not revocable

**ID:** SEC-003  
**Severity:** High  
**Confidence:** High  
**Exploitability:** Easy  
**Affected Area:** File Upload / Privacy / Backend  
**Affected Files:**
- `backend/src/modules/patient-upload/patient-upload-link.service.ts`
- `backend/src/routes/patient-upload.route.ts`

**Summary:**  
Patient upload links are bearer tokens with a TTL of `100 * 365 * 24 * 60 * 60 * 1000` milliseconds, no database state, no revocation, and no single-use enforcement.

**Evidence:**  
`TOKEN_TTL_MS` is set to roughly 100 years. Token claims include email, appointmentId, doctorId, optional documentId, expiry, nonce, and HMAC signature. `patient-upload.route.ts` accepts the token for GET/POST, rechecks the appointment and email, then stores the file under `patient-upload/<email>/...`. No token row, `usedAt`, `revokedAt`, or max-submission count was found.

**Why This Is Dangerous:**  
Any leaked upload URL remains useful for years. A forwarded email, browser history entry, support screenshot, referrer leak, or inbox compromise can let an attacker repeatedly upload PHI-bearing files into a patient/doctor workflow.

**Possible Exploit Scenario:**  
A patient forwards an old upload email to a helper. Months later the helper's mailbox is compromised. The attacker uses the still-valid token to upload malicious or misleading documents to the appointment record.

**Recommended Fix:**  
Use a `PatientUploadLink` table with hashed token, appointmentId, doctorId, patientProfileId/email, expiresAt, usedAt/revokedAt, createdByUserId, and maxUploads. Default TTL should be hours or days, not years. Bind v3 prescription tokens to one document response and mark them used after successful upload. Use a dedicated production `PATIENT_UPLOAD_LINK_SECRET`.

**Suggested Regression Test:**  
Create an expired token and assert GET/POST return 400/401. Create a used/revoked token and assert upload fails. Create a valid token, upload once, then assert second upload fails when single-use is expected.

**References:**  
OWASP ASVS 3 Session Management, OWASP API2:2023 Broken Authentication, CWE-613 Insufficient Session Expiration.

### [HIGH] Fake billing can activate subscriptions if production Stripe configuration is wrong

**ID:** SEC-004  
**Severity:** High  
**Confidence:** High  
**Exploitability:** Moderate  
**Affected Area:** Payments / Backend / Configuration  
**Affected Files:**
- `backend/src/modules/billing/billing.factory.ts`
- `backend/src/modules/subscriptions/subscription.service.ts`
- `backend/src/routes/me-subscription.route.ts`
- `backend/src/config/env.ts`

**Summary:**  
The billing factory silently falls back to the in-memory fake billing driver unless `BILLING_DRIVER=stripe` and Stripe is configured. The authenticated patient endpoint `/api/me/subscription/dev-activate` can activate an incomplete subscription under fake billing when not production, or in production if `ALLOW_TEST_SUBSCRIPTION_ACTIVATION=true`.

**Evidence:**  
`billing.factory.ts` returns `FakeBillingPort` whenever the Stripe driver is not selected/configured. `devActivateSubscription()` allows activation when `getBillingPort().driver === "fake"` and either `NODE_ENV !== "production"` or the test activation flag is true. `env.ts` comments correctly warn that setting the flag true on customer production would let users self-grant a free subscription.

**Why This Is Dangerous:**  
Production payment controls should fail closed. A missing Stripe key or mistaken environment flag can leave a public patient route capable of granting subscription status and credits without real payment.

**Possible Exploit Scenario:**  
Production deploy misses `STRIPE_SECRET_KEY` or has `BILLING_DRIVER` unset. A patient starts a subscription, receives a fake checkout URL or incomplete row, then calls `/api/me/subscription/dev-activate` and receives active benefits.

**Recommended Fix:**  
In production, require `BILLING_DRIVER=stripe`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` when subscriptions are enabled. Throw on boot if fake billing is selected in production. Compile or register `/api/me/subscription/dev-activate` only outside production, or require an internal admin/cron secret and staging-only allowlist.

**Suggested Regression Test:**  
Set `NODE_ENV=production`, no Stripe key, and assert app startup fails. Set `NODE_ENV=production`, fake billing, and call `/api/me/subscription/dev-activate`; assert 404 or 403 even if `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` is absent.

**References:**  
OWASP API6:2023 Unrestricted Access to Sensitive Business Flows, OWASP ASVS 5.1, CWE-840 Business Logic Errors.

### [HIGH] Sensitive upload paths trust client MIME and lack content sniffing/malware controls

**ID:** SEC-005  
**Severity:** High  
**Confidence:** High  
**Exploitability:** Moderate  
**Affected Area:** File Upload / Backend / Privacy  
**Affected Files:**
- `backend/src/routes/medical-documents.route.ts`
- `backend/src/routes/appointment-documents.route.ts`
- `backend/src/routes/account-profile.route.ts`
- `backend/src/routes/patient-upload.route.ts`
- `backend/src/routes/admin-media-upload.route.ts`

**Summary:**  
Marketing/admin media upload performs byte sniffing, but sensitive PHI upload paths only check `part.mimetype`/declared MIME and file size. Some doctor document downloads are served inline with the stored content type.

**Evidence:**  
`admin-media-upload.route.ts` defines `sniffFileMime()` and rejects mismatches. In contrast, medical/account/appointment/patient upload routes call `part.toBuffer()`, read `part.mimetype`, check an allowlist, and call `putObject()` using that declared mimetype. `appointment-documents.route.ts` downloads doctor documents with `Content-Disposition: inline`.

**Why This Is Dangerous:**  
Client-supplied MIME is attacker-controlled. Mislabelled files, polyglots, malformed PDFs/images, or malware can enter clinician/admin workflows. Inline rendering increases phishing/XSS/PDF exploit exposure in the browser.

**Possible Exploit Scenario:**  
A patient upload token is leaked. The attacker uploads an HTML/SVG/polyglot file declared as `application/pdf`. A doctor opens it from the portal and the browser/plugin renders attacker-controlled content or downloads malware.

**Recommended Fix:**  
Extract the admin media byte-sniffing logic into a shared upload validator and use it for all clinical/profile upload routes. Store the sniffed MIME, not the client-declared MIME. Serve all sensitive files as `attachment` unless there is a separate safe preview pipeline. Add antivirus/malware scanning and quarantine states for PHI uploads.

**Suggested Regression Test:**  
Upload a buffer beginning with `<svg` or HTML while declaring `image/png` or `application/pdf`; assert 415 and no object is stored. Test that clinical downloads include `Content-Disposition: attachment`.

**References:**  
OWASP File Upload Cheat Sheet, OWASP ASVS 12 Files and Resources, CWE-434 Unrestricted Upload of File with Dangerous Type.

### [HIGH] Dependency audit found critical/high advisories in active packages

**ID:** SEC-006  
**Severity:** High  
**Confidence:** High  
**Exploitability:** Moderate  
**Affected Area:** Dependency / Supply Chain / Frontend / Backend  
**Affected Files:**
- `backend/package.json`
- `frontend/package.json`
- `pnpm-lock.yaml`

**Summary:**  
`pnpm audit --prod` found 30 vulnerabilities: 1 critical, 9 high, 16 moderate, and 4 low. The highest-risk direct packages are `sanitize-html@2.17.3` and `next@16.2.4`.

**Evidence:**  
Audit output reported a critical `sanitize-html` advisory for raw-text passthrough via `xmp`, affecting both backend and frontend paths. It also reported multiple high Next.js advisories fixed in `>=16.2.5` or `>=16.2.6`, including proxy/middleware bypass, DoS, SSRF, and cache issues. `next.config.ts` and frontend routes rely on Next proxy/headers for protected route gating, so Next advisories matter.

**Why This Is Dangerous:**  
Known vulnerabilities are easier to exploit because advisories and proofs often become public. This app renders sanitized HTML and relies on Next App Router/proxy behavior; both vulnerable package families are on critical paths.

**Possible Exploit Scenario:**  
An attacker finds a public or admin-authored rich HTML ingestion path that passes through vulnerable `sanitize-html`, crafts markup that bypasses sanitization, and triggers stored XSS on a public article/service page. Separately, a Next proxy bypass could undermine frontend route guards if backend assumptions drift.

**Recommended Fix:**  
Upgrade `next` to at least `16.2.6` or the latest compatible patched version. Upgrade `sanitize-html` as soon as a patched advisory version is available; if no patched version exists, add explicit `xmp` and raw-text tag stripping tests and consider a different sanitizer for rich HTML. Run `pnpm audit --prod` in CI and fail on high/critical advisories unless explicitly risk-accepted.

**Suggested Regression Test:**  
Add sanitizer tests with `<xmp>`, `<script>`, event handlers, `javascript:` URLs, and nested raw-text payloads. Add CI dependency audit gate for high/critical advisories.

**References:**  
OWASP Software Component Verification Standard, OWASP A06 Vulnerable and Outdated Components, NIST SSDF RV.1.

## 6. Medium Findings

### [MEDIUM] Unauthenticated payment sync endpoint is state-changing and not route-rate-limited

**ID:** SEC-007  
**Severity:** Medium  
**Confidence:** High  
**Exploitability:** Moderate  
**Affected Area:** Payments / API  
**Affected Files:**
- `backend/src/routes/payments.route.ts`
- `backend/src/modules/orders/complete-order-payment.service.ts`

**Summary:**  
`POST /api/payments/sync-order` is unauthenticated, has no route-level rate limit, and triggers server-side Stripe retrieval plus order payment synchronization.

**Evidence:**  
The route accepts `orderId` or `stripeSessionId`, validates shape with Zod, then calls `syncOrderPaymentFromStripe()` or `syncOrderPaymentFromStripeSession()`. The service checks Stripe server-side and only marks orders paid when Stripe reports `payment_status === "paid"`, which prevents simple client-side payment forgery. However, the endpoint is still state-changing/reconciliation logic callable by anyone.

**Why This Is Dangerous:**  
Attackers can enumerate IDs, generate unnecessary Stripe API calls, trigger payment automations for already paid orders, and create noisy logs/alerts. Because it is unauthenticated, abuse attribution is poor.

**Possible Exploit Scenario:**  
A bot repeatedly posts guessed order IDs to `/api/payments/sync-order`, causing Stripe API load and repeatedly invoking idempotent-but-expensive post-payment automation paths for paid orders.

**Recommended Fix:**  
Require the authenticated order owner, a short-lived success-page nonce tied to the order/session, or an internal secret. Add route-level rate limiting. Keep Stripe verification as the source of truth.

**Suggested Regression Test:**  
Call `/api/payments/sync-order` unauthenticated and assert 401/403. Call as another patient for an order they do not own and assert 403. Assert rate limit after configured attempts.

**References:**  
OWASP API5:2023 Broken Function Level Authorization, OWASP API4:2023 Unrestricted Resource Consumption, CWE-306 Missing Authentication.

### [MEDIUM] Rate limiting is opt-in and missing from much of the privileged/public route surface

**ID:** SEC-008  
**Severity:** Medium  
**Confidence:** High  
**Exploitability:** Easy  
**Affected Area:** API / Backend / Availability  
**Affected Files:**
- `backend/src/app.ts`
- `backend/src/routes/*.route.ts`

**Summary:**  
Fastify rate limiting is registered with `global:false`; only routes with explicit `config.rateLimit` are protected. A search found rate-limit config in a small subset of the 111 route files.

**Evidence:**  
`app.ts` registers `@fastify/rate-limit` with `global:false`. Route files such as auth, checkout, patient upload, contact, newsletter, and some token flows include route-level limits. Many admin/doctor/account mutation routes do not show explicit route limits.

**Why This Is Dangerous:**  
Authenticated abuse, credentialed scraping, expensive admin searches, document operations, chat uploads, and token endpoints can be hammered without uniform throttling. This increases brute-force, scraping, and availability risk.

**Possible Exploit Scenario:**  
A compromised low-privilege account repeatedly calls patient search, document listing, chat upload, or expensive report endpoints. Without global/user-aware throttling, the service relies on app logic and database capacity.

**Recommended Fix:**  
Enable a conservative global limit, then override high-traffic public content routes where necessary. Use user-id keys for authenticated endpoints and IP keys for public endpoints. Add stricter limits for uploads, search, admin exports, login, reset, reviews, and payment sync.

**Suggested Regression Test:**  
Route test that calls a representative protected mutation over the allowed limit and asserts 429. Include both IP and authenticated-user rate-limit keys.

**References:**  
OWASP API4:2023 Unrestricted Resource Consumption, OWASP ASVS 11 Business Logic, CWE-770 Allocation of Resources Without Limits.

### [MEDIUM] JWT sessions have no server-side revocation or fresh-auth requirement for high-risk actions

**ID:** SEC-009  
**Severity:** Medium  
**Confidence:** Medium  
**Exploitability:** Moderate  
**Affected Area:** Auth / Admin / Privacy  
**Affected Files:**
- `backend/src/utils/auth-session.ts`
- `backend/src/routes/auth.route.ts`
- `backend/src/routes/auth-2fa.route.ts`
- `backend/src/utils/admin-auth.ts`

**Summary:**  
JWT auth cookies are stateless and default to a seven-day expiration. Logout clears the browser cookie but does not revoke the token server-side. 2FA exists, but privileged operations are not consistently gated by mandatory MFA or fresh auth.

**Evidence:**  
`auth-session.ts` signs JWTs with `AUTH_JWT_EXPIRES_IN` default `7d`. `logout` clears the cookie. No token denylist/session table was found in the reviewed auth helpers. `auth-2fa.route.ts` implements optional TOTP setup/confirm/verify/disable, but role helpers do not require admin/doctor 2FA before privileged access except through the medical guard once enforcement is enabled.

**Why This Is Dangerous:**  
A stolen cookie remains valid until expiry, even after logout or password reset, unless the signing key rotates. High-risk admin/patient/doctor actions can be performed by anyone holding a valid token.

**Possible Exploit Scenario:**  
A doctor's cookie is stolen on a shared device. The doctor logs out, but the attacker reuses the copied token for the remainder of its validity period to access doctor routes.

**Recommended Fix:**  
Introduce a server-side session table with `sessionId`/`jti`, `revokedAt`, `lastSeenAt`, device metadata, and password-version invalidation. Require fresh password or 2FA confirmation for admin user changes, doctor PHI access, exports, payment refunds, data deletion, and 2FA disable.

**Suggested Regression Test:**  
Create a session, call logout or password reset, then replay the old cookie against `/api/auth/me` and assert 401. Attempt an admin password reset without fresh-auth proof and assert 403.

**References:**  
OWASP ASVS 3 Session Management, OWASP ASVS 2 Authentication, CWE-613 Insufficient Session Expiration.

### [MEDIUM] Blog/rich HTML safety depends on sanitizer and CSS containment assumptions

**ID:** SEC-010  
**Severity:** Medium  
**Confidence:** Medium  
**Exploitability:** Moderate  
**Affected Area:** Frontend / XSS / Content  
**Affected Files:**
- `backend/src/utils/sanitize-html.ts`
- `frontend/lib/content/scope-blog-html.ts`
- `frontend/lib/content/sanitize-page-body.ts`
- `frontend/components/sections/RichBodySection.tsx`
- `frontend/components/sections/ServiceLinkedBody.tsx`
- `frontend/next.config.ts`

**Summary:**  
The app intentionally renders admin-authored HTML with `dangerouslySetInnerHTML`. Narrow page-body sanitization is good, but blog sanitization allows `<style>` and broad inline styles, relying on frontend CSS scoping/containment. The frontend CSP is header-only hardening and lacks a nonce-based `script-src`.

**Evidence:**  
`sanitize-page-body.ts` strips scripts/styles/event handlers for normal page body content. `sanitize-html.ts` has a permissive `sanitizeBlogHtml()` that allows `<style>`, `class`, `id`, and inline `style`, with comments relying on render-side containment. `scope-blog-html.ts` wraps style blocks with `@scope (.gh-article-body)`. `RichBodySection.tsx` and `ServiceLinkedBody.tsx` use `dangerouslySetInnerHTML`. `next.config.ts` sets `Content-Security-Policy` to `frame-ancestors`, `object-src`, and `base-uri` only; comments state nonce-based `script-src` is a follow-up.

**Why This Is Dangerous:**  
This is not confirmed stored XSS from reviewed code, but it is a fragile trust chain. A sanitizer vulnerability, render-site refactor, browser `@scope` inconsistency, or malicious admin/imported content can lead to visual defacement, phishing overlays, or script execution if a sanitizer bypass exists.

**Possible Exploit Scenario:**  
A compromised admin imports a styled blog article with aggressive CSS selectors or a payload exploiting a sanitizer advisory. Public users load the page, and the content overlays a fake login/payment prompt.

**Recommended Fix:**  
Keep normal CMS fields on the strict sanitizer. For full-designed articles, render inside a real Shadow DOM component or isolated iframe with a tight sandbox and CSP. Add nonce-based CSP including `script-src`, `style-src`, `img-src`, `connect-src`, and `frame-src`. Add tests for raw-text tags such as `xmp`.

**Suggested Regression Test:**  
Unit test sanitizers against `<script>`, `onerror`, `javascript:`, `<xmp>`, `<style>body{}</style>`, fixed-position overlays, and data URLs. E2E test that injected blog CSS cannot affect header/footer/login UI.

**References:**  
OWASP XSS Prevention Cheat Sheet, OWASP ASVS 5 Validation/Sanitization, CWE-79 XSS, CWE-1021 Improper Restriction of Rendered UI Layers.

## 7. Low Findings

### [LOW] Local disk media storage can be enabled in production by environment variable

**ID:** SEC-011  
**Severity:** Low  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** Infrastructure / Storage  
**Affected Files:**
- `backend/src/services/object-storage.ts`
- `backend/src/config/env.ts`

**Summary:**  
Local media storage is enabled outside production, but also becomes enabled in production if `LOCAL_MEDIA_ROOT` is set.

**Evidence:**  
`isDevLocalMediaEnabled()` returns true when `env.NODE_ENV !== "production" || Boolean(env.LOCAL_MEDIA_ROOT?.trim())`. Path traversal is guarded with `path.relative`, which is good, but production local disk storage is still possible by config.

**Why This Is Dangerous:**  
Production local disk storage can lose uploads on ephemeral filesystems, bypass bucket policies/scanning, and complicate backups/retention.

**Possible Exploit Scenario:**  
A production deploy has `LOCAL_MEDIA_ROOT` set for debugging. PHI uploads land on container disk instead of S3, then disappear on redeploy or are missed by storage backup/scanning policies.

**Recommended Fix:**  
Disallow local media in production unless a clearly named `ALLOW_PRODUCTION_LOCAL_MEDIA=true` break-glass flag is set, and log a critical startup warning. Prefer failing boot if S3 is not configured for production.

**Suggested Regression Test:**  
Set `NODE_ENV=production` with `LOCAL_MEDIA_ROOT` and no S3 config; assert startup or upload fails unless an explicit break-glass flag is set.

**References:**  
OWASP ASVS 14 Configuration, NIST SSDF PO.5, CWE-16 Configuration.

### [LOW] Patient email appears in object storage keys for upload links

**ID:** SEC-012  
**Severity:** Low  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** Privacy / Storage  
**Affected Files:**
- `backend/src/routes/patient-upload.route.ts`

**Summary:**  
Patient upload files are stored under keys containing the normalized patient email address.

**Evidence:**  
`patient-upload.route.ts` builds keys like `patient-upload/${verified.email}/${randomUUID()}-${safeName}`.

**Why This Is Dangerous:**  
S3 keys often appear in logs, storage consoles, metrics, backup manifests, support tickets, and error messages. Embedding email addresses increases PII exposure outside the database.

**Possible Exploit Scenario:**  
An operations log captures failed object access paths and exposes patient email addresses to a broader support/logging audience than intended.

**Recommended Fix:**  
Use opaque identifiers such as `patient-upload/${patientProfileId}/${uuid}` or a hashed partition key. Keep patient email only in database metadata with normal access controls.

**Suggested Regression Test:**  
Upload through a patient token and assert the stored object key does not contain `@` or the patient email local/domain parts.

**References:**  
OWASP Privacy by Design, GDPR data minimization, CWE-200 Information Exposure.

### [LOW] Docker Compose defaults are safe only for local development

**ID:** SEC-013  
**Severity:** Low  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** Infrastructure / Database  
**Affected Files:**
- `docker-compose.yml`

**Summary:**  
The local Compose file exposes Postgres on port 5432 with `POSTGRES_PASSWORD=postgres`.

**Evidence:**  
`docker-compose.yml` maps `5432:5432` and sets `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, and database `global_health`.

**Why This Is Dangerous:**  
This is acceptable for local development but dangerous if copied into staging/production or run on a shared host with exposed ports.

**Possible Exploit Scenario:**  
A developer or operator deploys the Compose file to a VM reachable from the internet. Attackers connect to Postgres with the default password.

**Recommended Fix:**  
Add a prominent comment that this file is local-only. For shared/staging Compose, use env-substituted secrets, no public port mapping by default, network restrictions, and backups/restore tests.

**Suggested Regression Test:**  
Static CI check or review rule that production compose/deployment files do not include `POSTGRES_PASSWORD=postgres` or public database port bindings.

**References:**  
OWASP ASVS 14 Configuration, CWE-521 Weak Password Requirements.

## 8. Informational / Cleanup Findings

### [INFORMATIONAL] Repository does not match the supplied Django/React Nashaa Sports architecture description

**ID:** SEC-014  
**Severity:** Informational  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** Architecture / Documentation  
**Affected Files:**
- `backend/package.json`
- `frontend/package.json`
- `backend/src/app.ts`
- `backend/prisma/schema.prisma`

**Summary:**  
The pasted agent instructions describe a Django/DRF plus Vite/RTK Query sports academy platform, but this repository is a Fastify/Prisma plus Next.js health platform.

**Evidence:**  
No Django `manage.py` or DRF backend is present in the workspace. The backend package uses Fastify, Prisma, and TypeScript. The frontend package uses Next.js App Router, not Vite/RTK Query.

**Why This Is Dangerous:**  
Wrong project instructions can lead agents/developers to apply the wrong conventions, miss real security boundaries, or create incompatible patches.

**Possible Exploit Scenario:**  
An agent follows the stale Django guidance and assumes DRF serializers/permissions exist, then misses Fastify route-specific authorization gaps.

**Recommended Fix:**  
Replace or scope the global instructions for this repository. Add a repository-local `AGENTS.md` that accurately describes the Global Health architecture, auth helpers, route conventions, and security requirements.

**Suggested Regression Test:**  
Documentation review gate: ensure architecture docs mention Fastify/Prisma/Next.js and the critical helpers (`verifyAdminAccess`, `verifyDoctorAccess`, `guardMedicalRead`).

**References:**  
NIST SSDF PO.1, CISA Secure by Design documentation practices.

### [INFORMATIONAL] CI lacks dedicated security scanners

**ID:** SEC-015  
**Severity:** Informational  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** CI / Supply Chain / Secrets  
**Affected Files:**
- `.github/workflows/ci.yml`

**Summary:**  
CI runs install, typecheck, lint, backend tests, frontend tests, and standalone lockfile checks. No dependency audit, secret scanning, SAST, IaC/container scan, or CodeQL job was found.

**Evidence:**  
`.github/workflows/ci.yml` contains `check`, `test-backend`, `test-frontend`, and `standalone-lockfiles` jobs. It does not run `pnpm audit`, `gitleaks`, `semgrep`, `codeql`, `trivy`, or similar tools.

**Why This Is Dangerous:**  
Known vulnerable dependencies and hardcoded credentials can enter main even when normal tests pass.

**Possible Exploit Scenario:**  
A future PR commits another smoke-test password or vulnerable package update. CI passes because it only checks code correctness, not security signals.

**Recommended Fix:**  
Add CI jobs for `pnpm audit --prod`, `gitleaks detect`, CodeQL or Semgrep, and container/IaC scanning. Start with non-blocking reporting if needed, then block critical/high once the backlog is triaged.

**Suggested Regression Test:**  
Commit a known fake secret pattern in a test branch and verify secret scanning blocks the PR.

**References:**  
OWASP SCVS, NIST SSDF RV.1/RV.2, CISA Secure by Design.

### [INFORMATIONAL] Verification tooling state blocked local typecheck/test execution

**ID:** SEC-016  
**Severity:** Informational  
**Confidence:** High  
**Exploitability:** Hard  
**Affected Area:** Build / Developer Experience  
**Affected Files:**
- `pnpm-workspace.yaml`
- `package.json`
- `backend/package.json`
- `frontend/package.json`

**Summary:**  
Local `pnpm --filter backend typecheck` and `pnpm --filter frontend typecheck` did not run because pnpm attempted to recreate `node_modules`, then dependency installation completed with nonzero status due ignored build scripts awaiting `pnpm approve-builds`.

**Evidence:**  
Initial typecheck attempts failed with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. With `CI=true`, pnpm attempted registry access under sandbox and timed out. An approved `pnpm install --frozen-lockfile` mostly completed but exited with `ERR_PNPM_IGNORED_BUILDS` for packages including Prisma, esbuild, sharp, and unrs-resolver. Workspace `node_modules` had `.pnpm` but no `.bin` shims available for direct `tsc`.

**Why This Is Dangerous:**  
Developers and agents cannot reliably verify fixes locally. Security changes that cannot be typechecked or tested are more likely to regress.

**Possible Exploit Scenario:**  
A critical auth fix is patched but not locally verified because the workspace install state is unclear; the fix later fails CI or misses a type error.

**Recommended Fix:**  
Decide and commit the intended pnpm build-script approval policy. Run a clean local install and verify `pnpm typecheck`, `pnpm lint`, and tests. Document setup steps in `README` or `CONTRIBUTING`.

**Suggested Regression Test:**  
Fresh clone CI-like smoke: `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm --filter backend test` should pass without interactive prompts.

**References:**  
NIST SSDF PW.8, OWASP SCVS Build and Deployment.

## 9. Vibe-Coded App Specific Risks

Observed vibe-coded failure patterns:
- Controls that look complete but are configuration-disabled: medical access guard logs denials but does not block by default.
- Dev/test code paths near production flows: fake billing, `dev-activate`, manual test accounts, and seed/smoke scripts.
- Security comments that correctly identify danger but do not enforce fail-closed behavior, especially billing and medical access comments.
- Duplicated or scattered route-level controls: many routes individually decide auth, role, validation, and rate limits instead of inheriting safe defaults.
- Rich UI/content features relying on a long trust chain: sanitizer settings, CSS scoping, Next rendering, and CSP must all remain correct.
- Project instruction drift: repository code does not match the provided backend/frontend architecture guidance.

## 10. Dependency and Supply Chain Review

Packages are pinned through pnpm lockfiles and the repo includes standalone backend/frontend lockfiles. CI checks lockfile drift, which is positive.

`pnpm audit --prod` found:
- 30 total vulnerabilities.
- 1 critical: `sanitize-html@2.17.3`.
- 9 high: multiple `next@16.2.4` advisories and other transitive advisories.
- 16 moderate.
- 4 low.

Recommended actions:
- Upgrade `next` to at least `16.2.6` or current patched release.
- Track the `sanitize-html` advisory and patch or replace the sanitizer. Add explicit tests for raw-text tags.
- Add `pnpm audit --prod` to CI.
- Add CodeQL or Semgrep for route/auth/file-upload patterns.
- Add gitleaks/trufflehog for committed secret detection.
- Add container scanning for frontend Docker image and any backend deployment image/buildpack output.

## 11. Secrets and Environment Review

Findings:
- Local `backend/.env` and `frontend/.env.local` exist and are ignored by Git. Values were not printed in this report.
- `.gitignore` rules ignore backend/frontend env files.
- `backend/.env.example` mostly contains placeholders, but includes real-looking service endpoints and comments. Secrets themselves are blank or placeholder values.
- `frontend/.env.example` exposes only public URLs and cookie name examples.
- Tracked manual test docs/scripts contain production-looking shared credentials. See SEC-002.
- `env.ts` has good production hard-fails for the default JWT secret and one exposed seed email, but it does not hard-fail on medical enforcement off, PHI encryption missing, fake billing selected, or subscriptions enabled without Stripe.

Secret classification:
- Confirmed secret needing rotation: `GHAd...qL9!` shared password in manual test files.
- Needs manual verification/rotation: `admin@globalhealthonline.com`, `doctor@globalhealthonline.com`, `patient@globalhealthonline.com` if present in any live environment.
- False positives/placeholders: empty `.env.example` keys and `Bearer YOUR_WASENDER_TOKEN`.

## 12. Privacy and Compliance Review

The application handles health data, identity documents, insurance documents, payment records, appointments, chat messages, and audit/security logs. The risk posture is not acceptable for production PHI until medical access enforcement is fail-closed.

Privacy gaps:
- PHI access denials can be log-only by default.
- Application-layer encryption for government ID fields is optional and plaintext is the documented behavior when `PHI_ENCRYPTION_KEY` is unset.
- Blind indexes are optional when `BLIND_INDEX_KEY` is unset, affecting duplicate detection and privacy-preserving lookup.
- Patient upload object keys include email addresses.
- Retention/deletion exists through data deletion routes/models, but backup retention, restore testing, log redaction, and third-party processor documentation were not fully verified in code.

Compliance note: This is not legal advice. For a health platform, production launch should require a formal privacy impact assessment, data processing agreements for Stripe/email/WhatsApp/storage/hosting providers, incident response plan, backup/restore test evidence, and documented medical data retention/deletion policies.

## 13. Missing Security Tests

| Area | Missing Test | Why It Matters | Suggested Test Type |
| ---- | ------------ | -------------- | ------------------- |
| Medical access | Doctor without 2FA/confidentiality/consent receives 403 for profile/docs | Prevents PHI leak from shadow mode | Backend integration |
| Medical access | Production startup fails when `MEDICAL_ACCESS_ENFORCE` is false | Prevents config drift | Unit/config |
| Secrets | Secret scanner catches committed passwords and globalhealthonline test creds | Prevents credential leaks | CI/security |
| Patient upload | Expired/revoked/used upload token cannot fetch or upload | Prevents long-lived bearer link abuse | Backend integration |
| File upload | Mislabelled HTML/SVG/polyglot as PDF/image is rejected | Prevents unsafe file ingestion | Backend integration |
| Payments | Fake billing/dev activation is unavailable in production | Prevents free subscription activation | Config/integration |
| Payments | Unauthenticated `/api/payments/sync-order` returns 401/403 | Prevents public state-changing reconciliation | Backend integration |
| Rate limiting | Protected mutation/search/upload routes return 429 after limits | Prevents automation abuse | API integration |
| Sessions | Logout/password reset revokes old JWT/session | Prevents stolen-cookie replay | Backend integration |
| Rich HTML | Sanitizers block `xmp`, raw-text, event handlers, data/script URLs | Prevents stored XSS regressions | Unit |
| Dependency audit | CI fails on high/critical advisories | Prevents known vulnerable releases | CI |
| Admin actions | Sensitive admin actions require MFA/fresh auth and audit log | Prevents stale-session privilege abuse | Backend integration |

## 14. Recommended Fix Roadmap

### Immediate: Fix Before Production

- Set medical access enforcement to fail closed and add denied-access 403 tests.
- Remove and rotate all committed shared credentials.
- Patch or replace vulnerable dependencies from `pnpm audit --prod`.
- Disable fake billing and dev subscription activation in production.
- Shorten/rework patient upload tokens with revocation and single-use controls.
- Add MIME sniffing and malware/quarantine controls to sensitive upload routes.

### Next 7 Days

- Add global/default rate limiting with route-specific overrides.
- Add server-side session revocation and fresh-auth checks for high-risk actions.
- Add security scanners to CI: dependency audit, gitleaks, CodeQL/Semgrep.
- Add startup configuration assertions for Stripe, PHI encryption, blind indexes, medical enforcement, CORS, and storage.
- Add tests around payment sync ownership and patient upload token lifecycle.

### Next 30 Days

- Harden rich HTML rendering with stricter sanitizer rules, Shadow DOM/iframe isolation, and nonce-based CSP.
- Complete privacy controls: encryption key management, blind-index backfill, retention schedules, deletion verification, log redaction review.
- Review all admin and doctor routes for fresh-auth/MFA requirements and audit logs.
- Add object storage lifecycle policies, malware scanning, private bucket policy verification, and backup/restore evidence.

### Later Hardening

- Add SAST custom rules for route handlers missing auth/role/rate limits.
- Add e2e tests for patient, doctor, and admin critical flows.
- Introduce centralized route registration wrappers for auth/role/rate/schema defaults.
- Add runtime monitoring/alerts for denied medical access, failed logins, upload anomalies, payment sync abuse, and admin exports.

## 15. Suggested Security Tooling

- `pnpm audit --prod` or `audit-ci` for dependency advisories.
- `gitleaks detect --source .` or `trufflehog filesystem .` for secrets.
- CodeQL for JavaScript/TypeScript.
- Semgrep with rules for Fastify route auth, file upload, SSRF, XSS, and dangerous HTML rendering.
- `osv-scanner` for lockfile advisory coverage.
- `trivy fs .` and Docker image scanning for container/buildpack risks.
- Playwright e2e tests for login, admin, doctor PHI access, upload, checkout, webhook-success, and account deletion flows.
- Centralized structured logging plus alerting for auth failures, medical-denied decisions, admin mutations, and payment anomalies.

## 16. Appendix

### Files Reviewed

- `package.json`
- `pnpm-workspace.yaml`
- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/proxy.ts`
- `frontend/app/api/**/route.ts`
- `frontend/app/**/page.tsx`
- `frontend/lib/server/proxy-forward.ts`
- `frontend/lib/content/sanitize-page-body.ts`
- `frontend/lib/content/scope-blog-html.ts`
- `frontend/components/sections/RichBodySection.tsx`
- `frontend/components/sections/ServiceLinkedBody.tsx`
- `backend/package.json`
- `backend/.env.example`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/utils/auth-session.ts`
- `backend/src/utils/require-auth.ts`
- `backend/src/utils/admin-auth.ts`
- `backend/src/utils/admin-access-evaluator.ts`
- `backend/src/utils/doctor-auth.ts`
- `backend/src/utils/request-auth.ts`
- `backend/src/utils/manage-subscriptions-auth.ts`
- `backend/src/lib/medical-access-guard.ts`
- `backend/src/utils/guard-medical-read.ts`
- `backend/src/lib/crypto/phi-crypto.ts`
- `backend/src/services/object-storage.ts`
- `backend/src/routes/*.route.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/billing/*.ts`
- `backend/src/modules/subscriptions/subscription.service.ts`
- `backend/src/modules/orders/complete-order-payment.service.ts`
- `backend/src/modules/patient-upload/patient-upload-link.service.ts`
- `backend/prisma/schema.prisma`
- `docs/manual-tests/*.md`
- `docs/manual-tests/*.ps1`
- `backend/scripts/*`

### Commands Run

| Command | Result |
|---|---|
| `Get-Content` on attached pasted request | Read audit requirements |
| `Test-Path SECURITY_AUDIT.md` | File did not exist |
| `git ls-files ...` | Inventory of backend/frontend/docs/config files |
| `Select-String` across auth, medical access, payments, uploads, sanitizers, env, docs | Found evidence for findings |
| Backend route parser over `backend/src/routes/*.route.ts` | Produced endpoint inventory from Fastify route registrations |
| `git ls-files frontend/app` | Produced frontend page/API route inventory |
| `Get-Content backend/package.json`, `frontend/package.json`, `package.json` | Confirmed stack/scripts/dependencies |
| `Get-Content .github/workflows/ci.yml` | Confirmed CI jobs and missing security scanners |
| `Get-Content docker-compose.yml`, `frontend/Dockerfile` | Reviewed local DB and frontend container config |
| `pnpm --filter backend typecheck` | Failed before typecheck: pnpm non-TTY modules-dir guard |
| `pnpm --filter frontend typecheck` | Failed before typecheck: pnpm non-TTY modules-dir guard |
| `CI=true pnpm --filter backend/frontend typecheck` | Timed out while pnpm attempted dependency install under restricted network |
| `pnpm install --frozen-lockfile` with network approval | Mostly installed/generated Prisma, but exited nonzero due `ERR_PNPM_IGNORED_BUILDS` |
| Direct local `tsc` binary attempt | Not runnable; workspace `.bin` shims unavailable after incomplete install state |
| `pnpm audit --prod` with network approval | Found 30 advisories: 1 critical, 9 high, 16 moderate, 4 low |
| `git status --short`, `git diff` | Checked working tree and removed generated `allowBuilds` content side effect |

### Commands Not Run

| Command | Reason |
|---|---|
| `pnpm typecheck`, `pnpm lint`, `pnpm test` to completion | Blocked by pnpm install/build-script approval state and missing `.bin` shims |
| `gitleaks`, `trufflehog`, `semgrep`, `codeql`, `trivy`, `osv-scanner` | Tools not installed/configured locally; installing new scanners was outside safe local audit scope |
| Live payment/webhook/email/WhatsApp tests | Would contact third-party services or require controlled staging |
| DoS/brute-force testing | Explicitly unsafe and outside requested safe local audit |

### Assumptions

- Local `.env` files were treated as sensitive and not printed.
- The audit is source-level and local-only; no live infrastructure, production database, or third-party service was attacked.
- Route inventory is grouped for readability; the raw endpoint list was generated from Fastify route registrations during the audit.
- Existing modified frontend files in the working tree were treated as user changes and were not reverted.

### Open Questions

- Are `admin@globalhealthonline.com`, `doctor@globalhealthonline.com`, or `patient@globalhealthonline.com` present in production or staging?
- Is `MEDICAL_ACCESS_ENFORCE=true` currently set in production?
- Are `PHI_ENCRYPTION_KEY` and `BLIND_INDEX_KEY` set and backfilled in production?
- Are subscriptions enabled in production, and if so is `BILLING_DRIVER=stripe` with real Stripe webhook secrets?
- What object storage bucket policies, lifecycle policies, backups, malware scanning, and access logs are configured outside the repo?
- What is the formal data retention/deletion policy for PHI, ID documents, audit logs, and backups?

## Final Production Readiness Verdict

Not production-ready.

The application has meaningful security foundations, but the current critical risks are incompatible with a live health platform. A medical access guard that records denials without enforcing them by default is a direct patient-data exposure risk. The tracked shared credentials compound that risk because they may give immediate access to patient, doctor, or admin sessions if the accounts exist anywhere live.

Payment/subscription handling also needs production fail-closed behavior. A health platform can keep fake billing for local tests, but production must refuse to boot or expose subscription flows unless real Stripe configuration and webhook verification are complete.

File upload and rich HTML handling are close to the areas attackers commonly abuse. The code has good examples, such as admin media byte sniffing and public media key blocking, but those controls must be applied consistently to clinical uploads and sanitizer-dependent rendering.

After Critical and High issues are fixed and covered by regression tests, the app can move toward a staging security validation pass. Before production with real PHI, add dependency/secret scanning to CI, complete privacy/encryption/backfill checks, and run controlled staging tests for auth, PHI authorization, uploads, payments, and admin workflows.
