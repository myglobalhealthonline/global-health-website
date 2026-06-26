import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createAdminPlan,
  deactivateAdminPlan,
  getAdminPlanById,
  listAdminPlans,
  reorderAdminPlans,
  updateAdminPlan,
  PlanCountryNotFoundError,
  PlanPriceSyncError,
  PlanFamilyNotPremiumError,
} from "../modules/plans/plans.service.js";
import {
  getPlanPreview,
  getPlanTranslation,
  upsertPlanTranslation,
} from "../modules/plans/plan-translations.service.js";
import { PlanNotFoundError } from "../modules/plans/plans.service.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";
import {
  adminPlanCreateBodySchema,
  adminPlanUpdateBodySchema,
  adminPlansQuerySchema,
  adminPlanTranslationBodySchema,
  planIdParamsSchema,
  planLocaleParamsSchema,
  planPreviewQuerySchema,
  planReorderBodySchema,
} from "../validations/admin-plans.schema.js";
import { requireManageSubscriptions } from "../utils/manage-subscriptions-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handlePlanWriteError(app: { log: { error: (e: unknown) => void } }, reply: FastifyReply, error: unknown) {
  if (
    error instanceof PlanCountryNotFoundError ||
    error instanceof LocaleNotSupportedError ||
    error instanceof PlanFamilyNotPremiumError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof PlanNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof PlanPriceSyncError) {
    return reply.status(502).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("A plan with this slug already exists in this country"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin plans error"));
}

const adminPlansRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/plans", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const query = adminPlansQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid plans query", query.error.flatten()));
    }
    try {
      return okResponse({ plans: await listAdminPlans(query.data) });
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.get("/api/admin/plans/:id", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      const plan = await getAdminPlanById(params.data.id);
      if (!plan) return reply.status(404).send(errorResponse("Plan not found"));
      return okResponse({ plan });
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.post("/api/admin/plans", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const body = adminPlanCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid plan payload", body.error.flatten()));
    }
    try {
      const plan = await createAdminPlan(body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_CREATED",
        entityType: "PricingPlan",
        entityId: plan.id,
        metadata: { slug: plan.slug, countryId: plan.countryId, stripePriceId: plan.stripePriceId },
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Plan created");
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/plans/:id", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminPlanUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid plan update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const plan = await updateAdminPlan(params.data.id, body.data);
      if (!plan) return reply.status(404).send(errorResponse("Plan not found"));
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_UPDATED",
        entityType: "PricingPlan",
        entityId: plan.id,
        metadata: { fields: Object.keys(body.data) },
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Plan updated");
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/plans/:id", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      const plan = await deactivateAdminPlan(params.data.id);
      if (!plan) return reply.status(404).send(errorResponse("Plan not found"));
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_DEACTIVATED",
        entityType: "PricingPlan",
        entityId: plan.id,
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Plan deactivated");
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.post("/api/admin/plans/:id/reorder", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const body = planReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      await reorderAdminPlans(body.data.items);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_REORDERED",
        entityType: "PricingPlan",
        entityId: body.data.items.map((i) => i.id).join(","),
        metadata: { count: body.data.items.length },
        request,
      }).catch(() => {});
      return okResponse({}, "Plans reordered");
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  // ─── Translations ──────────────────────────────────────────────────────────

  app.get("/api/admin/plans/:id/translations/:locale", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid translation params"));
    try {
      const translation = await getPlanTranslation(params.data.id, params.data.locale);
      return okResponse({ translation });
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  app.put("/api/admin/plans/:id/translations/:locale", async (request, reply) => {
    const auth = await requireManageSubscriptions(request, reply);
    if (!auth) return;
    const params = planLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid translation params"));
    const body = adminPlanTranslationBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid translation payload", body.error.flatten()));
    }
    try {
      const translation = await upsertPlanTranslation(params.data.id, params.data.locale, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "PLAN_UPDATED",
        entityType: "PlanTranslation",
        entityId: translation.id,
        metadata: { planId: params.data.id, locale: params.data.locale },
        request,
      }).catch(() => {});
      return okResponse({ translation }, "Translation saved");
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });

  // ─── Preview ───────────────────────────────────────────────────────────────

  app.get("/api/admin/plans/:id/preview", async (request, reply) => {
    if (!(await requireManageSubscriptions(request, reply))) return;
    const params = planIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const query = planPreviewQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send(errorResponse("Invalid preview query"));
    try {
      const preview = await getPlanPreview(params.data.id, query.data.locale);
      return okResponse({ preview });
    } catch (error) {
      return handlePlanWriteError(app, reply, error);
    }
  });
};

export default adminPlansRoute;
