import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";

const patchProfileSchema = z
  .object({
    weightKg: z.number().positive().max(500).nullable().optional(),
    heightM: z.number().positive().max(3).nullable().optional(),
    bmi: z.number().positive().max(100).nullable().optional(),
    bloodType: z.string().trim().max(8).nullable().optional(),
    allergies: z.array(z.string().trim().max(200)).max(50).optional(),
    chronicDiseases: z.array(z.string().trim().max(200)).max(50).optional(),
    familyHistory: z.array(z.string().trim().max(200)).max(50).optional(),
    socialHabits: z.array(z.string().trim().max(200)).max(50).optional(),
    surgeries: z.array(z.string().trim().max(200)).max(50).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field" });

const doctorPatientProfileRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/profile",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const email = decodeURIComponent(request.params.email).trim().toLowerCase();
      const hasAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!hasAppt) {
        return reply.status(404).send(errorResponse("Patient not found"));
      }
      try {
        const profile = await prisma.patientProfile.findUnique({ where: { email } });
        return okResponse({
          profile: profile
            ? {
                ...profile,
                dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
                createdAt: profile.createdAt.toISOString(),
                updatedAt: profile.updatedAt.toISOString(),
              }
            : null,
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
      const email = decodeURIComponent(request.params.email).trim().toLowerCase();
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
        const profile = await prisma.patientProfile.upsert({
          where: { email },
          create: {
            email,
            fullName: appt.fullName,
            phone: appt.phone,
            ...body.data,
          },
          update: body.data,
        });
        return okResponse({
          profile: {
            ...profile,
            dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
            updatedAt: profile.updatedAt.toISOString(),
          },
        });
      } catch (error) {
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
