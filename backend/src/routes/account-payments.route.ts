import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";
import { getReceiptUrl } from "../services/stripe-receipt.service.js";

/**
 * Public-facing payment receipts list for the signed-in patient.
 *
 * Reads from the `Payment` ledger (Stripe webhook events, one row per
 * event), filtered by the appointments the requesting user owns. The
 * ledger is append-only so a single appointment can have multiple
 * rows (e.g. `checkout.session.completed` + `charge.refunded`).
 *
 * For UX we surface the latest non-refund event per appointment as a
 * "receipt" — historical events are still in the DB if support needs
 * to reconstruct the full audit trail.
 */
const accountPaymentsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/account/payments", async (request, reply) => {
    let authUser: SafeUser | null = null;
    try {
      authUser = await resolveOptionalAuthUser(request);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected authentication error"));
    }
    if (!authUser) {
      return reply.status(401).send(errorResponse("Not authenticated"));
    }
    if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
      return reply.status(403).send(errorResponse("Forbidden"));
    }

    try {
      const where = { appointment: { userId: authUser.id } };
      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            amountCents: true,
            currencyCode: true,
            rawEventType: true,
            stripePaymentIntentId: true,
            createdAt: true,
            appointment: {
              select: {
                id: true,
                consultationType: true,
                countryCode: true,
                createdAt: true,
                service: { select: { name: true } },
                doctor: { select: { fullName: true } },
              },
            },
          },
          take: 100,
        }),
      ]);

      const items = payments.map((p) => ({
        id: p.id,
        appointmentId: p.appointment.id,
        consultationType: p.appointment.consultationType,
        countryCode: p.appointment.countryCode,
        serviceName: p.appointment.service?.name ?? null,
        doctorName: p.appointment.doctor?.fullName ?? null,
        status: p.status,
        amountCents: p.amountCents,
        currencyCode: p.currencyCode,
        eventType: p.rawEventType,
        bookedAt: p.appointment.createdAt.toISOString(),
        paidAt: p.createdAt.toISOString(),
        stripePaymentIntentId: p.stripePaymentIntentId ?? null,
      }));

      return okResponse({ items, total, truncated: total > items.length });
    } catch (error) {
      const normalized = normalizeDbError(error, "Could not load payment history");
      if (normalized instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(normalized.message));
      }
      app.log.error(normalized);
      return reply.status(500).send(errorResponse("Could not load payment history"));
    }
  });
  // ─── Receipt URL (on-demand per payment) ─────────────────────────────────

  app.get<{ Params: { id: string } }>(
    "/api/account/payments/:id/receipt-url",
    async (request, reply) => {
      let authUser: SafeUser | null = null;
      try {
        authUser = await resolveOptionalAuthUser(request);
      } catch {
        return reply.status(401).send(errorResponse("Not authenticated"));
      }
      if (!authUser) return reply.status(401).send(errorResponse("Not authenticated"));
      if (authUser.role !== "PATIENT" && authUser.role !== "ADMIN") {
        return reply.status(403).send(errorResponse("Forbidden"));
      }

      try {
        const payment = await prisma.payment.findFirst({
          where: {
            id: request.params.id,
            appointment: { userId: authUser.id },
          },
          select: {
            stripePaymentIntentId: true,
            appointment: { select: { countryCode: true } },
          },
        });
        if (!payment) return reply.status(404).send(errorResponse("Payment not found"));

        const url = await getReceiptUrl(
          payment.stripePaymentIntentId ?? null,
          payment.appointment?.countryCode ?? null,
        );
        return okResponse({ url });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not fetch receipt"));
      }
    },
  );
};

export default accountPaymentsRoute;
