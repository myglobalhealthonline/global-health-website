# Subscriptions — Ops Runbook

Operational reference for the subscription/billing system. The application code
is complete; the fragile part is **deployment configuration** (env vars, the
Stripe webhook endpoint + its event list, and cron cadence). This document is
the single source of truth for wiring a deploy so subscriptions actually take
money and grant benefits.

> Related: `docs/plans/subscription-plan-implementation.md` (design),
> `subscriptionsystemauditandfixplan.md` (audit + fix plan). Findings referenced
> below (B1, B2, …) map to that audit's bug register.

---

## 1. Required environment variables

| Var | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | everything | Postgres connection string. |
| `BILLING_DRIVER` | **real billing** | Set to `stripe`. Absent/`fake` = the in-memory driver (dev/test only). In production with `fake`, the money-path entrypoints hard-fail with a critical ops alert (B1) and boot logs a `BILLING MISCONFIGURED` warning. |
| `STRIPE_SECRET_KEY` | **real billing** | Must be set **together with** `BILLING_DRIVER=stripe`. If either is missing the factory falls back to the fake driver. |
| `STRIPE_WEBHOOK_SECRET` | webhook | `whsec_…` from the Stripe webhook endpoint. `POST /api/payments/webhook` returns **503** until this is set (fail-closed). |
| `CRON_SECRET` | cron | ≥16 chars (`openssl rand -base64 32`). The cron endpoints return **503** without it. Sent as the `X-Cron-Token` header. |
| `PUBLIC_SITE_URL` | checkout returns / emails | HTTPS origin, no trailing slash. Used to build Stripe `success_url`/`cancel_url` and email links. Defaults to `http://localhost:3000` — **must be the real domain in production** or Stripe returns bounce to localhost. |
| `OPS_ALERT_WEBHOOK` | recommended | Slack/Discord/generic webhook. Reconciliation findings + webhook failures + the B1 billing-misconfig alert POST here. Unset → logged only. |
| `ALLOW_TEST_SUBSCRIPTION_ACTIVATION` | **NEVER in real prod** | `true` lets the fake driver self-activate a subscription with no payment. Only for a keyless test/staging deploy. Setting it on a customer production lets users grant themselves free subscriptions + credits. |

**Go/no-go rule for production:** `BILLING_DRIVER=stripe` **and** `STRIPE_SECRET_KEY`
**and** `STRIPE_WEBHOOK_SECRET` **and** `CRON_SECRET` **and** a real `PUBLIC_SITE_URL`.
Verify the driver with `GET /api/admin/subscription-health` → `billingDriver` must be
`stripe` and `billingMisconfigured` must be `false`.

---

## 2. Stripe webhook endpoint

Create one webhook endpoint in the Stripe Dashboard (or CLI) pointing at:

```
POST  https://<api-host>/api/payments/webhook
```

Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

### Required event list

Subscribe the endpoint to **exactly** these events:

```
checkout.session.completed
checkout.session.expired
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.paid                        # alias of payment_succeeded (accepted, deduped)
invoice.payment_failed
invoice.payment_action_required
invoice.finalization_failed
charge.refunded
charge.dispute.created
```

Notes:
- The handler is **ordering-tolerant** (monotonic status writes, period-keyed
  grants) and **idempotent** (per-event-id dedupe + period keys), so Stripe
  retries and out-of-order delivery are safe. Out-of-order events that can't be
  linked yet return **500** on purpose so Stripe retries.
- `charge.refunded` / `charge.dispute.created` are routed **by charge context**
  (B2): invoice-backed charges → subscription clawback; one-off (payment-mode)
  charges → order/appointment `REFUNDED`. Do not remove either event.

### Local development

```
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Use the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET`. Without `stripe listen`,
use `POST /api/payments/sync-order` to reconcile a one-off order manually.

---

## 3. Cron scheduling

Two token-gated endpoints (`X-Cron-Token: $CRON_SECRET`), **different cadences**:

| Endpoint | Cadence | Work |
|---|---|---|
| `POST /api/cron/subscriptions` | every ~5 min | reservation TTL sweep + 14-day grace-cancel |
| `POST /api/cron/subscriptions/daily` | **once per day** | renewal reminders (T-3d). 24h dedup window — running more than daily double-sends. |

The app also runs an **in-process scheduler** on boot
(`lib/internal-scheduler.ts`): subs-ops 5m, reconciliation 60m, renewal
reminders 24h. On a single instance you can rely on it and skip external cron.

**Multi-instance caveat (B17):** the daily renewal reminder has no
cross-instance dedupe. If you scale to >1 instance, drive reminders from
**external cron only** (hit the daily endpoint once) or add leader election —
otherwise each instance double-sends.

Example (Railway cron / any scheduler):

```
*/5 * * * *   curl -fsS -X POST -H "X-Cron-Token: $CRON_SECRET" https://<api-host>/api/cron/subscriptions
7 6 * * *     curl -fsS -X POST -H "X-Cron-Token: $CRON_SECRET" https://<api-host>/api/cron/subscriptions/daily
```

---

## 4. Per-country go-live checklist

Subscriptions are strictly opt-in per country. To launch a new country:

1. **Feature flag** — add `subscriptions` to the country's `enabledFeatures`
   (admin → countries → [id]). Without it, `startSubscription` returns
   `NOT_ELIGIBLE` and the pricing page 404s.
2. **Seed / create the plans** — run `npm run db:seed:subscriptions` for the
   pilot, or create the 3 tiers in the admin plan wizard. Each plan gets a
   Stripe Product + immutable Price on save (price-sync). Verify
   `GET /api/admin/subscription-health` → `priceSyncFailures` is empty.
3. **Consultation rules** — for GP credits to be usable, the country's GP
   service needs a `PlanConsultationRule` (isIncluded / usesCredits). The seed
   covers the pilot GP service; specialist rules are per-country admin work.
4. **Verify checkout end to end** — with the real Stripe test keys, subscribe →
   pay on Stripe → confirm the return page flips to ACTIVE (webhook landed) and
   month-1 credits/wellness granted.

---

## 5. Health & troubleshooting

`GET /api/admin/subscription-health` (admin-gated) returns:

- `billingDriver` / `billingMisconfigured` — must be `stripe` / `false` in prod.
- `priceSyncFailures` — active plans in subscription-enabled countries missing a
  Stripe Price.
- `invariantAlerts` — ledger↔counter mismatch, unswept reservations (>1h),
  ACTIVE subs with paid months but no grant.
- `drift` — Stripe↔DB status/period divergence (stripe driver only).

| Symptom | Likely cause | Fix |
|---|---|---|
| Checkout URL is `fake-billing.local` / dead in prod | `BILLING_DRIVER`/`STRIPE_SECRET_KEY` not both set (B1) | Set both; redeploy. Boot log + health `billingMisconfigured` confirm. |
| Subscriber stuck INCOMPLETE after paying | webhook not delivered / wrong secret | Check the Stripe endpoint, `STRIPE_WEBHOOK_SECRET`, and event list (§2). The return page polls ~30s then shows a "still processing" refresh CTA. |
| Order refunds not marked REFUNDED | webhook missing `charge.refunded` | Add the event (§2). Invoice-backed charges clawback the subscription; one-off charges flip the order. |
| Reserved credit stranded after manual admin PAID/CANCELLED | (fixed, B11) admin status change now commits/releases reservations | If pre-fix rows exist, the 5-min sweep + health `unswept_reservation` alert catch them. |
| Cron endpoints return 503 | `CRON_SECRET` unset | Set it; configure the scheduler header. |
