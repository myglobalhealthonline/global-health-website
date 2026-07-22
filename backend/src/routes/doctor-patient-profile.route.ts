import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  serializeProfile,
} from "../modules/patient-profile/patient-profile.service.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { resolveAuditActor } from "../utils/request-auth.js";
import { guardMedicalRead, MedicalAccessDeniedError } from "../utils/guard-medical-read.js";

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

// Government-ID numbers are intentionally withheld from the doctor portal
// (GDPR plan): doctors see idVerificationStatus only, never the numbers.
// One deliberate carve-out lives outside this route: the appointment
// workspace card shows Número de Utente for markets with
// `BookingSetting.collectUtenteNumber` (PT), because it is the SNS number
// required to reach national records for electronic prescription. It is
// logged as a SENSITIVE_PROFILE read there. See consultations.route.ts.
function stripIdentityFields<T extends Record<string, unknown> | null>(profile: T): T {
  if (!profile) return profile;
  const {
    nationalIdNumber: _nationalIdNumber,
    taxIdNumber: _taxIdNumber,
    passportNumber: _passportNumber,
    utenteNumber: _utenteNumber,
    ...rest
  } = profile as Record<string, unknown>;
  return rest as T;
}

/**
 * Doctor-side patch — accepts the full clinical + administrative
 * surface including alerts, which patient-self endpoints reject.
 */
const patchProfileSchema = z
  .object({
    fullName: stringField(200),
    // phone deliberately excluded — the doctor UI never sends it, and a
    // verified patient's phone can only be changed by the patient or admin
    // (see applyPatientProfileUpdate's actorRole guard).
    dateOfBirth: z.string().datetime().nullable().optional(),
    weightKg: z.number().positive().max(500).nullable().optional(),
    heightM: z.number().positive().max(3).nullable().optional(),
    bmi: z.number().positive().max(100).nullable().optional(),
    bloodType: stringField(8),
    allergies: z.array(z.string().trim().max(200)).max(50).optional(),
    chronicDiseases: z.array(z.string().trim().max(200)).max(50).optional(),
    familyHistory: z.array(z.string().trim().max(200)).max(50).optional(),
    socialHabits: z.array(z.string().trim().max(200)).max(50).optional(),
    surgeries: z.array(z.string().trim().max(200)).max(50).optional(),
    usualMedication: z.array(z.string().trim().max(200)).max(50).optional(),
    bloodPressureSystolic: z.number().int().positive().max(400).nullable().optional(),
    bloodPressureDiastolic: z.number().int().positive().max(300).nullable().optional(),
    nationalIdNumber: stringField(64),
    taxIdNumber: stringField(64),
    passportNumber: stringField(64),
    addressLine1: stringField(200),
    addressLine2: stringField(200),
    addressCity: stringField(120),
    addressPostalCode: stringField(32),
    addressCountryCode: stringField(8),
    preferredPharmacy: stringField(200),
    statusAlert: stringField(500),
    clinicAlert: stringField(500),
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

const doctorPatientProfileRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/profile",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({ where: { email } });
        if (profile) {
          // Central guard: authorizes + logs (MedicalAccessLog) + alerts as a
          // side effect. In shadow mode it never blocks; in enforce mode a
          // denied decision throws MedicalAccessDeniedError → 403.
          try {
            await guardMedicalRead(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              {
                patientProfileId: profile.id,
                resourceType: "SENSITIVE_PROFILE",
                accessAction: "VIEWED",
                relatedAppointmentId: hasAppt.id,
              },
            );
          } catch (guardError) {
            if (guardError instanceof MedicalAccessDeniedError) {
              return reply
                .status(403)
                .send(errorResponse("Access to this medical record is not permitted"));
            }
            throw guardError;
          }
        }
        return okResponse({
          profile: stripIdentityFields(serializeProfile(profile, { includeAlerts: true })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load profile"));
      }
    },
  );

  app.patch<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/profile",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }
      const body = patchProfileSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid profile", body.error.flatten()));
      }
      const appt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { fullName: true, phone: true },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }

      // Central guard: authorize the profile edit before writing; logs the
      // UPDATED action (MedicalAccessLog) as a side effect. Skipped when the
      // profile doesn't exist yet (first write creates it from appointment
      // fallbacks — nothing to guard until the record exists).
      const existingProfile = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingProfile) {
        try {
          await guardMedicalRead(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            {
              patientProfileId: existingProfile.id,
              resourceType: "SENSITIVE_PROFILE",
              accessAction: "UPDATED",
            },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply
              .status(403)
              .send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
      }

      try {
        const { dateOfBirth, ...rest } = body.data;
        const { profile, alertChanges } = await applyPatientProfileUpdate(
          email,
          {
            ...rest,
            ...(dateOfBirth !== undefined
              ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
              : {}),
          },
          {
            fallbackFullName: appt.fullName,
            fallbackPhone: appt.phone,
            actor: { userId: auth.userId, role: auth.role },
            ipAddress: request.ip,
          },
        );
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          // S-008: resolveOptionalAuthUser only resolves PATIENT/ADMIN
          // sessions and returns null for DOCTOR, which previously logged
          // this PHI-adjacent alert change with a null actor whenever a
          // doctor made it. resolveAuditActor reads the real (id, role)
          // for every authenticated role.
          const actor = resolveAuditActor(request);
          await recordCriticalAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "DOCTOR",
            action: "PATIENT_ALERT_UPDATED",
            entityType: "PatientProfile",
            entityId: profile?.id ?? email,
            metadata: {
              email,
              changes: alertChanges,
              statusAlert: profile?.statusAlert ?? null,
              clinicAlert: profile?.clinicAlert ?? null,
            },
            request,
          });
        }
        return okResponse({
          profile: stripIdentityFields(serializeProfile(profile, { includeAlerts: true })),
        });
      } catch (error) {
        if (error instanceof PricingPlanCountryMismatchError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update profile"));
      }
    },
  );
};

export default doctorPatientProfileRoute;
