import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { LocaleCode } from "@prisma/client";
import { listServices, listSpecialties, getPublicServiceBySlug } from "../modules/services/services.service.js";
import { listServiceFaqs } from "../services/service-faq.service.js";
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
  countryCode: z.string().trim().min(1).max(8).optional(),
  locale: z.string().trim().min(1).max(8).optional(),
});

const servicesRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/specialties", async (_, reply) => {
    try {
      const specialties = await listSpecialties();
      return okResponse(specialties);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected specialties error"));
    }
  });

  app.get("/api/services", async (_, reply) => {
    try {
      const services = await listServices();
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
      const userId = optionalUserId(request);
      const service = await getPublicServiceBySlug(
        params.data.slug,
        countryCode,
        locale as LocaleCode | undefined,
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
    const params = slugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid slug"));
    }
    const query = countryQuerySchema.safeParse(request.query);
    const countryCode = query.success ? query.data.countryCode : undefined;

    try {
      const service = await getPublicServiceBySlug(params.data.slug, countryCode);
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      const faqs = await listServiceFaqs(service.id, true);
      return okResponse({ faqs });
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
