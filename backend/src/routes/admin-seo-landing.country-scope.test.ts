import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
  createDeleteLandingPage,
  createResolveLandingPageCountry,
} from "../modules/seo-landing/seo-landing.service.js";
import { createNestedCountryOwnershipAuditor } from "../utils/admin-country-scope.js";
import { createAdminSeoLandingRoute } from "./admin-seo-landing.route.js";

const validBody = {
  slug: "heart-health",
  isPublished: false,
  sortOrder: 0,
  translations: [{ locale: "EN", title: "Heart health" }],
};

describe("admin SEO landing routes country scope", () => {
  it("denies an out-of-scope PUT before any mutation", async () => {
    let upserts = 0;
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoLandingRoute({
        verifyAdminAccess: async () => ({ ok: true, method: "session" }),
        verifyCountryScope: async () => ({
          allowed: false,
          status: 403,
          message: "This country is outside your assigned scope",
        }),
        upsertLandingPage: async () => {
          upserts += 1;
          return {} as never;
        },
      }),
    );

    const response = await app.inject({
      method: "PUT",
      url: "/api/admin/countries/country-ie/landing-pages",
      payload: validBody,
    });
    await app.close();

    assert.equal(response.statusCode, 403, response.body);
    assert.equal(upserts, 0);
  });

  it("passes the authenticated access result into the country guard", async () => {
    const authenticatedAccess = { ok: true, method: "token_fallback" } as const;
    let received: unknown;
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoLandingRoute({
        verifyAdminAccess: async () => authenticatedAccess,
        verifyCountryScope: async (input) => {
          received = input.authenticatedAccess;
          return { allowed: true, countryCode: "pt" };
        },
        listAdminLandingPages: async () => ({ countryId: "country-pt", pages: [] }),
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/countries/country-pt/landing-pages",
    });
    await app.close();

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(received, authenticatedAccess);
  });

  it("rejects invalid params before scope or service lookup", async () => {
    let scopeCalls = 0;
    let serviceCalls = 0;
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoLandingRoute({
        verifyAdminAccess: async () => ({ ok: true, method: "session" }),
        verifyCountryScope: async () => {
          scopeCalls += 1;
          return { allowed: true, countryCode: "pt" };
        },
        listAdminLandingPages: async () => {
          serviceCalls += 1;
          return { countryId: "unused", pages: [] };
        },
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/admin/countries/${"x".repeat(65)}/landing-pages`,
    });
    await app.close();

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(scopeCalls, 0);
    assert.equal(serviceCalls, 0);
  });

  it("returns 404 and performs no delete for a cross-country nested page for every admin method", async () => {
    for (const method of ["session", "token_fallback"] as const) {
      let deletes = 0;
      const scopedDelete = createDeleteLandingPage({
        deletePage: async () => {
          deletes += 1;
          return { count: 1 };
        },
      });
      const app = Fastify({ logger: false });
      await app.register(
        createAdminSeoLandingRoute({
          verifyAdminAccess: async () => ({ ok: true, method }),
          verifyCountryScope: async () => ({ allowed: true, countryCode: "pt" }),
          resolveLandingPageCountry: createResolveLandingPageCountry({
            findPageCountry: async () => ({ countryId: "country-ie" }),
          }),
          auditNestedOwnershipMismatch: async () => {},
          deleteLandingPage: scopedDelete,
        }),
      );

      const response = await app.inject({
        method: "DELETE",
        url: "/api/admin/countries/country-pt/landing-pages/page-from-ie",
      });
      await app.close();

      assert.equal(response.statusCode, 404, response.body);
      assert.equal(deletes, 0, `${method} must not mutate the cross-country page`);
    }
  });

  it("qualifies a matching nested delete by both country and page id", async () => {
    const deleteCalls: Array<{ id: string; countryId: string }> = [];
    const scopedDelete = createDeleteLandingPage({
      deletePage: async (where) => {
        deleteCalls.push(where);
        return { count: 1 };
      },
    });

    assert.equal(await scopedDelete("country-pt", "page-pt"), true);
    assert.deepEqual(deleteCalls, [{ id: "page-pt", countryId: "country-pt" }]);
  });

  it("audits a cross-country mismatch exactly once without body data", async () => {
    const bodyMarker = "delete-secret-body-marker";
    const auditEvents: Array<Record<string, unknown>> = [];
    let deletes = 0;
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoLandingRoute({
        verifyAdminAccess: async () => ({ ok: true, method: "session" }),
        verifyCountryScope: async () => ({ allowed: true, countryCode: "pt" }),
        resolveLandingPageCountry: async () => ({ countryId: "country-ie" }),
        auditNestedOwnershipMismatch: createNestedCountryOwnershipAuditor({
          auditDenied: async (input) => {
            auditEvents.push(input as unknown as Record<string, unknown>);
          },
        }),
        deleteLandingPage: async () => {
          deletes += 1;
          return true;
        },
      }),
    );

    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/countries/country-pt/landing-pages/page-from-ie",
      payload: { marker: bodyMarker },
    });
    await app.close();

    assert.equal(response.statusCode, 404, response.body);
    assert.equal(auditEvents.length, 1);
    assert.equal(deletes, 0);
    assert.ok(!JSON.stringify(auditEvents).includes(bodyMarker));
    assert.deepEqual(auditEvents[0]?.metadata, {
      reason: "Nested resource country mismatch",
      operation: "delete",
      routeCountryId: "country-pt",
      routeCountryCode: "pt",
      resourceCountryId: "country-ie",
      resourceType: "SeoLandingPage",
      resourceId: "page-from-ie",
    });
  });
});
