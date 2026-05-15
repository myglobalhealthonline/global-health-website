import type { FastifyPluginAsync } from "fastify";
import { getPublicPage } from "../modules/pages/pages.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  publicPageParamsSchema,
  publicPageQuerySchema,
} from "../validations/admin-pages.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { prisma } from "../db/prisma.js";

const pagesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries/:countryCode/pages/:pageKey", async (request, reply) => {
    const params = publicPageParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page lookup params", params.error.flatten()));
    }
    const query = publicPageQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page lookup query", query.error.flatten()));
    }

    try {
      let locale = query.data.locale;
      if (!locale) {
        const country = await prisma.country.findUnique({
          where: { code: params.data.countryCode },
          select: { defaultLocale: true },
        });
        if (!country) {
          return reply.status(404).send(errorResponse("Country not found"));
        }
        locale = country.defaultLocale;
      }

      const page = await getPublicPage(params.data.countryCode, params.data.pageKey, locale);
      if (!page) {
        return reply.status(404).send(errorResponse("Page not published for this country/locale"));
      }
      return okResponse({ page });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected pages error"));
    }
  });
};

export default pagesRoute;
