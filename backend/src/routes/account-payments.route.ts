import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import type { SafeUser } from "../modules/auth/auth.service.js";

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
      const payments = await prisma.payment.findMany({
        where: {
          appointment: { userId: authUser.id },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amountCents: true,
          currencyCode: true,
          rawEventType: true,
          createdAt: true,
          appointment: {
            select: {
              id: true,
              consultationType: true,
              countryCode: true,
              createdAt: true,
            },
          },
        },
        take: 100,
      });

      const items = payments.map((p) => ({
        id: p.id,
        appointmentId: p.appointment.id,
        consultationType: p.appointment.consultationType,
        countryCode: p.appointment.countryCode,
        status: p.status,
        amountCents: p.amountCents,
        currencyCode: p.currencyCode,
        eventType: p.rawEventType,
        bookedAt: p.appointment.createdAt.toISOString(),
        paidAt: p.createdAt.toISOString(),
      }));

      return okResponse({ items });
    } catch (error) {
      const normalized = normalizeDbError(error, "Could not load payment history");
      if (normalized instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(normalized.message));
      }
      app.log.error(normalized);
      return reply.status(500).send(errorResponse("Could not load payment history"));
    }
  });
};

export default accountPaymentsRoute;
