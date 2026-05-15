import type { FastifyPluginAsync } from "fastify";
import { ServiceKind } from "@prisma/client";
import { z } from "zod";
import {
  getDoctorByCountryAndSlug,
  listDoctorsByCountry,
} from "../modules/doctors/doctors.service.js";
import {
  listServicesByCountry,
  listSpecialtiesByCountry,
} from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";

const countryParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
});

const countrySlugParamsSchema = z.object({
  countryCode: z.string().trim().min(1).max(8),
  slug: z.string().trim().min(1).max(160),
});

const servicesQuerySchema = z.object({
  kind: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.nativeEnum(ServiceKind).optional(),
  ),
});

function handleError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
  fallback: string,
) {
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse(fallback));
}

const countryScopedRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/countries/:countryCode/doctors", async (request, reply) => {
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    try {
      const doctors = await listDoctorsByCountry(params.data.countryCode);
      return okResponse(doctors);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected doctors error");
    }
  });

  app.get("/api/countries/:countryCode/doctors/:slug", async (request, reply) => {
    const params = countrySlugParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor lookup", params.error.flatten()));
    }
    try {
      const doctor = await getDoctorByCountryAndSlug(params.data.countryCode, params.data.slug);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor not found"));
      }
      return okResponse({ doctor });
    } catch (error) {
      return handleError(app, reply, error, "Unexpected doctor lookup error");
    }
  });

  app.get("/api/countries/:countryCode/specialties", async (request, reply) => {
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    try {
      const specialties = await listSpecialtiesByCountry(params.data.countryCode);
      return okResponse(specialties);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected specialties error");
    }
  });

  app.get("/api/countries/:countryCode/services", async (request, reply) => {
    const params = countryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country code", params.error.flatten()));
    }
    const query = servicesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid services query", query.error.flatten()));
    }
    try {
      const services = await listServicesByCountry(params.data.countryCode, query.data.kind);
      return okResponse(services);
    } catch (error) {
      return handleError(app, reply, error, "Unexpected services error");
    }
  });
};

export default countryScopedRoute;
