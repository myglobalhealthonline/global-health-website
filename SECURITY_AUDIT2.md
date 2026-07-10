# Security Audit

**Audit date:** 2026-07-10  
**Repository:** `C:\Users\kingh\Desktop\NashaaFrontend\global-health-website`  
**Audit mode:** Defensive, read-only source/configuration review. No exploit payloads were produced and no application behavior was changed.
**Execution plan:** see `AUDIT2_EXECUTION_PLAN.md` for model assignment (Fable 5 architecture / Sonnet 5 implementation), cross-audit deduplication, and sequencing shared with `PERFORMANCE_OPTIMIZATION_AUDIT2.md`.

## Executive Summary

The repository contains meaningful security engineering: strong schema validation across most route boundaries, exact/fail-closed CORS outside development, Helmet, redacted auth/cookie logs, password hashing, hashed reset/verification tokens, Stripe signature verification and idempotency, upload MIME sniffing and path containment, production configuration guards, rate limiting, and three lockfile-specific dependency audits that currently report no known vulnerabilities.

However, the audit confirmed **five production-blocking defects**:

1. A live-looking Make.com webhook credential is hard-coded in tracked source and is used by default to transmit patient identity, address, tax/VAT, service, payment, and invoice data.
2. Registration creates a full authenticated session before email verification and immediately claims all unowned appointments/orders matching the supplied email, enabling victim-record takeover if the victim has not registered.
3. Admin authorization trusts the JWT role, treats `LOCAL_ADMIN` like global admin, and allows that tier to access user administration, change roles (including `SUPER_ADMIN`), deactivate users, and reset arbitrary passwords without hierarchy or country scope.
4. Role/password/active-state changes do not consistently invalidate sessions; admin gates do not normally check current DB role, activity, deletion state, or token version.
5. Seven clinical route families use a narrower doctor/appointment relationship check but bypass the central medical-access guard, confidentiality/consent/folder rules, and medical access audit logging.

Additional high risks include optional relaxed compliance configuration, incomplete privileged 2FA policy and session assurance, replay-prone backup-code consumption, best-effort/auditable-event loss, capability tokens in logged URLs and stored unhashed, no effective script CSP by default, permissive stored CSS handling, an HS256 signing secret shared with the frontend service, incomplete GDPR deletion, unverified object-storage encryption controls, patient/appointment data transmitted through the third-party WaSender WhatsApp API with non-uniform consent gating, and a hard-coded Meta Pixel that fires on every route — including authenticated patient/doctor/admin portals — before cookie consent is given.

**Security posture:** **Critical / not ready for production handling of patient or medical data until S-001 through S-006 are resolved and validated.** The dependency graph itself is not the principal risk; application authorization, identity proofing, data-flow governance, and compliance enforcement are.

## Stack Detected

- **Framework:** Next.js 16.2.6 App Router and Fastify 5
- **Frontend:** React 19.2.4, TypeScript, Next Server Components and route handlers
- **Backend:** Node.js 22, Fastify autoloaded routes, Zod validation
- **Database:** PostgreSQL 16, Prisma 7, pg adapter
- **Auth:** HttpOnly JWT cookie, HS256 issuer/audience validation, bcrypt password hashes, email verification, password reset, TOTP/backup codes, role-based gates
- **Payments/Webhooks:** Stripe checkout/webhooks; InvoiceExpress; Make.com invoice webhook; subscription/provider integrations
- **Files/PHI:** S3-compatible object storage, local fallback, generated PDFs/DOCX, patient uploads, encrypted/blind-indexed database fields
- **Deployment:** Railway, frontend multi-stage Docker, backend Nixpacks, GitHub Actions
- **Other important tools:** Redis-optional rate limits, Helmet, CORS, multipart, `sanitize-html`, Playwright/Chromium, LibreOffice, Gmail/SendGrid, WhatsApp, Google APIs

## Commands Run

| Command | Result | Notes |
|---|---|---|
| Repository inventory and source enumeration | Pass | Reviewed actual source/config; excluded `.git`, `node_modules`, `.next`, `dist`, `build`, coverage, generated output, and nested `.claude/worktrees`. |
| `git status --short` | Pass | Worktree was clean before report creation. |
| `git ls-files "*.env" "*.env.*"` | Pass | Only example env files are tracked. Real local env files are ignored. Values were not printed into this report. |
| Masked env-key inventory | Pass | Confirmed local files contain payment, auth, storage, admin, and provider credentials; only variable names were inspected in output. |
| Tracked-source secret pattern/history review | Finding | Found the Make.com webhook URL/token in tracked source/history. No tracked `.env`, private-key block, AWS/GitHub/Google credential pattern was found. |
| `pnpm typecheck` | Pass | Frontend/backend TypeScript passed; child override blocks warn when invoked in workspace mode. |
| `pnpm lint` | Pass | Frontend/backend ESLint passed. |
| `pnpm --filter frontend test` | Pass | 57/57 tests passed. |
| `pnpm --filter backend test` | Safely blocked | Test guard rejected the non-test database. The live-DB bypass was not used. |
| `pnpm build` | Pass | Production Next and backend TypeScript builds passed. |
| Workspace `pnpm audit --audit-level=high` | Pass | Initial sandbox registry request failed with `EACCES`; approved network retry reported no known vulnerabilities. |
| Frontend/backend standalone `pnpm audit --audit-level=high --ignore-workspace` | Pass | Both deployed-service lockfiles reported no known vulnerabilities. This does not prove absence of moderate/low advisories or future disclosures. |
| Safe pattern searches | Pass with findings | No runtime `eval`, `new Function`, `$queryRawUnsafe`, or `$executeRawUnsafe` was found in backend source; unsafe raw SQL matches were test-only `SELECT 1`. |

## Repository Areas Reviewed

- Security/config bootstrap: `backend/src/app.ts`, `server.ts`, `config/env.ts`, `db/prisma.ts`, `db/ensure-schema.ts`
- Authentication/authorization: auth session, `require-auth`, request auth, admin/doctor/corporate gates, role evaluator, 2FA, password/email token flows
- Medical access: central guard, doctor clinical access, access logs, confidentiality, consent, country/folder grants, clinical route families
- Admin surfaces: user management, patients, audit/security alerts, appointments, invoices, reports, automation, settings, countries, content, subscriptions
- Public/account/doctor/corporate routes: approximately 124 backend route files and about 482 HTTP method registrations
- Input handling: approximately 70 route files reading request bodies; 69 contain parse/safeParse markers. Strong Zod usage is widespread.
- Forms: login/register/reset/verify, contact/newsletter, booking/cart/checkout, account profile/family, admin content/editors, doctor clinical forms, search/filter endpoints
- Upload/download/media: patient, medical, chat, doctor photo, admin media, generated documents, public media, object storage and local path helpers
- Payments/webhooks: Stripe raw-body route, checkout/sync, order completion, subscriptions, invoices, provider callbacks and alerts
- Data protection: Prisma schema/migrations, PHI crypto/blind index, TOTP secret encryption, immutable-log SQL, deletion scheduling
- Frontend security: Next proxy/CSP/headers, auth cookie name, same-origin BFF allowlists, redirect validation, HTML/CSS sanitization, `dangerouslySetInnerHTML` sites
- Secrets/dependencies/deployment: all manifests/lockfiles, env examples, Docker/Nixpacks/Railway/compose, CI workflow and override-drift script

## Biggest Security Risks

1. **Tracked Make.com webhook credential and default patient-data export** — Critical
2. **Unverified-email registration claims guest medical/payment records** — Critical
3. **Systemic admin/LOCAL_ADMIN privilege escalation and missing scope** — Critical
4. **Disabled/demoted/password-reset admin sessions remain usable** — Critical/High
5. **Clinical routes bypass the central medical-access guard and access logging** — High/Critical for compliance
6. **Production can run with relaxed PHI controls and no required privileged 2FA** — High
7. **2FA setup/session/backup-code design permits weak assurance or replay** — High
8. **Mandatory audit events are best-effort and DB immutability is not deployed** — High
9. **Bearer capability tokens leak through URLs/logs and some are stored raw** — High
10. **No effective script CSP by default; stored CSS accepts containment-breaking constructs** — High

## Existing Positive Controls to Preserve

- Production startup rejects dev JWT fallback, fake billing, missing Stripe, missing PHI key, test subscription bypass, and admin bearer fallback. Strict compliance mode rejects a shadow-only medical guard.
- JWT verification pins HS256, issuer, and audience. Passwords use bcrypt cost 12. Reset/verification tokens are random and hashed at rest.
- Login errors are generic and forgot-password response is uniform/asynchronous.
- CORS uses an exact allowlist and fails closed outside development. Helmet and Brotli/gzip/deflate are enabled.
- Fastify logs redact `Authorization`, `Cookie`, and `Set-Cookie` headers.
- Global rate limiting exists, with tighter auth limits and optional Redis backing.
- Stripe raw bodies are preserved for signature verification; payment paths contain idempotency and transactional state logic.
- Uploads cap count/size, sanitize filenames, magic-byte validate JPEG/PNG/WebP/PDF, and reject SVG. Local paths use containment checks.
- Public media uses strict key whitelists that exclude PHI prefixes.
- Frontend catch-all proxies use explicit method/path allowlists, limiting generic SSRF exposure. Login `next` handling rejects protocol-relative/backslash redirects.
- Frontend Docker uses a frozen standalone lockfile, multi-stage output, and non-root runtime. CI checks child lock/override drift and audits deployment lockfiles.
- Rich HTML is generally sanitized and links receive `noopener`/`noreferrer`; email templates escape user values.

## Input & Form Security Review

### Coverage

- Approximately 70 backend route files read `request.body`; 69 contain schema parse/safeParse markers.
- Registration, login, reset, verification, booking, contact, family, admin content, service links, SEO fields, and most upload metadata use Zod or narrow coercion.
- `admin-invoices.route.ts` directly casts one channel field but coerces it to a safe email/WhatsApp pair; this is low risk.
- Corporate status/search query values are directly cast and search length is unbounded; invalid enum values can produce a Prisma 500 and unbounded search can increase database work.
- Client validation is not treated as a security boundary; the backend validation coverage is generally good.

### Form-specific risks

- Registration identity proofing is unsafe because data ownership is transferred before email verification (S-002).
- Existing-email registration returns a distinct 409, enabling account enumeration (S-023).
- 2FA setup accepts a client-supplied secret and backup-code list under an existing session without password/recent-auth confirmation (S-007).
- Admin role/password forms lack authorization hierarchy and session revocation (S-003/S-004).
- Rich blog/page content allows style blocks and broad CSS constructs; sanitizing HTML alone does not safely constrain CSS (S-011).
- Input length limits are generally present, but corporate search and some list filters require explicit bounds/pagination.

## API Security Review

- Authorization logic is fragmented across `requireAuth`, `verifyAdminAccess`, doctor relationship checks, and the central medical guard. The fragmented paths have drifted, causing admin and clinical bypasses.
- Public capability endpoints expose sensitive data using bearer tokens in URL query/path positions. Default request logs record URLs.
- An unauthenticated payment sync endpoint can trigger DB plus Stripe work based on caller-controlled identifiers under only the global rate limit.
- Several authenticated PHI JSON endpoints do not explicitly set `private, no-store`.
- Global 5 MB JSON and buffered multipart handling increase resource-exhaustion risk; document generation has only the broad global rate limit.
- Same-origin Next proxies have explicit allowlists (positive), but standard CSRF/origin enforcement for cookie-auth state changes was not found.

## Authentication & Authorization Review

- Patient/doctor `requireAuth` paths check active state/token version in some cases, but admin gates trust JWT role and normally skip current DB state.
- Current DB role is not consistently compared to JWT role; demotion can leave stale authority.
- Role, active-state, password, 2FA, and doctor-link mutations do not consistently increment token version.
- `LOCAL_ADMIN` is defined as country-scoped in the schema but is admitted by the global admin evaluator and many admin plugins lack country filters.
- Account email verification does not gate record claiming or normal account access.
- Persistent `twoFactorVerifiedAt` is not equivalent to per-session `amr`/step-up assurance.

## Database Security Review

- Prisma parameterization is used; no runtime unsafe raw SQL calls were found.
- Reset/email token consumption uses read-then-update rather than an atomic conditional claim, allowing concurrent consumers to pass the initial check.
- Review/share capability tokens are stored in usable raw form; hashes should be stored.
- Audit writes can fail silently and the manual immutable-log SQL is not part of the deployed migration chain; `AuditLog` is not covered.
- The repository cannot prove S3 bucket encryption/KMS/private-policy settings.
- Encrypted identifiers are protected by a PHI key in production, but key length/rotation/distinctness policy should be stronger and explicit.

## XSS & Injection Review

- No `eval`, `new Function`, runtime unsafe Prisma raw queries, or direct SQL string construction was found.
- HTML sanitization exists server-side and commonly client-side.
- The principal injection risk is stored CSS: `<style>`, arbitrary styles/classes/IDs, vulnerable-tag allowance, and regex `@scope` wrapping can permit scope escape, external resource loading, overlays, tracking, or UI defacement.
- `dangerouslySetInnerHTML` is used for sanitized CMS content and structured content; safety depends on keeping the server sanitizer and CSS policy strict.
- Public script CSP is effectively absent, so CSP does not provide a strong second line of defense against a sanitizer or component regression.

## Secrets & Environment Variable Review

- A Make.com webhook URL/token is hard-coded in tracked source and must be treated as exposed.
- Local `backend/.env` and `frontend/.env.local` are ignored and were not printed, but contain real-looking payment/admin/storage/provider credentials. Rotate any credential that has been shared, backed up insecurely, or exposed outside the intended workstation.
- A personal seed email is hard-coded in `env.ts`; identity defaults should not be source code.
- Frontend requires the backend's symmetric JWT signing secret to verify cookies at the edge. This broadens the minting trust boundary.
- Env examples have cookie-name and required-secret drift, making secure deployment error-prone.

## Dependency Security Review

- Workspace, standalone frontend, and standalone backend lockfiles reported **no known vulnerabilities** at the executed audit threshold on 2026-07-10.
- This is a point-in-time registry result, not a guarantee. CI currently fails only on high-or-greater advisories; moderate findings still require review.
- Three independently deployed lockfiles and manually mirrored overrides are drift-prone, though the repository has explicit CI checks and comments to mitigate this.
- Backend production includes Playwright/Chromium and LibreOffice in the API image, materially increasing image size/CVE surface.
- Base images and GitHub Actions are version-tag pinned but not digest/SHA pinned.

## Security Headers / CORS / Cookie Review

- CORS behavior is strong: exact allowlist, credentials enabled, and fail-closed outside local development.
- Helmet is enabled for the API; Next sends HSTS, nosniff, SAMEORIGIN, referrer, and permissions headers.
- CSP baseline only sets `frame-ancestors`, `object-src`, and `base-uri`. `script-src` nonce policy is optional and disabled by default; public pages never receive a restrictive script policy.
- Auth cookies are HttpOnly, SameSite=Lax, and Secure only when `NODE_ENV=production`; staging/preview HTTPS deployments can be misconfigured insecurely.
- Optional parent-domain cookies increase sibling-subdomain risk. No central Origin/Fetch-Metadata/CSRF-token policy was found for state-changing cookie-auth requests.

## Logging & Error Handling Review

- Auth-bearing headers are redacted (positive), but Fastify's normal URL logging can capture query/path bearer tokens.
- Audit and medical-access logging can silently fail, which is unacceptable for mandatory compliance/money/security evidence.
- Some admin audit calls resolve the actor through a helper that excludes certain roles, producing null/incorrect actor IDs.
- Public error responses are generally generic; detailed context remains server-side.
- Missing outbound timeouts can create cascading resource exhaustion and log noise during provider incidents.

## Detailed Findings

### Finding S-001: Hard-coded Make.com credential exports patient data by default

- **Severity:** Critical
- **Category:** secrets / privacy / webhook
- **Affected files:** `backend/src/modules/invoices/generate-invoice.service.ts:8-10,18-66,383-387,427-429`; git history from commit `e7dd6aa7`
- **Problem:** A live-looking webhook URL/token is a source fallback. Invoice events send patient name, email, address, postal code, city, tax/VAT ID, service, total, invoice IDs, and Stripe invoice ID even when no environment variable is configured.
- **Why it is dangerous:** Anyone with repository/history access can invoke or abuse the hook. Production silently exports health-adjacent PII to a third party without a required configuration boundary; the destination and data-processing basis are not enforced in code.
- **Safe fix:** Revoke/rotate the hook immediately; delete the fallback; require a validated HTTPS env value with an explicit hostname allowlist; minimize the payload; use authenticated/signed requests; add a 5–10 second timeout; document DPA/legal/consent and retention. Scrub history only after rotation.
- **Difficulty:** Medium
- **Production urgency:** Block deployment; rotate now
- **Priority:** P0

### Finding S-002: Unverified registration can take over guest records

- **Severity:** Critical
- **Category:** authentication / authorization / PHI
- **Affected files:** `backend/src/routes/auth.route.ts:43-82`; `backend/src/modules/auth/auth.service.ts:164-203`; account order/appointment/medical endpoints
- **Problem:** Registration signs a full cookie before email verification, then `updateMany` claims every unowned appointment and order matching the supplied email. Account endpoints do not require `emailVerifiedAt`.
- **Why it is dangerous:** An attacker who registers a victim email before the victim creates an account can gain the victim's bookings, orders, and linked medical/payment context.
- **Safe fix:** Use a restricted pre-verification session; never claim or expose historical records until a verification token is atomically consumed. Claim in a transaction, notify the prior contact, log the transfer, and provide a dispute/recovery path.
- **Difficulty:** Medium
- **Production urgency:** Block deployment
- **Priority:** P0

### Finding S-003: Admin and LOCAL_ADMIN authorization permits systemic privilege escalation

- **Severity:** Critical
- **Category:** authorization / RBAC
- **Affected files:** `backend/src/utils/admin-access-evaluator.ts:14-16`; `admin-auth.ts:7-43`; `backend/src/routes/admin-users.route.ts:70-77,190-319`; schema role/country mappings; many admin route plugins
- **Problem:** ADMIN, SUPER_ADMIN, and LOCAL_ADMIN are treated identically at the main gate. Any admitted caller can list users, change roles (including to SUPER_ADMIN), alter active/doctor links, and reset passwords. There is no hierarchy, self-protection, last-superadmin protection, or LOCAL_ADMIN country scope.
- **Why it is dangerous:** A compromised or ordinary local admin can gain global control and access cross-country patient/admin data.
- **Safe fix:** Centralize async authorization that loads active DB user, current role, token version, and scope. Define explicit capabilities; deny LOCAL_ADMIN by default; require SUPER_ADMIN for role/password/admin mutations; prevent self-promotion and last-superadmin removal; scope every local-admin query by permitted countries.
- **Difficulty:** Large
- **Production urgency:** Block deployment
- **Priority:** P0

### Finding S-004: Privileged sessions are not reliably revoked

- **Severity:** Critical / High
- **Category:** session / authorization
- **Affected files:** `backend/src/utils/require-auth.ts:50-59`; `admin-auth.ts`; `admin-users.route.ts:231-247,292-300`; `auth.service.ts:278-283,511-542`; 2FA mutation paths
- **Problem:** Admin auth usually checks only signed JWT role. Role/password/active/2FA/doctor-link changes do not consistently bump tokenVersion, and normal auth can keep using the JWT role rather than the current DB role.
- **Why it is dangerous:** Disabled, demoted, password-reset, or post-2FA-change cookies can retain authority for the JWT lifetime.
- **Safe fix:** One session resolver must validate current DB role, `isActive`, deletion state, token version, required 2FA, and session assurance. Increment tokenVersion atomically on every privilege/credential/active/2FA mutation and rotate the current session where appropriate.
- **Difficulty:** Medium
- **Production urgency:** Block privileged production use
- **Priority:** P0

### Finding S-005: Seven clinical route families bypass the medical-access guard

- **Severity:** High / Critical for regulated data
- **Category:** authorization / medical data / logging
- **Affected files:** `appointment-documents.route.ts`; `consultation-services.route.ts`; `consultations.route.ts`; `doctor-invoices.route.ts`; `exam-results.route.ts`; `forms.route.ts`; `prescriptions.route.ts`; `backend/src/lib/medical-access-guard.ts`
- **Problem:** These files call `verifyClinicalReadAccess` but do not call `guardMedicalRead`/`assertMedicalAccess`.
- **Why it is dangerous:** Reads can skip confidentiality agreement, direct/clinic/global consent, cross-country grants, local folder scope, alerts, break-glass/reason rules, and `MedicalAccessLog`.
- **Safe fix:** Make the central guard a required pre-handler/service boundary for every medical read, generate an endpoint coverage matrix, and add allow/deny/audit integration tests for every clinical resource and role/country combination.
- **Difficulty:** Large
- **Production urgency:** Block production PHI access
- **Priority:** P0

### Finding S-006: Compliance protections and privileged 2FA can be disabled in production

- **Severity:** High
- **Category:** configuration / authorization
- **Affected files:** `backend/src/config/env.ts:179-210,279-307`; `backend/.env.example:79-85`
- **Problem:** Required 2FA roles default empty, admin PHI reason defaults false, and `COMPLIANCE_MODE=relaxed` bypasses strict production failure even when medical enforcement is not active.
- **Why it is dangerous:** A single deployment variable can turn would-be-denied PHI reads into allowed reads, and privileged roles can operate without 2FA/reasoned break-glass.
- **Safe fix:** Remove relaxed mode from customer production builds or enforce an independent deployment policy. Hard-fail production unless medical enforcement, ADMIN/SUPER_ADMIN/DOCTOR 2FA, admin reason/break-glass controls, PHI encryption, audit storage, and secure cookie/CORS values are active.
- **Difficulty:** Small–Medium
- **Production urgency:** Block production configuration
- **Priority:** P0

### Finding S-007: 2FA setup, session assurance, and backup codes are unsafe

- **Severity:** High
- **Category:** authentication / 2FA
- **Affected files:** `backend/src/routes/auth-2fa.route.ts:24-65`; `backend/src/modules/two-factor/two-factor.service.ts:92-115,177-204`; medical guard session checks
- **Problem:** An existing session can persist a client-supplied secret/backup list without recent password auth. 2FA mutations do not rotate sessions. Backup-code consumption is read/update TOCTOU and can let login succeed if removal fails. Persistent user timestamps substitute for per-session assurance.
- **Why it is dangerous:** A stolen cookie can enroll attacker-controlled 2FA or remain valid after enrollment; concurrent/retried backup codes may replay.
- **Safe fix:** Require current password/recent step-up; generate/persist pending setup and codes server-side; rotate tokenVersion/sessions; include `auth_time` and `amr`; consume a hashed backup code atomically and fail closed.
- **Difficulty:** Medium
- **Production urgency:** Must fix before relying on 2FA for privileged/PHI access
- **Priority:** P1

### Finding S-008: Audit and access logs are best-effort, not immutable evidence

- **Severity:** High
- **Category:** logging / compliance
- **Affected files:** `backend/src/modules/audit/audit.service.ts:59-83`; `backend/src/lib/access-log.ts:17-46`; `backend/prisma/manual/immutable-logs.sql`; Railway migration config; admin audit call sites
- **Problem:** Audit/access-log write failures are swallowed. Immutable-log SQL is manual, allows UPDATE in parts, does not cover AuditLog, and is not deployed by Prisma migrations. Some actor resolvers omit real privileged roles.
- **Why it is dangerous:** PHI, money, admin, or security actions can succeed without durable evidence; logs may have null/incorrect actors and can be modified.
- **Safe fix:** Persist mandatory audit/outbox rows transactionally for sensitive mutations, retry/alert failed log delivery, deploy append-only DB roles/triggers through reviewed migrations, include AuditLog, and correct actor resolution.
- **Difficulty:** Large
- **Production urgency:** Must fix for regulated production
- **Priority:** P1

### Finding S-009: Capability tokens leak through URLs/logs and are stored raw

- **Severity:** High
- **Category:** token / logging / data exposure
- **Affected files:** patient upload, review invites, Brazil consent, and share-link routes/services; Fastify request logging
- **Problem:** Bearer tokens travel in query strings or paths; URLs are normally logged and persist in history/referrers. ShareLink and ReviewInvite store usable raw tokens. Public share can return clinical note and patient name.
- **Why it is dangerous:** Log, analytics, proxy, support, screenshot, browser-history, or DB disclosure becomes direct access.
- **Safe fix:** Store token hashes; redact tokenized query/path segments; exchange fragments or POST-body tokens for short server sessions; use short TTL, single-use, explicit no-referrer/no-store, and minimal returned data.
- **Difficulty:** Medium
- **Production urgency:** Fix before public capability links carry real PHI
- **Priority:** P1

### Finding S-010: Content Security Policy does not constrain scripts by default

- **Severity:** High
- **Category:** headers / XSS
- **Affected files:** `frontend/proxy.ts:30-64`; `frontend/next.config.ts:43-51`
- **Problem:** Baseline CSP contains only frame/object/base restrictions. Nonce `script-src` is feature-flagged off; public pages intentionally omit script policy. `connect-src`, `img-src`, `form-action`, and `default-src` are also absent.
- **Why it is dangerous:** A sanitizer/component/script-injection regression has little CSP containment, including on authenticated portals unless an optional deploy flag is correct.
- **Safe fix:** Ship an enforce-mode production CSP: nonce/strict-dynamic for dynamic portals, tested hash/nonce/PPR strategy for public pages, and explicit default/script/connect/img/font/style/form/frame directives. Add report-only rollout and reporting endpoint first.
- **Difficulty:** Large due to Next hydration/third parties
- **Production urgency:** Fix before production; do not enable untested on portals
- **Priority:** P1

### Finding S-011: Stored CSS policy permits containment escape and tracking

- **Severity:** High
- **Category:** XSS / CSS injection
- **Affected files:** backend HTML sanitizer `:59-125`; `frontend/lib/content/scope-blog-html.ts:74-78`; blog/service/health rich-content renderers
- **Problem:** Sanitizer accepts `<style>`, broad `class`/`id`/`style`, vulnerable tags, and raw CSS. Frontend wraps CSS with regex `@scope`, not Shadow DOM or a CSS parser.
- **Why it is dangerous:** Crafted CSS can close scope, load external resources, overlay/deface the page, obscure controls, or track visitors.
- **Safe fix:** Prefer disallowing style blocks. If authored layouts are required, parse CSS and allow only specific properties/selectors/at-rules and safe URLs, or render in a sandboxed iframe/true Shadow DOM with a strict CSP.
- **Difficulty:** Medium–Large
- **Production urgency:** P1 if any editor/import source is not fully trusted
- **Priority:** P1

### Finding S-012: Frontend holds the symmetric JWT signing secret

- **Severity:** Medium–High
- **Category:** secrets / architecture
- **Affected files:** `frontend/proxy.ts:70-76,103-122`; backend JWT signer/verifier
- **Problem:** Frontend needs `AUTH_JWT_SECRET` to verify HS256 cookies locally.
- **Why it is dangerous:** A frontend service/env compromise can mint backend SUPER_ADMIN tokens, expanding the signing trust boundary.
- **Safe fix:** Sign with Ed25519/RS256 private key only in backend and give frontend a public verification key/JWKS, or use cached backend introspection.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** P1

### Finding S-013: Cookie and CSRF policy relies too heavily on SameSite

- **Severity:** Medium
- **Category:** cookie / CSRF / session
- **Affected files:** `backend/src/utils/auth-session.ts:82-97`; env cookie/domain settings; state-changing API routes
- **Problem:** Secure depends only on production mode, session lifetime defaults to seven days, optional parent Domain is allowed, and no central Origin/Fetch-Metadata/CSRF-token check was found.
- **Why it is dangerous:** HTTPS staging can issue insecure cookies; sibling subdomains are same-site; long-lived privileged cookies increase replay exposure.
- **Safe fix:** Secure on all non-local HTTPS, host-only `__Host-` cookie when feasible, strict Origin/Fetch-Metadata or CSRF token on writes, capped TTL, shorter privileged sessions, and session rotation after sensitive events.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** P1

### Finding S-014: Authenticated PHI responses lack a universal no-store policy

- **Severity:** Medium–High
- **Category:** privacy / caching
- **Affected files:** forms, prescriptions, consultations, patient profiles, admin/doctor JSON routes; Next proxy responses
- **Problem:** Some downloads set `private, no-store`, but many PHI JSON endpoints do not.
- **Why it is dangerous:** Browser/shared intermediaries or future proxy changes may cache cookie-auth medical data.
- **Safe fix:** Add a backend `onSend` default of `Cache-Control: private, no-store` for authenticated/account/admin/doctor/corporate/capability routes, with a small explicit public caching allowlist. Preserve through Next proxies.
- **Difficulty:** Small
- **Production urgency:** Fix before production PHI
- **Priority:** P1

### Finding S-015: Medical access logs trust spoofable forwarded IP data

- **Severity:** Medium
- **Category:** logging / audit
- **Affected files:** `backend/src/utils/guard-medical-read.ts:123-127`; `backend/src/modules/audit/audit.service.ts:24-31`; Fastify trustProxy config
- **Problem:** Medical guard manually trusts the leftmost raw `X-Forwarded-For`; the audit service correctly uses `request.ip` with `trustProxy: 1`.
- **Why it is dangerous:** Direct/spoofed chains can poison audit attribution.
- **Safe fix:** Use only `request.ip`/Fastify-normalized chain and test the single trusted Railway proxy topology.
- **Difficulty:** Small
- **Production urgency:** Fix soon
- **Priority:** P1

### Finding S-016: Reset and verification tokens are not atomically single-use

- **Severity:** Medium
- **Category:** authentication / token
- **Affected files:** `backend/src/modules/auth/auth.service.ts:511-543,565-582`
- **Problem:** Consumers read a valid token then perform a later unconditional update; concurrent requests can pass the first check. Password reset does not reliably revoke sessions.
- **Why it is dangerous:** Single-use guarantees can fail under concurrency and old sessions remain active after password reset.
- **Safe fix:** Conditional `updateMany` or serializable transaction that claims only `usedAt:null` and unexpired token, verifies affected row count, then changes password and increments tokenVersion atomically.
- **Difficulty:** Medium
- **Production urgency:** Fix soon; session revocation portion P1
- **Priority:** P1

### Finding S-017: Scheduled account deletion never completes

- **Severity:** High privacy/compliance
- **Category:** privacy / retention
- **Affected files:** `backend/src/modules/auth/auth.service.ts:309-323`; deletion schedule/cancel routes
- **Problem:** The service explicitly notes that the 30-day purge is not implemented; expired accounts are blocked but data remains.
- **Why it is dangerous:** Data-subject deletion promises and minimization obligations may not be met; object storage and downstream providers retain data indefinitely.
- **Safe fix:** Durable purge/anonymization workflow with jurisdiction/legal retention map, object deletion, payment/audit exceptions, retries, evidence, and admin reconciliation.
- **Difficulty:** Large
- **Production urgency:** Legal/compliance review before production
- **Priority:** P1

### Finding S-018: Object-storage encryption and retention are not provable from the repo

- **Severity:** Medium–High
- **Category:** file upload / secrets / infrastructure
- **Affected files:** object-storage service; patient/clinical/generated-document prefixes; deployment runbooks
- **Problem:** `PutObject` sets content type but no SSE/KMS option; bucket private policy/default encryption/object lock/lifecycle/access logging are external and unverified.
- **Why it is dangerous:** Medical PDFs/uploads may lack required encryption, least privilege, retention, and access evidence if infrastructure is misconfigured.
- **Safe fix:** Require private bucket, TLS, SSE-KMS/default encryption, prefix-scoped credentials, lifecycle/retention, versioning/object lock where legally appropriate, access logs, and an automated deployment verification.
- **Difficulty:** Medium / infrastructure
- **Production urgency:** Verify before PHI production
- **Priority:** P1

### Finding S-019: Local secrets and identity defaults need stronger governance

- **Severity:** Medium
- **Category:** secrets
- **Affected files:** ignored local env files; `backend/src/config/env.ts:245-256`; env examples
- **Problem:** Local files contain real-looking sensitive credentials, and a personal seed email appears in source. They were not found tracked, but workstation backups/support bundles can leak them.
- **Why it is dangerous:** Local/test credentials often become production-adjacent; identity defaults can create unintended privileged accounts.
- **Safe fix:** Rotate anything ever shared/backed up, use secret manager/short-lived test keys, remove personal source defaults, add pre-commit/CI secret scanning, and document workstation secret handling.
- **Difficulty:** Small
- **Production urgency:** Rotate S-001 immediately; review local credentials soon
- **Priority:** P1

### Finding S-020: Rate limiting can multiply by replicas or fail open

- **Severity:** Medium
- **Category:** API / abuse
- **Affected files:** `backend/src/app.ts:117-140`; auth/upload/messaging/payment/document routes
- **Problem:** Without Redis limits are per process; Redis errors use `skipOnError:true`. Some expensive routes rely only on global 300/min.
- **Why it is dangerous:** Attackers can distribute requests across replicas or provider outages; document generation, uploads, messaging, and payment sync can exhaust CPU/memory/provider quotas.
- **Safe fix:** Durable fail-closed limiter for auth/reset/2FA/capability issuance and expensive operations; per-user and per-resource limits; bounded job queues; monitoring and abuse alerts.
- **Difficulty:** Medium
- **Production urgency:** Fix expensive/sensitive routes before scale-out
- **Priority:** P1

### Finding S-021: Upload/document processing permits resource exhaustion

- **Severity:** High
- **Category:** file upload / API / DoS
- **Affected files:** `backend/src/app.ts:27,101-105`; patient/medical upload routes; doctor generated-document route; DOCX/HTML renderers; backend Nixpacks image
- **Problem:** Global JSON limit is 5 MB; multipart buffers files; some routes advertise 10 MB despite global 5 MB; document generation can launch LibreOffice/Chromium under the loose global rate limit and LibreOffice lacks a timeout.
- **Why it is dangerous:** Concurrent requests multiply memory and child-process use, reducing availability. Chromium runs with `--no-sandbox` in the combined API runtime.
- **Safe fix:** Lower global JSON limit, set route-specific rich-text limits, stream uploads with counters, align all size declarations, queue document jobs with strict per-user concurrency/timeouts, isolate worker and run sandboxed/non-root.
- **Difficulty:** Medium–Large
- **Production urgency:** Fix before opening uploads/document generation broadly
- **Priority:** P1

### Finding S-022: Readiness and graceful shutdown do not protect security-critical jobs

- **Severity:** Medium–High
- **Category:** deployment / availability
- **Affected files:** `backend/railway.json`; health route; `backend/src/server.ts`; scheduler; Prisma/Chromium lifecycle
- **Problem:** Railway probes a liveness endpoint that skips DB by default. No SIGTERM/SIGINT drain closes Fastify, scheduler, pool, or browser.
- **Why it is dangerous:** Traffic can reach DB-dead instances; rolling deploys can cut payment/notification/audit work and leave coordination uncertain.
- **Safe fix:** Separate bounded `/live` and `/ready`, implement graceful drain and stop handles, and move durable work to a queue/outbox.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** P1

### Finding S-023: Unauthenticated payment sync permits abuse and enumeration

- **Severity:** Medium
- **Category:** payment / API / abuse
- **Affected files:** `backend/src/routes/payments.route.ts:197-220`
- **Problem:** Caller-controlled order/session IDs trigger DB and Stripe work under the broad global limit and expose found/not-found behavior.
- **Why it is dangerous:** Enables cost amplification, identifier probing, and provider quota pressure.
- **Safe fix:** Require authenticated order ownership or a short signed order/session proof; use a tight per-order/IP limiter and idempotent cached result.
- **Difficulty:** Medium
- **Production urgency:** Fix soon
- **Priority:** P1

### Finding S-024: Account enumeration and weak query validation remain

- **Severity:** Medium
- **Category:** validation / authentication
- **Affected files:** registration route; corporate route query handling
- **Problem:** Registration returns distinct conflict response for an existing email. Corporate status/search values are cast, unbounded, and unpaginated.
- **Why it is dangerous:** Attackers can enumerate accounts and use large/invalid queries for database work or noisy errors.
- **Safe fix:** After fixing S-002, return a uniform accepted/verification response; validate enum/max length, cursor paginate, and cap result size.
- **Difficulty:** Small
- **Production urgency:** Should fix soon
- **Priority:** P2

### Finding S-025: CI and runtime supply-chain controls are incomplete

- **Severity:** Medium
- **Category:** dependencies / CI / deployment
- **Affected files:** `.github/workflows/ci.yml`; Docker/Nixpacks configs; all manifests/lockfiles
- **Problem:** CI has useful type/lint/test/audit/drift checks but no production build, coverage threshold, E2E, SAST/CodeQL, secret scan, image scan/SBOM, or migration drift verification. Actions/base images use moving tags; backend runtime is broad and not explicitly non-root/minimal.
- **Why it is dangerous:** Secret regressions like S-001 and code/config vulnerabilities can pass normal CI; runtime CVE surface is larger than needed.
- **Safe fix:** Add build and targeted E2E, ≥80% meaningful coverage gate, gitleaks/TruffleHog, CodeQL/SAST, SBOM/image scan, clean-DB migration validation, SHA/digest pinning, backend multi-stage non-root/read-only runtime, and scheduled dependency review including moderate advisories.
- **Difficulty:** Medium–Large
- **Production urgency:** Hardening; secret scanning should be immediate
- **Priority:** P1/P2

### Finding S-026: WhatsApp/WaSender messaging carries patient and appointment data to a third party

- **Severity:** High
- **Category:** privacy / PHI / third-party data flow
- **Affected files:** `backend/src/lib/whatsapp/wasender.ts`; `backend/src/modules/automation/pre-payment-flow.service.ts:297-343,375-762`; `post-payment-flow.service.ts:132-139,446`; `appointment-update-notifications.service.ts:117-159,307,396`; `refund-notifications.service.ts`
- **Problem:** Booking, payment, update, refund, and reminder messages containing patient name, service name, appointment date/time, and phone number are sent through the WaSender third-party WhatsApp API. A `patientWhatsappConsent` flag is threaded through some pre-payment sends but consent gating is not uniform across all send sites, message content is not minimized, and no DPA/processor status, retention, or regional-transfer basis for WaSender is enforced or documented in the repository. WhatsApp itself is not a healthcare-grade channel in most operating jurisdictions.
- **Why it is dangerous:** Health-adjacent PII (person X has appointment for service Y at time Z) is disclosed to an unofficial WhatsApp API provider and to Meta's WhatsApp infrastructure, potentially without valid consent or processor agreements. Service names can directly reveal medical conditions.
- **Safe fix:** Enforce a single consent check inside `sendWhatsAppText` (fail closed when consent is absent); minimize content to a neutral notification plus a link into the authenticated portal; document/execute a DPA or replace WaSender with the official WhatsApp Business API under contract; add a per-country channel policy; log every send with consent evidence.
- **Difficulty:** Medium
- **Production urgency:** Legal/compliance review before production; content minimization can ship immediately
- **Priority:** P1

### Finding S-027: Meta Pixel tracks all routes, including portals, before consent

- **Severity:** High
- **Category:** privacy / GDPR / tracking
- **Affected files:** `frontend/app/layout.tsx:5,49-72`; `frontend/components/compliance/CookieBanner.tsx`
- **Problem:** A hard-coded Meta Pixel ID is injected in the root layout with `strategy="lazyOnload"` and a `<noscript>` image fallback. The root layout wraps every route group, so the pixel fires `PageView` on public pages, booking/checkout, and the authenticated account, admin, and doctor portals. `CookieBanner` persists a consent choice to `localStorage` (`gh-cookie-consent`), but nothing reads that choice to gate the pixel — it fires before and regardless of consent. Page URLs sent to Meta include service slugs that can reveal the medical condition a visitor is researching or booking.
- **Why it is dangerous:** Transmitting page-level browsing data from a healthcare service to Meta without prior consent violates ePrivacy/GDPR consent requirements and can constitute unlawful disclosure of health-adjacent data; firing inside authenticated portals additionally links identified patients to their visited clinical pages.
- **Safe fix:** Load the pixel only after explicit marketing consent (read the stored consent and subscribe to the banner's accept event); never mount it in `(auth)`, `(admin)`, or `(doctor)` route groups; move the pixel ID to configuration; strip or generalize sensitive path segments if tracking is retained; document the lawful basis. This also removes the `connect.facebook.net` preconnect cost flagged in performance finding P-015.
- **Difficulty:** Small–Medium
- **Production urgency:** Fix before production marketing traffic
- **Priority:** P1

## Prioritized Security Fix Roadmap

### Must Fix Before Production

1. **Revoke/rotate the Make.com webhook**, remove the source fallback, stop default PII export, and complete third-party data-flow/DPA review.
2. **Prevent guest record claiming before verified email ownership** and restrict pre-verification sessions.
3. **Replace admin gate/RBAC:** current DB state, tokenVersion, explicit capabilities, SUPER_ADMIN-only sensitive mutations, and deny-by-default country scoping for LOCAL_ADMIN.
4. **Revoke sessions on role/password/active/2FA/doctor-link changes** and compare current DB role to session claims.
5. **Route every clinical read through the central medical-access guard** with denial and audit integration tests.
6. **Hard-fail production compliance configuration** unless medical enforcement, privileged 2FA, break-glass reason, encryption, and audit controls are active.
7. Apply `private, no-store` by default to authenticated/PHI/capability responses.
8. Verify private encrypted object storage and remove capability tokens from logs/raw storage.

### Should Fix Soon

0. Consent-gate the Meta Pixel, remove it from authenticated portals, and enforce uniform WhatsApp consent with minimized message content and a WaSender DPA decision.
1. Redesign 2FA enrollment, per-session assurance, backup-code atomicity, and session rotation.
2. Make mandatory audit events durable/transactional and deploy append-only DB controls through migrations.
3. Roll out a tested enforce-mode CSP and remove/strictly parse stored CSS.
4. Replace HS256 shared secret with asymmetric signing/public verification.
5. Add Origin/Fetch-Metadata/CSRF controls, host-only secure cookies, and capped privileged session TTL.
6. Atomically consume reset/verification tokens and revoke sessions on password reset.
7. Implement GDPR deletion/anonymization and downstream/object-store cleanup evidence.
8. Isolate/rate-limit uploads and document rendering; add timeouts to every outbound call.
9. Authenticate and tightly rate-limit payment sync.

### Hardening Improvements

- Add pre-commit and CI secret scanning immediately.
- Add production build, E2E, CodeQL/SAST, coverage, SBOM/image scan, and clean-migration checks.
- Pin actions to commit SHA and images to digest; use a minimal non-root backend runtime.
- Add `/live`/`/ready`, graceful drain, durable job queue, and monitored provider deadlines.
- Monitor auth failures, role changes, tokenVersion changes, PHI access denials, capability use, audit-write failures, upload/document rate, and webhook anomalies.
- Review moderate/low dependency advisories regularly despite zero known findings at the executed threshold.

## Recommended Security Baseline

- **Input validation:** Zod at every route boundary; strict objects where appropriate; enum/length/page-size limits; validate file metadata and magic bytes; never rely on client-only validation.
- **Output encoding:** React escaping by default; sanitize rich HTML server-side with a narrow element/attribute policy; disallow raw CSS or parse with a strict allowlist; use CSP as defense in depth.
- **SQL/ORM query safety:** Prisma query APIs/parameterized raw SQL only; prohibit runtime unsafe raw methods; use transactions and atomic conditional updates for single-use/security state.
- **Authentication:** Verified email before historical ownership transfer; bcrypt/Argon2id policy; short privileged sessions; asymmetric signing; session rotation/revocation; recent-auth for sensitive changes.
- **Authorization:** Central current-DB session resolver; deny by default; explicit resource capabilities; country/tenant scope in every query; object ownership and medical consent/confidentiality checks server-side.
- **Rate limiting:** Shared durable store; IP + account + resource keys; fail closed for login/reset/2FA/token issuance; strict queues for uploads/documents/providers/payments.
- **CORS:** Exact HTTPS origins per environment; no wildcard with credentials; fail closed outside local development.
- **Cookies/CSRF:** Host-only `__Host-` HttpOnly Secure cookies where possible, appropriate SameSite, Origin/Fetch-Metadata or anti-CSRF token on writes, bounded lifetime and rotation.
- **Security headers:** HSTS, nosniff, referrer/permissions policy, frame/object/base lockdown, and enforce-mode CSP with explicit default/script/connect/img/font/style/form-action directives.
- **Secrets management:** No source fallbacks; secret manager/environment injection; startup validation; least privilege; rotation runbooks; CI/pre-commit scanning; asymmetric public verification where possible.
- **Logging:** Never log auth/capability tokens, raw URLs containing secrets, passwords, PHI bodies, tax IDs, or provider secrets. Mandatory PHI/money/admin audit must be durable, append-only, actor-correct, monitored, and retention-controlled.
- **Dependency updates:** Frozen deployment lockfiles, automated drift, audit all severities for review, Renovate/Dependabot policy, SBOM and image scanning, pinned actions/images, rapid critical-patch SLA.
- **Files/PHI:** Private S3, TLS, SSE-KMS/default encryption, prefix least privilege, signed short-lived access, no-store responses, malware scanning if document types expand, lifecycle/deletion evidence.

## Manual Verification Plan

1. Build an authorization matrix for PATIENT, DOCTOR, CORPORATE_ADMIN, LOCAL_ADMIN, ADMIN, and SUPER_ADMIN across every admin and clinical endpoint; automate allow/deny/country-scope tests.
2. Register an unverified test email that owns guest fixtures in a safe test DB; confirm no claim or access occurs until verification, then confirm atomic audited claim.
3. Demote/deactivate/reset-password/enable-2FA for a logged-in test admin; confirm every old cookie is rejected immediately.
4. Test central medical guard denial/allow/audit for each of the seven bypassed route families, including confidentiality, consent, country grant, folder scope, 2FA, and break-glass reason.
5. Verify rotated Make URL is absent from current source/history scanning and that invoice processing fails closed or queues when destination is unconfigured.
6. Inspect production response headers for public, authenticated, PHI JSON, download, and capability routes; validate CSP with report-only telemetry before enforcement.
7. Confirm logs redact query/path capability tokens and mandatory audit failure alerts page the operator.
8. Validate S3 encryption/private policy/lifecycle/access logging with automated cloud-policy checks.
9. Run backend integration tests against an isolated test Postgres; never use `ALLOW_LIVE_DB_TESTS=1` for normal verification.
10. Commission an independent, authorized penetration test focused on registration identity proofing, RBAC/tenant scope, session revocation, clinical access, capability links, CSRF/CSP, uploads, and payments.

## Final Notes

This was a source/configuration audit, not a penetration test. Production environment values, Railway/network topology, S3 policies, database roles/triggers, provider dashboards, and real log retention could not be verified from the repository. Backend runtime tests were intentionally blocked by the live-database safety guard, and browser testing was inconclusive on this host. Those areas require controlled runtime validation after the P0 code fixes.

The reports intentionally do not reproduce local secrets or provide exploit payloads. The Make.com URL is referenced by file/line only; rotate it before any history cleanup or wider report distribution.

No security fixes were applied during this audit.
