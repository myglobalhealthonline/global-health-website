import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  PartnerCountryNotFoundError,
  createPartner,
  deletePartner,
  listAdminPartners,
  updatePartner,
} from "../modules/partners/partners.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import {
  adminPartnersQuerySchema,
  partnerCreateBodySchema,
  partnerUpdateBodySchema,
} from "../validations/admin-partners.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for per-country partners (the "Our partners" marquee on the
 * country home page). Admin-only.
 *
 *   GET    /api/admin/partners?countryId=...
 *   POST   /api/admin/partners
 *   PATCH  /api/admin/partners/:id
 *   DELETE /api/admin/partners/:id
 */

const idParam = z.string().trim().min(1).max(64);

const adminPartnersRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/partners", async (request, reply) => {
    const query = adminPartnersQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid partners query", query.error.flatten()));
    }
    try {
      const partners = await listAdminPartners(query.data.countryId);
      return okResponse({ partners });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load partners"));
    }
  });

  app.post("/api/admin/partners", async (request, reply) => {
    const body = partnerCreateBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid partner", body.error.flatten()));
    }
    const { countryId, ...rest } = body.data;
    try {
      const partner = await createPartner(countryId, rest);
      return okResponse({ partner }, "Partner created");
    } catch (error) {
      if (error instanceof PartnerCountryNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create partner"));
    }
  });

  app.patch<{ Params: { id: string } }>("/api/admin/partners/:id", async (request, reply) => {
    if (!idParam.safeParse(request.params.id).success) {
      return reply.status(400).send(errorResponse("Invalid partner id"));
    }
    const body = partnerUpdateBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid partner", body.error.flatten()));
    }
    try {
      const partner = await updatePartner(request.params.id, body.data);
      if (!partner) return reply.status(404).send(errorResponse("Partner not found"));
      return okResponse({ partner }, "Partner saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update partner"));
    }
  });

  app.delete<{ Params: { id: string } }>("/api/admin/partners/:id", async (request, reply) => {
    if (!idParam.safeParse(request.params.id).success) {
      return reply.status(400).send(errorResponse("Invalid partner id"));
    }
    try {
      const ok = await deletePartner(request.params.id);
      if (!ok) return reply.status(404).send(errorResponse("Partner not found"));
      return okResponse({ deleted: true });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not delete partner"));
    }
  });
};

export default adminPartnersRoute;
