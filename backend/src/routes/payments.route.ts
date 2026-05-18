import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  getStripeClient,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from "../lib/stripe/client.js";
import { env } from "../config/env.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { sendOrderConfirmationEmail } from "../lib/email/templates.js";

const createCheckoutBodySchema = z.object({
  appointmentId: z.string().trim().min(8).max(40),
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

      const stripe = getStripeClient();

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
      if (!isStripeWebhookConfigured()) {
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

      const stripe = getStripeClient();
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"),
          sig,
          env.STRIPE_WEBHOOK_SECRET!,
        );
      } catch (error) {
        app.log.warn({ err: error }, "Stripe signature verification failed");
        return reply
          .status(400)
          .send(errorResponse("Invalid Stripe signature"));
      }

      // Idempotency: have we recorded this event already? Stripe retries on
      // 5xx responses, so we must be safe to receive the same event twice.
      try {
        const seen = await prisma.payment.findUnique({
          where: { stripeEventId: event.id },
          select: { id: true },
        });
        if (seen) {
          return okResponse({ received: true, deduped: true });
        }
      } catch (error) {
        app.log.warn({ err: error }, "Webhook dedupe check failed; continuing");
      }

      const eventType = event.type;
      try {
        if (
          eventType === "checkout.session.completed" ||
          eventType === "checkout.session.async_payment_succeeded"
        ) {
          const session = event.data.object as {
            id: string;
            client_reference_id?: string | null;
            payment_intent?: string | null;
            amount_total?: number | null;
            currency?: string | null;
            metadata?: Record<string, string>;
          };

          // ── Order branch (cart checkout) ────────────────────────
          if (session.metadata?.kind === "order") {
            const orderId =
              session.client_reference_id ?? session.metadata?.orderId ?? null;
            if (!orderId) {
              app.log.warn({ sessionId: session.id }, "Webhook: order session missing orderId");
              return okResponse({ received: true });
            }

            // Mark paid + (if any consultation items) mint Appointments
            await prisma.$transaction(async (tx) => {
              const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
              });
              if (!order) return;

              const consultationItems = order.items.filter(
                (i) =>
                  i.kind === "GENERAL_CONSULTATION" ||
                  i.kind === "SPECIALIST_CONSULTATION",
              );

              // Decrement health-test stock. Null stock = unlimited (skip).
              // Uses `decrement` operator so it's race-safe at the DB level.
              const healthTestItems = order.items.filter(
                (i) => i.kind === "HEALTH_TEST" && i.healthTestId,
              );
              for (const item of healthTestItems) {
                if (!item.healthTestId) continue;
                try {
                  await tx.healthTest.updateMany({
                    where: {
                      id: item.healthTestId,
                      stock: { not: null, gte: item.quantity },
                    },
                    data: { stock: { decrement: item.quantity } },
                  });
                } catch (decErr) {
                  app.log.warn(
                    { err: decErr, healthTestId: item.healthTestId, qty: item.quantity },
                    "Stock decrement failed",
                  );
                }
              }

              const appointmentIds: string[] = [];
              for (const item of consultationItems) {
                if (!item.timeSlotId || !item.doctorId || !item.serviceId) {
                  app.log.warn(
                    { orderId, itemId: item.id },
                    "Consultation order item missing slot/doctor/service",
                  );
                  continue;
                }
                // Claim slot (atomic) — accept HELD (cart reservation)
                // or OPEN (defensive fallback). Skip if already BOOKED
                // or BLOCKED so we don't overwrite real bookings.
                try {
                  const claim = await tx.doctorTimeSlot.updateMany({
                    where: {
                      id: item.timeSlotId,
                      status: { in: ["HELD", "OPEN"] },
                    },
                    data: { status: "BOOKED" },
                  });
                  if (claim.count === 0) {
                    app.log.warn(
                      { orderId, itemId: item.id, slotId: item.timeSlotId },
                      "Slot already claimed by someone else — appointment skipped",
                    );
                    continue;
                  }
                  const slot = await tx.doctorTimeSlot.findUniqueOrThrow({
                    where: { id: item.timeSlotId },
                  });
                  const consultationType =
                    item.kind === "SPECIALIST_CONSULTATION" ? "specialist" : "general";
                  const apt = await tx.appointment.create({
                    data: {
                      userId: order.userId,
                      countryCode: order.countryCode,
                      consultationType,
                      fullName: order.fullName,
                      email: order.email,
                      phone: order.phone,
                      consentAccepted: true,
                      status: "REQUEST_RECEIVED",
                      serviceId: item.serviceId,
                      doctorId: item.doctorId,
                      timeSlotId: item.timeSlotId,
                      scheduledAt: slot.startAt,
                      amountCents: item.unitPriceCents,
                      currencyCode: order.currencyCode,
                      paymentStatus: "PAID",
                      paidAt: new Date(),
                      consultationMode: "ONLINE",
                    },
                  });
                  await tx.orderItem.update({
                    where: { id: item.id },
                    data: { appointmentId: apt.id },
                  });
                  appointmentIds.push(apt.id);
                } catch (err) {
                  app.log.error(
                    { err, orderId, itemId: item.id },
                    "Failed to mint appointment for consultation item",
                  );
                }
              }

              await tx.order.update({
                where: { id: orderId },
                data: {
                  status: "PAID",
                  paymentStatus: "PAID",
                  paidAt: new Date(),
                  stripePaymentIntentId:
                    typeof session.payment_intent === "string"
                      ? session.payment_intent
                      : null,
                  appointmentIds,
                },
              });
            });

            // Send order confirmation email (best-effort, non-blocking)
            try {
              const paidOrder = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true },
              });
              if (paidOrder) {
                const currency = paidOrder.currencyCode || "EUR";
                const fmt = (cents: number) => {
                  const code = currency.toUpperCase();
                  const symbol =
                    code === "EUR" ? "€" : code === "CZK" ? "Kč " : code === "BRL" ? "R$" : `${code} `;
                  return `${symbol}${(cents / 100).toFixed(2)}`;
                };
                await sendOrderConfirmationEmail({
                  to: paidOrder.email,
                  fullName: paidOrder.fullName,
                  orderId: paidOrder.id,
                  totalLabel: fmt(paidOrder.totalCents),
                  items: paidOrder.items.map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    lineLabel: fmt(i.lineTotalCents),
                  })),
                  shipAddress: paidOrder.shipName
                    ? {
                        name: paidOrder.shipName,
                        line1: paidOrder.shipLine1 ?? "",
                        line2: paidOrder.shipLine2,
                        city: paidOrder.shipCity ?? "",
                        postalCode: paidOrder.shipPostalCode ?? "",
                        countryCode: paidOrder.shipCountryCode ?? "",
                      }
                    : null,
                });
              }
            } catch (emailErr) {
              app.log.warn({ err: emailErr, orderId }, "Order confirmation email failed");
            }

            return okResponse({ received: true });
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
                await prisma.$transaction([
                  prisma.order.update({
                    where: { id: orderId },
                    data: { status: "CANCELLED" },
                  }),
                  ...(heldSlotIds.length > 0
                    ? [
                        prisma.doctorTimeSlot.updateMany({
                          where: { id: { in: heldSlotIds }, status: "HELD" },
                          data: { status: "OPEN" },
                        }),
                      ]
                    : []),
                ]);
              }
            }
            return okResponse({ received: true });
          }
          // Non-order expirations fall through to the legacy path below
          return okResponse({ received: true });
        } else if (eventType === "checkout.session.async_payment_failed") {
          const session = event.data.object as { id: string; client_reference_id?: string | null };
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
          const charge = event.data.object as {
            payment_intent?: string | null;
            amount_refunded?: number | null;
            currency?: string | null;
          };
          if (charge.payment_intent) {
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
        // Return 500 so Stripe retries — better than silently dropping the event.
        return reply.status(500).send(errorResponse("Webhook processing failed"));
      }
    },
  );
};

export default paymentsRoute;
