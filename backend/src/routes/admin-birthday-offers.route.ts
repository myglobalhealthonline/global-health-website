import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyGlobalAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { absoluteSiteUrl } from "../lib/email/send-email.js";
import { birthdaySettingsSchema } from "../modules/coupons/birthday-rules.js";
import { getBirthdayDashboard, saveBirthdaySettings } from "../modules/coupons/birthday-offers.service.js";
import { renderBirthdayEmail } from "../modules/coupons/birthday-email.js";

const previewSchema = z.object({
  discountPercent: z.number().int().min(1).max(100),
  validityDays: z.number().int().min(1).max(365),
  locale: z.enum(["EN", "PT", "ES", "CS", "RO", "DE"]),
}).strict();

const adminBirthdayOffersRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/coupons/birthday", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.code(auth.status).send(errorResponse(auth.message));
    reply.header("Cache-Control", "no-store");
    try {
      return okResponse(await getBirthdayDashboard());
    } catch {
      return reply.code(503).send(errorResponse("Could not load birthday offers"));
    }
  });

  app.put("/api/admin/coupons/birthday", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.code(auth.status).send(errorResponse(auth.message));
    const body = birthdaySettingsSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send(errorResponse("Invalid birthday settings", body.error.flatten()));
    const actor = await resolveAdminSessionActor(request);
    try {
      return okResponse(await saveBirthdaySettings(body.data, { userId: actor?.userId ?? null, role: actor?.role ?? null }));
    } catch {
      return reply.code(503).send(errorResponse("Could not save birthday settings"));
    }
  });

  app.post("/api/admin/coupons/birthday/preview", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.code(auth.status).send(errorResponse(auth.message));
    const body = previewSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send(errorResponse("Invalid preview", body.error.flatten()));
    reply.header("Cache-Control", "no-store");
    return okResponse(renderBirthdayEmail({
      ...body.data, fullName: "Alex", code: "PREVIEW-ONLY", timezone: "UTC",
      validUntil: new Date(Date.now() + body.data.validityDays * 86_400_000),
      bookingUrl: absoluteSiteUrl("/"), unsubscribeUrl: absoluteSiteUrl("/unsubscribe"),
    }));
  });
};

export default adminBirthdayOffersRoute;
