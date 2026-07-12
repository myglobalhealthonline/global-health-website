import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { LocaleCode } from "@prisma/client";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  SubscriptionServiceError,
  cancelScheduledChange,
  cancelSubscription,
  changePlan,
  devActivateSubscription,
  getBillingPortalUrl,
  startSubscription,
} from "../modules/subscriptions/subscription.service.js";
import { getSubscriptionView } from "../modules/subscriptions/subscription-read.service.js";
import { RefundError, refundSubscription } from "../modules/subscriptions/refund.service.js";

/**
 * Patient subscription lifecycle API (Phase 1, contracts.md). All routes
 * require an authenticated PATIENT (D15 — no guest subscriptions).
 */

const returnToSchema = z
  .string()
  .trim()
  // In-site relative path only (leading slash, no protocol/host). Underscore is
  // allowed to match the frontend `safeReturnTo` regex so valid returnTo values
  // aren't silently dropped server-side.
  .regex(/^\/[a-z0-9/_-]*$/i)
  .max(200)
  .optional();

const subscribeBodySchema = z.object({
  planId: z.string().trim().min(1).max(120),
  returnTo: returnToSchema,
});
const changeBodySchema = z.object({
  planId: z.string().trim().min(1).max(120),
});
const portalQuerySchema = z.object({ returnTo: returnToSchema });
const localeQuerySchema = z.object({
  // .catch(undefined): an unknown locale falls back to the country default
  // instead of failing the whole query parse.
  locale: z
    .preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), z.nativeEnum(LocaleCode).optional())
    .catch(undefined),
});

async function requirePatient(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ id: string; email: string; fullName: string } | null> {
  const user = await resolveOptionalAuthUser(request);
  if (!user || user.role !== "PATIENT") {
    reply.status(401).send(errorResponse("Authentication required"));
    return null;
  }
  return { id: user.id, email: user.email, fullName: user.fullName };
}

function statusForError(code: SubscriptionServiceError["code"]): number {
  switch (code) {
    case "ALREADY_SUBSCRIBED":
      return 409;
    case "NO_ACTIVE_SUBSCRIPTION":
    case "PLAN_NOT_FOUND":
      return 404;
    case "COUNTRY_MISMATCH":
      return 400;
    case "NOT_ELIGIBLE":
    default:
      return 403;
  }
}

const meSubscriptionRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/subscription", async (request, reply) => {
    const user = await requirePatient(request, reply);
    if (!user) return;
    const query = localeQuerySchema.safeParse(request.query);
    try {
      return okResponse(await getSubscriptionView(user.id, query.success ? query.data.locale : undefined));
    } catch (err) {
      return handleError(reply, err, app);
    }
  });

  app.post(
    "/api/me/subscription",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = await requirePatient(request, reply);
      if (!user) return;
      const body = subscribeBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
      }
      try {
        const result = await startSubscription({
          userId: user.id,
          email: user.email,
          fullName: user.fullName,
          planId: body.data.planId,
          returnTo: body.data.returnTo,
        });
        return okResponse(result);
      } catch (err) {
        return handleError(reply, err, app);
      }
    },
  );

  app.post(
    "/api/me/subscription/change",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
    const user = await requirePatient(request, reply);
    if (!user) return;
    const body = changeBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
    }
    try {
      const result = await changePlan(user.id, body.data.planId);
      return okResponse({ pendingChangeEffectiveAt: result.pendingChangeEffectiveAt?.toISOString() ?? null });
    } catch (err) {
      return handleError(reply, err, app);
    }
  });

  app.post(
    "/api/me/subscription/cancel-change",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = await requirePatient(request, reply);
      if (!user) return;
      try {
        return okResponse(await cancelScheduledChange(user.id));
      } catch (err) {
        return handleError(reply, err, app);
      }
    },
  );

  app.post(
    "/api/me/subscription/cancel",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
    const user = await requirePatient(request, reply);
    if (!user) return;
    try {
      const result = await cancelSubscription(user.id);
      return okResponse({
        status: result.status,
        currentPeriodEnd: result.currentPeriodEnd?.toISOString() ?? null,
      });
    } catch (err) {
      return handleError(reply, err, app);
    }
  });

  app.post(
    "/api/me/subscription/refund",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = await requirePatient(request, reply);
      if (!user) return;
      try {
        const result = await refundSubscription({ userId: user.id, actorUserId: user.id });
        return okResponse(result, "Refund issued");
      } catch (err) {
        return handleError(reply, err, app);
      }
    },
  );

  app.get(
    "/api/me/subscription/portal",
    { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
    async (request, reply) => {
    const user = await requirePatient(request, reply);
    if (!user) return;
    const query = portalQuerySchema.safeParse(request.query);
    try {
      const result = await getBillingPortalUrl(user.id, query.success ? query.data.returnTo : undefined);
      return okResponse(result);
    } catch (err) {
      return handleError(reply, err, app);
    }
  });

  // DEV/LOCAL ONLY — simulate a paid first invoice so the fake-driver subscribe
  // flow actually activates (no Stripe webhook fires locally). Hard-gated to the
  // fake billing driver in the service: returns 403 NOT_ELIGIBLE under Stripe.
  app.post(
    "/api/me/subscription/dev-activate",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const user = await requirePatient(request, reply);
      if (!user) return;
      try {
        const result = await devActivateSubscription(user.id);
        return okResponse(result, "Subscription activated");
      } catch (err) {
        return handleError(reply, err, app);
      }
    },
  );
};

function handleError(
  reply: FastifyReply,
  err: unknown,
  app: { log: { error: (e: unknown) => void } },
) {
  if (err instanceof SubscriptionServiceError) {
    return reply
      .status(statusForError(err.code))
      .send(errorResponse(err.message, { code: err.code }));
  }
  if (err instanceof RefundError) {
    const status =
      err.code === "NO_SUBSCRIPTION" || err.code === "NO_PAID_PERIOD"
        ? 404
        : err.code === "PROVIDER_FAILED"
          ? 502
          : 403; // OUTSIDE_WINDOW / CREDIT_USED — policy denial
    return reply.status(status).send(errorResponse(err.message, { code: err.code }));
  }
  if (err instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(err.message));
  }
  app.log.error(err);
  return reply.status(500).send(errorResponse("Subscription request failed"));
}

export default meSubscriptionRoute;
