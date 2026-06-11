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

const healthTestsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/health-tests", async (_, reply) => {
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
