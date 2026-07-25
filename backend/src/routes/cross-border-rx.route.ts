import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  verifyDoctorAccess,
  verifyCrossJurisdictionRxPermission,
} from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  listCrossBorderRxTargets,
  createCrossBorderRxRequest,
  listCrossBorderRxInbox,
  decideCrossBorderRxRequest,
  CrossBorderRxSourceNotFoundError,
  CrossBorderRxTargetNotAvailableError,
  CrossBorderRxServicePriceMissingError,
  CrossBorderRxStripeNotConfiguredError,
  CrossBorderRxRequestNotFoundError,
  CrossBorderRxNotActionableError,
  CrossBorderRxMessageRequiredError,
} from "../modules/cross-border-rx/cross-border-rx.service.js";

/**
 * Cross-jurisdiction prescription requests.
 *
 * Doctor A (requester — gated by Doctor.canRequestCrossJurisdictionRx):
 *   GET  /api/doctor/appointments/:id/cross-border-rx/options
 *   POST /api/doctor/appointments/:id/cross-border-rx
 *
 * Doctor B (prescribing doctor — any authenticated doctor; the service scopes
 * every row to targetDoctorId = self):
 *   GET  /api/doctor/cross-border-rx
 *   POST /api/doctor/cross-border-rx/:requestId/decision
 */

const createBodySchema = z.object({
  targetCountryCode: z.string().trim().min(2).max(8),
  targetDoctorId: z.string().trim().min(1).max(120),
  clinicalSummary: z.string().trim().min(1, "A clinical summary is required").max(5000),
});

const decisionBodySchema = z.object({
  decision: z.enum(["ACCEPT", "MORE_INFO", "REFUSE"]),
  message: z.string().trim().max(5000).optional(),
});

const crossBorderRxRoute: FastifyPluginAsync = async (app) => {
  // ── Doctor A: target countries + authorised doctors ──────────────
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/cross-border-rx/options",
    async (request, reply) => {
      const auth = await verifyCrossJurisdictionRxPermission(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const data = await listCrossBorderRxTargets(request.params.id, auth.doctorId);
        return okResponse(data);
      } catch (error) {
        if (error instanceof CrossBorderRxSourceNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load options"));
      }
    },
  );

  // ── Doctor A: create the request + async-fee payment link ────────
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/cross-border-rx",
    async (request, reply) => {
      const auth = await verifyCrossJurisdictionRxPermission(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = createBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid request", body.error.flatten()));
      }
      try {
        const result = await createCrossBorderRxRequest({
          sourceAppointmentId: request.params.id,
          sourceDoctorId: auth.doctorId,
          actorUserId: auth.userId,
          targetCountryCode: body.data.targetCountryCode,
          targetDoctorId: body.data.targetDoctorId,
          clinicalSummary: body.data.clinicalSummary,
          request,
        });

        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CROSS_BORDER_RX_REQUESTED",
          entityType: "CrossBorderPrescriptionRequest",
          entityId: result.requestId,
          metadata: {
            sourceAppointmentId: request.params.id,
            targetCountryCode: body.data.targetCountryCode,
            targetDoctorId: body.data.targetDoctorId,
            orderId: result.orderId,
          },
          request,
        }).catch(() => {});

        return reply.status(201).send(
          okResponse(
            {
              requestId: result.requestId,
              orderId: result.orderId,
              paymentUrl: result.paymentUrl,
            },
            "Cross-border prescription request created",
          ),
        );
      } catch (error) {
        if (error instanceof CrossBorderRxSourceNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (
          error instanceof CrossBorderRxTargetNotAvailableError ||
          error instanceof CrossBorderRxServicePriceMissingError ||
          error instanceof CrossBorderRxStripeNotConfiguredError
        ) {
          return reply.status(422).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create the request"));
      }
    },
  );

  // ── Doctor B: inbox ──────────────────────────────────────────────
  app.get("/api/doctor/cross-border-rx", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const data = await listCrossBorderRxInbox(auth.doctorId);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load requests"));
    }
  });

  // ── Doctor B: decision ───────────────────────────────────────────
  app.post<{ Params: { requestId: string } }>(
    "/api/doctor/cross-border-rx/:requestId/decision",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = decisionBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid decision", body.error.flatten()));
      }
      try {
        const result = await decideCrossBorderRxRequest({
          requestId: request.params.requestId,
          doctorId: auth.doctorId,
          actorUserId: auth.userId,
          decision: body.data.decision,
          message: body.data.message ?? null,
        });

        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CROSS_BORDER_RX_DECIDED",
          entityType: "CrossBorderPrescriptionRequest",
          entityId: request.params.requestId,
          metadata: { decision: body.data.decision, status: result.status },
          request,
        }).catch(() => {});

        return okResponse(
          { status: result.status, upgradeUrl: result.upgradeUrl },
          "Decision recorded",
        );
      } catch (error) {
        if (error instanceof CrossBorderRxRequestNotFoundError) {
          return reply.status(404).send(errorResponse(error.message));
        }
        if (error instanceof CrossBorderRxNotActionableError) {
          return reply.status(409).send(errorResponse(error.message));
        }
        if (error instanceof CrossBorderRxMessageRequiredError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not record the decision"));
      }
    },
  );
};

export default crossBorderRxRoute;
