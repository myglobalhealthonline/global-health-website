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
  app.get("/api/public/reviews/rate", async (request, reply) => {
    const token = (request.query as { token?: string }).token?.trim();
    if (!token) return reply.status(400).send(errorResponse("token is required"));
    try {
      const invite = await getReviewInviteByToken(token);
      if (!invite) return reply.status(404).send(errorResponse("Review not found"));
      if (invite.submittedAt) {
        return okResponse({ submitted: true, locale: getReviewFormLocale(invite.localeCode) });
      }
      if (invite.expiresAt < new Date()) {
        return reply.status(410).send(errorResponse("Review link has expired"));
      }
      return okResponse({
        submitted: false,
        invite: {
          customerName: invite.customerName,
          doctorName: invite.doctorName,
          serviceName: invite.serviceName,
          localeCode: invite.localeCode,
        },
        locale: getReviewFormLocale(invite.localeCode),
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
    const token = (request.query as { token?: string }).token?.trim();
    if (!token) return reply.status(400).send(errorResponse("token is required"));
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
};

export default reviewInvitesRoute;
