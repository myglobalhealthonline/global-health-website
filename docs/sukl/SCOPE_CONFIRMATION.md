# SÚKL scope confirmation and open questions

Follows the format of `docs/guides/synlab-integration-questions.md`: settled facts
first, then a numbered register of what must still be answered by SÚKL. Update in
place as answers arrive; do not delete answered items, mark them.

Last reviewed: 2026-08-04.

## Settled

| Item | Value | Source |
|---|---|---|
| Legal entity | Global Guest s.r.o. | — |
| IČO | `19071680` | — |
| Workplace type | Ambulance / outpatient workplace | SÚKL registration |
| Test workplace code | `00150928369` | SÚKL, case `SUKL206641/2026` |
| Environment | SÚKL **test** only | — |
| Certificate authority | SÚKL | SÚKL confirmed the ÚZIS test CA is unavailable |
| Authentication | Workplace communication certificate over mutual TLS | Confirmed by SÚKL |
| Doctor personal qualified signature | **Not required** | Confirmed by SÚKL |
| Scope of this build | ePoukaz only | Product decision, 2026-08-04 |
| Cross-border eRecept | Out of scope, blocked on Q7 below | Product decision |

### Consequences of the confirmed authentication model

Because authentication is the facility certificate and nothing else:

- No XML digital signature layer is built, and `xml-crypto` is not a dependency.
- No doctor personal key material, personal qualified certificate, or national
  identity key is accepted, transmitted or stored anywhere. `SuklDoctorIdentity`
  holds professional identifiers only.
- Rotating the credential is a Railway secret change plus a redeploy, not a
  per-doctor operation.

If SÚKL later contradicts this, it is not a small change: it introduces XML-DSig,
per-doctor certificate handling, and a separate security and legal review before
any key material may be stored. That would be its own gated phase.

## Intended user journey (ePoukaz)

1. An authorised Czech doctor opens a patient encounter in the Global Health
   doctor portal.
2. The platform checks: the doctor has a `VERIFIED` SÚKL identity for the current
   environment, that identity's workplace matches the configured workplace, and
   the facility certificate is valid and not expired.
3. The doctor enters the ePoukaz details.
4. The backend validates the request against the ePoukaz XSD.
5. The backend sends the official SÚKL request over mutual TLS from Railway. The
   certificate never reaches the browser.
6. The backend stores the SÚKL identifier, status, timestamp, doctor mapping,
   workplace code and minimal audit metadata.
7. The portal shows the result.

Steps 3–7 are **not built** — see `INTERFACE_INVENTORY.md`. Steps 1–2 are
partially built: the identity model and the certificate gate exist.

## Open questions for SÚKL

Numbered so replies can cite them.

**Interface and access**

- **Q1** ~~What is the base URL of the ePoukaz test service?~~ **ANSWERED
  2026-08-04.** Two services: `https://cuep-soap.test-erecept.sukl.cz/` and
  `https://common-soap.test-erecept.sukl.cz/`. Both configured. Still to confirm:
  the per-operation **paths**, which must come from the `soap:address` values in
  the ePoukaz **v19** WSDL — the hosts alone are not endpoints.
- **Q14** ~~Does SÚKL restrict test access by source IP?~~ **ANSWERED
  2026-08-05 — no.** Mutual TLS succeeds from Railway against both services and
  SÚKL accepts the workplace certificate. The earlier timeouts were the office
  network, not an allowlist. Developer machines may still be unable to reach the
  hosts; test from the deployed backend.
- **Q2** Which ePoukaz operations may an **ambulance / outpatient** workplace
  call? Specifically: create, read/status, amend, cancel, and code-list retrieval.
  Some published documentation is written for pharmacy information systems.
- **Q3** Is there a read-only or ping-style operation we may call safely and
  repeatedly to verify connectivity? Today's connection test proves the TLS
  handshake only, because none is known. **Lead:** the older `201704` doctor
  eRecept WSDL exposes `AppPing`, `AppPingZEP` and `GetAppInfo` — ask whether
  ePoukaz has equivalents and whether an ambulance workplace may call them.
- **Q3b** ~~What is the certificate's PKCS#12 export password?~~ **RESOLVED
  2026-08-05.** The password was correct; the certificate simply could not be
  opened by Node because SÚKL exports with legacy RC2. Converted to
  AES-256/PBKDF2 — see `TESTING_RUNBOOK.md`. Worth telling SÚKL that their export
  format is unreadable by modern OpenSSL 3 runtimes.
- **Q4** Which interface version should we target — `202601A` or `202601B` — and
  do they differ in the operations available to an outpatient workplace?

**Identity**

- **Q5** Must a separate **test doctor identity** be issued for the test
  environment, or do doctors' existing production ePrescription identities apply?
  If separate, how is one requested?
- **Q6** What exactly is the prescriber identifier — IČP, KRZP code, or a
  SÚKL-issued value — and what is its format? (Stored as opaque text until
  answered; see `SuklDoctorIdentity.suklProfessionalIdentifier`.)

**Cross-border (scope gate — no code until answered)**

- **Q7** Which cross-border eRecept workflows, if any, is an outpatient workplace
  authorised to perform? The candidates are: (a) issue a Czech prescription
  usable in another EU country; (b) retrieve or display a foreign EU
  prescription in Czechia; (c) dispense a foreign prescription; (d) exchange
  prescription data without dispensing.
- **Q8** For whichever of those apply: are pharmacy or pharmacist credentials
  required, and is the facility communication certificate sufficient?
- **Q9** What patient identification data is required, and what consent and audit
  obligations attach to a cross-border lookup?

- **Q13** What do the certificate subject's `O=150928353` and `OU=150928371`
  denote, and which identifier belongs in an ePoukaz request payload as the
  workplace? The application/workplace code is `00150928369` and that is what is
  configured. The certificate subject values are treated as **separate
  identifiers with unconfirmed semantics** — the code deliberately does not
  require them to equal the workplace code, since asserting that would break a
  valid setup. Confirmation is needed before building request payloads.

**Operational**

- **Q10** After an ambiguous network failure on a create operation, is there a way
  to ask SÚKL whether the request was accepted? Without one, no create can be
  safely auto-retried.
- **Q11** What is the test certificate's validity period, and what is the renewal
  procedure through the test-access portal?
- **Q12** Are there rate limits or maintenance windows on the test environment?

## Decision record

- **2026-08-04** — Cross-border eRecept deliberately excluded from the build.
  Global Guest is registered as an outpatient workplace and much of the published
  cross-border documentation targets pharmacy systems, so building against it
  before Q7 is answered risks implementing operations we are not permitted to
  call. `integrations/sukl/cross-border/` does not exist and will be a separate
  module from ePoukaz when it does — payload models will not be shared.
- **2026-08-04** — Certificate upload/rotation via an admin HTTP endpoint
  excluded. Accepting a PKCS#12 plus its password over HTTP is the highest-risk
  surface the integration could have, and Railway secrets already cover rotation.
  See `SECURITY_MODEL.md`.
