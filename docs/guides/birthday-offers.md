# Birthday consultation offers

Global admins configure the feature at **Coupons → Birthday offer settings**
(`/admin/coupons/birthday`). It starts disabled, with no discount selected and
30 calendar days of validity. Set the percentage, preview the email, then save
with **Enable birthday offers** checked. Changes affect newly issued coupons.

The scheduler checks every 15 minutes and on startup. It queues offers on the
patient's birthday after 09:00 using the most recent patient appointment's valid
timezone, falling back to the country's configured booking timezone. Missing
timezones or DOB, conflicting account/profile DOB, inactive or merged profiles,
pending deletion, absent/withdrawn MARKETING consent, and known newsletter
unsubscribes suppress delivery. February 29 is observed on February 28 in
non-leap years. There is no next-day catch-up or reminder campaign.

Each offer uses an existing personal GP-only coupon, locked to the recipient's
email and limited to one redemption. Commission markets and countries without
an active public GP service are excluded. Existing checkout restrictions on
insurance and membership benefits apply. Concurrent scans cannot issue a second
offer for the same profile/year or normalized address/year.

Email content follows the patient's preferred language, with the country locale
as fallback. The booking link opens an existing public GP service; the patient
enters their code at checkout. The unsubscribe link opens a public confirmation
form. Only submitting the form withdraws MARKETING consent and suppresses existing
newsletter subscriptions; email scanners opening the link do not unsubscribe.

## Deployment and activation

1. Apply `20260909100000_birthday_offers` through the normal guarded Prisma
   migration deployment before deploying this backend. This adds a table and
   an audit enum value; it does not enable the feature or send anything.
2. Deploy backend and frontend; verify the configured email provider and
   `PUBLIC_SITE_URL`. The existing scheduler must be enabled.
3. Select the intended discount, preview the supported languages and validity,
   and enable in the portal. Patient opt-in remains in **Profile → Privacy →
   Marketing communications**; no existing patients are opted in automatically.
4. Review the delivery summary and recent offers. **Sent** means provider
   acceptance, not inbox delivery. **Redeemed** counts consumed redemptions.

Provider-confirmed rejection retries the same coupon using the existing outbox's
bounded backoff. Ambiguous transport failures and abandoned send claims become
**UNKNOWN** rather than being resent automatically. Check the provider's records
before manually emailing that same code. Generic coupon Send/Resend actions and
raising the redemption limit are blocked for birthday coupons. Missing provider
configuration never counts as a successful send.

To pause, disable the feature in the portal. Pending offers are suppressed when
processed; already issued coupons remain valid and can be individually disabled
from their coupon detail page. For rollback, disable before rolling the backend
back and drain pending birthday outbox entries while this version is running;
older code cannot dispatch this new outbox kind. Keep the additive table and audit
records rather than deleting history.

## Local verification

Use the repository's guarded Node test runner for `birthday-*.test.ts`,
`admin-birthday-offers.route.test.ts`, `smtp-send.test.ts`, and the existing coupon
eligibility/scope/redemption tests. Birthday unit tests mock database and email
access. `enqueueBirthdayOffers(now, true)` is an optional read-only eligibility
scan of the saved enabled configuration: it creates no coupons/outbox rows and
sends no email. Do not run the normal enqueue/dispatch functions against production
as a test.
