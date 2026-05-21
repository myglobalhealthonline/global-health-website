import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  applyPatientProfileUpdate,
  PricingPlanCountryMismatchError,
  serializeProfile,
} from "../modules/patient-profile/patient-profile.service.js";

/**
 * Patient self-service profile endpoints. The patient can edit
 * identity / address / pharmacy / plan and their own clinical baseline
 * (allergies, blood type, etc.), but NOT the doctor-only alerts —
 * `statusAlert` / `clinicAlert` are missing from this schema so the
 * .strict() guard rejects any attempt to set them. Doctor + admin
 * endpoints accept those fields separately.
 */
const stringField = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const patientPatchSchema = z
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
    pricingPlanId: stringField(64),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

const accountProfileRoute: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireAuth);

  app.get("/api/account/profile", async (request, reply) => {
    if (!request.authUser || request.authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Patient access required"));
    }
    try {
      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
      });
      return okResponse({
        profile: serializeProfile(profile, { includeAlerts: false }),
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load profile"));
    }
  });

  app.patch("/api/account/profile", async (request, reply) => {
    if (!request.authUser || request.authUser.role !== "PATIENT") {
      return reply.status(403).send(errorResponse("Patient access required"));
    }
    const body = patientPatchSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid profile", body.error.flatten()));
    }
    try {
      const { dateOfBirth, ...rest } = body.data;
      const { profile } = await applyPatientProfileUpdate(request.authUser.email, {
        ...rest,
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
          : {}),
      });
      return okResponse({
        profile: serializeProfile(profile, { includeAlerts: false }),
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
  });
};

export default accountProfileRoute;
