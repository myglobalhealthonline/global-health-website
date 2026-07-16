import type { FastifyPluginAsync } from "fastify";
import { getPublicPageContent } from "../modules/page-content/page-content.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  publicPageParamsSchema,
  publicPageQuerySchema,
} from "../validations/admin-pages.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { prisma } from "../db/prisma.js";

/**
 * Compat adapter (see docs/plans/page-content-cms-implementation-prompt.md
 * Part D Phase 2): the old `/pages` CMS (`ContentPage`) is being replaced by
 * the new structured `PageContent` model. This route's URL and response
 * shape stay exactly as before so existing consumers keep working; the
 * handler body now reads from the new model instead of `ContentPage`.
 * Kept alive for one release; deletion happens in a future cleanup branch.
 */
const pagesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries/:countryCode/pages/:pageKey", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
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

      const result = await getPublicPageContent(params.data.countryCode, params.data.pageKey, locale);
      if (!result.record) {
        if (result.disabled) {
          return okResponse({ page: null, disabled: true });
        }
        return reply.status(404).send(errorResponse("Page not published for this country/locale"));
      }
      const r = result.record;
      return okResponse({
        page: {
          title: null,
          body: r.body ?? "",
          heroTitle: r.heroTitle,
          heroSubtitle: r.heroSubtitle,
          heroImagePath: r.heroImagePath,
          ctaLabel: r.ctaLabel,
          ctaHref: r.ctaHref,
          ogImagePath: r.ogImagePath,
          seoTitle: r.seoTitle,
          seoDescription: r.seoDescription,
          status: "PUBLISHED",
          resolvedLocale: r.resolvedLocale,
          mixedLocaleFields: r.mixedLocaleFields,
        },
      });
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
