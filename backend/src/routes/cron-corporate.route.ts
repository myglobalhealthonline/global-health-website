import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { mintAndSendInvite } from "../modules/corporate/corporate-invite.service.js";
import { notifyCompanyExpired } from "../modules/corporate/corporate-status.service.js";

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

      // Read the rows BEFORE flipping them so the expiry notices can be sent
      // (notification spec: "membership expired"). Previously the contract
      // simply lapsed in silence.
      const companiesToExpire = await prisma.corporateCompany.findMany({
        where: { status: "ACTIVE", contractEndAt: { lt: now } },
        select: { id: true },
      });
      const expiredCompanies = await prisma.corporateCompany.updateMany({
        where: { id: { in: companiesToExpire.map((c) => c.id) } },
        data: { status: "EXPIRED" },
      });
      for (const company of companiesToExpire) {
        await notifyCompanyExpired(company.id).catch((error) =>
          app.log.error({ err: error, companyId: company.id }, "corporate expiry notice failed"),
        );
      }
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

      // Exactly ONE reminder per unused invite older than 3 days, and only
      // while the member is still waiting to register. mintAndSendInvite
      // deletes this row and mints a replacement that carries
      // reminderSentAt, so the replacement can never re-qualify here.
      const staleInvites = await prisma.corporateInvite.findMany({
        where: {
          usedAt: null,
          reminderSentAt: null,
          expiresAt: { gt: now },
          createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
          // Removed / suspended / already-registered members must never be
          // chased. Their invites are deleted on removal too, but a status
          // filter keeps this correct for rows written before that fix.
          OR: [
            { employee: { status: { in: ["DRAFT", "INVITED", "INVITE_SENT", "INVITE_FAILED"] } } },
            { beneficiary: { status: { in: ["INVITED", "INVITE_SENT", "INVITE_FAILED"] } } },
          ],
        },
        select: { id: true, type: true, employeeId: true, beneficiaryId: true },
        take: 100,
      });
      let remindersSent = 0;
      for (const invite of staleInvites) {
        const memberId = invite.employeeId ?? invite.beneficiaryId;
        if (!memberId) continue;
        try {
          await mintAndSendInvite({ type: invite.type, memberId, isReminder: true });
          remindersSent += 1;
        } catch (error) {
          app.log.error({ err: error, inviteId: invite.id }, "corporate invite reminder failed");
          // The old row survives a mint failure only if the delete never ran;
          // stamp it so a persistently failing address is not retried daily.
          await prisma.corporateInvite
            .updateMany({ where: { id: invite.id }, data: { reminderSentAt: now } })
            .catch(() => undefined);
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
