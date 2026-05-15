import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminPage,
  disableAdminPage,
  getAdminPageById,
  listAdminPages,
  PageCountryNotFoundError,
  PageLocaleNotSupportedError,
  purgeAdminPage,
  updateAdminPage,
} from "../modules/pages/pages.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminPageCreateBodySchema,
  adminPageUpdateBodySchema,
  adminPagesQuerySchema,
  pageIdParamsSchema,
} from "../validations/admin-pages.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handlePageWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof PageCountryNotFoundError || error instanceof PageLocaleNotSupportedError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply
      .status(409)
      .send(errorResponse("A page already exists for this country, pageKey, and locale"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin pages error"));
}

const adminPagesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/pages", async (request, reply) => {
    const query = adminPagesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin pages query", query.error.flatten()));
    }
    try {
      const data = await listAdminPages(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin pages error"));
    }
  });

  app.get("/api/admin/pages/:id", async (request, reply) => {
    const params = pageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid page id", params.error.flatten()));
    }
    try {
      const page = await getAdminPageById(params.data.id);
      if (!page) {
        return reply.status(404).send(errorResponse("Page not found"));
      }
      return okResponse({ page });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin pages error"));
    }
  });

  app.post("/api/admin/pages", async (request, reply) => {
    const body = adminPageCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid page payload", body.error.flatten()));
    }
    try {
      const page = await createAdminPage(body.data);
      return reply.status(201).send(okResponse({ page }));
    } catch (error) {
      return handlePageWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/pages/:id", async (request, reply) => {
    const params = pageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid page id", params.error.flatten()));
    }
    const body = adminPageUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid page payload", body.error.flatten()));
    }
    try {
      const page = await updateAdminPage(params.data.id, body.data);
      if (!page) {
        return reply.status(404).send(errorResponse("Page not found"));
      }
      return okResponse({ page });
    } catch (error) {
      return handlePageWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/pages/:id", async (request, reply) => {
    const params = pageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid page id", params.error.flatten()));
    }
    try {
      const page = await disableAdminPage(params.data.id);
      if (!page) {
        return reply.status(404).send(errorResponse("Page not found"));
      }
      return okResponse({ page });
    } catch (error) {
      return handlePageWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/pages/:id/purge", async (request, reply) => {
    const params = pageIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid page id", params.error.flatten()));
    }
    try {
      const ok = await purgeAdminPage(params.data.id);
      if (!ok) {
        return reply.status(404).send(errorResponse("Page not found"));
      }
      return okResponse({ deleted: true });
    } catch (error) {
      return handlePageWriteError(app, reply, error);
    }
  });
};

export default adminPagesRoute;
