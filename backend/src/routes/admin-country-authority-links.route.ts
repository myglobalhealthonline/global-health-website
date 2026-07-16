import type { FastifyPluginAsync } from "fastify";
import { AuthorityCategory } from "@prisma/client";
import { z } from "zod";
import {
  createAuthorityLink,
  deleteAuthorityLink,
  listAuthorityLinks,
  updateAuthorityLink,
  upsertAuthorityLinkTranslation,
} from "../modules/country-authority-links/country-authority-links.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { localeCodeSchema } from "../validations/admin-countries.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for a country's official authority links (regulators, registries,
 * data-protection bodies, helplines, complaints). Feed the footer trust bar,
 * Organization/MedicalBusiness `sameAs` and the legal hub.
 *
 *   GET    /api/admin/countries/:countryId/authority-links
 *   POST   /api/admin/countries/:countryId/authority-links
 *   PATCH  /api/admin/countries/:countryId/authority-links/:linkId
 *   DELETE /api/admin/countries/:countryId/authority-links/:linkId
 */

const idParam = z.string().trim().min(1).max(64);
const categoryValues = Object.values(AuthorityCategory) as [AuthorityCategory, ...AuthorityCategory[]];

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    abbreviation: z.string().trim().max(32).optional().nullable(),
    // Be lenient about a missing scheme — admins routinely paste
    // "www.medicalcouncil.ie". Normalize to https:// then validate.
    url: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
      .refine(
        (v) => {
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        { message: "Invalid URL" },
      ),
    category: z.enum(categoryValues),
    description: z.string().trim().max(500).optional().nullable(),
    showInFooter: z.boolean().optional(),
    showInSchema: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateSchema = createSchema.partial();

// Locale-only PATCH payload — mirrors countryFooterTranslationUpsertSchema.
// url/category/showInFooter/showInSchema/sortOrder/isActive are NOT
// translatable and stay on the base row only (see
// CountryAuthorityLinkTranslation model comment in schema.prisma), so this
// schema only carries the three translatable fields + locale.
// ponytail: translation writes only apply to PATCH (an existing row). POST
// create always writes the base row — there's nothing to translate yet,
// same reasoning as CountryFooterTranslation's PUT guard ("save the base
// footer before adding a translation").
export const updateTranslationSchema = z
  .object({
    locale: localeCodeSchema,
    name: z.string().trim().min(1).max(200).optional(),
    abbreviation: z.string().trim().max(32).optional().nullable(),
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

const adminCountryAuthorityLinksRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/authority-links",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.countryId).success) {
        return reply.status(400).send(errorResponse("Invalid country id"));
      }
      try {
        const rows = await listAuthorityLinks(request.params.countryId);
        return okResponse({ authorityLinks: rows });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load authority links"));
      }
    },
  );

  app.post<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/authority-links",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.countryId).success) {
        return reply.status(400).send(errorResponse("Invalid country id"));
      }
      const body = createSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid authority link", body.error.flatten()));
      }
      try {
        const row = await createAuthorityLink(request.params.countryId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Country not found"));
        return okResponse({ authorityLink: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create authority link"));
      }
    },
  );

  app.patch<{ Params: { countryId: string; linkId: string } }>(
    "/api/admin/countries/:countryId/authority-links/:linkId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.linkId).success) {
        return reply.status(400).send(errorResponse("Invalid link id"));
      }
      // A payload carrying `locale` targets one locale's translation
      // override instead of the base row (same convention as the footer's
      // locale-aware PUT).
      const hasLocale =
        !!request.body && typeof request.body === "object" && "locale" in request.body;
      if (hasLocale) {
        const body = updateTranslationSchema.safeParse(request.body);
        if (!body.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid authority link translation", body.error.flatten()));
        }
        try {
          const { locale, ...data } = body.data;
          const row = await upsertAuthorityLinkTranslation(request.params.linkId, locale, data);
          if (!row) return reply.status(404).send(errorResponse("Authority link not found"));
          return okResponse({ authorityLink: row }, "Authority link translation saved");
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not update authority link translation"));
        }
      }
      const body = updateSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid authority link", body.error.flatten()));
      }
      try {
        const row = await updateAuthorityLink(request.params.linkId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Authority link not found"));
        return okResponse({ authorityLink: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update authority link"));
      }
    },
  );

  app.delete<{ Params: { countryId: string; linkId: string } }>(
    "/api/admin/countries/:countryId/authority-links/:linkId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.linkId).success) {
        return reply.status(400).send(errorResponse("Invalid link id"));
      }
      try {
        const ok = await deleteAuthorityLink(request.params.linkId);
        if (!ok) return reply.status(404).send(errorResponse("Authority link not found"));
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete authority link"));
      }
    },
  );
};

export default adminCountryAuthorityLinksRoute;
