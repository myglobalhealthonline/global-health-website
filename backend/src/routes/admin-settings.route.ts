import type { FastifyPluginAsync } from "fastify";
import { getReviewAutomationSettings, stopReviewCampaign, retryReviewDelivery } from "../modules/review-invites/review-campaign.service.js";
import { z } from "zod";
import { buildReviewInviteEmail } from "../lib/email/templates.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  getAdminCountryReviewDestinations,
  getPublicReviewConfig,
} from "../modules/settings/settings.service.js";
import { countryReviewSettingKey } from "../modules/review-invites/review-destinations.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { reviewSettingsSchema } from "../validations/admin-settings.schema.js";

/**
 * Admin read/write of the review-provider config. The admin UI POSTs the
 * whole object; we upsert the affected `Setting` keys and delete keys whose
 * value is explicitly `null`.
 */
const adminSettingsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/settings/reviews", async (request, reply) => {
    try {
      const config = await getPublicReviewConfig();
      const destinations = await getAdminCountryReviewDestinations();
      return okResponse({ ...config, destinations, automation: await getReviewAutomationSettings() });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not read review settings"));
    }
  });

  app.patch("/api/admin/settings/reviews", async (request, reply) => {
    const parsed = reviewSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid review settings", parsed.error.flatten()));
    }
    try {
      const body = parsed.data;
      const now = new Date().toISOString();
      if (body.destinations) {
        const countries = await prisma.country.findMany({ select: { code: true } });
        const knownCodes = new Set(countries.map((country) => country.code.toUpperCase()));
        const unknown = body.destinations.find(
          (destination) => !knownCodes.has(destination.countryCode),
        );
        if (unknown) {
          return reply
            .status(400)
            .send(errorResponse(`Unknown country code: ${unknown.countryCode}`));
        }
      }
      const currentConfig = await getPublicReviewConfig();
      const currentDestinations = await getAdminCountryReviewDestinations();
      const globalLink = (body.doctify?.reviewUrl === undefined ? currentConfig.doctify.reviewUrl : body.doctify.reviewUrl) || (body.trustpilot?.reviewUrl === undefined ? currentConfig.trustpilot.reviewUrl : body.trustpilot.reviewUrl);
      const effectiveDestinations = currentDestinations.map((row) => body.destinations?.find((item) => item.countryCode === row.countryCode) ?? row);
      const unready = effectiveDestinations.find((row) => row.sendReviewRequests && !row.googleReviewUrl && !globalLink);
      if ((body.automation || body.destinations || body.doctify?.reviewUrl !== undefined || body.trustpilot?.reviewUrl !== undefined) && unready) return reply.status(400).send(errorResponse(`Add a review link before enabling ${unready.countryCode}`));
      // Build the writes as lazy Prisma ops and run them in ONE transaction so
      // a partial failure can't leave the review config half-updated. All keys
      // are the hardcoded review.* constants below (the Setting allowlist).
      // deleteMany (not delete) is used so removing an absent key is a no-op
      // rather than aborting the transaction with P2025.
      const ops: Prisma.PrismaPromise<unknown>[] = [];

      function setKey(key: string, value: Prisma.InputJsonValue) {
        ops.push(
          prisma.setting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          }),
        );
      }
      function clearKey(key: string) {
        ops.push(prisma.setting.deleteMany({ where: { key } }));
      }

      function applyId(key: string, value: string | null | undefined) {
        if (value === undefined) return;
        if (value === null || value.trim() === "") clearKey(key);
        else setKey(key, value.trim());
      }
      function applyAggregate(key: string, value: { rating: number; count: number; updatedAt?: string } | null | undefined) {
        if (value === undefined) return;
        if (value === null) clearKey(key);
        else setKey(key, { rating: value.rating, count: value.count, updatedAt: value.updatedAt ?? now });
      }

      if (body.automation) {
        const previous = await getReviewAutomationSettings();
        setKey("review.automation", { ...body.automation, activatedAt: previous.activatedAt ?? (body.automation.enabled ? now : null) });
      }
      applyId("review.trustpilot.businessUnitId", body.trustpilot?.businessUnitId);
      applyId("review.trustpilot.reviewUrl", body.trustpilot?.reviewUrl);
      applyAggregate("review.trustpilot.aggregate", body.trustpilot?.aggregate);
      applyId("review.google.placeId", body.google?.placeId);
      applyAggregate("review.google.aggregate", body.google?.aggregate);
      applyId("review.doctify.clinicId", body.doctify?.clinicId);
      applyId("review.doctify.reviewUrl", body.doctify?.reviewUrl);
      applyAggregate("review.doctify.aggregate", body.doctify?.aggregate);
      if (body.primaryProvider !== undefined) {
        if (body.primaryProvider === null) clearKey("review.primaryProvider");
        else setKey("review.primaryProvider", body.primaryProvider);
      }
      for (const destination of body.destinations ?? []) {
        const key = countryReviewSettingKey(destination.countryCode);
        if (
          !destination.sendReviewRequests &&
          !destination.googleReviewUrl
        ) {
          clearKey(key);
        } else {
          setKey(key, {
            sendReviewRequests: destination.sendReviewRequests,
            googleReviewUrl: destination.googleReviewUrl,
          });
        }
      }

      await prisma.$transaction(ops);
      const config = await getPublicReviewConfig();
      const destinations = await getAdminCountryReviewDestinations();
      return okResponse({ ...config, destinations, automation: await getReviewAutomationSettings() }, "Review settings saved");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save review settings"));
    }
  });
  app.get("/api/admin/settings/reviews/preview", async () => {
    return okResponse(["en", "cs", "pt", "es", "ro", "pt-BR"].flatMap((locale) => [false, true].map((reminder) => ({ locale, reminder, ...buildReviewInviteEmail({ link: "https://myglobalhealth.online/reviews/rate?token=preview", localeCode: locale, reminder }) }))));
  });

  const activityQuery = z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    country: z.enum(["IE", "CZ", "PT", "ES", "RO", "BR"]).optional(),
    status: z.enum(["queued", "sent", "followups", "opened", "reported", "confirmed", "stopped", "failed", "unknown"]).optional(),
  });
  const statusWhere: Record<string, Prisma.ReviewInviteWhereInput> = {
    queued: { stoppedAt: null, nextSendAt: { not: null } },
    sent: { deliveries: { some: { status: "SENT", stage: 0 } } },
    followups: { deliveries: { some: { status: "SENT", stage: { gt: 0 } } } },
    opened: { selectedProvider: { not: null } },
    reported: { patientReviewedAt: { not: null } },
    confirmed: { stopReason: "provider_confirmed" },
    stopped: { stoppedAt: { not: null } },
    failed: { deliveries: { some: { status: "FAILED" } } },
    unknown: { deliveries: { some: { status: "UNKNOWN" } } },
  };
  app.get("/api/admin/settings/reviews/activity", async (request, reply) => {
    const parsed = activityQuery.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid activity filters"));
    const { page, country, status } = parsed.data;
    const base: Prisma.ReviewInviteWhereInput = { campaignVersion: 1, ...(country ? { countryCode: country } : {}) };
    const where = { ...base, ...(status ? statusWhere[status] : {}) };
    const [rows, total, counts] = await Promise.all([
      prisma.reviewInvite.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25,
        select: { id: true, orderNumber: true, appointmentId: true, countryCode: true, nextSendAt: true, stoppedAt: true, stopReason: true, maxFollowups: true,
          deliveries: { orderBy: { stage: "asc" }, select: { id: true, stage: true, status: true, sentAt: true, error: true } } } }),
      prisma.reviewInvite.count({ where }),
      Promise.all(Object.entries(statusWhere).map(async ([key, filter]) => [key, await prisma.reviewInvite.count({ where: { ...base, ...filter } })] as const)),
    ]);
    return okResponse({ rows, total, page, pageSize: 25, counts: Object.fromEntries(counts) });
  });
  app.post("/api/admin/settings/reviews/activity/:id/stop", async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1).max(100) }).safeParse(request.params);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid campaign"));
    const invite = await prisma.reviewInvite.findFirst({ where: { id: parsed.data.id, campaignVersion: 1 }, select: { id: true } });
    if (!invite) return reply.status(404).send(errorResponse("Campaign not found"));
    await stopReviewCampaign(invite.id, "staff_stopped");
    return okResponse({}, "Review emails stopped");
  });
  app.post("/api/admin/settings/reviews/activity/:id/retry", async (request, reply) => {
    const parsed = z.object({ id: z.string().min(1).max(100) }).safeParse(request.params);
    if (!parsed.success) return reply.status(400).send(errorResponse("Invalid delivery"));
    if (!await retryReviewDelivery(parsed.data.id)) return reply.status(409).send(errorResponse("Only known failed deliveries can be retried; unknown acceptance needs provider reconciliation"));
    return okResponse({}, "Failed delivery queued for retry");
  });

};

export default adminSettingsRoute;
