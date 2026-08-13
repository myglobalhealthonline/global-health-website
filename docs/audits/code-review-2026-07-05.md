# Full Repository Code Review — Global Health Platform

## Summary

- **Date:** 2026-07-05
- **Branch:** `Dev-hassaan`
- **Files reviewed:** ~376 TypeScript/TSX source files across `backend/src` (Fastify API) and `frontend/` (Next.js 16), plus Prisma schema (3,520 lines, 111 models, 61 migrations), deployment configs, scripts, and test suites. Review ran as six parallel specialist passes (backend architecture, backend security, backend correctness, frontend architecture, frontend correctness/security, infra/DB/testing), with repo-wide `tsc --noEmit` and `eslint` gates (both green), consolidated into an architecture assessment by Fable 5.
- **Assessment:** This is an unusually well-hardened codebase for a team of this size. The subscription/credit/refund/webhook stack reads like it survived real incident post-mortems: idempotency keys keyed to business identity, monotonic status guards, atomic guarded updates, DST-aware timezone math. Frontend security posture is genuinely good — every proxy route uses an explicit method+path allowlist, all `dangerouslySetInnerHTML` sites are sanitized, and the edge auth proxy fails closed in production. The two blockers are not code bugs but posture gaps: the medical-access guard ships in shadow mode by default (logs PHI-access denials but still serves the data), and the Prisma migration history cannot rebuild a fresh database. Fix those two, plus a short list of upload-handling and boot-time hard-fail items, and this platform is in strong shape.

---

## Stack & Architecture Context

*(Consolidated from sub-agent context packets.)*

### Backend — `backend/`
- **Fastify 5.2 + TypeScript (strict) + Prisma 7.8 + PostgreSQL** (`@prisma/adapter-pg` + pg pool). Node 22, ESM, tsx dev loader.
- **Routing:** `@fastify/autoload` auto-registers `*.route.ts` files; route → Zod `safeParse` validation → module service → Prisma. Errors normalized via `normalizeDbError()` and custom error classes.
- **Auth:** HS256 JWT in HttpOnly cookie (`gh_auth`, 7d). Roles: `PATIENT / DOCTOR / ADMIN / SUPER_ADMIN / LOCAL_ADMIN` (country-scoped). Guards: `requireAuth`, `verifyAdminAccess` (session or timing-safe Bearer fallback, prod-gated), `verifyDoctorAccess`. Doctors additionally require signed confidentiality agreement + verified TOTP 2FA before PHI access.
- **Medical access control:** central `lib/medical-access-guard.ts` — 6-tier consent-driven decision (SELF / ADMIN_OVERRIDE / LOCAL_ADMIN_SCOPE / DIRECT_ONLY / COUNTRY_CLINIC / GLOBAL_NETWORK / CROSS_COUNTRY_GRANT), every decision written to `MedicalAccessLog`, denials raise deduplicated `SecurityAlert` rows. Enforcement toggled by `MEDICAL_ACCESS_ENFORCE` (currently shadow mode — see Blocker 1).
- **Payments:** multi-account Stripe (IE default, PT/CZ overrides), billing behind a port/factory (`FakeBillingPort` vs `StripeBillingPort`), raw-body webhook with signature verification across all configured accounts, hourly money-invariant reconciliation cron, ops-alert webhook.
- **Background jobs:** in-process `internal-scheduler.ts` — 5 intervals (pre/post-payment reminders, subscription ops sweep, reconciliation, renewal reminders). No external queue.
- **PHI protection:** AES-256-GCM envelope encryption for national ID/passport/tax ID/IBAN (key optional — see Should Fix), HMAC blind indexes for dedup, immutable `Audit` log.
- **Email:** Gmail API → SendGrid fallback → console (dev). WhatsApp via WaSender. S3-compatible media storage (Railway buckets) with local-dev fallback.

### Frontend — `frontend/`
- **Next.js 16.2 (App Router, standalone output) + React 19 + Tailwind 4**; design tokens in `globals.css` (`gh-*`/`gh2-*` system, forest/ivory healthcare-lux palette per DESIGN docs).
- **Route groups:** `(site)` public `/:country/:lang` pages, `(auth)`, `(admin)` CMS + ops dashboard, `(doctor)` portal, patient `/account` portal, `/print/*` documents.
- **Edge auth:** `proxy.ts` verifies the JWT locally with `jose`, role-gates `/account|/admin|/doctor`, stamps `x-gh-country/locale/role/email` request headers for RSCs; fails closed in prod if `AUTH_JWT_SECRET` missing.
- **Data flow:** RSC-first; ~40 route handlers under `app/api/*` act as thin allowlisted proxies to the backend, forwarding the session cookie. Client state minimal (CartContext only). i18n: 6 locales, URL → header → cookie → Accept-Language → country-default resolution.
- **Security:** all 10 `dangerouslySetInnerHTML` sites routed through `sanitize-html` helpers; no secrets in `NEXT_PUBLIC_*`; `Set-Cookie` re-binding handled via `getSetCookie()`.

### Deployment & testing
- **Railway, 3 build paths:** backend via Nixpacks (Node 22 + LibreOffice + Chromium for DOCX→PDF), start = `prisma migrate deploy && node dist/server.js`; frontend via multi-stage Dockerfile (non-root, standalone). Root `nixpacks.toml` is a legacy duplicate. Local Postgres 16 via docker-compose.
- **Testing:** backend 22 `node:test` files (strong on subscriptions/webhooks/appointment status); frontend 5 vitest unit tests + 3 Playwright e2e specs (smoke, public redesign, portal redirects). Revenue path (book → pay → webhook → fulfill) has no end-to-end test.

---

## Project Structure Overview

| Path | Purpose |
|---|---|
| `backend/src/app.ts`, `server.ts` | Fastify builder (CORS/helmet/rate-limit/multipart/raw-body), boot + scheduler start |
| `backend/src/config/env.ts` | Zod env schema, Railway alias mapping, prod hard-fail guards (JWT only today) |
| `backend/src/routes/` (~60 files) | Autoloaded HTTP surface: public, `/api/account`, `/api/me`, `/api/doctor`, `/api/admin`, payments, cron |
| `backend/src/modules/` | Domain services: auth, appointments, doctor-availability, gp-booking, orders, subscriptions, credits, billing, invoices, patient-merge, medical-access, blog/pages/seo, automation |
| `backend/src/lib/` | Cross-cutting: medical-access-guard, phi-crypto, blind-index, stripe multi-account client, email, internal-scheduler, GHN/order/invoice number generators |
| `backend/src/validations/` | Zod schemas per route family |
| `backend/prisma/` | 111-model schema, 61 migrations, seeds |
| `frontend/app/` | App Router: `(site)`, `(auth)`, `(admin)`, `(doctor)`, `account`, `api/*` proxy handlers, `print/*` |
| `frontend/components/` | layout / sections / cards / cart / calendar / chat / portal-* / templates / seo / compliance |
| `frontend/lib/` | api wrappers (auth-api, admin-api, cart-client, public-api), i18n, routing, format-datetime, server proxy helpers |
| `frontend/proxy.ts` | Edge auth + locale-context middleware |
| `Templates/` | Country-prefixed DOCX clinical templates (source of truth, synced to backend assets on install) |
| `scripts/`, `backend/scripts/` | 43 ops/import/backfill scripts (guarded destructive ops) |
| `docs/`, `*/docs/` | Design system, plans, compliance docs |

---

## Architecture Review from Fable 5

### What the architecture gets right
1. **Trust boundaries are real and consistent.** Frontend never duplicates authorization; every `app/api/*` handler is an allowlisted pass-through and the backend is the single authority. The edge proxy strips/sets `x-gh-role`/`x-gh-email` unconditionally, so header forgery is dead on arrival. This is the correct shape for a BFF and it's executed uniformly.
2. **Ports where they matter.** `BillingPort` (fake vs Stripe) is the one abstraction in the codebase with two real implementations, and it earns its keep: dev/test runs without Stripe keys, and the webhook replayer makes subscription logic testable. No speculative interfaces elsewhere — the codebase is refreshingly YAGNI-compliant.
3. **Money code is the most mature layer.** Idempotency keyed to business identity (period, reservation, refund-period — not just event IDs), monotonic webhook guards against out-of-order delivery, terminal-uniqueness indexes, hourly invariant reconciliation with ops alerts. This is production-payment-grade design.
4. **Compliance instrumentation is architecture, not bolt-on.** Every PHI read flows through one guard; consent is append-only history; audit and security-alert writes happen even on the allow path. The *instrumentation* is complete — only the enforcement flag is wrong (Blocker 1).

### Major design risks

1. **Security posture by optional env flag (systemic pattern).** Four separate protections degrade silently to "off" when an env var is unset: `MEDICAL_ACCESS_ENFORCE` (guard logs but serves PHI), `PHI_ENCRYPTION_KEY` (plaintext national IDs), `BILLING_DRIVER` (fake billing "succeeds" checkouts), rate limiting (`global: false`, opt-in per route). The codebase already has the right pattern — `env.ts` hard-fails production boot on a dev JWT secret — but applies it only once. **This is the single highest-leverage architectural fix: extend the boot-time production assertion to all four.** A misconfigured deploy should refuse to start, not run quietly insecure.

2. **Unrebuildable migration history.** `20260520000000_cart_first_booking_patient_fields` alters `CartItem` before any migration creates it. Consequence: `prisma migrate dev` is permanently broken, every schema change goes through the diff-from-live-DB workaround, and **a fresh environment (new developer, CI database, disaster recovery) cannot be constructed from migrations at all**. For a platform holding PHI, "we cannot rebuild the database from source" is a disaster-recovery hole, not a dev-experience nit. Baseline-squash the history (`migrate diff --from-empty --to-schema-datamodel`) or insert a repair migration.

3. **Single-process scheduler = single-replica assumption.** All five cron loops run inside the API process with no distributed lock or leader election. Scaling the backend to 2 Railway replicas duplicates every job: double reminder emails, concurrent sweeps racing the webhook handlers, double reconciliation alerts. The idempotency in the job bodies mitigates the money paths, but emails/WhatsApp are not idempotent. Before any horizontal scaling: gate the scheduler behind a `RUN_SCHEDULER=true` env (one worker replica) or add a Postgres advisory-lock wrapper per job. Cheap now, painful later.

4. **`Order.appointmentIds` denormalized ID array.** GIN-indexed `String[]` instead of a relation → no FK integrity, orphaned IDs after appointment deletion, and every "orders for this appointment" query is an array-contains scan. Combined with `Payment.appointment onDelete: Cascade` (financial rows silently deleted with their appointment — see Should Fix 6), the order↔appointment linkage is the weakest part of an otherwise disciplined 111-model schema. Introduce a proper `OrderAppointment` join table when this area is next touched.

5. **Flat route sprawl vs module cohesion.** ~60 files sit flat in `backend/src/routes/` while business logic lives in `modules/`. Autoload makes this work, but the mapping route→module is by naming convention only, and several routes (e.g. `admin-notifications.route.ts` using `resolveOptionalAuthUser` with an inline role check) drift from the standard guard conventions. Same story on the frontend: `lib/admin/admin-api.ts` is 2,613 lines — the whole admin surface in one file. Neither blocks anything today; both raise the cost of every future change and make convention-drift (the `resolveOptionalAuthUser` case) more likely. Direction: group routes by domain folder to mirror `modules/`, split `admin-api.ts` by domain on next touch.

6. **Test pyramid is inverted around revenue.** The best-tested code (subscription webhooks, pricing resolver) is also the best-designed; the untested modules are exactly the risky ones: `invoices` (financial documents), `gp-booking` (assignment engine with a live race, see Should Fix 8), `patient-merge` (8-table PHI FK repoint), `two-factor` (auth), plus zero e2e coverage of book→pay→fulfill. The team demonstrably knows how to test; coverage just didn't follow risk. Prioritize by blast radius: invoices and gp-booking first.

### Scaling outlook
Fastify+Prisma+Postgres with this schema comfortably serves the current multi-country load. The bottlenecks that will appear first, in order: (1) scheduler duplication on multi-replica (above), (2) lazy slot-generation races under concurrent booking of the same doctor (Should Fix 7 — needs a DB exclusion constraint as the real guard), (3) the per-reservation transaction loop on payment confirmation (Suggestion). None require a redesign; all have targeted fixes.

---

## Findings

### Blockers

#### B1 — Medical access guard defaults to shadow mode: logs PHI denial, still serves the data
`backend/src/config/env.ts:230`, `backend/src/lib/medical-access-guard.ts:88-96`
Every PHI read (`doctor-patient-profile`, `medical-documents`, `account-profile`, `admin-patient-profile` routes) calls the guard, but when `MEDICAL_ACCESS_ENFORCE` is unset, a denial only writes `MedicalAccessLog` + `SecurityAlert` — **the route still returns the PHI**. A doctor without 2FA, without a signed confidentiality agreement, or with no consent/appointment relationship can read any patient's record; the only consequence is an after-the-fact audit row. This was SEC-001 in the prior audit and is still open.
**Fix (config + boot guard):**
```ts
// backend/src/config/env.ts — after parsing
if (parsed.NODE_ENV === "production" && !medicalAccessEnforce) {
  throw new Error(
    "MEDICAL_ACCESS_ENFORCE must be true in production. Verify 2FA/confidentiality/consent backfill via the shadow-mode audit log, then flip this flag."
  );
}
```
Shadow mode stays available for staging rollout; production can never silently run open.

#### B2 — Prisma migration history cannot rebuild a database from scratch
`backend/prisma/migrations/20260520000000_cart_first_booking_patient_fields/migration.sql:21`
`ALTER TABLE "CartItem"` runs before any migration creates `CartItem` (verified: zero `CREATE TABLE "CartItem"` across all 61 migrations). `prisma migrate dev` is permanently broken (shadow-DB replay fails); the team works around it via diff-from-live-DB + `migrate deploy`. A fresh dev environment, CI database, or disaster-recovery rebuild is **impossible from source**.
**Fix:** baseline-squash the history — `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` into a new `0_init`, mark applied on live with `prisma migrate resolve` — or insert a repair migration creating `CartItem` before the 20260520 timestamp. Squash is cleaner given 61 migrations of accumulated drift.

---

### Should Fix

#### SF1 — No production hard-fail when billing runs on the fake driver
`backend/src/modules/billing/billing.factory.ts:21-24`, `backend/src/config/env.ts`
`getBillingPort()` silently returns the in-memory `FakeBillingPort` when `BILLING_DRIVER !== "stripe"` or keys are missing. A prod deploy with a missing `STRIPE_SECRET_KEY` would "successfully" complete checkouts against an in-memory fake with no operator signal.
```ts
if (parsed.NODE_ENV === "production" && parsed.BILLING_DRIVER !== "stripe") {
  throw new Error("BILLING_DRIVER must be 'stripe' in production.");
}
```

#### SF2 — `PHI_ENCRYPTION_KEY` optional: encryption silently no-ops to plaintext
`backend/src/config/env.ts:151`, `backend/src/lib/crypto/phi-crypto.ts:10,27`
When unset, `encryptPhi` stores national ID / passport / tax ID in plaintext with zero warning. Same boot-guard pattern as B1/SF1: hard-fail production when the key is missing.

#### SF3 — Clinical/patient upload routes trust client-declared MIME; no magic-byte sniffing
`backend/src/routes/medical-documents.route.ts:130,385`, `account-profile.route.ts:244,310,485`, `patient-upload.route.ts`, `appointment-documents.route.ts:126-127`
All four take `part.mimetype` from the multipart header and store it as the object's content type. A polyglot file (HTML/SVG declared as `application/pdf`) enters clinical workflows. `admin-media-upload.route.ts:34,100` already has a working `sniffFileMime()` — it just isn't shared.
**Fix:** extract to `utils/sniff-mime.ts`, call it in all four routes before the allowlist check, store the sniffed type.

#### SF4 — `appointment-documents` serves clinical files `Content-Disposition: inline`
`backend/src/routes/appointment-documents.route.ts:255-256`
Sibling route `medical-documents.route.ts` was already fixed to `attachment`; this one wasn't. Combined with SF3 (unsniffed MIME), a mislabeled file can render in-browser (stored-content execution surface).
**Fix:** switch to `attachment`; if inline preview is a product requirement, land SF3 first and sandbox the preview.

#### SF5 — Patient-upload bearer tokens live 100 years, non-revocable
`backend/src/modules/patient-upload/patient-upload-link.service.ts:4` — `TOKEN_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000`
A leaked upload link (forwarded email, browser history) is valid forever; no DB row means no revocation, no single-use. **Fix:** `PatientUploadLink` table (hashed token, 7–14 day `expiresAt`, `usedAt`/`revokedAt`), keep the HMAC but bind to the row. Larger effort — schedule it.

#### SF6 — `Payment.appointment onDelete: Cascade` deletes financial records
`backend/prisma/schema.prisma` (`model Payment`)
Deleting an Appointment silently deletes its Payment rows. Financial/audit records must survive entity deletion (refund disputes, accounting, PHI audit trail). Every other Appointment relation is `SetNull` — Payment is the outlier. **Fix:** `onDelete: Restrict` (or `SetNull` + nullable FK) + migration.

#### SF7 — Concurrent slot generation can create overlapping doctor slots
`backend/src/modules/doctor-availability/doctor-availability.service.ts:302-355`
`ensureServiceSlotsForRange` reads existing slots once, then checks candidates against a local array; `createMany({ skipDuplicates })` only dedupes exact `(doctorId, startAt)` pairs. Two concurrent calls for the same doctor with different service durations (30-min GENERAL vs 60-min SPECIALIST) can each insert overlapping OPEN slots — both bookable → doctor double-booked at the calendar level (the per-row claim in `claimDoctorSlot` protects a single row, not overlap).
**Fix:** Postgres exclusion constraint as the real guard —
```sql
ALTER TABLE "DoctorTimeSlot" ADD CONSTRAINT no_overlap
  EXCLUDE USING gist ("doctorId" WITH =, tstzrange("startAt", "endAt") WITH &&)
  WHERE (status <> 'BLOCKED');
```
— and catch the violation in the generator to skip the candidate.

#### SF8 — GP round-robin cursor: non-atomic read-modify-write loses increments
`backend/src/modules/gp-booking/gp-config.service.ts:140-168` (consumed at `gp-assignment.service.ts:343-351`)
Two concurrent same-lane bookings both read cursor=5, both assign candidate[5], both write 6 — same doctor gets both bookings even with 2+ candidates, silently skewing load. The correct atomic-counter pattern already exists next door in `credit-balance.service.ts`. **Fix:** `UPDATE ... SET value = value + 1 ... RETURNING` (or move cursor to a dedicated row with an atomic increment).

#### SF9 — Paid-order fulfillment failure is log-only; no ops alert
`backend/src/modules/orders/complete-order-payment.service.ts:56-64`
Stock decrement + appointment minting failure after PAID logs "reconcile manually" — customer paid, got nothing, discoverable only via log scraping. Subscriptions already `emitOpsAlert` on policy violations. **Fix:** call the same ops-alert in this catch block.

#### SF10 — Two-factor module: pervasive `(prisma as any)` casts
`backend/src/modules/two-factor/two-factor.service.ts:57,106,145,186,235,262`
Type safety off in the 2FA secret/backup-code path — a field-name typo compiles silently and could break verification. Usually means a stale generated client. **Fix:** `prisma generate`, remove casts; if fields genuinely missing from schema, that's a bigger bug.

#### SF11 — No Railway healthchecks on either service
`backend/railway.json`, `frontend/railway.toml`
Railway promotes deploys once the port opens; backend runs `migrate deploy` first, so a half-booted or crash-looping app receives traffic. **Fix:** `"healthcheckPath": "/api/health"` on backend (endpoint exists); add frontend check in `railway.toml [deploy]`.

#### SF12 — Test coverage inverted vs risk
Zero tests in: `invoices` (financial documents, PT tax logic), `gp-booking` (assignment engine incl. SF8 race), `patient-merge` (8-table PHI FK repoint), `two-factor`, `medical-access-requests`. No e2e for book→pay→webhook→fulfill. **Fix order:** invoices + gp-booking (money) → patient-merge + medical-access (PHI) → two-factor (auth) → one Playwright authed booking journey in Stripe test mode + a slot-claim concurrency test.

#### SF13 — Production data snapshot on local disk
`backups/prod-data-2026-05-22T09-21-14.json` — gitignored and untracked (good), but an unencrypted prod snapshot (17 appointments, doctor PII, audit rows) in a synced Desktop folder is a PHI-compliance smell. **Fix:** delete or move to encrypted storage; point `snapshot-prod-data.ts` outside the repo.

---

### Suggestions

1. **Rate limiting opt-in (`global: false`) + `skipOnError: true`** — `backend/src/app.ts`. High-risk routes are covered, but every new route ships unthrottled by default, and a limiter-store error silently disables throttling. Suggest a conservative global default (300/min) with per-route overrides, `skipOnError: false` on login/password-reset.
2. **`admin-notifications.route.ts` uses `resolveOptionalAuthUser` + inline role check** — correct today (verified 403 path) but deviates from the `verifyAdminAccess` convention; a future edit could drop the inline check. Align with the standard guard.
3. **Dead code:** `backend/src/modules/orders/complete-order-payment.service.ts:482-485` (`afterMeet` fetched, never used — wasted query on webhook path); `frontend/components/layout/SiteFooter.tsx:178` (`regulatoryText` unused); `frontend/lib/routing/last-country.ts:28` (unused import).
4. **Patient-merge:** snapshots read before the transaction, `duplicateSnapshot.userId` used inside it — narrow staleness window on an admin op (`patient-merge.service.ts:145-175`); re-read inside the tx. Also inconsistent audit metadata keys (`duplicatePatientId` vs `mergedIntoPrimaryPatientId`, lines 248/259) — pick one key + a `role` field.
5. **`commitOrderCreditReservations` opens one transaction per reservation** (`checkout-pricing.service.ts:531-567`) — N round-trips on the payment-confirmation hot path; batch into one `$transaction` if multi-line carts become common.
6. **`frontend/lib/admin/admin-api.ts` — 2,613 lines.** Split by domain on next touch, not proactively.
7. **`HeroBookingWizard.tsx` a11y** — 3-step conversion wizard with one `aria-*` attribute total; add `aria-live="polite"` on loading/step status, `aria-current` on the active step.
8. **`Order.appointmentIds` denormalized array** — see Architecture Risk 4; join table when next touched.
9. **Config drift:** root `nixpacks.toml` duplicates the frontend Dockerfile build — delete or mark deprecated. `pnpm-workspace.yaml:4-9` `allowBuilds` values are literal placeholder text ("set this to true or false") — pnpm 10 will silently skip prisma/sharp/esbuild postinstalls on fresh installs; set real booleans.
10. **`docker-compose.yml:14-18`** — bind Postgres to loopback: `"127.0.0.1:5432:5432"`.
11. **`/tmp/` not gitignored** (`tmp/pdfs` receives generated clinical PDFs — one non-log file becomes committable). Add `/tmp/` to `.gitignore`; `rm *.log` at root (all already ignored, just clutter).
12. **`playwright.config.ts:43`** — e2e runs `next dev`; CI should run `next build && next start` to catch prod-only failures.
13. **`react-hooks/set-state-in-effect`** — `appointment-tabs.tsx:60` lacks the explanatory disable-comment its two siblings have; add for consistency.
14. **43 accumulated one-off import/backfill scripts** — prune completed ones.

### Clean / no issues
Verified clean on this pass: all frontend sanitization call sites; `proxy.ts` edge auth; cart/checkout proxy routes; `format-datetime.ts` timezone handling; `timezone.ts` DST math; `claimDoctorSlot` atomic claim; entire `subscriptions` module (`refund`, `subscription-webhook`, `subscription-grant`, `redemption`, `checkout-pricing`, `credit-balance` services); `media-public.route.ts` PHI-prefix blocking + path-traversal-safe keys; Stripe webhook signature handling; CORS/trustProxy config; cron fail-closed guards; seed/reset script hardening; git hygiene (no secrets, dumps, or logs tracked); `tsc` and `eslint` both green repo-wide.

**Prior-audit verification:** of the findings in `docs/audits/repo-review-findings-2026-06-10.md` / `docs/archive/2026-audit-round-1/security-audit-2026-07-08.md`, C1, C2, C3, C6, C7, H2, H6, H7, H9, H10, H14, M25 are confirmed **fixed** in current source. Still open: SEC-001 (→ B1), SEC-003 (→ SF5), SEC-005 (→ SF3), SEC-011 (→ SF2), SEC-009 (JWT revocation — unchanged, larger feature). SEC-004 partially fixed (→ SF1).

---

## Fix Checklist

**Blockers**
- [ ] B1 — Hard-fail production boot when `MEDICAL_ACCESS_ENFORCE` ≠ true (`config/env.ts`); confirm 2FA/confidentiality/consent backfill via shadow-mode logs first
- [ ] B2 — Repair/baseline-squash Prisma migration history so a fresh DB builds from source (`prisma/migrations/20260520000000_*`)

**Should Fix**
- [ ] SF1 — Hard-fail production boot on non-Stripe `BILLING_DRIVER` / missing Stripe keys (`billing.factory.ts`, `env.ts`)
- [ ] SF2 — Hard-fail production boot when `PHI_ENCRYPTION_KEY` unset (`env.ts`, `phi-crypto.ts`)
- [ ] SF3 — Share `sniffFileMime` across all 4 clinical/account/patient upload routes; store sniffed MIME
- [ ] SF4 — `appointment-documents.route.ts:255` → `Content-Disposition: attachment`
- [ ] SF5 — Replace 100-year patient-upload tokens with DB-backed, expiring, revocable links
- [ ] SF6 — `Payment.appointment` cascade → `Restrict`/`SetNull` + migration
- [ ] SF7 — Postgres exclusion constraint on `DoctorTimeSlot` overlap + generator catch
- [ ] SF8 — Atomic increment for GP rotation cursor (`gp-config.service.ts:140-168`)
- [ ] SF9 — `emitOpsAlert` on paid-order fulfillment failure (`complete-order-payment.service.ts:56-64`)
- [ ] SF10 — Remove `(prisma as any)` casts in `two-factor.service.ts` (regenerate client)
- [ ] SF11 — Railway `healthcheckPath` on backend + frontend services
- [ ] SF12 — Tests: invoices, gp-booking, patient-merge, medical-access, two-factor; e2e booking→payment journey; slot-claim concurrency test
- [ ] SF13 — Remove/encrypt `backups/prod-data-*.json`; write snapshots outside repo

---

## What's Done Well

- **Payment/subscription engineering** — idempotency keyed to business identity with comments explaining *why* each key was chosen over the obvious-but-wrong alternative (`refund.service.ts:107-116`); monotonic webhook guards; hourly invariant reconciliation with ops alerts. Production-grade.
- **Trust-boundary discipline** — frontend proxies are allowlisted pass-throughs; zero duplicated auth logic; edge proxy fails closed in prod and makes header forgery impossible.
- **Compliance instrumentation** — every PHI access decision logged (allow *and* deny), deduplicated security alerts, append-only consent history, immutable audit log, AES-256-GCM + blind indexes. Only the enforcement flag (B1) is wrong; the machinery is complete.
- **Prior-audit follow-through** — 12 of the previous audit's Critical/High findings verified fixed in source, including the textbook cron fail-open and the PHI media proxy.
- **DST-correct timezone handling** (`doctor-availability/timezone.ts`) — documents gap/overlap resolution, degrades gracefully on invalid zones.
- **Sanitization defense-in-depth** — frontend re-sanitizes CMS HTML even though the backend already does; tight allowlists, forced `rel="noopener noreferrer"`.
- **Operational hardening** — timing-safe token compares, destructive scripts gated behind `--yes-i-mean-it` + host confirmation, seed passwords env-driven, `trustProxy: 1` scoped to one hop.
- **Restraint** — no speculative abstractions; the one port with two implementations (billing) is the one that needed it. Both type-check and lint gates green across ~376 files.
