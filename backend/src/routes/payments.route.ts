import type {
  FastifyBaseLogger,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { z } from "zod";
import { OrderStatus, PaymentStatus, PrePaymentFlow } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { releaseSlotsToBaseGrid } from "../modules/doctor-availability/doctor-availability.service.js";
import {
  getStripeClient,
  isStripeConfigured,
  getConfiguredWebhookSecrets,
} from "../lib/stripe/client.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { checkoutBranding } from "../modules/billing/checkout-branding.js";
import { completeOrderPaymentFromCheckoutSession, syncOrderPaymentFromStripe, syncOrderPaymentFromStripeSession } from "../modules/orders/complete-order-payment.service.js";
import { isSettledCheckoutSession } from "../modules/orders/checkout-session-settlement.js";
import { voidOrderCheckoutPaymentById } from "../modules/orders/void-checkout-payment.service.js";
import {
  handleSubscriptionEvent,
  isSubscriptionEvent,
} from "../modules/subscriptions/subscription-webhook.service.js";
import { emitOpsAlert } from "../modules/subscriptions/ops/ops-alert.js";
import {
  commitRedemption,
  releaseRedemption,
} from "../modules/subscriptions/redemption.service.js";
import { releaseOrderCreditReservations } from "../modules/subscriptions/checkout-pricing.service.js";
import { releaseOrderMembershipAllowance } from "../modules/memberships/membership-allowance.service.js";
import { sendOrderRefundNotifications } from "../modules/automation/refund-notifications.service.js";
import { cancelOrderAppointments } from "../modules/appointments/appointments.service.js";
import {
  sendMultibancoReferenceNotification,
  sendPrePaymentCancelledNotifications,
  sendWebCheckoutCancelNotifications,
  type MultibancoReferenceDetails,
} from "../modules/automation/pre-payment-flow.service.js";

const createCheckoutBodySchema = z.object({
  appointmentId: z.string().trim().min(8).max(40),
  /** Patient email used at booking time. Required so an attacker
   *  can't enumerate appointment IDs and harvest Stripe URLs that
   *  expose the patient's email + amount. Compared
   *  case-insensitively against the row's stored email. */
  email: z.string().trim().toLowerCase().email("Invalid email"),
  /** Lang-aware base URL used to build success/cancel returns. */
  returnTo: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^\/[a-z0-9/-]*$/i, "returnTo must start with /")
    .optional(),
});

/**
 * PRIV-001: the Stripe line-item label the customer sees on their receipt and
 * Checkout page. Deliberately non-clinical — never the appointment's free-text
 * notes (symptoms/PHI) or a raw enum. Falls back to a neutral label when the
 * linked service has no public name.
 */
export function buildAppointmentCheckoutProductData(appointment: {
  service?: { name?: string | null } | null;
}): { name: string } {
  return { name: appointment.service?.name?.trim() || "Medical consultation" };
}

function paymentsDisabled(reply: FastifyReply) {
  return reply
    .status(503)
    .send(errorResponse("Payments not configured. Set STRIPE_SECRET_KEY to enable."));
}

const syncOrderBodySchema = z
  .object({
    orderId: z.string().trim().min(8).max(40).optional(),
    stripeSessionId: z.string().trim().min(8).max(200).optional(),
  })
  .refine((data) => Boolean(data.orderId || data.stripeSessionId), {
    message: "orderId or stripeSessionId is required",
  });

/** The subset of a Checkout Session this file reads off a webhook payload. */
type WebhookCheckoutSession = {
  id: string;
  /** "paid" | "unpaid" | "no_payment_required" — the ONLY proof money moved. */
  payment_status?: string | null;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  invoice?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string>;
};

/**
 * Pull the Entidade/Referência pair off the session's PaymentIntent.
 *
 * Multibanco prints the voucher as a `next_action` on the intent; the Checkout
 * Session payload itself carries no reference, so this costs one API call.
 * Returns null for any other delayed method (or if Stripe is unreachable) —
 * callers must treat that as "we have nothing to tell the patient", never as
 * "there is nothing pending".
 */
async function resolveMultibancoDetails(
  session: WebhookCheckoutSession,
  countryCode: string | null,
  log: FastifyBaseLogger,
): Promise<MultibancoReferenceDetails | null> {
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;
  if (!paymentIntentId) return null;
  try {
    const stripe = getStripeClient(countryCode);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const voucher = intent.next_action?.multibanco_display_details;
    if (!voucher?.entity || !voucher.reference) return null;
    return {
      entity: voucher.entity,
      reference: voucher.reference,
      amountCents: session.amount_total ?? intent.amount ?? 0,
      currencyCode: (session.currency ?? intent.currency ?? "eur").toUpperCase(),
      expiresAt: voucher.expires_at ? new Date(voucher.expires_at * 1000) : null,
    };
  } catch (err) {
    log.warn({ err, paymentIntentId }, "Could not read Multibanco voucher off PaymentIntent");
    return null;
  }
}

/**
 * `checkout.session.completed` with `payment_status !== "paid"` — the session is
 * finished but NO money has moved.
 *
 * This is the normal, expected shape of every Multibanco checkout: Stripe
 * completes the session the instant the Entidade/Referência pair is printed,
 * and SIBS only reports the actual payment hours or days later, as
 * `checkout.session.async_payment_succeeded`. Treating this event as payment
 * (which this handler did until 2026-08-25) marks the order PAID, mints the
 * appointment, sends the booking confirmation and — in Portugal — issues a real
 * fiscal invoice, all for money that may never arrive.
 *
 * So: keep the order PENDING with its slot still held, tell the patient how to
 * pay the voucher, and let `async_payment_succeeded` do the confirming.
 */
async function handleUnpaidCompletedSession(
  session: WebhookCheckoutSession,
  stripeEventId: string,
  log: FastifyBaseLogger,
): Promise<void> {
  const orderId =
    session.metadata?.kind === "order"
      ? (session.client_reference_id ?? session.metadata?.orderId ?? null)
      : null;

  if (!orderId) {
    // Redemptions, Brazil consent fees and legacy appointment bookings are all
    // card-only today, so an unpaid completion on one of them is unexpected.
    log.warn(
      { sessionId: session.id, kind: session.metadata?.kind, paymentStatus: session.payment_status },
      "Checkout session completed unpaid on a non-order flow — nothing committed",
    );
  } else {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, countryCode: true, status: true, paymentStatus: true },
    });
    if (!order) {
      log.warn({ orderId, sessionId: session.id }, "Unpaid completed session for unknown order");
    } else if (order.paymentStatus !== PaymentStatus.PAID && order.status !== OrderStatus.PAID) {
      // PENDING (not PAID, not FAILED): the voucher is live, the slot stays
      // held, and the pre-payment reminder ladder keeps running as before.
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PENDING },
      });
      const details = await resolveMultibancoDetails(session, order.countryCode, log);
      if (details) {
        await sendMultibancoReferenceNotification(orderId, details).catch((err) => {
          log.error({ err, orderId }, "Multibanco reference notification failed");
        });
      } else {
        // We know the payment is pending but cannot say how to complete it —
        // the patient is left holding a slot with no instructions from us.
        await emitOpsAlert({
          severity: "warning",
          title: "Checkout completed unpaid with no voucher details",
          detail:
            "A Checkout Session completed with payment_status != paid but no Multibanco voucher could be read off the PaymentIntent. The order is PENDING and the patient was NOT told how to pay.",
          context: { orderId, sessionId: session.id, paymentStatus: session.payment_status ?? null },
        });
      }
    }
  }

  // Record the event so a Stripe redelivery is deduped at the top of the
  // handler instead of re-sending the voucher message.
  await prisma.processedWebhookEvent
    .create({ data: { stripeEventId, eventType: "checkout.session.completed.unpaid" } })
    .catch(() => undefined);
}

/**
 * Tear down a PENDING order whose payment is not going to arrive: mark it
 * CANCELLED/FAILED, hand back the held slot, credits and allowance units,
 * cancel the minted appointments, and tell the patient (and doctor) why.
 *
 * Shared by the two webhook events that mean "this attempt is dead" —
 * `checkout.session.expired` and `checkout.session.async_payment_failed` — so
 * an abandoned voucher releases exactly what an abandoned session does.
 *
 * `respectPrePaymentDeadline` is the difference between them. A Checkout
 * Session expiring at booking+24h says nothing about a deadline that is days
 * away (ORD-000163 was cancelled ~3 days early before this check existed), so
 * expiry defers to `paymentDueAt` and lets `resolveOrderPaymentUrl` re-mint a
 * session on the next click. A FAILED Multibanco voucher carries no such
 * ambiguity — that money is definitively not coming — so it cancels outright.
 */
async function abandonUnpaidOrder(
  orderId: string,
  log: FastifyBaseLogger,
  opts: { respectPrePaymentDeadline: boolean; reason: string },
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.status !== OrderStatus.PENDING) return;

  if (opts.respectPrePaymentDeadline) {
    // A future pre-payment deadline still owns the order: the slot stays HELD
    // and runPrePaymentCancelSweep performs the cancel + notifications when it
    // actually elapses. Only orders with no deadline (product-only) or an
    // already-elapsed one fall through.
    const deadlineStillOwnsOrder =
      order.prePaymentFlow != null &&
      order.paymentDueAt != null &&
      order.paymentDueAt.getTime() > Date.now();
    if (deadlineStillOwnsOrder) return;
  }

  // Kill anything still payable before the slot goes back on the grid. A
  // Multibanco voucher stays chargeable at any ATM for ~7 days, well past our
  // deadline, so without this the patient can pay a reference for a booking we
  // have already torn down. Also our last chance to notice the money already
  // arrived — abort the teardown if so, and let the payment webhook proceed.
  const voided = await voidOrderCheckoutPaymentById(orderId, log);
  if (voided === "already-paid") {
    log.warn(
      { orderId, reason: opts.reason },
      "Abandon aborted — Stripe reports the payment succeeded or is settling",
    );
    return;
  }

  const heldSlotIds = order.items
    .map((i) => i.timeSlotId)
    .filter((id): id is string => Boolean(id));
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED },
  });
  if (heldSlotIds.length > 0) {
    await releaseSlotsToBaseGrid(heldSlotIds);
  }
  // Release any subscription credit reservations on the abandoned order
  // (RESERVED → RELEASED, credit restored).
  await releaseOrderCreditReservations(orderId).catch((err) => {
    log.error({ err, orderId }, "Release order credit reservations failed");
  });
  // Same for membership allowance units (§7): spent at checkout, and this
  // abandoned-order path is one of the two crons that hand them back when the
  // payment never arrives.
  await releaseOrderMembershipAllowance(orderId).catch((err) => {
    log.error({ err, orderId }, "Release membership allowance failed");
  });
  // Cancel the consultation appointment(s) — release BOOKED slots + drop the
  // events off the admin/doctor calendars.
  await cancelOrderAppointments(orderId).catch((err) => {
    log.error({ err, orderId, reason: opts.reason }, "Cancel appointments on abandoned order failed");
  });

  if (order.prePaymentFlow === PrePaymentFlow.WEB_CHECKOUT) {
    // Website checkout: the patient was already told at T-10min that the slot
    // would be released, and the doctor was never told the booking existed.
    // Only the admin alert (plus the abandonment message itself, if the nudge
    // never ran) — same rule the cancel sweep applies.
    await sendWebCheckoutCancelNotifications(orderId, order.prePaymentReminderStage).catch(
      (err) => {
        log.error({ err, orderId }, "Web-checkout abandon notification failed");
      },
    );
  } else {
    // Notify the patient (+ doctor) that the unpaid reservation was cancelled —
    // the SAME cancelled message the deadline sweep sends, so a silent cancel
    // never happens again.
    await sendPrePaymentCancelledNotifications(orderId).catch((err) => {
      log.error({ err, orderId, reason: opts.reason }, "Cancelled notification failed");
    });
  }
}

const paymentsRoute: FastifyPluginAsync = async (app) => {
  /**
   * Create a Stripe Checkout Session for an existing Appointment.
   * Body: { appointmentId, returnTo?:  "/ireland/en" }
   * Returns: { url: string }  — frontend redirects window.location to this.
   *
   * Idempotency: if the appointment already has an UNPAID session that isn't
   * expired, we return the existing URL instead of creating a duplicate.
   */
  app.post("/api/payments/checkout-session", {
    // 20/hour/IP — a user might retry a few times if Stripe is flaky,
    // but bots trying to enumerate appointment IDs hit the cap fast.
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    if (!isStripeConfigured()) return paymentsDisabled(reply);

    const body = createCheckoutBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
    }

    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: body.data.appointmentId },
        include: { service: true },
      });
      if (!appointment) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      // Ownership proof — the caller has to know the email used at
      // booking. Without this, anyone with a guessable appointmentId
      // could mint a Stripe URL revealing the patient's email +
      // amount. Returns a deliberately vague 404 so the endpoint
      // doesn't leak which IDs exist.
      if (
        appointment.email.trim().toLowerCase() !==
        body.data.email.trim().toLowerCase()
      ) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }
      if (appointment.paymentStatus === PaymentStatus.PAID) {
        return reply.status(409).send(errorResponse("Appointment is already paid"));
      }

      // Determine price + currency. Falls back to the appointment's recorded
      // amount when the linked Service has been deleted or never priced.
      const amountCents =
        appointment.amountCents ?? appointment.service?.basePriceCents ?? null;
      const currency = (
        appointment.currencyCode ?? appointment.service?.currencyCode ?? "EUR"
      ).toLowerCase();

      if (amountCents == null || amountCents <= 0) {
        return reply
          .status(400)
          .send(errorResponse("Service has no price configured"));
      }

      const stripe = getStripeClient(appointment.countryCode);

      // Idempotency — if a Checkout Session already exists for this
      // appointment and is still openable, reuse its URL instead of
      // creating a duplicate. Stripe sessions expire 24h after creation;
      // we also bail out on terminal session statuses (complete/expired).
      if (appointment.stripeSessionId) {
        try {
          const existing = await stripe.checkout.sessions.retrieve(
            appointment.stripeSessionId,
          );
          if (
            existing.status === "open" &&
            existing.url &&
            (!existing.expires_at || existing.expires_at * 1000 > Date.now())
          ) {
            return okResponse({ url: existing.url, sessionId: existing.id });
          }
        } catch {
          // Stale or invalid session id — fall through and create a new one.
        }
      }
      const baseUrl =
        env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
      const returnBase = body.data.returnTo ?? "/";
      const successUrl = `${baseUrl}${returnBase}?booking=${appointment.id}&payment=ok`;
      const cancelUrl = `${baseUrl}${returnBase}?booking=${appointment.id}&payment=cancelled`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: appointment.email,
        client_reference_id: appointment.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountCents,
              // PRIV-001: never send clinical free-text (appointment.notes) or
              // any PHI to Stripe — this label shows on the customer's receipt
              // and Checkout page. A generic public service label is enough to
              // recognize the charge; the appointment id lives in metadata.
              product_data: buildAppointmentCheckoutProductData(appointment),
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Global Health branding: page language pinned to the appointment's
        // market, plus the trust line above the pay button.
        ...(await checkoutBranding(appointment.countryCode)),
        metadata: {
          appointmentId: appointment.id,
          countryCode: appointment.countryCode,
          consultationType: appointment.consultationType,
        },
      });

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          stripeSessionId: session.id,
          paymentStatus: PaymentStatus.PENDING,
          amountCents,
          currencyCode: currency.toUpperCase(),
        },
      });

      return okResponse({ url: session.url, sessionId: session.id });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create checkout session"));
    }
  });

  /**
   * Sync order payment from Stripe when the webhook did not fire
   * (local dev without `stripe listen`, or transient webhook failure).
   * Safe to call repeatedly — idempotent when already PAID.
   */
  app.post(
    "/api/payments/sync-order",
    // S-023: caller-controlled orderId/stripeSessionId trigger DB + Stripe
    // work with no auth (this also serves guest checkouts, so it can't
    // require a session). Tight, fail-closed per-IP cap instead — the
    // legitimate flow calls this once or twice right after the Stripe
    // redirect back.
    { config: { rateLimit: { max: 10, timeWindow: "1 minute", skipOnError: false } } },
    async (request, reply) => {
    if (!isStripeConfigured()) {
      return paymentsDisabled(reply);
    }
    const body = syncOrderBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("orderId or stripeSessionId is required"));
    }
    try {
      const result = body.data.orderId
        ? await syncOrderPaymentFromStripe(body.data.orderId, app.log)
        : await syncOrderPaymentFromStripeSession(body.data.stripeSessionId!, app.log);
      // S-023: fold the "order not found" case into the same 200 envelope
      // as every other non-ok outcome (NO_SESSION, NOT_PAID, ...) instead
      // of a distinct 404 — both frontend callers (SyncOrderPaymentOnReturn,
      // account/bookings, checkout/success) only branch on result.ok/code,
      // never on HTTP status, so this removes an ID-enumeration signal
      // without changing behavior for real callers.
      return okResponse(result);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not sync order payment"));
    }
    },
  );

  /**
   * Stripe webhook receiver. Verifies the signature against
   * STRIPE_WEBHOOK_SECRET, then processes the events we care about:
   *   - checkout.session.completed (payment_status "paid")  → mark PAID
   *   - checkout.session.completed (payment_status "unpaid") → voucher issued,
   *       order stays PENDING — see handleUnpaidCompletedSession
   *   - checkout.session.async_payment_succeeded → mark PAID
   *   - checkout.session.async_payment_failed    → cancel order / mark FAILED
   *   - checkout.session.expired                 → cancel order (deadline-aware)
   *   - charge.refunded                          → mark REFUNDED
   *
   * `completed` is NOT a payment. Delayed-notification methods (Multibanco,
   * enabled for Portugal) fire it when the voucher is printed and settle days
   * later; only `payment_status` distinguishes the two, and only
   * `async_payment_succeeded` confirms a booking.
   *
   * Note: the body MUST be the raw bytes (not the JSON-parsed object) for
   * signature verification. The content-type parser registered in `app.ts`
   * stashes the raw Buffer on `request.rawBody` whenever the request URL
   * starts with `/api/payments/webhook`, then runs the normal JSON parse
   * so other routes are unaffected. Be careful not to drop the rawBody
   * stash in future refactors — webhook verification depends on it.
   */
  app.post(
    "/api/payments/webhook",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const webhookSecrets = getConfiguredWebhookSecrets();
      if (webhookSecrets.length === 0) {
        return reply
          .status(503)
          .send(errorResponse("Stripe webhook not configured (missing STRIPE_WEBHOOK_SECRET)"));
      }

      const sig = request.headers["stripe-signature"];
      if (typeof sig !== "string" || !sig) {
        return reply.status(400).send(errorResponse("Missing Stripe signature"));
      }

      const rawBody = (request as FastifyRequest & { rawBody?: Buffer | string }).rawBody;
      if (!rawBody) {
        return reply.status(400).send(errorResponse("Empty webhook body"));
      }

      // Multi-account: the event may originate from any of the PT/ES/CZ/IE
      // accounts, each signing with its own secret. Try each configured secret
      // until one verifies — the matching secret identifies the source account.
      // The client used for constructEvent is irrelevant (the signing secret,
      // not the API key, verifies the signature), so the default client is fine.
      const stripe = getStripeClient();
      const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      let event;
      let lastError: unknown;
      for (const secret of webhookSecrets) {
        try {
          event = stripe.webhooks.constructEvent(payload, sig, secret);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!event) {
        app.log.warn({ err: lastError }, "Stripe signature verification failed");
        return reply
          .status(400)
          .send(errorResponse("Invalid Stripe signature"));
      }

      // Idempotency: have we recorded this event already? Stripe retries on
      // 5xx responses, so we must be safe to receive the same event twice.
      try {
        const [seenPayment, seenEvent] = await Promise.all([
          prisma.payment.findUnique({
            where: { stripeEventId: event.id },
            select: { id: true },
          }),
          prisma.processedWebhookEvent.findUnique({
            where: { stripeEventId: event.id },
            select: { id: true },
          }),
        ]);
        if (seenPayment || seenEvent) {
          return okResponse({ received: true, deduped: true });
        }
      } catch (error) {
        app.log.warn({ err: error }, "Webhook dedupe check failed; continuing");
      }

      const eventType = event.type;
      try {
        // ── Subscription events (§25.3) ─────────────────────────
        // Branch recurring-billing events to the subscription handler before
        // the one-off order/appointment logic below. The handler is
        // ordering-tolerant and idempotent (period-keyed grants).
        const minimalEvent = {
          id: event.id,
          type: event.type,
          data: { object: event.data.object as unknown as Record<string, unknown> },
        };
        if (isSubscriptionEvent(minimalEvent)) {
          const subResult = await handleSubscriptionEvent(minimalEvent);
          if (!subResult.handled) {
            // Out-of-order (sub not linked yet) — 500 so Stripe retries.
            return reply
              .status(500)
              .send(errorResponse("Subscription webhook deferred for retry"));
          }
          return okResponse({ received: true, detail: subResult.detail });
        }

        if (
          eventType === "checkout.session.completed" ||
          eventType === "checkout.session.async_payment_succeeded"
        ) {
          // ── Delayed-notification payments (Multibanco) ─────────
          // `completed` means the session finished, NOT that we were paid:
          // Multibanco completes it when the voucher is printed and settles
          // days later via SIBS. `payment_status` is the only proof money
          // moved, so nothing below this line may run without it. The
          // `async_payment_succeeded` redelivery of the same session is what
          // carries "paid" — and it is never gated here.
          const completedSession = event.data.object as WebhookCheckoutSession;
          if (
            !isSettledCheckoutSession({
              eventType,
              paymentStatus: completedSession.payment_status,
            })
          ) {
            await handleUnpaidCompletedSession(completedSession, event.id, app.log);
            return okResponse({ received: true, pending: true });
          }

          // ── Redemption shipping payment (§11) ─────────────────
          const redemptionSession = event.data.object as {
            metadata?: Record<string, string>;
          };
          if (redemptionSession.metadata?.kind === "redemption") {
            const redemptionId = redemptionSession.metadata?.redemptionId;
            if (redemptionId) await commitRedemption(redemptionId);
            return okResponse({ received: true });
          }
          const session = event.data.object as {
            id: string;
            client_reference_id?: string | null;
            payment_intent?: string | null;
            invoice?: string | null;
            amount_total?: number | null;
            currency?: string | null;
            metadata?: Record<string, string>;
          };

          // ── Brazil consent fee (€29) ───────────────────────────
          if (session.metadata?.kind === "brazil_consent") {
            const submissionId =
              session.client_reference_id ?? session.metadata?.submissionId ?? null;
            if (submissionId) {
              const { markBrazilConsentPaid } = await import(
                "../modules/brazil-consent/brazil-consent.service.js"
              );
              await markBrazilConsentPaid(submissionId, session.id);
            }
            return okResponse({ received: true });
          }

          // ── Order branch (cart checkout) ────────────────────────
          if (session.metadata?.kind === "order") {
            const orderId =
              session.client_reference_id ?? session.metadata?.orderId ?? null;
            if (!orderId) {
              app.log.warn({ sessionId: session.id }, "Webhook: order session missing orderId");
              return okResponse({ received: true });
            }

            const result = await completeOrderPaymentFromCheckoutSession(
              orderId,
              {
                id: session.id,
                payment_intent:
                  typeof session.payment_intent === "string" ? session.payment_intent : null,
                invoice:
                  typeof session.invoice === "string" ? session.invoice : null,
                client_reference_id: session.client_reference_id,
                metadata: session.metadata ?? undefined,
              },
              { stripeEventId: event.id, eventType },
              app.log,
            );

            // Credit-reservation commit now happens inside
            // completeOrderPaymentFromCheckoutSession itself (on every call,
            // not just the one that first marks PAID) — see that function's
            // comment for the webhook-vs-sync-order race this closes.
            return okResponse({ received: true, deduped: result.alreadyPaid || undefined });
          }

          // ── Appointment branch (legacy single-item booking) ─────
          const appointmentId =
            session.client_reference_id ??
            session.metadata?.appointmentId ??
            null;
          if (!appointmentId) {
            app.log.warn({ sessionId: session.id }, "Webhook: missing appointmentId");
            return okResponse({ received: true });
          }
          await prisma.$transaction(async (tx) => {
            await tx.appointment.update({
              where: { id: appointmentId },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paidAt: new Date(),
                stripePaymentIntentId:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : null,
                amountCents: session.amount_total ?? undefined,
                currencyCode: session.currency
                  ? session.currency.toUpperCase()
                  : undefined,
              },
            });
            await tx.payment.create({
              data: {
                appointmentId,
                stripeEventId: event.id,
                stripeSessionId: session.id,
                stripePaymentIntentId:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : null,
                status: PaymentStatus.PAID,
                amountCents: session.amount_total ?? 0,
                currencyCode: session.currency?.toUpperCase() ?? "EUR",
                rawEventType: eventType,
                // Cast to satisfy Prisma Json input — payloads vary per event.
                rawPayload: event.data.object as unknown as object,
              },
            });
          });
        } else if (eventType === "checkout.session.expired") {
          // Stripe expires unpaid Checkout Sessions after 24h. Release
          // any HELD consultation slots in the associated Order so
          // other patients can claim them. Mark order CANCELLED.
          const session = event.data.object as {
            id: string;
            client_reference_id?: string | null;
            metadata?: Record<string, string>;
          };
          if (session.metadata?.kind === "redemption") {
            const redemptionId = session.metadata?.redemptionId;
            if (redemptionId) await releaseRedemption(redemptionId);
            return okResponse({ received: true });
          }
          if (session.metadata?.kind === "order") {
            const orderId =
              session.client_reference_id ?? session.metadata?.orderId ?? null;
            if (orderId) {
              // Stripe expires an unpaid Checkout Session 24h after it was
              // created — but a pre-payment order's real payment deadline
              // (`paymentDueAt`) is usually DAYS later, so a session expiry is
              // not on its own a reason to cancel. See the option's doc.
              await abandonUnpaidOrder(orderId, app.log, {
                respectPrePaymentDeadline: true,
                reason: "session expiry",
              });
            }
            return okResponse({ received: true });
          }
          // Non-order expirations fall through to the legacy path below
          return okResponse({ received: true });
        } else if (eventType === "checkout.session.async_payment_failed") {
          const session = event.data.object as {
            id: string;
            client_reference_id?: string | null;
            metadata?: Record<string, string>;
          };
          // Redemption shipping payment failed → release the held wellness
          // credits + stock immediately instead of waiting for the 24h expiry.
          if (session.metadata?.kind === "redemption") {
            const redemptionId = session.metadata?.redemptionId;
            if (redemptionId) await releaseRedemption(redemptionId);
            return okResponse({ received: true });
          }

          // ── Order branch (cart checkout) ───────────────────────
          // A Multibanco voucher that expired unpaid lands here. Without this
          // branch the order id fell through to the legacy appointment update
          // below, which threw "record not found" → 500 → Stripe retried the
          // event forever while the order kept its slot. Cancel outright: the
          // voucher is dead, so unlike a session expiry there is no later
          // deadline worth deferring to.
          if (session.metadata?.kind === "order") {
            const orderId =
              session.client_reference_id ?? session.metadata?.orderId ?? null;
            if (orderId) {
              await abandonUnpaidOrder(orderId, app.log, {
                respectPrePaymentDeadline: false,
                reason: "async payment failed",
              });
            } else {
              app.log.warn(
                { sessionId: session.id, eventId: event.id },
                "async_payment_failed on an order session with no orderId",
              );
            }
            return okResponse({ received: true });
          }

          const appointmentId = session.client_reference_id ?? null;
          // No appointmentId → we can't link a Payment row to anything
          // meaningful. Previously we wrote `appointmentId: ""` which
          // either FK-violated or stranded an orphan ledger entry.
          // Ack the event to Stripe (no retries needed) and log so ops
          // can investigate.
          if (!appointmentId) {
            app.log.warn(
              { sessionId: session.id, eventId: event.id },
              "async_payment_failed without appointmentId — skipping Payment row",
            );
            return okResponse({ received: true });
          }
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
          await prisma.payment.create({
            data: {
              appointmentId,
              stripeEventId: event.id,
              stripeSessionId: session.id,
              status: PaymentStatus.FAILED,
              amountCents: 0,
              currencyCode: "EUR",
              rawEventType: eventType,
              rawPayload: event.data.object as unknown as object,
            },
          }).catch(() => undefined);
        } else if (eventType === "charge.refunded") {
          // Only NON-subscription charges reach here (isSubscriptionEvent routes
          // invoice-backed charges to the subscription clawback handler). This
          // is a one-off appointment or cart-order refund (B2).
          const charge = event.data.object as {
            payment_intent?: string | null;
            amount_refunded?: number | null;
            currency?: string | null;
          };
          if (charge.payment_intent) {
            // Legacy single-item appointment booking.
            const appt = await prisma.appointment.findUnique({
              where: { stripePaymentIntentId: charge.payment_intent },
              select: { id: true },
            });
            if (appt) {
              await prisma.$transaction([
                prisma.appointment.update({
                  where: { id: appt.id },
                  data: { paymentStatus: PaymentStatus.REFUNDED },
                }),
                prisma.payment.create({
                  data: {
                    appointmentId: appt.id,
                    stripeEventId: event.id,
                    stripePaymentIntentId: charge.payment_intent,
                    status: PaymentStatus.REFUNDED,
                    amountCents: charge.amount_refunded ?? 0,
                    currencyCode: charge.currency?.toUpperCase() ?? "EUR",
                    rawEventType: eventType,
                    rawPayload: event.data.object as unknown as object,
                  },
                }),
              ]);
            } else {
              // Cart-order refund — Orders carry no Payment row (no appointmentId),
              // so flip the Order to REFUNDED directly. Idempotent (skips if
              // already REFUNDED). Subscription ids are excluded upstream, so this
              // can never touch a UserSubscription.
              const order = await prisma.order.findUnique({
                where: { stripePaymentIntentId: charge.payment_intent },
                select: { id: true, status: true },
              });
              if (order && order.status !== OrderStatus.REFUNDED) {
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    status: OrderStatus.REFUNDED,
                    paymentStatus: PaymentStatus.REFUNDED,
                  },
                });
                // Cancel the consultation appointments (release slots + drop
                // calendar events). Idempotent — no-op if already cancelled.
                await cancelOrderAppointments(order.id).catch((err) => {
                  app.log.error({ err, orderId: order.id }, "Cancel order appointments on refund failed");
                });
                // Credit note + refund email/WhatsApp. Idempotent + fire-and-forget
                // (the admin refund endpoint may have already sent these).
                void sendOrderRefundNotifications(order.id).catch((err) => {
                  app.log.error({ err, orderId: order.id }, "Refund notifications failed");
                });
                // NOTE: in commission markets the doctor's share is paid by bank
                // transfer outside Stripe, so there is nothing to claw back here.
                // A refund issued AFTER the doctor was already paid has to be
                // recovered manually — the admin commission-payout report only
                // counts non-refunded orders, so it self-corrects for anything
                // refunded before that month's run.
              }
            }
          }
        }
        // Other events: acknowledge so Stripe stops retrying.
        return okResponse({ received: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error({ err: error, eventType }, "Webhook processing failed");
        // Realtime ops alert (§39) — a dropped subscription event can skip a
        // grant or a cancel; never let it fail silently.
        void emitOpsAlert({
          severity: "critical",
          title: "Payment webhook processing failed",
          detail: `${eventType}: ${error instanceof Error ? error.message : String(error)}`,
        });
        // Return 500 so Stripe retries — better than silently dropping the event.
        return reply.status(500).send(errorResponse("Webhook processing failed"));
      }
    },
  );
};

export default paymentsRoute;
