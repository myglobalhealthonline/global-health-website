import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyClinicalReadAccess } from "../utils/doctor-auth.js";
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
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: {
            id: request.params.id,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
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
        // Bucket per-currency so mixed-currency line items can't
        // sneak into a single arithmetic-meaningless total. Frontend
        // renders each bucket separately. `lineTotalCents` is kept as
        // a legacy single-bucket fallback for the dominant currency
        // (Appointment.currencyCode, or whatever the first line uses)
        // so older callers don't crash on missing fields.
        const lineTotalsByCurrency: Record<string, number> = {};
        for (const line of lines) {
          if (line.unitPriceCents == null) continue;
          const code = line.currencyCode ?? appt.currencyCode ?? "—";
          lineTotalsByCurrency[code] =
            (lineTotalsByCurrency[code] ?? 0) +
            line.unitPriceCents * line.quantity;
        }
        const fallbackCurrency =
          appt.currencyCode ??
          lines.find((l) => l.currencyCode)?.currencyCode ??
          null;
        const lineTotalCents =
          fallbackCurrency && lineTotalsByCurrency[fallbackCurrency] !== undefined
            ? lineTotalsByCurrency[fallbackCurrency]
            : Object.values(lineTotalsByCurrency).reduce(
                (sum, v) => sum + v,
                0,
              );
        return okResponse({
          invoice: {
            paymentStatus: appt.paymentStatus,
            amountCents: appt.amountCents,
            currencyCode: appt.currencyCode,
            paidAt: appt.paidAt?.toISOString() ?? null,
            stripeSessionId: appt.stripeSessionId,
            lines,
            lineTotalCents,
            lineTotalsByCurrency,
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
