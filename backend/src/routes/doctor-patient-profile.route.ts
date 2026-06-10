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
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { logAccess } from "../lib/access-log.js";

const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

/**
 * Doctor-side patch — accepts the full clinical + administrative
 * surface including alerts, which patient-self endpoints reject.
 */
const patchProfileSchema = z
  .object({
    fullName: stringField(200),
    phone: stringField(40),
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
          await logAccess({
            patientProfileId: profile.id,
            globalHealthNumber: profile.globalHealthNumber,
            accessedByUserId: auth.userId,
            accessedByRole: "DOCTOR",
            accessedResourceType: "PATIENT_PROFILE",
            accessAction: "VIEW",
            ipAddress: request.ip,
            userAgent: request.headers["user-agent"] ?? null,
          });
        }
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
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
          { fallbackFullName: appt.fullName, fallbackPhone: appt.phone },
        );
        if (alertChanges.statusAlert || alertChanges.clinicAlert) {
          const actor = await resolveOptionalAuthUser(request);
          recordAudit({
            actorUserId: actor?.id ?? null,
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
          }).catch(() => {});
        }
        return okResponse({
          profile: serializeProfile(profile, { includeAlerts: true }),
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
