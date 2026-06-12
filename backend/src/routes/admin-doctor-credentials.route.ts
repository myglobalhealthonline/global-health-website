import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createDoctorCredential,
  deleteDoctorCredential,
  listDoctorCredentials,
  updateDoctorCredential,
} from "../modules/doctor-credentials/doctor-credentials.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for confirmed extra doctor credentials (FRCP, MICGP, fellowships)
 * that power the profile display + Physician hasCredential/recognizedBy schema.
 *
 *   GET    /api/admin/doctors/:doctorId/credentials
 *   POST   /api/admin/doctors/:doctorId/credentials
 *   PATCH  /api/admin/doctors/:doctorId/credentials/:credentialId
 *   DELETE /api/admin/doctors/:doctorId/credentials/:credentialId
 */

const idParam = z.string().trim().min(1).max(64);

const createSchema = z
  .object({
    countryCode: z.string().trim().max(8).optional().nullable(),
    label: z.string().trim().min(1).max(160),
    bodyName: z.string().trim().min(1).max(200),
    bodyUrl: z.string().trim().url().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateSchema = createSchema.partial();

const adminDoctorCredentialsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { doctorId: string } }>(
    "/api/admin/doctors/:doctorId/credentials",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.doctorId).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      try {
        const rows = await listDoctorCredentials(request.params.doctorId);
        return okResponse({ credentials: rows });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load credentials"));
      }
    },
  );

  app.post<{ Params: { doctorId: string } }>(
    "/api/admin/doctors/:doctorId/credentials",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.doctorId).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      const body = createSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid credential", body.error.flatten()));
      }
      try {
        const row = await createDoctorCredential(request.params.doctorId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Doctor not found"));
        return okResponse({ credential: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create credential"));
      }
    },
  );

  app.patch<{ Params: { doctorId: string; credentialId: string } }>(
    "/api/admin/doctors/:doctorId/credentials/:credentialId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.credentialId).success) {
        return reply.status(400).send(errorResponse("Invalid credential id"));
      }
      const body = updateSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid credential", body.error.flatten()));
      }
      try {
        const row = await updateDoctorCredential(request.params.credentialId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Credential not found"));
        return okResponse({ credential: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update credential"));
      }
    },
  );

  app.delete<{ Params: { doctorId: string; credentialId: string } }>(
    "/api/admin/doctors/:doctorId/credentials/:credentialId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.credentialId).success) {
        return reply.status(400).send(errorResponse("Invalid credential id"));
      }
      try {
        const ok = await deleteDoctorCredential(request.params.credentialId);
        if (!ok) return reply.status(404).send(errorResponse("Credential not found"));
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete credential"));
      }
    },
  );
};

export default adminDoctorCredentialsRoute;
