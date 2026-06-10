import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  getDataPolicy,
  upsertDataPolicy,
  listDataPolicies,
} from "../modules/data-policy/country-data-policy.service.js";

const adminDataPolicyRoute: FastifyPluginAsync = async (app) => {
  // ─── List all country data policies ──────────────────────────────────────

  app.get(
    "/api/admin/data-policy",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      try {
        const policies = await listDataPolicies();
        return okResponse({ policies });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list data policies");
      }
    },
  );

  // ─── Get single country policy ────────────────────────────────────────────

  app.get<{ Params: { countryCode: string } }>(
    "/api/admin/data-policy/:countryCode",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const countryCode = request.params.countryCode.toUpperCase().trim();
      try {
        const policy = await getDataPolicy(countryCode);
        if (!policy) return reply.status(404).send(errorResponse("No policy found for this country"));
        return okResponse({ policy });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not load data policy");
      }
    },
  );

  // ─── Create or update country policy ─────────────────────────────────────

  const upsertSchema = z.object({
    retentionYears: z.number().int().min(1).max(100),
    storageRegion: z.string().trim().min(2).max(20),
    requiresLocalStorage: z.boolean().default(false),
    legalNotes: z.string().max(2000).nullable().optional(),
  });

  app.put<{ Params: { countryCode: string } }>(
    "/api/admin/data-policy/:countryCode",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const countryCode = request.params.countryCode.toUpperCase().trim();
      if (!/^[A-Z]{2}$/.test(countryCode)) {
        return reply.status(400).send(errorResponse("Country code must be 2 uppercase letters"));
      }

      const body = upsertSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid policy payload", body.error.flatten()));
      }

      // Look up the Country row so we can pass countryId.
      const countryRow = await prisma.country.findUnique({
        where: { code: countryCode },
        select: { id: true },
      });
      if (!countryRow) {
        return reply.status(404).send(errorResponse("Country not found — add it to the countries table first"));
      }

      try {
        await upsertDataPolicy({
          countryId: countryRow.id,
          countryCode,
          retentionYears: body.data.retentionYears,
          storageRegion: body.data.storageRegion,
          requiresLocalStorage: body.data.requiresLocalStorage,
          legalNotes: body.data.legalNotes ?? undefined,
        });
        return okResponse({ saved: true }, "Data policy saved");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not save data policy");
      }
    },
  );
};

export default adminDataPolicyRoute;
