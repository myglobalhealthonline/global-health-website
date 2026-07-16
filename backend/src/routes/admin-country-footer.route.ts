import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  countryFooterUpsertSchema,
  countryFooterTranslationUpsertSchema,
  toCountryFooterDto,
  toCountryFooterDtoWithLocale,
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
      // A payload with a `locale` field targets one locale's translation
      // override; without it, the payload replaces the base (country
      // default-locale) row — unchanged from before this field existed.
      const hasLocale =
        !!request.body && typeof request.body === "object" && "locale" in request.body;
      if (hasLocale) {
        return handleTranslationPut(request, reply);
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
        // Zod-validated payload already matches the column shape — no
        // re-listing every field.
        const row = await prisma.countryFooter.upsert({
          where: { countryId: country.id },
          update: parsed.data,
          create: { ...parsed.data, countryId: country.id },
          include: { country: { select: { id: true, code: true, name: true } } },
        });
        // S-008: resolveAdminSessionActor resolves all admin-tier roles
        // (resolveOptionalAuthUser silently dropped SUPER_ADMIN/LOCAL_ADMIN).
        const actor = resolveAdminSessionActor(request);
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? "ADMIN",
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

  /**
   * Upserts a CountryFooterTranslation row for one non-default locale.
   * When the requested locale equals the country's default locale, writes
   * go to the base CountryFooter row instead (there's nothing to override —
   * the base row IS that locale's copy), mirroring how ServiceTranslation
   * writes are scoped to non-default locales elsewhere in the codebase.
   */
  async function handleTranslationPut(
    request: FastifyRequest<{ Params: { countryId: string } }>,
    reply: FastifyReply,
  ) {
    const parsed = countryFooterTranslationUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid footer translation payload", parsed.error.flatten()));
    }
    try {
      const country = await prisma.country.findUnique({
        where: { id: request.params.countryId },
        select: { id: true, code: true, name: true, defaultLocale: true },
      });
      if (!country) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      const footer = await prisma.countryFooter.findUnique({ where: { countryId: country.id } });
      if (!footer) {
        return reply
          .status(404)
          .send(errorResponse("Save the base footer before adding a translation"));
      }
      const { locale, ...data } = parsed.data;
      if (locale === country.defaultLocale) {
        const updated = await prisma.countryFooter.update({
          where: { id: footer.id },
          data: {
            ...(data.tagline !== undefined && { tagline: data.tagline }),
            ...(data.contactHours !== undefined && { contactHours: data.contactHours }),
            ...(data.customColumns !== undefined && { customColumns: data.customColumns }),
            ...(data.copyrightLine !== undefined && { copyrightLine: data.copyrightLine }),
          },
          include: { country: { select: { id: true, code: true, name: true } } },
        });
        return okResponse({ footer: toCountryFooterDto(updated) }, "Footer saved");
      }
      await prisma.countryFooterTranslation.upsert({
        where: { countryFooterId_locale: { countryFooterId: footer.id, locale } },
        create: { countryFooterId: footer.id, locale, ...data },
        update: data,
      });
      const row = await prisma.countryFooter.findUniqueOrThrow({
        where: { id: footer.id },
        include: {
          country: { select: { id: true, code: true, name: true, defaultLocale: true } },
          translations: true,
        },
      });
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "COUNTRY_FOOTER_UPDATED",
        entityType: "CountryFooter",
        entityId: row.id,
        metadata: { countryCode: country.code, locale },
        request,
      }).catch(() => {});
      return okResponse(
        { footer: toCountryFooterDtoWithLocale(row, locale, row.country.defaultLocale) },
        "Footer translation saved",
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save footer translation"));
    }
  }
};

export default adminCountryFooterRoute;
