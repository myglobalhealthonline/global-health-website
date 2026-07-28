# Brazil — commission receipts & doctor payouts

Brazil bills as an **intermediary**: the patient is charged the full price, but the
fiscal document Global Health issues covers only our commission
(price − doctor payout). The doctor documents their own fee separately.

Gated on `Country.commissionReceiptEnabled`, editable at
**/admin/countries → Billing model**. Off by default; no other market is affected.

**Doctor payouts are settled by bank transfer, outside Stripe**, against the
admin report described below. There is no Stripe Connect integration and no
Brazil Stripe account — see *Why* below.

---

## Environment variables

**None.** Brazil charges on the existing Ireland account
(`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`), exactly as before this feature.
Nothing new to configure, in test or in production.

---

## Why payouts aren't automated through Stripe

Verified against Stripe's docs (July 2026). An **Ireland/EEA platform cannot pay a
Brazilian connected account by any route**:

| Route | Verdict |
|---|---|
| Connect cross-border payouts, IE → BR | ❌ Senders in US/UK/EEA/CA/CH may only pay connected accounts **in those same regions**. Brazil isn't one. |
| Cross-border payouts w/ `recipient` service agreement | ❌ "You can't make cross-border payouts to connected accounts under a recipient service agreement." |
| Global Payouts | ❌ Available to platforms in **GB and US only**. |
| Separate charges & transfers | ❌ "your platform and any connected account must be in the same region". |

Stripe also has **no API to move balance between two separate Stripe accounts** we
own — the only way out of an Ireland balance is a payout to the Irish bank account.

The only Stripe-native fix is a **Brazil-registered platform account** (needs a
Brazilian entity + CNPJ), which we don't hold. So Brazil stays on Ireland and
payouts leave over ordinary bank rails.

This is a product/regulatory limit, not a setting — raising a Stripe support
ticket will not change it.

---

## The payout run (how a doctor actually gets paid)

**/admin/reports → "Doctor payouts — commission markets (Brazil)"**
(`GET /api/admin/reports/export?dataset=commission-payouts`, CSV / Excel / PDF /
on-screen preview).

Grouped by doctor. Per consultation: date paid, consultation date, order number,
patient, service, **amount charged**, **Global Health commission**, **doctor
payout**. Then a `TO TRANSFER` subtotal per doctor and a grand total.

- Covers **all** doctors; pick one to narrow. Country and date filters apply.
- Defaults to the **previous full calendar month**.
- Counts only **PAID, non-refunded** orders.
- Reads the **frozen** `OrderItem.doctorPayoutCents` / `.commissionCents`
  snapshots taken at checkout — so the run always reconciles against the receipts
  actually issued, even if someone edited a service's payout since. This is
  deliberately unlike the per-doctor *Doctor payout statement*, which is a live
  valuation.

Bank details for the transfer come from the existing per-doctor **Doctor payout
statement** (which audits the IBAN reveal). The commission report deliberately
carries no bank details — it spans every doctor and is a worksheet, not a
disclosure.

### Refund timing

Refund **before** the run → the order drops out automatically. Refund **after**
the doctor was paid → recover it by hand; there is no clawback once money has
left over a bank rail.

---

## What the patient receives

One document, `BR-000xx`, whose only line is **Comissão Global Health** at the
commission amount, with an intermediation note explaining that medical fees are
documented by the practitioner. Stripe's own invoice is suppressed in commission
markets so this is the only document the patient sees.

Credit notes credit the **commission**, not the amount charged.

---

## Test walkthrough

Uses the existing Ireland test keys — nothing new to set up.

1. **Enable the market.** /admin/countries → Brazil → tick *Commission-only
   receipts* → save.
2. **Set payouts.** /admin/doctors/`<id>`/services → set **Doctor payout** for
   every Brazilian service the doctor offers. Until this is set the doctor is
   **not bookable** in Brazil — deliberate: the commission would otherwise
   silently be the full price.
3. **Book and pay.** Book a Brazilian consultation. Checkout shows the **full**
   price (e.g. R$200,00). Pay with `4242 4242 4242 4242`.
4. **Check the receipt.** The patient's email carries a `BR-000xx` document whose
   only line is *Comissão Global Health* at R$60,00 (if the payout is R$140,00).
   No R$200,00 anywhere. No second Stripe invoice.
5. **Check the print view.** /print/order-invoices/`<invoiceId>` shows the same,
   in pt-BR.
6. **Run the report.** /admin/reports → *Doctor payouts — commission markets* →
   the consultation appears under that doctor with charged R$200,00, commission
   R$60,00, payout R$140,00, and a TO TRANSFER total of R$140,00.
7. **Toggle off.** Untick *Commission-only receipts*, re-render the same order's
   document: it returns to today's full-price receipt. Proves the market can be
   switched back.

### Things that should NOT happen

- Any change to an Ireland / Czech / Spain / Romania / Portugal document.
- A receipt showing R$200,00 in a commission market.
- A Brazilian doctor bookable with no payout configured.

---

## Still outstanding

- **The Brazilian legal footer is a placeholder.** `INVOICE_LABELS.br
  .commissionLegalFooter` in `modules/invoices/invoice-pdf.ts` is marked ⚠️
  in-code as not legally reviewed. It needs your accountant's wording, including
  whether ISS or withholding must be stated.
- **The migration is written, not applied**
  (`20260728140000_commission_receipt_model`). Idempotent DDL; apply with
  `prisma migrate deploy`, never `migrate dev`.
- **Confirm Brazil's `Country.currency`.** If it is BRL, check the Ireland Stripe
  account can actually present BRL; the code lowercases `order.currencyCode` and
  defaults to EUR, so a mismatch charges the wrong currency.
