import type { FastifyPluginAsync } from "fastify";
import { LocaleCode } from "@prisma/client";
import { listServices, listSpecialties, getPublicServiceBySlug } from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { z } from "zod";

const slugParamsSchema = z.object({ slug: z.string().trim().min(1) });
const countryQuerySchema = z.object({
  countryCode: z.string().trim().min(1).max(8).toLowerCase().optional(),
  // .catch(undefined): an unknown locale falls back to the country default
  // instead of failing the whole query parse (which would also silently
  // drop countryCode and serve the wrong country's content).
  locale: z
    .preprocess(
      (v) => (typeof v === "string" ? v.toUpperCase() : v),
      z.nativeEnum(LocaleCode).optional(),
    )
    .catch(undefined),
});

/** Same short public-cache window used across the other stable-content
 *  public GETs (blog, doctors, countries, country-scoped routes). */
function applyPublicCache(reply: { header: (k: string, v: string) => void }) {
  reply.header(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
}

const servicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/specialties", async (request, reply) => {
    applyPublicCache(reply);
    const query = countryQuerySchema.safeParse(request.query);
    try {
      const specialties = await listSpecialties(query.success ? query.data.locale : undefined);
      return okResponse(specialties);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected specialties error"));
    }
  });

  app.get("/api/services", async (request, reply) => {
    applyPublicCache(reply);
    const query = countryQuerySchema.safeParse(request.query);
    try {
      const services = await listServices(query.success ? query.data.locale : undefined);
      return okResponse(services);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected services error"));
    }
  });

  app.get("/api/services/:slug", async (request, reply) => {
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid slug"));
    }
    const query = countryQuerySchema.safeParse(request.query);
    const countryCode = query.success ? query.data.countryCode : undefined;
    const locale = query.success ? query.data.locale : undefined;

    try {
      const service = await getPublicServiceBySlug(params.data.slug, countryCode, locale);
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return okResponse({ service });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected service error"));
    }
  });

  app.get("/api/services/:slug/faqs", async (request, reply) => {
    applyPublicCache(reply);
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid slug"));
    }
    const query = countryQuerySchema.safeParse(request.query);
    const countryCode = query.success ? query.data.countryCode : undefined;
    const locale = query.success ? query.data.locale : undefined;

    try {
      const service = await getPublicServiceBySlug(
        params.data.slug,
        countryCode,
        locale,
      );
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      // service.faqs is already locale-merged by getPublicServiceBySlug.
      return okResponse({ faqs: service.faqs });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });
};

export default servicesRoute;
