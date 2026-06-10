import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  countryFooterUpsertSchema,
  toCountryFooterDto,
} from "../validations/country-footer.schema.js";

/**
 * Admin read/write for the per-country footer.
 *
 * One row per country. PUT is idempotent — upserts the row. Empty
 * strings + null on optional fields clear the value so the public
 * SiteFooter falls back to the global default.
 *
 * Cross-cuts: every write records an audit row + revalidates the
 * site-content cache so SSR pages pick up the change on next render
 * without a deploy.
 */

const adminCountryFooterRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/footer",
    async (request, reply) => {
      try {
        // Single round-trip: pull the country + its (optional) footer
        // in one Prisma call. Null country = 404; null footer = first
        // load (lazy-created on first PUT).
        const country = await prisma.country.findUnique({
          where: { id: request.params.countryId },
          select: {
            id: true,
            code: true,
            name: true,
            footer: true,
          },
        });
        if (!country) {
          return reply.status(404).send(errorResponse("Country not found"));
        }
        const { footer, ...countryHeader } = country;
        return okResponse({
          footer: footer
            ? toCountryFooterDto({ ...footer, country: countryHeader })
            : null,
          country: countryHeader,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load footer"));
      }
    },
  );

  app.put<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/footer",
    async (request, reply) => {
      const parsed = countryFooterUpsertSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid footer payload", parsed.error.flatten()));
      }
      try {
        const country = await prisma.country.findUnique({
          where: { id: request.params.countryId },
          select: { id: true, code: true, name: true },
        });
        if (!country) {
          return reply.status(404).send(errorResponse("Country not found"));
        }
        // Zod-validated payload already matches the column shape — no
        // re-listing every field.
        const row = await prisma.countryFooter.upsert({
          where: { countryId: country.id },
          update: parsed.data,
          create: { ...parsed.data, countryId: country.id },
          include: { country: { select: { id: true, code: true, name: true } } },
        });
        const actor = await resolveOptionalAuthUser(request);
        recordAudit({
          actorUserId: actor?.id,
          actorRole: "ADMIN",
          action: "COUNTRY_FOOTER_UPDATED",
          entityType: "CountryFooter",
          entityId: row.id,
          metadata: { countryCode: country.code },
          request,
        }).catch(() => {});
        return okResponse({ footer: toCountryFooterDto(row) }, "Footer saved");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save footer"));
      }
    },
  );
};

export default adminCountryFooterRoute;
