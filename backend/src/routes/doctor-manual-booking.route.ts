import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";
import {
  ClinicNotAvailableError,
  createDoctorManualBooking,
  listDoctorBookingOptions,
} from "../modules/appointments/doctor-manual-booking.service.js";
import {
  DoctorNotAssignedToServiceError,
  DoctorNotAvailableInCountryError,
  DoctorNotFoundError,
  ServiceNotFoundError,
  ServicePriceMissingError,
  SlotNotAvailableError,
  DuplicatePatientError,
} from "../modules/appointments/manual-booking.service.js";
import { createDoctorManualAppointmentBodySchema } from "../validations/doctor-manual-booking.schema.js";
import { verifyDoctorAccess, verifyManualEntryPermission } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Doctor-side manual booking — the doctor equivalent of the admin walk-in
 * form, unlocked per doctor by `Doctor.canCreateManualAppointments`.
 *
 *   GET  /api/doctor/booking-options  — services the doctor may book +
 *                                       clinics for in-person venues
 *   POST /api/doctor/appointments     — create the booking
 *
 * No price crosses this boundary in either direction: the picklist omits
 * `basePriceCents`, the body has no amount field, and the response carries
 * the Stripe link without the sum it charges. The link itself is minted at
 * the real catalogue price by the shared `createManualBooking` pipeline.
 */
const doctorManualBookingRoute: FastifyPluginAsync = async (app) => {
  /**
   * Picklists for the booking form. Readable by any authenticated doctor —
   * it also reports `canCreateManualAppointments`, which is how the portal
   * decides whether to show the entry point at all. Creating is gated
   * separately on POST.
   */
  app.get("/api/doctor/booking-options", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const data = await listDoctorBookingOptions(auth.doctorId);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load booking options"));
    }
  });

  app.post("/api/doctor/appointments", async (request, reply) => {
    // Per-doctor permission gate. ADMINs with a linked doctor profile pass
    // through; a DOCTOR needs the flag an admin flipped on their profile.
    const auth = await verifyManualEntryPermission(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const body = createDoctorManualAppointmentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid manual booking payload", body.error.flatten()));
    }

    try {
      const result = await createDoctorManualBooking({
        doctorId: auth.doctorId,
        actorUserId: auth.userId,
        patient: body.data.patient,
        serviceId: body.data.serviceId,
        timeSlotId: body.data.timeSlotId,
        consultationMode: body.data.consultationMode,
        clinicId: body.data.clinicId ?? null,
        locationAddress: body.data.locationAddress ?? null,
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
        },
      });

      // No audit call here: `createManualBooking` already writes the
      // APPOINTMENT_CREATED row, stamped with `source: "doctor_manual"`,
      // actorRole DOCTOR, and this doctor's user id. A second row would only
      // duplicate it.

      // Admin bell: a doctor just created a billable booking outside the
      // console. APPOINTMENT_ASSIGNED is the closest existing notification
      // type — adding an enum value would need a migration for a label.
      notifyAdmins("APPOINTMENT_ASSIGNED", {
        appointmentId: result.appointmentId,
        snippet: `${created?.fullName ?? "Patient"} · manual booking by doctor`,
        byUserName: auth.fullName,
        byRole: "DOCTOR",
      }).catch(() => {});

      return reply.status(201).send(
        okResponse(
          {
            appointment: created
              ? { ...created, scheduledAt: created.scheduledAt?.toISOString() ?? null }
              : { id: result.appointmentId },
            orderId: result.orderId,
            // Null when Stripe isn't configured or the session failed — the
            // booking still stands and an admin can recover it by hand.
            paymentUrl: result.paymentUrl,
            setPasswordUrl: result.setPasswordUrl,
            // Whether a brand-new portal account was minted. The temp password
            // itself is NOT returned to a doctor — the patient's invite email
            // and `setPasswordUrl` are the supported way in.
            patientAccountCreated: result.tempPassword !== null,
            emailQueued: result.emailQueued,
          },
          "Booking created",
        ),
      );
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DoctorNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      // Race loser / stale picker — the doctor re-picks an open slot.
      if (error instanceof SlotNotAvailableError) {
        return reply.status(409).send(errorResponse(error.message));
      }
      // A new email address for someone who is already a patient. Reported
      // with the matching records so the doctor books under the existing
      // address rather than starting a second chart for the same person.
      if (error instanceof DuplicatePatientError) {
        return reply
          .status(409)
          .send(errorResponse(error.message, { matches: error.matches }));
      }
      if (
        error instanceof DoctorNotAssignedToServiceError ||
        error instanceof DoctorNotAvailableInCountryError ||
        error instanceof ClinicNotAvailableError ||
        error instanceof ServicePriceMissingError
      ) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create the booking"));
    }
  });
};

export default doctorManualBookingRoute;
