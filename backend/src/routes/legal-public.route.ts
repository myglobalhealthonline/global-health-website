import type { FastifyPluginAsync } from "fastify";
import { LegalDocumentType } from "@prisma/client";
import {
  getPublicCountryLegal,
  getPublicCountryLegalDocument,
} from "../modules/countries/countries.service.js";
import { buildPublicMediaUrl } from "../utils/public-media-url.js";
import { errorResponse, okResponse } from "../utils/response.js";

const LEGAL_TYPES = new Set<string>(Object.values(LegalDocumentType));

/** Accepts "privacy-policy" or "PRIVACY_POLICY"; returns the enum or null. */
function parseLegalType(raw: string): LegalDocumentType | null {
  const normalized = raw.trim().replace(/-/g, "_").toUpperCase();
  return LEGAL_TYPES.has(normalized) ? (normalized as LegalDocumentType) : null;
}

const CACHE_HEADER = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

/**
 * Visitor-facing legal endpoints. Published documents only — drafts stay
 * admin-side. Content is admin-authored HTML; the frontend sanitizes at
 * render time (same boundary as CMS page bodies).
 */
const legalPublicRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { code: string } }>(
    "/api/countries/:code/legal",
    async (request, reply) => {
      reply.header("Cache-Control", CACHE_HEADER);
      try {
        const country = await getPublicCountryLegal(request.params.code);
        if (!country) return reply.status(404).send(errorResponse("Country not found"));

        return okResponse({
          country: { code: country.code, name: country.name },
          profile: country.legalProfile,
          documents: country.legalDocuments.map((d) => ({
            type: d.type,
            title: d.title,
            locale: d.locale,
            version: d.version,
            publishedAt: d.publishedAt,
            updatedAt: d.updatedAt,
            hasPdf: Boolean(d.pdfPath),
          })),
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Legal information unavailable"));
      }
    },
  );

  app.get<{ Params: { code: string; type: string }; Querystring: { locale?: string } }>(
    "/api/countries/:code/legal-documents/:type",
    async (request, reply) => {
      reply.header("Cache-Control", CACHE_HEADER);

      const type = parseLegalType(request.params.type);
      if (!type) return reply.status(400).send(errorResponse("Unknown legal document type"));

      try {
        const result = await getPublicCountryLegalDocument(
          request.params.code,
          type,
          request.query.locale ?? "en",
        );
        if (!result) return reply.status(404).send(errorResponse("Legal document not found"));

        const { country, document } = result;
        return okResponse({
          country,
          document: {
            type: document.type,
            title: document.title,
            content: document.content,
            locale: document.locale,
            version: document.version,
            publishedAt: document.publishedAt,
            updatedAt: document.updatedAt,
            pdfUrl: document.pdfPath ? buildPublicMediaUrl(request, document.pdfPath) : null,
          },
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Legal document unavailable"));
      }
    },
  );
};

export default legalPublicRoute;
