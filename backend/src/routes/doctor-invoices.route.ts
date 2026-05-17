import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Read-only invoice view for the doctor portal.
 *
 *   GET /api/doctor/appointments/:id/invoice
 *
 * Composes the existing Appointment.paymentStatus / amount / Payment
 * ledger with the per-consult `ConsultationService` line items so the
 * doctor can see what the patient was billed without leaving the
 * appointment workspace. Admin still issues / refunds invoices —
 * doctor view is informational.
 */

const doctorInvoicesRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/invoice",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: {
            id: true,
            paymentStatus: true,
            amountCents: true,
            currencyCode: true,
            paidAt: true,
            stripeSessionId: true,
            payments: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                amountCents: true,
                currencyCode: true,
                status: true,
                createdAt: true,
              },
            },
            consultation: {
              select: {
                id: true,
                servicesUsed: {
                  orderBy: { createdAt: "asc" },
                  include: {
                    service: { select: { name: true } },
                  },
                },
              },
            },
          },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const lines = (appt.consultation?.servicesUsed ?? []).map((r) => ({
          id: r.id,
          label: r.customLabel ?? r.service?.name ?? "Service",
          quantity: r.quantity,
          unitPriceCents: r.unitPriceCents,
          currencyCode: r.currencyCode,
        }));
        const lineTotalCents = lines.reduce((sum, line) => {
          if (line.unitPriceCents == null) return sum;
          return sum + line.unitPriceCents * line.quantity;
        }, 0);
        return okResponse({
          invoice: {
            paymentStatus: appt.paymentStatus,
            amountCents: appt.amountCents,
            currencyCode: appt.currencyCode,
            paidAt: appt.paidAt?.toISOString() ?? null,
            stripeSessionId: appt.stripeSessionId,
            lines,
            lineTotalCents,
            payments: appt.payments.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
            })),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load invoice"));
      }
    },
  );
};

export default doctorInvoicesRoute;
