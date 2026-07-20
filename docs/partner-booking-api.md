# Partner Booking API

Programmatic equivalent of an admin manual booking. An external system can
list what's sellable in a country, read a doctor's open slots, and create a
real booking — with the same slot claiming, pricing, patient provisioning,
payment link, and notifications the admin console produces.

Base path: `/api/partner/v1`

---

## Authentication

Every request needs a key:

```
X-Api-Key: ghp_live_<43 chars>
```

One `PartnerApiClient` row per integrator. Keys are stored as SHA-256 of the
plaintext — the plaintext is shown **once**, at mint time, and is not
recoverable. Lost keys are re-minted, not read back.

A key may be scoped to specific countries. The scope is re-checked against
the country in the path/query/body of **every** request. An out-of-scope
country returns `404`, not `403`, so a key scoped to `pt` cannot enumerate
which other markets exist.

Failures — missing, malformed, unknown, or revoked key — all return the same
`401 Invalid or missing API key`.

### Managing keys (admin only)

```
GET    /api/admin/partner-api-clients
POST   /api/admin/partner-api-clients      { name, allowedCountryCodes?: string[] }
DELETE /api/admin/partner-api-clients/:id  (soft revoke)
```

`allowedCountryCodes: []` (or omitted) = unrestricted.

Mint response contains `data.key` — the only time it exists. Copy it
immediately.

```bash
curl -X POST https://<host>/api/admin/partner-api-clients \
  -H 'Content-Type: application/json' \
  -b 'gh_auth=<admin session cookie>' \
  -d '{"name":"Acme Clinic CRM","allowedCountryCodes":["pt"]}'
```

---

## Response envelope

All endpoints use the standard site envelope:

```json
{ "ok": true,  "message": "…", "data": { … } }
{ "ok": false, "message": "…", "details": { … } }
```

---

## 0. Discovery — countries

```
GET /api/partner/v1/countries
```

The markets this key may operate in. Use it to bootstrap instead of
hardcoding country codes.

```json
{
  "ok": true,
  "data": {
    "countries": [
      {
        "id": "clx…",
        "code": "pt",
        "name": "Portugal",
        "timezone": "Europe/Lisbon",
        "currencyCode": "EUR",
        "defaultLocale": "PT"
      }
    ]
  }
}
```

`timezone` is the IANA zone this market's slot times mean. **Each country
runs its own** — never assume one zone across markets.

---

## 1. Catalogue — services, prices, doctors

```
GET /api/partner/v1/countries/:countryCode/catalog
```

What can be sold in this market, at what price, by which doctors. Every id
returned here is what calls 2 and 3 consume.

```json
{
  "ok": true,
  "data": {
    "country": { "id": "clx…", "code": "pt", "name": "Portugal",
                 "timezone": "Europe/Lisbon", "currencyCode": "EUR",
                 "defaultLocale": "PT" },
    "services": [
      {
        "id": "clsvc…",
        "slug": "general-consultation",
        "name": "General Consultation",
        "kind": "GENERAL",
        "summary": "…",
        "durationMinutes": 20,
        "basePriceCents": 4500,
        "currencyCode": "EUR",
        "peakPricingEnabled": true,
        "isBookable": true,
        "doctors": [
          { "id": "cldoc…", "slug": "ana-silva", "fullName": "Ana Silva",
            "title": "GP", "languages": ["pt", "en"] }
        ]
      }
    ]
  }
}
```

Notes:

- Only `isActive`, `visibility = PUBLIC` services appear. Corporate/admin-only
  services are not sellable through this API.
- `doctors` are filtered exactly as the public booking flow filters them:
  active doctor, rostered in this country, holding an active + approved
  assignment to this service. A doctor listed here will not be rejected at
  booking time for eligibility reasons.
- `isBookable: false` means no price is set or no eligible doctor exists.
  Surfaced rather than hidden so you can see *why* an expected service is
  missing.
- **When `peakPricingEnabled` is true, `basePriceCents` is not what the
  patient pays.** Read the per-slot `priceCents` from call 2.

Errors: `404` unknown/inactive/out-of-scope country.

---

## 2. Availability — time slots

```
GET  /api/partner/v1/availability
       ?countryCode=pt&serviceId=clsvc…&doctorId=cldoc…&days=14

POST /api/partner/v1/availability
       { "countryCode": "pt", "serviceId": "clsvc…",
         "doctorId": "cldoc…", "days": 14 }
```

Both forms take the same fields and return the same payload — use whichever
is easier to assemble. The `GET` is canonical and cacheable; the `POST`
exists because a `GET` cannot reliably carry a body (servers don't parse one
and proxies strip it, so it fails silently rather than loudly).

The API key stays in the `X-Api-Key` **header** in both cases — it is never a
query parameter or a body field.

`days` defaults to `14`, max `30`.

```json
{
  "ok": true,
  "data": {
    "country": { "id": "clx…", "code": "pt", "timezone": "Europe/Lisbon" },
    "service": { "id": "clsvc…", "slug": "general-consultation",
                 "name": "General Consultation", "durationMinutes": 20 },
    "doctor":  { "id": "cldoc…", "slug": "ana-silva", "fullName": "Ana Silva" },
    "clinicTimezone": "Europe/Lisbon",
    "rangeStart": "2026-07-20T15:00:00.000Z",
    "rangeEnd":   "2026-08-03T14:00:00.000Z",
    "slots": [
      {
        "id": "clslot…",
        "startAt": "2026-07-21T09:00:00.000Z",
        "endAt":   "2026-07-21T09:20:00.000Z",
        "priceCents": 4500,
        "pricingType": "STANDARD",
        "currencyCode": "EUR"
      }
    ]
  }
}
```

Notes:

- **All instants are UTC.** Render them in `clinicTimezone` to show the
  patient a local time. Conversion is DST-correct on the server.
- `slots[].id` is the `timeSlotId` you pass to call 3, verbatim.
- `priceCents` is per slot because peak pricing is time-of-day dependent.
  `pricingType` is `STANDARD`, `PEAK`, or `OFF_PEAK`. Charge what the slot
  says.
- Slots starting within the next hour are excluded (same buffer as the
  public booking flow).
- Availability is a live read — a slot can be taken between this call and
  your booking call. Handle `409` (below).

Errors: `404` unknown country / service not in that country / doctor not
found, inactive, or not assigned to that service. `400` invalid query.

---

## 3. Create booking

```
POST /api/partner/v1/bookings
```

```json
{
  "countryCode": "pt",
  "serviceId": "clsvc…",
  "doctorId": "cldoc…",
  "timeSlotId": "clslot…",
  "email": "patient@example.com",
  "fullName": "João Costa",
  "phone": "+351 912345678",
  "dateOfBirth": "1985-03-14",
  "taxIdNumber": "123456789",
  "utenteNumber": "987654321",
  "address": "Rua Augusta 100, 1100-053 Lisboa",
  "notes": "Referred by Acme CRM"
}
```

The body is **flat** — patient fields sit alongside the ids, not nested under
a `patient` object. Sending the old nested shape returns `400`.

Field rules:

- `phone` is **required** and must carry a country code (`+351 912345678`).
  Downstream WhatsApp/SMS automation cannot work from a national number.
- `taxIdNumber` is the patient's **fiscal / taxpayer number**, whatever the
  market calls it — NIF (PT, ES), CPF (BR), PPS (IE), CNP (RO), DIČ (CZ).
  One field for every country; the value is stored as supplied and read back
  for invoicing.
- `utenteNumber` is **Portugal only** (Número de Utente), and optional even
  there.
- `address` is a **single line** — street, city and postcode together.
- `nationalIdNumber` and `passportNumber` are also accepted, both optional.
- Unknown keys are rejected with `400` — a typo'd field is never silently
  ignored.
- Patient identity is matched on `email`. **An unknown email auto-creates a
  patient account**; a known one reuses it and its password is never
  rotated.

**Decided by the server, not the caller.** These are not accepted in the body
and sending them returns `400`:

| | |
|---|---|
| Duration | Taken from the chosen service. A caller cannot book 5 minutes of a 30-minute consultation. |
| Consultation mode | Always `ONLINE`. No clinic or location is attached. |
| Price | Derived from the service and slot. |
| Insurance | Not offered through this API — insurance-backed booking needs an admin to verify the card in person. Partner bookings are standard price. |

### Response — `201`

```json
{
  "ok": true,
  "message": "Booking created",
  "data": {
    "bookingId": "…",
    "orderId": "…",
    "patientUserId": "…",
    "status": "REQUEST_RECEIVED",
    "paymentStatus": "PENDING",
    "scheduledAt": "2026-07-21T09:00:00.000Z",
    "amountCents": 4500,
    "currencyCode": "EUR",
    "paymentUrl": "https://checkout.stripe.com/…",
    "setPasswordUrl": "https://…/reset-password?token=…&invite=1",
    "notificationsQueued": true
  }
}
```

### What happens server-side

Identical to an admin manual booking:

1. The slot is claimed atomically (`OPEN → HELD`).
2. Doctor eligibility + insurance network membership are re-validated.
3. Price is derived server-side (peak/off-peak, or the negotiated insurance
   rate — insurance wins over peak). The request cannot set a price.
4. A patient account is provisioned if the email is new.
5. An `Order` + `OrderItem` are raised, `paymentStatus: UNPAID`.
6. A Stripe Checkout session is created (per-country Stripe account).
7. The patient receives portal access + a payment link; the doctor is
   notified. Payment reminders and the auto-cancel ladder run off
   `Order.paymentDueAt`.
8. An unpaid invoice is issued where the country requires one.
9. An audit row records `source: "partner_api"` plus the `partnerClientId`.

**The booking is created unpaid.** The patient pays via `paymentUrl`. This
API cannot mark an order paid.

`paymentUrl` may be `null` if Stripe isn't configured for that country or
session creation failed — the booking still exists and is payable from the
patient portal. `notificationsQueued: false` means the booking is valid but
the patient messaging step failed; follow up out-of-band.

`setPasswordUrl` is returned so you can deep-link the patient into their
portal. The patient's temporary password is deliberately **not** returned —
the patient receives their own portal-access email, and putting login
credentials in a third-party system's logs buys nothing.

### Errors

| Status | Meaning |
|---|---|
| `400` | Invalid payload (details in `details`) |
| `401` | Invalid or missing API key |
| `404` | Country / service / doctor not found, inactive, or out of scope |
| `409` | **Slot no longer available** — re-read availability, pick another |
| `422` | Service has no price; doctor not in country / not assigned to service / not in insurer network; insurance doesn't cover the service |
| `503` | Database unavailable |

### Idempotency

The slot claim is atomic under a unique constraint, so **a replayed or
duplicated POST returns `409`, not a second booking** — the time slot is the
natural idempotency key. On `409`, re-read call 2 before retrying; do not
blind-retry the same `timeSlotId`.

---

## Rate limits

Per key: 120 req/min on reads, 30 req/min on writes. The global 300 req/min
limit also applies.

---

## Full flow

```bash
KEY='ghp_live_…'
HOST='https://<host>'

# 1. what can I sell in Portugal?
curl -s -H "X-Api-Key: $KEY" "$HOST/api/partner/v1/countries/pt/catalog"

# 2. when is Dr Silva free for that service?
curl -s -H "X-Api-Key: $KEY" \
  "$HOST/api/partner/v1/availability?countryCode=pt&serviceId=clsvc…&doctorId=cldoc…&days=7"

# 3. book the first slot
curl -s -X POST -H "X-Api-Key: $KEY" -H 'Content-Type: application/json' \
  "$HOST/api/partner/v1/bookings" \
  -d '{"countryCode":"pt","serviceId":"clsvc…","doctorId":"cldoc…",
       "timeSlotId":"clslot…","consultationMode":"ONLINE",
       "patient":{"email":"patient@example.com","fullName":"João Costa",
                  "phone":"+351 912345678"}}'
```

---

## Implementation map

| Concern | File |
|---|---|
| Routes | `backend/src/routes/partner-api.route.ts` |
| Admin key management | `backend/src/routes/admin-partner-api-clients.route.ts` |
| Key mint / auth / scope | `backend/src/modules/partner-api/partner-api-key.service.ts` |
| Catalogue | `backend/src/modules/partner-api/partner-catalog.service.ts` |
| Availability | `backend/src/modules/partner-api/partner-availability.service.ts` |
| Booking (delegates to `createManualBooking`) | `backend/src/modules/partner-api/partner-booking.service.ts` |
| Request schemas | `backend/src/validations/partner-api.schema.ts` |
| Model | `PartnerApiClient` in `backend/prisma/schema.prisma` |
| Migration | `backend/prisma/migrations/20260720000000_partner_api_client/` |

Routes are auto-loaded by `@fastify/autoload` — no registration step.
