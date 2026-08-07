import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  addMembershipDependent,
  createMembershipEnrollment,
  getMembershipEnrollmentById,
  listMembershipEnrollments,
  reactivateMembershipEnrollment,
  removeMembershipEnrollment,
  sendMembershipEnrollmentInvite,
  suspendMembershipEnrollment,
  updateMembershipEnrollment,
  MembershipDependentError,
  MembershipEnrollmentConflictError,
  MembershipEnrollmentNotFoundError,
  MembershipPlanLevelMismatchError,
} from "../modules/memberships/membership-enrollments.service.js";
import {
  adminMembershipDependentCreateBodySchema,
  adminMembershipEnrollmentCreateBodySchema,
  adminMembershipEnrollmentUpdateBodySchema,
  adminMembershipEnrollmentsQuerySchema,
  adminMembershipSuspendBodySchema,
  membershipEnrollmentIdParamsSchema,
} from "../validations/admin-membership-enrollments.schema.js";
import { requireManageMemberships } from "../utils/manage-memberships-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Membership enrollments — admin operational surface (§4.1, phase 2).
 *
 * MANAGE_MEMBERSHIPS throughout: this is member PII and day-to-day member
 * management, not price configuration, so it does not take the second
 * (config-tier) gate. LOCAL_ADMIN is denied by the first one — a plan's member
 * list spans a whole market.
 *
 * The allowance-adjust endpoint from §4.1 is deliberately absent: nothing
 * spends allowance before phase 5, so it ships with the ledger it adjusts.
 */

function handleEnrollmentError(
  app: { log: { error: (e: unknown) => void } },
  reply: FastifyReply,
  error: unknown,
) {
  if (error instanceof MembershipEnrollmentNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (
    error instanceof MembershipEnrollmentConflictError ||
    error instanceof MembershipDependentError ||
    error instanceof MembershipPlanLevelMismatchError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected membership enrollment error"));
}

const adminMembershipEnrollmentsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/membership-enrollments", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const query = adminMembershipEnrollmentsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid enrollments query", query.error.flatten()));
    }
    try {
      return okResponse(await listMembershipEnrollments(query.data));
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.get("/api/admin/membership-enrollments/:id", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    try {
      return okResponse({ enrollment: await getMembershipEnrollmentById(params.data.id) });
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const body = adminMembershipEnrollmentCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid enrollment payload", body.error.flatten()));
    }
    try {
      const enrollment = await createMembershipEnrollment(body.data, auth.actorUserId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_CREATED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: {
          planId: enrollment.planId,
          membershipId: enrollment.membershipId,
          status: enrollment.status,
        },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Member enrolled");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.patch("/api/admin/membership-enrollments/:id", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    const body = adminMembershipEnrollmentUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid enrollment update", body.error.flatten()));
    }
    try {
      const enrollment = await updateMembershipEnrollment(params.data.id, body.data);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_UPDATED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: { changed: Object.keys(body.data) },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Member updated");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments/:id/suspend", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    const body = adminMembershipSuspendBodySchema.safeParse(request.body ?? {});
    if (!body.success) return reply.status(400).send(errorResponse("Invalid suspend payload"));
    try {
      const enrollment = await suspendMembershipEnrollment(params.data.id, body.data.reason);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_SUSPENDED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: { reason: body.data.reason ?? null },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Membership suspended");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments/:id/reactivate", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    try {
      const enrollment = await reactivateMembershipEnrollment(params.data.id);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_REACTIVATED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: { status: enrollment.status },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Membership reactivated");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments/:id/remove", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    try {
      const enrollment = await removeMembershipEnrollment(params.data.id);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_REMOVED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: { membershipId: enrollment.membershipId },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Membership removed");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments/:id/dependents", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    const body = adminMembershipDependentCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid dependent payload", body.error.flatten()));
    }
    try {
      const enrollment = await addMembershipDependent(
        params.data.id,
        body.data,
        auth.actorUserId,
      );
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_CREATED",
        entityType: "MembershipEnrollment",
        entityId: enrollment.id,
        metadata: { primaryEnrollmentId: params.data.id, memberType: "DEPENDENT" },
        request,
      }).catch(() => {});
      return okResponse({ enrollment }, "Dependent added");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-enrollments/:id/invite", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipEnrollmentIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));
    try {
      const result = await sendMembershipEnrollmentInvite(params.data.id, auth.actorUserId);
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_ENROLLMENT_INVITED",
        entityType: "MembershipEnrollment",
        entityId: params.data.id,
        metadata: { ok: result.ok },
        request,
      }).catch(() => {});
      // A failed send is reported, not thrown: the attempt is already logged to
      // MembershipInviteLog, which is how an admin tells "never told them" from
      // "told them and they ignored it".
      return okResponse(result, result.ok ? "Invite sent" : "Invite could not be sent");
    } catch (error) {
      return handleEnrollmentError(app, reply, error);
    }
  });
};

export default adminMembershipEnrollmentsRoute;
