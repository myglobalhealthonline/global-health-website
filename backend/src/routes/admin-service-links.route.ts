import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  ServiceNotFoundError,
  listAdminServiceLinks,
  replaceServiceLinks,
} from "../modules/service-links/service-links.service.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  serviceLinkIdParamsSchema,
  serviceLinksReplaceBodySchema,
} from "../validations/service-links.schema.js";

const adminServiceLinksRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/services/:serviceId/links", async (request, reply) => {
    const params = serviceLinkIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    try {
      const data = await listAdminServiceLinks(params.data.serviceId);
      if (!data) return reply.status(404).send(errorResponse("Service not found"));
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load service links"));
    }
  });

  app.put("/api/admin/services/:serviceId/links", async (request, reply) => {
    const params = serviceLinkIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    const body = serviceLinksReplaceBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid service links", body.error.flatten()));
    }
    try {
      const links = await replaceServiceLinks(params.data.serviceId, body.data);
      return okResponse({ links }, "Service links saved");
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save service links"));
    }
  });
};

export default adminServiceLinksRoute;
