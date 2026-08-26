# Full Repository Security Audit — 2026-08-26

**Repository:** Global Health Website  
**Branch / commit reviewed:** `Dev-hassaan` / `73eba810b5b36a2d9bd74a150a5a864dc5b4ce12`  
**Audit type:** Defensive source, configuration, history, dependency, and test review  
**Reviewer posture:** Senior application security / penetration-testing review; no destructive testing and no production interaction  
**Distribution:** Restricted — the report names locations of ignored secret files, although it contains no secret values  
**Remediation status:** Findings 1, 2, 6, 8, and 9 remediated in the working tree. The retired Make.com runtime integration for Finding 7 was removed. The confirmed-clean Semgrep/custom-authz/Trivy gates in Finding 11 are now blocking; the authorization E2E gate remains advisory until an isolated-stack run is green.

## Remediation Update — 2026-08-26

| Finding | Status | Remediation |
|---|---|---|
| 1 | Remediated | Public invoice JSON/PDF reads require a purpose-bound RS256 capability tied to a revocable per-invoice nonce. Raw IDs alone return 404; authenticated account/admin reads remain separately authorized. |
| 2 | Remediated | Direct `userId` ownership remains available to unverified users, but the guest-order email fallback is enabled only after `emailVerifiedAt`. |
| 6 | Remediated | Self-service password changes atomically increment `tokenVersion`, revoke trusted devices, and clear the initiating session cookies. |
| 7 | Runtime retired; external confirmation required | Make.com invoice dispatch and its PHI/billing payload were removed. The historical Make webhook and any deployment variable must still be deleted/revoked in the provider consoles; repository inspection cannot prove that external action. |
| 8 | Remediated | Authenticated responses are bound to `PatientProfile.userId`; the owner + `PENDING` transition is conditional and transactional. Emailed token responses retain their existing capability authorization. |
| 9 | Remediated | Public pay links now carry purpose-bound RS256 capabilities tied to revocable per-order nonces. The old unauthenticated raw-order-ID resolver returns 404; authenticated account payment access is separately ownership-scoped. |
| 11 | Partially complete by design | Semgrep, custom authorization Semgrep, and both Trivy gates are blocking. Authorization E2E remains advisory because Docker/Postgres were unavailable for the required isolated-stack green run. |

The remediation did not change doctor/admin patient-profile routes, `guardMedicalRead`, medical-folder policy, or the findings concerning those PHI paths. New focused regression tests and three custom Semgrep rules cover the remediated patterns.

## Risk Summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 7 |
| Medium | 4 |
| Low | 1 |
| Informational | 0 |

The current tree has strong baseline controls: RS256 session signing, database-backed session revocation checks, bcrypt password hashing, hashed and atomically consumed reset/verification tokens, strict production configuration assertions, exact CORS allowlisting, cookie-origin CSRF protection, Helmet, response-cache controls for portal APIs, server-side Zod validation, parameterized Prisma SQL, upload limits and MIME inspection in the reviewed upload paths, Stripe webhook verification/idempotency, PHI encryption/blind indexes, a medical-access guard, audit models, gitleaks/SCA/SAST/container jobs, and authorization integration tests.

Those controls do not neutralize the findings below. Six High-severity defects are confirmed in current application code and one is confirmed plaintext live-looking secret exposure in the local repository workspace. A separate Medium item is an exposed historical credential whose provider-side rotation cannot be proved from source. The most urgent themes are billing-record access, PHI authorization consistency, server-side URL fetching, and credential containment.

## Prioritized Remediation

### P0 — Fix immediately

1. Tokenize and retire the unauthenticated raw-ID invoice routes (Finding 1).
2. Block unverified users from the invoice email fallback (Finding 2).
3. Apply country/PHI authorization to the four local-admin patient subroutes (Finding 3).
4. Apply the medical-access guard to doctor alert-history reads (Finding 4).
5. Remove the doctor-controlled Memed fetch or strictly bind it to a server-verified Memed resource (Finding 5).
6. Remove plaintext live-looking provider credentials and the auth private key from developer repository-local env files; rotate them if the host/workspace has ever been exposed (Finding 12).

### P1 — Fix before production handling of sensitive records

1. Revoke all existing sessions on self-service password change (Finding 6).
2. Bind medical-access-request responses to the authenticated patient (Finding 8).
3. Replace raw order IDs in public pay links with explicit random/signed capabilities (Finding 9).
4. Remove and rotate committed shared portal credentials (Finding 10).
5. Confirm and, if necessary, rotate the historical Make.com webhook credential (Finding 7).

### P2 — Fix soon

1. Make confirmed-clean SAST/authz/container gates blocking, then make the E2E authorization gate blocking after a green isolated-stack run (Finding 11).
2. Add the regression tests listed under every finding and extend the custom authorization rules to cover the newly found patterns.

## Architecture and Attack Surface

| Area | Implementation |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, route handlers acting as a backend proxy |
| Backend | Node.js / Fastify 5; 152 autoloaded `*.route.ts` modules; Zod request validation |
| API | REST-style JSON and file endpoints under `/api`; public, account, doctor, admin, corporate, partner, webhook, and internal scheduler surfaces |
| Database | PostgreSQL with Prisma 7 and `@prisma/adapter-pg` |
| Authentication | HttpOnly RS256 JWT cookie; DB `tokenVersion`, active/deletion checks; bcrypt passwords; email verification/reset; TOTP/trusted devices |
| Authorization | Patient ownership, doctor relationship checks, `verifyAdminAccess`, global/local admin scope, corporate scope, and central `guardMedicalRead` controls |
| Sensitive data | Patient profiles, appointments, medical notes/documents, prescriptions, identity/nationality documents, invoices/payments, consultation chat, lab results |
| Storage | S3-compatible object storage for uploads, generated documents, invoice mirrors, and sensitive files |
| Payments | Stripe checkout/webhooks, InvoiceExpress, invoices/credits/refunds/subscriptions/memberships/corporate benefits |
| Messaging | SendGrid/Gmail/SMTP, WhatsApp/WaSender, notifications and scheduled reminders |
| External services | Memed, Google Meet/Calendar/SEO, WebLIMS, SÚKL test integration, Trustpilot, Rekognition, Make.com |
| Jobs | In-process scheduler and authenticated `/api/internal/*` job endpoints |
| Deployment | Railway, Docker/Nixpacks, GitHub Actions, three independently deployed lockfiles |

### Principal trust boundaries

```text
Browser / unauthenticated caller
  -> Next route handler or direct Fastify endpoint
  -> Zod validation
  -> cookie/token authentication
  -> role, tenant, ownership, and medical-access authorization
  -> Prisma / S3 / Stripe / third-party provider
```

The audit treated every browser value as attacker-controlled, including hidden IDs, role-dependent UI fields, uploaded filenames/MIME types, redirect/payment identifiers, and URLs returned by third-party widgets.

## Findings

## Finding 1 — Public invoice routes expose patient billing PII behind ordinary CUIDs

**Severity:** High  
**Confidence:** Confirmed  
**Category:** BOLA / IDOR / Sensitive data exposure  
**OWASP:** A01 Broken Access Control; API1 Broken Object Level Authorization  
**CWE:** CWE-639, CWE-200  
**Affected files:** `backend/src/routes/public-invoices.route.ts:9-134`; `backend/src/modules/invoices/invoice-detail.service.ts:33-106`; `backend/prisma/schema.prisma:5109-5113`  
**Affected endpoints:** `GET /api/public/invoices/:invoiceId`; `GET /api/public/invoices/:invoiceId/pdf`

### Problem

Both endpoints are intentionally unauthenticated and use `Invoice.id` as the sole access key. The route itself records that the Prisma `cuid()` is not a capability token and is walkable. The JSON serializer returns the patient's name, email, phone, decrypted taxpayer ID, order/payment state, totals, items, consultation date, and doctor details. The PDF contains the same billing document.

### Attack Path

An unauthenticated caller obtains or derives an invoice ID and calls either public endpoint. There is no session, patient ownership check, or independent high-entropy capability. Rate limiting (60 JSON or 20 PDF requests per ten minutes per limiter key) raises cost but is not authorization.

### Security Impact

Unauthorized disclosure of patient identity, contact information, tax identifiers, payment information, and healthcare billing context.

### Evidence

```ts
// public-invoices.route.ts
const payload = await buildInvoiceDetailPayload(params.data.invoiceId);
const { patientProfileId: _omit, ...body } = payload;
return okResponse(body);
```

```prisma
model Invoice {
  id String @id @default(cuid())
}
```

### Recommended Fix

Add a separate cryptographically random `publicToken` (store only a hash) or a short-lived signed capability with audience/purpose/expiry. Authorize public reads only through that capability, rotate/revoke it when a document is reissued, and retire raw `:invoiceId` access after a controlled compatibility window. Avoid placing direct PII in the JSON response if the printable page does not require it.

### Regression Tests

- Raw invoice IDs without a valid public capability return 404.
- Tokens are document-specific, expire/revoke correctly, and cannot cross invoice IDs.
- JSON and PDF routes enforce the identical token policy.

## Finding 2 — Unverified registrations can read invoices belonging to an unclaimed email address

**Severity:** High  
**Confidence:** Confirmed  
**Category:** Authentication / BOLA / Account-record takeover  
**OWASP:** A01 Broken Access Control; A07 Identification and Authentication Failures  
**CWE:** CWE-639, CWE-862  
**Affected files:** `backend/src/routes/auth.route.ts:131-175`; `backend/src/routes/account-invoices.route.ts:65-114,202-223`  
**Affected endpoints:** `POST /api/auth/register`; `GET /api/account/invoices`; `GET /api/account/invoices/:invoiceId/pdf`

### Problem

Registration deliberately mints a logged-in session before email verification, while correctly deferring guest-order claiming until verification. The invoice routes undo that protection: they authorize by `order.userId == caller.id OR order.email == caller.email` without requiring `emailVerifiedAt` for the email fallback.

### Attack Path

An attacker registers an address that belongs to a patient but does not yet have an account, chooses their own password, receives an authenticated cookie, and immediately requests the invoice list or a matching Portuguese mirrored invoice PDF. The attacker never proves mailbox control.

### Security Impact

Disclosure of another patient's invoice references, services, payment status, amounts, order history, and stored invoice PDF.

### Evidence

```ts
OR: [
  { userId: authUser.id },
  { email: { equals: authUser.email, mode: "insensitive" } },
]
```

### Recommended Fix

Prefer ownership by `order.userId` only and rely on the existing post-verification guest-order claim. If the email fallback must remain for compatibility, include it only when the current database user has `emailVerifiedAt != null`. Apply the same rule to list and PDF routes.

### Regression Tests

- A newly registered, unverified user cannot list or download guest invoices matching the supplied email.
- After verification and the atomic guest-order claim, the same user can access those invoices.
- A different verified user cannot access them.

## Finding 3 — Local admins can cross market boundaries on sensitive patient subroutes

**Severity:** High  
**Confidence:** Confirmed  
**Category:** Vertical/horizontal privilege escalation / Missing PHI authorization  
**OWASP:** A01 Broken Access Control  
**CWE:** CWE-285, CWE-639, CWE-862  
**Affected files:** `backend/src/routes/admin-patient-profile.route.ts:107-113,685-754,802-850,954-1011,1020-1035`; `backend/src/utils/admin-auth.ts:63-67`  
**Affected endpoints:**

- `PATCH /api/admin/patients/:email/verification/:kind`
- `PATCH /api/admin/patients/:email/nationality/:slot/verification`
- `GET /api/admin/patients/:email/payments`
- `GET /api/admin/patients/:email/alert-log`

### Problem

The plugin-level gate is `verifyAdminAccess`, which permits `LOCAL_ADMIN`. These four handlers select a patient globally by email and read or mutate sensitive state without `guardMedicalRead`, a country-folder check, or a global-admin requirement. Neighboring patient profile/document/alert-removal handlers do call the medical-access guard.

### Attack Path

A country-scoped local administrator calls the endpoints directly with an out-of-market patient's email. Frontend navigation restrictions are irrelevant because the backend plugin accepts the role and the handlers do not scope the patient.

### Security Impact

Cross-market disclosure of payment and patient-alert history plus unauthorized modification of identity, email, phone, insurance, and nationality verification states.

### Recommended Fix

For operations that must be global, require `verifyGlobalAdminAccess`. Otherwise resolve the patient profile and enforce the same country/medical-folder policy used by neighboring guarded handlers. Treat mutations as medical/sensitive writes and record mandatory, fail-closed audit events.

### Regression Tests

- A local admin can read/update an in-scope patient only.
- The same actor receives 403 for another country's patient across all four handlers.
- Global admin behavior remains intentional and audited.

## Finding 4 — Doctor alert-history reads bypass the central medical-access guard

**Severity:** High  
**Confidence:** Confirmed  
**Category:** PHI authorization bypass  
**OWASP:** A01 Broken Access Control  
**CWE:** CWE-285, CWE-862  
**Affected file:** `backend/src/routes/doctor-patient-profile.route.ts:570-604`  
**Affected endpoint:** `GET /api/doctor/patients/:email/alert-log`

### Problem

The route verifies the caller is a doctor and checks for any appointment row matching doctor plus patient email, but it never calls `guardMedicalRead`. It does not filter appointment status, so a canceled or otherwise stale relationship can satisfy the check. The adjacent alert-removal route applies the central guard.

### Attack Path

A doctor with any historical appointment for the email directly calls the alert-log endpoint. Confidentiality-agreement, consent/grant, doctor-of-record, folder, enforcement-mode, and medical-access logging checks are bypassed.

### Security Impact

Unauthorized PHI access and missing regulated access evidence for patient chart-alert history.

### Recommended Fix

Resolve the patient/related appointment and call `guardMedicalRead` before the service read, using the same resource/action taxonomy as the neighboring profile and alert-write handlers. Align relationship status rules with the central guard rather than maintaining a weaker precheck.

### Regression Tests

- Doctors without a current permitted relationship receive 403.
- Canceled/historical appointments do not independently grant access.
- Allowed reads create the expected `MedicalAccessLog`; denied reads are enforced when `MEDICAL_ACCESS_ENFORCE=true`.

## Finding 5 — Doctor-controlled Memed URL creates a server-side request forgery and stored arbitrary-file primitive

**Severity:** High  
**Confidence:** Confirmed  
**Category:** SSRF / Unsafe remote file ingestion  
**OWASP:** A10 Server-Side Request Forgery  
**CWE:** CWE-918, CWE-400  
**Affected files:** `backend/src/routes/doctor-generated-documents.route.ts:31-40,526-542`; `backend/src/modules/generated-documents/generated-documents.service.ts:1087-1132`; readback at `backend/src/routes/doctor-generated-documents.route.ts:399-435`  
**Affected endpoint:** `POST /api/doctor/appointments/:id/memed/document`

### Problem

The request schema accepts any syntactically valid URL. The service calls `fetch(input.memedUrl)`, buffers the entire response without a byte limit or PDF validation, stores it in S3 as `application/pdf`, and creates a generated-document row. The doctor can retrieve the bytes later from the generated-document PDF endpoint.

### Attack Path

An authenticated doctor supplies an HTTP(S) URL for an internal service, loopback address, private network host, or cloud metadata endpoint. The backend performs the request from its trusted network position and persists the response for doctor-controlled readback. Redirects are followed by default.

### Security Impact

Internal service discovery/data exfiltration, cloud credential exposure where metadata is reachable, access to private administrative endpoints, and memory/storage exhaustion from oversized responses.

### Evidence

```ts
const memedDocumentSchema = z.object({
  memedUrl: z.string().url(),
});

const res = await fetch(input.memedUrl, {
  signal: AbortSignal.timeout(20_000),
});
const pdfBuffer = Buffer.from(await res.arrayBuffer());
await putObject(storageKey, pdfBuffer, "application/pdf");
```

### Recommended Fix

Do not trust a widget-returned download URL. Prefer a server-to-server Memed API call keyed by a validated `memedDocumentId`. If a URL is unavoidable: allowlist exact HTTPS origins/paths, reject credentials and nonstandard ports, resolve DNS and reject loopback/private/link-local/reserved IPs for every connection, disable or revalidate redirects, cap streamed bytes before buffering, verify `Content-Type` and PDF magic bytes, and rate-limit this endpoint tightly.

### Regression Tests

- HTTP, loopback, private, link-local, alternate-port, credentialed, DNS-rebinding, and redirect-to-private URLs are rejected.
- Non-Memed hosts and non-PDF/oversized responses are rejected before storage.
- A valid allowlisted Memed PDF still succeeds.

## Finding 6 — Self-service password changes leave all previously issued sessions valid

**Severity:** High  
**Confidence:** Confirmed  
**Category:** Session management  
**OWASP:** A07 Identification and Authentication Failures  
**CWE:** CWE-613  
**Affected files:** `backend/src/modules/auth/auth.service.ts:333-374`; enforcement path `backend/src/utils/require-auth.ts:36-59`  
**Affected function:** `changeUserPassword`

### Problem

The function replaces `passwordHash` and revokes trusted-device records, but does not increment `User.tokenVersion`. Every stolen cookie whose signed token version still matches the database remains accepted until JWT expiry or a separate sign-out-all operation. Reset-token password changes and `signOutAllDevices` already increment the version, demonstrating the intended mechanism.

### Attack Path

An attacker steals a session cookie. The victim detects suspicious behavior and changes their password. The attacker continues using the old cookie because its token version was not revoked.

### Security Impact

Persistent account takeover after the victim performs the expected recovery action.

### Recommended Fix

Atomically update the password hash and increment `tokenVersion`; revoke trusted devices in the same security operation. Clear the current cookie and require reauthentication, or mint exactly one replacement token using the new version if product requirements demand keeping the current device signed in.

### Regression Tests

- A cookie issued before password change receives 401 afterward.
- Trusted devices are revoked.
- A newly issued post-change session works and reset-token behavior remains consistent.

## Finding 7 — Rotation of a historically committed Make.com webhook credential is unconfirmed

**Severity:** Medium (downgrade to closed if provider-side rotation is verified)  
**Confidence:** Medium  
**Classification:** Potential operational vulnerability; current source is remediated  
**Category:** Secret exposure / Third-party data flow  
**OWASP:** A02 Cryptographic Failures  
**CWE:** CWE-798, CWE-312  
**Affected history:** commit `e7dd6aa7`; current implementation `backend/src/modules/invoices/generate-invoice.service.ts`

### Problem

A live-looking Make.com webhook credential was committed historically and remains recoverable from Git history. Current source is correctly environment-only, fail-closed, and host-allowlisted. Source review cannot prove that the provider-side token was rotated.

### Attack Path

If the old token remains active, any current/former collaborator or party with a leaked clone can recover it from history and abuse the integration credential. The historical invoice flow transmitted patient identity, address, tax/VAT, service, payment, and invoice data.

### Security Impact

Unauthorized invocation or interception of a sensitive third-party integration and exposure of patient/billing data.

### Recommended Fix

Verify in Make.com that the exact historical webhook token is revoked. If not, rotate it immediately, update the Railway secret, review Make.com execution history for unexpected invocations, and document the rotation date. Do not reproduce the old value in tickets or reports.

## Finding 8 — A patient can respond to another patient's medical-access request by ID

**Severity:** Medium  
**Confidence:** Confirmed  
**Category:** BOLA / Authorization  
**OWASP:** A01 Broken Access Control; API1 Broken Object Level Authorization  
**CWE:** CWE-639  
**Affected files:** `backend/src/routes/medical-access-requests.route.ts:153-178`; `backend/src/modules/medical-access-requests/medical-access-request.service.ts:221-265`; `backend/prisma/schema.prisma:4665-4683`  
**Affected endpoint:** `POST /api/medical-access-requests/:id/respond`

### Problem

The route proves only that the caller has role `PATIENT`. The service loads and updates the request by `id` alone and never binds `patientProfileId` to the authenticated user. An approval can create a `MedicalAccessGrant` for the request's doctor.

### Attack Path

An authenticated patient obtains another pending request's opaque CUID and submits an approve/deny response. The ID lowers blind-guess probability but is not an ownership check and may leak through links, logs, screenshots, support messages, or browser history.

### Security Impact

Unauthorized approval/denial of another patient's medical-access workflow and possible creation of an access grant to that patient's records.

### Recommended Fix

Resolve the caller's patient profile from the authenticated user and perform an atomic conditional update matching both request ID and `patientProfileId` while status is `PENDING`. Return the same not-found response for missing and foreign requests.

### Regression Tests

- Patient A cannot respond to Patient B's request.
- Only one concurrent response wins.
- An authorized approval creates one grant; denial creates none.

## Finding 9 — Public pay-link resolver treats an order database ID as a payment capability

**Severity:** Medium  
**Confidence:** High  
**Category:** Capability design / Payment-state exposure  
**OWASP:** A01 Broken Access Control; API1 Broken Object Level Authorization  
**CWE:** CWE-639, CWE-200  
**Affected files:** `backend/src/routes/orders.route.ts:1283-1319`; `backend/src/modules/orders/order-payment-url.service.ts:25-45,48-140`; `backend/prisma/schema.prisma:2940-2948`  
**Affected endpoint:** `GET /api/orders/:id/pay-url`

### Problem

The unauthenticated resolver assumes `Order.id` (`cuid()`) is an unguessable capability. It returns precise payment state or a live Stripe Checkout URL and may create a fresh Stripe session. Database identifiers are also used across authenticated APIs, logs, redirects, support flows, and operational tooling, so they should not double as public payment capabilities.

### Attack Path

A caller who guesses or obtains an order ID resolves its payment state and, while payable, retrieves the hosted checkout session tied to the order/patient email.

### Security Impact

Payment-state disclosure, unauthorized access to a patient's hosted checkout flow, and unnecessary Stripe/session creation from a public GET endpoint.

### Recommended Fix

Use a separate cryptographically random, purpose-bound, expiring/revocable pay token (store a hash) or a signed link. Rate-limit the resolver specifically, avoid revealing detailed terminal state to invalid capabilities, and ensure session creation is idempotent and bounded.

### Regression Tests

- Raw order IDs cannot resolve payment URLs.
- A valid pay token is order-specific and expires/revokes.
- Repeated/parallel resolution does not create unbounded Stripe sessions.

## Finding 10 — Shared portal credentials remain committed and active as test defaults

**Severity:** Medium  
**Confidence:** High that credentials are exposed; runtime validity unverified  
**Classification:** Highly likely vulnerability if any shared environment still uses the accounts  
**Category:** Hard-coded credentials  
**OWASP:** A07 Identification and Authentication Failures  
**CWE:** CWE-798, CWE-312  
**Affected files:** `frontend/tests/e2e/portal-responsive-regression.spec.ts:125-130`; `docs/testing/manual-tests/*.ps1`; `docs/testing/manual-tests/test-execution-order.md`; `docs/testing/manual-tests/test-results.md`

### Problem

Admin, doctor, and patient email addresses plus the same reusable password are committed in tests and manual-test documentation. The Playwright file falls back to those values when environment variables are absent, so its `test.skip(!email || !password)` controls do not skip. The credential is also present in Git history. The value is intentionally redacted in this report.

### Attack Path

A repository reader uses the published account/password combination against staging, shared test, or production-like deployments where the accounts were not rotated or removed.

### Security Impact

Administrative, doctor, or patient account compromise, with severity determined by which environments still accept the credentials.

### Recommended Fix

Remove every password literal and require environment-provided credentials. Rotate/delete all affected accounts across every environment, review login/audit history, make E2E fixtures create isolated ephemeral users, and configure secret scanning to catch organization-specific password patterns and credential documentation.

## Finding 11 — Several security scanners and the authorization E2E suite do not block CI failures

**Severity:** Low  
**Confidence:** Confirmed  
**Classification:** Security control weakness  
**Category:** Secure SDLC / Detection failure  
**OWASP:** A09 Security Logging and Monitoring Failures  
**CWE:** CWE-693  
**Affected file:** `.github/workflows/ci.yml:280-390,476-508,531-559,606-648`

### Problem

Generic Semgrep, custom authorization Semgrep, Trivy configuration/image scans, and Playwright authorization E2E retain `continue-on-error: true`. A future confirmed finding can therefore produce a green overall workflow. The file's comments still refer to 138 route files while the current route inventory is 152; the loop glob still scans all route files, but the stale count shows the gate has not been operationally closed out.

### Security Impact

Known-vulnerable changes may merge despite scanner detection, particularly the same missing-guard class found in Findings 3 and 4.

### Recommended Fix

Inspect recent Actions results, resolve legitimate findings/tooling failures, and flip each clean scanner step to blocking. Keep only the E2E job non-blocking until it passes against the isolated CI stack, then enforce it. Add explicit rules/tests for public raw-ID document capabilities, email-fallback ownership, PHI route guarding, and SSRF sinks.

## Finding 12 — Live-looking provider secrets and the auth signing private key are stored in plaintext repo-local env files

**Severity:** High  
**Confidence:** Confirmed presence; exposure beyond this host is unverified  
**Classification:** Local workspace / secret-management vulnerability; files are ignored, not tracked  
**Category:** Secret exposure / Credential management  
**OWASP:** A02 Cryptographic Failures  
**CWE:** CWE-312, CWE-522  
**Affected files:** `backend/.env:9,35-41,51,54,56,101,106`; `backend/.env.dev:12,38-44,54,57,59`; `backend/.env.corp.local:12,38-44,54,57,59`; ignore rules at `.gitignore:34-37`

### Problem

The local repository directory contains a production Railway database URL in `backend/.env` plus live-looking S3 access keys, Stripe secret/webhook keys, Deepgram and OpenAI keys, Google OAuth/SEO secrets, and the RS256 authentication private key in plaintext environment files. `backend/.env.dev` uses a development database and `backend/.env.corp.local` uses local Postgres, but both duplicate multiple live-looking provider/signing secrets. Git ignore rules prevent ordinary commits, but do not protect the values from endpoint compromise, backup/sync tooling, malware, support bundles, accidental attachment, or another process/user with workspace access. The production DB target in `backend/.env` also increases the consequence of any mistaken local command.

No secret values are reproduced in this report.

### Attack Path

An attacker compromises the developer host, an editor/plugin, a backup location, or an inadvertently shared workspace/archive and reads the ignored files. The private signing key can mint backend-accepted sessions; the database URL can permit direct data access according to its role; the webhook secret can enable forged Stripe webhook requests where network reachability exists.

### Security Impact

Potential full database compromise, forged privileged application sessions, payment-webhook forgery, and broad patient/medical/billing data exposure.

### Recommended Fix

Move production secrets out of repository-local files and into an OS-backed credential store or approved secret manager with short-lived access. Use a strictly isolated local/test database and distinct development signing/webhook keys. Rotate the production DB password, Stripe webhook secret, and RS256 keypair if the host, workspace, backups, or attachments have ever been exposed; a signing-key rotation must invalidate existing sessions. Add a preflight guard that refuses local scripts when the DB host is production unless a narrowly scoped, explicit operational workflow is used.

### Verification

- Only synthetic local/test credentials remain in developer env files.
- Production secrets are retrieved just-in-time with audited access.
- Old credentials/keys are revoked and old auth cookies fail verification after rotation.
- Secret scanning covers ignored files in a safe local preflight without uploading their contents.

## Areas Reviewed With No Confirmed Vulnerability

- **SQL injection:** No runtime unsafe raw Prisma calls were found. Runtime raw queries use `Prisma.sql` tagged templates; `$queryRawUnsafe`/`$executeRawUnsafe` matches are test-only constants or test cleanup.
- **NoSQL injection:** No MongoDB/Elasticsearch-style user-controlled query surface was found. Redis is used as a rate-limit store, not as a user-shaped document query engine.
- **Command injection:** LibreOffice conversion uses `execFile` with a fixed argument array, generated temporary paths, and timeouts. No user-controlled shell command construction was found.
- **Path traversal:** Reviewed storage/download routing uses scoped database keys or encoded proxy paths; no confirmed filesystem traversal from a request parameter was found.
- **Stored/reflected XSS:** Public rich HTML is sanitized server-side and commonly re-sanitized before `dangerouslySetInnerHTML`. No reachable script execution bypass was confirmed. The public CSP is enforcing but necessarily permits inline scripts for prerendered Next flight data; portal routes use a nonce/`strict-dynamic` policy.
- **CSRF/CORS/cookies:** Credentialed CORS is exact/fail-closed outside local development. Cookie-authenticated state changes are protected by an Origin allowlist hook. Auth cookies are configured through centralized secure options. No confirmed bypass was found.
- **Stripe webhooks:** Signature verification uses raw request bytes and processed-event/idempotency controls. No confirmed signature, replay, amount-trust, or duplicate-credit defect was found in the reviewed flow.
- **Mass assignment:** Reviewed boundary schemas are strict/allowlisted; no direct `update(req.body)`-style privileged field assignment was found.
- **Cryptography:** Auth sessions are RS256-only in production, passwords use bcrypt cost 12, security tokens use cryptographic random generation and stored hashes, PHI uses authenticated encryption, and production fails closed if core keys are absent.
- **Current tracked secrets:** No current live-looking AWS/GitHub/Stripe/private-key credential was confirmed in application source. `backend/.env.test` contains explicitly test-only fixture key material.
- **Dependencies:** `pnpm audit --audit-level low` reported no known vulnerabilities on 2026-08-26. Root/frontend/backend security overrides are consistent. This is point-in-time evidence, not a guarantee against later advisories or container-layer CVEs.

## Test and Tool Results

| Check | Result |
|---|---|
| `pnpm audit --audit-level low` | Pass — no known vulnerabilities |
| `pnpm exec node scripts/check-override-drift.mjs` | Pass — overrides consistent across all three manifests |
| Frontend typecheck + locale-key check | Pass |
| Backend typecheck | Pass |
| Frontend Vitest | 80 files passed; 4 files failed (1 redirect assertion, 4 timeout failures); 1,020 tests passed, 3 failed, 38 skipped. Failures were not security regressions but mean the full suite is not green. |
| Backend DB/integration tests | Not run: Docker Desktop was unavailable and `backend/.env` targets production. The documented live-DB bypass was not used. Prior 2026-08-02 isolated-Postgres evidence reported 891 passing backend tests, but that historical result is not substituted for a current run. |
| Semgrep/Trivy/OSV/gitleaks local binaries | Not installed on this host; current-source pattern review and CI configuration were inspected. `pnpm audit` was run live. |
| Git history review | Confirmed the historical Make.com exposure commit and committed shared portal credentials without reproducing secret values. |

### Missing security regression coverage

The current suites do not visibly enforce the following cases:

- public invoices require an explicit capability rather than raw database ID;
- unverified accounts cannot use email fallback to read invoices;
- local admins cannot cross country/market scope on every patient subroute;
- every PHI/alert read invokes and records the central medical-access decision;
- self-service password changes invalidate old cookies;
- patients cannot respond to another patient's medical-access request;
- Memed downloads reject non-Memed/private/oversized/non-PDF sources;
- public pay links require a purpose-bound capability.

## Limitations and Required Runtime Validation

This was a source/configuration audit, not an active penetration test. No production accounts, third-party systems, object storage, or production database were touched. The following cannot be proved from this repository and require controlled operational validation:

- Make.com historical credential rotation and execution history;
- Railway environment values, service-to-service network policy, and proxy topology;
- S3 bucket private policy, encryption/KMS, lifecycle, versioning, and access logging;
- Redis availability/topology and effective distributed rate limiting;
- actual CI branch-protection required checks and recent scanner job status;
- deployed CSP/cookie/header behavior on every host/redirect/error response;
- CodeQL licensing/security-tab status for the private repository;
- third-party provider account scopes, webhook dashboards, and credential rotation records.

Any runtime validation must use a staging environment with separate database/object storage and synthetic records. Do not enable `ALLOW_LIVE_DB_TESTS`, run active DAST, or replay real webhooks against production.

## Recommended Fix Order and Verification Gate

Implement findings in small TDD batches, beginning with Findings 1-5. For each batch:

1. Add a failing authorization/security regression test.
2. Apply the smallest server-side fix.
3. Run backend integration tests with `MEDICAL_ACCESS_ENFORCE=true` where relevant.
4. Run frontend/backend typecheck, lint, unit/integration tests, custom Semgrep per file, generic Semgrep, dependency audit, and focused Playwright authorization tests.
5. Review the diff for secrets, PII logging, response overexposure, and migration safety.
6. Deploy to isolated staging, verify safe denial paths, then promote with audit/log monitoring.

No fixes were applied during this audit.
