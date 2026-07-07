# Security Audit

## Executive Summary

This audit reviewed the current `global-health-website` repository. The codebase has improved significantly since earlier audits: the medical-access guard now hard-fails production boot if it is still in shadow mode, patient-upload tokens are short-lived and database-backed, the public media proxy blocks PHI-bearing prefixes, admin Server Actions now re-verify role, and all observed `dangerouslySetInnerHTML` sites are routed through sanitizers.

However, the repo is **not production-ready without immediate dependency upgrades and a few configuration/code fixes.** The most pressing risks are:

1. **Critical dependency vulnerability** in `sanitize-html` 2.17.3 (XSS via `xmp` passthrough).
2. **Multiple High vulnerabilities in Next.js 16.2.4** (DoS, middleware/proxy bypass, SSRF).
3. **File uploads that trust the client MIME type** without magic-byte sniffing (`consultation-chat`, `doctor-photo`).
4. **`requireAdminAction` rejects `SUPER_ADMIN`**, which would silently break the admin surface for super admins.
5. **Two-factor authentication is optional** for doctors and admins handling PHI.
6. **Patient-upload storage keys embed the raw patient email**, leaking PII into object-storage keys and logs.
7. **Frontend Content-Security-Policy lacks `script-src`**, leaving the door open for inline script injection if a sanitizer is ever bypassed.

Overall risk rating: **High** (driven by dependency vulnerabilities and the file-upload MIME trust gap). The platform is structurally sound, but the items above must be fixed before handling real patient data or paid subscriptions.

## Stack Detected

- **Framework:** Next.js 16.2.4 (App Router, standalone output, Turbopack root)
- **Frontend:** React 19.2.4, TypeScript 5, Tailwind CSS v4
- **Backend:** Fastify 5.2.1, TypeScript (strict), ESM via tsx
- **Database:** PostgreSQL 16, Prisma 7.8 with `@prisma/adapter-pg`
- **Auth:** HS256 JWT in HttpOnly cookie (`gh_auth`), bcryptjs hashing, optional TOTP 2FA
- **Payments/Webhooks:** Stripe Checkout + webhooks, multi-account signature verification
- **Deployment:** Railway (backend via Nixpacks, frontend via Dockerfile)
- **Other important tools:** S3-compatible storage, SendGrid/Gmail, WaSender WhatsApp, `sanitize-html`, `zod`, `@fastify/helmet`/`cors`/`rate-limit`/`compress`

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `pnpm audit --audit-level=low` | Multiple vulnerabilities | Critical `sanitize-html`, 4× High `next`, Moderate `hono`/`postcss`/`@hono/node-server`. |
| `pnpm typecheck` | Failed | Backend references `doctorAmountCents` which no longer exists in Prisma `ServiceDoctor`. Frontend `tsc` passed. |
| `pnpm lint` | Failed | Frontend React 19 rule errors (`react-hooks/immutability`, `react-hooks/refs`). Backend lint not reached. |
| `cd frontend && pnpm build` | Succeeded | Standalone build completed. |
| `cd frontend && pnpm build:analyze` | Succeeded, no analyzer output | See performance audit. |

## Repository Areas Reviewed

- `frontend/app/` — layouts, pages, route handlers, server actions
- `frontend/components/` — sections, layout, cards, cart, portal shells, rich-text renderers
- `frontend/lib/` — API wrappers, auth, admin action guards, content sanitizers
- `frontend/proxy.ts` — edge auth/locale middleware
- `backend/src/app.ts` — Fastify plugin configuration
- `backend/src/config/env.ts` — environment schema and production boot guards
- `backend/src/routes/` — auth, account, doctor, admin, payments, media, patient-upload, share-links, brazil-consent, review-invites, cron, consultation-chat, doctor-photo
- `backend/src/utils/` — auth-session, require-auth, admin-auth, doctor-auth, guard-medical-read, sniff-mime
- `backend/src/lib/` — medical-access-guard, internal-scheduler, stripe client
- `backend/src/modules/` — auth, appointments, subscriptions, patient-upload, review-invites
- `backend/prisma/schema.prisma`
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

Skipped: `node_modules/`, `.next/`, `backend/dist/`, `.git/`, lockfile internals, binary DOCX templates.

## Biggest Security Risks

| Rank | Issue | Severity | Category | Files |
|---|---|---|---|---|
| 1 | `sanitize-html` 2.17.3 critical XSS | Critical | dependencies | Both workspaces |
| 2 | Next.js 16.2.4 multiple High vulnerabilities | High | dependencies | `frontend/package.json` |
| 3 | File uploads trust client MIME type | High | file upload / validation | `backend/src/routes/consultation-chat.route.ts`, `backend/src/routes/doctor-photo.route.ts` |
| 4 | `requireAdminAction` rejects `SUPER_ADMIN` | High | authorization | `frontend/lib/admin/require-admin-action.ts` |
| 5 | 2FA optional for privileged roles | High | authentication | `backend/src/config/env.ts`, `backend/src/utils/admin-auth.ts`, `backend/src/utils/doctor-auth.ts` |
| 6 | Patient-upload storage key embeds raw email | Medium | privacy / secrets | `backend/src/routes/patient-upload.route.ts` |
| 7 | Frontend CSP lacks `script-src` | Medium | headers / XSS | `frontend/next.config.ts` |
| 8 | CORS allow-all when no allowlist in non-prod | Medium | CORS | `backend/src/app.ts` |
| 9 | `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` not hard-failed in production | Medium | config / payments | `backend/src/config/env.ts`, `backend/src/modules/subscriptions/subscription.service.ts` |
| 10 | Raw SQL in appointment service is fragile | Medium | injection posture | `backend/src/modules/appointments/appointments.service.ts` |

## Input & Form Security Review

### Forms with server-side Zod validation

Most public and account forms use Zod schemas (`auth.schema.ts`, `booking.schema.ts`, `contact.schema.ts`, etc.) and validate on the backend. This is good.

### Forms with gaps

- **Admin landing-page editor** (`frontend/app/(admin)/admin/countries/[id]/landing-pages/page.tsx:82`) stores `bodyHtml` from `formData` directly. The value is sanitized at render time via `scopeBlogHtml`, so XSS is mitigated, but server-side validation of length/structure would be safer.
- **Manual booking form** now stores the temp password in a short-lived httpOnly cookie instead of the URL — this prior issue is fixed.
- **Chat file upload** accepts `file.mimetype` without magic-byte verification.
- **Doctor photo upload** accepts `file.mimetype` without magic-byte verification.

### Sanitization of rendered HTML

All 10 observed `dangerouslySetInnerHTML` call sites are sanitized:

| File | Sanitizer |
|---|---|
| `frontend/components/templates/DoctorProfileTemplate.tsx` | `sanitizeDoctorBioHtml` |
| `frontend/components/seo/JsonLd.tsx` | `ldJson` (JSON escape) |
| `frontend/components/sections/RichBodySection.tsx` | `sanitizePageBodyHtml` |
| `frontend/components/sections/ServiceLinkedBody.tsx` | `scopeBlogHtml` (input) |
| `frontend/app/(site)/blog/[slug]/page.tsx` | `scopeBlogHtml` |
| `frontend/app/(site)/[country]/[lang]/legal/[type]/page.tsx` | `sanitizePageBodyHtml` |
| `frontend/app/(site)/[country]/[lang]/services/[serviceSlug]/page.tsx` | `scopeBlogHtml` |
| `frontend/app/(site)/[country]/[lang]/health/[slug]/page.tsx` | `scopeBlogHtml` |
| `frontend/app/(admin)/admin/blog/_components/html-body-field.tsx` | `scopeBlogHtml` |
| `frontend/app/(admin)/admin/doctors/[id]/page.tsx` | `sanitizeDoctorBioHtml` |

The `sanitize-html` dependency itself has a critical vulnerability, so upgrading it is urgent even though the current allowlists are reasonable.

## API Security Review

### Positive patterns

- Public media proxy blocks PHI prefixes (`clinical/`, `patient-upload/`) and validates keys via `isSafeMediaKey`.
- Patient-upload tokens are now 14-day, database-backed, revocable, and hash-only storage.
- Brazil consent endpoint requires a signed HMAC token bound to the appointment.
- Share links use opaque random tokens with expiry/revocation and deliberately omit patient PII.
- Stripe webhook verifies signatures against all configured account secrets and deduplicates events.
- Cron/internal endpoints fail closed when `CRON_SECRET` is missing.
- Review-invite creation endpoint no longer returns the raw token.
- Global rate limit defaults to 300/min; sensitive routes have tighter limits.

### Remaining gaps

- `consultation-chat.route.ts` and `doctor-photo.route.ts` trust `file.mimetype` without sniffing (Finding S-005).
- Some admin endpoints rely on the global 300/min limit, which is loose for high-sensitivity mutations (role changes, password resets, credit adjustments).
- `admin-corporate.route.ts` and other admin list routes do not apply stricter per-route rate limits.

## Authentication & Authorization Review

### Positive patterns

- JWT is HS256, signed with `AUTH_JWT_SECRET`, expires in 7 days, uses `issuer`/`audience` claims.
- Cookie is `HttpOnly`, `Secure` in production, `SameSite=lax`, `path=/`.
- `requireAuth`, `verifyDoctorAccess`, `verifyAdminAccess` all check `tokenVersion` against the DB and require `isActive`.
- Edge proxy fails closed in production when `AUTH_JWT_SECRET` is missing.
- Admin Server Actions call `requireAdminAction` before mutation.

### Remaining gaps

- `frontend/lib/admin/require-admin-action.ts` only allows `role === "ADMIN"`. A `SUPER_ADMIN` is redirected to login, breaking the admin surface for super admins. This is a regression risk and authorization bug.
- 2FA is optional for doctors and admins. For a healthcare platform handling PHI, privileged roles should be required to enroll TOTP before accessing patient data.
- There is no per-token revocation or short session idle timeout. "Sign out of all devices" works via `tokenVersion`, but a stolen session cookie remains valid for up to 7 days.
- `ADMIN_TOKEN_FALLBACK_ENABLED` defaults to `true` only in `development`, but there is no production boot guard that rejects it if set to `true`.

## Database Security Review

### Positive patterns

- Prisma ORM is used for almost all queries; parameterized queries prevent SQL injection in normal paths.
- PHI columns (national ID, tax ID, passport, insurance policy) have AES-256-GCM encryption when `PHI_ENCRYPTION_KEY` is set, and production boot hard-fails if it is missing.
- Blind-index hashes for email/phone/name+dob support deduplication without decrypting values.
- `Payment.appointment` relation uses `onDelete: Restrict` so financial rows survive appointment deletion.
- `OrderAppointment` join table provides FK integrity for order↔appointment linkage.

### Remaining gaps

- `doctorAmountCents` field referenced in code no longer exists in the Prisma schema, causing typecheck failures. This indicates schema/code drift that could lead to runtime errors or data-integrity issues.
- Some raw SQL in `appointments.service.ts` uses `$queryRawUnsafe` with hardcoded column names. It is not injectable today, but a future refactor that maps input keys into the column list would create SQL injection.
- `MedicalNote.createdByDoctorId` has a foreign-key relation in the current schema (fixed from prior finding).

## XSS & Injection Review

### XSS

- All observed `dangerouslySetInnerHTML` sites are sanitized.
- `sanitize-html` 2.17.3 has a critical XSS vulnerability; upgrade to ≥ 2.17.4 immediately.
- The frontend CSP is intentionally minimal (`frame-ancestors 'self'; object-src 'none'; base-uri 'self'`). The comment explains that a full `script-src` CSP would require nonces because Next.js injects inline bootstrap scripts. This is a known gap; adding nonces should be a follow-up.

### Injection

- Prisma ORM usage is safe against SQL injection.
- `appointments.service.ts` dynamic SQL builds column lists from hardcoded arrays; values are parameterized. Not injectable today, but fragile.
- No NoSQL injection patterns observed; all Mongo-like queries use Prisma typed filters.

## Secrets & Environment Variable Review

### Positive patterns

- `.env.example` does not contain real secrets.
- `backend/.env` and `frontend/.env.local` are gitignored.
- Production boot hard-fails if:
  - `AUTH_JWT_SECRET` is the dev default.
  - `MEDICAL_ACCESS_ENFORCE` is not `true`.
  - `BILLING_DRIVER` is not `stripe`.
  - `STRIPE_SECRET_KEY` is missing when `BILLING_DRIVER=stripe`.
  - `PHI_ENCRYPTION_KEY` is missing.
  - `SEED_ADMIN_EMAIL` matches a known exposed address.

### Remaining gaps

- `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` has no production hard-fail. The fake-billing guard prevents direct abuse, but an explicit production refusal would be safer.
- `ADMIN_TOKEN_FALLBACK_ENABLED` has no production hard-fail. If set to `true` in production, the Bearer-token admin bypass would be active.
- `CRON_SECRET` is optional; cron endpoints fail closed when missing, but requiring it in the Zod schema would make the dependency explicit.
- Patient-upload storage keys include the raw patient email, leaking PII into S3 keys and access logs.

## Dependency Security Review

| Package | Installed | Advisory | Severity | Risk |
|---|---|---|---|---|
| `sanitize-html` | 2.17.3 | GHSA-rpr9-rxv7-x643 | Critical | XSS via `xmp` raw-text passthrough |
| `next` | 16.2.4 | GHSA-8h8q-6873-q5fj | High | DoS via Server Components |
| `next` | 16.2.4 | GHSA-26hh-7cqf-hhc6 | High | Middleware/proxy bypass via segment-prefetch |
| `next` | 16.2.4 | GHSA-mg66-mrh9-m8jx | High | DoS via connection exhaustion (Cache Components) |
| `next` | 16.2.4 | GHSA-c4j6-fc7j-m34r | High | SSRF via WebSocket upgrades |
| `postcss` | 8.4.31 | GHSA-qx2v-qp2m-jg93 | Moderate | XSS via unescaped `</style>` in stringify output |
| `hono` | 4.12.16 | GHSA-qp7p-654g-cw7p | Moderate | CSS declaration injection via JSX SSR style objects |
| `@hono/node-server` | 1.19.11 | GHSA-92pp-h63x-v22m | Moderate | Middleware bypass via repeated slashes in serveStatic |

`hono` and `@hono/node-server` are pulled in via `prisma > @prisma/dev` (dev-time dependency). They are not used at runtime but should still be upgraded or pinned.

## Security Headers / CORS / Cookie Review

### Headers

- `frontend/next.config.ts` applies good baseline headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`, and a partial CSP.
- Backend Helmet is configured with `contentSecurityPolicy: false` (correct for a JSON API), `crossOriginResourcePolicy: cross-origin` (so frontend can fetch media), `crossOriginEmbedderPolicy: false`.

### CORS

- `backend/src/app.ts` CORS handler:
  - Allows same-origin/non-browser requests.
  - Always allows localhost origins.
  - If `CORS_ALLOWED_ORIGINS` is configured, enforces the allowlist in **every** environment.
  - If **not** configured and not production, allows all origins.
- **Risk:** An internet-reachable staging/preview deployment with no `CORS_ALLOWED_ORIGINS` will accept credentialed cross-origin requests from any site.

### Cookies

- Auth cookie is `HttpOnly`, `Secure` in production, `SameSite=lax`, 7-day expiry.
- Missing `__Host-` prefix. The prefix would additionally enforce `Secure`, no `Domain`, and `Path=/`.
- `AUTH_COOKIE_DOMAIN` is optional; if unset, the cookie is host-bound, which is safer.

## Logging & Error Handling Review

### Positive patterns

- Backend errors use normalized `errorResponse` and do not leak stack traces or SQL details in production responses.
- Error boundary (`frontend/app/error.tsx`) now renders a generic localized message instead of `error.message`.
- Audit logging is present for medical access, admin mutations, share links, manual bookings, doctor photo updates, etc.

### Remaining gaps

- The error boundary still calls `console.error(error)` in the browser, which can leak internal details to client devtools.
- Fastify `logger: true` logs all requests. Ensure request logs do not include cookies, tokens, or PHI query parameters in production.
- Some `catch` blocks swallow errors silently (e.g., `recordAudit(...).catch(() => {})`). While intentional to avoid failing the main flow, a failed audit write should itself trigger an ops alert.

## Detailed Findings

### Finding S-001: Critical XSS vulnerability in `sanitize-html` 2.17.3

- **Severity:** Critical
- **Category:** dependencies / XSS
- **Affected files:** `frontend/package.json`, `backend/package.json`, any component using `sanitize-html` (e.g. `frontend/lib/content/scope-blog-html.ts`, `sanitize-page-body.ts`, `doctor-bio-format.ts`)
- **Problem:** `pnpm audit` reports `sanitize-html` 2.17.3 has a default XSS via `xmp` raw-text passthrough (GHSA-rpr9-rxv7-x643). A payload can bypass the sanitizer.
- **Why it matters:** Even though the app sanitizes at render time, a sanitizer bypass means stored/reflective XSS is possible on public pages and in the admin portal.
- **Safe fix:** Upgrade `sanitize-html` to ≥ 2.17.4 in both workspaces and re-run the audit.
- **Difficulty:** Easy
- **Production urgency:** Must fix before production
- **Priority:** 1

### Finding S-002: Multiple High vulnerabilities in Next.js 16.2.4

- **Severity:** High
- **Category:** dependencies
- **Affected files:** `frontend/package.json`
- **Problem:** Next.js 16.2.4 is affected by:
  - DoS via Server Components (GHSA-8h8q-6873-q5fj)
  - Middleware/proxy bypass via segment-prefetch routes (GHSA-26hh-7cqf-hhc6)
  - DoS via connection exhaustion in Cache Components (GHSA-mg66-mrh9-m8jx)
  - SSRF via WebSocket upgrades (GHSA-c4j6-fc7j-m34r)
- **Why it matters:** These are remotely exploitable in default App Router deployments. The proxy bypass can expose pages meant to be protected by middleware.
- **Safe fix:** Upgrade Next.js to ≥ 16.2.6 (or latest 16.x patch) and re-run `pnpm audit`.
- **Difficulty:** Easy
- **Production urgency:** Must fix before production
- **Priority:** 1

### Finding S-003: Moderate vulnerabilities in transitive dependencies

- **Severity:** Medium
- **Category:** dependencies
- **Affected files:** `pnpm-lock.yaml`, `backend/package.json` (via `prisma > @prisma/dev > hono` and `@hono/node-server`)
- **Problem:**
  - `postcss` 8.4.31 — XSS via unescaped `</style>` in stringify output (GHSA-qx2v-qp2m-jg93)
  - `hono` 4.12.16 — CSS declaration injection via JSX SSR style objects (GHSA-qp7p-654g-cw7p)
  - `@hono/node-server` 1.19.11 — middleware bypass via repeated slashes in `serveStatic` (GHSA-92pp-h63x-v22m)
- **Why it matters:** `hono` packages are dev-time transitive dependencies; `postcss` is used by Next.js/Tailwind. They should still be upgraded to avoid CI noise and future exposure.
- **Safe fix:** Run `pnpm update postcss` in frontend and `pnpm update hono @hono/node-server` (or let Prisma update its dev deps). Add `pnpm audit` to CI and block merges on High/Critical findings.
- **Difficulty:** Easy
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-004: `requireAdminAction` rejects `SUPER_ADMIN`

- **Severity:** High
- **Category:** authorization
- **Affected files:** `frontend/lib/admin/require-admin-action.ts`, all `frontend/app/(admin)/admin/**` server actions that call it
- **Problem:**
  ```ts
  if (!user || user.role !== "ADMIN") {
    redirect("/login?next=/admin");
  }
  ```
  The check only permits `ADMIN`. A `SUPER_ADMIN` would be redirected to login and unable to use any mutating admin action, even though the admin layout allows them to view pages.
- **Why it matters:** Super admins are blocked from admin mutations, or — worse — if a developer "fixes" the layout instead of the action guard, the action guard becomes the weak point.
- **Safe fix:** Change the check to `if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"))`.
- **Difficulty:** Easy
- **Production urgency:** Must fix before production
- **Priority:** 1

### Finding S-005: File uploads trust client-declared MIME type without sniffing

- **Severity:** High
- **Category:** file upload / validation
- **Affected files:** `backend/src/routes/consultation-chat.route.ts:339-352`, `backend/src/routes/doctor-photo.route.ts:66-69`
- **Problem:** Both routes read `file.mimetype` from the multipart header and check only an allowlist. They do not verify magic bytes. A polyglot HTML/SVG file declared as `image/jpeg` will pass validation and be stored.
- **Why it matters:** Stored files can be served back with their declared MIME type. If the file is actually HTML/SVG and rendered inline or downloaded, it can lead to stored XSS or content-sniffing attacks.
- **Safe fix:** Reuse the existing `verifySniffedMime()` helper (used in `patient-upload.route.ts` and `medical-documents.route.ts`). For doctor photos, also add WebP/AVIF to the allowlist if needed.

  Example pattern:
  ```ts
  const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  const sniffedMime = verifySniffedMime(buffer, file.mimetype, ALLOWED_MIME);
  if (!sniffedMime) return reply.status(415).send(errorResponse("File content does not match allowed type"));
  ```
- **Difficulty:** Easy
- **Production urgency:** Must fix before production
- **Priority:** 1

### Finding S-006: Patient-upload storage key embeds raw patient email

- **Severity:** Medium
- **Category:** privacy / secrets
- **Affected files:** `backend/src/routes/patient-upload.route.ts:117`
- **Problem:**
  ```ts
  const storageKey = `patient-upload/${verified.email}/${randomUUID()}-${safeName}`;
  ```
  The patient's email address is embedded in the S3/object-storage key. Even though the public media proxy blocks the `patient-upload/` prefix, the email still appears in storage logs, backup snapshots, and any internal tooling that lists objects.
- **Why it matters:** Embedding PII in storage keys increases the blast radius of any log or bucket listing leak and makes GDPR erasure harder.
- **Safe fix:** Use a non-PII identifier such as `PatientProfile.id` or a one-way hash of the email in the storage key. Store the original filename only in the database row.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-007: Two-factor authentication is optional for privileged roles

- **Severity:** High
- **Category:** authentication
- **Affected files:** `backend/src/config/env.ts`, `backend/src/utils/admin-auth.ts`, `backend/src/utils/doctor-auth.ts`, `backend/src/lib/medical-access-guard.ts`
- **Problem:** Doctors and admins can access PHI and admin functions without enrolling 2FA. The medical-access guard checks `twoFactorVerifiedAt`, but if 2FA is never enabled, the check passes.
- **Why it matters:** A stolen password for a doctor or admin account grants direct access to patient records and platform controls. Healthcare platforms should require 2FA for all privileged roles.
- **Safe fix:** Add an env flag `REQUIRE_2FA_FOR_ROLES` or hard-require 2FA for `DOCTOR`, `ADMIN`, `SUPER_ADMIN`, and `LOCAL_ADMIN` in production. Enforce at login and gate role-specific routes.
- **Difficulty:** Medium
- **Production urgency:** Must fix before production
- **Priority:** 1

### Finding S-008: Session cookie lacks per-token revocation and short idle timeout

- **Severity:** Medium
- **Category:** session
- **Affected files:** `backend/src/utils/auth-session.ts`, `backend/src/utils/require-auth.ts`
- **Problem:** JWT sessions are valid for 7 days. "Sign out of all devices" works by bumping `tokenVersion`, but there is no per-token revocation list and no idle-session timeout.
- **Why it matters:** A stolen cookie is usable for up to 7 days. Compromised sessions cannot be revoked individually.
- **Safe fix:** Maintain a server-side token-blocklist table or issue short-lived access tokens + refresh tokens. For the current JWT model, consider reducing `AUTH_JWT_EXPIRES_IN` to 24 hours and requiring re-auth for sensitive actions.
- **Difficulty:** Hard
- **Production urgency:** Fix soon
- **Priority:** 3

### Finding S-009: Frontend CSP lacks `script-src`

- **Severity:** Medium
- **Category:** headers / XSS
- **Affected files:** `frontend/next.config.ts`
- **Problem:** The current CSP is:
  ```
  frame-ancestors 'self'; object-src 'none'; base-uri 'self'
  ```
  There is no `script-src`, `style-src`, or `connect-src`. The config comment explains that a strict policy requires nonces because Next.js injects inline bootstrap scripts.
- **Why it matters:** Without `script-src`, an attacker who finds a sanitizer bypass or injects inline script via another vector can execute arbitrary JavaScript.
- **Safe fix:** Implement a nonce-based CSP that allows Next.js inline scripts, self, and known third-party origins (`connect.facebook.net`, `www.doctify.com`, Stripe). Add `style-src 'self' 'unsafe-inline'` if needed for CMS content, or move CMS styles to external files.
- **Difficulty:** Hard
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-010: CORS allows all origins in non-prod when allowlist is missing

- **Severity:** Medium
- **Category:** CORS
- **Affected files:** `backend/src/app.ts:45-75`
- **Problem:**
  ```ts
  if (allowedOrigins.length > 0) {
    callback(null, allowedOrigins.includes(origin));
    return;
  }
  if (isProd) { ...deny... }
  callback(null, true); // non-prod, no allowlist -> allow all
  ```
  If `CORS_ALLOWED_ORIGINS` is not set in a non-production environment that is internet-reachable (staging, preview), any site can make credentialed cross-origin requests.
- **Why it matters:** Staging deployments often hold real or realistic data. Allow-all CORS enables CSRF-style attacks from attacker-controlled sites against staging.
- **Safe fix:** In all non-localhost non-prod environments, require `CORS_ALLOWED_ORIGINS` to be set. Alternatively, make the allowlist required whenever `NODE_ENV !== "development"`.
- **Difficulty:** Easy
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-011: `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` has no production hard-fail

- **Severity:** Medium
- **Category:** config / payments
- **Affected files:** `backend/src/config/env.ts`, `backend/src/modules/subscriptions/subscription.service.ts`, `backend/src/routes/me-subscription.route.ts`
- **Problem:** The environment variable is not rejected in production. The endpoint is gated to the fake billing driver, so `BILLING_DRIVER=stripe` production boots will reject activation, but the variable itself is not hard-failed.
- **Why it matters:** A future refactor could accidentally widen the gate. Defense-in-depth requires production to refuse the flag.
- **Safe fix:** Add a production boot guard: if `NODE_ENV === "production"` and `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` is truthy, throw.
- **Difficulty:** Easy
- **Production urgency:** Fix soon
- **Priority:** 3

### Finding S-012: `ADMIN_TOKEN_FALLBACK_ENABLED` could be enabled in production

- **Severity:** Medium
- **Category:** config / authorization
- **Affected files:** `backend/src/config/env.ts`, `backend/src/utils/admin-auth.ts`
- **Problem:** The Bearer-token admin fallback defaults to `true` only in `development`, but there is no production hard-fail if it is explicitly set to `true`.
- **Why it matters:** If an operator sets `ADMIN_TOKEN_FALLBACK_ENABLED=true` in production, the static `ADMIN_API_TOKEN` becomes a privileged bypass that is not tied to a user session.
- **Safe fix:** Throw in production if `ADMIN_TOKEN_FALLBACK_ENABLED === true`.
- **Difficulty:** Easy
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-013: Sensitive admin mutations use loose global rate limit

- **Severity:** Medium
- **Category:** API / rate limiting
- **Affected files:** `backend/src/routes/admin-users.route.ts`, `backend/src/routes/admin-doctors.route.ts`, `backend/src/routes/admin-subscriptions.route.ts`, `backend/src/app.ts`
- **Problem:** The global default is 300 requests/minute. Sensitive mutations (role changes, password resets, subscription credit adjustments, doctor purge) do not have tighter per-route limits.
- **Why it matters:** A compromised admin session or stolen token can perform many high-impact mutations in a short window.
- **Safe fix:** Add `config: { rateLimit: { max: 10, timeWindow: "1 minute" } }` to admin mutation routes that change roles, credentials, payments, or PHI.
- **Difficulty:** Easy
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-014: Dynamic SQL in appointments service is fragile

- **Severity:** Medium
- **Category:** injection
- **Affected files:** `backend/src/modules/appointments/appointments.service.ts:500-543`
- **Problem:** The list query builds a dynamic `WHERE` clause and column list using `$queryRawUnsafe`. Values are parameterized and column names are currently hardcoded, so it is not injectable today.
- **Why it matters:** One careless refactor that maps input keys into the column list would create SQL injection in a PHI-handling service.
- **Safe fix:** Replace with `prisma.appointment.findMany` or use `Prisma.sql` tagged templates with a strict allowlist for column names.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-015: Auth cookie lacks `__Host-` prefix

- **Severity:** Low
- **Category:** cookies
- **Affected files:** `backend/src/utils/auth-session.ts`
- **Problem:** The cookie is `HttpOnly`, `Secure` in production, `SameSite=lax`, `Path=/`, but it does not use the `__Host-` prefix.
- **Why it matters:** The `__Host-` prefix tells the browser to reject the cookie if `Secure`, `Path=/`, or `Domain` are wrong, providing an additional defense against misconfiguration.
- **Safe fix:** Rename the cookie to `__Host-gh_auth` and ensure `AUTH_COOKIE_DOMAIN` is unset in production. Update `frontend/lib/auth/cookie.ts` accordingly.
- **Difficulty:** Easy
- **Production urgency:** Hardening
- **Priority:** 3

### Finding S-016: Error boundary logs full error to browser console

- **Severity:** Low
- **Category:** logging / error handling
- **Affected files:** `frontend/app/error.tsx:29-31`
- **Problem:** `useEffect(() => { console.error(error); }, [error]);` prints the full Error object to the client console. While the UI message is generic, the console may contain internal details.
- **Why it matters:** Client-side logs can leak internal error messages, digests, or paths to an attacker with devtools access.
- **Safe fix:** Log to the server-side monitoring service only; do not call `console.error` with the raw error in production.
- **Difficulty:** Easy
- **Production urgency:** Hardening
- **Priority:** 3

### Finding S-017: Typecheck/lint failures indicate code/schema drift

- **Severity:** Medium
- **Category:** code quality / stability
- **Affected files:** `backend/src/modules/doctor-services/doctor-services.service.ts`, `backend/src/routes/doctor-actions.route.ts`, `backend/src/routes/doctor-reports.route.ts`, `frontend/app/(auth)/account/bookings/ui.tsx`, `frontend/app/(doctor)/doctor/profile/_components/edit-form.tsx`
- **Problem:** `pnpm typecheck` and `pnpm lint` fail. The backend failure is a missing Prisma field; the frontend failures are React 19 anti-patterns.
- **Why it matters:** Failing static checks are a sign of drift that can produce runtime exceptions or subtle bugs exploitable as security issues.
- **Safe fix:** Fix the typecheck errors and lint errors, then add CI gates that block merges on failures.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** 2

### Finding S-018: Audit write failures are silently swallowed

- **Severity:** Low
- **Category:** logging / audit
- **Affected files:** Many routes using `recordAudit(...).catch(() => {})`
- **Problem:** Audit and security-alert writes are fire-and-forget with empty catch blocks. A failure to write an audit row is invisible.
- **Why it matters:** On a healthcare platform, audit integrity is a compliance requirement. Silent audit loss can hide breaches.
- **Safe fix:** Emit an ops alert when `recordAudit` or `alertUnauthorizedAccess` throws in production. Do not fail the user-facing operation, but do not lose the signal.
- **Difficulty:** Medium
- **Production urgency:** Hardening
- **Priority:** 3

## Prioritized Security Fix Roadmap

### Must Fix Before Production

1. **Upgrade `sanitize-html`** to ≥ 2.17.4 in both workspaces.
2. **Upgrade `next`** to ≥ 16.2.6 (latest 16.x patch).
3. **Fix `requireAdminAction`** to allow `SUPER_ADMIN` as well as `ADMIN`.
4. **Add magic-byte sniffing** to `consultation-chat` and `doctor-photo` uploads using `verifySniffedMime`.
5. **Require 2FA for privileged roles** (`DOCTOR`, `ADMIN`, `SUPER_ADMIN`, `LOCAL_ADMIN`) in production.
6. **Fix `pnpm typecheck` and `pnpm lint` failures** and add them to CI.
7. **Run `pnpm audit` in CI** and block merges on Critical/High findings.

### Should Fix Soon

1. **Add nonce-based `script-src` CSP** to the frontend.
2. **Remove patient email from upload storage keys**; use `PatientProfile.id` or a hash.
3. **Add production boot guards** for `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` and `ADMIN_TOKEN_FALLBACK_ENABLED`.
4. **Tighten per-route rate limits** for sensitive admin mutations.
5. **Require `CORS_ALLOWED_ORIGINS`** in all internet-reachable non-prod environments.
6. **Replace fragile `$queryRawUnsafe` in appointments service** with Prisma queries or `Prisma.sql` with a strict column allowlist.
7. **Upgrade moderate-risk dependencies** (`postcss`, `hono`, `@hono/node-server`).
8. **Add ops alerting** for audit-write failures.

### Hardening Improvements

1. **Use `__Host-` prefix** for the auth cookie.
2. **Implement per-token revocation** or shorter session expiry with sliding refresh.
3. **Remove client-side `console.error(error)`** in the error boundary; log server-side only.
4. **Add dependency/secret scanning** to CI (e.g. GitHub Dependabot, `pnpm audit --json`).
5. **Add security headers review** to deployment checklist.
6. **Penetration-test** the file upload flows, admin role boundaries, and payment webhooks before go-live.

## Recommended Security Baseline

| Area | Recommended Standard |
|---|---|
| Input validation | Zod schemas on every route handler and Server Action; reject unexpected keys with `.strict()`. |
| Output encoding | Sanitize all HTML before `dangerouslySetInnerHTML`; JSON-escape JSON-LD; encode URL parameters. |
| SQL/ORM query safety | Use Prisma typed queries; avoid `$queryRawUnsafe` for dynamic columns; if unavoidable, use a hardcoded allowlist. |
| Authentication | HS256 JWT with `issuer`/`audience`, `HttpOnly` `__Host-` cookie, max 24h lifetime for privileged sessions, mandatory 2FA for admin/doctor roles. |
| Authorization | Re-check role in every Server Action and backend route; fail closed; never trust client headers. |
| Rate limiting | Global default + stricter limits on auth, password reset, admin mutations, file uploads, payment endpoints. |
| CORS | Require explicit allowlist in all internet-reachable environments; deny by default. |
| Cookies | `__Host-{name}`, `HttpOnly`, `Secure`, `SameSite=lax` or `strict`, `Path=/`, no `Domain` in production. |
| Security headers | Full nonce-based CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. |
| Secrets management | Production boot hard-fail on missing/weak secrets; never commit secrets; rotate credentials tracked in docs. |
| Logging | Never log cookies, tokens, passwords, or PHI; log audit failures to ops alerting. |
| Dependency updates | Weekly `pnpm audit`; block CI on Critical/High; keep patch versions current. |

## Final Notes

- This audit focused on static analysis. Runtime verification (penetration testing, dependency scan in CI, Lighthouse security checks) is strongly recommended before production.
- Several critical findings from prior audits are confirmed fixed: medical-access guard production hard-fail, PHI prefix blocking on public media, short-lived revocable patient-upload tokens, admin action role re-checks, and Brazil consent token gating.
- The remaining risks are concentrated in dependency versions, file-upload MIME verification, and a few authorization/configuration edge cases. Fixing the "Must Fix" items above will bring the platform close to production-ready for a healthcare use case.
- No exploit scripts or harmful payloads were generated. All guidance is defensive and fix-oriented.
