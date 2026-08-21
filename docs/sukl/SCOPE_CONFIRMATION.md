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
| Doctor personal qualified signature | **REQUIRED for some active operations** — see below | SÚKL, ticket 40336, 2026-08-13. This REVERSES the earlier understanding. |
| Scope of this build | ePoukaz only | Product decision, 2026-08-04 |
| Cross-border eRecept | Out of scope, blocked on Q7 below | Product decision |

### Authentication model — CONFIRMED 2026-08-20

SÚKL (ticket, Stanislav Levinský) answered directly:

> **"Yes, ZalozitPoukaz requires a signature"** (unless authentication is done by
> Citizen Identity). "It is signed with a **qualified personal certificate**. A
> DEMO certificate from PostSignum can be used in the test environment."
> "AppPingZEP is used to test a message with a signature, but not to send this
> message every time before creating an eVoucher."

So the signature is **required**, not optional-in-practice, and the schema's
`minOccurs="0"` reflects only that some operations omit it. The two routes below
stand, with Route A now the default rather than a possibility.

Practical consequences:

- **Test can proceed without a doctor's real certificate** — a PostSignum DEMO
  qualified certificate is accepted, so the signing layer is buildable and
  testable now.
- **AppPingZEP is a one-off verification**, not a pre-flight for every create.
  SÚKL said so explicitly; calling it before each voucher would be exactly the
  kind of avoidable traffic their rate limiting exists to stop.
- **Production is where the hard question lands.** A qualified *personal*
  certificate belongs to the doctor. Whether it can be held server-side, or must
  be used on their device, is the security and legal review that
  `SECURITY_MODEL.md` gates on — unchanged by this answer.

### Earlier record — 2026-08-13

The earlier position ("workplace certificate only, no doctor signature") is
**superseded**. SÚKL (ticket 40336) state:

> Some active operations must be signed with a personal qualified certificate.
> The signature is not required if you have implemented authentication using
> Citizen Identity [Identita občana].

Creating an ePoukaz is an active operation, so mutual TLS with the workplace
certificate is **necessary but not sufficient**. There are two lawful routes and
they have very different costs:

**Route A — personal qualified signature (XML-DSig).** Each prescribing doctor
signs the payload with their own qualified certificate. Introduces an XML
signature layer, per-doctor key handling, and the security and legal review that
the previous decision record already said would be required before any key
material may be stored. In the test environment SÚKL accept a DEMO qualified
certificate, e.g. PostSignum's test certificate.

**Route B — Identita občana (Citizen Identity).** Authenticate the doctor
through the national identity scheme instead, which removes the signature
requirement. No per-doctor key material is stored by us. Cost moves from
cryptography to an identity-federation integration and its own onboarding.

**Nothing about this is decided.** Q15–Q17 below must be answered first, and the
choice needs product and legal input, not just engineering. Until then the build
stops at the transport layer, which is unaffected either way — mutual TLS is
still required in both routes.

What this does NOT change: the facility certificate, the mTLS transport, the
admin console and the monitoring are all still correct and still needed.

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

## How to ask SÚKL

**Technical questions are not answered by email.** Confirmed 2026-08-07: SÚKL
routes all technical enquiries to the **Kontaktní centrum pro dodavatele SW**
(Contact Centre for software suppliers). Access must be requested first:

    https://epreskripce.gov.cz/homepage/dodavatel/kontaktni-centrum-pro-dodavatele-sw/

Until that registration exists, none of the questions below can be put to
anyone — **obtaining Contact Centre access is the current critical path**, ahead
of every technical item. The general eRecept mailbox will simply redirect.

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
- **Q2** ~~Which operations may an outpatient workplace call?~~ **ANSWERED
  2026-08-13.** The documentation contains a **searchable table of services
  stating which role may use each service**. Read that table and record the
  outcome per operation in `INTERFACE_INVENTORY.md` — do not infer it.
- **Q3** ~~Is there a safe read-only/ping operation?~~ **ANSWERED 2026-08-13 —
  yes, but rate-limited.** SÚKL: *"It is possible to use it, but not in such a
  way that it unnecessarily burdens the system. Each user has a limited number
  of calls within one minute; if exceeded, their access is temporarily
  blocked."*
  **Operational consequence:** any ping must be deliberate and infrequent. The
  admin connection test is manual and the certificate monitor runs daily, so
  both are safe — but nothing may poll SÚKL on a timer, and a health check must
  never be wired to an uptime monitor.
- **Q3b** ~~What is the certificate's PKCS#12 export password?~~ **RESOLVED
  2026-08-05.** The password was correct; the certificate simply could not be
  opened by Node because SÚKL exports with legacy RC2. Converted to
  AES-256/PBKDF2 — see `TESTING_RUNBOOK.md`. Worth telling SÚKL that their export
  format is unreadable by modern OpenSSL 3 runtimes.
- **Q4** ~~Which interface version?~~ **ANSWERED 2026-08-13.** Production is
  **`202604A`**; test is **`202605A`**, which is expected to reach production
  within a month (announced at https://epreskripce.gov.cz/). Our earlier note of
  `202601A` / `202601B` was **out of date** — build against `202605A` for test
  and expect it to become production.

**Identity**

- **Q5** ~~Separate test doctor identity?~~ **ANSWERED 2026-08-13.** Test and
  production are **separate account systems**, each with its own access SSL
  certificates. Doctors normally have **no test-environment account** — in
  practice only the system developer does, which is us. Test accounts for
  doctors can be requested if needed. For production, each doctor applies at
  https://pristupy.sukl.cz/ .
  **Consequence:** test-phase ePoukaz work does not need per-doctor test
  accounts; production onboarding does, and it is a per-doctor action they must
  take themselves.
- **Q6** ~~Prescriber identifier format?~~ **PARTIALLY ANSWERED 2026-08-13.**
  Logins are assigned by SÚKL's **External Identity** system (Externí identita),
  via https://pristupy.sukl.cz/ for production and the test-access portal for
  test. The literal format was not given, so
  `SuklDoctorIdentity.suklProfessionalIdentifier` stays opaque text. Confirm the
  exact field once the documentation is read.

**Module scope — ANSWERED 2026-08-20**

- **Q18** ~~Is our workplace authorised for the eRecept (CUER) module as well as
  ePoukaz?~~ **YES.** SÚKL: *"If you have the Ambulance workplace role and
  doctors will access the application, then yes, you can create both eVouchers
  and ePrescriptions under one account."*

  This matters more than any other answer in this project. **ePoukaz is medical
  devices** — spectacles, hearing aids, incontinence supplies. **eRecept is
  medicines.** Doctors on this platform prescribe medicines, so `ZalozitPredpis`
  on the eRecept module is the operation the product actually needs, and
  `ZalozitPoukaz` is a secondary capability.

  One account, one workplace certificate, both modules. Nothing built so far is
  wasted: the certificate, mutual-TLS transport, envelope layer, admin console
  and monitoring are shared. Only the payload layer differs, and it is not
  written yet.

  SÚKL also point to sample applications in test mode at
  https://system.test-erecept.sukl.cz/ (workplace SSL certificate required),
  which are worth walking through before automating either module.

  The ePrescription module's technical documentation is published separately
  from ePoukaz — see the Supplier section of epreskripce.gov.cz.

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

- **Q15b** ~~What is our workplace IČP?~~ **ANSWERED 2026-08-20 — not needed for
  test.** SÚKL: *"what is an IČP … For testing purposes, you can enter
  anything."* IČP is an insurance-billing identifier, not a SÚKL-issued one, so
  it is out of their hands. The test environment accepts any 8-digit value;
  production needs the real IČP from the health-insurance registration, which is
  a Global Guest administrative task rather than a SÚKL request.

  **This unblocks `ZalozitPoukaz` for testing.**

- **Q13** ~~Which identifier goes in the request as the workplace?~~
  **ANSWERED 2026-08-13.** SÚKL: *"You only need to use the workplace code in
  the request: 00150928369."* The certificate subject's `O` / `OU` are not used
  in payloads. This confirms the existing design decision not to compare them —
  `SUKL_TEST_WORKPLACE_CODE` is the value to send.

**Signature / authentication (raised 2026-08-13 — blocks the ePoukaz build)**

- **Q15** Exactly which ePoukaz operations require a personal qualified
  signature? "Some active operations" needs to become a list, per operation,
  cross-referenced with the role table from Q2.
- **Q16** What does "authentication using Identita občana" mean concretely for a
  server-to-server integration where the doctor is already authenticated in our
  portal? What does it replace — the signature only, or part of the transport
  authentication? What is the onboarding process?
- **Q17** If we take the signature route: what is signed (the whole envelope, a
  specific element), which XML-DSig profile and canonicalisation, and where does
  the signature belong in the message? Are there reference examples?

**Operational**

- **Q10** After an ambiguous network failure on a create operation, is there a
  way to ask SÚKL whether the request was accepted? **PARTIALLY ANSWERED
  2026-08-13** — SÚKL described only the two clear cases: a failed handshake
  means nothing was sent, and a delivered call returns documented error codes
  (Excel attachment in the technical documentation). The genuinely ambiguous
  case — request sent, response lost — was not addressed, so **no create may be
  auto-retried**. Re-ask once the error-code list has been read.
- **Q11** ~~Renewal procedure?~~ **ANSWERED 2026-08-07** by Petra Zdražilová,
  Oddělení eRecept. The test certificate may be renewed **at the earliest one
  month before expiry** — for the current certificate that is **from 5 October
  2026**. Self-service at https://testpristupy.sukl.cz/ ; guide:
  https://testpristupy.sukl.cz/documents/nasledneVydaniCert.pdf
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
