# SÚKL interface inventory

> **Status: BLOCKED — the vendor documentation package has not been supplied.**
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

Interface versions published by SÚKL as of 1 January 2026, to be **verified against
the downloaded WSDL/XSD rather than trusted from this table**:

- ePoukaz: `202601A`, `202601B`
- Cross-border eRecept: `201912B`
- Main eRecept interfaces: `202501A`

## Inventory

### Service names

_BLOCKED — awaiting vendor package._

### Operations

_BLOCKED._ For each operation, record: name, direction, whether it mutates,
whether an outpatient (ambulance) workplace is permitted to call it, and the
minimum role required.

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

#### Reachability, verified 2026-08-04

Both hostnames are genuine and resolve. Neither was reachable from the
development machine:

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

**Partially known.** SÚKL confirmed that the workplace communication certificate
authenticates the connection over mutual TLS and that **no doctor personal
qualified signature is required**. That is what the implemented transport does.

Still unknown: whether any operation additionally requires an in-message
identifier or credential beyond the TLS client certificate.

### Required doctor / facility / workplace fields

_BLOCKED._ In particular: the exact format of the prescriber identifier. The
`SuklDoctorIdentity.suklProfessionalIdentifier` column stores it as opaque text
and validates only shape and length, because it is not known whether SÚKL expects
an IČP, a KRZP code, or a value of their own.

### Error and fault structures

_BLOCKED._ Needed to map SÚKL faults onto `SUKL_SOAP_FAULT` /
`SUKL_BUSINESS_VALIDATION_FAILED` / `SUKL_SCHEMA_VALIDATION_FAILED` in
`backend/src/lib/sukl/errors.ts`.

### Idempotency and duplicate handling

_BLOCKED._ Specifically: does SÚKL expose a way to ask "did you already accept
this?" after an ambiguous network failure? Without one, a create operation can
never be safely auto-retried, and the planned key format
`sukl-epoukaz:{appointmentId}:{attemptGroup}` protects us only on our own side.

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
