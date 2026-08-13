import type { FastifyPluginAsync } from "fastify";

import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit, recordCriticalAudit } from "../modules/audit/audit.service.js";
import {
  fetchSuklWsdl,
  getSuklHealthStatus,
  runSuklAppPing,
  listSuklDoctorIdentities,
  revokeSuklDoctorIdentity,
  runSuklConnectionTest,
  SuklDoctorIdentityNotFoundError,
  upsertSuklDoctorIdentity,
} from "../modules/sukl/sukl.service.js";
import { isSuklError, suklErrorStatus } from "../lib/sukl/index.js";
import { resolveAdminSessionActor, verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  suklDoctorIdentityBodySchema,
  suklDoctorParamsSchema,
  suklWsdlQuerySchema,
} from "../validations/admin-sukl.schema.js";

/**
 * Admin console for the SÚKL (Czech ePoukaz / eRecept) integration.
 *
 *   GET    /api/admin/sukl/status                        → redacted health payload
 *   POST   /api/admin/sukl/test-connection               → certificate + mTLS proof
 *   GET    /api/admin/sukl/doctor-identities             → all mappings
 *   PUT    /api/admin/sukl/doctor-identities/:doctorUserId    → create / update one
 *   DELETE /api/admin/sukl/doctor-identities/:doctorUserId    → revoke one
 *
 * Gated with `verifyGlobalAdminAccess`, not `verifyAdminAccess`: this manages a
 * credential issued to the legal entity by a national authority, so a
 * country-scoped LOCAL_ADMIN is excluded along with the maintenance-token path's
 * usual scope caveats.
 *
 * There is deliberately NO certificate upload endpoint. Accepting a PKCS#12 plus
 * its password over HTTP is the highest-risk surface this integration could
 * have, and Railway secrets already handle rotation without it — see the runbook
 * in docs/sukl/TESTING_RUNBOOK.md.
 *
 * Every response here is redaction-safe by construction: the service layer only
 * ever returns certificate public metadata, a normalised error code and a
 * message we authored. The password, PKCS#12 bytes, private key, certificate
 * path and full fingerprint never reach this file.
 */

function handleError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof SuklDoctorIdentityNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (isSuklError(error)) {
    // `safeMessage` is the contract boundary — see lib/sukl/errors.ts.
    return reply.status(suklErrorStatus(error.code)).send(errorResponse(error.safeMessage));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(502).send(errorResponse("The SÚKL request could not be completed"));
}

const adminSuklRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/sukl/status", async (request, reply) => {
    try {
      const [status, doctorIdentities] = await Promise.all([
        getSuklHealthStatus(),
        listSuklDoctorIdentities(),
      ]);
      return okResponse({ status, doctorIdentities });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Certificate validation, then a mutual-TLS handshake against each configured
  // service. Never a business call — no official read-only SÚKL operation is
  // documented to us yet, and the operation paths need the ePoukaz v19 WSDL.
  app.post("/api/admin/sukl/test-connection", async (request, reply) => {
    const actor = resolveAdminSessionActor(request);
    try {
      const result = await runSuklConnectionTest();
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: "SUKL_CONNECTION_TESTED",
        entityType: "SuklFacilityIntegration",
        entityId: result.workplaceCode ?? "unconfigured",
        request,
        metadata: {
          environment: result.environment,
          ok: result.ok,
          stage: result.stage,
          certificateValid: result.certificate.valid,
          // Suffix only. The full fingerprint stays server-side.
          fingerprintSuffix: result.certificate.fingerprintSuffix,
          // Per-service outcome, so the audit row records WHICH endpoint was
          // reached rather than a single collapsed boolean.
          handshakes: result.handshakes.map((h) => ({
            service: h.service,
            attempted: h.attempted,
            ok: h.ok,
            errorCode: h.errorCode,
          })),
          errorCode: result.errorCode,
          durationMs: result.durationMs,
        },
      });
      return okResponse(result);
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Reads a service's WSDL over mutual TLS. The deployed backend is the only
  // thing that can reach SÚKL, so this is how the interface inventory gets
  // filled in. A GET — nothing is sent, nothing is created.
  app.get("/api/admin/sukl/wsdl", async (request, reply) => {
    const query = suklWsdlQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid WSDL request", query.error.flatten()));
    }
    const actor = resolveAdminSessionActor(request);
    try {
      const result = await fetchSuklWsdl(query.data.service, query.data.path);
      await recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: "SUKL_CONNECTION_TESTED",
        entityType: "SuklFacilityIntegration",
        entityId: query.data.service,
        request,
        metadata: {
          kind: "wsdl-fetch",
          url: result.requestedUrl,
          httpStatus: result.httpStatus,
          looksLikeWsdl: result.summary.looksLikeWsdl,
          operations: result.summary.operations.length,
        },
      });
      return okResponse(result);
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  // Calls SÚKL's AppPing. Read-only, but RATE LIMITED per user per minute with
  // temporary blocking on excess — so it is a manual admin action and must not
  // be wired to any automated check.
  app.post("/api/admin/sukl/app-ping", async (request, reply) => {
    const query = suklWsdlQuerySchema.pick({ service: true }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid service", query.error.flatten()));
    }
    const actor = resolveAdminSessionActor(request);
    try {
      const result = await runSuklAppPing(query.data.service);
      await recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: "SUKL_CONNECTION_TESTED",
        entityType: "SuklFacilityIntegration",
        entityId: query.data.service,
        request,
        metadata: {
          kind: "app-ping",
          ok: result.ok,
          httpStatus: result.httpStatus,
          durationMs: result.durationMs,
          // Our correlation id, so a SÚKL-side investigation can find the call.
          // The Uzivatel is a credential and is deliberately NOT recorded.
          requestId: result.requestId,
          interfaceVersion: result.interfaceVersion,
          errorCode: result.errorCode,
        },
      });
      return okResponse(result);
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.get("/api/admin/sukl/doctor-identities", async (request, reply) => {
    try {
      return okResponse({ doctorIdentities: await listSuklDoctorIdentities() });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.put("/api/admin/sukl/doctor-identities/:doctorUserId", async (request, reply) => {
    const params = suklDoctorParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id"));
    }
    const body = suklDoctorIdentityBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid SÚKL doctor identity", body.error.flatten()));
    }
    const actor = resolveAdminSessionActor(request);
    try {
      const identity = await upsertSuklDoctorIdentity({
        doctorUserId: params.data.doctorUserId,
        ...body.data,
        updatedByUserId: actor?.userId ?? null,
      });
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: "SUKL_DOCTOR_IDENTITY_UPDATED",
        entityType: "SuklDoctorIdentity",
        entityId: identity.id,
        request,
        metadata: {
          doctorUserId: identity.doctorUserId,
          environment: identity.environment,
          workplaceCode: identity.workplaceCode,
          status: identity.status,
        },
      });
      return okResponse({ identity });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });

  app.delete("/api/admin/sukl/doctor-identities/:doctorUserId", async (request, reply) => {
    const params = suklDoctorParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id"));
    }
    const actor = resolveAdminSessionActor(request);
    try {
      const identity = await revokeSuklDoctorIdentity(
        params.data.doctorUserId,
        actor?.userId ?? null,
      );
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? null,
        action: "SUKL_DOCTOR_IDENTITY_REVOKED",
        entityType: "SuklDoctorIdentity",
        entityId: identity.id,
        request,
        metadata: {
          doctorUserId: identity.doctorUserId,
          environment: identity.environment,
        },
      });
      return okResponse({ identity });
    } catch (error) {
      return handleError(app, reply, error);
    }
  });
};

export default adminSuklRoute;
