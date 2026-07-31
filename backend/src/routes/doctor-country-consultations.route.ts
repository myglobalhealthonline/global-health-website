import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveDirectorCountryScope } from "../modules/doctors/country-director-scope.js";
import { verifyCountryDirectorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   GET /api/doctor/country-consultations
 *
 * Country-director surface: every consultation booked in the markets the caller
 * has been granted, ACROSS ALL DOCTORS — cancelled, unpaid and paid alike. This
 * is the one doctor-portal endpoint that deliberately does NOT filter by
 * `auth.doctorId`; `verifyCountryDirectorAccess` + the country clamp below are
 * the only things standing between a director and another market's data.
 *
 * Deliberately narrow payload:
 *   • Patient NAME only — no email or phone. The doctor patients list already
 *     strips email for GDPR reasons; re-exposing peers' patients' addresses here
 *     would reopen exactly that hole.
 *   • No money. No price, payout, commission or currency — a director oversees
 *     throughput, not their colleagues' pay.
 *   • No clinical content and no drill-in link. Notes, documents, prescriptions
 *     and `meetingUrl` stay out of the select entirely.
 *
 * The read is audited (COUNTRY_CONSULTATIONS_VIEWED), like DOCTOR_BANK_VIEWED.
 */

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD")
    .optional(),
  countryCode: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  consultationType: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  doctorId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z
      .enum([
        "REQUEST_RECEIVED",
        "UNDER_REVIEW",
        "CONTACTED",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional(),
  ),
  paymentStatus: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.enum(["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"]).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const doctorCountryConsultationsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/country-consultations", async (request, reply) => {
    const auth = await verifyCountryDirectorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    const { page, pageSize } = parsed.data;

    // Country clamp — see resolveDirectorCountryScope (pure + unit-tested).
    const granted = auth.directorCountryCodes;
    const scope = resolveDirectorCountryScope(granted, parsed.data.countryCode);
    if (!scope.ok) {
      return reply
        .status(403)
        .send(errorResponse("You don't have director access to that country"));
    }
    const effectiveCodes = scope.codes;

    const now = new Date();
    const toUtc = parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : now;
    const fromUtc = parsed.data.from
      ? new Date(`${parsed.data.from}T00:00:00.000Z`)
      : new Date(toUtc.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (toUtc < fromUtc) {
      return reply.status(400).send(errorResponse("`to` must be after `from`"));
    }

    const andFilters: Prisma.AppointmentWhereInput[] = [
      // Filter on scheduledAt when present, fall back to createdAt so an
      // unscheduled request still shows up in the range — same shape as the
      // doctor appointments queue.
      {
        OR: [
          { scheduledAt: { gte: fromUtc, lte: toUtc } },
          {
            AND: [
              { scheduledAt: null },
              { createdAt: { gte: fromUtc, lte: toUtc } },
            ],
          },
        ],
      },
    ];
    if (parsed.data.status) andFilters.push({ status: parsed.data.status });
    if (parsed.data.paymentStatus) {
      andFilters.push({ paymentStatus: parsed.data.paymentStatus });
    }
    if (parsed.data.consultationType) {
      andFilters.push({ consultationType: parsed.data.consultationType });
    }
    // A doctorId from the query narrows within the granted countries only — the
    // country clamp still applies, so it can't be used to reach another market.
    if (parsed.data.doctorId) andFilters.push({ doctorId: parsed.data.doctorId });
    if (parsed.data.search) {
      // Patient name only. Searching email would let a director confirm which
      // address belongs to which patient without ever being shown it.
      andFilters.push({
        fullName: { contains: parsed.data.search, mode: "insensitive" },
      });
    }

    try {
      const where: Prisma.AppointmentWhereInput = {
        // `mode: "insensitive"` because Appointment.countryCode is free-text:
        // the rows are lowercase by convention, not by constraint, and an
        // exact-match `in` would silently drop any row that isn't.
        ...(effectiveCodes
          ? { countryCode: { in: effectiveCodes, mode: "insensitive" as const } }
          : {}),
        AND: andFilters,
      };

      const [total, items, byStatus, byPayment] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          // Narrow on purpose — see the file header. Adding a field here widens
          // what every director can see about their colleagues' patients.
          select: {
            id: true,
            createdAt: true,
            scheduledAt: true,
            fullName: true,
            countryCode: true,
            consultationType: true,
            status: true,
            paymentStatus: true,
            doctor: { select: { id: true, fullName: true } },
          },
          orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.appointment.groupBy({
          by: ["status"],
          where,
          _count: { _all: true },
        }),
        prisma.appointment.groupBy({
          by: ["paymentStatus"],
          where,
          _count: { _all: true },
        }),
      ]);

      // Filter dropdown sources. Countries = the GRANT (not what happens to be
      // in range), so the picker stays stable on an empty range. Doctors = who
      // actually has appointments in the granted markets.
      const grantedCountryCodes = granted ?? [];
      const [countries, doctorRows] = await Promise.all([
        prisma.country.findMany({
          where:
            granted === null
              ? {}
              : { code: { in: grantedCountryCodes, mode: "insensitive" } },
          select: { code: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.appointment.findMany({
          where: {
            // `mode: "insensitive"` because Appointment.countryCode is free-text:
        // the rows are lowercase by convention, not by constraint, and an
        // exact-match `in` would silently drop any row that isn't.
        ...(effectiveCodes
          ? { countryCode: { in: effectiveCodes, mode: "insensitive" as const } }
          : {}),
            doctorId: { not: null },
          },
          select: { doctor: { select: { id: true, fullName: true } } },
          distinct: ["doctorId"],
          orderBy: { doctorId: "asc" },
          take: 300,
        }),
      ]);
      const doctors = doctorRows
        .map((row) => row.doctor)
        .filter((d): d is { id: string; fullName: string } => d !== null)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      // Fire-and-forget: a missing audit row must never fail the read.
      recordAudit({
        actorUserId: auth.userId,
        actorRole: auth.role,
        action: "COUNTRY_CONSULTATIONS_VIEWED",
        entityType: "Country",
        entityId: (effectiveCodes ?? ["*"]).join(","),
        metadata: {
          doctorId: auth.doctorId,
          page,
          pageSize,
          resultCount: items.length,
          filters: {
            from: fromUtc.toISOString(),
            to: toUtc.toISOString(),
            status: parsed.data.status ?? null,
            paymentStatus: parsed.data.paymentStatus ?? null,
            consultationType: parsed.data.consultationType ?? null,
            doctorId: parsed.data.doctorId ?? null,
            search: parsed.data.search ? "[redacted]" : null,
          },
        },
        request,
      }).catch(() => {});

      return okResponse({
        range: { from: fromUtc.toISOString(), to: toUtc.toISOString() },
        filters: {
          countryCode: parsed.data.countryCode ?? null,
          consultationType: parsed.data.consultationType ?? null,
          status: parsed.data.status ?? null,
          paymentStatus: parsed.data.paymentStatus ?? null,
          doctorId: parsed.data.doctorId ?? null,
          search: parsed.data.search ?? null,
        },
        items: items.map((a) => ({
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          scheduledAt: a.scheduledAt ? a.scheduledAt.toISOString() : null,
          patientName: a.fullName,
          countryCode: a.countryCode,
          consultationType: a.consultationType,
          status: a.status,
          paymentStatus: a.paymentStatus,
          doctorId: a.doctor?.id ?? null,
          doctorName: a.doctor?.fullName ?? null,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        counts: {
          byStatus: byStatus.map((r) => ({
            status: r.status,
            count: r._count._all,
          })),
          byPayment: byPayment.map((r) => ({
            paymentStatus: r.paymentStatus,
            count: r._count._all,
          })),
        },
        countries: countries.map((c) => ({ code: c.code, name: c.name })),
        doctors,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load country consultations"));
    }
  });
};

export default doctorCountryConsultationsRoute;
