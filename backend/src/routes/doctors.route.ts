import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { listDoctors } from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";

const doctorsQuerySchema = z.object({
  locale: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    localeCodeSchema.optional(),
  ),
});

const languageFilterQuerySchema = z.object({
  service: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).max(20).optional(),
  country: z.string().trim().length(2).optional(),
});

const doctorsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctors", async (request, reply) => {
    reply.header(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    const query = doctorsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid doctors query", query.error.flatten()));
    }
    try {
      const doctors = await listDoctors(query.data.locale);
      return okResponse(doctors);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }

      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected doctors error"));
    }
  });

  /**
   * GET /api/doctors/by-language
   * Returns doctors filtered by optional service slug + language code + country.
   * Used by booking flow language dropdown.
   */
  app.get("/api/doctors/by-language", async (request, reply) => {
    reply.header("Cache-Control", "public, max-age=30, s-maxage=30");
    const query = languageFilterQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query params"));
    }

    const { service: serviceSlug, language, country } = query.data;

    try {
      const doctors = await prisma.doctor.findMany({
        where: {
          active: true,
          ...(language ? { languages: { has: language } } : {}),
          ...(country
            ? {
                OR: [
                  { country: { code: country, isActive: true } },
                  {
                    additionalCountries: {
                      some: { active: true, country: { code: country, isActive: true } },
                    },
                  },
                ],
              }
            : {}),
          ...(serviceSlug
            ? {
                services: {
                  some: {
                    status: "active",
                    service: { slug: serviceSlug, isActive: true },
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          fullName: true,
          title: true,
          slug: true,
          languages: true,
          country: { select: { code: true } },
          specialties: {
            select: { specialty: { select: { slug: true, translations: { select: { name: true, locale: true } } } } },
          },
        },
        orderBy: { fullName: "asc" },
        take: 50,
      });

      return okResponse({ doctors });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctors"));
    }
  });
};

export default doctorsRoute;
