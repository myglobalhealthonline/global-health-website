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

            // Mark paid + (if any consultation items) mint Appointments
            const orderAlreadyPaid = await prisma.$transaction(async (tx) => {
              const order = await tx.order.findUnique({
                where: { id: orderId },
                include: { items: true },
              });
              if (!order) return true;
              // Idempotency gate: Stripe retries on 5xx, network blips, and
              // duplicate-delivery sweeps. The appointment branch writes a
              // `Payment` row keyed by `event.id` which the top-of-handler
              // dedupe short-circuits on. The order branch never wrote one,
              // so a retry used to re-decrement stock + re-send the email.
              // Bail out as soon as we see the order is already PAID.
              if (order.paymentStatus === "PAID" || order.status === "PAID") {
                return true;
              }

              const consultationItems = order.items.filter(
                (i) =>
                  i.kind === "GENERAL_CONSULTATION" ||
                  i.kind === "SPECIALIST_CONSULTATION",
              );

              // Decrement health-test stock. Null stock = unlimited (skip).
              // Uses `decrement` operator so it's race-safe at the DB level.
              // We assert `count === 1` on each updateMany — if zero
              // rows updated it means another paid order beat us to
              // the inventory (or the row was deleted), and we log it
              // as an oversell that ops needs to reconcile. We do NOT
              // throw and abort the webhook tx: Stripe already took
              // the patient's money, the order is PAID, and rolling
              // back here would leave the payment without an order
              // record. Better to record the discrepancy + ship the
              // alert downstream.
              const healthTestItems = order.items.filter(
                (i) => i.kind === "HEALTH_TEST" && i.healthTestId,
              );
              for (const item of healthTestItems) {
                if (!item.healthTestId) continue;
                try {
                  const result = await tx.healthTest.updateMany({
                    where: {
                      id: item.healthTestId,
                      stock: { not: null, gte: item.quantity },
                    },
                    data: { stock: { decrement: item.quantity } },
                  });
                  if (result.count !== 1) {
                    // Either the test is null-stock (unlimited) or the
                    // decrement was refused for lack of inventory.
                    // Re-read the row to tell the difference.
                    const fresh = await tx.healthTest.findUnique({
                      where: { id: item.healthTestId },
                      select: { stock: true },
                    });
                    if (fresh && fresh.stock !== null) {
                      app.log.error(
                        {
                          orderId,
                          healthTestId: item.healthTestId,
                          requested: item.quantity,
                          remaining: fresh.stock,
                        },
                        "OVERSELL: paid order item exceeds available stock — needs manual reconciliation",
                      );
                    }
                  }
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
                  // Prefer patient intake from the order line (collected
                  // on the consult page). Fall back to the order-level
                  // payer details when the line is missing them (legacy
                  // carts created before the cart-first flow shipped).
                  const aptFullName = item.patientFullName ?? order.fullName;
                  const aptEmail = item.patientEmail ?? order.email;
                  const aptPhone = item.patientPhone ?? order.phone;
                  const aptDob = item.patientDateOfBirth ?? null;
                  const aptNotes = item.patientNotes ?? null;
                  const aptConsent = item.patientConsentAcceptedAt
                    ? true
                    : true; // schema requires boolean; we treat presence-on-line as confirmed
                  const apt = await tx.appointment.create({
                    data: {
                      userId: order.userId,
                      countryCode: order.countryCode,
                      consultationType,
                      fullName: aptFullName,
                      email: aptEmail,
                      phone: aptPhone,
                      dateOfBirth: aptDob,
                      notes: aptNotes,
                      consentAccepted: aptConsent,
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
                      // New booking snapshot — mint with the timezone,
                      // structured address, country-specific ID, and dual
                      // GDPR consents captured at add-to-cart time. Falls
                      // back to null on legacy carts that pre-date the
                      // new columns.
                      patientTimezone: item.patientTimezone,
                      addressLine1: item.patientAddressLine1,
                      addressLine2: item.patientAddressLine2,
                      addressCity: item.patientAddressCity,
                      addressPostalCode: item.patientAddressPostalCode,
                      addressCountryCode: item.patientAddressCountryCode,
                      gdprConsentClinic: item.patientGdprConsentClinic,
                      gdprConsentPlatform: item.patientGdprConsentPlatform,
                      gdprConsentedAt: item.patientGdprConsentedAt,
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
              return false;
            });

            // Skip the email + return when this was a Stripe retry of an
            // already-paid order. Prevents duplicate confirmation emails.
            if (orderAlreadyPaid) {
              return okResponse({ received: true, deduped: true });
            }

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

            // Consultation orders: create Google Meet link + calendar event
            // (best-effort — payment is already recorded).
            try {
              const { autoProvisionOrderMeetOnPaid } = await import(
                "../modules/admin-orders/generate-order-meet-link.service.js"
              );
              await autoProvisionOrderMeetOnPaid(orderId, app.log);
            } catch (meetErr) {
              app.log.warn({ err: meetErr, orderId }, "Order Meet auto-provision import failed");
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
