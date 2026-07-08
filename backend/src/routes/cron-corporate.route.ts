import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";

/**
 * Corporate plan daily housekeeping. Token-gated (X-Cron-Token), fail
 * CLOSED — same posture as cron-subscriptions.
 *
 *   POST /api/cron/corporate/daily — once a day:
 *     1. expire open requests past expiresAt
 *     2. expire companies past contractEndAt (+ their cards)
 *     3. expire cards past validUntil
 *     4. remind unused invites older than 3 days (one reminder each)
 */
const cronCorporateRoute: FastifyPluginAsync = async (app) => {
  const checkToken = (request: FastifyRequest, reply: FastifyReply): boolean => {
    const expected = env.CRON_SECRET;
    const provided = request.headers["x-cron-token"];
    if (!expected) {
      app.log.error("CRON_SECRET is not set — refusing corporate cron");
      reply.status(503).send(errorResponse("Cron endpoint is not configured"));
      return false;
    }
    if (!isValidCronSecret(provided, expected)) {
      reply.status(401).send(errorResponse("Invalid cron token"));
      return false;
    }
    return true;
  };

  app.post("/api/cron/corporate/daily", async (request, reply) => {
    if (!checkToken(request, reply)) return;
    const now = new Date();
    try {
      const expiredRequests = await prisma.corporateServiceRequest.updateMany({
        where: { status: { in: ["REQUESTED", "EMPLOYEE_NOTIFIED"] }, expiresAt: { lt: now } },
        data: { status: "EXPIRED" },
      });

      const expiredCompanies = await prisma.corporateCompany.updateMany({
        where: { status: "ACTIVE", contractEndAt: { lt: now } },
        data: { status: "EXPIRED" },
      });
      // Cards under expired companies + independently overdue cards.
      const expiredCards = await prisma.corporateBenefitCard.updateMany({
        where: {
          status: { not: "EXPIRED" },
          OR: [
            { validUntil: { lt: now } },
            { employee: { company: { status: "EXPIRED" } } },
            { beneficiary: { company: { status: "EXPIRED" } } },
          ],
        },
        data: { status: "EXPIRED" },
      });

      // One reminder per unused invite older than 3 days (member still
      // in an invite-stage status).
      const staleInvites = await prisma.corporateInvite.findMany({
        where: {
          usedAt: null,
          reminderSentAt: null,
          expiresAt: { gt: now },
          createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, type: true, employeeId: true, beneficiaryId: true },
        take: 100,
      });
      let remindersSent = 0;
      for (const invite of staleInvites) {
        const memberId = invite.employeeId ?? invite.beneficiaryId;
        if (!memberId) continue;
        try {
          // mintAndSendInvite replaces the open invite row; stamp the OLD
          // row first so a send failure doesn't retry forever.
          await prisma.corporateInvite.update({
            where: { id: invite.id },
            data: { reminderSentAt: now },
          });
          await mintAndSendInvite({ type: invite.type, memberId, isReminder: true });
          remindersSent += 1;
        } catch (error) {
          app.log.error({ err: error, inviteId: invite.id }, "corporate invite reminder failed");
        }
      }

      return okResponse({
        expiredRequests: expiredRequests.count,
        expiredCompanies: expiredCompanies.count,
        expiredCards: expiredCards.count,
        remindersSent,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Corporate cron failed"));
    }
  });
};

export default cronCorporateRoute;
