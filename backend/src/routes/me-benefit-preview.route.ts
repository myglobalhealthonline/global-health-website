import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { previewServiceBenefit } from "../modules/subscriptions/checkout-pricing.service.js";
import { prisma } from "../db/prisma.js";
import { resolveCorporateDiscount } from "../modules/corporate/corporate-benefit.service.js";

/**
 * GET /api/me/benefit-preview?serviceId=&basePriceCents= — read-only benefit
 * preview for a single service at the BOOKING step (B6), before the line is in
 * the cart. Lets the booking form offer "use plan credit / discount / pay
 * normally" with the resolved price, pre-selected to the best option. Reserves
 * nothing; checkout recomputes authoritatively. Auth required (D15) — guests
 * get 401 so the form simply omits the selector.
 */
const querySchema = z.object({
  serviceId: z.string().trim().min(1).max(80),
  basePriceCents: z.coerce.number().int().min(0).max(10_000_000),
});

const meBenefitPreviewRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/benefit-preview", async (request, reply) => {
    const user = await resolveOptionalAuthUser(request);
    if (!user || user.role !== "PATIENT") {
      return reply.status(401).send(errorResponse("Authentication required"));
    }
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(errorResponse("Invalid query", parsed.error.flatten()));
    }
    try {
      const preview = await previewServiceBenefit({
        userId: user.id,
        serviceId: parsed.data.serviceId,
        basePriceCents: parsed.data.basePriceCents,
      });
      // Corporate benefit engine: attach the automatic member discount so
      // the booking step can show "Corporate Standard −10%". Applies only
      // when the plan preview isn't already benefit-pricing the line.
      const service = await prisma.service.findUnique({
        where: { id: parsed.data.serviceId },
        select: { kind: true },
      });
      const corporate = service
        ? await resolveCorporateDiscount({
            userId: user.id,
            serviceId: parsed.data.serviceId,
            serviceKind: service.kind,
            baseCents: parsed.data.basePriceCents,
          })
        : null;
      return okResponse({
        ...preview,
        corporateDiscount: corporate
          ? {
              percent: corporate.discountPercent,
              amountCents: corporate.discountCents,
              companyName: corporate.companyName,
              planName: corporate.planName,
            }
          : null,
      });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load benefit preview"));
    }
  });
};

export default meBenefitPreviewRoute;
