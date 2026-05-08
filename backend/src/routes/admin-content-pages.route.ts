import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  ContentPageCountryNotFoundError,
  createAdminContentPage,
  disableAdminContentPage,
  getAdminContentPageById,
  listAdminContentPages,
  purgeAdminContentPage,
  updateAdminContentPage,
} from "../modules/content-pages/content-pages.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminContentPageCreateBodySchema,
  adminContentPagesQuerySchema,
  adminContentPageUpdateBodySchema,
  contentPageIdParamsSchema,
} from "../validations/admin-content-pages.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof ContentPageCountryNotFoundError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for unique content page fields"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin content pages error"));
}

const adminContentPagesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/content-pages", async (request, reply) => {
    const query = adminContentPagesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid content page query", query.error.flatten()));
    }
    try {
      const data = await listAdminContentPages(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin content pages error"));
    }
  });

  app.get("/api/admin/content-pages/:id", async (request, reply) => {
    const params = contentPageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid content page id", params.error.flatten()));
    }
    try {
      const page = await getAdminContentPageById(params.data.id);
      if (!page) {
        return reply.status(404).send(errorResponse("Content page not found"));
      }
      return okResponse({ page });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin content page error"));
    }
  });

  app.post("/api/admin/content-pages", async (request, reply) => {
    const body = adminContentPageCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid content page payload", body.error.flatten()));
    }
    try {
      const page = await createAdminContentPage(body.data);
      return okResponse({ page }, "Content page created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/content-pages/:id", async (request, reply) => {
    const params = contentPageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid content page id", params.error.flatten()));
    }
    const body = adminContentPageUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid content page update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const page = await updateAdminContentPage(params.data.id, body.data);
      if (!page) {
        return reply.status(404).send(errorResponse("Content page not found"));
      }
      return okResponse({ page }, "Content page updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/content-pages/:id", async (request, reply) => {
    const params = contentPageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid content page id", params.error.flatten()));
    }
    try {
      const page = await disableAdminContentPage(params.data.id);
      if (!page) {
        return reply.status(404).send(errorResponse("Content page not found"));
      }
      return okResponse({ page }, "Content page deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/content-pages/:id/purge", async (request, reply) => {
    const params = contentPageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid content page id", params.error.flatten()));
    }
    try {
      const deleted = await purgeAdminContentPage(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Content page not found"));
      }
      return okResponse({}, "Content page deleted");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });
};

export default adminContentPagesRoute;
