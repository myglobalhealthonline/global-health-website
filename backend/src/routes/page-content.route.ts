import type { FastifyPluginAsync } from "fastify";
import { getPublicPageContent } from "../modules/page-content/page-content.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  pageContentPublicParamsSchema,
  pageContentPublicQuerySchema,
} from "../validations/admin-page-content.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { prisma } from "../db/prisma.js";

const pageContentRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries/:countryCode/page-content/:pageKey", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    const params = pageContentPublicParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page-content lookup params", params.error.flatten()));
    }
    const query = pageContentPublicQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid page-content lookup query", query.error.flatten()));
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

      const result = await getPublicPageContent(params.data.countryCode, params.data.pageKey, locale);
      if (!result.record) {
        return okResponse({ record: null, disabled: result.disabled });
      }
      return okResponse({ record: result.record, disabled: false });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected page-content error"));
    }
  });
};

export default pageContentRoute;
