import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { listCoverageCatalog } from "../modules/benefits/declared-coverage.service.js";
import { countryCodeSchema } from "../validations/shared.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * `GET /api/public/coverage-catalog` — the admin-configured providers a patient
 * can declare at booking, grouped by category (insurance, corporate healthcare,
 * memberships, Global Health plans).
 *
 * Public on purpose: the booking form asks before the patient has necessarily
 * signed in, and a guest who cannot see the list cannot tell us they are
 * covered. It returns names and ids only — no member counts, no contacts, no
 * pricing. What a specific card is worth needs the card itself, and that answer
 * is only ever produced at add-to-cart.
 */

const catalogQuerySchema = z.object({
  country: countryCodeSchema,
  serviceId: z.string().trim().min(1).max(120).optional(),
  locale: z.string().trim().max(8).optional(),
});

const LOCALES = new Set(["EN", "PT", "ES", "CS", "RO", "DE"]);

const publicCoverageCatalogRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/coverage-catalog", async (request, reply) => {
    const parsed = catalogQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    const raw = parsed.data.locale?.toUpperCase();
    // An unknown locale falls back to the default name rather than 400ing:
    // a mistyped locale must never be the reason a patient cannot say they
    // are insured.
    const locale = raw && LOCALES.has(raw) ? (raw as never) : null;

    try {
      const catalog = await listCoverageCatalog({
        countryCode: parsed.data.country,
        serviceId: parsed.data.serviceId ?? null,
        locale,
      });
      if (!catalog) return reply.status(404).send(errorResponse("Country not found"));
      return okResponse(catalog);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load coverage options"));
    }
  });
};

export default publicCoverageCatalogRoute;
