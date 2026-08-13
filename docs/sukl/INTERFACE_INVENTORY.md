# SÚKL interface inventory

> **Status: documentation LOCATED 2026-08-13, not yet read.**
>
> SÚKL (ticket 40336) confirm the current WSDL/XSD, interface-version notes and
> the service/role table are published in the **Supplier (Dodavatel)** section of
> https://epreskripce.gov.cz/ , with an ePoukaz-specific page. Download it into
> `docs/sukl/vendor/` and fill this file in from the documents — not from memory,
> and not from the summaries in this file.
>
> Every heading below is deliberately empty. This file is the source of truth for
> operation names, endpoint URLs, XML namespaces, headers and message shapes, and
> filling any of it in from memory or inference is precisely the failure mode the
> integration plan forbids. A plausible-looking inventory is worse than an empty
> one, because the code written from it looks finished and fails in production.
>
> The certificate is on hand and the foundation (config, certificate loader,
> validator, mutual-TLS transport, admin console) is built and testable without
> this file. Nothing beyond that can start until it is filled.

Last reviewed: 2026-08-04.

## What is needed

Download the current official package and place it under `docs/sukl/vendor/`:

```text
docs/sukl/vendor/
├── epoukaz/
│   ├── developer-documentation.pdf
│   ├── wsdl/
│   ├── xsd/
│   └── examples/
├── cross-border/
│   ├── developer-documentation.pdf
│   ├── wsdl/
│   ├── xsd/
│   └── examples/
└── interface-versions/
    └── supported-versions-notes.md
```

Sources:

| What | Where |
|---|---|
| Supported interface versions | https://epreskripce.gov.cz/verze-datoveho-rozhrani-jednotlivych-modulu-systemu-erecept-platne-k-1-1-2026/ |
| ePoukaz technical documentation | https://epreskripce.gov.cz/homepage/dodavatel/technicka-dokumentace/epoukaz/ |
| Cross-border eRecept documentation | https://epreskripce.gov.cz/homepage/dodavatel/technicka-dokumentace/preshranicni-erecept/ |
| SÚKL test API information | https://testapi.sukl.cz/index_en.html |
| Test access portal | https://testpristupy.sukl.cz/ |

**Interface versions — corrected 2026-08-13 by SÚKL (ticket 40336).** The
`202601A` / `202601B` figures previously recorded here were out of date:

| Environment | Version |
|---|---|
| Production | `202604A` |
| Test | `202605A` — expected to reach production within a month of 2026-08-13 |

Build against **`202605A`**, which is what the test environment serves and what
production will become. Announcements appear at https://epreskripce.gov.cz/ .
Still verify against the downloaded WSDL rather than trusting this table.

## Inventory

### Service names

_BLOCKED — awaiting vendor package._

### Operations

_To be filled from the documentation._ SÚKL confirm it contains a **searchable
table of services showing which role may use each service** — that table is the
authority on what an ambulance/outpatient workplace may call. Record per
operation: name, direction, whether it mutates, whether our role may call it,
**and whether it requires a personal qualified signature** (see below).

Two constraints already known:

- **Rate limits are enforced per user per minute**, and exceeding them
  temporarily blocks access. Nothing may poll SÚKL on a timer.
- **Some active operations require a personal qualified signature**, unless
  authentication is done through Identita občana. Which operations, exactly, is
  question Q15 — and it gates the whole payload layer. See
  `SCOPE_CONFIRMATION.md`.

### Test service hosts

ePoukaz is **two separate SOAP services**, not one base URL with paths. Each is
configured independently:

| Service | Env var | Host | Resolves to |
|---|---|---|---|
| ePoukaz (CUEP) | `SUKL_EPOUKAZ_CUEP_TEST_URL` | `https://cuep-soap.test-erecept.sukl.cz/` | `46.30.92.209` |
| Common (code lists, versions, ping) | `SUKL_EPOUKAZ_COMMON_TEST_URL` | `https://common-soap.test-erecept.sukl.cz/` | `46.30.92.210` |

**These are HOSTS, not endpoints.** The operation path must be read from the
`soap:address` of the relevant binding in the current **ePoukaz v19 WSDL** and
passed explicitly to `suklPost(service, path, …)`. Nothing in the code invents a
path, and no request may be sent until those values are confirmed.

The **cross-border pharmacist endpoint is deliberately not configured** and must
not be added until SÚKL confirms which cross-border workflow an outpatient
workplace may perform (Q7).

#### Reachability — RESOLVED 2026-08-05

**Mutual TLS succeeds from Railway against both services** (CUEP 135 ms, COMMON
141 ms), presenting the workplace certificate. SÚKL accepted it.

Two consequences:

1. **There is no source-IP allowlist blocking us** — Q14 is answered. The
   earlier failure was the development network only.
2. **SÚKL's server certificate is issued by a public CA** (`C=US, O=DigiCert
   Inc, CN=RapidSSL TLS RSA CA G1`), so it validates against Node's built-in
   trust store. No custom `ca` bundle is needed, and `rejectUnauthorized` stays
   on with no special configuration.

A successful handshake proves the TLS channel and the credential. It does NOT
prove any ePoukaz operation is permitted, and no request has been sent.

##### Original finding, kept for the record (2026-08-04)

Neither host was reachable from the development machine:

- **DNS is resolver-dependent.** `sukl.cz` and both service hosts resolve
  correctly via Google (`8.8.8.8`), but the system resolver returns
  `ECONNREFUSED` and Cloudflare (`1.1.1.1`) returns `ESERVFAIL` — for the apex
  domain too, so this is the zone or the resolver, not a typo in the hostname.
- **TCP 443 times out** to `46.30.92.209` and `46.30.92.210` even when DNS is
  bypassed entirely by dialling the IP with the correct SNI.

So the mutual-TLS leg is still **unproven against SÚKL**. SÚKL restricts test
access, so the likely causes are a source-IP allowlist we are not on, or egress
filtering on this network. Ask SÚKL whether the calling IP must be registered —
and if so, register **Railway's** egress IP, not a developer laptop's (Q14).

#### Related lead: the doctor eRecept service

From a **third-party repository**
([pesektomas/eRecept](https://github.com/pesektomas/eRecept/blob/master/wsdl/CUERLekar.wsdl)),
interface version **201704** — much older than the current `202501A`. Not
authoritative; useful only as corroboration of the host pattern:

| Field | Observed value |
|---|---|
| Address | `https://lekar-soap.test-erecept.sukl.cz/cuer/Lekar` |
| Service / port | `CUERLekar` / `CUERLekar_Port` |
| targetNamespace | `http://www.sukl.cz/erp/201704` |

It confirms the `<service>-soap.test-erecept.sukl.cz/<path>` shape, and it
exposes `AppPing`, `AppPingZEP` and `GetAppInfo`. If the ePoukaz COMMON service
has equivalents, **Q3 is answered** — the connection test could make a real
read-only call instead of only proving the handshake.

### SOAP versions

_BLOCKED._ SOAP 1.1 vs 1.2 determines the content type and whether a `SOAPAction`
header is used at all.

### XML namespaces and prefixes

_BLOCKED._ Prefixes must be preserved exactly as SÚKL declares them.

### Required headers

_BLOCKED._

### Authentication requirements

**Corrected 2026-08-13 — the earlier entry here was wrong.**

Mutual TLS with the workplace communication certificate authenticates the
*connection*, and that part is built and proven. But SÚKL state that **some
active operations must additionally be signed with a personal qualified
certificate**, unless the doctor is authenticated through **Identita občana**
(Citizen Identity), which removes the signature requirement.

Creating an ePoukaz is an active operation, so the transport alone is not
sufficient to issue one. Two routes exist and neither is chosen yet — see
"Authentication model — CHANGED 2026-08-13" in `SCOPE_CONFIRMATION.md`, and
Q15–Q17 there.

For the test environment SÚKL accept a **DEMO qualified certificate**, e.g.
PostSignum's test certificate.

Also settled: the request payload carries the **workplace code `00150928369`**.
The certificate subject's `O` and `OU` are not used in payloads.

### Required doctor / facility / workplace fields

_BLOCKED._ In particular: the exact format of the prescriber identifier. The
`SuklDoctorIdentity.suklProfessionalIdentifier` column stores it as opaque text
and validates only shape and length, because it is not known whether SÚKL expects
an IČP, a KRZP code, or a value of their own.

### Error and fault structures

_To be filled from the documentation._ SÚKL confirm the error codes are
documented in an **Excel attachment** within the technical documentation package.
Map them onto `SUKL_SOAP_FAULT` / `SUKL_BUSINESS_VALIDATION_FAILED` /
`SUKL_SCHEMA_VALIDATION_FAILED` in `backend/src/lib/sukl/errors.ts`.

### Idempotency and duplicate handling

**Partially answered 2026-08-13.** SÚKL addressed the two unambiguous cases: a
failed TLS handshake means nothing was delivered, and a delivered call returns a
documented error code. They did **not** address the case that actually matters —
request sent, response lost.

Until that is answered, **no create operation may be auto-retried**. The planned
key `sukl-epoukaz:{appointmentId}:{attemptGroup}` protects only our own side.

## Downstream work this file unblocks

1. An XML dependency (`fast-xml-parser`) and the SOAP envelope layer.
2. Typed request/response models generated from, or backed by, the XSD.
3. The ePoukaz voucher Prisma model and its status enum.
4. Create / read / amend / cancel voucher operations and code-list retrieval.
5. Contract tests validating our requests against the XSD and parsing SÚKL's own
   sample responses and fault examples.
6. The doctor-facing ePoukaz form in the consultation workspace.
7. A real handshake against SÚKL — today's connection test can only prove mutual
   TLS against a local server, because there is no endpoint to connect to.
