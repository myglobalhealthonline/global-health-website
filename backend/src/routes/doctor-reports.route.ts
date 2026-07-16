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
  countryCode: z.string().trim().min(2).max(8).optional(),
  consultationType: z.string().trim().min(1).max(64).optional(),
  paymentStatus: z
    .enum(["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"])
    .optional(),
  status: z
    .enum([
      "REQUEST_RECEIVED",
      "UNDER_REVIEW",
      "CONTACTED",
      "COMPLETED",
      "CANCELLED",
    ])
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
      const apptFilter = {
        doctorId: auth.doctorId,
        createdAt: range,
        ...(parsed.data.countryCode ? { countryCode: parsed.data.countryCode } : {}),
        ...(parsed.data.consultationType
          ? { consultationType: parsed.data.consultationType }
          : {}),
        ...(parsed.data.paymentStatus
          ? { paymentStatus: parsed.data.paymentStatus }
          : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      };

      const [
        byStatus,
        byType,
        signedCount,
        followUpCount,
        distinctPatientGroups,
        paidAppointments,
      ] = await Promise.all([
          prisma.appointment.groupBy({
            by: ["status"],
            where: apptFilter,
            _count: { _all: true },
          }),
          prisma.appointment.groupBy({
            by: ["consultationType"],
            where: apptFilter,
            _count: { _all: true },
          }),
          prisma.consultation.count({
            where: {
              doctorId: auth.doctorId,
              status: "SIGNED",
              signedAt: range,
            },
          }),
          prisma.appointment.count({
            where: {
              ...apptFilter,
              followUpFromAppointmentId: { not: null },
            },
          }),
          // Distinct-patient count via groupBy — bounded, instead of loading
          // every appointment email into memory.
          prisma.appointment.groupBy({
            by: ["email"],
            where: apptFilter,
          }),
          // Doctor revenue = admin-set payout (ServiceDoctor.doctorAmountCents),
          // NOT the patient's gross price. Fetch paid appointments for this
          // doctor in range that reference a catalogue service; payouts are
          // looked up + summed below.
          prisma.appointment.findMany({
            where: {
              doctorId: auth.doctorId,
              paymentStatus: "PAID",
              createdAt: range,
              serviceId: { not: null },
              ...(parsed.data.countryCode
                ? { countryCode: parsed.data.countryCode }
                : {}),
              ...(parsed.data.consultationType
                ? { consultationType: parsed.data.consultationType }
                : {}),
            },
            select: { serviceId: true, currencyCode: true },
          }),
        ]);

      const distinctPatients = distinctPatientGroups.length;

      // Live lookup of the payout per (doctor, service), then sum by currency.
      // Appointments whose service has no payout set are skipped.
      const revenueServiceIds = Array.from(
        new Set(
          paidAppointments
            .map((a) => a.serviceId)
            .filter((id): id is string => !!id),
        ),
      );
      const payoutByServiceId = new Map<string, number | null>();
      if (revenueServiceIds.length > 0) {
        const payouts = await prisma.serviceDoctor.findMany({
          where: { doctorId: auth.doctorId, serviceId: { in: revenueServiceIds } },
          select: { serviceId: true, doctorAmountCents: true },
        });
        for (const p of payouts) {
          payoutByServiceId.set(p.serviceId, p.doctorAmountCents);
        }
      }

      const revenueByCurrency: Record<string, number> = {};
      for (const appt of paidAppointments) {
        if (!appt.serviceId) continue;
        const payout = payoutByServiceId.get(appt.serviceId);
        if (payout == null) continue;
        const key = appt.currencyCode ?? "—";
        revenueByCurrency[key] = (revenueByCurrency[key] ?? 0) + payout;
      }

      return okResponse({
        range: {
          from: fromUtc.toISOString(),
          to: toUtc.toISOString(),
        },
        filters: {
          countryCode: parsed.data.countryCode ?? null,
          consultationType: parsed.data.consultationType ?? null,
          paymentStatus: parsed.data.paymentStatus ?? null,
          status: parsed.data.status ?? null,
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
        followUps: followUpCount,
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
