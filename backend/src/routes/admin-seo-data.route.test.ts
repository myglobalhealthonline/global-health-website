import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import type {
  SearchConsoleSegment,
  SearchConsoleSummary,
  SeoDateRange,
} from "../lib/google-seo/google-seo.service.js";
import { createAdminSeoDataRoute } from "./admin-seo-data.route.js";

const emptySummary = (): SearchConsoleSummary => ({
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
  pages: 0,
});

const emptySegments = (): Record<SearchConsoleSegment, SearchConsoleSummary> => ({
  revenue: emptySummary(),
  tools: emptySummary(),
  informational: emptySummary(),
  legacy: emptySummary(),
  other: emptySummary(),
});

describe("admin SEO data routes", () => {
  it("uses the Search Console completeness lag window when no query dates are provided", async () => {
    const searchConsoleCalls: SeoDateRange[] = [];
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoDataRoute({
        verifyGlobalAdminAccess: async () => ({ ok: true, method: "session" }),
        getSearchConsoleDefaultRange: () => ({
          startDate: "2026-07-17",
          endDate: "2026-08-13",
        }),
        querySearchConsole: async (range) => {
          searchConsoleCalls.push(range);
          return { rows: [], pages: [], totals: emptySummary(), segments: emptySegments() };
        },
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/seo/search-console",
    });
    await app.close();

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(searchConsoleCalls, [{ startDate: "2026-07-17", endDate: "2026-08-13" }]);
  });

  it("keeps explicit Search Console dates instead of replacing them with the fallback window", async () => {
    const searchConsoleCalls: SeoDateRange[] = [];
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoDataRoute({
        verifyGlobalAdminAccess: async () => ({ ok: true, method: "session" }),
        getSearchConsoleDefaultRange: () => ({
          startDate: "2000-01-01",
          endDate: "2000-01-28",
        }),
        querySearchConsole: async (range) => {
          searchConsoleCalls.push(range);
          return { rows: [], pages: [], totals: emptySummary(), segments: emptySegments() };
        },
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/seo/search-console?startDate=2026-08-01&endDate=2026-08-13",
    });
    await app.close();

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(searchConsoleCalls, [{ startDate: "2026-08-01", endDate: "2026-08-13" }]);
  });

  it("returns 400 for an inverted Search Console range before calling Google", async () => {
    let calls = 0;
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoDataRoute({
        verifyGlobalAdminAccess: async () => ({ ok: true, method: "session" }),
        querySearchConsole: async () => {
          calls += 1;
          return { rows: [], pages: [], totals: emptySummary(), segments: emptySegments() };
        },
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/seo/search-console?startDate=2026-08-13&endDate=2026-08-01",
    });
    await app.close();

    assert.equal(response.statusCode, 400, response.body);
    assert.equal(calls, 0);
  });

  it("keeps the GA4 endpoint on its own default range", async () => {
    const ga4Calls: SeoDateRange[] = [];
    const app = Fastify({ logger: false });
    await app.register(
      createAdminSeoDataRoute({
        verifyGlobalAdminAccess: async () => ({ ok: true, method: "session" }),
        getGa4DefaultRange: () => ({
          startDate: "2026-07-20",
          endDate: "2026-08-16",
        }),
        queryGa4: async (range) => {
          ga4Calls.push(range);
          return { rows: [], dimensionHeaders: [], metricHeaders: [] };
        },
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/seo/ga4",
    });
    await app.close();

    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(ga4Calls, [{ startDate: "2026-07-20", endDate: "2026-08-16" }]);
  });
});
