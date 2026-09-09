# NIA — authenticating a doctor through Identita občana

Source: `NIA_v0.8.docx` and the NIA API documentation at
https://testnia.sukl.cz/docs/, supplied by SÚKL 2026-09-09, together with their
written answer of the same date.

## Why this is the route we take

SÚKL, in writing: *"do not send any signature in the XML request — you will skip
the signature part. But you must have it implemented in your system."*

And from `NIA_v0.8`: when a user is authenticated this way, message signing is
**not required** — *"výjimka je testovací zpráva AppPingZEP … podpis je vyžadován
vždy"*. `AppPingZEP` always needs a signature, because testing signing is its
entire purpose.

So NIA removes the qualified-signature requirement from `ZalozitPredpis` and
`ZmenitPredpis`, and with it the question of holding a doctor's private key.
The signing implementation stays: SÚKL require it to exist, `AppPingZEP` needs
it always, and it is the fallback if a doctor cannot use NIA.

## The flow

NIA is **not headless**. Step 3 is a citizen logging in, by design.

1. Generate a UUID for the call (`ext_id`). One per attempt — a reused UUID is
   a 400.
2. `GET /nia/ext/v1/login/{ext_id}/osoba/{os_id}?redirect=false`, presenting the
   SÚKL authentication certificate. Returns a NIA sign-in URL.
3. **The doctor opens that URL and signs in at Identita občana.**
4. Poll `GET /nia/ext/v1/stav/{ext_id}` until it leaves states 1 and 2.
5. `GET /nia/ext/v1/token/{ext_id}` for the JWT.

Then every SOAP call carries `Authorization: Bearer <token>` — replacing HTTP
Basic, not supplementing it.

| State | Meaning |
|---|---|
| 1 | Authenticating at NIA (transient) |
| 2 | Processing in External Identities (transient) |
| 3 | **Token valid** — the only success |
| 4 | NIA verification invalid |
| 5 | External Identities error |
| 6 | NIA error |
| 7 | Token no longer valid |

Login errors are documented so a client can avoid sending a doctor to a login
that cannot succeed: **400** duplicate call UUID, **403** person or workplace
lacks permission, **404** person unknown to External Identities *or not
identified against the population register (ROB)*.

## Token lifetime — this shapes the product

- Prescribing and dispensing: valid **until midnight of the issuing day**. Issued
  after 22:00, it covers the whole next day too.
- Batch downloads: 24 hours.
- Bound to the subject who logged in. **It cannot be shared between doctors.**

So a doctor signs in roughly **once per working day**, not once per
prescription. Every call in between is server-side.

The timestamps NIA return carry no timezone (`"2026-09-10 00:00:00"`) and mean
Czech local time. Parsing them as server-local would be UTC on Railway and would
discard a still-valid token an hour or two early, so `nia.ts` states
`Europe/Prague` explicitly.

## Prerequisite, and the open question

The doctor must be **identified against the population register (ROB)** in
External Identities. That is what Identita občana is: a Czech citizen identity.

**Unresolved:** whether every prescribing doctor on this platform can obtain
one. A doctor without Identita občana cannot use this route and would need a
personal qualified certificate instead — which is why the signing path stays
implemented rather than deleted.

## Test identities

From the NIA API documentation, already registered in External Identities:

| Login | UUID | Name | Role |
|---|---|---|---|
| 00150042919 | c5894c02-daf7-4e60-9d3e-724e88d667ef | Věra Dvořáková | Lékař |
| 00150042927 | 64db56e0-cb91-4ebd-b5e2-6d13fbb49c6a | Pavel Kácha | Lékárník |

Password for both: `Testerp@215798`. Test environment only.

## Configuration

`SUKL_NIA_BASE_URL` — `https://testnia.sukl.cz` for test, `https://nia.sukl.cz`
for production. A different host from the SOAP services.
