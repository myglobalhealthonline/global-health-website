import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getPublicCountryTrust } from "../modules/countries/countries.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";

/** Optional locale (uppercase LocaleCode) — selects which translation the
 *  trust payload's text fields resolve to. Absent → country default. */
const localeQuerySchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  localeCodeSchema.optional(),
);

/**
 * Public read for a country's medical-authority trust signals. SSR'd by the
 * Next layout for every public page inside a `/[country]/[lang]/*` scope to
 * render the footer trust bar (regulator line, provider registration,
 * emergency notice) and to feed Organization/MedicalBusiness `sameAs`.
 *
 * Returns `{ trust: null }` when the country is unknown/inactive — the
 * frontend then falls back to its generic GDPR/licensed-doctor copy.
 */
const publicCountryTrustRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { code: string }; Querystring: { locale?: string } }>(
    "/api/public/countries/:code/trust",
    { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } },
    async (request, reply) => {
      reply.header(
        "Cache-Control",
        "public, max-age=120, s-maxage=120, stale-while-revalidate=600",
      );
      try {
        const code = request.params.code.trim().toLowerCase();
        if (!code) {
          return reply.status(400).send(errorResponse("Country code required"));
        }
        const localeParsed = localeQuerySchema.safeParse(request.query?.locale);
        if (!localeParsed.success) {
          return reply.status(400).send(errorResponse("Invalid locale"));
        }
        const trust = await getPublicCountryTrust(code, localeParsed.data);
        return okResponse({ trust });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load trust signals"));
      }
    },
  );
};

export default publicCountryTrustRoute;
