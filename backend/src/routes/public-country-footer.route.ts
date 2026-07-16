import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";
import {
  toCountryFooterDto,
  toCountryFooterDtoWithLocale,
  type CountryFooterDto,
} from "../validations/country-footer.schema.js";

/** Optional locale (uppercase LocaleCode) — selects which translation the
 *  merged footer display fields resolve to. Absent → country default. */
const localeQuerySchema = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  localeCodeSchema.optional(),
);

/**
 * Public read for the per-country footer. SSR'd by the Next layout
 * for every public page inside a `/[country]/[lang]/*` scope. Cached
 * upstream by Next's data cache; no auth required.
 *
 * Returns `null` when the country has no footer row or has soft-
 * disabled it — SiteFooter then falls back to its global defaults.
 */
const publicCountryFooterRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { code: string }; Querystring: { locale?: string } }>(
    "/api/public/countries/:code/footer",
    async (request, reply) => {
      try {
        const code = request.params.code.trim().toLowerCase();
        if (!code) {
          return reply.status(400).send(errorResponse("Country code required"));
        }
        const localeParsed = localeQuerySchema.safeParse(request.query?.locale);
        if (!localeParsed.success) {
          return reply.status(400).send(errorResponse("Invalid locale"));
        }
        const locale = localeParsed.data;
        // Base query stays exactly as before (no `translations` include) so
        // the no-locale path is untouched — a real requirement, not just
        // style, since the CountryFooterTranslation table only exists once
        // its migration has been applied to a given database. The
        // translation row lookup only runs when `?locale=` is supplied.
        const row = await prisma.countryFooter.findFirst({
          where: { country: { code }, isActive: true },
          include: { country: { select: { id: true, code: true, name: true, defaultLocale: true } } },
        });
        if (!row) {
          return okResponse<{ footer: CountryFooterDto | null }>({ footer: null });
        }
        if (!locale) {
          return okResponse({ footer: toCountryFooterDto(row) });
        }
        // Fail soft if CountryFooterTranslation hasn't been migrated onto
        // this database yet (P2021) — serve the untranslated base row
        // instead of 500ing the whole request just because a locale was
        // requested.
        let translations: Awaited<
          ReturnType<typeof prisma.countryFooterTranslation.findMany>
        > = [];
        try {
          translations = await prisma.countryFooterTranslation.findMany({
            where: { countryFooterId: row.id },
          });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021")) {
            throw error;
          }
        }
        const footer = toCountryFooterDtoWithLocale(
          { ...row, translations },
          locale,
          row.country.defaultLocale,
        );
        return okResponse({ footer });
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
