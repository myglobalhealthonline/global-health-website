import type { FastifyPluginAsync } from "fastify";
import type { LocaleCode } from "@prisma/client";
import { z } from "zod";
import {
  listHealthTests,
  getPublicHealthTestBySlug,
} from "../modules/health-tests/health-tests.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const slugParamsSchema = z.object({ slug: z.string().trim().min(1) });
const countryQuerySchema = z.object({
  countryCode: z.string().trim().min(1).max(8).optional(),
  locale: z.string().trim().min(1).max(8).optional(),
});

/** Same short public-cache window used across the other stable-content
 *  public GETs (blog, doctors, countries, country-scoped routes). */
function applyPublicCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
}

const healthTestsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/health-tests", async (_, reply) => {
    applyPublicCache(reply);
    try {
      const healthTests = await listHealthTests();
      return okResponse(healthTests);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected health tests error"));
    }
  });

  app.get("/api/health-tests/:slug", async (request, reply) => {
    applyPublicCache(reply);
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid slug"));
    }
    const query = countryQuerySchema.safeParse(request.query);
    const countryCode = query.success ? query.data.countryCode : undefined;
    const locale = query.success ? query.data.locale : undefined;

    try {
      const healthTest = await getPublicHealthTestBySlug(
        params.data.slug,
        countryCode,
        locale as LocaleCode | undefined,
      );
      if (!healthTest) {
        return reply.status(404).send(errorResponse("Health test not found"));
      }
      return okResponse({ healthTest });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected health test error"));
    }
  });
};

export default healthTestsRoute;
