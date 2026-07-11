import type { FastifyPluginAsync } from "fastify";
import { InsurancePricingMode } from "@prisma/client";
import { z } from "zod";
import {
  createInsuranceCompany,
  deleteInsuranceCompany,
  listInsuranceCompanies,
  listCountryServicesWithCoverage,
  setCompanyCoverage,
  updateInsuranceCompany,
} from "../modules/insurance-companies/insurance-companies.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for a country's insurance companies + per-service coverage.
 *
 *   GET    /api/admin/countries/:countryId/insurance-companies
 *   POST   /api/admin/countries/:countryId/insurance-companies
 *   PATCH  /api/admin/countries/:countryId/insurance-companies/:companyId
 *   DELETE /api/admin/countries/:countryId/insurance-companies/:companyId
 *   GET    /api/admin/countries/:countryId/insurance-companies/:companyId/coverage
 *   PUT    /api/admin/countries/:countryId/insurance-companies/:companyId/coverage
 */

const idParam = z.string().trim().min(1).max(64);
const pricingModeValues = Object.values(InsurancePricingMode) as [
  InsurancePricingMode,
  ...InsurancePricingMode[],
];

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    pricingMode: z.enum(pricingModeValues),
    discountPercent: z.number().int().min(0).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .strict()
  // PERCENT companies must carry a percent; FIXED companies must not.
  .refine(
    (d) => d.pricingMode !== "PERCENT" || (d.discountPercent != null),
    { message: "A percentage discount is required for PERCENT companies", path: ["discountPercent"] },
  );

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    pricingMode: z.enum(pricingModeValues).optional(),
    discountPercent: z.number().int().min(0).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .strict();

const coverageSchema = z
  .object({
    items: z
      .array(
        z.object({
          serviceId: z.string().trim().min(1).max(64),
          covered: z.boolean(),
          overridePriceCents: z.number().int().min(0).max(100_000_000).nullable().optional(),
        }),
      )
      .max(1000),
  })
  .strict();

const adminInsuranceCompaniesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.countryId).success) {
        return reply.status(400).send(errorResponse("Invalid country id"));
      }
      try {
        const rows = await listInsuranceCompanies(request.params.countryId);
        return okResponse({ insuranceCompanies: rows });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load insurance companies"));
      }
    },
  );

  app.post<{ Params: { countryId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.countryId).success) {
        return reply.status(400).send(errorResponse("Invalid country id"));
      }
      const body = createSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid insurance company", body.error.flatten()));
      }
      try {
        const row = await createInsuranceCompany(request.params.countryId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Country not found"));
        return okResponse({ insuranceCompany: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create insurance company"));
      }
    },
  );

  app.patch<{ Params: { countryId: string; companyId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies/:companyId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.companyId).success) {
        return reply.status(400).send(errorResponse("Invalid company id"));
      }
      const body = updateSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid insurance company", body.error.flatten()));
      }
      try {
        const row = await updateInsuranceCompany(request.params.companyId, body.data);
        if (!row) return reply.status(404).send(errorResponse("Insurance company not found"));
        return okResponse({ insuranceCompany: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update insurance company"));
      }
    },
  );

  app.delete<{ Params: { countryId: string; companyId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies/:companyId",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.companyId).success) {
        return reply.status(400).send(errorResponse("Invalid company id"));
      }
      try {
        const ok = await deleteInsuranceCompany(request.params.companyId);
        if (!ok) return reply.status(404).send(errorResponse("Insurance company not found"));
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete insurance company"));
      }
    },
  );

  app.get<{ Params: { countryId: string; companyId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies/:companyId/coverage",
    async (request, reply) => {
      if (
        !idParam.safeParse(request.params.countryId).success ||
        !idParam.safeParse(request.params.companyId).success
      ) {
        return reply.status(400).send(errorResponse("Invalid id"));
      }
      try {
        const data = await listCountryServicesWithCoverage(
          request.params.countryId,
          request.params.companyId,
        );
        if (!data) return reply.status(404).send(errorResponse("Insurance company not found"));
        return okResponse(data);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load service coverage"));
      }
    },
  );

  app.put<{ Params: { countryId: string; companyId: string } }>(
    "/api/admin/countries/:countryId/insurance-companies/:companyId/coverage",
    async (request, reply) => {
      if (!idParam.safeParse(request.params.companyId).success) {
        return reply.status(400).send(errorResponse("Invalid company id"));
      }
      const body = coverageSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid coverage", body.error.flatten()));
      }
      try {
        const ok = await setCompanyCoverage(request.params.companyId, body.data.items);
        if (!ok) return reply.status(404).send(errorResponse("Insurance company not found"));
        return okResponse({ saved: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save service coverage"));
      }
    },
  );
};

export default adminInsuranceCompaniesRoute;
