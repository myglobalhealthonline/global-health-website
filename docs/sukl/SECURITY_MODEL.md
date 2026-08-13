# SÚKL integration — security model

Last reviewed: 2026-08-04.

## The one-sentence version

The SÚKL workplace communication certificate and its password exist only on the
backend Railway service; the browser, the frontend service, the repository and
every log line are outside the blast radius by construction.

## Secret flow

```text
   SÚKL test-access portal
            │  issues .pfx + password (out of band)
            ▼
   Operator's machine ──────────────────────────────┐
            │                                        │
            │ local dev:                             │ Railway:
            │ file at SUKL_TEST_PFX_PATH,             │ base64 → SUKL_TEST_PFX_BASE64
            │ OUTSIDE the repository                  │ password → SUKL_TEST_PFX_PASSWORD
            ▼                                        ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Backend process memory only                              │
   │   lib/sukl/certificate.ts   → Buffer, cached, never disk  │
   │   lib/sukl/transport.ts     → https.request({ pfx, ... }) │
   └──────────────────────────────────────────────────────────┘
            │ mutual TLS
            ▼
     SÚKL test services
```

Doctor and admin browsers reach the Railway backend over ordinary HTTPS through
the Next.js proxy. They never see certificate material.

## Boundaries

**The certificate and password must never appear in:**

- `NEXT_PUBLIC_*` variables, or any frontend-service variable at all
- browser JavaScript or a Next.js client bundle
- an API response body
- a log line, at any level
- the git repository, including migrations, fixtures and test files
- a Docker image layer
- an error-monitoring payload
- a screenshot or diagnostic export

**Enforcement:**

| Risk | Control |
|---|---|
| Certificate committed | `.gitignore` blocks `**/*.pfx`, `**/*.p12`, `**/*.key`, `/.secrets`; CI runs gitleaks |
| Password in an error message | `lib/sukl/errors.ts` authors every message; OpenSSL/driver errors are attached to `cause` and never serialised |
| Path leakage | The resolved `SUKL_TEST_PFX_PATH` is withheld even from read-failure messages — on a misconfigured box it is the one hint that locates the private key on disk |
| Fingerprint as an identifier | The API returns the last 8 hex characters only; the full value stays in the database and process memory |
| Secret written to disk | The Railway path decodes base64 straight into a `Buffer`. There is no temp-file code path at all |
| Production reached by accident | `config/env.ts` throws on `SUKL_ENVIRONMENT=production` |
| Frontend variable drift | `.env.example` documents the backend-only rule; the frontend has exactly one SÚKL-aware file, the proxy route |

## Why there is no certificate-upload endpoint

The integration plan listed "upload / replace test certificate" and "update
certificate password" as admin actions. They are **not implemented**, on purpose.

Accepting a PKCS#12 plus its password over HTTP would create the highest-risk
surface in the whole design: a multipart body carrying a private key, a password
field in a request payload, temp-file handling on the server, and an
authorisation check whose failure hands an attacker the facility's national-
authority credential. Railway secrets already solve rotation with none of that.

Rotation is therefore an operational procedure, documented in
`TESTING_RUNBOOK.md`, not an application feature. If it is ever revisited, it
needs its own security review — not a follow-up commit.

## Access control

`routes/admin-sukl.route.ts` gates every endpoint with `verifyGlobalAdminAccess`,
not `verifyAdminAccess`. A country-scoped `LOCAL_ADMIN` is rejected: this manages
a credential issued to the legal entity by a national authority, which is a
global operation in the same sense as country CRUD or a full doctor IBAN reveal.

Every connection test and every doctor-mapping change is written through
`recordCriticalAudit`, which throws if the audit write fails — the action does not
silently succeed unaudited.

## Logging policy

**Allowed:** internal request id, SÚKL correlation id, operation name, duration,
HTTP status, normalised error code, environment, workplace code, certificate
fingerprint suffix.

**Forbidden:** the password, PKCS#12 bytes, the private key, the certificate path,
the full fingerprint, a full national personal identifier, patient medical detail,
and raw XML that could carry either.

Note on the last item: `lib/sukl/transport.ts` returns response bodies to its
caller but never logs them, and the doc comment says so. Once real ePoukaz
payloads exist, the parser is responsible for extracting the safe fields — the
body itself must not reach pino, an ops alert, or an audit row.

## Data minimisation in the schema

`SuklDoctorIdentity` stores professional identifiers only. It deliberately has no
column for a rodné číslo, a national identity key, or a personal signing
certificate. That is a schema-level guarantee, not a convention: there is nowhere
to put such a value without a migration and the review that would accompany it.

**Pending decision, 2026-08-13.** SÚKL have since said that some active ePoukaz
operations require a **personal qualified signature** unless the doctor is
authenticated through Identita občana. If the signature route is taken, this
guarantee is exactly what has to be revisited — and the migration needed to store
any doctor key material is the trigger for the security and legal review, not an
afterthought to it. Nothing is decided; see `SCOPE_CONFIRMATION.md` (Q15–Q17).
The Identita občana route would keep this section true as written, which is a
point in its favour.

`SuklFacilityIntegration` stores certificate **public** metadata plus
`secretReference`, which holds the *name* of the environment variable that
supplied the certificate — never a value and never a path.

## Production readiness checklist

Switching to production is not a URL change. All of the following are required:

- [ ] Production communication certificate, issued separately
- [ ] Production endpoint URLs from SÚKL's production WSDL
- [ ] Production workplace identifiers
- [ ] Production doctor mappings, re-verified
- [ ] Written SÚKL confirmation of the permissions we rely on
- [ ] A tested certificate-rotation procedure
- [ ] Security review of the completed ePoukaz payload layer
- [ ] Operational runbook and rollback plan
- [ ] Test and production configuration held completely separately

Until every box is ticked, `config/env.ts` refuses to boot with
`SUKL_ENVIRONMENT=production`. Removing that guard is a deliberate act that should
appear in a reviewed diff, which is the point of implementing it as a throw rather
than a warning.
