# PHI Access Recovery Plan — 2026-07-17

Owner decisions (Hassaan): consent checkbox REQUIRED at registration/booking; backfill ALL existing patients to active consent; replace confusing TOTP-only 2FA with an easy path. Routing: **Fable = brain** (sequence, review every diff), **Sonnet 5 = execution**.

Context: SEC-002 wired the medical-access guard onto all doctor PHI routes (correct), but `PatientConsent` was never populated and 2FA/TOTP enrollment is high-friction — so with enforcement on, doctors/admins are locked out (`DOCTOR_NO_VALID_ACCESS_PATH`). See go-live-audit-review-2026-07-17.md §11.

## Immediate (env, human) — DONE WHEN SET
- Development env: `NODE_ENV=development` → guard skips on Dev, everyone unblocked while the work below lands.
- HOLD deploying `release/go-live`/`Security-Audit` to Production until Tasks 1–4 are done.

## Task 1 — Mandatory consent at registration + booking (Sonnet)
- Registration form + booking checkout: REQUIRED checkbox (blocks submit, no default-checked-hidden pattern) — "I consent to my treating doctor accessing my medical information."
- On accept: write `PatientConsent` row `MEDICAL_ACCESS_DIRECT / consentValue=true / source=REGISTRATION|BOOKING`.
- Backend validation mirrors it (reject registration/booking without the flag) — client-only is not enough.
- `GLOBAL_NETWORK` consent stays a SEPARATE optional checkbox (GDPR: no bundling).

## Task 2 — Backfill existing patients (Sonnet authors, human runs on prod)
- Idempotent script `backend/scripts/backfill-patient-consent.ts`: for every `PatientProfile`, insert `MEDICAL_ACCESS_DIRECT=true` row if none exists, `source=BACKFILL_2026_07`.
- Append-only model = safe to re-run. Run with `--env-file=.env` (P1000 gotcha).
- Run on Dev DB first, verify counts, then owner runs on Production.
- Legal note: defensible under GDPR Art 9(2)(h) (care provision); flag for legal sign-off, do not block on it.

## Task 3 — Doctor-of-record access to COMPLETED appointments (Sonnet)
- Guard path 4c (`doctorHasActiveAppointment`, medical-access-guard.ts:144-168) excludes `COMPLETED` — doctor loses the patient the moment a consult is marked complete (can't write post-consult notes / review history).
- Fix: treat `COMPLETED` as a valid doctor-of-record relationship; keep `CANCELLED` excluded. Add test.

## Task 4 — Easy 2FA: Email OTP + trusted device (Sonnet, Fable reviews closely)
Decision: TOTP stays as an OPTION; the required path becomes:
- **Email OTP**: on privileged-role login (ADMIN/LOCAL_ADMIN/DOCTOR/SUPER_ADMIN), send 6-digit code (10-min TTL, rate-limited, single-use, hashed at rest) via existing SendGrid path; verify → set `User.twoFactorVerifiedAt`.
- **Trusted device**: on successful OTP, set httpOnly signed cookie (30-day TTL, per-device token hashed in DB, revocable) — skip OTP while valid. Logout-all / password change revokes.
- Guard change: `twoFactorVerifiedAt` satisfied by EITHER TOTP or email-OTP verification (it already just checks the timestamp — wire the OTP flow to stamp it).
- Keep `REQUIRE_2FA_FOR_ROLES` semantics; the requirement stays, only the METHOD gets easy.
- Phase 2 (later): WhatsApp OTP via WaSender; passkeys.

## Task 5 — Admin break-glass coverage (Sonnet)
- `PhiReasonGate` (reason → `gh_phi_reason` cookie, 15-min TTL) exists ONLY on `/admin/patients/[email]`. Extend the same gate to every admin surface that reads PHI (appointments detail, documents, downloads).
- Smallest fix: shared layout-level interceptor or reusable wrapper around PHI-fetching admin pages.

## Task 6 — Denial visibility (Sonnet)
- Render `MedicalAccessLog.isAbnormal`/`abnormalReason` in the existing per-patient access-log UI (fields already in payload, never rendered).
- Add aggregate view or script: would-be denials across system (`abnormalReason IS NOT NULL`), so enforcement flips are previewable.

## Order + gates
1 → 2 → 3 land together (consent + backfill + completed-fix = doctors unblocked with enforcement on). 4 lands before Production deploy (else 2FA lockout). 5–6 before or immediately after deploy. Every task: typecheck + targeted tests + Fable diff review before commit. Verify chain per commit: `prisma generate` → `tsc` → lint.

## Production deploy checklist (after 1–6)
- Backfill run on prod DB (owner).
- `REQUIRE_2FA_FOR_ROLES` set on prod (email-OTP path live first).
- `NEXT_PUBLIC_SITE_URL` set.
- Then point Production at the release branch.
