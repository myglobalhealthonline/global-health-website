import type { FastifyPluginAsync } from "fastify";
import { getPublicReviewConfig } from "../modules/settings/settings.service.js";
import { maybeRefreshGoogleAggregate } from "../modules/settings/google-places.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Public read of the review-provider configuration. Anyone can fetch this —
 * it's all data we'd render onto the public site anyway (provider IDs are
 * meant to be visible in widget embeds).
 *
 * Cached 5 minutes at the edge; revalidated when admin edits Settings.
 */
const reviewsConfigRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/reviews-config", async (_request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=1800",
    );
    try {
      const config = await getPublicReviewConfig();
      // Opportunistic Google live refresh — only fires when GOOGLE_PLACES_API_KEY
      // is set + placeId configured + cached aggregate older than 24h. Failures
      // here are swallowed so the public endpoint stays fast and resilient.
      const fresh = await maybeRefreshGoogleAggregate(
        config.google.placeId,
        config.google.aggregate,
      );
      if (fresh) config.google.aggregate = fresh;
      return okResponse(config);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not read review config"));
    }
  });
};

export default reviewsConfigRoute;
