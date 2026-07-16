import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  SeoLandingNotFoundError,
  deleteLandingPage,
  listAdminLandingPages,
  resolveLandingPageCountry,
  upsertLandingPage,
} from "../modules/seo-landing/seo-landing.service.js";
import type { AdminAccessResult } from "../utils/admin-access-evaluator.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import {
  auditNestedCountryOwnershipMismatch,
  verifyAdminCountryScope,
  type AdminAuthenticatedAccess,
  type AdminCountryScopeInput,
  type AdminCountryScopeResult,
  type NestedCountryOwnershipInput,
} from "../utils/admin-country-scope.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  seoLandingIdParamsSchema,
  seoLandingPageParamsSchema,
  seoLandingUpsertBodySchema,
} from "../validations/seo-landing.schema.js";

type AdminSeoLandingDependencies = {
  verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult>;
  verifyCountryScope(input: AdminCountryScopeInput): Promise<AdminCountryScopeResult>;
  listAdminLandingPages: typeof listAdminLandingPages;
  upsertLandingPage: typeof upsertLandingPage;
  resolveLandingPageCountry: typeof resolveLandingPageCountry;
  deleteLandingPage: typeof deleteLandingPage;
  auditNestedOwnershipMismatch(input: NestedCountryOwnershipInput): Promise<void>;
};

const defaultDependencies: AdminSeoLandingDependencies = {
  verifyAdminAccess,
  verifyCountryScope: verifyAdminCountryScope,
  listAdminLandingPages,
  upsertLandingPage,
  resolveLandingPageCountry,
  deleteLandingPage,
  auditNestedOwnershipMismatch: auditNestedCountryOwnershipMismatch,
};

export function createAdminSeoLandingRoute(
  overrides: Partial<AdminSeoLandingDependencies> = {},
): FastifyPluginAsync {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async (app) => {
    const authenticatedRequests = new WeakMap<FastifyRequest, AdminAuthenticatedAccess>();

    app.addHook("onRequest", async (request, reply) => {
      const auth = await dependencies.verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      authenticatedRequests.set(request, auth);
    });

    async function authorizeCountry(
      request: FastifyRequest,
      countryId: string,
      operation: string,
      resourceType: string,
      resourceId?: string,
    ): Promise<AdminCountryScopeResult> {
      const authenticatedAccess = authenticatedRequests.get(request);
      if (!authenticatedAccess) {
        return {
          allowed: false,
          status: 503,
          message: "Admin authorization is temporarily unavailable",
        };
      }
      return dependencies.verifyCountryScope({
        request,
        authenticatedAccess,
        countryId,
        operation,
        resourceType,
        ...(resourceId ? { resourceId } : {}),
      });
    }

    app.get("/api/admin/countries/:countryId/landing-pages", async (request, reply) => {
      const params = seoLandingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
      }
      const scope = await authorizeCountry(
        request,
        params.data.countryId,
        "list",
        "SeoLandingPage",
      );
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }
      try {
        const data = await dependencies.listAdminLandingPages(params.data.countryId);
        if (!data) return reply.status(404).send(errorResponse("Country not found"));
        return okResponse(data);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load landing pages"));
      }
    });

    app.put("/api/admin/countries/:countryId/landing-pages", async (request, reply) => {
      const params = seoLandingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid country id", params.error.flatten()));
      }
      const scope = await authorizeCountry(
        request,
        params.data.countryId,
        "upsert",
        "SeoLandingPage",
      );
      if (!scope.allowed) {
        return reply.status(scope.status).send(errorResponse(scope.message));
      }
      const body = seoLandingUpsertBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid landing page", body.error.flatten()));
      }
      try {
        const page = await dependencies.upsertLandingPage(params.data.countryId, body.data);
        return okResponse({ page }, "Landing page saved");
      } catch (error) {
        if (error instanceof SeoLandingNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save landing page"));
      }
    });

    app.delete(
      "/api/admin/countries/:countryId/landing-pages/:pageId",
      async (request, reply) => {
        const params = seoLandingPageParamsSchema.safeParse(request.params);
        if (!params.success) {
          return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
        }
        const scope = await authorizeCountry(
          request,
          params.data.countryId,
          "delete",
          "SeoLandingPage",
          params.data.pageId,
        );
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }
        try {
          const owner = await dependencies.resolveLandingPageCountry(params.data.pageId);
          if (!owner) {
            return reply.status(404).send(errorResponse("Landing page not found"));
          }
          if (owner.countryId !== params.data.countryId) {
            const authenticatedAccess = authenticatedRequests.get(request);
            if (!authenticatedAccess) {
              return reply
                .status(503)
                .send(errorResponse("Admin authorization is temporarily unavailable"));
            }
            await dependencies.auditNestedOwnershipMismatch({
              request,
              authenticatedAccess,
              operation: "delete",
              routeCountryId: params.data.countryId,
              routeCountryCode: scope.countryCode,
              resourceCountryId: owner.countryId,
              resourceType: "SeoLandingPage",
              resourceId: params.data.pageId,
            });
            return reply.status(404).send(errorResponse("Landing page not found"));
          }
          const deleted = await dependencies.deleteLandingPage(
            params.data.countryId,
            params.data.pageId,
          );
          if (!deleted) return reply.status(404).send(errorResponse("Landing page not found"));
          return okResponse({}, "Landing page deleted");
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not delete landing page"));
        }
      },
    );
  };
}

const adminSeoLandingRoute = createAdminSeoLandingRoute();

export default adminSeoLandingRoute;
