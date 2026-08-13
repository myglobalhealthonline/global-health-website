import type { FastifyPluginAsync } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  buildMemberUsageReport,
  buildMembershipUsageReport,
  usageReportToCsv,
} from "../modules/memberships/membership-reports.service.js";
import {
  membershipEnrollmentUsageParamsSchema,
  membershipUsageParamsSchema,
  membershipUsageQuerySchema,
} from "../validations/admin-membership-reports.schema.js";
import { requireManageMemberships } from "../utils/manage-memberships-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Membership usage reporting (§15/§32).
 *
 * **MANAGE_MEMBERSHIPS, not the config tier**: these are named members and
 * their bookings — member PII — so they belong with the member list rather than
 * with price configuration. LOCAL_ADMIN is denied by that gate, as everywhere
 * else in this module.
 *
 * Booking metadata only: date, service, doctor, price, benefit, order number.
 * No clinical content passes through here.
 *
 * The per-member drill-down writes its audit row on this FETCH, deliberately,
 * and not on the page render: the member detail page is a server component that
 * redirects to itself after every enrollment edit, so a render-time audit would
 * write a row per save and drown the signal the row exists to carry.
 */
const adminMembershipReportsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/membership-reports/:planId/usage", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = membershipUsageParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid plan id"));
    const query = membershipUsageQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid usage query", query.error.flatten()));
    }

    try {
      const report = await buildMembershipUsageReport({
        planId: params.data.planId,
        from: query.data.from,
        to: query.data.to,
      });
      if (!report) return reply.status(404).send(errorResponse("Membership plan not found"));

      if (query.data.format === "csv") {
        return reply
          .header("content-type", "text/csv; charset=utf-8")
          .header(
            "content-disposition",
            `attachment; filename="membership-usage-${report.plan.slug}.csv"`,
          )
          .send(usageReportToCsv(report));
      }
      return okResponse(report);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not build the usage report"));
    }
  });

  app.get(
    "/api/admin/membership-reports/enrollment/:enrollmentId/usage",
    async (request, reply) => {
      const auth = await requireManageMemberships(request, reply);
      if (!auth) return;
      const params = membershipEnrollmentUsageParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid enrollment id"));

      try {
        const report = await buildMemberUsageReport(params.data.enrollmentId);
        if (!report) return reply.status(404).send(errorResponse("Enrollment not found"));

        // §32: reading one named member's bookings is an access event, whether
        // or not anything changed. Fire-and-forget, like every other audit call
        // here — a failed audit write must not deny the admin their report.
        recordAudit({
          actorUserId: auth.actorUserId,
          actorRole: auth.actorRole,
          action: "MEMBERSHIP_REPORT_VIEWED",
          entityType: "MembershipEnrollment",
          entityId: report.enrollment.id,
          metadata: {
            planId: report.enrollment.planId,
            membershipId: report.enrollment.membershipId,
            consultations: report.totals.consultations,
            overrides: report.totals.overrides,
          },
          request,
        }).catch(() => {});

        return okResponse(report);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not build the member usage report"));
      }
    },
  );
};

export default adminMembershipReportsRoute;
