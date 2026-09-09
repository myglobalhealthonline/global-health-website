import { stopReviewCampaign } from "../modules/review-invites/review-campaign.service.js";
import { getReviewCampaignCopy } from "../lib/i18n/review-campaign-copy.js";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createReviewInviteForAppointment,
  getReviewInviteByToken,
  submitReviewInvite,
} from "../modules/review-invites/review-invite.service.js";
import { getReviewFormLocale } from "../lib/i18n/review-form.js";
import { isValidCronSecret } from "../utils/cron-auth.js";
import { getPatientReviewDestinations } from "../modules/settings/settings.service.js";

const ratingSchema = z.object({
  overallSatisfaction: z.number().int().min(1).max(5),
  doctorProfessionalism: z.number().int().min(1).max(5),
  communicationClarity: z.number().int().min(1).max(5),
  timelinessOfService: z.number().int().min(1).max(5),
  valueForMoney: z.number().int().min(1).max(5),
  likeliness: z.number().int().min(1).max(5),
  bookingExperience: z.number().int().min(1).max(5),
});

const reviewInvitesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (_request, reply) => { reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer"); });
  app.get("/api/public/reviews/rate", async (request, reply) => {
    const query = z.object({ token: z.string().trim().min(1).max(256) }).safeParse(request.query);
    if (!query.success) return reply.status(400).send(errorResponse("Invalid token"));
    const token = query.data.token;
    try {
      const invite = await getReviewInviteByToken(token);
      if (!invite) return reply.status(404).send(errorResponse("Review not found"));
      if (invite.expiresAt <= new Date()) {
        return reply.status(410).send(errorResponse("Review link has expired"));
      }
      const destinations = await getPatientReviewDestinations(invite.countryCode ?? invite.appointment?.countryCode);
      reply.header("Cache-Control", "no-store").header("Referrer-Policy", "no-referrer");
      return okResponse({
        submitted: Boolean(invite.submittedAt),
        stopped: Boolean(invite.stoppedAt),
        localeCode: invite.localeCode, locale: getReviewFormLocale(invite.localeCode),
        copy: getReviewCampaignCopy(invite.localeCode),
        destinations,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load review"));
    }
  });

  app.post("/api/public/reviews/rate", async (request, reply) => {
    const query = z.object({ token: z.string().trim().min(1).max(256) }).safeParse(request.query);
    if (!query.success) return reply.status(400).send(errorResponse("Invalid token"));
    const token = query.data.token;
    const body = ratingSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid ratings", body.error.flatten()));
    }
    try {
      const result = await submitReviewInvite(token, body.data);
      if (!result.ok) {
        const status = result.message?.includes("expired") ? 410 : 404;
        return reply.status(status).send(errorResponse(result.message ?? "Failed"));
      }
      return okResponse({ submitted: true }, "Thank you for your feedback");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not submit review"));
    }
  });

  app.post(
    "/api/internal/send-review-invite",
    // S-020: capability-token issuance — fail closed rather than falling
    // back to the loose global default on a Redis outage.
    { config: { rateLimit: { max: 60, timeWindow: "1 hour", skipOnError: false } } },
    async (request, reply) => {
    const secret =
      request.headers["x-review-secret"] ??
      request.headers["x-cron-secret"];
    const expected = env.REVIEW_FORM_WEBHOOK_SECRET ?? env.CRON_SECRET;
    // Constant-time compare: a `!==` on the shared secret leaks its prefix
    // byte-by-byte to an attacker who can time this endpoint.
    if (!isValidCronSecret(secret, expected)) {
      return reply.status(401).send(errorResponse("Unauthorized"));
    }
    const body = z.object({ appointmentId: z.string().min(1) }).safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("appointmentId required"));
    }
    try {
      const invite = await createReviewInviteForAppointment(body.data.appointmentId);
      if (!invite) {
        return reply.status(404).send(errorResponse("Appointment not found or not completed"));
      }
      // Never return the raw token — it grants review submission on the
      // patient's behalf. It is delivered to the patient via email/WhatsApp.
      return okResponse({ inviteId: invite.id, expiresAt: invite.expiresAt.toISOString() });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not send review invite"));
    }
    },
  );
  app.post("/api/public/reviews/action", {
    config: { rateLimit: { max: 30, timeWindow: "1 hour", skipOnError: false } },
  }, async (request, reply) => {
    const body = z.object({ token: z.string().trim().min(1).max(256), action: z.enum(["provider_opened", "patient_reviewed", "opted_out"]), provider: z.enum(["GOOGLE", "DOCTIFY", "TRUSTPILOT"]).optional() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send(errorResponse("Invalid action"));
    try {
      const invite = await getReviewInviteByToken(body.data.token);
      if (!invite || invite.expiresAt <= new Date()) return reply.status(410).send(errorResponse("Review link has expired"));
      let url: string | undefined;
      if (body.data.action === "provider_opened") {
        const destinations = await getPatientReviewDestinations(invite.countryCode ?? invite.appointment?.countryCode);
        url = destinations.find((destination) => destination.provider === body.data.provider)?.url;
        if (!url) return reply.status(400).send(errorResponse("Review destination unavailable"));
      }
      await stopReviewCampaign(invite.id, body.data.action, body.data.provider);
      return okResponse({ stopped: true, ...(url ? { url } : {}) });
    } catch {
      return reply.status(500).send(errorResponse("Could not update review preferences"));
    }
  });
};

export default reviewInvitesRoute;