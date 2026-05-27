import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import type { CountryFooterDto } from "../validations/country-footer.schema.js";

/**
 * Public read for the per-country footer. SSR'd by the Next layout
 * for every public page inside a `/[country]/[lang]/*` scope. Cached
 * upstream by Next's data cache; no auth required.
 *
 * Returns `null` when the country has no footer row or has soft-
 * disabled it — SiteFooter then falls back to its global defaults.
 */
const publicCountryFooterRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { code: string } }>(
    "/api/public/countries/:code/footer",
    async (request, reply) => {
      try {
        const code = request.params.code.trim().toLowerCase();
        if (!code) {
          return reply.status(400).send(errorResponse("Country code required"));
        }
        const row = await prisma.countryFooter.findFirst({
          where: { country: { code }, isActive: true },
          include: { country: { select: { id: true, code: true, name: true } } },
        });
        if (!row) {
          return okResponse<{ footer: CountryFooterDto | null }>({ footer: null });
        }
        const dto: CountryFooterDto = {
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
        return okResponse({ footer: dto });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load footer"));
      }
    },
  );
};

export default publicCountryFooterRoute;
