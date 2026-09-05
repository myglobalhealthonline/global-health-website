import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  reclaimSlotForRescheduledAppointment,
  releaseAppointmentSlot,
} from "../modules/doctor-availability/doctor-availability.service.js";
import { releaseMembershipAllowanceForSlot } from "../modules/memberships/membership-allowance.service.js";
import { resolveStaffTimeZone } from "../modules/automation/staff-timezone.js";
import { applyRescheduleSideEffects } from "../modules/appointments/reschedule-side-effects.service.js";
import { formatNotificationDateTime } from "../modules/notifications/notification-datetime.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveConsultationName } from "../modules/consultation-history/consultation-history-display.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";
import {
  assertValidStatusTransition,
  InvalidAppointmentStatusTransitionError,
  UnrecognizedAppointmentStatusError,
} from "../modules/appointments/appointment-status-transitions.js";
import {
  finalizeDoctorAppointment,
} from "../modules/doctor-appointments/doctor-appointments.service.js";
import {
  createFollowUpBooking,
  FollowUpSourceNotBillableError,
  FollowUpSourceNotFoundError,
  FollowUpVenueMissingError,
  FollowUpBookingUnavailableError,
} from "../modules/appointments/follow-up-booking.service.js";
import {
  DoctorNotAssignedToServiceError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
  ServiceNotFoundError,
  ServicePriceMissingError,
  SlotNotAvailableError,
  DuplicatePatientError,
  ManualBookingUnavailableError,
} from "../modules/appointments/manual-booking.service.js";
import { notifyPatientDoctorReady } from "../modules/appointments/notify-doctor-ready.service.js";
import { isAppointmentPaid } from "../modules/appointments/appointment-payment-gate.js";

/**
 * Doctor-side appointment actions + per-patient drilldown + invoices.
 *
 *   PATCH /api/doctor/appointments/:id          — meetingUrl / status
 *   POST  /api/doctor/appointments/:id/notify-ready — email+WhatsApp patient
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
    /** First base DoctorTimeSlot to claim. Required — a follow-up must sit on
     *  a real open slot so it blocks the doctor's calendar like any other
     *  booking. The old free-text `scheduledAt` reserved nothing. */
    timeSlotId: z.string().min(1).max(120),
    consultationType: z
      .enum(["general", "specialist", "prescription", "health-test", "follow-up"])
      .default("follow-up"),
    notes: z.string().trim().max(2000).optional(),
    consultationMode: z.enum(["ONLINE", "IN_PERSON"]).optional(),
    /**
     * Language the patient-facing notifications for this booking go out in.
     * The dialog pre-selects the booking country's own locale; the operator
     * overrides it when the patient reads something else. Omitted → the service
     * falls back to the country locale, so older clients are unchanged.
     */
    notificationLocale: z.enum(["EN", "PT", "ES", "CS", "RO", "DE"]).optional(),
  })
  .strict();

const finalizeSchema = z
  .object({
    notesUploaded: z.literal(true),
    filesUploaded: z.literal(true),
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
  sortBy: z.enum(["date", "amount"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
            serviceId: true,
            countryCode: true,
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
          const nextMeetingUrl =
            body.data.meetingUrl === null || body.data.meetingUrl === ""
              ? null
              : body.data.meetingUrl;
          // Adding a link to an unpaid booking is what dragged ORD-000382 into
          // the no-show cron: the doctor pasted a Meet URL onto a consultation
          // nobody had paid for, and `meetingUrl != null` was that cron's
          // entry condition. Clearing one stays allowed — that direction only
          // ever removes a booking from automation.
          if (nextMeetingUrl !== null && !(await isAppointmentPaid(appt.id))) {
            return reply
              .status(400)
              .send(
                errorResponse(
                  "This consultation has not been paid for yet. The meeting link is created automatically once payment lands.",
                ),
              );
          }
          updateData.meetingUrl = nextMeetingUrl;
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
        // Length of the slot being released — the re-claim below keeps the
        // consultation at its true duration instead of the base grid's.
        const previousSlot =
          isReschedule && appt.timeSlotId
            ? await prisma.doctorTimeSlot.findUnique({
                where: { id: appt.timeSlotId },
                select: { startAt: true, endAt: true },
              })
            : null;
        const previousSlotMinutes = previousSlot
          ? Math.round(
              (previousSlot.endAt.getTime() - previousSlot.startAt.getTime()) /
                60_000,
            )
          : null;

        if ((isReschedule || isCancelling) && appt.timeSlotId) {
          // Cancelling returns a spent allowance unit (decision 16). A
          // RESCHEDULE deliberately does not: the consultation still happens,
          // so the unit stays spent on the same order line.
          if (isCancelling) {
            await releaseMembershipAllowanceForSlot(appt.timeSlotId).catch((err) => {
              app.log.warn({ err }, "Allowance release failed on doctor cancel");
            });
          }
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
          // Corporate lifecycle hook (pre-assessment activation / request
          // completion). Fire-and-forget.
          void import("../modules/corporate/corporate-status.service.js")
            .then((m) => m.onCorporateAppointmentStatusChanged(updated.id, updated.status))
            .catch(() => {});
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
            byUserName: auth.fullName,
            byRole: "DOCTOR",
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
          // Off the response path, but strictly ordered: the Meet event takes
          // its end time from the appointment's slot, so the slot has to be
          // back in place before the link is reissued.
          void (async () => {
            // The old slot was released above and only `scheduledAt` moved, so
            // re-point the appointment at a real slot at the new time — else
            // the booking page keeps offering it to other patients.
            await reclaimSlotForRescheduledAppointment(
              updated.id,
              // The row was looked up scoped to this doctor, so they own it.
              auth.doctorId,
              updated.scheduledAt ?? null,
              previousSlotMinutes,
            ).catch(() => null);

            // Same downstream work as an admin reschedule: reissue the Meet
            // link (the old one points at a calendar event at the old time)
            // and write it to the order + every linked appointment so all
            // portals agree, re-arm the stage-gated reminder ladder against
            // the new time, and notify the patient.
            await applyRescheduleSideEffects({
              appointmentId: updated.id,
              scheduledAt: updated.scheduledAt ?? null,
              timeChanged: true,
              changeReason: "",
            });
          })().catch((err) => {
            app.log.warn({ err }, "Reschedule side effects failed");
          });
          // Admins read the slot on the BOOKED MARKET's clock — a doctor
          // rostered in several countries reschedules against the service's
          // country, not their own profile country.
          const clinicTz = updated.scheduledAt
            ? await resolveStaffTimeZone({
                serviceId: appt.serviceId,
                countryCode: appt.countryCode,
                doctorId: auth.doctorId,
              }).catch(() => "UTC")
            : "UTC";
          notifyAdmins("APPOINTMENT_RESCHEDULED", {
            appointmentId: updated.id,
            snippet: `${appt.fullName} · slot ${
              updated.scheduledAt
                ? formatNotificationDateTime(updated.scheduledAt, clinicTz)
                : "cleared"
            }`,
            byUserName: auth.fullName,
            byRole: "DOCTOR",
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

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/finalize",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = finalizeSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid finalize payload", body.error.flatten()));
      }
      try {
        const updated = await finalizeDoctorAppointment(
          auth.doctorId,
          request.params.id,
          body.data,
        );
        if (!updated) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "APPOINTMENT_STATUS_CHANGED",
          entityType: "Appointment",
          entityId: updated.id,
          metadata: { finalized: true, status: "COMPLETED" },
          request,
        }).catch(() => {});
        notifyAdmins("APPOINTMENT_STATUS_CHANGED", {
          appointmentId: updated.id,
          snippet: `${updated.fullName} · finalized`,
          byUserName: auth.fullName,
          byRole: "DOCTOR",
        }).catch(() => {});
        return okResponse({
          appointment: {
            id: updated.id,
            status: updated.status,
            finalized: updated.finalized,
            notesUploaded: updated.notesUploaded,
            filesUploaded: updated.filesUploaded,
            consultationCompletedAt:
              updated.consultationCompletedAt?.toISOString() ?? null,
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("already finalized")) {
          return reply.status(409).send(errorResponse(error.message));
        }
        // Terminal appointment (cancelled, or completed by another request):
        // a conflict, not a server fault.
        if (error instanceof InvalidAppointmentStatusTransitionError) {
          return reply
            .status(409)
            .send(
              errorResponse(
                "This consultation is no longer open — it has been cancelled or already completed.",
              ),
            );
        }
        if (error instanceof UnrecognizedAppointmentStatusError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (error instanceof Error && error.message.includes("Both notes")) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not finalize appointment"));
      }
    },
  );

  /**
   * "Doctor is ready" — one click from the doctor's own appointment row,
   * fired once they're in the consultation room. Emails + WhatsApps the
   * patient the join link. Always attempts both channels; WhatsApp is
   * skipped (not failed) when the patient has no phone or hasn't opted in.
   */
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/notify-ready",
    { config: { rateLimit: { max: 20, timeWindow: "1 hour", skipOnError: false } } },
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await notifyPatientDoctorReady({
          appointmentId: request.params.id,
          doctorIdScope: auth.doctorId,
        });
        if (!result.ok) {
          return reply.status(result.status).send(errorResponse(result.message));
        }
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "PATIENT_NOTIFIED_DOCTOR_READY",
          entityType: "Appointment",
          entityId: request.params.id,
          metadata: { sent: result.sent, failed: result.failed },
          request,
        }).catch(() => {});
        return okResponse(
          {
            sent: result.sent,
            failed: result.failed,
            missingPhone: result.missingPhone,
            missingConsent: result.missingConsent,
          },
          "Patient notified",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not notify patient"));
      }
    },
  );

  /**
   * Create a follow-up appointment linked to the source, on a real open
   * slot from the doctor's own calendar.
   *
   * Delegates to `createFollowUpBooking`, which runs the shared manual-
   * booking pipeline: the slot is atomically held (so the hour stops being
   * bookable), an Order + Stripe Checkout link are minted at the source
   * consultation's price, and the standard pre-payment notification
   * sequence goes out to both patient and doctor. Non-payment cancels the
   * booking and returns the slot to the base grid.
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
        const result = await createFollowUpBooking({
          sourceAppointmentId: request.params.id,
          doctorId: auth.doctorId,
          actorUserId: auth.userId,
          timeSlotId: body.data.timeSlotId,
          consultationMode: body.data.consultationMode,
          consultationType: body.data.consultationType,
          notificationLocale: body.data.notificationLocale ?? null,
          notes: body.data.notes ?? null,
          request,
        });

        const created = await prisma.appointment.findUnique({
          where: { id: result.appointmentId },
          select: {
            id: true,
            fullName: true,
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
          entityId: result.appointmentId,
          metadata: {
            followUpFromAppointmentId: request.params.id,
            orderId: result.orderId,
            timeSlotId: body.data.timeSlotId,
          },
          request,
        }).catch(() => {});
        notifyAdmins("APPOINTMENT_FOLLOWUP_BOOKED", {
          appointmentId: result.appointmentId,
          snippet: `${created?.fullName ?? "Patient"} · follow-up booked`,
          byUserName: auth.fullName,
          byRole: "DOCTOR",
        }).catch(() => {});

        return reply.status(201).send(
          okResponse(
            {
              appointment: created
                ? {
                    ...created,
                    scheduledAt: created.scheduledAt?.toISOString() ?? null,
                    createdAt: created.createdAt.toISOString(),
                  }
                : { id: result.appointmentId },
              orderId: result.orderId,
              // Null when Stripe isn't configured or the session failed —
              // the booking still stands and admin can recover it by hand.
              paymentUrl: result.paymentUrl,
            },
            "Follow-up created",
          ),
        );
      } catch (error) {
        if (error instanceof FollowUpSourceNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (
          error instanceof FollowUpSourceNotBillableError ||
          error instanceof FollowUpVenueMissingError
        ) {
          return reply.status(400).send(errorResponse(error.message));
        }
        // Race loser / stale picker — the doctor re-picks an open slot.
        if (
          error instanceof SlotNotAvailableError ||
          error instanceof ManualBookingUnavailableError
        ) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (error instanceof FollowUpBookingUnavailableError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        // Following up would start a SECOND chart for this patient. Normally
        // unreachable — the follow-up resolves the patient's live address, so
        // the account exists and the check short-circuits — but it fires if the
        // source appointment never had an account behind it. Doctors can't fix
        // patient identity from the portal, so this points at admin rather than
        // offering an override.
        if (error instanceof DuplicatePatientError) {
          return reply
            .status(409)
            .send(
              errorResponse(
                "This patient already exists under a different email address, so booking a follow-up here would create a second record. Ask an administrator to merge the records first.",
                { matches: error.matches },
              ),
            );
        }
        // The source's service/doctor can disappear or be unassigned between
        // the source lookup and the booking (admin edit, deactivation). All
        // are "fix the catalogue, then retry" — a 400, not a 500.
        if (
          error instanceof ServicePriceMissingError ||
          error instanceof ServiceNotFoundError ||
          error instanceof DoctorNotFoundError ||
          error instanceof DoctorNotAssignedToServiceError ||
          error instanceof DoctorNotAvailableInCountryError
        ) {
          return reply.status(400).send(errorResponse(error.message));
        }
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
          orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
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
            service: { select: { name: true } },
            consultation: {
              select: { id: true, status: true, signedAt: true },
            },
          },
        });
        if (rows.length === 0) {
          return reply.status(404).send(errorResponse("Patient not found"));
        }
        // `consultationType` is only "general" / "specialist" for native
        // bookings, so the Type column read "General" for everything. Fall
        // back to the OrderItem name snapshot when the appointment has no
        // catalogue Service linked. No relation from Appointment → OrderItem,
        // so this is a separate keyed lookup.
        const orderItems = await prisma.orderItem.findMany({
          where: { appointmentId: { in: rows.map((r) => r.id) } },
          select: { appointmentId: true, name: true },
        });
        const itemNameByAppointment = new Map(
          orderItems
            .filter((i) => i.appointmentId)
            .map((i) => [i.appointmentId as string, i.name]),
        );
        const latest = rows[0];
        // GDPR plan: email + phone never surface to the doctor portal.
        // Email is still in URL (used as the slug) and used by the
        // upload-link / chat-thread routes downstream, so we expose it
        // here for those follow-on requests — but the DTO does NOT
        // include `phone` or render it anywhere in the doctor UI.
        // Admins keep full PII via /api/admin/patients/:email/profile.
        return okResponse({
          patient: {
            email: latest.email,
            fullName: latest.fullName,
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
            consultationName: resolveConsultationName(
              r.service?.name,
              itemNameByAppointment.get(r.id),
              r.consultationType,
            ),
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
    const { from, to, status, page, pageSize, sortBy, sortOrder } = q.data;
    const fromUtc = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
    const toUtc = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
    const orderBy =
      sortBy === "amount" ? { amountCents: sortOrder } : { createdAt: sortOrder };
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
          orderBy,
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
            serviceId: true,
            paidAt: true,
            scheduledAt: true,
            createdAt: true,
          },
        }),
      ]);
      // AMOUNT the doctor sees is the admin-set payout for (this doctor, the
      // booked service) — NOT the patient's gross price. Live lookup: one query
      // maps serviceId -> payout, so changing the payout auto-updates invoices.
      const serviceIds = Array.from(
        new Set(rows.map((r) => r.serviceId).filter((id): id is string => !!id)),
      );
      const payoutByServiceId = new Map<string, number | null>();
      if (serviceIds.length > 0) {
        const assignments = await prisma.serviceDoctor.findMany({
          where: { doctorId: auth.doctorId, serviceId: { in: serviceIds } },
          select: { serviceId: true, doctorAmountCents: true },
        });
        for (const a of assignments) {
          payoutByServiceId.set(a.serviceId, a.doctorAmountCents);
        }
      }
      return okResponse({
        items: rows.map((r) => ({
          ...r,
          // null = no assignment for this service, or a free-text booking
          // (serviceId null) — the UI renders "Not set".
          doctorAmountCents: r.serviceId
            ? payoutByServiceId.get(r.serviceId) ?? null
            : null,
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
