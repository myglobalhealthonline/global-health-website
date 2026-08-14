import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { LocaleCode } from "@prisma/client";
import { listServices, listSpecialties, getPublicServiceBySlug } from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { z } from "zod";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/auth-session.js";
import { assertCorporateServiceBookable } from "../modules/corporate/corporate-benefit.service.js";

/** Optional auth — public route, but a signed-in corporate member may
 *  fetch their (non-public) corporate services by slug. */
function optionalUserId(request: FastifyRequest): string | null {
  const token = request.cookies?.[env.AUTH_COOKIE_NAME];
  if (!token) return null;
  return verifyAuthToken(token)?.sub ?? null;
}

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

  // No shared Cache-Control here (unlike the other public GETs in this
  // file): the response is auth-dependent (`allowCorporate`) — a
  // CORPORATE_ONLY/CORPORATE_REQUEST_ONLY/ADMIN_ONLY service resolves
  // differently for a signed-in corporate member vs. everyone else at the
  // exact same URL, so a shared/public cache would leak one user's response
  // to another.
  app.get("/api/services/:slug", async (request, reply) => {
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid slug"));
    }
    const query = countryQuerySchema.safeParse(request.query);
    const countryCode = query.success ? query.data.countryCode : undefined;
    const locale = query.success ? query.data.locale : undefined;

    try {
      const userId = optionalUserId(request);
      const service = await getPublicServiceBySlug(
        params.data.slug,
        countryCode,
        locale,
        { allowCorporate: Boolean(userId) },
      );
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      // Non-public services only resolve for eligible corporate members —
      // everyone else gets the same 404 as a nonexistent slug (no
      // existence oracle).
      const visibility = (service as { visibility?: string }).visibility;
      if (visibility && visibility !== "PUBLIC") {
        const gate = await assertCorporateServiceBookable({
          userId,
          serviceId: (service as { id: string }).id,
          visibility: visibility as "CORPORATE_ONLY" | "CORPORATE_REQUEST_ONLY" | "ADMIN_ONLY",
          serviceCountryCode: countryCode ?? null,
        });
        if (!gate.ok) {
          return reply.status(404).send(errorResponse("Service not found"));
        }
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
