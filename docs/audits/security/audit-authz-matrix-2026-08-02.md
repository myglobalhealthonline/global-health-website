# Authorization Test Matrix

**Audit date:** 2026-08-02
**Repository:** `myglobalhealthonline/global-health-website`
**Branch:** `Dev-hassaan`
**Audit mode:** Test infrastructure build-out + real integration test execution against a live Postgres 16 database. No application code changed except two typo-adjacent field-name fixes discovered while wiring tests (none behavioral).

## Executive Summary

This phase had a structural blocker every prior phase also hit: no container runtime (Phase 0), which the plan's own design assumed for the test Postgres. Rather than skip the phase or fall back to synthetic-only validation, **Postgres 16 was installed natively via Homebrew** — the same major version as `docker-compose.yml`'s `postgres:16-alpine` — and the entire backend test suite was run against a real database for the first time in this audit programme.

**This surfaced something worth stating plainly: with a real database, all 880 pre-existing backend tests pass.** The "17 failures" noted in Phases 1–4 (and confirmed via `git stash` to be identical on the pristine baseline) were 100% environmental — DB-dependent integration tests that fail hard rather than self-skip when no Postgres is reachable. There is no hidden defect behind that number; it was this session's own sandbox limitation the whole time.

## What was built

1. **`backend/scripts/seed-test-accounts.ts` extended** to all 6 roles plus a second, unrelated doctor/patient pair. Ran end-to-end against the real database twice (idempotency verified — identical row IDs on re-run). Also made the script self-sufficient: it previously threw ("run `prisma db seed` first") if no `Country` row existed, but no such generic seed script actually exists in this repo — a fresh test database has zero countries. It now creates two minimal countries itself, which is also what `LOCAL_ADMIN` cross-country-scope testing requires.
2. **`backend/src/routes/authz-matrix.test.ts`** — a new integration test file using this repo's own proven pattern (`buildApp()` + `app.inject()` + `signAuthToken()`, ephemeral self-cleaning fixtures — the exact approach `admin-plans.route.test.ts` already established, not a new one). 7 tests, 6 real and passing, 1 documented as `.todo()`.
3. **`frontend/tests/e2e/fixtures/auth.setup.ts`** + **`authz-boundaries.spec.ts`** — Playwright storageState-per-role fixtures and cross-portal boundary checks, wired into `playwright.config.ts` as a dedicated `setup` project.
4. **CI wiring** — the new backend test is picked up automatically (zero CI changes needed there); a new `e2e-authz` job boots Postgres + backend + frontend and runs the Playwright suite.

## A real discovery made while building the fixtures: `MEDICAL_ACCESS_ENFORCE` shadow mode

`backend/.env.test` sets `COMPLIANCE_MODE=relaxed`, which defaults `MEDICAL_ACCESS_ENFORCE` to `false` — shadow mode: `assertMedicalAccess` logs a would-be denial to `MedicalAccessLog` but never actually blocks the request. The first draft of `authz-matrix.test.ts` correctly authenticated as the owning doctor and still got `200` regardless of the actual authorization decision, because in shadow mode `denyDecision()` never throws at all — every `guardMedicalRead*` call site's catch block is unreachable.

This isn't a test-writing mistake to route around quietly — it's the exact behavior `medical-access-guard.test.ts` already depends on (that file mutates the shared, non-frozen `env` object directly — `env.MEDICAL_ACCESS_ENFORCE = true` — per test). `authz-matrix.test.ts` uses the identical technique, snapshotting and restoring the original value in `before()`/`after()` so it can't leak into other test files sharing the same Node process. **Full test-suite run after this change: 887 tests, 886 pass, 0 fail, 1 todo — no leakage, no regression.**

This also means: anyone testing this guard's *enforcement* behavior against `.env.test` as configured must explicitly force enforce mode the same way — testing against the default `.env.test` settings alone would silently prove nothing, since every call site would "pass" regardless of the actual authorization decision underneath.

## What the fixture actually required (worth recording precisely)

Getting a real `200` from the DOCTOR-allow branch in `medical-access-guard.ts` needed, in order:
1. `User.twoFactorVerifiedAt` set (branch 4b — 2FA gate)
2. A `DoctorConfidentialityAgreement` row at the current version (`"1.0.0"`, branch 4a)
3. A `PatientConsent` row (`consentType: "MEDICAL_ACCESS_DIRECT"`, `consentValue: true`) plus an `Appointment` linking doctor↔patient (branch 4c — the simplest of the four consent-level paths the guard tries)

None of this is exotic, but it is not obvious from the route code alone — the guard's actual allow/deny decision tree lives entirely in `medical-access-guard.ts`, several files away from any given route handler. A future test (or a real bug report) reading "why is this doctor denied" should start there.

## Test Results

### Backend integration matrix (`authz-matrix.test.ts`) — run against real Postgres 16

| Test | Result | Category |
|---|---|---|
| Unauthenticated doctor clinical route → 401 | ✅ Pass | Unauthenticated access |
| Unauthenticated admin route → 401 | ✅ Pass | Unauthenticated access |
| Owning doctor reads their own patient's prescriptions → 200 with data | ✅ Pass | Regression protection (the correct pattern working) |
| Unrelated doctor reads another doctor's patient's prescriptions → 404 | ✅ Pass | **Cross-tenant IDOR** — blocked by the `doctorId`-scoped `Appointment` lookup in `prescriptions.route.ts`, before the guard is even reached |
| Allowed PHI read writes a `MedicalAccessLog` row with the correct actor/resource | ✅ Pass | PHI audit trail |
| Stale `tokenVersion` cookie (post "sign out of all devices") rejected → 401 | ✅ Pass | **Session invalidation (S-004)** |
| S-032: unrelated doctor blocked from another doctor's patient *documents* | 🟡 `.todo()` | Documents the confirmed Phase 4 finding — currently fails for real, by design, until the underlying route is fixed |

`LOCAL_ADMIN` country-scope was **not** re-tested here — it is already covered end-to-end by the pre-existing `orders.route.local-admin-scope.test.ts` (confirmed passing against the real database in this session's full-suite run). Duplicating it would have added nothing.

### Full backend suite (real Postgres, this session)

| Metric | Value |
|---|---|
| Tests | 887 |
| Pass | 886 |
| Fail | 0 |
| Todo | 1 (S-032, intentional) |
| Compare to Phases 1–4 (no DB) | 704 pass / 17 fail / 15 cancelled / 144 skipped — confirmed via `git stash` to be identical on the pristine baseline; **every one of those 17 failures now passes with a real database** |

### Frontend suite

313/313 pass, unaffected by any Phase 5 change.

## What was verified vs. what was not

**Verified, with a real database, in this session:**
- Seed script runs end-to-end and is idempotent
- The full backend integration matrix (`authz-matrix.test.ts`) — 6/6 real assertions pass, 1 correctly documents a known gap
- The entire pre-existing 880-test backend suite, previously never run against a real DB in this audit programme
- `env.MEDICAL_ACCESS_ENFORCE` mutation doesn't leak across test files in the same process

**Not verified — the CI wiring for E2E (`e2e-authz` job) could not be dry-run locally.** Unlike every other CI job added in this audit programme (each of which was tested against a real invocation before being wired in), the Playwright job requires simultaneously running Postgres, a built backend server, and a Next.js frontend dev/build server — standing all three up together was judged out of proportion to this phase's "secondary" billing in the plan. `playwright test --list` was used to validate the config and fixture wiring (138 tests discovered across 8 files, including the 6 new `setup` project tests and 12 new boundary-check tests; the pre-existing 16 `patient-portal.spec.ts` tests are unaffected), and `tsc --noEmit` confirms the new TypeScript files are clean — but no browser has actually driven this flow end-to-end. `continue-on-error: true` is set accordingly, and this is the one part of Phase 5 to treat as unverified rather than proven, until someone runs it for real in Actions.

## Local environment notes

Postgres 16 (Homebrew) is running on `127.0.0.1:5433`, matching `backend/.env.test`'s already-committed `DATABASE_URL` exactly — no repo files needed changing to use it. `LC_ALL=en_US.UTF-8` is required to start it (a `postmaster became multithreaded during startup` failure otherwise, per Homebrew's own install-time caveat). Left running for the remainder of this audit session in case Phase 7 needs it again.

## Recommended ongoing practice

- Any future test of `guardMedicalRead`/`assertMedicalAccess` behavior must explicitly set `env.MEDICAL_ACCESS_ENFORCE = true` (and restore it) — `.env.test`'s default shadow mode will make every such test pass regardless of the actual authorization outcome.
- `authz-matrix.test.ts`'s `.todo()` entries are the intended mechanism for tracking a known, unfixed authorization gap as a live regression test — remove the `.todo()` (not the test) once S-032 is fixed, and it should immediately go green.
- Add `S-031`/`S-033` `.todo()` entries the same way once someone is ready to fix `admin-invoices.route.ts` and `patient-upload.route.ts` — not done in this pass to keep this file's scope to what was already fixture-built and verified (`doctor-patient-documents.route.ts`'s appointment/consultation/prescription chain was the one already constructed for the cross-tenant IDOR test).
- Confirm the `e2e-authz` CI job in a real Actions run before flipping its `continue-on-error` — this is the one gate in the whole programme not empirically dry-run.
