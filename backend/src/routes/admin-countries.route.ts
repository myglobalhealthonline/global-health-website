import type { FastifyPluginAsync } from "fastify";
import { recordEntityPurge } from "../modules/audit/audit.service.js";
import { Prisma } from "@prisma/client";
import {
  CountryCurrencyNotFoundError,
  CountryLocaleValidationError,
  createAdminCountry,
  disableAdminCountry,
  getAdminCountryById,
  listAdminCountries,
  listAdminCurrencies,
  purgeAdminCountry,
  updateAdminCountry,
  getCountryLegalProfile,
  upsertCountryLegalProfile,
  listCountryLegalDocuments,
  upsertCountryLegalDocument,
  deleteCountryLegalDocument,
} from "../modules/countries/countries.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminCountryCreateBodySchema,
  adminCountryUpdateBodySchema,
  countryIdParamsSchema,
  countryLegalProfileBodySchema,
  countryLegalDocumentBodySchema,
  legalDocumentIdParamsSchema,
} from "../validations/admin-countries.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleCountriesWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (error instanceof CountryCurrencyNotFoundError || error instanceof CountryLocaleValidationError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique country field (code, slug, path, or domain)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin countries error"));
}

const adminCountriesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/currencies", async (_request, reply) => {
    try {
      const currencies = await listAdminCurrencies();
      return okResponse({ currencies });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin currencies error"));
    }
  });

  app.get("/api/admin/countries", async (_request, reply) => {
    try {
      const countries = await listAdminCountries();
      return okResponse({ countries });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin countries error"));
    }
  });

  app.get("/api/admin/countries/:id", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }

    try {
      const country = await getAdminCountryById(params.data.id);
      if (!country) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      return okResponse({ country });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin country error"));
    }
  });

  app.post("/api/admin/countries", async (request, reply) => {
    const body = adminCountryCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid country payload", body.error.flatten()));
    }

    try {
      const country = await createAdminCountry(body.data);
      return okResponse({ country }, "Country created");
    } catch (error) {
      return handleCountriesWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/countries/:id", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }

    const body = adminCountryUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid country update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const country = await updateAdminCountry(params.data.id, body.data);
      if (!country) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      return okResponse({ country }, "Country updated");
    } catch (error) {
      return handleCountriesWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/countries/:id", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }

    try {
      const country = await disableAdminCountry(params.data.id);
      if (!country) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      return okResponse({ country }, "Country deactivated");
    } catch (error) {
      return handleCountriesWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/countries/:id/purge", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }

    try {
      const deleted = await purgeAdminCountry(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      recordEntityPurge(request, "Country", params.data.id);
      return okResponse({}, "Country deleted");
    } catch (error) {
      return handleCountriesWriteError(app, reply, error);
    }
  });
  // ── CountryLegalProfile ────────────────────────────────────────────────────

  app.get("/api/admin/countries/:id/legal", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    try {
      const legalProfile = await getCountryLegalProfile(params.data.id);
      return okResponse({ legalProfile });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected legal profile error"));
    }
  });

  app.put("/api/admin/countries/:id/legal", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    const body = countryLegalProfileBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid legal profile payload", body.error.flatten()));
    }
    try {
      const legalProfile = await upsertCountryLegalProfile(params.data.id, body.data);
      return okResponse({ legalProfile }, "Legal profile saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected legal profile error"));
    }
  });

  // ── CountryLegalDocument ───────────────────────────────────────────────────

  app.get("/api/admin/countries/:id/legal-documents", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    try {
      const documents = await listCountryLegalDocuments(params.data.id);
      return okResponse({ documents });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected legal documents error"));
    }
  });

  app.put("/api/admin/countries/:id/legal-documents", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    const body = countryLegalDocumentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid legal document payload", body.error.flatten()));
    }
    try {
      const document = await upsertCountryLegalDocument(params.data.id, body.data);
      return okResponse({ document }, "Legal document saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected legal document error"));
    }
  });

  app.delete("/api/admin/countries/:id/legal-documents/:docId", async (request, reply) => {
    const params = legalDocumentIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    try {
      const deleted = await deleteCountryLegalDocument(params.data.docId);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Legal document not found"));
      }
      return okResponse({}, "Legal document deleted");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected legal document error"));
    }
  });
};

export default adminCountriesRoute;
