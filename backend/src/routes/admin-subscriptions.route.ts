import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminAdjustSubscriptionCredits,
  getAdminSubscriptionLedger,
  listAdminSubscriptions,
  regrantCurrentPeriod,
  resyncSubscription,
  SubscriptionNotFoundError,
} from "../modules/plans/admin-subscriptions.service.js";
import {
  adminAdjustCreditsBodySchema,
  adminSubscriptionsQuerySchema,
  subscriptionIdParamsSchema,
} from "../validations/admin-plans.schema.js";
import { requireManageSubscriptions } from "../utils/manage-subscriptions-auth.js";
import { RefundError, refundSubscription } from "../modules/subscriptions/refund.service.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleError(app: { log: { error: (e: unknown) => void } }, reply: FastifyReply, error: unknown) {
  if (error instanceof SubscriptionNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof RefundError) {
    const status =
      error.code === "NO_SUBSCRIPTION" || error.code === "NO_PAID_PERIOD"
        ? 404
        : error.code === "PROVIDER_FAILED"
          ? 502
          : 403;
    return reply.status(status).send(errorResponse(error.message, { code: error.code }));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin subscriptions error"));
}

const adminSubscriptionsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/subscriptions", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const query = adminSubscriptionsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid subscriptions query", query.error.flatten()));
    }
    try {
      // Single admin tier: any admin who can load this page may use the manual
      // adjustment override (the GET already required admin access). The flag is
      // kept so the UI can gate the panel if tiers are introduced later.
      const result = await listAdminSubscriptions(query.data);
      return okResponse({ ...result, capabilities: { canAdjustCredits: true } });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.get("/api/admin/subscriptions/:id/ledger", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = subscriptionIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid subscription id"));
    try {
      return okResponse(await getAdminSubscriptionLedger(params.data.id));
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.post("/api/admin/subscriptions/:id/adjust-credits", async (request, reply) => {
    // Admin-gated (single tier). The "don't let admins freely edit balances"
    // control is friction, not a role: a mandatory reason (note), a hidden
    // override panel, a confirm step, and the audit row written below (§4).
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = subscriptionIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid subscription id"));
    const body = adminAdjustCreditsBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid adjustment payload", body.error.flatten()));
    }
    try {
      const result = await adminAdjustSubscriptionCredits({
        subscriptionId: params.data.id,
        kind: body.data.kind,
        delta: body.data.delta,
        reason: body.data.reason,
        requestId: body.data.requestId,
        actorAdminId: auth.actorUserId,
      });
      const action =
        body.data.reason === "CLAWBACK"
          ? body.data.kind === "WELLNESS"
            ? "WELLNESS_CREDIT_CLAWED_BACK"
            : "CONSULTATION_CREDIT_CLAWED_BACK"
          : body.data.kind === "WELLNESS"
            ? "WELLNESS_CREDIT_EARNED"
            : "CONSULTATION_CREDIT_GRANTED";
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action,
        entityType: "UserSubscription",
        entityId: params.data.id,
        metadata: {
          kind: body.data.kind,
          delta: body.data.delta,
          reason: body.data.reason,
          note: body.data.note,
          requestId: body.data.requestId,
          balanceAfter: result.balance,
        },
        request,
      }).catch(() => {});
      return okResponse({ balance: result.balance }, "Credits adjusted");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Resync (§6.4): re-fetch the live provider subscription and monotonically
  // reconcile status/period into our row (reuses the webhook guard). Drift
  // (provider returned null) and no-provider are surfaced, not silently ignored.
  app.post("/api/admin/subscriptions/:id/resync", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = subscriptionIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid subscription id"));
    try {
      const result = await resyncSubscription(params.data.id, auth.actorUserId);
      if (result.outcome === "NO_PROVIDER") {
        return reply
          .status(409)
          .send(errorResponse("Subscription has no linked provider subscription", { code: "NO_PROVIDER" }));
      }
      return okResponse(result, result.outcome === "DRIFT" ? "Provider subscription not found" : "Subscription resynced");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Regrant (§6.4): re-run the current period's credit grant. Idempotent via the
  // period grant key (no-op if already granted).
  app.post("/api/admin/subscriptions/:id/regrant-period", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = subscriptionIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid subscription id"));
    try {
      const result = await regrantCurrentPeriod(params.data.id, auth.actorUserId);
      if (result.outcome === "NOT_APPLICABLE") {
        return reply
          .status(409)
          .send(errorResponse("Subscription period grant is not applicable", { code: result.reason }));
      }
      return okResponse(result, "Period grant re-run");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Issue a refund (D17 guard runs first; reconciliation claws back unused
  // credits + cancels). reconcileRefund records the SUBSCRIPTION_REFUNDED audit
  // with the admin as actor.
  app.post("/api/admin/subscriptions/:id/refund", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = subscriptionIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid subscription id"));
    try {
      const result = await refundSubscription({
        subscriptionId: params.data.id,
        actorUserId: auth.actorUserId,
      });
      return okResponse(result, "Refund issued");
    } catch (error) {
      return handleError(app, reply, error);
    }
  });
};

export default adminSubscriptionsRoute;
