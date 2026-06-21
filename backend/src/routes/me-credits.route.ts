import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { getCreditsView } from "../modules/credits/credits-read.service.js";

/**
 * GET /api/me/credits — consultation + wellness balances (from the counter) +
 * recent ledger history (contracts.md). Auth required (D15).
 */
const meCreditsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/credits", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    try {
      const sub = await prisma.userSubscription.findFirst({
        where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED"] } },
        orderBy: { createdAt: "desc" },
        select: { id: true, currentPeriodStart: true },
      });
      if (!sub) {
        return okResponse({
          consultation: { balance: 0, usedThisPeriod: 0 },
          wellness: { balance: 0 },
          ledger: [],
        });
      }
      return okResponse(await getCreditsView(sub.id, sub.currentPeriodStart));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load credits"));
    }
  });
};

export default meCreditsRoute;
