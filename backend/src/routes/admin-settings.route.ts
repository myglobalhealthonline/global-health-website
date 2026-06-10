import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { getPublicReviewConfig } from "../modules/settings/settings.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { reviewSettingsSchema } from "../validations/admin-settings.schema.js";

/**
 * Admin read/write of the review-provider config. The admin UI POSTs the
 * whole object; we upsert the affected `Setting` keys and delete keys whose
 * value is explicitly `null`.
 */
const adminSettingsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/settings/reviews", async (request, reply) => {
    try {
      const config = await getPublicReviewConfig();
      return okResponse(config);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not read review settings"));
    }
  });

  app.patch("/api/admin/settings/reviews", async (request, reply) => {
    const parsed = reviewSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid review settings", parsed.error.flatten()));
    }
    try {
      const body = parsed.data;
      const now = new Date().toISOString();
      // Build the writes as lazy Prisma ops and run them in ONE transaction so
      // a partial failure can't leave the review config half-updated. All keys
      // are the hardcoded review.* constants below (the Setting allowlist).
      // deleteMany (not delete) is used so removing an absent key is a no-op
      // rather than aborting the transaction with P2025.
      const ops: Prisma.PrismaPromise<unknown>[] = [];

      function setKey(key: string, value: Prisma.InputJsonValue) {
        ops.push(
          prisma.setting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        );
      }
      function clearKey(key: string) {
        ops.push(prisma.setting.deleteMany({ where: { key } }));
      }

      function applyId(key: string, value: string | null | undefined) {
        if (value === undefined) return;
        if (value === null || value.trim() === "") clearKey(key);
        else setKey(key, value.trim());
      }
      function applyAggregate(key: string, value: { rating: number; count: number; updatedAt?: string } | null | undefined) {
        if (value === undefined) return;
        if (value === null) clearKey(key);
        else setKey(key, { rating: value.rating, count: value.count, updatedAt: value.updatedAt ?? now });
      }

      applyId("review.trustpilot.businessUnitId", body.trustpilot?.businessUnitId);
      applyAggregate("review.trustpilot.aggregate", body.trustpilot?.aggregate);
      applyId("review.google.placeId", body.google?.placeId);
      applyAggregate("review.google.aggregate", body.google?.aggregate);
      applyId("review.doctify.clinicId", body.doctify?.clinicId);
      applyAggregate("review.doctify.aggregate", body.doctify?.aggregate);
      if (body.primaryProvider !== undefined) {
        if (body.primaryProvider === null) clearKey("review.primaryProvider");
        else setKey("review.primaryProvider", body.primaryProvider);
      }

      await prisma.$transaction(ops);
      const config = await getPublicReviewConfig();
      return okResponse(config, "Review settings saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save review settings"));
    }
  });
};

export default adminSettingsRoute;
