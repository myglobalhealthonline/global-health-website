import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  getGpAvailability,
  getGpLanguages,
  resolveGpAssignment,
  GpNoDoctorError,
  GpServiceUnavailableError,
} from "../modules/gp-booking/gp-assignment.service.js";
import { getServiceBookability } from "../modules/bookability/bookability.service.js";
import { countryCodeSchema } from "../validations/shared.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Public endpoints for the homepage same-day GP quick-book.
 *
 *   GET  /api/public/gp-availability — aggregated open times for a language.
 *   POST /api/public/gp-assign       — resolve ONE GP doctor + slot for a time.
 *
 * Neither leaks the eligible-doctor roster to the patient: the availability
 * endpoint returns only times, and assign returns the chosen doctor + slot the
 * cart needs (the UI never renders the doctor as a choice).
 */

const availabilityQuerySchema = z.object({
  country: countryCodeSchema,
  language: z.string().trim().min(2).max(12),
  days: z.coerce.number().int().min(1).max(30).default(14),
});

const assignBodySchema = z
  .object({
    country: countryCodeSchema,
    language: z.string().trim().min(2).max(12),
    startAt: z.string().datetime(),
  })
  .strict();

const languagesQuerySchema = z.object({ country: countryCodeSchema });

const publicGpBookingRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { country?: string } }>(
    "/api/public/gp-languages",
    async (request, reply) => {
      const parsed = languagesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
      }
      try {
        const result = await getGpLanguages(parsed.data.country);
        return okResponse({
          configured: result.configured,
          languages: result.languages,
          bookableLanguages: result.bookableLanguages,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load languages"));
      }
    },
  );

  app.get<{ Querystring: { country?: string; language?: string; days?: string } }>(
    "/api/public/gp-availability",
    async (request, reply) => {
      // Booked slots must never be advertised as open by a stale cache —
      // explicit no-store rather than relying on the absence of a header.
      reply.header("Cache-Control", "no-store");
      const parsed = availabilityQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
      }
      try {
        const result = await getGpAvailability({
          countryCode: parsed.data.country,
          languageCode: parsed.data.language,
          days: parsed.data.days,
        });
        const bookability = result.service
          ? await getServiceBookability({
              countryCode: parsed.data.country,
              serviceId: result.service.id,
            })
          : null;
        return okResponse({
          service: result.service
            ? {
                id: result.service.id,
                slug: result.service.slug,
                name: result.service.name,
                durationMinutes: result.service.durationMinutes,
                basePriceCents: result.service.basePriceCents,
                currencyCode: result.service.currencyCode,
              }
            : null,
          clinicTimezone: result.clinicTimezone,
          slots: result.slots,
          bookability,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load availability"));
      }
    },
  );

  app.post(
    "/api/public/gp-assign",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = assignBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid request", parsed.error.flatten()));
      }
      try {
        const assignment = await resolveGpAssignment({
          countryCode: parsed.data.country,
          languageCode: parsed.data.language,
          startAtISO: parsed.data.startAt,
        });
        return okResponse(assignment);
      } catch (error) {
        if (error instanceof GpServiceUnavailableError) {
          return reply.status(409).send(errorResponse(error.message, { code: "NO_SERVICE" }));
        }
        if (error instanceof GpNoDoctorError) {
          return reply.status(409).send(errorResponse(error.message, { code: "NO_DOCTOR" }));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not assign a GP doctor"));
      }
    },
  );
};

export default publicGpBookingRoute;
