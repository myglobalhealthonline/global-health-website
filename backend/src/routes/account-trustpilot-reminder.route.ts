import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { getSetting } from "../modules/settings/settings.service.js";
import { errorResponse, okResponse } from "../utils/response.js";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const accountTrustpilotReminderRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/account/trustpilot-reminder",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser) return reply.status(401).send(errorResponse("Not authenticated"));
      const userId = request.authUser.sub;

      try {
        const cutoff = new Date(Date.now() - THREE_DAYS_MS);

        const completed = await prisma.appointment.findFirst({
          where: {
            userId,
            status: "COMPLETED",
            updatedAt: { gte: cutoff },
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
        });

        if (!completed) {
          return okResponse({ showCta: false, trustpilotUrl: null, completedAt: null });
        }

        const businessUnitId = await getSetting<string>("review.trustpilot.businessUnitId");
        const trustpilotUrl = businessUnitId
          ? `https://www.trustpilot.com/evaluate/${businessUnitId}`
          : null;

        return okResponse({
          showCta: true,
          trustpilotUrl,
          completedAt: completed.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load reminder state"));
      }
    },
  );
};

export default accountTrustpilotReminderRoute;
