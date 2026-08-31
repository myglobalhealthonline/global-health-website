# Load testing (k6)

Six execution profiles (`smoke` → `soak`) exercising a realistic traffic mix
(public browsing, patient/doctor/admin portal reads, the booking journey,
chat polling, login, and a handful of heavy endpoints) against a
**non-production** copy of this app. See
`docs/testing/load-test-run-sheet.md` for the full pre-flight checklist,
execution ladder, and cleanup steps — this file only covers running the
harness itself.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed locally.
- A non-production target environment (Railway snapshot, staging, or local).
  `lib/helpers.js` refuses to run against a known production host unless
  `LOADTEST_ALLOW_PRODUCTION=1` is explicitly set.
- `config/targets.json` — non-secret target config (base URLs are
  deliberately blank; set them via `LOADTEST_FRONTEND_URL` /
  `LOADTEST_BACKEND_URL` env vars, or fill them in for a fixed local setup).
- `config/secrets.json` (gitignored, copy the shape from any existing entry
  in the run sheet) — holds `proxyClientIpSecret`, matching
  `PROXY_CLIENT_IP_SECRET` on the target backend/frontend.
- `config/cookies.json` (gitignored) — authenticated-scenario sessions.
  Populate by running `node scripts/mint-load-test-cookies.mjs`, which needs
  `config/seed-passwords.json` (gitignored) and accounts already seeded via
  `backend/scripts/seed-test-accounts.ts` (`pnpm db:seed` from `backend/`).
  Missing this file just means the "authenticated" scenarios run
  unauthenticated — see `authCookieAttached` in `lib/helpers.js` and the
  `auth_cookie_attached` threshold in `lib/profile-builder.js`, which fail
  loudly instead of letting that pass silently.
- Doctor availability for the booking-journey scenario — run
  `backend/scripts/seed-loadtest-gp-availability.ts` once per DB snapshot
  (see the run sheet's "Doctor availability for gp-assign" section).

## Running a profile

```bash
./run.sh smoke          # 5 VU, 2 min — run first, always
./run.sh baseline       # 50 VU, 15 min
./run.sh target-200     # 200 VU, 30 min — the certification run
./run.sh stress         # 200->600 VU, finds the ceiling
./run.sh spike          # 0->300 VU in 30s, 5 min hold
./run.sh soak           # 100 VU, 2 hours
```

Each run archives a summary JSON and a per-sample time-series JSON under
`../docs/audits/perf/loadtest-<date>/`. Anything after the profile name is
passed straight through to `k6 run` (e.g. `./run.sh smoke --quiet`).

## Layout

- `profiles/*.js` — the six execution profiles (VU/duration ladder +
  thresholds).
- `lib/profile-builder.js` — shared scenario wiring, traffic-mix ratios, and
  `THRESHOLDS` used by every non-chaos profile.
- `lib/helpers.js` — base URLs, the production-host guard, synthetic per-VU
  IPs (so each VU gets its own rate-limit bucket), and the cookie pool.
- `scenarios/*.js` — one function per traffic type (public browsing, patient/
  doctor/admin portal reads, booking journey, chat polling, auth login, heavy
  endpoints).
- `scripts/mint-load-test-cookies.mjs` — logs into the seeded test accounts
  once and writes `config/cookies.json`.
- `monitor-db-pool.sh` — samples `pg_stat_activity` to CSV while a profile
  runs (see the run sheet for usage alongside a profile).
