import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import {
  assertAdminCountryFolderScope,
  resolveAdminListCountryFolders,
} from "../utils/order-country-scope.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  findPotentialDuplicates,
  mergePatients,
  getMergeStatus,
  PatientMergeOutOfScopeError,
} from "../modules/patient-merge/patient-merge.service.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/auth-session.js";

/**
 * AZ-2: all three endpoints below gated only on `verifyAdminAccess`, which
 * treats LOCAL_ADMIN exactly like ADMIN. A LOCAL_ADMIN scoped to one country's
 * folder could search another country's patient for duplicates, read their
 * merge status, and irreversibly merge two patients they administer nothing
 * for — deactivating an account and re-pointing every medical document,
 * appointment and consent row behind it.
 *
 * Same decision function AZ-1 gave `/api/admin/appointments*`
 * (`assertAdminCountryFolderScope`), keyed on the patient's own
 * `countryFolderCode` — one authorization model across the admin surface, not
 * a second competing one. ADMIN, SUPER_ADMIN and the admin-token fallback are
 * never scoped and skip the lookup entirely.
 *
 * A patient with no country folder fails CLOSED for a LOCAL_ADMIN: the empty
 * string can never appear in an allow-list. ADMIN/SUPER_ADMIN reach the early
 * return above and are unaffected.
 */
async function assertPatientMergeCountryScope(
  request: FastifyRequest,
  patientProfileId: string,
): Promise<{ allowed: true } | { allowed: false; status: 403 | 404; message: string }> {
  // Synchronous JWT decode — no DB call for the unscoped roles.
  if (resolveAdminSessionActor(request)?.role !== "LOCAL_ADMIN") return { allowed: true };

  const target = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { countryFolderCode: true },
  });
  if (!target) return { allowed: false, status: 404, message: "Patient not found" };

  return assertAdminCountryFolderScope(request, {
    entityType: "PatientProfile",
    entityId: patientProfileId,
    countryCode: target.countryFolderCode ?? "",
    auditReason: "LOCAL_ADMIN patient-merge access outside assigned country scope",
    deniedMessage: "This patient is outside your assigned country scope",
  });
}

const adminPatientMergeRoute: FastifyPluginAsync = async (app) => {
  // ─── Find potential duplicates for a given patient ────────────────────────

  app.get<{ Params: { patientId: string } }>(
    "/api/admin/patient-merge/duplicates/:patientId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const scope = await assertPatientMergeCountryScope(request, request.params.patientId);
      if (!scope.allowed) return reply.status(scope.status).send(errorResponse(scope.message));

      try {
        const duplicates = await findPotentialDuplicates(
          request.params.patientId,
          await resolveAdminListCountryFolders(request),
        );
        return okResponse({ duplicates });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not search for duplicates");
      }
    },
  );

  // ─── Get merge status for a given patient ─────────────────────────────────

  app.get<{ Params: { patientId: string } }>(
    "/api/admin/patient-merge/status/:patientId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const scope = await assertPatientMergeCountryScope(request, request.params.patientId);
      if (!scope.allowed) return reply.status(scope.status).send(errorResponse(scope.message));

      try {
        const status = await getMergeStatus(request.params.patientId);
        return okResponse(status);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not get merge status");
      }
    },
  );

  // ─── Perform merge ────────────────────────────────────────────────────────

  const mergeSchema = z.object({
    primaryPatientId: z.string().min(1),
    duplicatePatientId: z.string().min(1),
    reason: z.string().trim().min(10).max(500),
  });

  app.post(
    "/api/admin/patient-merge",
    {
      // Hard rate-limit: merges are irreversible and should never be automated.
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = mergeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid merge payload", body.error.flatten()));
      }

      if (body.data.primaryPatientId === body.data.duplicatePatientId) {
        return reply.status(400).send(errorResponse("Primary and duplicate cannot be the same patient"));
      }

      // Both participants must be in scope, checked before the transaction so
      // a denial writes nothing and produces the folder-scope audit row. Each
      // check re-reads the admin's folder list rather than sharing one lookup:
      // that is the price of routing every denial through the same audited
      // decision function AZ-1 uses, and this endpoint is rate-limited to 20
      // merges/hour, so two extra indexed reads buy one authorization model.
      for (const patientId of [body.data.primaryPatientId, body.data.duplicatePatientId]) {
        const scope = await assertPatientMergeCountryScope(request, patientId);
        if (!scope.allowed) return reply.status(scope.status).send(errorResponse(scope.message));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      try {
        await mergePatients({
          primaryPatientId: body.data.primaryPatientId,
          duplicatePatientId: body.data.duplicatePatientId,
          adminId,
          reason: body.data.reason,
          // Re-checked inside the transaction against the rows it is about to
          // rewrite, so a folder change between the check above and the merge
          // cannot slip a foreign patient through.
          allowedCountryFolders: await resolveAdminListCountryFolders(request),
        });
        return okResponse({ merged: true }, "Patients merged successfully");
      } catch (error) {
        if (error instanceof PatientMergeOutOfScopeError) {
          return reply.status(403).send(errorResponse(error.message));
        }
        return replyWithError(reply, app.log, error, "Could not merge patients");
      }
    },
  );
};

export default adminPatientMergeRoute;
