import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  assertValidStatusTransition,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "../modules/appointments/appointment-status-transitions.js";

/**
 * Doctor-side appointment actions + per-patient drilldown + invoices.
 *
 *   PATCH /api/doctor/appointments/:id          — meetingUrl / status
 *   GET   /api/doctor/patients/:email           — single-patient detail
 *   GET   /api/doctor/invoices?from=&to=&status= — invoices index
 *
 * The PATCH endpoint mirrors the admin schedule action with two
 * intentional differences:
 *   • The doctor can ONLY edit meetingUrl + status. Slot date,
 *     consultation type, country, and patient identity remain admin-
 *     managed so a doctor can't reschedule the call out from under the
 *     patient or rewrite the booking record.
 *   • Status transitions follow the same state machine the admin uses
 *     (`assertValidStatusTransition`) so the audit history reads the
 *     same regardless of who clicked the button.
 */

const ALLOWED_MEETING_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "us02web.zoom.us",
  "us04web.zoom.us",
  "us05web.zoom.us",
  "us06web.zoom.us",
  "daily.co",
];

function looksLikeMeetingUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return ALLOWED_MEETING_HOSTS.some(
      (host) =>
        url.hostname === host || url.hostname.endsWith(`.${host.split(".").slice(-2).join(".")}`),
    );
  } catch {
    return false;
  }
}

const patchAppointmentSchema = z
  .object({
    meetingUrl: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional()
      .refine(
        (v) =>
          v === null ||
          v === undefined ||
          v === "" ||
          looksLikeMeetingUrl(v),
        { message: "Meeting URL must be a Google Meet / Zoom / Teams / Whereby / Daily link" },
      ),
    status: z
      .enum([
        "REQUEST_RECEIVED",
        "UNDER_REVIEW",
        "CONTACTED",
        "COMPLETED",
        "CANCELLED",
      ])
      .optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const invoiceQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const doctorActionsRoute: FastifyPluginAsync = async (app) => {
  app.patch<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = patchAppointmentSchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid update", body.error.flatten()));
      }
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: { id: true, status: true, meetingUrl: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        if (body.data.status && body.data.status !== appt.status) {
          try {
            assertValidStatusTransition(appt.status, body.data.status);
          } catch (err) {
            if (err instanceof InvalidAppointmentStatusTransitionError) {
              return reply.status(400).send(errorResponse(err.message));
            }
            if (err instanceof UnrecognizedAppointmentStatusError) {
              return reply.status(400).send(errorResponse(err.message));
            }
            throw err;
          }
        }
        const updateData: Record<string, unknown> = {};
        if (body.data.meetingUrl !== undefined) {
          updateData.meetingUrl =
            body.data.meetingUrl === null || body.data.meetingUrl === ""
              ? null
              : body.data.meetingUrl;
        }
        if (body.data.status !== undefined) {
          updateData.status = body.data.status;
        }
        const updated = await prisma.appointment.update({
          where: { id: appt.id },
          data: updateData,
          select: {
            id: true,
            status: true,
            meetingUrl: true,
            scheduledAt: true,
            updatedAt: true,
          },
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: body.data.status ? "CONSULT_SAVED" : "CONSULT_SAVED",
          entityType: "Appointment",
          entityId: updated.id,
          metadata: {
            changed: Object.keys(updateData),
            newStatus: updated.status,
          },
          request,
        }).catch(() => {});
        return okResponse({
          appointment: {
            ...updated,
            scheduledAt: updated.scheduledAt?.toISOString() ?? null,
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update appointment"));
      }
    },
  );

  /**
   * Patient detail keyed by email (guest bookings have no userId).
   * Returns every appointment THIS doctor owns for that email plus
   * inline consultation status. Cross-doctor isolation: a doctor can't
   * see appointments owned by a different doctor even for the same
   * patient — `where.doctorId = self` enforces it at the DB level.
   */
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const decodedEmail = decodeURIComponent(request.params.email).trim().toLowerCase();
      if (!decodedEmail) {
        return reply.status(400).send(errorResponse("Email required"));
      }
      try {
        const rows = await prisma.appointment.findMany({
          where: {
            doctorId: auth.doctorId,
            email: { equals: decodedEmail, mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            consultationType: true,
            countryCode: true,
            status: true,
            paymentStatus: true,
            scheduledAt: true,
            meetingUrl: true,
            createdAt: true,
            dateOfBirth: true,
            consultation: {
              select: { id: true, status: true, signedAt: true },
            },
          },
        });
        if (rows.length === 0) {
          return reply.status(404).send(errorResponse("Patient not found"));
        }
        const latest = rows[0];
        return okResponse({
          patient: {
            email: latest.email,
            fullName: latest.fullName,
            phone: latest.phone,
            countryCode: latest.countryCode,
            dateOfBirth: latest.dateOfBirth?.toISOString() ?? null,
            firstSeen: rows[rows.length - 1].createdAt.toISOString(),
            appointmentCount: rows.length,
            signedConsultCount: rows.filter(
              (r) => r.consultation?.status === "SIGNED",
            ).length,
          },
          appointments: rows.map((r) => ({
            id: r.id,
            consultationType: r.consultationType,
            countryCode: r.countryCode,
            status: r.status,
            paymentStatus: r.paymentStatus,
            scheduledAt: r.scheduledAt?.toISOString() ?? null,
            meetingUrl: r.meetingUrl,
            createdAt: r.createdAt.toISOString(),
            consultation: r.consultation
              ? {
                  id: r.consultation.id,
                  status: r.consultation.status,
                  signedAt: r.consultation.signedAt?.toISOString() ?? null,
                }
              : null,
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load patient"));
      }
    },
  );

  /**
   * Invoices index for the doctor — one row per appointment with
   * billable data. The /doctor/appointments table already shows
   * paymentStatus but the plan calls for a dedicated invoice surface
   * filtered by status / date so doctors can spot Unpaid backlogs
   * without paging through every appointment.
   */
  app.get("/api/doctor/invoices", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const q = invoiceQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    const { from, to, status, page, pageSize } = q.data;
    const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    try {
      const where = {
        doctorId: auth.doctorId,
        ...(status ? { paymentStatus: status } : {}),
        ...(fromUtc || toUtc
          ? {
              createdAt: {
                ...(fromUtc ? { gte: fromUtc } : {}),
                ...(toUtc ? { lte: toUtc } : {}),
              },
            }
          : {}),
        // An appointment with amountCents=null is not yet priced; skip
        // those unless the doctor explicitly filters for status=UNPAID.
        ...(status === undefined ? { amountCents: { not: null } } : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.appointment.count({ where }),
        prisma.appointment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            fullName: true,
            email: true,
            consultationType: true,
            countryCode: true,
            status: true,
            paymentStatus: true,
            amountCents: true,
            currencyCode: true,
            paidAt: true,
            scheduledAt: true,
            createdAt: true,
          },
        }),
      ]);
      return okResponse({
        items: rows.map((r) => ({
          ...r,
          scheduledAt: r.scheduledAt?.toISOString() ?? null,
          paidAt: r.paidAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load invoices"));
    }
  });
};

export default doctorActionsRoute;
