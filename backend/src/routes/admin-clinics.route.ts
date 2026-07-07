import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
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
const clinicsQuerySchema = z.object({
  countryCode: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().trim().min(1).optional(),
  ),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

const adminClinicsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/clinics", async (request, reply) => {
      const query = clinicsQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse("Invalid clinics query", query.error.flatten()));
      }
      const { page, pageSize, countryCode } = query.data;
      const code = countryCode?.toUpperCase();
      const where = {
        active: true,
        ...(code ? { country: { code } } : {}),
      };
      try {
        const [total, rows] = await prisma.$transaction([
          prisma.clinic.count({ where }),
          prisma.clinic.findMany({
            where,
            orderBy: [{ name: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
              id: true,
              countryId: true,
              name: true,
              slug: true,
              city: true,
              active: true,
              country: { select: { code: true, name: true } },
            },
          }),
        ]);
        const clinics = rows.map((c) => ({
          id: c.id,
          countryId: c.countryId,
          countryCode: c.country.code,
          countryName: c.country.name,
          name: c.name,
          slug: c.slug,
          city: c.city,
          active: c.active,
        }));
        return okResponse({
          // Back-compat: existing callers read `.clinics` directly; new
          // paginated UI reads `.items` + `.pagination`.
          clinics,
          items: clinics,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load clinics"));
      }
  });
};

export default adminClinicsRoute;
