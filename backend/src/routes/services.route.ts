import type { FastifyPluginAsync } from "fastify";
import type { LocaleCode } from "@prisma/client";
import { listServices, listSpecialties, getPublicServiceBySlug } from "../modules/services/services.service.js";
import { listServiceFaqs } from "../services/service-faq.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { z } from "zod";

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
      const service = await getPublicServiceBySlug(
        params.data.slug,
        countryCode,
        locale as LocaleCode | undefined,
      );
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
