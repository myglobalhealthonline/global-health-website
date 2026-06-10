import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  DoctorOrCountryNotFoundError,
  listDoctorRegistrations,
  upsertDoctorRegistration,
} from "../modules/doctor-registrations/doctor-registrations.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for per-country doctor medical registrations. The shape
 * lives on the existing DoctorCountry M:N link so the same row that
 * lists the doctor on a country's roster also carries their license
 * number for that country's PDF templates.
 *
 * Routes:
 *   GET  /api/admin/doctors/:doctorId/registrations
 *   PATCH /api/admin/doctors/:doctorId/registrations/:countryId
 */

const upsertBodySchema = z
  .object({
    chamberEntity: z.string().trim().max(64).optional().nullable(),
    registrationNumber: z.string().trim().max(64).optional().nullable(),
    isVerified: z.boolean().optional(),
  })
  .strict();

const idParam = z.string().trim().min(1).max(64);

const adminDoctorRegistrationsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get<{ Params: { doctorId: string } }>(
    "/api/admin/doctors/:doctorId/registrations",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.doctorId).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      try {
        const rows = await listDoctorRegistrations(request.params.doctorId);
        return okResponse({ registrations: rows });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load registrations"));
      }
    },
  );

  app.patch<{ Params: { doctorId: string; countryId: string } }>(
    "/api/admin/doctors/:doctorId/registrations/:countryId",
    async (request, reply) => {
      if (
        !idParam.safeParse(request.params.doctorId).success ||
        !idParam.safeParse(request.params.countryId).success
      ) {
        return reply.status(400).send(errorResponse("Invalid id parameter"));
      }
      const body = upsertBodySchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid registration payload", body.error.flatten()));
      }
      try {
        const row = await upsertDoctorRegistration(
          request.params.doctorId,
          request.params.countryId,
          body.data,
        );
        const actor = await resolveOptionalAuthUser(request);
        recordAudit({
          actorUserId: actor?.id ?? null,
          actorRole: actor?.role ?? "ADMIN",
          action: "DOCTOR_UPDATED",
          entityType: "Doctor",
          entityId: request.params.doctorId,
          metadata: {
            registration: {
              countryCode: row.countryCode,
              chamberEntity: row.chamberEntity,
              registrationNumber: row.registrationNumber,
              isVerified: row.isVerified,
            },
          },
          request,
        }).catch(() => {});
        return okResponse({ registration: row });
      } catch (error) {
        if (error instanceof DoctorOrCountryNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save registration"));
      }
    },
  );
};

export default adminDoctorRegistrationsRoute;
