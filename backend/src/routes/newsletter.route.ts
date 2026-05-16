import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  countryCode: z.string().trim().max(8).optional(),
  locale: z.string().trim().max(8).optional(),
  source: z.string().trim().max(64).optional(),
});

/**
 * Public newsletter capture + admin list/export.
 *
 * - POST /api/newsletter is open + rate-limited (10/hour/IP) to stop bots
 *   from filling the table.
 * - GET /api/admin/newsletter and the .csv variant require admin auth.
 *
 * No double-opt-in flow yet — we just dedupe by unique email. Add a
 * confirmation token + SendGrid email later if GDPR posture requires it.
 */
const newsletterRoute: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/newsletter",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const body = subscribeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid email", body.error.flatten()));
      }
      try {
        const { email, countryCode, locale, source } = body.data;
        await prisma.newsletterSubscriber.upsert({
          where: { email },
          // Re-subscribing clears any previous unsubscribe.
          update: {
            countryCode: countryCode ?? null,
            locale: locale ?? null,
            source: source ?? null,
            unsubscribedAt: null,
          },
          create: {
            email,
            countryCode: countryCode ?? null,
            locale: locale ?? null,
            source: source ?? null,
          },
        });
        return okResponse({ subscribed: true }, "Subscribed");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save subscription"));
      }
    },
  );

  app.get("/api/admin/newsletter", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      const rows = await prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return okResponse({
        items: rows.map((r) => ({
          id: r.id,
          email: r.email,
          countryCode: r.countryCode,
          locale: r.locale,
          source: r.source,
          unsubscribedAt: r.unsubscribedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        })),
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load subscribers"));
    }
  });

  app.get("/api/admin/newsletter.csv", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    try {
      const rows = await prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
      });
      // Minimal CSV — admin loads it in Excel/Numbers. Escape double quotes
      // by doubling them per RFC 4180.
      const esc = (v: string | null) =>
        v === null ? "" : `"${v.replace(/"/g, '""')}"`;
      const lines = ["email,countryCode,locale,source,unsubscribedAt,createdAt"];
      for (const r of rows) {
        lines.push(
          [
            esc(r.email),
            esc(r.countryCode),
            esc(r.locale),
            esc(r.source),
            esc(r.unsubscribedAt?.toISOString() ?? null),
            esc(r.createdAt.toISOString()),
          ].join(","),
        );
      }
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header(
        "Content-Disposition",
        `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return reply.send(lines.join("\n"));
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not export subscribers"));
    }
  });
};

export default newsletterRoute;
