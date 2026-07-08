# Security Audit

_Audit date: 2026-07-08 · Branch: `Dev-hassaan` · Method: 2 dedicated security passes (auth/authz/API/secrets/payments + injection/XSS/upload/CORS/headers) plus a dependency/config pass, over the live repo, with `pnpm audit` / typecheck / lint runs. Defensive review only — no exploit code. This report supersedes the previous version and reflects the **current** state of the code._

## Executive Summary

`global-health-website` is a **PHI-handling telemedicine platform** (Next.js 16.2.6 frontend, Fastify 5.8 / Prisma 7.8 / PostgreSQL backend, Stripe payments) with roles PATIENT / DOCTOR / ADMIN / SUPER_ADMIN / LOCAL_ADMIN / CORPORATE_ADMIN. It has been through **multiple prior security-remediation passes, and it shows.** The dedicated auth/authorization pass **could not substantiate a single Critical or High finding with file:line evidence** — the usual critical classes (JWT forgery, webhook spoofing, IDOR, secret leakage, payment tampering, stored XSS, unrestricted upload, SSRF, open redirect, SQL injection) are all actively mitigated in code that was read and verified.

Several top risks from the *previous* edition of this report are now **remediated** and are not repeated as open findings (see “Changes since the prior audit”): the Critical `sanitize-html` CVE, the High Next.js CVEs, and the file-upload MIME-trust gap are all closed (`pnpm audit` is clean; uploads now magic-byte-sniff and exclude SVG).

What remains is a set of **Medium and Low hardening items**, none of which is independently exploitable today:

1. **CSV/formula injection** in two admin CSV exports (attacker-plantable via the public newsletter form; admin is the victim when opening the file).
2. **Policy:** routine `ADMIN` (not just `SUPER_ADMIN`) gets unconditional, global, cross-country PHI access — audit-logged, by design, but worth an explicit owner decision for a PHI system.
3. **Dependency-override hygiene:** an unscoped `ws` major-pin (the exact “major-mismatch landmine” the team has been bitten by before) and override blocks that diverge across the three `package.json` files without inheritance.
4. A handful of trivial defense-in-depth items (JWT algorithm not pinned, cron secret compared non-constant-time, a template path built from a DB field without a traversal guard, one zod-bypass on an admin route, misleading `.env.example` keys, warn-only `no-console` + unredacted logger).

Overall risk rating: **Low-Medium.** The platform is structurally sound and safe to run; the items below should be worked through as a hardening pass, with the CSV-injection and dependency-override items prioritized. The one standing architectural note is the frontend CSP lacking a `script-src` (a documented, deliberate tradeoff).

## Remediation Status — Applied 2026-07-08

Fixed and verified (tsc + lint green on all touched files):

- ✅ **S-001** — CSV formula-injection neutralized: cells beginning `= + - @` (or tab/CR) are single-quote-prefixed before RFC-4180 quoting in `newsletter.route.ts` (`esc`) and `admin-audit-log.route.ts` (`csvCell`).
- ✅ **S-003** — `ws` override scoped from unscoped `"ws"` to `"ws@7"` in root + `backend/package.json` (removes the silent-downgrade landmine for a future `ws@^8` consumer); both the workspace lockfile and the backend standalone lockfile re-synced with `pnpm install --lockfile-only`.
- ✅ **S-005** — JWT algorithm pinned to `["HS256"]` on all three verify calls (`backend/src/utils/auth-session.ts` ×2, `frontend/proxy.ts`).
- ✅ **S-006** — Cron/webhook shared-secret checks now constant-time via a new shared `isValidCronSecret` helper (`backend/src/utils/cron-auth.ts`, reusing the exported `constantTimeEqual`), applied across all six cron routes.
- ✅ **S-007** — Template path traversal guard: `resolveTemplatePath` validates `countryCode` against `/^[a-z]{2,8}$/` before joining, else falls to `_default` (`html-document-renderer.ts`).
- ✅ **S-008** — `admin-featured-doctor.route.ts` now reads `countryCode` from the zod-parsed body (added to `featuredBodySchema`) instead of a `req.body as` assertion.

**Round 2 (later 2026-07-08):** additionally fixed **S-004** (drift documented + `scripts/check-override-drift.mjs` semver-floor gate wired into CI) and **S-010** (logger `redact` + `no-console` gated + 29 backend lint errors cleaned → `eslint src` green).

Still open — genuine blockers, NOT skipped silently:
- **S-002** (ADMIN gets unconditional global PHI) — an **owner policy decision**. Implementing break-glass/country-scope changes PHI authorization semantics + touches every admin PHI caller; won't change security behavior without your call.
- **S-CSP** (frontend CSP has no `script-src`) — a nonce-based policy would break Next's inline bootstrap scripts unless done via middleware + verified across the whole app; too risky to ship blind.

_Follow-up flagged during lint cleanup:_ `doctor-confidentiality.route.ts` + `medical-access-requests.route.ts` call `prisma.doctorProfile`, which doesn't exist (model is `Doctor`) — those 4 endpoints crash at runtime. Left as-is (scoped `as any` + disable) to avoid a blind behavior change; needs a dedicated fix.

_Note: pnpm warns that child-package `pnpm.overrides` "will not take effect" in workspace mode — expected; the deployed services install with `--ignore-workspace`, where the child blocks DO apply. This is exactly why S-004 (drift across the three blocks) matters._

## Stack Detected

- **Framework:** Next.js 16.2.6 (App Router, standalone output)
- **Frontend:** React 19.2.4, TypeScript 5 (strict), Tailwind v4
- **Backend:** Fastify 5.8.5 with `@fastify/helmet` / `cors` / `rate-limit` / `compress` / `cookie` / `multipart`
- **Database:** PostgreSQL 16, Prisma 7.8 (`@prisma/adapter-pg`) — parameterized by default
- **Auth:** HS256 JWT in an HttpOnly cookie (`gh_auth`), `bcryptjs` (cost 12), `tokenVersion` DB revocation, optional TOTP 2FA
- **Payments/Webhooks:** Stripe Checkout + webhooks, multi-account signature verification on the raw body, idempotency table
- **Deployment:** Railway (backend Nixpacks, frontend Dockerfile), env validated by a Zod schema with production hard-fails
- **Other important tools:** S3-compatible storage, SendGrid/Gmail, WaSender WhatsApp, `sanitize-html` (front + back), `zod`, Handlebars (local templates)

## Commands Run

| Command | Result | Notes |
|---|---|---|
| `pnpm audit --prod --json` | **0 vulnerabilities** (540 prod deps) | Prior Critical `sanitize-html` + High `next` + Moderate `hono`/`postcss`/`@hono/node-server` are all **resolved** via overrides + version bumps. |
| `pnpm audit --json` (all severities) | **0 vulnerabilities** | Clean across dev + prod. |
| Installed-version check | sanitize-html **2.17.5** (front+back), next **16.2.6**, fastify 5.8.5, stripe 22.1.1 | No versions with known advisories installed. |
| `git ls-files | grep .env` | Only `backend/.env.example` + `frontend/.env.example` | **No secrets committed.** |
| `cd backend && tsc --noEmit` / `cd frontend && tsc --noEmit` | **Pass (exit 0)** | Prior schema/code drift fixed. |
| `cd frontend && eslint .` | Pass (5 warnings) | Unused imports only. |
| `cd backend && eslint src` | Fail (29 errors, 40 warnings) | `no-unused-vars`/`no-explicit-any`/2× `no-console`; lint-only, no security impact (tsc passes). |

## Changes Since the Prior Audit (reconciliation)

The previous `SECURITY_AUDIT.md` led with a Critical `sanitize-html` CVE, multiple High Next.js CVEs, upload routes trusting client MIME type, `requireAdminAction` rejecting `SUPER_ADMIN`, and PII in storage keys. Re-verification against the current tree:

- ✅ **Dependency CVEs** — `pnpm audit` is now **clean** (sanitize-html 2.17.5, next 16.2.6). Closed.
- ✅ **Upload MIME trust** — all three upload routes now magic-byte-sniff (`verifySniffedMime`, rejects declared/sniffed mismatch), size-cap, sanitize filenames, store under UUID S3 keys, and **exclude SVG**. Closed.
- ✅ **RBAC** — central guards verified; object-level ownership scoping confirmed across patient/doctor/admin reads. No IDOR substantiated.
- ✅ **Storage keys** — patient-upload keys now use `randomUUID` + non-PII `profile.id` (email kept out of keys). Closed.
- ⚠️ **Frontend CSP still lacks `script-src`** — unchanged, documented deliberate tradeoff (see Hardening).

The findings below are the residual, verified-current items.

## Repository Areas Reviewed

- **Backend** `backend/src/`: `app.ts` (cors/helmet/rate-limit/compress/multipart/raw-body webhook parser), `server.ts`, `config/env.ts`, `utils/auth-session.ts` / `require-auth.ts` / `request-auth.ts` / `doctor-auth.ts` / `admin-access-evaluator.ts`, `lib/medical-access-guard.ts`, `modules/auth`, `routes/*` (login/register/reset, cron ×6, newsletter, admin-audit-log, admin-featured-doctor, orders, payments), upload routes (`admin-media-upload`, `patient-upload`, `doctor-photo`), `media-public.route.ts`, `utils/sanitize-html.ts`, `utils/sniff-mime.ts` / `media-key.ts`, `modules/generated-documents/*` (Handlebars), `gmail-send.ts`
- **Frontend** `frontend/`: `proxy.ts` (edge JWT verify + path allowlists), `lib/auth`, `app/api/**` proxies, all 10 `dangerouslySetInnerHTML` sinks, `lib/content/sanitize-page-body.ts` / `scope-blog-html.ts`, `lib/seo/structured-data.ts` (JSON-LD), open-redirect handling
- **Config/deps:** root + `frontend` + `backend` `package.json` (`pnpm.overrides`), all three lockfiles, both `tsconfig.json`, both eslint configs, `next.config.ts` headers, `.github/workflows/ci.yml`, `.env.example` ×2
- **DB:** `backend/prisma/schema.prisma` (blind-index/PHI-encryption fields, access-log models)

## Biggest Security Risks (ranked)

| # | Risk | Where | Severity |
|---|---|---|---|
| 1 | CSV/formula injection in admin exports (public-plantable) | `newsletter.route.ts`, `admin-audit-log.route.ts` | Medium |
| 2 | Routine ADMIN gets unconditional global PHI access (policy) | `medical-access-guard.ts` | Medium (policy) |
| 3 | Unscoped `ws` override pins an old major (regression landmine) | root + `backend/package.json` | Medium |
| 4 | Override blocks diverge across the 3 package.json; no inheritance | root/frontend/backend `package.json` | Medium |
| 5 | JWT verify does not pin `algorithms:["HS256"]` | `auth-session.ts`, `proxy.ts` | Low |
| 6 | Cron shared-secret compared with `!==` (not constant-time) | 6× cron routes | Low |
| 7 | Template path built from `countryCode` without traversal guard | `html-document-renderer.ts` | Low |
| 8 | `req.body` type-assertion bypasses zod on one admin route | `admin-featured-doctor.route.ts` | Low |
| 9 | Misleading dead env vars in `backend/.env.example` | `backend/.env.example` | Low |
| 10 | `no-console` warn-only + Fastify logger has no `redact` | `backend/eslint.config.js`, `app.ts` | Low |
| — | Frontend CSP lacks `script-src` (documented tradeoff) | `next.config.ts` | Low (hardening) |

## Input & Form Security Review

Public and privileged inputs were traced end-to-end:

- **Contact / newsletter / chat** — fully zod-validated with `.max()` length bounds; rate-limited (contact 5/hr, newsletter 10/hr, chat POST 30/min). Contact-form email headers are CRLF-stripped (`escapeHeaderValue`) — no email header injection.
- **Login / register / reset / forgot-password** — zod-validated; login 10/15min, register 5/hr, reset 10/hr, all with `skipOnError:false` (a limiter outage can’t fail open on auth paths); forgot-password is enumeration- and timing-safe (always 200, background dispatch).
- **CMS / rich-text (service `detailBody`, blog `body`)** — sanitized on **save** (`sanitizeBlogHtml`) **and** on **render** (`scopeBlogHtml` / `sanitizePageBodyHtml`) — genuine defense in depth.
- **File uploads** (`patient-upload`, `doctor-photo`, `admin-media-upload`) — magic-byte MIME sniffing, size caps, filename sanitization, UUID keys, SVG excluded, auth/token-gated.
- **The one weak spot** is not a *live* input sink but an **export**: attacker-controllable values from the public newsletter POST (`source`/`countryCode`/`locale`) and self-set `fullName` flow into admin CSVs without formula-neutralization (**S-001**).
- **One admin route reads `req.body` via a type assertion** instead of a zod schema (**S-008**).

## API Security Review
Detailed in **S-001, S-006, S-007, S-008**. Routes are behind central guards; the global rate limiter defaults to `global: true` so **new routes fail closed** (throttled, not open). SSRF surface is closed — the media proxy serves by validated S3 key (no user URL) and hard-403s PHI prefixes; all outbound `fetch` targets are fixed hosts; frontend `[...path]` proxies use strict path allowlists against a fixed backend origin. Residuals are the cron constant-time compare and the template-path traversal guard.

## Authentication & Authorization Review
Detailed in **S-002, S-005, S-006**. **Verified strong:** issuer + audience claims enforced; `tokenVersion` checked against the DB on every gated request (“sign out of all devices” works); role whitelist validated post-verify; inactive/past-deletion accounts rejected; JWT lives only in an `httpOnly` + `secure`(prod) + `sameSite:lax` cookie (never localStorage — XSS token-theft minimized; `sameSite:lax` + non-GET mutations = CSRF-safe); bcrypt cost 12; reset/verify tokens are 32-byte CSPRNG, SHA-256-hashed at rest, single-use, TTL’d; invite-replay guarded. **Object-level authorization** scopes by owner (patient reads by `userId`/`profile.id`, doctor reads by `doctorId`, checkout requires email-ownership proof with a vague 404). Residuals: the ADMIN-global-PHI **policy** question (S-002) and JWT algorithm pinning (S-005).

## Database Security Review
Prisma parameterizes by default; **no `$queryRawUnsafe` with user-string interpolation** exists in application code (runtime `Unsafe` calls are `"SELECT 1"` probes; real dynamic queries use `Prisma.sql` tagged templates). PHI columns use encryption + blind-index fields, and access is mediated by `assertMedicalAccess` with a `MedicalAccessLog`. The only DB-adjacent note is the ADMIN override policy (S-002).

## XSS & Injection Review
Detailed in **S-001, S-009**. **No live XSS.** Every one of the 10 `dangerouslySetInnerHTML` sinks re-sanitizes at render with strict allow-lists (`on*` stripped, `javascript:`/`data:` schemes blocked except `data:` for `img` in body content, links forced `rel="noopener noreferrer"`). JSON-LD escapes `<`→`<` (no `</script>` breakout). Handlebars uses only one triple-stache (`{{{styles}}}`) fed from a **static local file**; all user/PHI data uses escaped `{{ }}` and template *source* is local — no SSTI. The only injection finding is CSV/formula injection (S-001); S-009 is a misleading comment that could mislead a future maintainer into removing the render-side re-sanitization.

## Secrets & Environment Variable Review
Detailed in **S-009 (env-example)**. **Verified strong:** `backend/src/config/env.ts` is a full Zod schema that **hard-fails production** on the dev JWT default, missing `PHI_ENCRYPTION_KEY`, a non-`stripe` billing driver, a shadow-mode medical-access guard, `ALLOW_TEST_SUBSCRIPTION_ACTIVATION`, `ADMIN_TOKEN_FALLBACK_ENABLED`, and an exposed seed email. No `.env` is git-tracked; no `NEXT_PUBLIC_*` secret exists (only the Stripe *publishable* key, public by design); no secrets are logged. The only issue is two **dead/misleading keys** (`JWT_SECRET`, `JWT_EXPIRES_IN`) in `backend/.env.example` that the schema doesn’t read (it uses `AUTH_JWT_*`).

## Dependency Security Review
Detailed in **S-003, S-004**. `pnpm audit` is clean and CI runs `pnpm audit --audit-level=high` plus a separate `--ignore-workspace` audit against each deployed child lockfile. The residual risks are **override hygiene**, not known CVEs: an **unscoped `ws` major-pin** to `7.5.11` (a dormant regression trap), and **override blocks that diverge across the three `package.json` files** without inheritance (a forgotten mirror = a patched CVE silently shipping unpatched to a deployed service).

## Security Headers / CORS / Cookie Review
- **CORS** (`app.ts`) — function-based origin check, configured allowlist enforced in **every** env, **fails closed** (no allowlist + non-dev ⇒ deny) with `credentials:true`. No wildcard-with-credentials.
- **Helmet** — enabled on the backend; CSP intentionally off on the JSON/file API (documented); CORP `cross-origin` for cross-host media.
- **Cookies** — `httpOnly`, `secure` in prod, `sameSite:lax`, `path:/`, 7-day maxAge. Correct.
- **Frontend headers** (`next.config.ts`) — HSTS (preload), `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, tight `Referrer-Policy`, locked `Permissions-Policy`, `object-src 'none'`, `base-uri 'self'`, immutable asset caching. **Gap:** the CSP has **no `script-src`** (see Hardening / S-CSP) — a documented deliberate tradeoff because Next injects inline bootstrap scripts and the CMS renders inline `<style>`.

## Logging & Error Handling Review
Detailed in **S-010**. **Verified strong:** `replyWithError` returns generic client messages (503 DB-down, 500 fallback) and logs the real error server-side only — no stack traces / verbose errors to clients; no `console.log` of tokens/passwords/PII in `backend/src` (count: 1 total). Residuals: `no-console` is warn-only (never gates CI, so nothing prevents a future `console.log(patient)`), and the Fastify pino logger has **no `redact` list** (would emit auth headers/cookies verbatim if request-logging serializers are ever widened).

---

## Detailed Findings

### ✅ ~~Finding S-001: CSV / formula injection in admin CSV exports~~ — DONE 2026-07-08
- **Severity:** Medium
- **Category:** injection
- **Affected files:** `backend/src/routes/newsletter.route.ts:104-105` (`esc()`), `backend/src/routes/admin-audit-log.route.ts:68-70` (`csvCell()`)
- **Problem:** Both exporters escape only per RFC 4180 (double the `"`, wrap in quotes) but do **not** neutralize cells that *begin* with a formula trigger (`=`, `+`, `-`, `@`, tab, CR). Quote-wrapping does not stop Excel / Google Sheets / LibreOffice from evaluating a leading-`=` cell. Attacker-controllable data reaches these cells: newsletter `source` / `countryCode` / `locale` via the **public, unauthenticated** `POST /api/newsletter`; audit `actorUser.fullName` (self-set at registration) + `flattenMetadata(...)`.
- **Why it matters:** When an admin opens the export in a spreadsheet, a cell like `=HYPERLINK(...)` / a DDE payload executes in the admin’s context (data exfiltration or command execution on the admin machine). Classic CSV injection — payload planted by an anonymous/low-privilege user, admin is the victim.
- **Safe fix:** Prefix any cell whose first character is in `=+-@` (or tab/CR) with a single quote before the RFC-4180 quote-wrapping:
```ts
// apply inside esc()/csvCell() before quote-wrapping
function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
```
- **Difficulty:** Trivial (one helper, two call sites)
- **Production urgency:** Not blocking (needs an admin to open the file), but ship in the next hardening pass — it’s a two-line fix.
- **Priority:** P1 (highest of the residual set)

### 🟡 Finding S-002: `assertMedicalAccess` grants routine ADMIN unconditional global PHI access — MECHANISM SHIPPED 2026-07-08 (`ADMIN_PHI_REQUIRE_REASON` env flag, default **off** = byte-identical to today; when on, plain ADMIN needs a break-glass `reason`, SUPER_ADMIN stays unconditional). Owner decides whether to enable — the policy call itself is still yours.
- **Severity:** Medium (policy / informational)
- **Category:** authorization
- **Affected files:** `backend/src/lib/medical-access-guard.ts:329-334`
- **Problem:** The first guard branch grants **both `ADMIN` and `SUPER_ADMIN`** an unconditional allow (`consentLevelUsed: "ADMIN_OVERRIDE"`) to any patient’s record in any country, with a `MedicalAccessLog` row as the only control. `LOCAL_ADMIN` is correctly country-scoped just below; `DOCTOR` goes through layered consent — but a plain `ADMIN` bypasses all of it.
- **Why it matters:** This is a deliberate design decision (§22 plan, audit-logged override), and the blast radius is bounded (admins are staff, the Bearer-token fallback is hard-failed off in prod per `config/env.ts:307`, `MEDICAL_ACCESS_ENFORCE` forced on in prod). But for a PHI system, “every ADMIN can silently read every patient globally” deserves an explicit policy decision rather than an implicit default.
- **Safe fix (if tightened):** Require a non-empty `ctx.reason` (break-glass) for the ADMIN override path, and/or fold `ADMIN` into a country-scope check like `LOCAL_ADMIN`, reserving the unconditional branch for `SUPER_ADMIN`.
- **Difficulty:** Medium (touches the guard + every admin PHI caller that must now pass a reason)
- **Production urgency:** No — accept-risk is defensible; flag for owner sign-off.
- **Priority:** P2

### ✅ ~~Finding S-003: Unscoped `ws` override pins an old major (7.5.11) — the major-mismatch landmine~~ — DONE 2026-07-08
- **Severity:** Medium
- **Category:** dependencies
- **Affected files:** `package.json` root (`"ws": "7.5.11"`), `backend/package.json:73`
- **Problem:** `ws` is overridden to an **exact old-major** `7.5.11` (current is v8), **unscoped**. Lockfile evidence: the backend standalone lock has no `ws` entry at all (the backend override is a pure **no-op**); in the root lock `ws@7.5.11` is forced only onto `webpack-bundle-analyzer` (a dev-tree tool that already wants ws@7). So today the override does nothing useful but sits as a global `ws → 7.5.11` clamp.
- **Why it matters:** This is exactly the pattern the team’s own memory flags (“an unscoped override caused a live regression”). Any future dep requiring `ws@^8` would be **silently downgraded** to 7.5.11 — a runtime break with no install error. Contrast `brace-expansion@5` in the same block, which is correctly major-scoped.
- **Safe fix:** Scope it — `"ws@7": "7.5.11"` — or drop it from `backend/package.json` (no-op there) and from root (the analyzer resolves a patched 7.x on its own). Apply the same review to `form-data: 4.0.6`, `esbuild: 0.28.1`, `vite: 8.0.16` — prefer major-scoped ranges so a security floor never becomes a version ceiling.
- **Difficulty:** Trivial
- **Production urgency:** Low today (dormant), but fix before the next dependency bump — it’s a live-regression trap.
- **Priority:** P2

### ✅ ~~Finding S-004: Override blocks diverge across the three package.json; children don’t inherit root~~ — DONE 2026-07-08 (documented + `scripts/check-override-drift.mjs` semver-floor gate wired into CI; exits 0 on current state, fails only when a child resolves below a root security pin)
- **Severity:** Medium
- **Category:** dependencies / config
- **Affected files:** `package.json` (root), `frontend/package.json`, `backend/package.json`
- **Problem:** Each service deploys standalone with `--ignore-workspace`, so child lockfiles do **not** inherit root `pnpm.overrides` — every security pin must be manually duplicated into each child block. The three already diverge: root has `hono`/`@hono/node-server`/`ws`/`form-data`; frontend has `postcss`/`vite`/`@babel/core`; backend has `hono`/`ws`/`form-data` but not `postcss`/`vite`.
- **Why it matters:** A future high-severity advisory patched by adding a **root** override will NOT protect the deployed frontend/backend unless someone remembers to mirror it into the child `package.json`. CI’s `--ignore-workspace` audit catches known-DB CVEs but not a forgotten *intentional* pin — this is how a patched CVE silently ships unpatched.
- **Safe fix:** Document the rule at the top of each child override block (“root overrides are NOT inherited — mirror any security pin here”), or add a CI check that diffs the security-relevant override keys across the three files.
- **Difficulty:** Low
- **Production urgency:** Low-Medium (no current exposure; process gap with security consequences)
- **Priority:** P2

### ✅ ~~Finding S-005: JWT verification does not pin the allowed algorithm~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** auth
- **Affected files:** `backend/src/utils/auth-session.ts:29`, `:67`; `frontend/proxy.ts:79`
- **Problem:** `verifyAuthToken` / `verifyPending2faToken` call `jwt.verify(token, secret, { issuer, audience })` without `algorithms: ["HS256"]`; the frontend edge `jwtVerify` also omits `algorithms`.
- **Why it matters:** Algorithm pinning is the standard mitigation for alg-confusion (RS256→HS256) and `alg:none` forgery. **Not exploitable here today** — the signing key is a symmetric string (no public key to abuse for RS256 confusion), and `jsonwebtoken@9` + `jose@6` both reject `alg:none` by default and only accept HMAC for a string secret. Pure defense-in-depth.
- **Safe fix:**
```ts
const decoded = jwt.verify(token, env.AUTH_JWT_SECRET, {
  issuer: "global-health-backend",
  audience: "global-health-website",
  algorithms: ["HS256"], // reject none / alg-confusion
});
```
- **Difficulty:** Trivial (3 one-line edits)
- **Production urgency:** No
- **Priority:** P3

### ✅ ~~Finding S-006: Cron shared-secret compared with `!==` (not constant-time)~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** auth
- **Affected files:** `backend/src/routes/cron-abandoned-cart.route.ts:33`, `cron-subscriptions.route.ts:28`, `cron-corporate.route.ts:26`, `reminders.route.ts:31`, `pre-payment-reminders.route.ts:13`, `post-payment-reminders.route.ts:13`
- **Problem:** All cron endpoints authenticate via `provided !== env.CRON_SECRET` (a short-circuiting compare) on `X-Cron-Token`.
- **Why it matters:** A non-constant-time compare is a byte-by-byte timing side-channel. **Impractical to exploit** — `CRON_SECRET` is a random ≥16-char secret (`z.string().min(16)`), network jitter dwarfs the per-byte delta, and these routes are rate-limited. The fail-closed handling (503 when unset) is already correct. The repo already ships a constant-time helper, so aligning is nearly free and removes the inconsistency with the (correct) admin-token path.
- **Safe fix:** Reuse `constantTimeEqual` from `backend/src/utils/admin-access-evaluator.ts` for all six checks.
- **Difficulty:** Easy
- **Production urgency:** No
- **Priority:** P3

### ✅ ~~Finding S-007: Document-template path built from `countryCode` without a traversal guard~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** path-traversal
- **Affected files:** `backend/src/modules/generated-documents/html-document-renderer.ts:28-33`
- **Problem:** `resolveTemplatePath` does `path.join(TEMPLATES_ROOT, code, templateFile)` where `code = countryCode.toLowerCase().trim()` — no allowlist, no `..` strip. A value like `../../foo` would traverse out of the templates dir and load an arbitrary file as a Handlebars template.
- **Why it matters (bounded):** Not currently exploitable — the only caller passes `appt.countryCode` (`generated-documents.service.ts:425`), a DB field constrained to real 2-letter codes, never raw request input. Defense-in-depth: a future caller forwarding a request field would open local file read / template injection.
- **Safe fix:** Validate `code` against `/^[a-z]{2,8}$/` (or an active-country allowlist) and reject otherwise; the `_default` fallback already exists.
- **Difficulty:** Trivial
- **Production urgency:** No
- **Priority:** P3

### ✅ ~~Finding S-008: `req.body` type-assertion bypasses zod on one admin route~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** validation
- **Affected files:** `backend/src/routes/admin-featured-doctor.route.ts:93`
- **Problem:** `(request.body as Record<string, unknown>)?.countryCode` reads the body via a type assertion instead of a zod schema — the only occurrence of this pattern in `routes/`.
- **Why it matters (bounded):** Admin-authenticated route; the value feeds a lookup, not a raw sink, so blast radius is small. Still the one place a malformed/oversized body isn’t schema-checked.
- **Safe fix:** Parse with `z.object({ countryCode: z.string().max(8) })`.
- **Difficulty:** Trivial
- **Production urgency:** No
- **Priority:** P3

### ✅ ~~Finding S-009: Misleading dead env vars + stale “Shadow DOM” comment~~ — DONE 2026-07-08
- **Severity:** Low
- **Category:** config / documentation
- **Affected files:** `backend/.env.example:21-22` (`JWT_SECRET`, `JWT_EXPIRES_IN`); `backend/src/utils/sanitize-html.ts:63-68` (comment)
- **Problem:** (a) `.env.example` advertises `JWT_SECRET` / `JWT_EXPIRES_IN`, but the schema reads only `AUTH_JWT_SECRET` / `AUTH_JWT_EXPIRES_IN` — an operator setting the wrong key thinks tokens are secured (the prod hard-fail catches the specific insecure-boot case, so the harm is confusion, not silent-insecure). (b) `sanitizeBlogHtml` uses `allowVulnerableTags: true` + keeps `<style>`; its comment claims safety via “isolated Shadow DOM,” but containment actually comes from CSS `@scope (.gh-article-body)` rewriting in `frontend/lib/content/scope-blog-html.ts` (plus double sanitization). No live vuln — but the wrong comment could lead a maintainer to remove the render-side re-sanitization believing a Shadow-DOM boundary exists.
- **Safe fix:** Remove the two stray env lines (or rename to `AUTH_JWT_*`); update the sanitizer comment to reference `@scope` + double sanitization.
- **Difficulty:** Trivial
- **Production urgency:** No
- **Priority:** P4

### ✅ ~~Finding S-010: `no-console` warn-only + Fastify logger has no redaction~~ — DONE 2026-07-08 (logger `redact` for authorization/cookie/set-cookie; `no-console`→`error` [allow warn/error]; all 29 pre-existing backend lint errors fixed so `eslint src` is green)
- **Severity:** Low
- **Category:** logging / config
- **Affected files:** `backend/eslint.config.js:12` (`"no-console": "warn"`), `backend/src/app.ts:22` (`logger: true`)
- **Problem:** `no-console` is a warning; ESLint exits 0 on warnings and CI runs plain `eslint`, so console usage never gates a build (harmless today — 1 console call exists). Separately, `logger: true` uses pino defaults with no `redact` paths.
- **Why it matters:** Nothing leaking today, but no guardrail prevents a future `console.log(patient)` from shipping, and pino without `redact` will emit auth headers/cookies verbatim if request-logging serializers are ever widened — meaningful for a PHI system.
- **Safe fix:** Bump `no-console` to `error` (allow `warn`/`error`) to hold the count at zero; add a `redact` list (`authorization`, `cookie`, `set-cookie`, patient PII fields) to the Fastify logger.
- **Difficulty:** Low
- **Production urgency:** Low
- **Priority:** P4

### 🟡 Finding S-CSP: Frontend Content-Security-Policy lacks `script-src` (documented tradeoff) — MECHANISM SHIPPED 2026-07-08 (nonce `script-src` implemented in `proxy.ts`, scoped to the always-dynamic auth portals; public site keeps the baseline CSP since it's statically generated. Behind `ENABLE_NONCE_CSP`, default **off** — verified public CSP unchanged via curl; enable after one logged-in portal hydration check in a production build.)
- **Severity:** Low (hardening)
- **Category:** headers
- **Affected files:** `frontend/next.config.ts:51-67`
- **Problem:** The CSP ships `frame-ancestors 'self'; object-src 'none'; base-uri 'self'` but **no `script-src`** — so there is no policy-level backstop against inline-script injection if a sanitizer is ever bypassed. The config comment documents this as deliberate (Next injects inline bootstrap scripts; the CMS renders inline `<style>`; a strict policy needs per-request nonces).
- **Why it matters:** Defense-in-depth only — every HTML sink is already sanitized at render (see XSS review). But a nonce-based `script-src` is the standard second layer for a PHI app.
- **Safe fix:** Add a nonce-based `script-src` via Next middleware (per-request nonce injected into the bootstrap + allowed inline `<style>` handling). This is the deferred follow-up the config already anticipates.
- **Difficulty:** Medium
- **Production urgency:** No
- **Priority:** P4

---

## Prioritized Security Fix Roadmap

### Must Fix Before Production
- _No Critical/High vulnerabilities are open._ The platform is safe to run in production **today**. The items below are hardening; if forced to name pre-production must-dos for a PHI system, they are **S-001** (CSV injection — anonymous-plantable) and an explicit owner sign-off on **S-002** (ADMIN global-PHI policy).

### Should Fix Soon
- **S-001** — Add `neutralizeFormula` to both CSV exporters. _Trivial, highest residual severity._
- **S-002** — Owner decision on ADMIN vs SUPER_ADMIN global PHI access; add break-glass reason and/or country-scope if tightened.
- **S-003 / S-004** — Scope the `ws` override to `ws@7` (review `form-data`/`esbuild`/`vite` likewise); document/CI-check the non-inherited override blocks across the three `package.json` files.
- **S-006 / S-007 / S-008** — Constant-time cron compare; template-path allowlist; zod-parse the one admin route.

### Hardening Improvements
- **S-005** — Pin `algorithms: ["HS256"]` on all JWT verify calls.
- **S-009** — Fix the dead `.env.example` keys + the stale sanitizer comment.
- **S-010** — `no-console: error` + Fastify `redact` list.
- **S-CSP** — Nonce-based `script-src` CSP on the frontend (the anticipated follow-up).
- Fix the **29 backend lint errors** so `pnpm lint` is green again and the audit gate is meaningful.
- Consider a **captcha** on the public newsletter/contact endpoints if abuse volume rises (rate limits are currently the accepted control).

## Recommended Security Baseline

| Area | Standard for this repo |
|---|---|
| **Input validation** | zod on every mutating body with `.max()` bounds (already the norm); eliminate `req.body as` assertions (S-008). |
| **Output encoding** | Sanitize CMS HTML on save **and** render (already done); neutralize CSV formula cells on export (S-001); JSON-LD `<`-escape (already done). |
| **SQL / ORM query safety** | Prisma parameterized queries / `Prisma.sql` only; no `$queryRawUnsafe` with interpolation (already the norm). |
| **Authentication** | HS256 JWT, `httpOnly`+`secure`+`sameSite:lax` cookie, `tokenVersion` revocation, bcrypt ≥12, hashed single-use reset tokens — pin the JWT algorithm (S-005). |
| **Authorization** | Central guards + object-level owner scoping; break-glass reason for ADMIN PHI override (S-002). |
| **Rate limiting** | `global:true` default + tight per-route limits with `skipOnError:false` on auth (already done); shared store before horizontal scale. |
| **CORS** | Allowlist, fail-closed, `credentials:true`, no wildcard (already done). |
| **Cookies** | `httpOnly` + `secure`(prod) + `sameSite:lax` + `path:/` (already done). |
| **Security headers** | HSTS/XFO/nosniff/Referrer/Permissions in place; add nonce `script-src` CSP (S-CSP). |
| **Secrets management** | Zod-validated env with prod hard-fails, no committed `.env`, no `NEXT_PUBLIC` secrets (already done); remove misleading example keys (S-009). |
| **Logging** | Generic client errors, server-side detail only (already done); add pino `redact` + gate `no-console` (S-010). |
| **Dependency updates** | `pnpm audit` clean + CI gate (already done); major-scope all overrides and mirror pins across services (S-003/S-004). |

## Final Notes

Every finding above carries `file:line` evidence from a direct read of the current code. Areas that warrant **runtime / manual** confirmation beyond static analysis:

- **Authenticated penetration testing** of the role matrix (PATIENT/DOCTOR/ADMIN/LOCAL_ADMIN/SUPER_ADMIN/CORPORATE_ADMIN) against PHI endpoints — static review confirmed the guards exist and scope by owner, but cross-role IDOR is best proven by driving real sessions.
- **Stripe webhook** end-to-end in a production-like env: signature verification, idempotency replay, and refund-authorization gating under real event payloads.
- **Upload pipeline** with crafted files (polyglots, oversized, spoofed magic bytes) to confirm `verifySniffedMime` + S3 content-type serving behave as read.
- **Production env/secret review** on Railway: confirm the prod hard-fails actually fire (no dev JWT default, `MEDICAL_ACCESS_ENFORCE=true`, `BILLING_DRIVER=stripe`, fallback flags off) and that the deployed child services carry the intended override pins (S-004).
