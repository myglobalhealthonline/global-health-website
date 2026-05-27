import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  countryFooterUpsertSchema,
  type CountryFooterDto,
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
type CountryFooterRow = Prisma.CountryFooterGetPayload<{
  include: { country: { select: { id: true; code: true; name: true } } };
}>;

function toDto(row: CountryFooterRow): CountryFooterDto {
  return {
    id: row.id,
    countryId: row.countryId,
    countryCode: row.country.code,
    countryName: row.country.name,
    tagline: row.tagline,
    contactAddress: row.contactAddress,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    contactHours: row.contactHours,
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    linkedinUrl: row.linkedinUrl,
    twitterUrl: row.twitterUrl,
    youtubeUrl: row.youtubeUrl,
    customColumns: row.customColumns as CountryFooterDto["customColumns"],
    copyrightLine: row.copyrightLine,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const adminCountryFooterRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/footer",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      try {
        // Resolve the country first so a 404 here means "country missing"
        // (not "footer missing") and admin can navigate to /admin/countries
        // to add the row. The footer row itself is lazy-created on first
        // PUT, so GET returning null is the normal first-load state.
        const country = await prisma.country.findUnique({
          where: { id: request.params.countryId },
          select: { id: true, code: true, name: true },
        });
        if (!country) {
          return reply.status(404).send(errorResponse("Country not found"));
        }
        const row = await prisma.countryFooter.findUnique({
          where: { countryId: country.id },
          include: { country: { select: { id: true, code: true, name: true } } },
        });
        return okResponse({ footer: row ? toDto(row) : null, country });
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
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
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
        const data = {
          tagline: parsed.data.tagline,
          contactAddress: parsed.data.contactAddress,
          contactEmail: parsed.data.contactEmail,
          contactPhone: parsed.data.contactPhone,
          contactHours: parsed.data.contactHours,
          instagramUrl: parsed.data.instagramUrl,
          facebookUrl: parsed.data.facebookUrl,
          linkedinUrl: parsed.data.linkedinUrl,
          twitterUrl: parsed.data.twitterUrl,
          youtubeUrl: parsed.data.youtubeUrl,
          customColumns: parsed.data.customColumns,
          copyrightLine: parsed.data.copyrightLine,
          isActive: parsed.data.isActive,
        };
        const row = await prisma.countryFooter.upsert({
          where: { countryId: country.id },
          update: data,
          create: { ...data, countryId: country.id },
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
        return okResponse({ footer: toDto(row) }, "Footer saved");
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
