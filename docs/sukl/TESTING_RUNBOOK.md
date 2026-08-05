# SÚKL integration — testing and operations runbook

Last reviewed: 2026-08-04.

Covers local setup, Railway setup, verification, and certificate rotation for the
SÚKL (Czech ePoukaz) integration. Read `SECURITY_MODEL.md` first if you have not.

## What is provable today

| Claim | Provable now? |
|---|---|
| The certificate parses, the password is correct, a private key is present | Yes |
| Certificate subject / issuer / expiry / fingerprint are read correctly | Yes |
| Mutual TLS works against a server that demands a client certificate | Yes, against a local TLS server in the test suite |
| Mutual TLS works **against SÚKL** | **YES — proven from Railway 2026-08-05.** Both services, ~135–141 ms. Not reachable from the office network; that was a local-network limit, not a SÚKL allowlist. |
| An ePoukaz can be created | No — not implemented, and the operation paths still need reading from the ePoukaz v19 WSDL |

Do not report the integration as working end to end. The honest statement is: the
credential is valid and the transport is built; the endpoint and the payload are
still missing.

## SÚKL ships legacy-RC2 certificates — convert before use

**Confirmed with the real certificate on 2026-08-04.** SÚKL's test-portal export
encrypts the PKCS#12 with legacy RC2. OpenSSL 3 moved RC2 into a provider Node
does not load, so Node fails with `Unsupported PKCS12 PFX data` **even with the
correct password**. The certificate and password are fine; only the container is
unreadable.

Convert once, keeping the same password. Do it inside the restricted directory —
the intermediate PEM holds the private key unencrypted:

```bash
export MSYS_NO_PATHCONV=1          # Git Bash on Windows only
D=C:/secure/sukl
cp -n $D/sukl-test.pfx $D/sukl-test-ORIGINAL-legacy.pfx   # keep SÚKL's original

openssl pkcs12 -in $D/sukl-test-ORIGINAL-legacy.pfx -legacy -nodes -out $D/_tmp.pem
openssl pkcs12 -export -in $D/_tmp.pem -out $D/sukl-test-modern.pfx
shred -u -n 3 $D/_tmp.pem
```

`-nodes` belongs to the **first** command only — it decrypts the key into the
temporary PEM. Passing it to the export would store the private key unencrypted
inside `sukl-test-modern.pfx`. OpenSSL 3's export defaults to AES-256-CBC with
PBKDF2, which is what Node reads.

Point `SUKL_TEST_PFX_PATH` (and, for Railway, the base64) at
`sukl-test-modern.pfx`. Expect to repeat this on every rotation.

## Certificate currently in use (test)

| Field | Value |
|---|---|
| Subject | `O=150928353, OU=150928371, CN=AMBSUKL150928371G` |
| Issuer | `CN=TEST SUKL A` |
| Serial | `58000010E8BD16DA88C1304DE30001000010E8` |
| Valid | 2026-07-31 → **2026-11-05** |
| Fingerprint suffix | `…DDEB8120` |

**Note the short life: about 97 days total.** The 60-day ops alert fires around
2026-09-06 and the 7-day alert around 2026-10-29. Plan the rotation early — this
is not a yearly certificate.

**On the subject identifiers.** The certificate carries `O=150928353` and
`OU=150928371`; the application/workplace code is `00150928369`. These are
separate certificate subject identifiers whose semantics SÚKL has not confirmed,
so **nothing in the code compares them** — requiring equality would reject a
valid setup. `SUKL_TEST_WORKPLACE_CODE` stays `00150928369` and is used where the
official SOAP schema calls for it. See Q13.

## Endpoint reachability

The two service hosts are configured and genuine, but were **not reachable** from
the development machine on 2026-08-04:

```bash
# DNS is resolver-dependent: works on Google, fails on the system resolver
# and on Cloudflare — for sukl.cz itself, so it is not a typo.
node -e "const{Resolver}=require('node:dns').promises;const r=new Resolver();\
r.setServers(['8.8.8.8']);r.resolve4('cuep-soap.test-erecept.sukl.cz').then(console.log)"
#   cuep-soap.test-erecept.sukl.cz   -> 46.30.92.209
#   common-soap.test-erecept.sukl.cz -> 46.30.92.210

# TCP 443 times out even when dialling the IP directly with the right SNI.
```

SÚKL restricts test access, so the likely cause is a source-IP allowlist or
egress filtering. Before debugging the code, confirm with SÚKL whether the
calling IP must be registered — and register **Railway's egress IP**, since the
hosted backend is what will call SÚKL in the real product. Tracked as Q14.

A failure here surfaces as `SUKL_SERVICE_UNAVAILABLE` or `SUKL_TIMEOUT` on the
affected service only; the other service is probed independently.

## Local setup

The certificate lives **outside the repository**. A path inside the working tree
is a mistake even with `.gitignore` in place.

```text
C:\secure\sukl\sukl-test-modern.pfx     ← what .env points at (converted)
C:\secure\sukl\sukl-test-ORIGINAL-legacy.pfx  ← SÚKL's original, kept for reference
```

In `backend/.env`:

```env
SUKL_ENVIRONMENT=test
SUKL_TEST_PFX_PATH=C:\secure\sukl\sukl-test-modern.pfx
SUKL_TEST_PFX_PASSWORD=<the password from the SÚKL portal>
SUKL_TEST_WORKPLACE_CODE=00150928369
SUKL_TEST_ENTITY_ICO=19071680
SUKL_REQUEST_TIMEOUT_MS=30000
# Two services, HOSTS ONLY. Operation paths come from the ePoukaz v19 WSDL.
SUKL_EPOUKAZ_CUEP_TEST_URL=https://cuep-soap.test-erecept.sukl.cz/
SUKL_EPOUKAZ_COMMON_TEST_URL=https://common-soap.test-erecept.sukl.cz/
```

Then:

```bash
cd global-health-website
pnpm --filter backend typecheck
pnpm --filter backend test
pnpm --filter backend dev      # and the frontend in another shell
```

Open `/admin/integrations/sukl` as an ADMIN or SUPER_ADMIN. A `LOCAL_ADMIN` is
rejected by design.

Expected on a correctly configured local box:

1. **Environment** card reads `TEST`.
2. **Certificate** card reads `Valid` with the real subject, issuer, expiry and a
   fingerprint suffix.
3. **Services** lists both hosts as `Set`.
4. **Test connection** validates the certificate, then probes each service
   independently. Until the network-reachability question (Q14) is resolved both
   report `SUKL_SERVICE_UNAVAILABLE` / `SUKL_TIMEOUT` while stage 1 passes —
   that combination means the credential is good and the route to SÚKL is not.

## Leak checks

Run these after any change to the integration. They are cheap and they are the
whole point of the design.

```bash
# 1. Nothing certificate-shaped is tracked.
git ls-files | grep -Ei '\.(pfx|p12|key)$'          # → only the test fixtures

# 2. No SUKL_ variable reached a client bundle.
cd frontend && pnpm build
grep -ri "SUKL_TEST_PFX\|SUKL_TEST_PFX_PASSWORD" .next    # → no hits

# 3. No SUKL_ variable is referenced outside the proxy route.
grep -rn "SUKL_" frontend --include=*.ts --include=*.tsx  # → no hits at all

# 4. The password, the path and the full fingerprint are absent from logs.
grep -i "<password>" backend-dev.log                       # → no hits
grep -i "sukl-test.pfx" backend-dev.log                    # → no hits
```

## Railway setup

Add these to the **backend service only**. Adding any of them to the frontend
service is a security incident, not a misconfiguration.

```bash
# Locally, once:
# Use the CONVERTED file — the legacy original fails on Railway too.
base64 -w0 /c/secure/sukl/sukl-test-modern.pfx > sukl-test.b64
```

```env
SUKL_ENVIRONMENT=test
SUKL_TEST_PFX_BASE64=<contents of sukl-test.b64, one line>
SUKL_TEST_PFX_PASSWORD=<the password>
SUKL_TEST_WORKPLACE_CODE=00150928369
SUKL_TEST_ENTITY_ICO=19071680
SUKL_REQUEST_TIMEOUT_MS=30000
SUKL_EPOUKAZ_CUEP_TEST_URL=https://cuep-soap.test-erecept.sukl.cz/
SUKL_EPOUKAZ_COMMON_TEST_URL=https://common-soap.test-erecept.sukl.cz/
```

Then:

1. Confirm the **frontend** service has no variable beginning `SUKL_`.
2. Apply the migration: `pnpm --filter backend db:deploy`. Never `migrate dev` —
   the configured database is live and `migrate dev` attempts a reset.
3. Deploy.
4. Open `/admin/integrations/sukl` and confirm the **certificate source** reads
   `SUKL_TEST_PFX_BASE64 (Railway)` and the **fingerprint suffix matches the one
   you saw locally**. A mismatch means the base64 is truncated or stale.
5. Run **Test connection** and confirm the audit row exists in `/admin/audit-log`
   under `SUKL_CONNECTION_TESTED`.
6. Delete `sukl-test.b64` from the local machine.

## Once SÚKL supplies the endpoint

1. Fill in `INTERFACE_INVENTORY.md` from the WSDL/XSD. Do not skip this step and
   go straight to code — it is the record of what was read rather than assumed.
2. Set `SUKL_EPOUKAZ_CUEP_TEST_URL` and `SUKL_EPOUKAZ_COMMON_TEST_URL` on the
   backend service, and read the per-operation paths out of the WSDL — the hosts
   alone are not endpoints.
3. Run **Test connection** again. It now attempts a real mutual-TLS handshake.
   Expected outcomes and their meaning:

| Result | Meaning |
|---|---|
| `ok: true` | TLS works and SÚKL accepted our client certificate. It proves nothing about ePoukaz permissions. |
| `SUKL_TLS_HANDSHAKE_FAILED` | SÚKL rejected the certificate, or their chain is not trusted by the Node runtime. If it is the latter, supply their CA — do not disable verification. |
| `SUKL_AUTHENTICATION_FAILED` | TLS succeeded but the workplace is not registered for that service. Ask SÚKL, do not retry. |
| `SUKL_SERVICE_UNAVAILABLE` | Wrong host, or Railway egress is blocked. |
| `SUKL_TIMEOUT` | No response inside `SUKL_REQUEST_TIMEOUT_MS`. |

4. Ask SÚKL to confirm the requests are arriving at the expected test service.
   Keep their reply with the redacted diagnostic output.

## Certificate rotation

There is no upload endpoint, deliberately — see `SECURITY_MODEL.md`. Rotation is
this procedure.

**Warnings.** The daily scheduler job `sukl-certificate` raises an ops alert at 60,
30, 14 and 7 days before expiry, once per band, and a critical alert if the
certificate ever fails to validate. It is a no-op on deployments where the
integration is unconfigured.

**Steps.**

1. Request the replacement through the SÚKL test-access portal well inside the
   60-day warning.
2. Validate the replacement **locally first**, against a scratch `.env` pointing
   `SUKL_TEST_PFX_PATH` at the new file. Confirm the subject, issuer and expiry
   are what you expect and note the new fingerprint suffix.
3. Never overwrite the live Railway secret before step 2 passes. A bad
   replacement takes ePoukaz down with no rollback other than re-pasting the old
   base64 — so keep the outgoing base64 until the new one is proven in Railway.
4. Update `SUKL_TEST_PFX_BASE64` and, if it changed, `SUKL_TEST_PFX_PASSWORD`.
   Redeploy.
5. Run **Test connection** and confirm the fingerprint suffix now matches the new
   certificate.
6. Discard the outgoing base64 and any local copy of the retired `.pfx`. Only the
   audit metadata in `SuklFacilityIntegration` is retained — never an unencrypted
   private key.

## Test suite notes

Backend tests run on the built-in `node:test` runner through
`backend/src/test-guard.ts`, which refuses to run against a non-local database.

```bash
pnpm --filter backend test
```

SÚKL-specific fixtures live in `backend/src/lib/sukl/__fixtures__/`. They are
throwaway self-signed keypairs generated locally with a known password, committed
on the same basis as the test RS256 keypair in `backend/.env.test` — they have no
relationship to the real SÚKL certificate. Regeneration instructions are in that
directory's `README.md`.

Env-dependent tests import `client.test-env.ts` **first**, before anything that
pulls in `config/env.ts`, because that module freezes its snapshot of
`process.env` at import time. This mirrors
`backend/src/lib/weblims/client.test-env.ts`.
