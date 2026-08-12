import type { FastifyPluginAsync } from "fastify";
import { getGlobalConsultationCount } from "../modules/appointments/consultation-count.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Public global consultation counter — the previous platform's historical
 * total plus every appointment actually completed on this platform since
 * the 2026-07-01 cutover. See consultation-count.service.ts for the exact
 * filter. TRUST-METRIC-001.
 *
 * Cached 1 hour at the edge — a public trust figure doesn't need
 * per-render precision, and this keeps a Prisma COUNT off the hot path of
 * every page render that shows it.
 */
const consultationCountRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/consultation-count", async (_request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=21600",
    );
    try {
      const total = await getGlobalConsultationCount();
      return okResponse({ total });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not read consultation count"));
    }
  });
};

export default consultationCountRoute;
