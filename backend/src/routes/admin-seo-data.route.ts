import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { queryGa4, querySearchConsole } from "../lib/google-seo/google-seo.service.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const dateQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function defaultRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 28);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}

function resolveRange(input: unknown): { startDate: string; endDate: string } {
  const parsed = dateQuery.parse(input);
  const fallback = defaultRange();
  const range = {
    startDate: parsed.startDate ?? fallback.startDate,
    endDate: parsed.endDate ?? fallback.endDate,
  };
  if (range.endDate < range.startDate) throw new Error("endDate must be on or after startDate.");
  return range;
}

const adminSeoDataRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/seo/search-console", async (request, reply) => {
    try {
      return okResponse(await querySearchConsole(resolveRange(request.query)));
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
      return okResponse(await queryGa4(resolveRange(request.query)));
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

export default adminSeoDataRoute;
