import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  verifyClinicalReadAccess,
  verifyDoctorAccess,
} from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";
import {
  guardMedicalRead,
  guardMedicalReadForAppointment,
  MedicalAccessDeniedError,
} from "../utils/guard-medical-read.js";
import { decryptPhi } from "../lib/crypto/phi-crypto.js";
import { getDisclosedCrossBorderRecord } from "../modules/cross-border-rx/cross-border-rx-disclosure.service.js";
import { doctorVisibleIdentityFields } from "../utils/patient-identity-fields.js";

/**
 * Clinical consultation endpoints, doctor-only.
 *
 * The row is created lazily — the first PATCH from the portal upserts
 * the Consultation. Once `signed`, further PATCHes 409 to keep notes
 * immutable. Admin can read but not edit (a future audit-log row should
 * capture the read; out of scope today).
 *
 *   GET    /api/doctor/appointments/:id/consultation
 *   PATCH  /api/doctor/appointments/:id/consultation
 *   POST   /api/doctor/appointments/:id/consultation/sign
 *
 * Every handler scopes by `doctorId = self`. The appointment must
 * already be assigned to the calling doctor (admin sets `doctorId` on
 * the scheduling form) — otherwise 404.
 */

const patchBodySchema = z
  .object({
    chiefComplaint: z.string().trim().max(500).nullable().optional(),
    subjective: z.string().trim().max(20000).nullable().optional(),
    objective: z.string().trim().max(20000).nullable().optional(),
    assessment: z.string().trim().max(20000).nullable().optional(),
    plan: z.string().trim().max(20000).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

async function findOwnedAppointment(doctorId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      consultationType: true,
      countryCode: true,
      status: true,
      scheduledAt: true,
      meetingUrl: true,
      notes: true,
      dateOfBirth: true,
      consultationMode: true,
      followUpFromAppointmentId: true,
      finalized: true,
      notesUploaded: true,
      filesUploaded: true,
      manualEntry: true,
      pharmacy: true,
      symptoms: true,
      patientTimezone: true,
      consultationLanguageCode: true,
      createdAt: true,
    },
  });
}

/**
 * Read-side appointment lookup that admins can use without being
 * linked to a doctor. Doctors stay scoped to their own row; admins
 * see any appointment.
 */
async function findReadableAppointment(
  doctorId: string | null,
  role: "DOCTOR" | "ADMIN",
  appointmentId: string,
) {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      ...(role === "DOCTOR" && doctorId ? { doctorId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      consultationType: true,
      countryCode: true,
      status: true,
      // Coarse paid/unpaid flag only (no amounts) — lets the doctor UI show
      // the same booking-state wording (list's "Booked – waiting payment" /
      // "Booking confirmed") on the appointment detail page's status readout,
      // same as the list row for this appointment. Not an invoice/amount
      // field, so it doesn't cross the "no patient billing to doctors" line.
      paymentStatus: true,
      scheduledAt: true,
      meetingUrl: true,
      notes: true,
      dateOfBirth: true,
      consultationMode: true,
      followUpFromAppointmentId: true,
      finalized: true,
      notesUploaded: true,
      filesUploaded: true,
      manualEntry: true,
      pharmacy: true,
      symptoms: true,
      patientTimezone: true,
      consultationLanguageCode: true,
      createdAt: true,
    },
  });
}

/**
 * Resolve the booking settings that shape the doctor's read of an
 * appointment: the clinic timezone (IANA-validated on write, so a plain
 * default to UTC is enough) and whether this market collects a Número de
 * Utente — the flag that gates the SNS number in the patient card below.
 *
 * Country codes are stored lowercase, so match case-insensitively; an
 * exact match on an upper-cased code silently returns null.
 */
async function readCountryBookingSetting(
  countryCode: string | null,
): Promise<{ timezone: string; collectUtenteNumber: boolean }> {
  if (!countryCode) return { timezone: "UTC", collectUtenteNumber: false };
  const bs = await prisma.bookingSetting.findFirst({
    where: { country: { code: { equals: countryCode, mode: "insensitive" } } },
    select: { timezone: true, collectUtenteNumber: true },
  });
  return {
    timezone: bs?.timezone ?? "UTC",
    collectUtenteNumber: bs?.collectUtenteNumber ?? false,
  };
}

const consultationsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await findReadableAppointment(
          auth.doctorId,
          auth.role,
          request.params.id,
        );
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            appt.id,
            { resourceType: "CONSULT_NOTE", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        const [consultation, bookingSetting, patientProfile, crossBorderSource] = await Promise.all([
          prisma.consultation.findUnique({ where: { appointmentId: appt.id } }),
          readCountryBookingSetting(appt.countryCode),
          prisma.patientProfile.findUnique({
            where: { email: appt.email },
            select: {
              id: true,
              globalHealthNumber: true,
              // Postal address is already doctor-visible (it survives
              // `stripIdentityFields` on /api/doctor/patients/:email/profile);
              // surfacing it here just saves a hop to the patient chart.
              addressLine1: true,
              addressLine2: true,
              addressCity: true,
              addressState: true,
              addressPostalCode: true,
              addressCountryCode: true,
              // Government IDs the treating doctor may see, in every market —
              // see patient-identity-fields.ts. Número de Utente is the SNS
              // number that reaches PT national records; NIF (`taxIdNumber`,
              // BR's CPF) and Cartão de Cidadão (`nationalIdNumber`) are what
              // `buildPatientIdLine` prints on prescriptions/certificates.
              // Each disclosure is logged as SENSITIVE_PROFILE below. They stay
              // admin-only on the patient chart (`stripIdentityFields`).
              utenteNumber: true,
              taxIdNumber: true,
              nationalIdNumber: true,
              passportNumber: true,
              // Not a government ID — plaintext, no guard needed. Offered
              // alongside them so the doctor can fill it mid-consult and have
              // it land on the prescription.
              preferredPharmacy: true,
              // Canonical DOB. The card's editable row writes the profile, so
              // it must also READ the profile — showing the appointment's
              // booking-time snapshot instead would make a successful save look
              // like it silently reverted on the next page load.
              dateOfBirth: true,
            },
          }),
          // Cross-jurisdiction prescription: the referring doctor's disclosed
          // consultation record. Null for every ordinary appointment. Read here
          // rather than only on the request inbox because the inbox card
          // vanishes the moment the request is decided — the prescriber needs
          // the record they prescribed against to stay open afterwards.
          getDisclosedCrossBorderRecord(appt.id, {
            doctorId: auth.doctorId ?? null,
            isAdmin: auth.role === "ADMIN",
          }).catch(() => null),
        ]);

        // Decryption is best-effort: a legacy plaintext row, a rotated key or
        // corrupt ciphertext must not take down the whole appointment view.
        //
        // Every identity field, in every market — see patient-identity-fields.ts
        // for why this is no longer per-country. Note `utenteNumber` is no
        // longer gated on `BookingSetting.collectUtenteNumber` either: that
        // flag governs whether the BOOKING FORM asks for it, which is a
        // separate question from whether the treating doctor may read one that
        // is already on file.
        const identityFields = doctorVisibleIdentityFields();
        const decryptOrNull = (value: string | null) => {
          if (!value) return null;
          try {
            return decryptPhi(value);
          } catch {
            return null;
          }
        };
        let utenteNumber = decryptOrNull(patientProfile?.utenteNumber ?? null);
        let taxIdNumber = decryptOrNull(patientProfile?.taxIdNumber ?? null);
        let nationalIdNumber = decryptOrNull(patientProfile?.nationalIdNumber ?? null);
        let passportNumber = decryptOrNull(patientProfile?.passportNumber ?? null);
        const preferredPharmacy = patientProfile?.preferredPharmacy ?? null;

        // An identity number is a separate disclosure from the consult note,
        // so it gets its own SENSITIVE_PROFILE entry in MedicalAccessLog —
        // matching /api/doctor/patients/:email/profile. Logged only when a
        // value is actually returned, so an empty card leaves no false trail.
        if (
          patientProfile &&
          (utenteNumber || taxIdNumber || nationalIdNumber || passportNumber)
        ) {
          try {
            await guardMedicalRead(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              {
                patientProfileId: patientProfile.id,
                resourceType: "SENSITIVE_PROFILE",
                accessAction: "VIEWED",
                relatedAppointmentId: appt.id,
              },
            );
          } catch (guardError) {
            if (guardError instanceof MedicalAccessDeniedError) {
              // Denied access to the identity fields alone must not 403 the
              // consultation — drop the numbers and serve the rest.
              utenteNumber = null;
              taxIdNumber = null;
              nationalIdNumber = null;
              passportNumber = null;
            } else {
              throw guardError;
            }
          }
        }

        return okResponse({
          appointment: {
            ...appt,
            scheduledAt: appt.scheduledAt?.toISOString() ?? null,
            dateOfBirth: appt.dateOfBirth?.toISOString() ?? null,
            createdAt: appt.createdAt.toISOString(),
            clinicTimezone: bookingSetting.timezone,
            globalHealthNumber: patientProfile?.globalHealthNumber ?? null,
            addressLine1: patientProfile?.addressLine1 ?? null,
            addressLine2: patientProfile?.addressLine2 ?? null,
            addressCity: patientProfile?.addressCity ?? null,
            addressState: patientProfile?.addressState ?? null,
            addressPostalCode: patientProfile?.addressPostalCode ?? null,
            addressCountryCode: patientProfile?.addressCountryCode ?? null,
            // Canonical DOB, separate from the booking-time `dateOfBirth`
            // above: the card's editable row writes and reads this one.
            profileDateOfBirth: patientProfile?.dateOfBirth?.toISOString() ?? null,
            utenteNumber,
            taxIdNumber,
            nationalIdNumber,
            passportNumber,
            preferredPharmacy,
            // The portal renders exactly these as editable rows. Sent rather
            // than re-derived client-side so what is disclosed and what is
            // offered for editing cannot drift apart.
            identityFields: Array.from(identityFields),
            crossBorderSource,
          },
          consultation: consultation
            ? {
                ...consultation,
                signedAt: consultation.signedAt?.toISOString() ?? null,
                createdAt: consultation.createdAt.toISOString(),
                updatedAt: consultation.updatedAt.toISOString(),
              }
            : null,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load consultation"));
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = patchBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid consultation update", body.error.flatten()));
      }
      try {
        const appt = await findOwnedAppointment(auth.doctorId, request.params.id);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }

        const existing = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
          select: { id: true, status: true },
        });
        if (existing && existing.status === "SIGNED") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed and cannot be edited"));
        }

        const data = {
          ...(body.data.chiefComplaint !== undefined && {
            chiefComplaint: body.data.chiefComplaint,
          }),
          ...(body.data.subjective !== undefined && {
            subjective: body.data.subjective,
          }),
          ...(body.data.objective !== undefined && {
            objective: body.data.objective,
          }),
          ...(body.data.assessment !== undefined && {
            assessment: body.data.assessment,
          }),
          ...(body.data.plan !== undefined && { plan: body.data.plan }),
        };

        const consultation = await prisma.consultation.upsert({
          where: { appointmentId: appt.id },
          create: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            ...data,
          },
          update: data,
        });

        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CONSULT_SAVED",
          entityType: "Consultation",
          entityId: consultation.id,
          metadata: { appointmentId: appt.id },
          request,
        }).catch(() => {});

        return okResponse(
          {
            consultation: {
              ...consultation,
              signedAt: consultation.signedAt?.toISOString() ?? null,
              createdAt: consultation.createdAt.toISOString(),
              updatedAt: consultation.updatedAt.toISOString(),
            },
          },
          "Consultation saved",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save consultation"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation/sign",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await findOwnedAppointment(auth.doctorId, request.params.id);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const existing = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
        });
        if (!existing) {
          return reply
            .status(400)
            .send(errorResponse("Add notes before signing"));
        }
        if (existing.status === "SIGNED") {
          return okResponse(
            {
              consultation: {
                ...existing,
                signedAt: existing.signedAt?.toISOString() ?? null,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
              },
            },
            "Already signed",
          );
        }
        const consultation = await prisma.consultation.update({
          where: { id: existing.id },
          data: { status: "SIGNED", signedAt: new Date() },
        });
        // Sign also starts the 24h patient↔doctor chat lock window
        // (independent of admin moving the appointment to COMPLETED).
        // Only set the first time so doctor re-signs (out of scope today)
        // wouldn't reset the lock countdown.
        await prisma.appointment.update({
          where: { id: appt.id, consultationCompletedAt: null },
          data: { consultationCompletedAt: new Date() },
        }).catch(() => {
          // If row already has the timestamp, the WHERE narrowing
          // returns no rows — Prisma throws P2025. Swallow; chat lock
          // is already counting from the first sign.
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CONSULT_SIGNED",
          entityType: "Consultation",
          entityId: consultation.id,
          metadata: { appointmentId: appt.id },
          request,
        }).catch(() => {});
        notifyAdmins("CONSULT_SIGNED", {
          appointmentId: appt.id,
          snippet: `${appt.fullName} · consult signed`,
          byUserName: auth.fullName,
          byRole: "DOCTOR",
        }).catch(() => {});
        return okResponse(
          {
            consultation: {
              ...consultation,
              signedAt: consultation.signedAt?.toISOString() ?? null,
              createdAt: consultation.createdAt.toISOString(),
              updatedAt: consultation.updatedAt.toISOString(),
            },
          },
          "Consultation signed",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not sign consultation"));
      }
    },
  );
};

export default consultationsRoute;
