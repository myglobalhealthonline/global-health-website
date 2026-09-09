import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { getPatientReviewDestinations } from "../modules/settings/settings.service.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { getReviewFormLocale } from "../lib/i18n/review-form.js";
import { getReviewCampaignCopy } from "../lib/i18n/review-campaign-copy.js";
import { stopReviewCampaign } from "../modules/review-invites/review-campaign.service.js";

const accountTrustpilotReminderRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/account/trustpilot-reminder", { preHandler: requireAuth }, async (request, reply) => {
    if (!request.authUser) return reply.status(401).send(errorResponse("Not authenticated"));
    reply.header("Cache-Control", "no-store");
    const id = z.object({ campaign: z.string().min(1).max(100).optional() }).safeParse(request.query);
    if (!id.success) return reply.status(400).send(errorResponse("Invalid request"));
    const invite = await prisma.reviewInvite.findFirst({
      where: { ...(id.data.campaign ? { id: id.data.campaign } : { stoppedAt: null }), campaignVersion: 1, expiresAt: { gt: new Date() }, appointment: { userId: request.authUser.sub, status: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
    });
    if (!invite) return okResponse({ showCta: false, campaignId: null });
    const destinations = await getPatientReviewDestinations(invite.countryCode);
    return okResponse({ showCta: !invite.stoppedAt && destinations.length > 0, campaignId: invite.id, submitted: Boolean(invite.submittedAt), stopped: Boolean(invite.stoppedAt), localeCode: invite.localeCode, locale: getReviewFormLocale(invite.localeCode), copy: getReviewCampaignCopy(invite.localeCode), destinations });
  });
  app.post("/api/account/trustpilot-reminder", { preHandler: requireAuth, config: { rateLimit: { max: 30, timeWindow: "1 hour", skipOnError: false } } }, async (request, reply) => {
    if (!request.authUser) return reply.status(401).send(errorResponse("Not authenticated"));
    const body = z.object({ campaign: z.string().min(1).max(100), action: z.enum(["provider_opened", "patient_reviewed", "opted_out"]), provider: z.enum(["GOOGLE", "DOCTIFY", "TRUSTPILOT"]).optional() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send(errorResponse("Invalid action"));
    const invite = await prisma.reviewInvite.findFirst({ where: { id: body.data.campaign, campaignVersion: 1, appointment: { userId: request.authUser.sub }, expiresAt: { gt: new Date() } } });
    if (!invite) return reply.status(404).send(errorResponse("Review not found"));
    let url: string | undefined;
    if (body.data.action === "provider_opened") {
      url = (await getPatientReviewDestinations(invite.countryCode)).find((d) => d.provider === body.data.provider)?.url;
      if (!url) return reply.status(400).send(errorResponse("Review destination unavailable"));
    }
    await stopReviewCampaign(invite.id, body.data.action, body.data.provider);
    return okResponse({ stopped: true, ...(url ? { url } : {}) });
  });
};
export default accountTrustpilotReminderRoute;
