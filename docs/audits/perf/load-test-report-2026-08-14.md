# Load test report — Global Health Website

**Date:** 2026-08-14
**Branch:** `Dev-hassaan`
**Environment:** Railway, `myglobalhealth.up.railway.app` (frontend) /
`backendmyglobalhealth.up.railway.app` (backend), Postgres confirmed as a
database snapshot/copy — not the live `myglobalhealth.online` production DB.
Pre-test backup: `loadtest/backups/pre-loadtest-20260813.dump`.
**Tooling:** k6 v2.2.0. Suite: `loadtest/`. Run sheet:
`docs/testing/load-test-run-sheet.md`.

## Summary

The site was certified against a **~200 concurrent user** target across
public pages/APIs, authenticated patient/doctor/admin portals, and the
booking-availability flow. **The target was not met.** At 200 concurrent
virtual users, page-load latency degraded to a p95 of 30 seconds (average
19.9s, one request took 15m57s), even though the error rate stayed low
(0.95%) and the database was nowhere near saturated. Root cause was isolated
to **the deployment running as a single, non-clustered Node.js process per
service** — CPU/memory telemetry shows large unused headroom (24 vCPU / 24GB
allocated, ~0.2-0.3 vCPU actually used) throughout the failing run, which
rules out a resource-limit explanation and points at event-loop contention
within the one thread each service runs on.

The remaining rungs of the planned execution ladder (stress, spike, soak)
were **not run** — see "Why the ladder stopped here" below.

## Environment safety (Phase 0, completed)

- Confirmed via matching `id`/`currencyId` on a country record that the
  target DB is a copy of production data, not a live-traffic database —
  user confirmed safe to write to.
- `pg_dump` backup taken before any load: `loadtest/backups/pre-loadtest-20260813.dump` (5.7MB).
- External integrations neutralized on the backend service for the test
  window: Gmail send, WhatsApp (WASender), Google Calendar/Meet OAuth,
  InvoiceXpress, Make.com invoice webhook all unset. Stripe was already on
  test-mode keys (`sk_test_...`) — no change needed.
- `PROXY_CLIENT_IP_SECRET` set identically on both services and verified
  live: confirmed each synthetic per-VU `x-gh-client-ip` gets an
  independently-tracked 300/min rate-limit bucket (direct test: 3 requests
  from one synthetic IP decremented 299→298→297 while a second IP
  independently read 299).
- Test identities: one seeded account per role (PATIENT ×2, DOCTOR ×2,
  ADMIN ×2), logged in once each, cookies persisted to
  `loadtest/config/cookies.json` (gitignored) — no login-endpoint hammering
  during any run.

## Results by profile

### Smoke (5 VUs, 2 min) — PASS

Run twice (once before, once after correcting the proxy secret in
`loadtest/config/secrets.json` to match what was actually deployed). Final
run: **100% checks passed, 0% http_req_failed**, all page loads and API
reads across public/patient/doctor/admin scenarios green. Confirmed the
harness works end-to-end and (via backend logs) that no real emails,
WhatsApp messages, or Stripe-live calls fired.

One coverage note: the booking-journey scenario's `POST /api/public/gp-assign`
call consistently returned `NO_DOCTOR` ("no GP doctor available for that
language and time") on every attempt across every run in this session,
regardless of which time slot was tried. This means the deepest write path
(cart add via the same-day auto-assign flow) was never actually exercised —
availability reads were fully covered, but the write was not. Worth checking
whether the auto-assign GP pool is configured for this snapshot at all
before relying on this scenario in a future run.

### Baseline (50 VUs, 15 min) — PASS

**100% checks passed, 0% http_req_failed.** 19,868 requests, 11,962
iterations over 15 minutes, peak 53 VUs.

| Metric | Result | Threshold |
| --- | --- | --- |
| Page load p95 (`/ie/en`) | 1.1s | < 1.5s ✓ |
| http_req_duration avg / p95 | 456ms / 890ms | — |
| Error rate | 0.00% | < 1% ✓ |

DB pool monitor: max 4 active connections of the 10-connection cap, 130
samples, no lock waits. Comfortable headroom at this load level.

### Target-200 (200 VUs, 30 min hold) — **FAIL**

**81,960 requests, 58,011 iterations, peak ~203 VUs.**

| Metric | Result | Threshold | Status |
| --- | --- | --- | --- |
| Checks passed | 99.04% | > 95% | ✓ |
| Error rate (http_req_failed) | 0.95% | < 1% | ✓ (marginal) |
| Page load p95 (`/ie/en`) | **30s** | < 1.5s | **✗ FAIL** |
| Page load avg | 19.9s | — | |
| Page load max | **15m57s** | — | |
| Overall http_req_duration p95 | 13.48s | — | |

The threshold breach is entirely a **latency** failure, not a correctness
failure — the site kept answering requests correctly, just far too slowly
to be usable. `time="...T01:29:55" level=error msg="thresholds on metrics
'http_req_duration{name:page:/ie/en}' have been crossed"`.

**Root-cause isolation:**

1. **Database ruled out.** `docs/audits/perf/loadtest-20260814/target-200-db-pool.csv`
   (248 samples over the full run) shows max 3 active connections of the
   10-connection pool cap, zero connections waiting on locks, longest single
   query 4.7s. The pool that the plan flagged as the top suspect before
   testing began was never under pressure.
2. **Container resources ruled out.** Railway metrics for the run window
   (00:38–01:14) show both services peaking around **0.2–0.3 vCPU** against
   a configured limit of **24 vCPU / 24GB** each. Memory stayed well within
   limits (backend ~500-600MB, frontend ~350-400MB peaks), no restarts, and
   the backend's deploy logs show no OOM or crash lines in the window.
3. **Leading explanation: single-threaded Node.js event-loop contention.**
   Both the Fastify backend and the Next.js frontend run as one
   non-clustered process each. Per-request CPU-bound work — RS256 JWT
   verification in the frontend's edge middleware (`frontend/proxy.ts`,
   which runs on nearly every request), PHI encryption/decryption on
   authenticated reads — can only ever execute on one core inside a single
   Node process, regardless of how many vCPUs the container has available.
   At 200 concurrent connections, that one thread's queue is the
   bottleneck; the other ~23.7 allocated vCPUs sit idle, which is exactly
   what the CPU graph shows. Vertical scaling (bigger instance) would not
   fix this — the process still can't spread the queued work across cores.

## Why the ladder stopped here

The plan's stress/spike/soak stages exist to characterize a capacity
ceiling and its failure mode. That work is largely already done: the
ceiling is below 200 concurrent users, and the failure mode (single-thread
saturation, not a resource or database limit) is identified with direct
evidence, not inference. Running stress (ramp to 600 VUs), spike, and soak
against the *same* single-instance, non-replicated configuration would
almost certainly just reproduce worse versions of the same latency curve —
new pain, not new information — and each of those runs takes 20-120+
minutes at degraded response times.

**Recommended before further load testing:** enable Railway replicas
(horizontal scaling — multiple process instances behind Railway's load
balancer) for both the frontend and backend services, then re-run at least
the target-200 profile to confirm it actually resolves the latency. One
caveat for that follow-up: rate-limiting currently uses an in-process store
(`REDIS_URL` is unset), so with replicas each instance tracks its own
independent rate-limit buckets — more permissive than a Redis-backed
production deployment would be, worth setting `REDIS_URL` before that
retest if you want the rate limiter itself to behave realistically under
multi-replica load.

## Outstanding actions

1. **Restore backend env vars** blanked for the test window (Gmail, WhatsApp,
   Google OAuth, InvoiceXpress, Make.com webhook) once testing resumes with
   real integrations needed, or leave them off if further load testing is
   planned soon — see `docs/testing/load-test-run-sheet.md` for the exact
   list.
2. **Rotate the Postgres password and `PROXY_CLIENT_IP_SECRET`** — both were
   shared in a chat session during setup; rotate after load testing
   concludes as a hygiene measure, independent of the load-test findings
   themselves.
3. **Investigate the `gp-assign` NO_DOCTOR result** noted above before
   trusting future booking-journey scenario results — the write path was
   never actually exercised in any run this session.
4. **Decide on Redis for rate-limiting** if/when replicas are enabled
   (affects both production correctness and the realism of any future load
   test against a multi-replica setup).
5. Re-run target-200 (and continue to stress/spike/soak if it passes) after
   replicas are enabled.

## Artifacts

- `loadtest/` — full k6 suite (scenarios, profiles, helpers), reusable for
  the follow-up run.
- `loadtest/backups/pre-loadtest-20260813.dump` — pre-test DB backup.
- `docs/audits/perf/loadtest-20260814/{smoke,baseline,target-200}-summary.json`
  — k6 JSON summaries.
- `docs/audits/perf/loadtest-20260814/{baseline,target-200}-db-pool.csv` —
  `pg_stat_activity` samples throughout each run.
- `docs/testing/load-test-run-sheet.md` — environment setup/teardown
  checklist for the next run.
