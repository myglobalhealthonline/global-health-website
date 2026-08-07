import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { Prisma } from "@prisma/client";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";
import {
  createMembershipBenefit,
  createMembershipLevel,
  createMembershipPlan,
  deactivateMembershipPlan,
  deleteMembershipBenefit,
  deleteMembershipLevel,
  getLevelPlanId,
  getMembershipPlanById,
  listMembershipBenefits,
  listMembershipPlans,
  updateMembershipBenefit,
  updateMembershipLevel,
  updateMembershipPlan,
  MembershipBenefitNotFoundError,
  MembershipBenefitServiceError,
  MembershipCommissionCountryError,
  MembershipCountryNotFoundError,
  MembershipLastLevelError,
  MembershipLevelFamilyError,
  MembershipLevelInUseError,
  MembershipLevelNotFoundError,
  MembershipPlanNotFoundError,
} from "../modules/memberships/membership-plans.service.js";
import {
  getMembershipLevelTranslation,
  getMembershipPlanTranslation,
  upsertMembershipLevelTranslation,
  upsertMembershipPlanTranslation,
} from "../modules/memberships/membership-translations.service.js";
import {
  adminMembershipBenefitCreateBodySchema,
  adminMembershipBenefitUpdateBodySchema,
  adminMembershipLevelCreateBodySchema,
  adminMembershipLevelUpdateBodySchema,
  adminMembershipPlanCreateBodySchema,
  adminMembershipPlanUpdateBodySchema,
  adminMembershipPlansQuerySchema,
  membershipBenefitIdParamsSchema,
  membershipLevelIdParamsSchema,
  membershipLevelLocaleParamsSchema,
  membershipPlanIdParamsSchema,
  membershipPlanLocaleParamsSchema,
  membershipTranslationBodySchema,
} from "../validations/admin-membership-plans.schema.js";
import {
  requireManageMemberships,
  requireMembershipConfigRole,
} from "../utils/manage-memberships-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Private membership plans — admin configuration surface
 * (docs/plans/private-membership-plans-implementation.md §4.1).
 *
 * Reads need MANAGE_MEMBERSHIPS; every write additionally needs a real admin
 * session (SUPER_ADMIN or ADMIN, never the master token), because
 * plan/level/benefit rows decide what members are charged (§4.2). Enrollment,
 * import, reporting and verification endpoints arrive in later phases as their
 * own route files.
 */

function handleMembershipError(
  app: { log: { error: (e: unknown) => void } },
  reply: FastifyReply,
  error: unknown,
) {
  if (
    error instanceof MembershipCountryNotFoundError ||
    error instanceof MembershipBenefitServiceError ||
    error instanceof MembershipLevelFamilyError ||
    error instanceof LocaleNotSupportedError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof MembershipCommissionCountryError) {
    return reply.status(422).send(errorResponse(error.message));
  }
  if (
    error instanceof MembershipPlanNotFoundError ||
    error instanceof MembershipLevelNotFoundError ||
    error instanceof MembershipBenefitNotFoundError
  ) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof MembershipLevelInUseError || error instanceof MembershipLastLevelError) {
    return reply.status(409).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply
      .status(409)
      .send(errorResponse("Another row already uses this slug, service or benefit target"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected membership plans error"));
}

const adminMembershipPlansRoute: FastifyPluginAsync = async (app) => {
  // ─── Plans ─────────────────────────────────────────────────────────────────

  app.get("/api/admin/membership-plans", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const query = adminMembershipPlansQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid membership plans query", query.error.flatten()));
    }
    try {
      return okResponse({ plans: await listMembershipPlans(query.data) });
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.get("/api/admin/membership-plans/:planId", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = membershipPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      const plan = await getMembershipPlanById(params.data.planId);
      if (!plan) return reply.status(404).send(errorResponse("Membership plan not found"));
      return okResponse({ plan });
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-plans", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const body = adminMembershipPlanCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid membership plan payload", body.error.flatten()));
    }
    try {
      const plan = await createMembershipPlan(body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_PLAN_CREATED",
        entityType: "MembershipPlan",
        entityId: plan.id,
        metadata: { slug: plan.slug, countryId: plan.primaryCountryId },
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Membership plan created");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.patch("/api/admin/membership-plans/:planId", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminMembershipPlanUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid membership plan update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const plan = await updateMembershipPlan(params.data.planId, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_PLAN_UPDATED",
        entityType: "MembershipPlan",
        entityId: plan.id,
        metadata: { fields: Object.keys(body.data) },
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Membership plan updated");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-plans/:planId/deactivate", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    try {
      const plan = await deactivateMembershipPlan(params.data.planId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_PLAN_DEACTIVATED",
        entityType: "MembershipPlan",
        entityId: plan.id,
        request,
      }).catch(() => {});
      return okResponse({ plan }, "Membership plan deactivated");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  // ─── Plan translations ─────────────────────────────────────────────────────

  app.get("/api/admin/membership-plans/:planId/translations/:locale", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = membershipPlanLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan or locale"));
    try {
      const translation = await getMembershipPlanTranslation(params.data.planId, params.data.locale);
      return okResponse({ translation });
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.put("/api/admin/membership-plans/:planId/translations/:locale", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipPlanLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan or locale"));
    const body = membershipTranslationBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid translation", body.error.flatten()));
    }
    try {
      const translation = await upsertMembershipPlanTranslation(
        params.data.planId,
        params.data.locale,
        body.data,
      );
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_PLAN_UPDATED",
        entityType: "MembershipPlan",
        entityId: params.data.planId,
        metadata: { translation: params.data.locale },
        request,
      }).catch(() => {});
      return okResponse({ translation }, "Translation saved");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  // ─── Levels ────────────────────────────────────────────────────────────────

  app.post("/api/admin/membership-plans/:planId/levels", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const body = adminMembershipLevelCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid level payload", body.error.flatten()));
    }
    try {
      const level = await createMembershipLevel(params.data.planId, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_LEVEL_CREATED",
        entityType: "MembershipLevel",
        entityId: level.id,
        metadata: { planId: params.data.planId, slug: level.slug },
        request,
      }).catch(() => {});
      return okResponse({ level }, "Level created");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.patch("/api/admin/membership-levels/:levelId", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipLevelIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level id"));
    const body = adminMembershipLevelUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid level update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const level = await updateMembershipLevel(params.data.levelId, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_LEVEL_UPDATED",
        entityType: "MembershipLevel",
        entityId: level.id,
        metadata: { fields: Object.keys(body.data) },
        request,
      }).catch(() => {});
      return okResponse({ level }, "Level updated");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.delete("/api/admin/membership-levels/:levelId", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipLevelIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level id"));
    try {
      const planId = await getLevelPlanId(params.data.levelId);
      const deleted = await deleteMembershipLevel(params.data.levelId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_LEVEL_DELETED",
        entityType: "MembershipLevel",
        entityId: deleted.id,
        metadata: { planId },
        request,
      }).catch(() => {});
      return okResponse({ id: deleted.id }, "Level deleted");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.put("/api/admin/membership-levels/:levelId/translations/:locale", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipLevelLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level or locale"));
    const body = membershipTranslationBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid translation", body.error.flatten()));
    }
    try {
      const translation = await upsertMembershipLevelTranslation(
        params.data.levelId,
        params.data.locale,
        body.data,
      );
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_LEVEL_UPDATED",
        entityType: "MembershipLevel",
        entityId: params.data.levelId,
        metadata: { translation: params.data.locale },
        request,
      }).catch(() => {});
      return okResponse({ translation }, "Translation saved");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.get("/api/admin/membership-levels/:levelId/translations/:locale", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = membershipLevelLocaleParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level or locale"));
    try {
      const translation = await getMembershipLevelTranslation(
        params.data.levelId,
        params.data.locale,
      );
      return okResponse({ translation });
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  // ─── Benefits ──────────────────────────────────────────────────────────────

  app.get("/api/admin/membership-levels/:levelId/benefits", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = membershipLevelIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level id"));
    try {
      return okResponse({ benefits: await listMembershipBenefits(params.data.levelId) });
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-levels/:levelId/benefits", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipLevelIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid level id"));
    const body = adminMembershipBenefitCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid benefit payload", body.error.flatten()));
    }
    try {
      const benefit = await createMembershipBenefit(params.data.levelId, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_BENEFIT_CREATED",
        entityType: "MembershipBenefit",
        entityId: benefit.id,
        metadata: {
          levelId: params.data.levelId,
          benefitType: benefit.benefitType,
          serviceKind: benefit.serviceKind,
          serviceId: benefit.serviceId,
        },
        request,
      }).catch(() => {});
      return okResponse({ benefit }, "Benefit created");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.patch("/api/admin/membership-benefits/:benefitId", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipBenefitIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid benefit id"));
    const body = adminMembershipBenefitUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid benefit update", body.error.flatten()));
    }
    try {
      const benefit = await updateMembershipBenefit(params.data.benefitId, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_BENEFIT_UPDATED",
        entityType: "MembershipBenefit",
        entityId: benefit.id,
        metadata: { benefitType: benefit.benefitType },
        request,
      }).catch(() => {});
      return okResponse({ benefit }, "Benefit updated");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });

  app.delete("/api/admin/membership-benefits/:benefitId", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!requireMembershipConfigRole(auth, reply)) return;
    const params = membershipBenefitIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid benefit id"));
    try {
      const deleted = await deleteMembershipBenefit(params.data.benefitId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_BENEFIT_DELETED",
        entityType: "MembershipBenefit",
        entityId: deleted.id,
        request,
      }).catch(() => {});
      return okResponse({ id: deleted.id }, "Benefit deleted");
    } catch (error) {
      return handleMembershipError(app, reply, error);
    }
  });
};

export default adminMembershipPlansRoute;
