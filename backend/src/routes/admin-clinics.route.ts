import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";

/**
 * Admin-only clinic lookups. The Clinic model has lived in the schema
 * for a while but had no surface — T12 (admin schedule form clinic
 * picker) needs an active-list for a given country code so the admin
 * can pick a venue for IN_PERSON appointments.
 */
const adminClinicsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get<{ Querystring: { countryCode?: string } }>(
    "/api/admin/clinics",
    async (request, reply) => {
      const code = request.query.countryCode?.trim().toUpperCase();
      try {
        const rows = await prisma.clinic.findMany({
          where: {
            active: true,
            ...(code ? { country: { code } } : {}),
          },
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            countryId: true,
            name: true,
            slug: true,
            city: true,
            active: true,
            country: { select: { code: true, name: true } },
          },
        });
        return okResponse({
          clinics: rows.map((c) => ({
            id: c.id,
            countryId: c.countryId,
            countryCode: c.country.code,
            countryName: c.country.name,
            name: c.name,
            slug: c.slug,
            city: c.city,
            active: c.active,
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load clinics"));
      }
    },
  );
};

export default adminClinicsRoute;
