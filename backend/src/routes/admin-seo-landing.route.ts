import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  SeoLandingNotFoundError,
  deleteLandingPage,
  listAdminLandingPages,
  upsertLandingPage,
} from "../modules/seo-landing/seo-landing.service.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  seoLandingIdParamsSchema,
  seoLandingPageParamsSchema,
  seoLandingUpsertBodySchema,
} from "../validations/seo-landing.schema.js";

const adminSeoLandingRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/countries/:countryId/landing-pages", async (request, reply) => {
    const params = seoLandingIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    try {
      const data = await listAdminLandingPages(params.data.countryId);
      if (!data) return reply.status(404).send(errorResponse("Country not found"));
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load landing pages"));
    }
  });

  app.put("/api/admin/countries/:countryId/landing-pages", async (request, reply) => {
    const params = seoLandingIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    const body = seoLandingUpsertBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid landing page", body.error.flatten()));
    }
    try {
      const page = await upsertLandingPage(params.data.countryId, body.data);
      return okResponse({ page }, "Landing page saved");
    } catch (error) {
      if (error instanceof SeoLandingNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save landing page"));
    }
  });

  app.delete(
    "/api/admin/countries/:countryId/landing-pages/:pageId",
    async (request, reply) => {
      const params = seoLandingPageParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
      }
      try {
        const deleted = await deleteLandingPage(params.data.pageId);
        if (!deleted) return reply.status(404).send(errorResponse("Landing page not found"));
        return okResponse({}, "Landing page deleted");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete landing page"));
      }
    },
  );
};

export default adminSeoLandingRoute;
