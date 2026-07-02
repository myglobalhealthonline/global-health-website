# Stripe multi-account (PT / ES / CZ sandboxes + Ireland) & Portugal InvoiceExpress

## What the code does now

One-off consultation/order payments pick a Stripe account by the row's `countryCode`:

| Country code        | Stripe account        | Env pair                                          |
|---------------------|-----------------------|---------------------------------------------------|
| `pt`                | Portugal sandbox      | `STRIPE_SECRET_KEY_PT` / `STRIPE_WEBHOOK_SECRET_PT` |
| `es`, `sp`          | Spain sandbox         | `STRIPE_SECRET_KEY_ES` / `STRIPE_WEBHOOK_SECRET_ES` |
| `cz`                | Czech sandbox         | `STRIPE_SECRET_KEY_CZ` / `STRIPE_WEBHOOK_SECRET_CZ` |
| everything else (`ie`, `rm`/`ro`, `br`, unknown) | Ireland (default) | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` |

- Routing logic: `resolveStripeAccount()` in [src/lib/stripe/client.ts](../src/lib/stripe/client.ts).
- A blank sandbox key falls back to the Ireland key — a half-configured sandbox never 503s a market.
- **Subscriptions, the Brazil-consent fee, and redemption shipping stay on Ireland** (they call
  `getStripeClient()` with no country).
- The webhook endpoint is **one URL** (`/api/payments/webhook`) that verifies the signature
  against every configured signing secret and processes the first that matches.
- Frontend uses hosted-checkout redirect only — no publishable keys needed.

---

## Part A — Create the sandboxes (do this in the Stripe Dashboard)

Stripe **Sandboxes** are isolated test environments under one org.

Do this **once per market** (PT, ES, CZ) and confirm the existing Ireland account:

1. **Create the sandbox**
   Dashboard → account switcher (top-left) → **Sandboxes** → **Create sandbox** →
   name it e.g. `Global Health — Portugal (sandbox)`. Switch into it.

2. **Copy the secret key**
   Developers → **API keys** → copy the **Secret key** (`sk_test_…`).
   (Publishable key is not used — hosted checkout only.)

3. **Add the webhook endpoint**
   Developers → **Webhooks** → **Add endpoint**:
   - **URL** (same for all accounts): `https://<backend-domain>/api/payments/webhook`
     (local dev: use `stripe listen`, see step 5)
   - **Events to send**:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
     - `charge.refunded`
     - *(Ireland only, additionally keeps its subscription events:
       `customer.subscription.*`, `invoice.*`)*
   - Copy the endpoint **Signing secret** (`whsec_…`).

4. **Confirm currency / payment methods**
   Settings → payments. Make sure the account's currency matches what the app charges
   that country (EUR for PT/ES/IE). **Czech: confirm CZK vs EUR** — the code lowercases
   `order.currencyCode` and defaults EUR, so CZ orders must carry the intended `currencyCode`
   or the CZ sandbox must accept EUR.

5. **Local testing (per sandbox)**
   ```
   stripe login              # log into the specific sandbox
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```
   Use the printed `whsec_…` as that account's local `STRIPE_WEBHOOK_SECRET_*`.

6. **Paste keys into `backend/.env`**
   ```
   STRIPE_SECRET_KEY_PT="sk_test_…"
   STRIPE_WEBHOOK_SECRET_PT="whsec_…"
   STRIPE_SECRET_KEY_ES="sk_test_…"
   STRIPE_WEBHOOK_SECRET_ES="whsec_…"
   STRIPE_SECRET_KEY_CZ="sk_test_…"
   STRIPE_WEBHOOK_SECRET_CZ="whsec_…"
   ```
   Ireland stays in the existing `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.
   Leave a pair blank to route that country to Ireland. Restart the backend.

In production (Railway), set the same variables on the backend service.

---

## Part B — Going live per market

Replace that account's `sk_test_…` / `whsec_…` with **live** values and register the
production webhook endpoint (same URL) in the live account. No code change.

---

## Part C — Portugal invoice via InvoiceExpress

**No Make.com.** InvoiceExpress's **native Stripe integration** is connected to the Portugal
Stripe account and auto-issues the legal invoice whenever a payment completes on that account.
Our backend does **not** generate PT invoices (see the `pt` skip in
[src/modules/invoices/generate-invoice.service.ts](../src/modules/invoices/generate-invoice.service.ts)) —
it only makes sure the fields InvoiceExpress needs are present on the Stripe objects.

### The target invoice (fields InvoiceExpress must fill)

The invoice should look like this (`M07` = Artigo 9.º medical-services VAT exemption, item
`Isento`), with the **service name** and **fiscal number (NIF)** populated:

```json
{
  "invoice": {
    "type": "InvoiceReceipt",
    "tax_exemption": "M07",
    "client": {
      "name": "<patient name>",
      "fiscal_id": "<NIF, or 999999990 when not a valid 9-digit NIF>",
      "address": "<street>", "postal_code": "<zip>", "city": "<city>"
    },
    "items": [
      { "name": "<service name>", "unit_price": <total>, "quantity": 1, "tax": { "name": "Isento" } }
    ]
  }
}
```

### What the backend now sends (code)

The two missing pieces are now attached to the Stripe **Checkout Session's auto-created
invoice** for PT only, via [src/modules/invoices/pt-stripe-invoice-data.ts](../src/modules/invoices/pt-stripe-invoice-data.ts):

- **NIF** — read from the patient's stored `PatientProfile.taxIdNumber` and written to the
  invoice as a **custom field** `NIF` *and* invoice **metadata** `nif`.
- **Service name** — the Checkout **line item name** (already the real service), plus a custom
  field `Servico` and metadata `service_name` as backup.

Wired into the three order-checkout paths: [orders.route.ts](../src/routes/orders.route.ts)
(cart checkout), [manual-booking.service.ts](../src/modules/appointments/manual-booking.service.ts)
(admin booking), [order-payment-url.service.ts](../src/modules/orders/order-payment-url.service.ts)
(payment-link resend). Non-PT countries are untouched.

### Configure InvoiceExpress (dashboard — you do this)

1. **Map the fields.** In the InvoiceExpress Stripe integration settings, map:
   - `fiscal_id` ← the Stripe **invoice custom field `NIF`** (or invoice metadata `nif`).
     If your InvoiceExpress mapping only reads the Stripe **Customer Tax ID**, tell me — we'd
     then attach the NIF as a Customer tax id instead of a custom field.
   - item `name` ← the Stripe **line item description** (already the service name).
   - `name` / `address` / `postal_code` / `city` ← the Stripe customer / billing details.
   - Static: `type = InvoiceReceipt`, `tax_exemption = M07`, item tax `Isento`.
   - Fallback NIF `999999990` for a missing/invalid (non 9-digit) NIF.
2. **Address on the invoice.** If billing address is blank, enable address collection on the PT
   Checkout Sessions (`billing_address_collection: "required"`) — say the word and I'll add it.

### ⚠️ Test / sandbox: draft only — never issue a real invoice

Payments in the **sandbox (test) Stripe account must NOT produce a final legal invoice.**
This is an InvoiceExpress-side setting, not code:

- Point the InvoiceExpress **test/sandbox connection** at the sandbox Stripe account and set it
  to create invoices as **draft** (do not finalize/send). Keep the **live** InvoiceExpress
  account connected only to the **live** Stripe account for real issuance.
- Verify: run a sandbox PT payment → InvoiceExpress shows a **draft** with the correct service
  name + NIF (or `999999990`), `M07`, `Isento` — and nothing is sent to the tax authority.
