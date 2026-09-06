import type { FastifyPluginAsync } from "fastify";
import { recordEntityPurge } from "../modules/audit/audit.service.js";
import { Prisma } from "@prisma/client";
import type { CountryDeleteBlockers } from "../modules/countries/countries.service.js";
import {
  CountryCurrencyNotFoundError,
  CountryDeleteBlockedError,
  CountryLocaleValidationError,
  LegalProfileMissingError,
  createAdminCountry,
  disableAdminCountry,
  getAdminCountryById,
  getCountryDeleteImpact,
  listAdminCountries,
  listAdminCurrencies,
  purgeAdminCountry,
  updateAdminCountry,
  getCountryLegalProfile,
  upsertCountryLegalProfile,
  upsertCountryLegalProfileTrustTranslation,
  listCountryLegalDocuments,
  upsertCountryLegalDocument,
  deleteCountryLegalDocument,
} from "../modules/countries/countries.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";
import {
  adminCountryCreateBodySchema,
  adminCountryUpdateBodySchema,
  countryIdParamsSchema,
  countryLegalProfileBodySchema,
  countryLegalProfileTrustTranslationUpsertSchema,
  countryLegalDocumentBodySchema,
  legalDocumentIdParamsSchema,
} from "../validations/admin-countries.schema.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
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

const COUNTRY_BLOCKER_LABELS: Record<keyof CountryDeleteBlockers, [string, string]> = {
  doctors: ["doctor profile", "doctor profiles"],
  appointments: ["appointment", "appointments"],
  clinicalRecords: ["clinical record", "clinical records"],
  patientRecords: ["patient record", "patient records"],
  membershipEnrollments: ["membership enrollment", "membership enrollments"],
  allowanceBalances: ["allowance balance", "allowance balances"],
  allowanceUsage: ["allowance usage entry", "allowance usage entries"],
  subscriptions: ["subscription", "subscriptions"],
  financialRecords: ["financial record", "financial records"],
  corporateRecords: ["corporate record", "corporate records"],
  legalDocuments: ["legal document", "legal documents"],
  jobListings: ["job listing", "job listings"],
};

/** "3 membership enrollments, 1 doctor profile" — non-zero counts only, in
 *  declaration order. Counts, never identifiers. */
function describeCountryBlockers(blockers: CountryDeleteBlockers): string {
  return (Object.entries(blockers) as [keyof CountryDeleteBlockers, number][])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const [one, many] = COUNTRY_BLOCKER_LABELS[key];
      return `${count} ${count === 1 ? one : many}`;
    })
    .join(", ");
}

const adminCountriesRoute: FastifyPluginAsync = async (app) => {
  // SEC-001: country CRUD / global config is cross-country — exclude
  // LOCAL_ADMIN, who is scoped to a single country.
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
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

  // Read-only: what a hard delete of this country would destroy, detach or
  // refuse. Counts only — never a name, an address or any patient field.
  // Informational; `purgeAdminCountry` recomputes the same blockers under a
  // lock inside its own transaction, and that recomputation is the decision.
  app.get("/api/admin/countries/:id/delete-impact", async (request, reply) => {
    const params = countryIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
    }
    try {
      const impact = await getCountryDeleteImpact(params.data.id);
      if (!impact) {
        return reply.status(404).send(errorResponse("Country not found"));
      }
      return okResponse(impact);
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
      // Durable membership, financial, appointment, patient, clinical, legal
      // or corporate history. Not overridable by any confirmation — nothing
      // was deleted, and no purge audit event is emitted.
      if (error instanceof CountryDeleteBlockedError) {
        return reply.status(409).send(
          errorResponse(
            `Cannot delete: this country still has ${describeCountryBlockers(error.impact.blockers)}. ` +
              "These records must be retained — deactivate the country instead.",
            { code: "COUNTRY_HAS_DURABLE_RECORDS", impact: error.impact },
          ),
        );
      }
      // A Restrict relation refused the delete after the recount cleared it.
      // The lock inside the purge transaction is meant to make this
      // unreachable; it is the backstop so a race surfaces as 409, not 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return reply.status(409).send(
          errorResponse(
            "Cannot delete: linked records still reference this country. Deactivate it instead.",
            { code: "COUNTRY_HAS_DURABLE_RECORDS" },
          ),
        );
      }
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
    // A payload carrying `locale` targets one locale's translation override
    // of the trust-bar fields instead of the base row (same convention as
    // the footer's locale-aware PUT).
    const hasLocale =
      !!request.body && typeof request.body === "object" && "locale" in request.body;
    if (hasLocale) {
      const body = countryLegalProfileTrustTranslationUpsertSchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid legal profile translation payload", body.error.flatten()));
      }
      try {
        const legalProfile = await upsertCountryLegalProfileTrustTranslation(params.data.id, body.data);
        if (!legalProfile) return reply.status(404).send(errorResponse("Country not found"));
        return okResponse({ legalProfile }, "Legal profile translation saved");
      } catch (error) {
        if (error instanceof LegalProfileMissingError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof LocaleNotSupportedError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Unexpected legal profile error"));
      }
    }
    const body = countryLegalProfileBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid legal profile payload", body.error.flatten()));
    }
    try {
      const legalProfile = await upsertCountryLegalProfile(params.data.id, body.data);
      return okResponse({ legalProfile }, "Legal profile saved");
    } catch (error) {
      if (error instanceof LocaleNotSupportedError) {
        return reply.status(400).send(errorResponse(error.message));
      }
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
