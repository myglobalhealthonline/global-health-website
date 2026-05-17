import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   GET /api/doctor/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Doctor-scoped aggregates over the date range:
 *   • appointments by status
 *   • appointments by consultation type
 *   • signed consults count
 *   • completed appointments revenue (sum of paid Payment rows)
 *   • distinct-patient count
 *
 * Defaults to "last 30 days" when no range supplied. Caller can ship
 * the JSON to a client-side CSV export — the endpoint stays JSON-only
 * so the same numbers feed both the dashboard tiles and the export.
 */

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const doctorReportsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/reports", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    const now = new Date();
    const toUtc = parsed.data.to
      ? new Date(`${parsed.data.to}T23:59:59.999Z`)
      : now;
    const fromUtc = parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00.000Z`)
      : new Date(toUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (toUtc < fromUtc) {
      return reply.status(400).send(errorResponse("`to` must be after `from`"));
    }

    try {
      const range = { gte: fromUtc, lte: toUtc };

      const [byStatus, byType, signedCount, distinctPatientRows, paidPayments] =
        await Promise.all([
          prisma.appointment.groupBy({
            by: ["status"],
            where: { doctorId: auth.doctorId, createdAt: range },
            _count: { _all: true },
          }),
          prisma.appointment.groupBy({
            by: ["consultationType"],
            where: { doctorId: auth.doctorId, createdAt: range },
            _count: { _all: true },
          }),
          prisma.consultation.count({
            where: {
              doctorId: auth.doctorId,
              status: "SIGNED",
              signedAt: range,
            },
          }),
          prisma.appointment.findMany({
            where: { doctorId: auth.doctorId, createdAt: range },
            select: { email: true },
          }),
          prisma.payment.findMany({
            where: {
              appointment: { doctorId: auth.doctorId },
              status: "PAID",
              createdAt: range,
            },
            select: { amountCents: true, currencyCode: true },
          }),
        ]);

      const distinctPatients = new Set(
        distinctPatientRows.map((r) => r.email.toLowerCase()),
      ).size;

      const revenueByCurrency: Record<string, number> = {};
      for (const p of paidPayments) {
        const key = p.currencyCode ?? "—";
        revenueByCurrency[key] = (revenueByCurrency[key] ?? 0) + p.amountCents;
      }

      return okResponse({
        range: {
          from: fromUtc.toISOString(),
          to: toUtc.toISOString(),
        },
        appointments: {
          total: byStatus.reduce((sum, r) => sum + r._count._all, 0),
          byStatus: byStatus.map((r) => ({
            status: r.status,
            count: r._count._all,
          })),
          byConsultationType: byType.map((r) => ({
            consultationType: r.consultationType,
            count: r._count._all,
          })),
        },
        signedConsults: signedCount,
        distinctPatients,
        revenueByCurrency,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load reports"));
    }
  });
};

export default doctorReportsRoute;
