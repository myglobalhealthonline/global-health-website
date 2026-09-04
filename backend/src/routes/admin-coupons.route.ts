import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  adminValidateCouponSchema,
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  sendCouponEmailsSchema,
  updateCouponSchema,
} from "../validations/admin-coupons.schema.js";
import {
  CouponCapBelowRedeemedError,
  CouponCodeTakenError,
  CouponWindowInvalidError,
  addCouponRecipients,
  createCoupon,
  getCouponDetail,
  listCoupons,
  sendCouponEmails,
  updateCoupon,
} from "../modules/coupons/coupon-admin.service.js";
import { resolveCoupon } from "../modules/coupons/coupon-eligibility.js";
import { couponRejectMessage } from "../modules/coupons/coupon-messages.js";
import { COUPON_SCOPE_LABELS } from "../modules/coupons/coupon-scope.js";
import { consultationCartKind } from "../modules/orders/consultation-kind.js";

/**
 * Coupon administration.
 *
 *   GET   /api/admin/coupons                 — list + search + status filter
 *   POST  /api/admin/coupons                 — mint one (optionally emailing it)
 *   GET   /api/admin/coupons/:id             — detail + recipients + redemptions
 *   PATCH /api/admin/coupons/:id             — disable / extend / raise the cap
 *   POST  /api/admin/coupons/:id/send        — email it to more people
 *   POST  /api/admin/coupons/validate        — staff-facing code check
 *
 * Auth: `verifyGlobalAdminAccess`, NOT `verifyAdminAccess`. Coupons carry no
 * country scope (a code works in every non-commission market), so a country
 * director must not be able to mint one that spends money outside their market.
 *
 * The recipient autocomplete deliberately has no endpoint here — it reuses
 * `GET /api/admin/patients/by-email`.
 */
const adminCouponsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/coupons", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const query = listCouponsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }
    try {
      return okResponse(await listCoupons(query.data));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      request.log.error(err);
      return reply.status(500).send(errorResponse("Could not list coupons"));
    }
  });

  app.get("/api/admin/coupons/:id", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const params = couponIdParamSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
    try {
      const coupon = await getCouponDetail(params.data.id);
      if (!coupon) return reply.status(404).send(errorResponse("Coupon not found"));
      return okResponse(coupon);
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      request.log.error(err);
      return reply.status(500).send(errorResponse("Could not load coupon"));
    }
  });

  app.post(
    "/api/admin/coupons",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const actor = await resolveAdminSessionActor(request);

      const body = createCouponSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid coupon", body.error.flatten()));
      }

      try {
        const created = await createCoupon(body.data, actor?.userId ?? null);
        await recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? null,
          action: "COUPON_CREATED",
          entityType: "Coupon",
          entityId: created.id,
          metadata: {
            code: created.code,
            kind: body.data.kind,
            discountPercent: body.data.discountPercent,
            scope: body.data.scope,
            maxRedemptions: body.data.maxRedemptions,
            recipientCount:
              body.data.kind === "PERSONAL" ? 1 : (body.data.recipients?.length ?? 0),
          },
          request,
        });

        // Emailing is awaited for a handful of recipients so the admin sees the
        // real outcome, and detached beyond that — a 200-address batch paced at
        // the SMTP pool's rate would hold the HTTP request open for ~40s. The
        // detail page shows live per-row status either way.
        let emailResult: { sent: number; failed: number } | null = null;
        if (body.data.sendNow) {
          const recipientCount =
            body.data.kind === "PERSONAL" ? 1 : (body.data.recipients?.length ?? 0);
          if (recipientCount <= 10) {
            emailResult = await sendCouponEmails(created.id);
          } else {
            void sendCouponEmails(created.id).catch((err) =>
              request.log.error({ err, couponId: created.id }, "Coupon email batch failed"),
            );
          }
          await recordAudit({
            actorUserId: actor?.userId ?? null,
            actorRole: actor?.role ?? null,
            action: "COUPON_EMAILS_SENT",
            entityType: "Coupon",
            entityId: created.id,
            metadata: { requested: recipientCount, ...(emailResult ?? { queued: true }) },
            request,
          });
        }

        return reply
          .status(201)
          .send(okResponse({ ...created, email: emailResult }, "Coupon created"));
      } catch (err) {
        if (err instanceof CouponCodeTakenError) {
          return reply.status(409).send(errorResponse(err.message));
        }
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        request.log.error(err);
        return reply.status(500).send(errorResponse("Could not create coupon"));
      }
    },
  );

  app.patch(
    "/api/admin/coupons/:id",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const actor = await resolveAdminSessionActor(request);

      const params = couponIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const body = updateCouponSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid update", body.error.flatten()));
      }

      try {
        const updated = await updateCoupon(params.data.id, body.data);
        if (!updated) return reply.status(404).send(errorResponse("Coupon not found"));
        await recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? null,
          action: body.data.active === false ? "COUPON_DISABLED" : "COUPON_UPDATED",
          entityType: "Coupon",
          entityId: updated.id,
          metadata: { code: updated.code, ...body.data },
          request,
        });
        return okResponse(updated, "Coupon updated");
      } catch (err) {
        if (err instanceof CouponCapBelowRedeemedError || err instanceof CouponWindowInvalidError) {
          return reply.status(422).send(errorResponse(err.message));
        }
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        request.log.error(err);
        return reply.status(500).send(errorResponse("Could not update coupon"));
      }
    },
  );

  app.post(
    "/api/admin/coupons/:id/send",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const actor = await resolveAdminSessionActor(request);

      const params = couponIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const body = sendCouponEmailsSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid recipients", body.error.flatten()));
      }

      try {
        const coupon = await prisma.coupon.findUnique({
          where: { id: params.data.id },
          select: { id: true, code: true },
        });
        if (!coupon) return reply.status(404).send(errorResponse("Coupon not found"));

        if (body.data.recipients?.length) {
          await addCouponRecipients(coupon.id, body.data.recipients);
        }

        const total =
          (body.data.recipients?.length ?? 0) + (body.data.recipientIds?.length ?? 0);
        let result: { sent: number; failed: number } | null = null;
        if (total <= 10) {
          result = await sendCouponEmails(coupon.id, {
            onlyRecipientIds: body.data.recipientIds,
          });
        } else {
          void sendCouponEmails(coupon.id, { onlyRecipientIds: body.data.recipientIds }).catch(
            (err) => request.log.error({ err, couponId: coupon.id }, "Coupon email batch failed"),
          );
        }

        await recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: actor?.role ?? null,
          action: "COUPON_EMAILS_SENT",
          entityType: "Coupon",
          entityId: coupon.id,
          metadata: { code: coupon.code, requested: total, ...(result ?? { queued: true }) },
          request,
        });

        return okResponse({ queued: result == null, ...(result ?? {}) }, "Coupon emails sent");
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        request.log.error(err);
        return reply.status(500).send(errorResponse("Could not send coupon emails"));
      }
    },
  );

  /**
   * Staff-facing code check for the manual-booking form. Returns the REAL
   * reason — an admin on the phone needs "reserved for another address", not a
   * shrug. The public endpoint deliberately does the opposite; do not merge
   * the two.
   */
  app.post(
    "/api/admin/coupons/validate",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = adminValidateCouponSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid request", body.error.flatten()));
      }

      try {
        // Scope is judged against the chosen service when there is one, so a
        // GP-only code on a specialist booking is caught while the admin is
        // still on the form rather than on submit.
        const service = body.data.serviceId
          ? await prisma.service.findUnique({
              where: { id: body.data.serviceId },
              select: { kind: true },
            })
          : null;

        const result = await resolveCoupon({
          code: body.data.code,
          email: body.data.email ?? null,
          countryCode: body.data.countryCode ?? "",
          // The manual-booking form checks the code before the admin has
          // committed to insurance or a membership benefit, so those are left
          // open here. `createManualBooking` re-resolves with the real answers
          // and is the decision that counts.
          hasCoverageLine: false,
          hasBenefitLine: false,
          ...(service ? { lineKinds: [consultationCartKind(service.kind)] } : {}),
        });
        if (!result.ok) {
          return okResponse({
            valid: false,
            reason: result.reason,
            message: couponRejectMessage(result.reason),
          });
        }
        return okResponse({
          valid: true,
          code: result.coupon.code,
          kind: result.coupon.kind,
          scope: result.coupon.scope,
          scopeLabel: COUPON_SCOPE_LABELS[result.coupon.scope],
          discountPercent: result.coupon.discountPercent,
          validUntil: result.coupon.validUntil,
        });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        request.log.error(err);
        return reply.status(500).send(errorResponse("Could not check coupon"));
      }
    },
  );
};

export default adminCouponsRoutes;
