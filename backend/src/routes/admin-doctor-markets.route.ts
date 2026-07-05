import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  DoctorMarketNotFoundError,
  getAdminDoctorMarketBank,
  listAdminDoctorMarkets,
  updateAdminDoctorMarket,
} from "../modules/doctor-market-profiles/doctor-market-profiles.service.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  adminDoctorMarketPatchBodySchema,
  doctorMarketParamsSchema,
} from "../validations/doctor-market-profiles.schema.js";

const doctorIdOnlyParamsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
});

const revealQuerySchema = z.object({
  reveal: z
    .enum(["1", "true", "0", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

const adminDoctorMarketsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/doctors/:doctorId/markets", async (request, reply) => {
    const params = doctorIdOnlyParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const data = await listAdminDoctorMarkets(params.data.doctorId);
      if (!data) return reply.status(404).send(errorResponse("Doctor profile not found"));
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctor markets"));
    }
  });

  app.patch("/api/admin/doctors/:doctorId/markets/:countryId", async (request, reply) => {
    const params = doctorMarketParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor market", params.error.flatten()));
    }
    const body = adminDoctorMarketPatchBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid doctor market update", body.error.flatten()));
    }

    try {
      const market = await updateAdminDoctorMarket(
        params.data.doctorId,
        params.data.countryId,
        body.data,
      );
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: params.data.doctorId,
        metadata: {
          marketCountryId: params.data.countryId,
          changed: Object.keys(body.data),
        },
        request,
      }).catch(() => {});
      return okResponse({ market }, "Doctor market profile saved");
    } catch (error) {
      if (error instanceof DoctorMarketNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save doctor market"));
    }
  });

  app.get(
    "/api/admin/doctors/:doctorId/markets/:countryId/bank",
    async (request, reply) => {
      const params = doctorMarketParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid doctor market", params.error.flatten()));
      }
      const query = revealQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse("Invalid bank query", query.error.flatten()));
      }

      try {
        const bank = await getAdminDoctorMarketBank(
          params.data.doctorId,
          params.data.countryId,
          query.data.reveal ?? false,
        );
        if (!bank) return reply.status(404).send(errorResponse("Doctor market not found"));
        if (query.data.reveal && bank.ibanSet) {
          const actor = resolveAdminSessionActor(request);
          recordAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? "ADMIN",
            action: "DOCTOR_BANK_VIEWED",
            entityType: "Doctor",
            entityId: params.data.doctorId,
            metadata: { marketCountryId: params.data.countryId },
            request,
          }).catch(() => {});
        }
        return okResponse({ bank });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load market bank details"));
      }
    },
  );
};

export default adminDoctorMarketsRoute;
