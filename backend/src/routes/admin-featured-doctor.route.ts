import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  getFeaturedDoctorId,
  setFeaturedDoctor,
} from "../modules/doctors/featured-doctor.service.js";

/**
 * Admin "featured doctor" toggle.
 *
 * One featured doctor per country, stored in the Setting table (no
 * Doctor schema column). The featured doctor is promoted into the
 * FeaturedDoctor spotlight at the top of the public /doctors page.
 *
 * GET  → is THIS doctor currently the featured one for its primary
 *        country (used to pre-check the admin toggle).
 * PUT  → set / clear. Setting one doctor featured replaces the previous
 *        one for that country (radio-style across the roster).
 */
const featuredBodySchema = z.object({
  featured: z.boolean(),
  countryCode: z.string().trim().max(8).optional(),
});
const idParam = z.string().trim().min(1).max(64);

/** Returns primary country code + all additional country codes for a doctor. */
async function allCountryCodes(doctorId: string): Promise<{ primary: string | null; all: string[] }> {
  const row = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      country: { select: { code: true } },
      additionalCountries: { select: { country: { select: { code: true } } } },
    },
  });
  if (!row) return { primary: null, all: [] };
  const primary = row.country.code;
  const additional = row.additionalCountries.map((ac) => ac.country.code);
  return { primary, all: [primary, ...additional] };
}

const adminFeaturedDoctorRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  // Returns all country codes where this doctor is the Clinical Director.
  app.get<{ Params: { id: string } }>(
    "/api/admin/doctors/:id/featured",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.id).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      try {
        const { all } = await allCountryCodes(request.params.id);
        if (!all.length) return reply.status(404).send(errorResponse("Doctor not found"));
        const featuredCountries: string[] = [];
        for (const code of all) {
          const featuredId = await getFeaturedDoctorId(code);
          if (featuredId === request.params.id) featuredCountries.push(code);
        }
        return okResponse({ featuredCountries });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not read featured state"));
      }
    },
  );

  // Set/clear Clinical Director for a specific country the doctor belongs to.
  // Body: { featured: boolean, countryCode?: string }
  // countryCode defaults to the doctor's primary country when omitted.
  app.put<{ Params: { id: string } }>(
    "/api/admin/doctors/:id/featured",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.id).success) {
        return reply.status(400).send(errorResponse("Invalid doctor id"));
      }
      const parsed = featuredBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid body", parsed.error.flatten()));
      }
      try {
        const { primary, all } = await allCountryCodes(request.params.id);
        if (!primary) return reply.status(404).send(errorResponse("Doctor not found"));

        const requestedCode = parsed.data.countryCode;
        const code = requestedCode ? requestedCode.toLowerCase() : primary;

        if (!all.map((c) => c.toLowerCase()).includes(code)) {
          return reply.status(400).send(errorResponse("Doctor is not listed in that country"));
        }

        if (parsed.data.featured) {
          await setFeaturedDoctor(code, request.params.id);
        } else {
          const current = await getFeaturedDoctorId(code);
          if (current === request.params.id) await setFeaturedDoctor(code, null);
        }
        const actor = await resolveOptionalAuthUser(request);
        recordAudit({
          actorUserId: actor?.id,
          actorRole: "ADMIN",
          action: "DOCTOR_UPDATED",
          entityType: "Doctor",
          entityId: request.params.id,
          metadata: { featured: parsed.data.featured, countryCode: code },
          request,
        }).catch(() => {});
        return okResponse(
          { featured: parsed.data.featured, countryCode: code },
          parsed.data.featured ? "Doctor set as Clinical Director" : "Doctor removed as Clinical Director",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update featured doctor"));
      }
    },
  );
};

export default adminFeaturedDoctorRoute;
