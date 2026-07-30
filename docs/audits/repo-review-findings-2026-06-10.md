# Repository Review Findings

**Repo:** `global-health-website` (pnpm monorepo)
**Stack:** Frontend — Next.js 16 App Router, React 19, Tailwind 4. Backend — Fastify 5, Prisma 7, PostgreSQL, Stripe, S3, SendGrid/Gmail, WhatsApp (WASender). Deployed on Railway (nixpacks + Dockerfile).
**Review date:** 2026-06-10
**Method:** Full-repo static review by 8 parallel specialized review passes (security/auth core, admin API routes, public/account/doctor API routes, database schema + services, public frontend, admin frontend, config/dependencies/tests/deploy, accessibility + performance), followed by manual verification of every Critical finding against the actual source. All Critical findings below were independently re-verified by reading the cited lines.

---

## 1. Executive Summary

This is a substantial, mostly well-engineered healthcare/telemedicine platform with genuinely good security fundamentals in places (bcrypt cost 12, hashed reset tokens, timing-safe comparisons, Stripe webhook signature verification with idempotency, HMAC patient-upload links, strict JWT validation, prod rejection of dev JWT secret). The service/route layering is consistent and most account/doctor endpoints scope queries correctly by the authenticated user.

However, the repo is **not production-ready for a healthcare product** in its current state. The review found **9 Critical**, **~30 High**, **~35 Medium**, and **~30 Low** issues.

The biggest risks:

1. **Unauthenticated PHI exposure (worst finding).** Patient-uploaded medical documents are stored under the `patient-upload/` S3 prefix, but the public media proxy (`/api/media/*`) only blocks the `clinical/` prefix — so every patient upload is downloadable by anyone who can construct the key, and the key contains the patient's email address in plaintext.
2. **Unauthenticated PII endpoint.** `GET /api/public/brazil-consent?appointmentId=...` returns patient full name, email, and consent data with no auth, no ownership check, and a broken in-process rate limiter.
3. **Stored XSS on every CMS-driven public page.** `RichBodySection` renders admin-authored HTML with `dangerouslySetInnerHTML` and no render-time sanitization (the blog and doctor-bio paths sanitize; this path does not). The admin doctor-detail page has the same hole for doctor bios.
4. **Fail-open auth patterns.** The cron endpoint is wide open if `CRON_SECRET` is unset; the Next.js proxy passes all `/account|/admin|/doctor` traffic through if `AUTH_JWT_SECRET` is missing; 50+ Next.js server actions in the admin area never re-check the caller's role.
5. **Operational fragility.** Production schema is defined by three diverging sources (migrations + runtime DDL in `ensure-schema.ts` + historical `db push` drift), there is **no CI at all**, production deploys install with `--no-frozen-lockfile`, and an unguarded `DROP SCHEMA public CASCADE` script sits one wrong env var away from total data loss.

Most urgent fixes (do these first, in order): block the `patient-upload/` prefix on the media route, lock down the brazil-consent GET, make the cron gate fail closed, sanitize `RichBodySection` and the admin bio render, guard `reset-railway-db.js`, rotate the credentials listed in §7.1, and add minimal CI.

---

## 2. Review Scope

| Area | Reviewed | Notes |
|---|---|---|
| Frontend (public site, account, doctor portal) | ✅ | ~271 ts/tsx files in `frontend/app` + `frontend/src` equivalents, plus `components/`, `lib/`, `locales/` |
| Frontend (admin CMS) | ✅ | All of `frontend/app/(admin)/**` |
| Backend API routes | ✅ | All ~75 `backend/src/routes/*.route.ts` files |
| Authentication & authorization | ✅ | `auth.service.ts`, `admin-auth`, JWT/cookie handling, `proxy.ts`, admin token fallback |
| Database logic | ✅ | `schema.prisma` (46 models, 20 enums), 24 migrations + 1 pending, `ensure-schema.ts`, service-layer queries |
| Environment / configuration | ✅ | `env.ts`, `.env.example` (both), local `.env` files (names + cross-check only) |
| Dependencies | ✅ | Both `package.json` files, lockfile presence/duplication, suspicious packages |
| Tests | ✅ | 30 backend test files, 1 frontend unit test, 2 Playwright e2e specs |
| Build / deployment | ✅ | `nixpacks.toml` (root + backend), `frontend/Dockerfile`, `railway.toml`, `docker-compose.yml`, postinstall scripts |
| Documentation | ✅ (sampled) | `README.md`, `docs/` (sampled for staleness; not every doc read line-by-line) |
| Security | ✅ | Dedicated audit pass — see §7 |
| Performance | ✅ | Static analysis — see §13 |
| Accessibility | ✅ | Static analysis — see §14 |
| Error handling | ✅ | Covered per-route/per-component in §3–§6 |
| Code quality | ✅ | See §15 |

**Skipped (and why):** `node_modules/`, `.pnpm-store/`, `frontend/.next/`, `backend/dist/` (generated/build output); `pnpm-lock.yaml` internals (generated — only structure/duplication checked); `backups/` (gitignored snapshots); `frontend/public/**` binary assets (only sizes checked); `docs/admin-portal-reference.html` (1.8 MB generated reference dump); `Templates/` (binary DOCX templates — sync script reviewed instead); `.claude/`, `.agents/`, `.vscode/`, `skills-lock.json` (tooling config, not product code); `scripts/screenshots/` output. Some long validation-schema files were structurally reviewed rather than line-by-line — flagged in §16.

---

## 3. Critical Issues

### C1. Patient medical uploads are publicly downloadable (PHI breach)

- **Files:** `backend/src/routes/patient-upload.route.ts:104`, `backend/src/routes/media-public.route.ts:30`
- **Severity:** Critical
- **Problem:** Uploads are stored as `` storageKey = `patient-upload/${verified.email}/${randomUUID()}-${safeName}` ``. The public media proxy blocks only the `clinical/` prefix:
  ```ts
  if (key.startsWith("clinical/")) {
    return reply.status(403).send(errorResponse("This document requires authentication"));
  }
  ```
  `patient-upload/` is not blocked, so `GET /api/media/patient-upload/<email>/<uuid>-<filename>` serves patient medical documents to anyone, unauthenticated, with a 1-year immutable cache header. The patient's email is embedded in the path, making key construction far easier than guessing a UUID alone.
- **Why it matters:** Direct unauthenticated exposure of patient health information (GDPR Art. 9 / HIPAA-class data). The email-in-path also leaks PII into URLs, logs, and caches.
- **Verify:** Upload a file via a patient-upload link, note the returned `storageKey`, then fetch `GET /api/media/<storageKey>` with no cookies — it returns the file.
- **Fix:**
  ```ts
  // media-public.route.ts
  const BLOCKED_PREFIXES = ["clinical/", "patient-upload/"];
  if (BLOCKED_PREFIXES.some((p) => key.startsWith(p))) {
    return reply.status(403).send(errorResponse("This document requires authentication"));
  }
  ```
  Additionally: move new uploads under `clinical/patient-upload/…`, stop embedding the raw email in the key (use the userId or a hash), add an authenticated download route for these files, and audit existing S3 objects under `patient-upload/` for prior exposure. Add rate limiting to `/api/media/*`.

### C2. `GET /api/public/brazil-consent` returns patient PII with no authentication

- **File:** `backend/src/routes/brazil-consent.route.ts:52–66`
- **Severity:** Critical
- **Problem:** The public GET accepts an `appointmentId` and returns `fullName`, `email`, and consent-form data for that appointment. No auth, no ownership check, no signed token, and the only rate limiting is an in-process `Map` (see C3-adjacent finding H8) that resets on restart and is per-instance.
- **Why it matters:** Anyone holding (or brute-forcing/leaking) an appointment ID retrieves patient identity data. Appointment IDs travel in URLs, emails, and logs — they are identifiers, not secrets.
- **Verify:** `curl "https://<backend>/api/public/brazil-consent?appointmentId=<any-known-id>"` with no cookies returns the patient's name and email.
- **Fix:** Gate the route with a short-lived HMAC token issued at booking time (the codebase already has exactly this pattern in `patient-upload-link.service.ts`) or require login + `appointment.userId === auth.userId`. Add real rate limiting via `@fastify/rate-limit`.

### C3. Cron endpoint authentication fails open when `CRON_SECRET` is unset

- **File:** `backend/src/routes/cron-abandoned-cart.route.ts:27–30`
- **Severity:** Critical
- **Problem:**
  ```ts
  const expected = env.CRON_SECRET;
  if (expected && provided !== expected) {
    return reply.status(401).send(errorResponse("Invalid cron token"));
  }
  ```
  If `CRON_SECRET` is missing or empty, the guard is skipped entirely and the endpoint is public. `CRON_SECRET` is **not** listed in `backend/.env.example` (see §11), so a fresh deployment is open by default. The same pattern guards `reminders.route.ts`.
- **Why it matters:** Unauthenticated callers can trigger mass abandoned-cart emails to all patients (spam, cost, patient enumeration via timing/volume).
- **Verify:** Unset `CRON_SECRET`, then `curl -X POST http://localhost:4000/api/cron/abandoned-carts` succeeds with no token.
- **Fix:** Fail closed:
  ```ts
  if (!expected) return reply.status(503).send(errorResponse("Cron not configured"));
  if (provided !== expected) return reply.status(401).send(errorResponse("Invalid cron token"));
  ```
  Make `CRON_SECRET` required in `env.ts` and add it to `.env.example`.

### C4. Stored XSS on all CMS-rendered public pages (`RichBodySection`)

- **File:** `frontend/components/sections/RichBodySection.tsx:64` (used by ~6 public pages: home, doctors index, general/specialist consultation, prescriptions, health tests)
- **Severity:** Critical
- **Problem:** `dangerouslySetInnerHTML={{ __html: trimmed }}` renders the backend `page.body` field as-is. The comment says "the admin editor sanitizes HTML before saving" — that is write-time trust, not render-time enforcement. The blog path uses `scopeBlogHtml()` (sanitize-html) and the doctor bio path uses `sanitizeDoctorBioHtml()`; this path uses nothing.
- **Why it matters:** Any payload that reaches `page.body` (sanitizer bypass on save, direct DB write, future import/migration, compromised admin) executes in every visitor's browser. Defense-in-depth requires sanitizing at render.
- **Verify:** Set a page body in the DB to `<img src=x onerror=alert(1)>` and load the page.
- **Fix:** Sanitize at render: `dangerouslySetInnerHTML={{ __html: scopeBlogHtml(trimmed) }}` (or a dedicated page-body sanitizer with the same allowlist used on save).

### C5. Stored XSS in admin session via unsanitized doctor bio

- **File:** `frontend/app/(admin)/admin/doctors/[id]/page.tsx:306`
- **Severity:** Critical
- **Problem:** `dangerouslySetInnerHTML={{ __html: d.bio }}` with no sanitization. The helper `sanitizeDoctorBioHtml` exists in `frontend/lib/content/doctor-bio-format.ts` and is used on the public profile — but not here.
- **Why it matters:** A bio payload (e.g., written by a compromised doctor account or slipping past backend write-sanitization) executes under an **admin** session cookie → full CMS takeover, including patient data access.
- **Verify:** Store `<img src=x onerror=alert(document.cookie)>` in a doctor bio and open the admin doctor detail page.
- **Fix:** `dangerouslySetInnerHTML={{ __html: sanitizeDoctorBioHtml(d.bio) }}` — one import, one call.

### C6. Hardcoded shared credential in committed seed script, with a guard that doesn't protect production data

- **File:** `backend/scripts/seed-test-accounts.ts:26–28`
- **Severity:** Critical
- **Problem:** `const PASSWORD = "GHAdmin2026X7qL9!";` is committed (and in git history) and shared by `doctor@globalhealthonline.com` and `patient@globalhealthonline.com`. The script's `NODE_ENV === "production"` guard is ineffective in practice because the documented local workflow (`backend/.env.example`) points `DATABASE_URL` at the **Railway production database** while `NODE_ENV=development` — the guard checks the label, not the target.
- **Why it matters:** Anyone with repo access knows a doctor and patient login that plausibly exists on the production database. The doctor account grants access to patient consultations.
- **Verify:** `git log --all -S "GHAdmin2026X7qL9" --oneline`; attempt login with those credentials against the deployed app.
- **Fix:** Read passwords from env vars; add a hostname guard that refuses to run when `DATABASE_URL` matches `rlwy.net` / `railway.internal` unless `FORCE_SEED=true`; rotate/delete these accounts wherever they exist.

### C7. Unguarded `DROP SCHEMA public CASCADE` script aimed at the remote DB

- **File:** `backend/scripts/reset-railway-db.js:12`
- **Severity:** Critical (data-loss class)
- **Problem:** Executes `DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; …` against whatever `DATABASE_URL` is in the environment. No confirmation prompt, no env check, no hostname allowlist, no dry-run — and the local `.env` workflow keeps `DATABASE_URL` pointed at the Railway production proxy.
- **Why it matters:** One accidental invocation destroys every patient record, appointment, payment, and document reference. There is no in-repo backup/restore process.
- **Fix:** Require an explicit `--yes-i-mean-it` flag, print the target host and require it to match an allowlist (or `FORCE_DB_RESET=true`), and refuse known production hosts.

### C8. Production schema has three diverging sources of truth (migration drift + runtime DDL)

- **Files:** `backend/src/db/ensure-schema.ts` (13 runtime patches applied on every boot), `backend/prisma/migrations/` (24), `backend/prisma/pending-migrations/` (1)
- **Severity:** Critical (integrity/operational)
- **Problem:** `ensure-schema.ts`'s own comment admits production drift from past `prisma db push` runs and that adding proper migrations is "risky." Schema state is now defined by `_prisma_migrations` **plus** an `_EnsureSchemaPatches` table **plus** historical pushes. The runtime patches execute multi-statement SQL where a partial failure is logged but **not rethrown** — e.g., the `ServiceDoctor` patch can create the table and silently skip its indexes. A `prisma migrate reset` in any environment now produces a schema that differs from production.
- **Why it matters:** Silent schema divergence between environments; deploys that work in dev and fail (or behave differently) in prod; missing indexes/constraints that nobody can detect from the migrations directory.
- **Fix:** Snapshot prod schema, baseline it (`prisma migrate resolve --applied` per patch), convert every `ensure-schema.ts` patch into a real migration, then delete `ensure-schema.ts`. Apply the pending `drop_legacy_imcRegistration` migration deliberately.

### C9. Live secrets present in local env files tied to production infrastructure — rotate

- **Files:** `backend/.env`, `frontend/.env.local` (both correctly gitignored, **not** committed)
- **Severity:** Critical (exposure/rotation advisory)
- **Problem:** The on-disk env files contain real credentials for the **production** Railway Postgres (TCP proxy URL with password), S3 access key/secret, Stripe test secret + webhook secret, a Deepgram API key, and a weak seed admin password (`ChangeMe!Admin123`) for `kinghassaan99@gmail.com`. These were readable by every tool and agent run against this repo (including this review).
- **Why it matters:** Local dev machines are routinely the weakest link; these credentials gate production patient data. The seed admin password is guessable by pattern.
- **Fix:** Rotate the Postgres password, S3 keys, Stripe webhook secret, and Deepgram key; change the admin password; stop pointing local dev at the production database (use the provided `docker-compose.yml` Postgres — that's what it's for).

---

## 4. High Severity Issues

### Backend — authorization, exposure, correctness

| # | File | Problem | Impact | Fix |
|---|---|---|---|---|
| H1 | `backend/src/routes/orders.route.ts:341–395` | Public `GET /api/orders/:id/receipt` returns `fullName` + financial totals with no auth (guest-checkout support). CUID entropy is the only protection; comment claims "non-PII" but name is PII. | Patient name + purchase amounts (implying treatments) leak via shared/logged URLs. | Strip `fullName`; require a short-lived receipt token issued at checkout; rate-limit. |
| H2 | `backend/src/routes/share-links.route.ts:138–190` | Public share-link returns full consultation **plus** patient `email`, `phone`, `dateOfBirth`. No rate limit. | A forwarded/leaked link exposes identity + clinical PHI beyond what a recipient clinician needs. | Remove contact/DOB fields from the public payload; add rate limiting; show expiry. |
| H3 | `backend/src/routes/cart.route.ts:745–758` | GDPR consent enforcement sits inside `if (settings) {…}` — if the country's `BookingSetting` row is missing, consent checks are skipped entirely. | Processing personal data without recorded consent (GDPR Art. 7). `appointments.route.ts` does this correctly; cart doesn't. | Treat missing `BookingSetting` as 422 misconfiguration; enforce consent unconditionally. |
| H4 | `backend/src/routes/review-invites.route.ts` | Response returns the raw invite token (`okResponse({ invite })`). | Any logging/storage of the response captures a valid token → review fraud/impersonation. | Return only `{ id, appointmentId, expiresAt }`. |
| H5 | `backend/src/modules/review-invites/review-invite.service.ts` | Email/WhatsApp sends are awaited with no catch **after** the invite row is written; a WhatsApp failure throws, caller may retry → duplicates; also `countryCode === "br"` is case-sensitive. | Lost/duplicated invites; Brazil-specific behavior silently skipped on `"BR"`. | `.catch(log)` both sends; normalize country code casing. |
| H6 | `backend/src/routes/patient-upload.route.ts:32–131` | No rate limit on token validation or upload (global rate limiting is `global: false`). | Token brute-force; S3 bandwidth/storage flooding on a medical-document endpoint. | Per-route `config: { rateLimit: … }` keyed by IP+token. |
| H7 | `backend/src/routes/media-public.route.ts` | No rate limit on the public media proxy (1-year cache headers, serves all non-`clinical/` keys). | Enumeration/bandwidth abuse; compounds C1. | Add per-IP rate limit (~200/min). |
| H8 | `backend/src/routes/brazil-consent.route.ts:22` | Hand-rolled in-process `Map` rate limiter — per-instance, resets on restart, keyed on spoofable `x-forwarded-for`. | Useless under horizontal scaling; bypassable by header spoofing. | Use `@fastify/rate-limit` (already a dependency) with proper `trustProxy`. |
| H9 | `backend/src/app.ts:48–50` | CORS returns `callback(null, true)` (allow all origins) whenever `NODE_ENV !== "production"` — including internet-reachable staging/preview. | Any site can make credentialed cross-origin calls against non-prod deployments holding real-ish data. | Enforce the allowlist everywhere except genuine localhost dev. |
| H10 | `backend/src/modules/audit/audit.service.ts:26–33` | Audit IP taken from raw `x-forwarded-for` with no `trustProxy` configuration. | Any client spoofs its audit-log IP → forensics defeated. | Set Fastify `trustProxy` and use `request.ip`. |
| H11 | `backend/src/routes/admin-users.route.ts:188–280` | Role change, deactivation, and admin password-reset record **no audit entries**; same gap for PHI edits in `admin-patient-profile.route.ts:104–119` (only alert fields audited) and role-upgrade in `admin-doctors.route.ts:270–276`. | Privilege escalation and PHI edits leave no trace — compliance failure on a medical platform. | `recordAudit` on every mutating admin action (role/password/PHI). |
| H12 | `backend/src/routes/admin-media-upload.route.ts:50–53` | MIME type trusted from the client multipart header; no magic-byte check. | HTML/SVG-as-image upload → stored XSS depending on serving path. | Verify magic bytes (`file-type` package) before accepting. |
| H13 | `backend/src/modules/doctors/doctors.service.ts` (purge path, via `admin-doctors.route.ts:369`) | Hard doctor purge with no guard for existing appointments; cascade behavior risks deleting/orphaning medical history. | Irreversible loss of consultation history. | Refuse purge when `appointment.count > 0` (409); prefer soft-delete. |
| H14 | `backend/src/modules/appointments/appointments.service.ts:704–740` | `scheduleAppointment` builds a dynamic `SET ${sets.join(", ")}` string passed to `$queryRawUnsafe`. Values are parameterized and column names are currently hardcoded — **not injectable today** — but one careless refactor (mapping input keys into `sets`) creates SQL injection with no compile-time guard. Six more `$queryRawUnsafe` call sites in the same file have no dynamic need at all. | Injection-one-refactor-away in PHI-handling code. | Replace with `prisma.appointment.update()` / `Prisma.sql` templates. |
| H15 | `backend/src/modules/appointments/appointments.service.ts:569–628` + `auth.service.ts:246–266` + `assets.service.ts:90–103` + `doctor-reports.route.ts:113–116` + `admin-orders` list | Unbounded queries: `listAppointmentsForUser` (raw SQL, no LIMIT), `exportUserData` (all appointments + payments), `listAssets` (full table + full relation includes), doctor-reports distinct-patient `findMany`, admin orders list (no pagination, see H22). | Memory blowups / slow responses / DoS vectors as tables grow. | Add pagination or hard caps (`take`), use `groupBy` for counts. |
| H16 | `backend/prisma/schema.prisma` — `Appointment` model | No indexes on `userId`, `email`, `doctorId`, `status`, `stripeSessionId` (only `@@index([clinicId])`). Every hot query path on the biggest table is a sequential scan. Also missing: GIN on `Order.appointmentIds`, `PasswordResetToken.userId`, `BlogPost(countryId,status,locale)`, `Faq(...)`, `DoctorSpecialty(specialtyId)`, `DoctorCountry(doctorId)`. | Performance cliff as data grows; webhook lookups scan. | Add the indexes via a real migration. |
| H17 | `backend/prisma/schema.prisma` — `Appointment.status String`, `Order.paymentStatus String`, `consultationType String` | Status columns are free-text strings while sibling models use enums; raw-SQL updates bypass the app-level transition guard entirely (`appointments.service.ts:526`). `MedicalNote.createdByDoctorId` has **no foreign key**. | Corrupt states writable; orphaned clinical notes; integrity unenforced at the DB. | Introduce enums + FK with `ON DELETE RESTRICT` via migration. |
| H18 | `backend/prisma/schema.prisma` — `PatientProfile` (`nationalIdNumber`, `passportNumber`, `taxIdNumber`, alerts), `Appointment` address fields | Government IDs and PHI stored as plaintext columns. | Full PHI exposure on any DB compromise/backup leak. | Application-layer encryption (AES-256-GCM, KMS key) for identifier columns; document the decision either way. |

### Frontend

| # | File | Problem | Impact | Fix |
|---|---|---|---|---|
| H19 | `frontend/proxy.ts:51–59, 96, 121, 146` | When `AUTH_JWT_SECRET` is unset, `resolveSession` returns `misconfigured` and **all** guards `return NextResponse.next()` — silent pass-through for `/account`, `/admin`, `/doctor`. Page-level server checks are then the only line of defense. | A single missing env var removes the edge auth layer with zero signal. | Log loudly; in production return 503/redirect to login instead of `next()`. |
| H20 | `frontend/app/(admin)/**` — ~50 `"use server"` actions (e.g. `blog/new/page.tsx`, `users/[id]/page.tsx:61–121`, `appointments/[id]/page.tsx:104–232`) | Server actions are public HTTP endpoints; none re-check `getServerAuthUser()`/role — they rely solely on the backend rejecting the forwarded cookie. The layout's render-time check does not protect action invocation. | Frontend role boundary not independently enforced; any backend-auth edge case (token fallback enabled on staging — see H27) becomes a full admin mutation hole. | Add a shared `requireAdminAction()` called first in every action. |
| H21 | `frontend/app/(admin)/admin/appointments/new/page.tsx:194–202` + `[id]/page.tsx:82–87` | Manual-booking redirect puts the patient's **temp password** and Stripe payment URL in the query string → server access logs, browser history, Referer. | One-time patient credential persisted in infrastructure logs. | Pass via ephemeral server-side store / signed one-shot cookie; never in URLs. |
| H22 | `frontend/app/(admin)/admin/orders/page.tsx:12–13` + `frontend/lib/api/cart-server.ts:121–141` | Orders list fetches **all** orders (no pagination params) and casts `unknown[]` → `AdminOrderRow[]` with no validation. | Unbounded payloads + runtime crashes on any API shape change. | Add page/pageSize params end-to-end; validate or type the response. |
| H23 | `frontend/app/error.tsx:37` | Root error boundary renders `error.message` verbatim to users; it is the **only** error boundary in the app (none under `(site)`, `(auth)`, `(doctor)`). | Internal/back-end error details disclosed to end users. | Generic message in UI; log the real error server-side. Add per-group `error.tsx`. |
| H24 | `frontend/app/layout.tsx:54–57` | `<html lang="en">` hardcoded for a 6-locale site; proxy already stamps `x-gh-locale`. | Wrong language announced to screen readers (WCAG 3.1.1); SEO/hreflang trust hit. | Read the header in the root layout and set `lang` dynamically. |
| H25 | `frontend/app/(admin)/admin/newsletter/page.tsx:10–16` | Local `adminApiBase()` duplicate defaulting to `http://localhost:4000`; bypasses the shared `admin-api.ts` helper. | Silent empty results in misconfigured prod; drift when env handling changes. | Use the shared `adminApiFetch`. |
| H26 | `frontend/app/(admin)/admin/blog/_components/blog-form-parse.ts` | No server-side validation of `title` (can be empty), `slug` (no pattern), `status` (any string). HTML `pattern`/`minLength` are client-only. | Broken public URLs; undefined backend enum behavior. | Validate in the action before POSTing. |
| H27 | `frontend/lib/admin/admin-api.ts:19–23`, `admin-settings-api.ts:20–22` | Admin **token fallback** enabled whenever `NODE_ENV !== "production"` — the backend deliberately tightened this to `=== "development"` only (`backend/src/config/env.ts:124–133`); the frontend still has the old rule. | Staging/preview frontends silently send the Bearer-token admin bypass. | Mirror the backend rule exactly. |

### Build / dependencies / process

| # | File | Problem | Impact | Fix |
|---|---|---|---|---|
| H28 | `.github/workflows/` (absent) | **No CI.** No typecheck/lint/test gate anywhere; `playwright.config.ts` even references `process.env.CI`. | Healthcare platform deploys on push with zero automated verification. | Minimal workflow: frozen install → typecheck → lint → backend tests → frontend tests. |
| H29 | `backend/nixpacks.toml:40`, `frontend/Dockerfile:19` | Production installs run `pnpm install --no-frozen-lockfile`; plus **two lockfiles** exist (root workspace + `frontend/pnpm-lock.yaml`) that nothing keeps in sync. | Every deploy re-resolves `^` ranges — non-reproducible builds, supply-chain exposure (Stripe/Prisma/Fastify all caret-pinned). | Deploy from repo root with `--filter`, restore `--frozen-lockfile`, single lockfile. |
| H30 | `frontend/package.json:20` — `boneyard-js ^1.8.1` | Unused (zero imports), single-maintainer package that ships a **bin** and hard-depends on `playwright`. Classic risky-package shape sitting in production deps. | Unaudited code + Playwright pulled into every frontend install for nothing. | Remove; regenerate lockfiles. |
| H31 | `backend/package.json:13` ("test" script) | Hand-maintained list of 30 explicit test file paths. Currently in sync; any new `*.test.ts` not appended is silently never run. | False-green test runs guaranteed over time. | `node --import tsx --test "src/**/*.test.ts"`. |
| H32 | `README.md` (44 KB), `docs/launch-blockers.md` | Docs state payments are "not implemented", doctor portal "out of scope", admin CRUD "deferred" — all three are shipped and live in this repo. | Onboarding developers (and AI agents) make wrong decisions from authoritative-looking docs. | Rewrite the status sections; archive stale reports. |

---

## 5. Medium Severity Issues

| # | File | Problem | Impact | Fix |
|---|---|---|---|---|
| M1 | `backend/src/routes/admin-doctor-registrations.route.ts:45,68`; `admin-featured-doctor.route.ts:43,67` | Path params (`doctorId`, `countryId`, `id`) typed via Fastify generics only — no Zod validation before hitting Prisma. | Malformed/oversized strings reach the DB layer; inconsistent with the rest of the admin surface. | Add param schemas (the `admin-appointments` UUID schema is the model). |
| M2 | 5 admin route files (`admin-audit-log`, `admin-country-footer`, `admin-featured-doctor`, `admin-settings`, `admin-media-upload`) | Inline per-handler `verifyAdminAccess` instead of the `addHook("onRequest")` pattern used by the other 12 files. | A future handler added to these files can silently ship without auth. | Migrate all to the hook pattern. |
| M3 | `backend/src/routes/admin-appointments.route.ts:199–283` | Schedule PATCH does 3 separate reads then a write — no transaction; reschedule slot-release computed from stale data. | Race under concurrent admin edits. | Single read + write inside `prisma.$transaction`. |
| M4 | `backend/src/modules/services/services.service.ts:81–146`, `doctors.service.ts:57–77` | Translation upserts loop per-locale with two sequential DB calls each (N+1). | Slow admin saves; long-held connections. | Batch the locale check; `Promise.all`/transaction the upserts. |
| M5 | `backend/src/modules/settings/settings.service.ts:43–53` | `upsertSetting(key, value)` accepts any key string (callers currently hardcode keys). | Future settings-injection foot-gun (feature flags, pricing). | Allowlist writable keys in the service. |
| M6 | `backend/src/routes/admin-settings.route.ts:86` | Multi-key settings PATCH uses `Promise.all` — partial failure leaves mixed state. | Inconsistent settings after an error. | `prisma.$transaction`. |
| M7 | `backend/src/utils/auth-session.ts:46` | Auth cookie `sameSite: "lax"` with no CSRF tokens on state-changing routes. | Residual CSRF surface on top-level-navigation POSTs. | `strict`, or add CSRF tokens to mutations. |
| M8 | `backend/src/lib/email/send-email.ts:58` | Dev fallback `console.log`s recipient, subject, and 500 chars of body. | Patient emails/reset links land in retained log streams. | Structured logger at debug level; mask recipient. |
| M9 | `backend/src/routes/chat.route.ts:65–110` | GET message-poll endpoint has no rate limit (POST does). | DB pressure from broken pollers; enumeration hammering. | Add per-route limit (~120/min). |
| M10 | `backend/src/routes/cron-abandoned-cart.route.ts:53` | N+1 `findUnique` per cart candidate (≤100). | 100 sequential round-trips per cron run. | `include: { user: … }` on the initial query. |
| M11 | `backend/src/routes/account-payments.route.ts`; `doctor-actions.route.ts` (patients list) | Silent `take: 100` caps with no cursor and no `total`. | Records beyond 100 are invisible with no indication. | Cursor pagination + envelope with totals. |
| M12 | `backend/src/routes/reminders.route.ts` | Sequential `await send → await update` per reminder. | One hung email stalls the whole run. | `Promise.allSettled` sends + batched `updateMany`. |
| M13 | `backend/src/modules/generated-documents/generated-documents.service.ts:191–248, 295–358` | S3 `putObject` before DB row (orphaned objects on crash); send-loop marks `sentToPatient` per-doc outside a transaction (duplicate sends on retry). | Storage leaks; duplicate clinical emails. | DB row first with `PENDING` status; atomic batch update of sent state. |
| M14 | `backend/prisma/schema.prisma` — `CountryDomain @@unique([countryId, isPrimary])` | Constraint allows only one `isPrimary=false` row per country — a country cannot have two non-primary domains. Almost certainly wrong intent. | Data model blocks a legitimate state. | Partial unique index `WHERE "isPrimary" = true`. |
| M15 | `backend/prisma/schema.prisma` — `Review @@unique([provider, externalId])` | `NULL externalId` rows bypass uniqueness (Postgres NULL semantics) → internal reviews can duplicate freely. | Duplicate reviews. | Partial unique index `WHERE "externalId" IS NOT NULL`. |
| M16 | `DoctorTimeSlot` held-slot expiry | HELD slots only released when the availability endpoint happens to run its sweep. | Slots stuck held → lost bookings. | Background sweep or `heldUntil` filtering in every read. |
| M17 | `frontend/lib/api/public-api.ts:1–33` | Client components call the backend cross-origin via `NEXT_PUBLIC_API_URL` (patient upload, review rate, brazil consent) while everything else goes same-origin through Next API routes. | Breaks silently if backend CORS isn't configured for the public origin; inconsistent architecture. | Route through Next API handlers like the rest. |
| M18 | `frontend/app/(auth)/account/profile/page.tsx`, `security/page.tsx` | Locale read via `setState` inside `useEffect` (English flash, double render); `readClientLocale` duplicated in both files; missing `force-dynamic` consistency with sibling pages. | Visible locale flash; latent caching foot-gun. | `useState(() => readClientLocale())`; share the helper. |
| M19 | `frontend/app/(auth)/verify-email/page.tsx:35–66` | Stale closure — `locale` missing from effect deps; error messages always English. | Wrong-locale errors on a user-facing flow. | Resolve locale before the effect / fix deps. |
| M20 | `frontend/lib/content/scope-blog-html.ts:22–23` | Blog sanitizer allows `style` on `*` with no `allowedStyles`. | Cosmetic defacement (fixed overlays) via admin blog HTML. | Constrain styles like the doctor-bio sanitizer does. |
| M21 | `frontend/app/(admin)/admin/blog/_components/html-body-field.tsx:7–12` | Preview strips scripts with regex instead of running the real sanitizer. | XSS in admin's own browser via crafted preview (regex is bypassable). | Run `scopeBlogHtml` on the preview too. |
| M22 | `frontend/app/(admin)/admin/appointments/[id]/page.tsx:325–335` | `setPasswordUrl`/`paymentUrl` from query params rendered as `<a href>` without scheme validation. | `javascript:` URI vector in admin context. | Require `https://` prefix; add `rel="noopener noreferrer"`. |
| M23 | `frontend/app/(admin)/admin/users/[id]/page.tsx:106–109, 214` | Reset-password lacks an upper length bound server-side (bcrypt 72-byte truncation/DoS); role change has no confirmation step. | Edge-case auth weirdness; one-misclick privilege change. | Cap ≤128 server-side; confirm dialog on role change. |
| M24 | `frontend/app/(admin)/admin/services/new/page.tsx:118,195` et al. | Dropdown/duplicate-check fetches hardcode `pageSize: 200/250`. | Truncated lists → missed duplicates, incomplete pickers. | Warn when `total > items.length` or page through. |
| M25 | `frontend/next.config.ts` | No `headers()` block at all — no CSP, HSTS, X-Frame-Options, Referrer-Policy on the Next-served pages (helmet only covers the API). | Missing browser-side hardening on a healthcare site. | Add security headers (at minimum frame-ancestors, nosniff, referrer-policy). |
| M26 | `frontend/Dockerfile` | Single-stage image: devDependencies, source, and build cache shipped; no `output: "standalone"`. | Bloated images, slow deploys/cold starts. | Multi-stage + Next standalone output. |
| M27 | Root `package.json:14` + `docker-compose.yml` docs | `db:seed` script targets a backend script that doesn't exist (`backend` has no `db:seed`, no `prisma.seed` config). | Documented local bootstrap fails immediately. | Add the seed wiring or fix the docs. |
| M28 | `.gitignore:56` + `backend/scripts/sync-alex-brush-font.mjs` | The signature font TTF is gitignored and the sync script's sources don't exist on Railway → font silently absent in production documents. | Doctor signature renders wrong in prod PDFs/DOCX. | Commit the OFL-licensed font or fetch from a pinned, checksummed URL at build. |
| M29 | `backend/.env.example:10` | Suggests `NODE_TLS_REJECT_UNAUTHORIZED=0` (process-wide TLS off) for the prod-DB workflow. | Normalizes MITM-vulnerable config. | Remove; use `sslmode=require` with a CA cert. |
| M30 | Backend lint | No ESLint config exists for the backend; root `lint` only runs the frontend. | 154 files of auth/payment/PHI code never linted. | Add flat config + wire into root script. |
| M31 | `frontend/app/(site)/layout.tsx:72–74` | Footer fetch serialized **after** the parallel block although its input is already known. | One extra backend round-trip on every public page TTFB. | Move into the `Promise.all`. |
| M32 | `frontend/app/(site)/layout.tsx:23–24` + `lib/api/server-auth.ts:33` | Whole public site forced dynamic; every render does a `no-store` backend `/auth/me` even though `proxy.ts` already verified the JWT at the edge. | No static/ISR for public pages; backend load scales with page views. | Trust a proxy-stamped header for nav state on public pages. |
| M33 | `frontend/app/(admin)/admin/audit-log/page.tsx:229–235` | Pagination metadata rendered but **no prev/next links** — pages beyond 1 unreachable from the UI. | Compliance tool effectively limited to the latest 50 events. | Add the links (pattern exists in `admin/users`). |
| M34 | Webhook order-branch (`backend/src/routes/payments.route.ts:280–283`) | Order branch of `checkout.session.completed` relies only on an in-transaction status check for idempotency; appointment branch writes a `Payment` row with `stripeEventId`. | Replay protection asymmetric; depends on isolation level. | Record the event id for the order branch too. |
| M35 | `frontend/app/(admin)` rich-text editors | Built on deprecated `document.execCommand`. | Works today; guaranteed future breakage. | Plan migration to TipTap/ProseMirror; document the debt. |

---

## 6. Low Severity Issues

| # | File | Problem | Fix |
|---|---|---|---|
| L1 | `backend/src/utils/sanitize-html.ts:92` | `allowVulnerableTags: true` (for `<style>` in blog) — safe only while the Shadow-DOM render holds. | Cross-reference comment at the render site; lint guard on `dangerouslySetInnerHTML`. |
| L2 | `backend/src/app.ts:98` | Rate-limiter `skipOnError: true` silently disables limits if the store errors. | Alert when it fires; `false` for login/register. |
| L3 | `backend/src/modules/notifications/notify.service.ts` | `take: 20` admin-notification cap undocumented. | JSDoc the cap. |
| L4 | `backend/src/modules/appointments/appointments.service.ts` | Dead constant `APPOINTMENT_SELECT_COLUMNS`; columns duplicated inline per query. | Use it or delete it. |
| L5 | `backend/src/validations/admin-assets.schema.ts:61`, `admin-doctors.schema.ts:62` | ID param schemas accept any non-empty string (no max/format) — inconsistent with the UUID-validated appointment schema. | `.max(40)` or `.uuid()`. |
| L6 | `backend/src/routes/admin-blog.route.ts`, asset/page/country/health-test purge handlers | No audit events on create/update/delete/purge. | Add `recordAudit` calls. |
| L7 | `backend/src/modules/admin-orders/generate-order-meet-link.service.ts:192` | No timeout on the Google Meet API call. | `AbortSignal.timeout(10_000)`. |
| L8 | `backend/scripts/create-admin-user.js` | Password taken as argv → shell history/process list. | Env var or prompt. |
| L9 | `backend/package.json` | `@types/sanitize-html` in **dependencies**; deprecated `@types/handlebars` stub in devDeps; missing `packageManager` field. | Move/remove/add. |
| L10 | `frontend/app/(site)/layout.tsx:10`, `LanguageSwitcher.tsx:38`, doctor consultation-documents-modal:211 | Dead imports/variables/functions (ESLint warnings: 19 total). | Clean up; consider `--max-warnings 0`. |
| L11 | `frontend/app/(auth)/**` | No `generateMetadata` on login/register/reset pages (root metadata leaks onto them); no `noindex`. | Add titles + `robots: { index: false }`. |
| L12 | `frontend/tests/unit/runtime-routing-cases.ts` | Orphan helper not matching vitest's include pattern and imported by nothing — a "test" that never runs. | Rename to `*.test.ts` or delete. |
| L13 | `scripts/screenshot-prod.js` (+5 variants) | "prod" script targets `http://localhost:3000` and a deprecated route; six near-duplicate screenshot scripts. | Consolidate to one parameterized script. |
| L14 | `frontend/components/templates/BookingFormTemplate.tsx` (833 lines) | Dead — no importer (book-online deprecated). | Delete. |
| L15 | `frontend/components/layout/MobileNav.tsx:169–171` | Renders bare " clinic" when `activeCountry` undefined. | Conditional render. |
| L16 | `frontend/app/(site)/[country]/[lang]/cart/page.tsx:23–37` | 1 s `setInterval` re-render per consult item for countdowns. | Single shared ticker. |
| L17 | `frontend/components/compliance/CookieBanner.tsx:58` | Non-modal `role="dialog"` without focus management. | `role="region"` + existing `aria-live`. |
| L18 | `frontend/app/(admin)/admin/assets/_components/asset-path-with-upload.tsx:77` | Helper text lists SVG; `accept` (correctly) excludes it. | Fix copy. |
| L19 | `frontend/lib/admin/admin-api.ts:211` | `console.warn` per request on malformed cookies. | Debug-level only. |
| L20 | `docs/` | 1.8 MB `admin-portal-reference.html` committed; finished May-2026 audit artifacts mixed with live docs; `design-fetch*/` dirs linger. | Archive/remove; keep `DESIGN.md` + live plans. |
| L21 | `frontend/public/images/hero/homehero.png` (1.87 MB) + 5 `*-menu.png` (0.24–0.56 MB) | Unreferenced heavy assets shipped with every deploy. | Delete or optimize. |
| L22 | `frontend/app/(site)/[country]/[lang]/checkout/cancelled/page.tsx` | Missing `force-dynamic` (success page has it). | Add for consistency. |
| L23 | `backend/src/modules/shared/locale-support.ts` | `assertLocaleSupported` exists but is called inconsistently across translation writers. | Call it in every translation write path. |

---

## 7. Security Review

### 7.1 Rotate these credentials now

Found in on-disk env files (gitignored, but exposed to local tooling) and committed scripts:

- Railway production **Postgres password** (in `backend/.env` `DATABASE_URL`)
- **S3 access key + secret** (`backend/.env`)
- **Stripe webhook secret** (test) and secret key (test) (`backend/.env`)
- **Deepgram API key** (`backend/.env`)
- Seed admin `kinghassaan99@gmail.com` / `ChangeMe!Admin123` (`backend/.env`)
- Committed shared test credential `GHAdmin2026X7qL9!` for `doctor@` / `patient@globalhealthonline.com` (`backend/scripts/seed-test-accounts.ts:26` — in git history)

### 7.2 Checklist results

| Category | Verdict | Detail |
|---|---|---|
| Hardcoded secrets | ❌ FAIL | Seed password committed (C6); argv password in `create-admin-user.js` (L8) |
| Exposed API keys | ⚠️ | None committed; live keys on disk in env files (C9) |
| Insecure env handling | ❌ FAIL | `.env.example` missing `CRON_SECRET`, `ADMIN_API_TOKEN`, `GOOGLE_PLACES_API_KEY`, `AUTH_COOKIE_DOMAIN`, `AUTH_JWT_EXPIRES_IN`; contains dead `JWT_SECRET`/`JWT_EXPIRES_IN`/`FRONTEND_ORIGIN`; suggests `NODE_TLS_REJECT_UNAUTHORIZED=0` (M29); cookie-name default mismatch (`gh_auth` in code vs `gh_admin_session` in example) |
| Missing authentication | ❌ FAIL | C1 (media proxy serves patient uploads), C2 (brazil-consent), C3 (cron fail-open), H1 (receipt) |
| Missing authorization / IDOR | ✅ mostly PASS | Account/doctor routes consistently scope by `userId`/`doctorId` (verified across ~40 routes); the failures are the unauthenticated endpoints above, not cross-tenant reads |
| Broken role checks | ⚠️ | Backend role checks solid; frontend server actions don't re-check (H20); frontend token-fallback rule looser than backend's (H27) |
| SQL injection | ⚠️ | No live injection found; `$queryRawUnsafe` with dynamic SET is one refactor from one (H14) |
| XSS | ❌ FAIL | C4 (public CMS pages), C5 (admin bio), M20 (blog `style`), M21 (admin preview regex), M22 (`javascript:` href) |
| CSRF | ⚠️ | `sameSite: "lax"` cookie, no CSRF tokens (M7); server actions unprotected by role re-check compounds this (H20) |
| SSRF | ✅ PASS | No user-supplied URL fetches found |
| CORS | ⚠️ | Prod locked correctly; non-prod allow-all (H9) |
| File uploads | ⚠️ | Patient-upload HMAC link design is good; MIME trusted from client in admin upload (H12); upload prefix publicly served (C1) |
| Path traversal | ✅ PASS | `isSafeMediaKey` rejects `..`/`\`, strict regex; `clinical/` prefix gate works |
| Cookies / sessions | ✅ mostly PASS | httpOnly, secure-in-prod, strict JWT (issuer/audience/role); fallback fail-open in proxy (H19) |
| JWT | ✅ PASS | Dev-default secret hard-rejected in production (`env.ts:117–122`) |
| Rate limiting | ❌ FAIL | Global limiter is opt-in (`global: false`); missing on patient-upload (H6), media proxy (H7), brazil-consent (H8, broken hand-rolled), chat GET (M9), receipt/share-links (H1/H2); `skipOnError: true` (L2) |
| Input validation | ⚠️ | Zod used broadly and well; gaps: admin path params (M1), blog form server-side (H26), weak ID schemas (L5) |
| Sensitive data leaks | ❌ FAIL | C1, C2, H1, H2, H4 (raw invite token), H21 (temp password in URL), M8 (PII in logs), H23 (error.message to users) |
| Unsafe logging | ⚠️ | M8; `console.*` bypassing pino in audit service (H10 sibling) |
| Dependency vulnerabilities | ⚠️ | No known-CVE versions spotted (jsonwebtoken 9, handlebars 4.7.8 OK); risk is process: unfrozen installs (H29) + suspicious unused `boneyard-js` (H30) |
| Password handling | ✅ PASS | bcrypt cost 12; reset tokens stored as SHA-256 hashes; constant-time compares; enumeration-safe forgot-password |
| Webhooks | ✅ mostly PASS | Stripe signature verified on raw body; idempotency on appointment branch; order branch weaker (M34) |
| Admin route exposure | ✅ PASS (backend) | All admin routes verified behind `verifyAdminAccess` (12 via hook, 5 inline — M2 consistency risk) |
| Audit trail | ❌ FAIL | Role changes, password resets, PHI profile edits, purges unaudited (H11, L6); audit IP spoofable (H10) |
| PHI at rest | ⚠️ | Plaintext government IDs / addresses (H18); no RLS — app-layer only |

### 7.3 Done well (keep these)

bcrypt(12); hashed+constant-time reset/verification tokens; strict JWT claims validation and production rejection of the dev secret; Stripe webhook raw-body signature verification + `stripeEventId` uniqueness; HMAC-SHA256 patient-upload links with nonce/expiry/timing-safe compare; timing-safe admin token comparison; path-traversal-proof media keys; account-enumeration-safe forgot-password; production CORS denies by default; admin token fallback disabled outside development (backend side).

---

## 8. Frontend Review

Key findings (full detail in §3–§6): the two stored-XSS sinks (C4, C5); proxy fail-open (H19); 50+ unguarded server actions (H20); temp password in URL (H21); root error boundary leaking `error.message` and being the only boundary in the app (H23); hardcoded `<html lang="en">` (H24); admin orders unpaginated + `any`-cast (H22); newsletter page bypassing the shared API helper with a `localhost:4000` default (H25); blog form trusting client-side validation (H26); cross-origin `public-api.ts` calls inconsistent with the same-origin proxy architecture (M17); locale flash + duplicated `readClientLocale` + stale closure in verify-email (M18, M19); blog sanitizer allowing arbitrary `style` (M20); admin preview sanitized by regex only (M21); checkout total computed client-side for display (informational — Stripe amount is server-authoritative); cart mutation failures swallowed silently in `CartContext` (no user feedback); dead 833-line `BookingFormTemplate` (L14); 19 outstanding ESLint warnings, all in the dead-code/exhaustive-deps family.

TypeScript: `tsc --noEmit` passes. ESLint: 0 errors / 19 warnings. i18n: 6 locales wired with sane `en` fallback; the gaps are the `lang` attribute (H24) and locale-flash patterns (M18/M19).

## 9. Backend Review

Key findings (full detail above): unauthenticated endpoints C1–C3, H1–H2; GDPR consent skip (H3); review-invite token + send-failure handling (H4, H5); rate-limit coverage gaps (H6–H9); spoofable audit IP (H10); audit-trail gaps (H11); MIME trust (H12); unguarded purge (H13); `$queryRawUnsafe` debt (H14); unbounded queries (H15); N+1s (M4, M10); missing transactions (M3, M6, M13); inconsistent auth-enforcement style across admin route files (M2); sequential reminder processing (M12); silent caps (M11).

Strong points: consistent Zod validation on bodies; consistent `okResponse`/`errorResponse` envelope; ownership scoping verified correct across the account/doctor surface (~25 route files with zero IDOR findings); appointment status transition state machine with tests; atomic slot claim in `doctor-availability.service.ts`; Luxon DST-aware timezone handling with tests.

## 10. Database Review

Schema: 46 models, 20 enums, 24 migrations + 1 pending, 13 runtime DDL patches. Key findings: three-source schema drift (C8); missing indexes on the hottest table (H16); string-typed status columns + missing `MedicalNote` FK (H17); plaintext PHI identifiers (H18); broken `CountryDomain` uniqueness (M14); NULL-bypassed `Review` uniqueness (M15); HELD-slot expiry only swept opportunistically (M16); S3-write-before-DB-row in document generation (M13); webhook idempotency asymmetry (M34). Money is stored as integer cents throughout — correct. `Payment.stripeEventId @unique` is the right idempotency primitive. No RLS (acceptable given app-layer scoping, but worth noting with PHI).

## 11. Dependency and Configuration Review

Covered in §4/§5: no CI (H28), unfrozen prod installs + dual lockfiles (H29), `boneyard-js` (H30), hand-listed tests (H31), README/docs drift (H32), single-stage Dockerfile (M26), no Next security headers (M25), broken `db:seed` (M27), font that can't reach prod (M28), `NODE_TLS_REJECT_UNAUTHORIZED=0` suggestion (M29), no backend linter (M30), conflicting frontend deploy paths (root nixpacks vs Dockerfile vs comment-only `railway.toml`).

Env-var cross-check (backend `env.ts` vs `.env.example`): **missing from example:** `ADMIN_API_TOKEN`, `AUTH_COOKIE_DOMAIN`, `AUTH_JWT_EXPIRES_IN`, `PUBLIC_MEDIA_ORIGIN`, `LOCAL_MEDIA_ROOT`, `GOOGLE_PLACES_API_KEY`, `CRON_SECRET`. **Stale in example (read by nothing):** `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_ORIGIN`, `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (no src reader found). **Frontend example missing:** `AUTH_JWT_SECRET` (needed by `proxy.ts`), `ADMIN_API_TOKEN`, `ADMIN_TOKEN_FALLBACK_ENABLED`, `NEXT_PUBLIC_MEDIA_ALLOWED_HOSTS`.

Dependency verdicts: `jsonwebtoken@9` ✅, `handlebars@4.7.8` ✅ (compiles repo-local templates only), `pizzip@3` ✅, `stripe ^22` ✅ but pin via lockfile fix, `playwright` in backend **prod** deps is justified (HTML→PDF renderer) but triples image weight alongside LibreOffice and pdf-lib — three PDF pipelines worth consolidating; `boneyard-js` ❌ remove; `@types/*` placement issues (L9); `luxon` + `Date` coexistence is deliberate and fine.

## 12. Testing Review

Backend: 30 test files / 154 source files (~19%) — schema validation, auth route, admin auth, webhook idempotency, status transitions, availability/timezones, manual booking, DOCX pipeline all covered. **Untested critical paths:** `cart.route.ts` (525+ lines — checkout/cart creation), the full booking→payment→success funnel (the e2e smoke spec literally says real coverage is TODO), media upload authz, email provider fallback chain, rate limiting/CORS behavior. Frontend: **one** unit test for 438 files; `proxy.ts` (auth routing) untested; the one routing-cases helper never runs (L12). No coverage measurement wired on the backend; frontend has `@vitest/coverage-v8` installed but no coverage script. Nothing close to the 80% bar.

Most important tests to add, in order: (1) cart→checkout-session→webhook integration test with a fake Stripe event, (2) media route prefix-blocking test (regression guard for C1), (3) cron/reminders auth tests including unset-secret behavior (C3), (4) `proxy.ts` unit tests (locale + auth matrix, misconfigured mode), (5) Playwright booking funnel happy path, (6) admin server-action authz tests after H20 is fixed.

## 13. Performance Review

High-impact: `sanitize-html` (CJS, ~100 KB+) pulled into the **client** bundle on home/doctors via `FeaturedDoctor` importing `toDoctorBioPlainText` (a pure-regex function colocated with the sanitizer — split the module); `unoptimized` set on all CMS/API images including the LCP hero even though `next.config.ts` already whitelists those hosts in `remotePatterns`; hero image preloaded **twice** (separate mobile/desktop `<Image priority>` both fetch). Medium: raw `<img>` without lazy/dimensions across service cards, blog cards, header logo (CLS); footer fetch serialized after the layout's `Promise.all` (M31); every public page forced dynamic with a per-request backend `/auth/me` despite edge JWT verification (M32); full `flag-icons` CSS (~28 KB, 250 flags) loaded globally for ~7 flags; cart/checkout client-only with auth-gated guest submit button; 1 s interval re-renders in cart. DB-side: missing indexes (H16), unbounded queries (H15), N+1s (M4/M10). Good: `next/font` with swap, content fetches use `revalidate`+tags, user data `no-store`, lucide named imports, bundle analyzer already wired (`pnpm build:analyze`).

## 14. Accessibility Review

High: hardcoded `lang="en"` (H24); nested `<main>` landmarks — `SiteChrome` renders `<main id="main-content">` and ~12 pages/templates render their own `<main>` inside it; no skip link (the `#main-content` anchor exists, nothing references it); focus invisible on dark sections — the global `:focus-visible` outline color `#1D4B36` **equals** the dark-section background, and several components add `focus-visible:outline-none` with no replacement ring (`HomeHero.tsx:168`, `ServiceCard.tsx:40,143`, `ServiceCatalog.tsx:308,452`, `DoctorProfileTemplate.tsx:422`); hand-rolled `LanguageSwitcher`/`CountrySwitcher` claim `role="menu"` but implement no Escape/arrow-key/focus behavior (Radix is already a dependency and used correctly in `SectionNav`). Medium: booking-form submit errors not announced (`role="alert"` missing) and not bound to inputs (`aria-invalid` styles exist in CSS, wired nowhere); slot picker uses tab roles without tab keyboarding; obvious contrast failures on the forest-green sections (`rgba(255,255,255,0.28)` ≈ 2.2:1 in `HomeHero.tsx:98`, FAQ answers at 0.52 ≈ 3.9:1); entry-gate step change drops focus to `<body>`; `aria-pressed` on a `<Link>` (`DoctorFilters.tsx:65`). Low: blog h1→h3 skip; duplicate image alt/heading announcements; `CookieBanner` dialog role misuse. Reduced-motion handling is genuinely good throughout (checked hooks + CSS).

## 15. Code Quality and Maintainability

Structure is good: feature-module backend, route/service/validation separation, consistent response envelope, App Router route groups. The recurring debts: (1) **write-time-trust** for HTML sanitization instead of render-time enforcement — the root cause of both XSS criticals; (2) **fail-open guard patterns** (`if (expected && …)`, `misconfigured → next()`) — three instances; (3) **duplication**: `readClientLocale` ×2, `adminApiBase` ×2, admin CRUD boilerplate across ~10 entities, six screenshot scripts; (4) **dead code**: `BookingFormTemplate` (833 lines), `APPOINTMENT_SELECT_COLUMNS`, orphan test helper, unused imports (19 lint warnings); (5) **docs that contradict the code** (H32) — the most dangerous maintainability issue because it misleads every new contributor; (6) hand-maintained lists that rot (test script, `.env.example`); (7) `$queryRawUnsafe` where the ORM would do (H14). File sizes are mostly healthy; a handful of admin pages and `cart.route.ts` exceed 500 lines.

---

## 16. File-by-File Notes

Status legend: **Reviewed** = read line-by-line or near-fully; **Skimmed** = structure + hot paths read; **Skipped** = not read (reason given). Issue counts reference the IDs above; clean files show 0.

### Root / config

| File | Status | Issues | Notes |
|---|---|---:|---|
| `package.json` (root) | Reviewed | 1 | M27 broken `db:seed` |
| `pnpm-workspace.yaml` | Reviewed | 0 | |
| `pnpm-lock.yaml` | Skimmed | 1 | H29 dual-lockfile (internals generated — not reviewed) |
| `nixpacks.toml` (root) | Reviewed | 1 | M9-adjacent: conflicting frontend deploy path |
| `docker-compose.yml` | Reviewed | 1 | References nonexistent seed script (M27) |
| `playwright.config.ts` | Reviewed | 1 | CI plumbing anticipated; no CI exists (H28) |
| `.gitignore` | Reviewed | 1 | M28 font ignore; env coverage itself correct |
| `README.md` | Skimmed | 1 | H32 describes a different product |
| `skills-lock.json`, `.claude/`, `.agents/`, `.vscode/` | Skipped | — | Tooling config, not product code |
| `Templates/` | Skipped | — | Binary DOCX templates; sync script reviewed instead |
| `backups/` | Skipped | — | Gitignored snapshots |
| `scripts/connect-railway.*` | Skimmed | 0 | |
| `scripts/screenshot-*.js` (×6) | Skimmed | 1 | L13 misnamed/redundant |

### Backend core

| File | Status | Issues | Notes |
|---|---|---:|---|
| `backend/package.json` | Reviewed | 3 | H31 test list, L9 types placement, playwright-in-prod (justified) |
| `backend/nixpacks.toml` | Reviewed | 1 | H29 `--no-frozen-lockfile` |
| `backend/.env.example` | Reviewed | 3 | §11 drift, M29 TLS-off suggestion, M5-adjacent cookie-name mismatch |
| `backend/src/app.ts` | Reviewed | 2 | H9 CORS, L2 skipOnError; helmet wired ✅ |
| `backend/src/config/env.ts` | Reviewed | 0 | Prod-secret rejection done right |
| `backend/src/db/prisma.ts` | Reviewed | 0 | |
| `backend/src/db/ensure-schema.ts` | Reviewed | 1 | C8 runtime DDL / drift |
| `backend/prisma/schema.prisma` | Reviewed | 5 | H16, H17, H18, M14, M15 |
| `backend/prisma/migrations/` | Skimmed | 1 | C8; recent ones read, all 24 not line-by-line |
| `backend/prisma/pending-migrations/` | Reviewed | 1 | Unapplied `drop_legacy_imcRegistration` |

### Backend auth / lib

| File | Status | Issues | Notes |
|---|---|---:|---|
| `modules/auth/auth.service.ts` | Reviewed | 1 | H15 (exportUserData); hashing/tokens exemplary |
| `routes/auth.route.ts` | Reviewed | 0 | Rate-limited, enumeration-safe |
| `utils/admin-auth.ts` / admin-access-evaluator | Reviewed | 0 | Timing-safe compare ✅ |
| `utils/auth-session.ts` | Reviewed | 1 | M7 sameSite/CSRF |
| `lib/stripe/client.ts` | Reviewed | 0 | |
| `lib/email/send-email.ts`, `gmail-send.ts`, `templates.ts` | Reviewed | 1 | M8 PII logging |
| `lib/whatsapp/wasender.ts` | Reviewed | 0 | |
| `lib/google-meet/google-meet.service.ts` | Reviewed | 1 | L7 no timeout (via caller) |

### Backend routes — admin (18 files)

| File | Status | Issues | Notes |
|---|---|---:|---|
| `admin-appointments.route.ts` | Reviewed | 1 | M3 race |
| `admin-assets.route.ts` | Reviewed | 1 | L6 purge audit |
| `admin-audit-log.route.ts` | Reviewed | 2 | M2 inline auth; large pageSize |
| `admin-blog.route.ts` | Reviewed | 2 | L6, M2 |
| `admin-clinics.route.ts` | Reviewed | 1 | Unbounded findMany (H15 family) |
| `admin-countries.route.ts` | Reviewed | 1 | Unbounded + eager includes |
| `admin-country-footer.route.ts` | Reviewed | 1 | M2 |
| `admin-doctor-registrations.route.ts` | Reviewed | 1 | M1 unvalidated params |
| `admin-doctors.route.ts` | Reviewed | 3 | H13 purge, H11 role-audit, L5 |
| `admin-featured-doctor.route.ts` | Reviewed | 2 | M1, M2 |
| `admin-health-tests.route.ts` | Reviewed | 1 | L6 |
| `admin-manual-booking.route.ts` | Reviewed | 0 | Well-guarded (has tests) |
| `admin-media-upload.route.ts` | Reviewed | 2 | H12 MIME, M2 |
| `admin-pages.route.ts` | Reviewed | 1 | L6 |
| `admin-patient-profile.route.ts` | Reviewed | 1 | H11 PHI-edit audit gap |
| `admin-services.route.ts` | Reviewed | 1 | L6 |
| `admin-settings.route.ts` | Reviewed | 3 | M5, M6, M2 |
| `admin-users.route.ts` | Reviewed | 2 | H11, minor 2-roundtrip |

### Backend routes — public/account/doctor (~40 files)

| File | Status | Issues | Notes |
|---|---|---:|---|
| `brazil-consent.route.ts` | Reviewed | 3 | **C2**, H8, spoofable XFF |
| `cron-abandoned-cart.route.ts` | Reviewed | 2 | **C3**, M10 |
| `media-public.route.ts` | Reviewed | 2 | **C1**, H7 |
| `patient-upload.route.ts` | Reviewed | 2 | **C1** (key prefix), H6 |
| `orders.route.ts` | Reviewed | 1 | H1 receipt |
| `share-links.route.ts` | Reviewed | 1 | H2 |
| `cart.route.ts` | Reviewed | 1 | H3 GDPR skip; 525+ lines, untested |
| `payments.route.ts` | Reviewed | 1 | M34; signature verification ✅ |
| `review-invites.route.ts` | Reviewed | 1 | H4 token in response |
| `reminders.route.ts` | Reviewed | 2 | C3-pattern gate, M12 |
| `chat.route.ts` | Reviewed | 1 | M9 GET unlimited |
| `doctor-reports.route.ts` | Reviewed | 1 | H15 unbounded distinct |
| `account-payments.route.ts` | Reviewed | 1 | M11 |
| `doctor-actions.route.ts` | Reviewed | 1 | M11; ownership ✅ |
| `account-appointments / account-prescriptions / account-profile` | Reviewed | 0 | Scoping correct; `.strict()` blocks privilege fields |
| `appointments.route.ts` | Reviewed | 0 | GDPR consent done right here |
| `appointment-documents.route.ts` | Reviewed | 0 | clinical/* blocked; ownership ✅ |
| `doctor-availability.route.ts` + `doctor-self-availability.route.ts` | Reviewed | 0 | OPEN-only public; atomic claim |
| `consultations / consultation-chat / consultation-services / doctor-consultation-history` | Reviewed | 0 | `verifyClinicalReadAccess` consistent |
| `doctor-generated-documents / doctor-invoices / doctor-medical-notes / doctor-patient-documents / doctor-patient-profile / doctor-permissions / doctor-photo / doctor.route / doctors.route` | Reviewed | 0 | doctorId scoping verified |
| `exam-results / forms / health-tests / health / internal-messages / newsletter / notifications / pages / public-country-footer / reviews-config / services / countries / country-scoped / blog / assets / contact / prescriptions` | Reviewed | 0 | Contact/newsletter rate-limited ✅ |

### Backend modules/services

| File | Status | Issues | Notes |
|---|---|---:|---|
| `appointments/appointments.service.ts` | Reviewed | 3 | H14, H15, L4 |
| `appointments/manual-booking.service.ts` | Reviewed | 0 | |
| `doctor-availability/*.ts` | Reviewed | 1 | M16 held-slot sweep; tz logic ✅ (tested) |
| `generated-documents/*` (15 files) | Reviewed/Skimmed | 1 | M13; DOCX pipeline heavily tested ✅ |
| `audit/audit.service.ts` | Reviewed | 2 | H10, console.warn |
| `assets / blog / countries / pages / services / settings / health-tests` services | Reviewed | 4 | H15 (assets), M4 (services/doctors), M5 (settings); blog/pages sanitize on write ✅ |
| `doctor-registrations.service.ts` | Reviewed | 1 | No transaction (4 queries) |
| `review-invites / notifications / consultation-history / medical-notes / patient-profile / patient-upload / brazil-consent / orders / shared/*` | Reviewed | 4 | H4, H5, L3, M34-adjacent; `db-errors` classifier ✅ (tested) |
| `backend/scripts/*` (21 files) | Reviewed | 3 | **C6**, **C7**, L8; others utility-grade |

### Frontend

| File | Status | Issues | Notes |
|---|---|---:|---|
| `proxy.ts` | Reviewed | 1 | **H19** fail-open |
| `next.config.ts` | Reviewed | 2 | M25 no headers; remotePatterns fine |
| `Dockerfile` / `railway.toml` | Reviewed | 2 | M26; railway.toml is comments-only |
| `app/layout.tsx` | Reviewed | 2 | H24 lang; flag-icons global CSS |
| `app/error.tsx` | Reviewed | 1 | H23 |
| `app/(site)/layout.tsx` | Reviewed | 3 | M31, M32, L10 dead import |
| `(site)` public pages (home, services, doctors, blog, consult, book, faq, about, contact, legal) | Reviewed | 2 | **C4** via RichBodySection; nested `<main>` (§14) |
| `[country]/[lang]/cart + checkout pages` | Reviewed | 3 | M-level: client-only gating, countdown interval, missing force-dynamic on cancelled |
| `(auth)` pages (login/register/reset/verify/account/*) | Reviewed | 4 | M18, M19, L11; force-dynamic inconsistency |
| `(doctor)` portal | Skimmed | 1 | setState-in-effect warnings; no auth/security findings |
| `app/api/**` route handlers | Reviewed | 1 | console.error w/ internal URL; allowlist proxy design ✅ |
| `components/sections/RichBodySection.tsx` | Reviewed | 1 | **C4** |
| `components/layout/*` (Header, Footer, MobileNav, switchers, SectionNav, Newsletter) | Reviewed | 5 | §14 a11y set; MobileNav (Radix) ✅ |
| `components/cards|templates|sections` remainder | Reviewed | 6 | Perf §13 set; dead BookingFormTemplate (L14) |
| `components/cart/CartContext.tsx` | Reviewed | 1 | Silent mutation failures |
| `lib/api/*` | Reviewed | 2 | M17, H22-adjacent typing |
| `lib/admin/admin-api.ts`, `admin-settings-api.ts` | Reviewed | 2 | **H27**, L19 |
| `lib/content/*` (sanitizers) | Reviewed | 1 | M20; doctor-bio sanitizer ✅ |
| `locales/*` + i18n wiring | Skimmed | 0 | 6 locales consistent |
| `app/(admin)/**` (all 20 sections) | Reviewed | 12 | **C5**, H20–H22, H25–H26, M21–M24, M33, M35 — per-section detail in §4/§5 |
| `frontend/tests/` + root e2e | Reviewed | 2 | §12; L12 orphan |
| `frontend/public/**` | Skipped (sizes only) | 1 | L21 heavy unreferenced images |
| `docs/**` | Sampled | 2 | H32, L20 |

---

## 17. Recommended Fix Order

### Fix Immediately (before any further deploys)

- [ ] **C1** Block `patient-upload/` (and audit all non-`clinical/` prefixes) in `media-public.route.ts`; re-key new uploads under `clinical/`; audit existing S3 objects for exposure
- [ ] **C2** Lock down `GET /api/public/brazil-consent` (HMAC token or auth + ownership)
- [ ] **C3** Make cron/reminders gates fail closed; require `CRON_SECRET` in env schema
- [ ] **C4** Sanitize `RichBodySection` at render (`scopeBlogHtml`)
- [ ] **C5** Sanitize admin doctor-bio render (`sanitizeDoctorBioHtml`)
- [ ] **C9** Rotate: Railway Postgres password, S3 keys, Stripe webhook secret, Deepgram key, seed admin password; stop pointing local dev at prod DB
- [ ] **C7** Guard `reset-railway-db.js` (flag + host allowlist)
- [ ] **C6** Remove committed seed password; env-var it; rotate/delete the two test accounts; add prod-host guard

### Fix Soon (this sprint)

- [ ] **H1/H2** Strip PII from public receipt + share-link payloads; add rate limits
- [ ] **H3** Enforce GDPR consent when `BookingSetting` missing (cart)
- [ ] **H19** Proxy: fail closed (or loudly) on missing `AUTH_JWT_SECRET`
- [ ] **H20** `requireAdminAction()` at the top of every admin server action
- [ ] **H21** Remove temp password from URLs (manual booking)
- [ ] **H27** Align frontend admin-token fallback rule with backend (`=== "development"`)
- [ ] **H6–H9** Rate limits: patient-upload, media proxy, chat GET; replace brazil-consent Map limiter; fix non-prod CORS
- [ ] **H10** Configure `trustProxy`; use `request.ip` in audit
- [ ] **H11** Audit events for role changes, password resets, PHI edits, purges
- [ ] **H12** Magic-byte check on admin media upload
- [ ] **H13** Purge guards (refuse when appointments exist)
- [ ] **H16/H17** Migration: Appointment indexes + status enums + MedicalNote FK
- [ ] **C8** Baseline migrations; retire `ensure-schema.ts`; apply pending migration
- [ ] **H28/H29/H31** Add CI; frozen-lockfile deploys; glob the backend test script
- [ ] **H30** Remove `boneyard-js`
- [ ] **H4/H5** Stop returning invite tokens; catch notification-send failures
- [ ] **H14/H15** Replace `$queryRawUnsafe` with ORM calls; bound every unbounded query
- [ ] **H22–H26** Admin orders pagination/typing; error boundary message; `html lang`; newsletter helper; blog server-side validation
- [ ] **H32** Fix README/launch-blockers to match reality

### Improve Later

- [ ] M1–M35 as batched cleanups (validation consistency, transactions, N+1s, security headers, Dockerfile multi-stage, seed wiring, font pipeline, backend ESLint, audit-log pagination UI, execCommand editor migration, locale-flash fixes, blog `style` allowlist, HELD-slot sweep, settings allowlist)
- [ ] Accessibility pass: single `<main>` + skip link, dark-section focus tokens, Radix-ify the two switchers, `role="alert"` + `aria-invalid` wiring on the booking form, contrast floor on green sections
- [ ] Performance pass: split `toDoctorBioPlainText` out of the sanitizer module, drop `unoptimized` on whitelisted images, single hero preload, lazy-load card images, parallelize footer fetch, flag-icons subset, delete dead template + heavy unreferenced PNGs
- [ ] Testing: cart/checkout/webhook integration tests, media prefix regression test, proxy unit tests, booking-funnel e2e, coverage reporting wired into CI
- [ ] L1–L23 housekeeping

---

## 18. Final Verdict

**Is this repo production-ready?** No — not for a healthcare product handling PHI and payments. The engineering quality is well above average for a project of this size (the auth core, webhook handling, and ownership scoping are genuinely solid), but the Critical list contains live, unauthenticated PHI exposure (C1, C2), two stored-XSS sinks (C4, C5), and fail-open guards (C3, H19) — any one of which is disqualifying for go-live in this domain.

**What must be fixed before deployment?** The full "Fix Immediately" list in §17 — realistically 1–2 focused days of work — plus credential rotation (C9) and at minimum the rate-limit/PII items H1–H9 from "Fix Soon."

**Biggest technical risk:** The schema-drift situation (C8) combined with no CI (H28) and non-reproducible installs (H29). The codebase currently has no automated safety net between a keystroke and production, and its database schema cannot be reliably reproduced from the repo. The unguarded `DROP SCHEMA` script (C7) sitting next to env files that point at production turns this from "risk" into "incident waiting for a date."

**Biggest security risk:** Unauthenticated access to patient medical documents via the public media proxy (C1). It is exploitable today, it exposes the most sensitive data class the platform holds, and the fix is a two-line prefix check plus an exposure audit.

**Biggest maintainability risk:** Documentation that actively contradicts the shipped code (H32), compounded by hand-maintained lists that silently rot (the test script H31, the env examples H6/§11). New contributors — human or AI — will repeatedly make wrong decisions while trusting these. The recurring "write-time trust" sanitization pattern and "fail-open when unconfigured" guard pattern are the two idioms to ban going forward; they caused five of the nine Criticals.
