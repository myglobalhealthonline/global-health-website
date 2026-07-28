# Synlab CZ — WebLIMS 2 integration: open questions

Working document for the integration with Synlab Czechia's WebLIMS 2 Remote API.

Source material received from Synlab:
- `Volani WL2 z externi aplikace v60144.pdf` — integration description (CZ)
- `weblims-api-remote-60144.json` — OpenAPI 3.0.4 spec, `WebLIMS Remote API` v1.0.1.0

Two sections:
1. **[Email draft](#email-draft)** — ready to send, plain language.
2. **[Technical annex](#technical-annex)** — the full question list to attach or to work
   through on the call.

---

## Answers received from Synlab (Jana Velinská, 2026-07-22)

Business terms are settled; IT (test environment) still owed within 1–2 weeks.

| # | Answer |
|---|---|
| Workflow | Confirmed exactly as we described. Patient is handed the request form (PDF) and presents it at **any** Synlab collection centre — no per-centre booking. |
| **IČP** | We are registered. Our **fictitious IČP is `99002052`** → this is `WEBLIMS_WARD_ICP`. |
| **Patient identification (C1)** | **Solved via D-identifiers.** For foreign patients with no rodné číslo, Synlab issues us a **series of D-identifiers**. We assign one per patient and send it as `patientId`; Synlab matches on the same value. Standard practice for clients with many foreign patients. The actual series is still to be delivered. |
| Billing (F3/F4) | **Self-pay**, monthly invoice issued on the **15th**. **No** contract with Czech health insurers required. |
| Price list | https://kalkulacka.synlab.cz/ — CZ blood-test calculator. Source for the CZ `TestCenterExam` import. |
| A1–A3 (test URL, credentials, `X-Api-Version`) | Test environment being prepared with their external supplier; **1–2 weeks**. |
| Point 5 (labels / `wlbrowser.exe`) | Not yet answered. |
| Point 6 (SFTP / results) | Deferred to their IT, with the test environment. |
| Point 7 (DPA / hosting) | Deferred to their IT, with the test environment. |

### Still owed by Synlab
- Test base URL + `client_id` / `client_secret` + `X-Api-Version` value.
- **The D-identifier series** (range/format), and whether `isTravel` is set true or false when `patientId` is a D-identifier.
- Remaining FOL codes if any beyond IČP (`wardCode`, `wardNode`, `wardSpeciality`, `doctorCode`); KRZP-doctor question.
- Point 5 (labels), Point 6 (SFTP), Point 7 (DPA).

### Follow-ups this opens on our side (no longer blocked on Synlab)
- **D-identifier storage + allocation.** Persist one D-identifier per patient, allocate the next free one from the delivered series on first requisition, reuse forever. Replaces the provisional insurance-policy fallback in `weblims-payload.ts::resolvePatientIdentifier`.
- **CZ Synlab collection centre + pricing.** Create a CZ Synlab `TestCenter` and import the kalkulacka price list into `TestCenterExam` (our importer exists; the 4.2k rows currently loaded are the *Portuguese* centre).
- **Consent capture.** Surface `THIRD_PARTY_LAB` consent in the booking/portal flow (only 3 patients platform-wide carry it today).

---

## What their API actually does (internal note, do not send)

The Remote API is **not** a booking API and **not** a headless requisition API. It is a
form-handoff protocol:

1. Our backend authenticates server-to-server (OAuth 2.0 client credentials, `scope=remote`).
2. `POST /api/Remote/new-request` with patient + requesting-workplace context returns a
   short-lived **opaque token**. Nothing is created in their LIS at this point.
3. A **human operator** opens `GET /api/Remote/show/{token}` in a Chromium browser, logs into
   WebLIMS, selects the actual methods, and saves the electronic requisition.
4. `GET /api/Remote/methods/{token}` returns a **plain-text** summary of ordered methods.

So:
- There is no appointment or slot booking anywhere in the API. The patient is walk-in.
- No structured method codes come back, only free text.
- **No requisition number or sample barcode is returned by any endpoint** — this is our
  biggest problem for matching results back to a patient (see Q18/Q19).
- No webhook when the operator saves; we have to poll `methods/{token}`.
- Synlab already confirmed results cannot come back over an API. Of the channels they
  offered (WebLIMS manual, MISSION, ClickBox, eMessage, SFTP), **only SFTP is automatable
  by us**, so that is the one to secure.

Spec conflict worth flagging to them: the PDF marks only `patientId` and `sex` as required
on the patient object, but the OpenAPI schema `ApiRemoteRequestPatientParams` lists
`patientId`, `surname` and `birthDate` as required, and does not mark `sex` required. We
build to the OpenAPI (stricter) and ask them to confirm.

---

## Email draft

> **Subject:** WebLIMS 2 integration — technical questions and request for test access

Good morning,

Thank you for the documentation — we have reviewed both the integration description and the
OpenAPI specification with our engineering team, and we would like to proceed.

To confirm our understanding of the workflow: our doctor prescribes the laboratory tests in
our system, our staff then agrees the final list of tests with the patient, and our staff
opens the WebLIMS request form (pre-filled through your Remote API) to create the electronic
requisition and print the sample labels. The patient then attends one of your collection
points, and the results are returned to us so we can file them in the patient's medical
record and make them available in our patient portal.

We have already started building our side of this, and we can complete most of it
independently. To finish and to connect to your test interface, we need the following from
you. I have grouped the questions and attached the full technical list for your IT
colleagues.

**1. Test access**
Please set up the test interface you mentioned. We need the base URL of the test environment
(the OpenAPI file only contains a relative path, `/weblimsdev`, so we do not have a host
name), a `client_id` and `client_secret`, and the exact value we should send in the
`X-Api-Version` header. Please also tell us whether you restrict access by IP address, so we
can send you ours.

**2. Registering us as a requesting workplace**
Our Czech entity would need to be registered in your FOL codebook so we can populate the
requisition correctly. We would need the resulting codes for the department/workplace
(`wardCode`, `wardICP`, `wardNode`, `wardSpeciality`) and for the prescribing doctors
(`doctorCode`, and whether `doctorKrzpId` is mandatory).

An important question here: some of our doctors are not registered in the Czech KRZP
register. Is it possible to issue requisitions under a single registered clinic-level
doctor, or must every prescribing doctor be individually registered?

**3. Patient identification — our main open question**
The `patientId` field expects a Czech birth number (rodné číslo). A significant part of our
patient base in Czechia are expatriates and visitors who do not have one. What should we send
for a patient with no Czech birth number — is the `isTravel` flag combined with an insurance
policy number the intended mechanism, and what value goes into `patientId` in that case?

Related: if a patient is not yet known to WebLIMS, does the system create the patient record
from the data we send, or must the patient be registered with you first?

**4. Billing**
Our patients will pay us directly for the tests (self-pay), and we would expect a
consolidated invoice from Synlab. Could you send the price list per method, and confirm the
code we should use in the `insurance` field for a self-paying patient? We would also like to
confirm that self-pay requisitions do not require a contract with a public health insurer.

**5. Labels and the WebLIMS Browser**
We intend to print the sample labels ourselves. Please send us the WebLIMS Browser installer
(`wlbrowser.exe`), the supported Windows versions, and which Brother label printer models and
label stock you recommend. Please also confirm whether signing requisitions with a
qualified certificate is mandatory, and if so whether the certificate is issued per doctor or
per clinic.

**6. Returning the results to us**
You mentioned WebLIMS, MISSION, ClickBox, eMessage and SFTP. **SFTP is the option that fits
us best**, because it is the only one we can process automatically. Could you confirm it is
available and provide the connection details, the file format (we assume DASTA — please
confirm the version and character encoding), whether a PDF report is delivered alongside the
structured file, and how corrections or preliminary results are marked. Sample files from
the test environment would let us build and test the import before go-live.

There is one point we would like to raise here. As far as we can see, the Remote API does
not return the requisition number or sample identifier to us after the requisition is saved,
which leaves us without a reliable key to match an incoming result file to the correct
patient and order in our system. Two possible solutions, either of which would work for us:
either the requisition number is returned to us (for example in the response of
`GET /api/Remote/methods/{token}`), or we are able to pass our own reference into the
requisition and have it echoed back in the result file. Could you tell us which of these is
feasible?

**7. Data protection**
Since we will be transferring patient identification and clinical data, we will need the
appropriate data processing agreement in place, and confirmation of where the data is hosted
and how long it is retained.

I have attached the detailed technical list for your IT colleagues. We would be glad to take
up your offer of a call to go through these — particularly points 3 and 6, which affect how
we build our side. Please let us know a few times that suit you.

Thank you and best regards,

---

## Technical annex

### A. Access and environments
| # | Question |
|---|---|
| A1 | Base URL of the **test** and **production** environments. The OpenAPI `servers` entry is the relative path `/weblimsdev` only. |
| A2 | `client_id` / `client_secret` for test; process and lead time for production credentials. |
| A3 | Exact value(s) for the `X-Api-Version` header, and the versioning policy. |
| A4 | IP allowlisting or mTLS required? If yes we will supply our egress IP addresses. |
| A5 | Rate limits on `/api/OAuth/token` and the `/api/Remote/*` endpoints. |
| A6 | Access-token lifetime, and whether concurrent tokens for one `client_id` are permitted. |

### B. Codebooks and registration (FOL)
| # | Question |
|---|---|
| B1 | Register our Czech entity as a requesting workplace and issue `wardCode`, `wardICP`, `wardNode`, `wardSpeciality`. |
| B2 | `doctorCode` per prescribing doctor. Is `doctorKrzpId` mandatory? |
| B3 | **Can requisitions be issued under one clinic-level registered doctor** when the prescribing doctor is not in the Czech KRZP register? |
| B4 | Full list of FOL insurance/invoice codes carrying the "pro Web" flag, **including the self-pay (samoplátce) code**. |
| B5 | Diagnosis codes in `diagMain` / `diag1..diag5` — plain MKN-10? Mandatory in practice, or optional? |
| B6 | Machine-readable list of collection points (address, opening hours), or confirmation that we maintain it manually. |
| B7 | Is there a catalogue of available methods (code + name + material + turnaround) we can import, so our doctors prescribe from your catalogue rather than free text? |

### C. Patient identification
| # | Question |
|---|---|
| C1 | **What is sent in `patientId` for a patient with no Czech birth number** (EU citizen with EHIC, third-country national, tourist)? Is `isTravel: true` plus an insurance policy number the intended mechanism? |
| C2 | Is there format or checksum validation on `patientId`? |
| C3 | Does WebLIMS create an unknown patient from the payload, or must the patient already exist in your registry? |
| C4 | Confirm the required-field set. The PDF marks `patientId` + `sex` as required; the OpenAPI marks `patientId` + `surname` + `birthDate` as required. Which is authoritative? |
| C5 | Expected format of `birthDate` — ISO 8601 date, or full date-time? The schema declares `format: date-time`. |

### D. Form behaviour and operator accounts
| # | Question |
|---|---|
| D1 | Can `GET /api/Remote/show/{token}` be embedded in an **iframe**? What are the `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` headers? |
| D2 | Does each of our staff operators need a **named WebLIMS user account**? How are they provisioned, and are they licensed per seat? |
| D3 | Lifetime of the `show/{token}` token. |
| D4 | The documentation calls the token single-use with limited validity, but also describes `methods/{token}` as usable after saving or reopening the requisition. **For how long, and how many times, can `methods/{token}` be called?** |
| D5 | Is there any redirect, `postMessage`, or other signal when the operator saves the requisition, so we know it succeeded and can close the window — or is polling `methods/{token}` the only option? |
| D6 | **Can the requisition number / sample barcode be returned to us?** |
| D7 | **Can we pass our own external reference into the requisition and have it echoed back in the result file?** |
| D8 | `wlbrowser.exe`: installer, supported Windows versions, silent-deployment options, supported Brother printer models, label stock. |
| D9 | Is certificate signing of requisitions mandatory? If so: which qualified certificate, issued per doctor or per clinic, and what hardware. |
| D10 | Behaviour of `/api/Remote/request-list` and `/api/Remote/result-list` — are these read-only views of the patient's history in WebLIMS, and is `result-list` a viable interim way for our staff to retrieve a result before SFTP is live? |

### E. Results return channel
| # | Question |
|---|---|
| E1 | Confirm SFTP is available. Host, port, authentication (we will generate an SSH keypair and send the public key), directory layout, file naming convention. |
| E2 | Format: DASTA v3 or v4? Which blocks are populated? Character encoding (Windows-1250 or UTF-8)? |
| E3 | Is a PDF report delivered alongside the structured file? |
| E4 | **Sample files** from the test environment, plus schema/DTD. |
| E5 | Delivery cadence — pushed as results become available, or batched on a schedule? |
| E6 | How are preliminary vs final results distinguished, and how are corrections/cancellations (oprava / storno) flagged? |
| E7 | Which fields in the file can we rely on for correlation — birth number, requisition number, our external reference? |
| E8 | Acknowledgement protocol: do we delete processed files, or move them to a subdirectory? What is your retention window? Can we request retransmission? |
| E9 | A test SFTP endpoint seeded with dummy results. |
| E10 | Is eMessage or MISSION materially faster or cheaper to onboard than SFTP? (Our preference is SFTP.) |

### F. Commercial and legal
| # | Question |
|---|---|
| F1 | Data processing agreement — controller-to-processor or controller-to-controller? Who is controller for the requisition data? |
| F2 | Hosting location, sub-processors, retention period. |
| F3 | Price list per method, and the billing model to us (consolidated monthly invoice?). |
| F4 | Confirmation that self-pay requisitions do not require our IČP to be contracted with a public payer. |
| F5 | Support contact and SLA for the integration once live. |

---

## Status of our implementation

| Area | State |
|---|---|
| Doctor prescribes exams from a catalogue, admin queue, patient confirmation, self-pay payment link | Built — no dependency on Synlab |
| WebLIMS OAuth + Remote client, "Open Synlab form", "Fetch ordered methods" | Built, **inactive until credentials are configured** (A1–A3, B1–B4) |
| SFTP result ingest | Not started — blocked on E1, E8, E9 |
| DASTA parser, structured analytes in the patient portal | Not started — blocked on E2, E4, E7 |
