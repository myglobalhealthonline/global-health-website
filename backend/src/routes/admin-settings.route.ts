import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  deleteSetting,
  getPublicReviewConfig,
  upsertSetting,
} from "../modules/settings/settings.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const aggregateSchema = z
  .object({
    rating: z.coerce.number().min(0).max(5),
    count: z.coerce.number().int().min(0),
    updatedAt: z.string().optional(),
  })
  .nullable();

const reviewSettingsSchema = z.object({
  trustpilot: z
    .object({
      businessUnitId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  google: z
    .object({
      placeId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  doctify: z
    .object({
      clinicId: z.string().trim().max(120).nullable().optional(),
      aggregate: aggregateSchema.optional(),
    })
    .optional(),
  primaryProvider: z.enum(["TRUSTPILOT", "GOOGLE", "DOCTIFY"]).nullable().optional(),
});

/**
 * Admin read/write of the review-provider config. The admin UI POSTs the
 * whole object; we upsert the affected `Setting` keys and delete keys whose
 * value is explicitly `null`.
 */
const adminSettingsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/settings/reviews", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
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
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const parsed = reviewSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid review settings", parsed.error.flatten()));
    }
    try {
      const body = parsed.data;
      const now = new Date().toISOString();
      const tasks: Array<Promise<unknown>> = [];

      function applyId(key: string, value: string | null | undefined) {
        if (value === undefined) return;
        if (value === null || value.trim() === "") {
          tasks.push(deleteSetting(key));
        } else {
          tasks.push(upsertSetting(key, value.trim()));
        }
      }
      function applyAggregate(key: string, value: { rating: number; count: number; updatedAt?: string } | null | undefined) {
        if (value === undefined) return;
        if (value === null) {
          tasks.push(deleteSetting(key));
        } else {
          tasks.push(
            upsertSetting(key, {
              rating: value.rating,
              count: value.count,
              updatedAt: value.updatedAt ?? now,
            }),
          );
        }
      }

      applyId("review.trustpilot.businessUnitId", body.trustpilot?.businessUnitId);
      applyAggregate("review.trustpilot.aggregate", body.trustpilot?.aggregate);
      applyId("review.google.placeId", body.google?.placeId);
      applyAggregate("review.google.aggregate", body.google?.aggregate);
      applyId("review.doctify.clinicId", body.doctify?.clinicId);
      applyAggregate("review.doctify.aggregate", body.doctify?.aggregate);
      if (body.primaryProvider !== undefined) {
        if (body.primaryProvider === null) {
          tasks.push(deleteSetting("review.primaryProvider"));
        } else {
          tasks.push(upsertSetting("review.primaryProvider", body.primaryProvider));
        }
      }

      await Promise.all(tasks);
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
