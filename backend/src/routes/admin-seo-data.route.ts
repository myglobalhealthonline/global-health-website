import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  defaultSearchConsoleRange,
  queryGa4,
  querySearchConsole,
  type SeoDateRange,
} from "../lib/google-seo/google-seo.service.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const dateQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function defaultRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

function resolveRange(input: unknown, fallback: SeoDateRange): SeoDateRange {
  const parsed = dateQuery.parse(input);
  const range = {
    startDate: parsed.startDate ?? fallback.startDate,
    endDate: parsed.endDate ?? fallback.endDate,
  };
  if (range.endDate < range.startDate) throw new Error("endDate must be on or after startDate.");
  return range;
}

type AdminSeoDataDependencies = {
  getSearchConsoleDefaultRange: () => SeoDateRange;
  getGa4DefaultRange: () => SeoDateRange;
  querySearchConsole: typeof querySearchConsole;
  queryGa4: typeof queryGa4;
  verifyGlobalAdminAccess: typeof verifyGlobalAdminAccess;
};

export function createAdminSeoDataRoute(
  overrides: Partial<AdminSeoDataDependencies> = {},
): FastifyPluginAsync {
  const dependencies: AdminSeoDataDependencies = {
    getSearchConsoleDefaultRange: () => defaultSearchConsoleRange(),
    getGa4DefaultRange: defaultRange,
    querySearchConsole,
    queryGa4,
    verifyGlobalAdminAccess,
    ...overrides,
  };

  return async (app) => {
    app.addHook("onRequest", async (request, reply) => {
      const auth = await dependencies.verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    });

    app.get("/api/admin/seo/search-console", async (request, reply) => {
      try {
        const range = resolveRange(request.query, dependencies.getSearchConsoleDefaultRange());
        return okResponse(await dependencies.querySearchConsole(range));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load Search Console data";
        if (error instanceof z.ZodError || message.startsWith("Dates") || message.startsWith("endDate")) {
          return reply.status(400).send(errorResponse(message));
        }
        request.log.error({ err: error }, "Search Console query failed");
        return reply.status(502).send(errorResponse("Could not load Search Console data"));
      }
    });

    app.get("/api/admin/seo/ga4", async (request, reply) => {
      try {
        const range = resolveRange(request.query, dependencies.getGa4DefaultRange());
        return okResponse(await dependencies.queryGa4(range));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load GA4 data";
        if (error instanceof z.ZodError || message.startsWith("Dates") || message.startsWith("endDate")) {
          return reply.status(400).send(errorResponse(message));
        }
        request.log.error({ err: error }, "GA4 query failed");
        return reply.status(502).send(errorResponse("Could not load GA4 data"));
      }
    });
  };
}

const adminSeoDataRoute = createAdminSeoDataRoute();

export default adminSeoDataRoute;
