import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { LocaleCode } from "@prisma/client";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  getPublicLandingPage,
  listPublishedLandingSlugs,
} from "../modules/seo-landing/seo-landing.service.js";
import { errorResponse, okResponse } from "../utils/response.js";

const codeParam = z.string().trim().min(1).max(8);
const localeQuery = z.object({ locale: z.nativeEnum(LocaleCode).optional() });

const publicSeoLandingRoute: FastifyPluginAsync = async (app) => {
  // Published landing slugs for a country — feeds the sitemap.
  app.get<{ Params: { code: string } }>(
    "/api/public/countries/:code/landing-pages",
    async (request, reply) => {
      if (!codeParam.safeParse(request.params.code).success) {
        return reply.status(400).send(errorResponse("Invalid country code"));
      }
      try {
        const pages = await listPublishedLandingSlugs(request.params.code.toUpperCase());
        return okResponse({ landingPages: pages });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load landing pages"));
      }
    },
  );

  // One published landing page resolved to a locale.
  app.get<{ Params: { code: string; slug: string } }>(
    "/api/public/countries/:code/landing-pages/:slug",
    async (request, reply) => {
      if (!codeParam.safeParse(request.params.code).success) {
        return reply.status(400).send(errorResponse("Invalid country code"));
      }
      const query = localeQuery.safeParse(request.query);
      try {
        const page = await getPublicLandingPage(
          request.params.code.toUpperCase(),
          request.params.slug,
          query.success ? query.data.locale : undefined,
        );
        if (!page) return reply.status(404).send(errorResponse("Landing page not found"));
        return okResponse({ page });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load landing page"));
      }
    },
  );
};

export default publicSeoLandingRoute;
