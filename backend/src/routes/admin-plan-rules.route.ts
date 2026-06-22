import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { PlanNotFoundError } from "../modules/plans/plans.service.js";
import {
  deleteConsultationRule,
  deleteHealthTestRule,
  deletePerkRule,
  listConsultationRules,
  listHealthTestRules,
  listPerkRules,
  setConsultationRule,
  setHealthTestRule,
  setPerkRule,
  RuleCrossCountryError,
  RuleHealthTestNotFoundError,
  RulePrescriptionExcludedError,
  RuleServiceInactiveError,
  RuleServiceNotFoundError,
} from "../modules/plans/plan-rules.service.js";
import {
  adminConsultationRuleBodySchema,
  adminHealthTestRuleBodySchema,
  adminPerkRuleBodySchema,
  planHealthTestRuleParamsSchema,
  planIdParamsSchema,
  planPerkParamsSchema,
  planServiceRuleParamsSchema,
} from "../validations/admin-plans.schema.js";
import { requireManageSubscriptions } from "../utils/manage-subscriptions-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleRuleError(app: { log: { error: (e: unknown) => void } }, reply: FastifyReply, error: unknown) {
  if (
    error instanceof RuleServiceNotFoundError ||
    error instanceof RuleHealthTestNotFoundError ||
    error instanceof RulePrescriptionExcludedError ||
    error instanceof RuleCrossCountryError ||
    error instanceof RuleServiceInactiveError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof PlanNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected plan-rules error"));
}

const adminPlanRulesRoute: FastifyPluginAsync = async (app) => {
  // ─── Consultation rules (§36.10/§36.11) ────────────────────────────────────

  app.get("/api/admin/plans/:id/consultation-rules", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      return okResponse({ rules: await listConsultationRules(params.data.id) });
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.post("/api/admin/plans/:id/consultation-rules", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminConsultationRuleBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid consultation rule", body.error.flatten()));
    }
    try {
      const rule = await setConsultationRule(params.data.id, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_CONSULTATION_RULE_SET",
        entityType: "PlanConsultationRule",
        entityId: rule.id,
        metadata: { planId: params.data.id, serviceId: rule.serviceId, discountMode: rule.discountMode },
        request,
      }).catch(() => {});
      return okResponse({ rule }, "Consultation rule saved");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.delete("/api/admin/plans/:id/consultation-rules/:serviceId", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planServiceRuleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid rule params"));
    try {
      const removed = await deleteConsultationRule(params.data.id, params.data.serviceId);
      if (!removed) return reply.status(404).send(errorResponse("Consultation rule not found"));
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_CONSULTATION_RULE_SET",
        entityType: "PlanConsultationRule",
        entityId: `${params.data.id}:${params.data.serviceId}`,
        metadata: { planId: params.data.id, serviceId: params.data.serviceId, deleted: true },
        request,
      }).catch(() => {});
      return okResponse({}, "Consultation rule removed");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  // ─── Perk rules (§36.13) ───────────────────────────────────────────────────

  app.get("/api/admin/plans/:id/perks", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      return okResponse({ perks: await listPerkRules(params.data.id) });
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.post("/api/admin/plans/:id/perks", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminPerkRuleBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid perk rule", body.error.flatten()));
    }
    try {
      const perk = await setPerkRule(params.data.id, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PERK_RULE_SET",
        entityType: "PlanPerkRule",
        entityId: perk.id,
        metadata: { planId: params.data.id, perkKey: perk.perkKey, unlockMode: perk.unlockMode },
        request,
      }).catch(() => {});
      return okResponse({ perk }, "Perk rule saved");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.delete("/api/admin/plans/:id/perks/:perkKey", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planPerkParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid perk params"));
    try {
      const removed = await deletePerkRule(params.data.id, params.data.perkKey);
      if (!removed) return reply.status(404).send(errorResponse("Perk rule not found"));
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PERK_RULE_SET",
        entityType: "PlanPerkRule",
        entityId: `${params.data.id}:${params.data.perkKey}`,
        metadata: { planId: params.data.id, perkKey: params.data.perkKey, deleted: true },
        request,
      }).catch(() => {});
      return okResponse({}, "Perk rule removed");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  // ─── Health-test redemption rules (§11/§20) ────────────────────────────────

  app.get("/api/admin/plans/:id/health-test-rules", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      return okResponse({ rules: await listHealthTestRules(params.data.id) });
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.post("/api/admin/plans/:id/health-test-rules", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminHealthTestRuleBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid health-test rule", body.error.flatten()));
    }
    try {
      const rule = await setHealthTestRule(params.data.id, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_UPDATED",
        entityType: "HealthTestKitRedemptionRule",
        entityId: rule.id,
        metadata: {
          planId: params.data.id,
          healthTestId: rule.healthTestId,
          requiredWellnessCredits: rule.requiredWellnessCredits,
        },
        request,
      }).catch(() => {});
      return okResponse({ rule }, "Health-test rule saved");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });

  app.delete("/api/admin/plans/:id/health-test-rules/:healthTestId", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planHealthTestRuleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid rule params"));
    try {
      const removed = await deleteHealthTestRule(params.data.id, params.data.healthTestId);
      if (!removed) return reply.status(404).send(errorResponse("Health-test rule not found"));
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_UPDATED",
        entityType: "HealthTestKitRedemptionRule",
        entityId: `${params.data.id}:${params.data.healthTestId}`,
        metadata: { planId: params.data.id, healthTestId: params.data.healthTestId, deleted: true },
        request,
      }).catch(() => {});
      return okResponse({}, "Health-test rule removed");
    } catch (error) {
      return handleRuleError(app, reply, error);
    }
  });
};

export default adminPlanRulesRoute;
