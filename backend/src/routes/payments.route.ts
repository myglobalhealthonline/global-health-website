import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";
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
import { completeOrderPaymentFromCheckoutSession, syncOrderPaymentFromStripe, syncOrderPaymentFromStripeSession } from "../modules/orders/complete-order-payment.service.js";
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
import { sendOrderRefundNotifications } from "../modules/automation/refund-notifications.service.js";
import { cancelOrderAppointments } from "../modules/appointments/appointments.service.js";
import { sendPrePaymentCancelledNotifications } from "../modules/automation/pre-payment-flow.service.js";

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
              product_data: {
                name: appointment.service?.name ?? appointment.consultationType,
                description: appointment.notes?.slice(0, 280) ?? undefined,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
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
   *   - checkout.session.completed       → mark appointment PAID
   *   - checkout.session.async_payment_succeeded → same
   *   - checkout.session.async_payment_failed   → mark FAILED
   *   - charge.refunded                  → mark REFUNDED
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
              const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true },
              });
              if (order && order.status === "PENDING") {
                const heldSlotIds = order.items
                  .map((i) => i.timeSlotId)
                  .filter((id): id is string => Boolean(id));
                await prisma.order.update({
                  where: { id: orderId },
                  data: { status: "CANCELLED", paymentStatus: PaymentStatus.FAILED },
                });
                if (heldSlotIds.length > 0) {
                  await releaseSlotsToBaseGrid(heldSlotIds);
                }
                // Release any subscription credit reservations on the
                // abandoned order (RESERVED → RELEASED, credit restored).
                await releaseOrderCreditReservations(orderId).catch((err) => {
                  app.log.error({ err, orderId }, "Release order credit reservations failed");
                });
                // Cancel the consultation appointment(s) — release BOOKED slots
                // + drop the events off the admin/doctor calendars.
                await cancelOrderAppointments(orderId).catch((err) => {
                  app.log.error({ err, orderId }, "Cancel appointments on session expiry failed");
                });
                // Notify the patient (+ doctor) that the unpaid reservation was
                // cancelled — the SAME cancelled message the deadline sweep sends,
                // so a silent session-expiry cancel never happens again.
                await sendPrePaymentCancelledNotifications(orderId).catch((err) => {
                  app.log.error({ err, orderId }, "Cancelled notification on session expiry failed");
                });
              }
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
