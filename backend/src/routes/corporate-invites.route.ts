import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { authCookieOptions, signAuthToken } from "../utils/auth-session.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  acceptInvite,
  lookupInvite,
} from "../modules/corporate/corporate-invite.service.js";
import { activateBeneficiary } from "../modules/corporate/corporate-status.service.js";
import { serializeCard } from "../modules/corporate/corporate-serializers.js";

/**
 * Public corporate-invite endpoints. Tokens are single-use, 7-day,
 * sha256-hashed at rest and carry no PII. Lookup responses expose only
 * a masked email + first name + company so a leaked link can't be used
 * to harvest contact data. Tighter rate limits than the global default
 * — same posture as password reset.
 */
const corporateInvitesRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/corporate/invites/:token",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const result = await lookupInvite(token);
      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 410;
        return reply.status(status).send(errorResponse(
          result.reason === "used"
            ? "This invitation has already been used"
            : result.reason === "expired"
              ? "This invitation has expired — ask your company admin to resend it"
              : "Invitation not found",
        ));
      }
      return okResponse(result);
    },
  );

  app.post(
    "/api/corporate/invites/:token/accept",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const schema = z.object({
        password: z.string().min(1).max(200),
        profile: z
          .object({
            phone: z.string().trim().max(40).optional(),
            dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            addressLine1: z.string().trim().max(240).optional(),
            addressLine2: z.string().trim().max(240).optional(),
            city: z.string().trim().max(120).optional(),
            postalCode: z.string().trim().max(24).optional(),
          })
          .default({}),
        consents: z.object({
          terms: z.boolean(),
          privacy: z.boolean(),
          dataProcessing: z.boolean(),
        }),
      });
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send(errorResponse("Invalid payload", parsed.error.flatten()));
      }
      const result = await acceptInvite({ token, ...parsed.data });
      if (!result.ok) return reply.status(result.status).send(errorResponse(result.message));

      // Beneficiaries with a complete profile are ACTIVE straight away —
      // issue the card + notifications now.
      if (result.memberType === "BENEFICIARY" && result.newStatus === "ACTIVE") {
        const beneficiary = await prisma.corporateBeneficiary.findFirst({
          where: { userId: result.userId },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        });
        if (beneficiary) await activateBeneficiary(beneficiary.id);
      }

      // Auto-login (the invite click + password proved identity).
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { id: true, email: true, role: true, tokenVersion: true },
      });
      if (user) {
        const jwt = signAuthToken({
          sub: user.id,
          role: user.role as never,
          email: user.email,
          tokenVersion: user.tokenVersion,
        });
        void reply.setCookie(env.AUTH_COOKIE_NAME, jwt, authCookieOptions());
      }
      return okResponse({ memberType: result.memberType, status: result.newStatus });
    },
  );

  /** Public card verification — mirrors certificate-verify. Exposes the
   *  minimum needed to confirm a card shown at a clinic desk. */
  app.get(
    "/api/corporate/card-verify/:cardNumber",
    { config: { rateLimit: { max: 60, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const { cardNumber } = request.params as { cardNumber: string };
      const card = await prisma.corporateBenefitCard.findUnique({
        where: { cardNumber: cardNumber.toUpperCase() },
        include: {
          employee: { include: { company: { include: { plan: true } } } },
          beneficiary: { include: { company: { include: { plan: true } } } },
        },
      });
      if (!card) return reply.status(404).send(errorResponse("Card not found"));
      const member = card.employee ?? card.beneficiary;
      if (!member) return reply.status(404).send(errorResponse("Card not found"));
      const expired = card.validUntil.getTime() < Date.now();
      return okResponse({
        ...serializeCard(card),
        valid: card.status === "ACTIVE" && !expired,
        memberName: `${member.firstName} ${member.lastName}`,
        companyName: member.company.name,
        planName: member.company.plan.name,
      });
    },
  );
};

export default corporateInvitesRoute;
