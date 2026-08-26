# Load test run sheet — Global Health Website

Target environment (Railway, deployed from `Dev-hassaan`, confirmed a
database copy/snapshot, **not** the live `myglobalhealth.online` DB — see
`loadtest/backups/pre-loadtest-<date>.dump` for the pre-test safety backup):

- Frontend: `https://myglobalhealth.up.railway.app`
- Backend: `https://backendmyglobalhealth.up.railway.app`
- DB: Railway Postgres (public proxy URL — ask whoever ran setup for the current one; do not commit it anywhere)

## Before ANY load beyond the smoke profile

### 1. Set `PROXY_CLIENT_IP_SECRET` on BOTH services (backend + frontend)

Without this, every k6 request comes from one physical source IP and the
whole run collapses into a single 300 req/min rate-limit bucket regardless
of VU count — you'll measure 429s, not capacity.

In the Railway dashboard, on **both** the backend and frontend services'
Variables tab, set the identical value:

```
PROXY_CLIENT_IP_SECRET=T0HfvCY1I4O6Xlj8sf2a5duqYVQa8JIVEoZ8WP7eypw
```

(This is the value actually deployed as of 2026-08-14 — it was already
present on the backend when setup began, so the frontend was set to match
it rather than the other way around. Also saved in
`loadtest/config/secrets.json`, gitignored, which the k6 scenarios read
automatically. Verify it's still current before relying on it: hit
`/api/countries` with and without `x-gh-proxy-secret` + a synthetic
`x-gh-client-ip` and confirm the two get independent
`x-ratelimit-remaining` counters — see the 2026-08-14 report for the exact
command.)

**Note on `GOOGLE_OAUTH_*`, `GMAIL_SEND_*`, `WA_*`, and `INVOICE_EXPRESS_*`:**
these are Zod `.optional()` fields in
`backend/src/config/env.ts` — optional means the key may be **absent**, not
present-with-empty-string (`""` still fails `.email()`/`.url()`/`.min(1)`
validation and crashes the deploy). To disable them, delete the variable
entirely in Railway rather than blanking its value.

Optional, backend only, if you want explicit control over the SSR-trusted
bucket size (defaults to 3000/min already):

```
RATE_LIMIT_SSR_MAX=3000
```

### 2. Neutralize external integrations (backend service only)

**Unset / blank these** so the load test can't send real emails, WhatsApp
messages, or trigger live third-party calls:

| Variable | Why |
| --- | --- |
| `SENDGRID_API_KEY` | email falls back to console `[email:log]` |
| `GMAIL_SEND_FROM`, `GMAIL_SEND_REFRESH_TOKEN` | same |
| `WA_API_URL`, `WA_AUTH`, `WASENDER_API_TOKEN` | WhatsApp (also globally serialized w/ 6s gap — queuing it under load stalls for minutes) |
| `OPS_ALERT_WEBHOOK` | booking-journey and login traffic will otherwise page ops |
| `TRUSTPILOT_AFS_TRIGGER_EMAIL` | review-invite triggers |
| `MEMED_CLIENT_ID`, `MEMED_CLIENT_SECRET`, `MEMED_PRESCRIPTION_CLIENT_ID`, `MEMED_PRESCRIPTION_SECRET` | BR prescription integration |
| `INVOICE_EXPRESS_API_KEY`, `INVOICE_EXPRESS_ACCOUNT` | PT invoicing |
| `GOOGLE_PLACES_API_KEY` | clinic/address lookups (low risk, but no reason to spend quota) |

**Switch to test mode** rather than unsetting (checkout journeys need a
working Stripe client, just not a live one):

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_PT`, `STRIPE_SECRET_KEY_CZ` | Stripe **test-mode** secret keys |
| `STRIPE_WEBHOOK_SECRET`, `_PT`, `_CZ` | corresponding test-mode webhook secrets |

**Record every value you change** (copy the current value before
overwriting) so they can be restored exactly after testing.

### 3. Confirm the environment is still the safe copy

Before running `baseline`/`target-200`/`stress`/`spike`/`soak`, re-run the
fingerprint check — if the Brazil country record's `id`/`currencyId` still
matches production, and doctor counts still diverge from
`api.myglobalhealth.online`, nothing has changed underneath you:

```bash
curl -s https://backendmyglobalhealth.up.railway.app/api/countries | head -c 300
curl -s https://api.myglobalhealth.online/api/doctors/count
curl -s https://backendmyglobalhealth.up.railway.app/api/doctors/count
```

## Test accounts (already seeded, `loadtest/config/cookies.json`)

Seeded via `backend/scripts/seed-test-accounts.ts` with `FORCE_SEED=true`
against the loadtest DB. Passwords are in `loadtest/config/seed-passwords.json`
(gitignored). Cookies were minted once via
`node loadtest/scripts/mint-load-test-cookies.mjs` (real `/api/auth/login`
calls, well under the 200/15min dev-mode login limit this environment runs)
and are reused for the full 7-day cookie lifetime — **do not re-run the
minting script repeatedly**, it re-authenticates for real each time.

| Role | Email | Notes |
| --- | --- | --- |
| PATIENT ×2 | patient@…, patient2@… | cross-tenant pair from the seed script |
| DOCTOR ×2 | doctor@…, doctor2@… (ie / pt) | |
| ADMIN ×2 | admin@…, superadmin@… | global admin scope |

Note: this is a 2-account-per-role pool, not the ~20-patient pool the
original plan sketched — accepted as a pragmatic scope cut since capacity
testing measures API/DB load, not per-account realism. If cookie reuse
across concurrent VUs on the same account becomes a confound (e.g. via
`tokenVersion` conflicts), revisit `backend/scripts/seed-test-accounts.ts`
to seed a larger pool before the target-200 run.

If a cookie ever needs refreshing (7-day expiry), re-run the mint script —
it's idempotent and only makes 6 login calls total.

## Execution ladder

Each step gated on the previous passing its thresholds. Run from
`loadtest/`:

```bash
./run.sh smoke          # 5 VU, 2 min — run first, always
./run.sh baseline       # 50 VU, 15 min
./run.sh target-200     # 200 VU, 30 min — the certification run
./run.sh stress         # 200->600 VU, finds the ceiling
./run.sh spike          # 0->300 VU in 30s, 5 min hold
./run.sh soak           # 100 VU, 2 hours
```

While each is running, in a separate terminal:

```bash
DATABASE_URL='<railway postgres proxy url>' \
  ./monitor-db-pool.sh ../docs/audits/perf/loadtest-$(date +%Y%m%d)/<profile>-pool.csv
```

And watch the Railway dashboard (CPU/memory/restart count) for both
services — note peak values per run in the final report.

## Abort criteria (stop immediately if hit)

- Error rate (non-429 5xx) exceeds 10% sustained for more than 30s.
- `/ready` on the backend starts returning non-200.
- Railway shows a service restart (OOM or crash) during the run.

## After testing — cleanup checklist

1. Restore every env var changed in step 2 to its original value.
2. Rotate `PROXY_CLIENT_IP_SECRET` to a new value (or remove it) so the
   value used during testing isn't left live.
3. Delete synthetic data: cart items / any created records tagged
   `loadtest+` in the patient email/notes fields.
4. **Rotate the Postgres password** — the connection string was shared in
   plaintext chat during setup.
5. Re-run the fingerprint check from step 3 above as a final sanity pass.
