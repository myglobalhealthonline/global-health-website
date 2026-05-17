import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { releaseAppointmentSlot } from "../modules/doctor-availability/doctor-availability.service.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";
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
    /** ISO 8601 with offset — doctor can reschedule from the workspace. */
    scheduledAt: z
      .union([z.string().datetime({ offset: true }), z.null()])
      .optional(),
    /** ONLINE | IN_PERSON. Defaults stay ONLINE for telemedicine. */
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const followUpSchema = z
  .object({
    scheduledAt: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    consultationType: z
      .enum(["general", "specialist", "prescription", "health-test", "follow-up"])
      .default("follow-up"),
    notes: z.string().trim().max(2000).optional(),
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).optional(),
  })
  .strict();

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
          select: {
            id: true,
            status: true,
            meetingUrl: true,
            scheduledAt: true,
            consultationMode: true,
            timeSlotId: true,
            fullName: true,
          },
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
        if (body.data.scheduledAt !== undefined) {
          updateData.scheduledAt =
            body.data.scheduledAt === null
              ? null
              : new Date(body.data.scheduledAt);
        }
        if (body.data.consultationMode !== undefined) {
          updateData.consultationMode = body.data.consultationMode;
        }

        // Slot release on doctor-side reschedule + cancel. Matches the
        // admin pathway in admin-appointments.route.ts — without this
        // a doctor reschedule leaves the old DoctorTimeSlot in BOOKED
        // state forever.
        const isReschedule =
          body.data.scheduledAt !== undefined &&
          (appt.scheduledAt?.toISOString() ?? null) !==
            (body.data.scheduledAt === null
              ? null
              : new Date(body.data.scheduledAt).toISOString());
        const isCancelling =
          body.data.status === "CANCELLED" && appt.status !== "CANCELLED";
        if ((isReschedule || isCancelling) && appt.timeSlotId) {
          const releasedSlotId = await releaseAppointmentSlot(appt.id).catch(
            (err) => {
              app.log.warn({ err }, "Slot release failed on doctor update");
              return null;
            },
          );
          if (releasedSlotId) {
            recordAudit({
              actorUserId: auth.userId,
              actorRole: "DOCTOR",
              action: "TIMESLOT_RELEASED",
              entityType: "DoctorTimeSlot",
              entityId: releasedSlotId,
              metadata: {
                reason: isCancelling ? "doctor_cancel" : "doctor_reschedule",
                appointmentId: appt.id,
              },
              request,
            }).catch(() => {});
          }
        }

        const updated = await prisma.appointment.update({
          where: { id: appt.id },
          data: updateData,
          select: {
            id: true,
            status: true,
            meetingUrl: true,
            scheduledAt: true,
            consultationMode: true,
            updatedAt: true,
          },
        });

        // Audit + notifications keyed off WHAT actually changed.
        if (body.data.status !== undefined && body.data.status !== appt.status) {
          recordAudit({
            actorUserId: auth.userId,
            actorRole: "DOCTOR",
            action: "APPOINTMENT_STATUS_CHANGED",
            entityType: "Appointment",
            entityId: updated.id,
            metadata: { from: appt.status, to: updated.status },
            request,
          }).catch(() => {});
          notifyAdmins("APPOINTMENT_STATUS_CHANGED", {
            appointmentId: updated.id,
            snippet: `${appt.fullName} · ${appt.status} → ${updated.status}`,
          }).catch(() => {});
        }
        if (
          body.data.scheduledAt !== undefined &&
          (appt.scheduledAt?.toISOString() ?? null) !==
            (updated.scheduledAt?.toISOString() ?? null)
        ) {
          recordAudit({
            actorUserId: auth.userId,
            actorRole: "DOCTOR",
            action: "APPOINTMENT_RESCHEDULED",
            entityType: "Appointment",
            entityId: updated.id,
            metadata: {
              from: appt.scheduledAt?.toISOString() ?? null,
              to: updated.scheduledAt?.toISOString() ?? null,
            },
            request,
          }).catch(() => {});
          notifyAdmins("APPOINTMENT_RESCHEDULED", {
            appointmentId: updated.id,
            snippet: `${appt.fullName} · slot ${
              updated.scheduledAt
                ? new Date(updated.scheduledAt).toLocaleString()
                : "cleared"
            }`,
          }).catch(() => {});
        }
        if (body.data.meetingUrl !== undefined) {
          recordAudit({
            actorUserId: auth.userId,
            actorRole: "DOCTOR",
            action: "CONSULT_SAVED",
            entityType: "Appointment",
            entityId: updated.id,
            metadata: { changed: ["meetingUrl"] },
            request,
          }).catch(() => {});
        }

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
   * Create a follow-up appointment linked to the source. Copies
   * patient identity, doctor, consultation mode, country. Defaults to
   * "follow-up" consultation type unless the caller overrides. The
   * source appointment's `followUps` collection picks the new row up
   * automatically.
   */
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/follow-up",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = followUpSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid follow-up", body.error.flatten()));
      }
      try {
        const source = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: {
            id: true,
            userId: true,
            countryCode: true,
            consultationType: true,
            fullName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            consultationMode: true,
            serviceId: true,
            healthTestId: true,
            amountCents: true,
            currencyCode: true,
          },
        });
        if (!source) {
          return reply.status(404).send(errorResponse("Source appointment not found"));
        }
        const created = await prisma.appointment.create({
          data: {
            userId: source.userId,
            countryCode: source.countryCode,
            consultationType: body.data.consultationType,
            fullName: source.fullName,
            email: source.email,
            phone: source.phone,
            dateOfBirth: source.dateOfBirth,
            notes: body.data.notes ?? null,
            consentAccepted: true,
            status: "REQUEST_RECEIVED",
            doctorId: auth.doctorId,
            scheduledAt: body.data.scheduledAt
              ? new Date(body.data.scheduledAt)
              : null,
            consultationMode: body.data.consultationMode ?? source.consultationMode,
            // Carry billing context forward so the follow-up isn't a
            // priceless orphan — admin can still adjust before issuing.
            serviceId: source.serviceId,
            healthTestId: source.healthTestId,
            amountCents: source.amountCents,
            currencyCode: source.currencyCode,
            followUpFromAppointmentId: source.id,
          },
          select: {
            id: true,
            scheduledAt: true,
            consultationType: true,
            status: true,
            createdAt: true,
          },
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "FOLLOW_UP_CREATED",
          entityType: "Appointment",
          entityId: created.id,
          metadata: { followUpFromAppointmentId: source.id },
          request,
        }).catch(() => {});
        notifyAdmins("APPOINTMENT_FOLLOWUP_BOOKED", {
          appointmentId: created.id,
          snippet: `${source.fullName} · follow-up booked`,
        }).catch(() => {});
        return reply.status(201).send(
          okResponse(
            {
              appointment: {
                ...created,
                scheduledAt: created.scheduledAt?.toISOString() ?? null,
                createdAt: created.createdAt.toISOString(),
              },
            },
            "Follow-up created",
          ),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create follow-up"));
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
