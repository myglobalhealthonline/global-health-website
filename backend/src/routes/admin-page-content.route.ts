import type { FastifyPluginAsync } from "fastify";
import {
  getAdminPageContent,
  listAdminPageContent,
  PageContentCountryNotFoundError,
  PageContentLocaleNotSupportedError,
  upsertPageContent,
} from "../modules/page-content/page-content.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  pageContentAdminParamsSchema,
  pageContentUpsertBodySchema,
} from "../validations/admin-page-content.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handlePageContentWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (
    error instanceof PageContentCountryNotFoundError ||
    error instanceof PageContentLocaleNotSupportedError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin page-content error"));
}

const adminPageContentRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/page-content", async (_request, reply) => {
    try {
      const items = await listAdminPageContent();
      return okResponse({ items });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin page-content error"));
    }
  });

  app.get("/api/admin/page-content/:countryId/:pageKey", async (request, reply) => {
    const params = pageContentAdminParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page-content lookup", params.error.flatten()));
    }
    try {
      const record = await getAdminPageContent(params.data.countryId, params.data.pageKey);
      return okResponse({ record });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin page-content error"));
    }
  });

  app.put("/api/admin/page-content/:countryId/:pageKey", async (request, reply) => {
    const params = pageContentAdminParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page-content lookup", params.error.flatten()));
    }
    const body = pageContentUpsertBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page-content payload", body.error.flatten()));
    }
    try {
      const record = await upsertPageContent(params.data.countryId, params.data.pageKey, body.data);
      return okResponse({ record });
    } catch (error) {
      return handlePageContentWriteError(app, reply, error);
    }
  });
};

export default adminPageContentRoute;
