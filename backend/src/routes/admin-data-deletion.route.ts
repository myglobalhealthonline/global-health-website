import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import {
  assertAdminCountryFolderScope,
  resolveAdminListCountryFolders,
} from "../utils/order-country-scope.js";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  listDeletionRequests,
  updateDeletionRequest,
  anonymizePatient,
  PatientAnonymizeOutOfScopeError,
} from "../modules/data-policy/country-data-policy.service.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/auth-session.js";

/**
 * LOCAL_ADMIN country scope for the deletion workflow.
 *
 * All three endpoints in this file gated only on `verifyAdminAccess`, which
 * treats LOCAL_ADMIN exactly like ADMIN — so a LOCAL_ADMIN scoped to one
 * country could list every other country's deletion requests (each naming a
 * patient profile), advance them, and irreversibly anonymize a patient they
 * administer nothing for.
 *
 * Same decision function AZ-1/AZ-2 gave `/api/admin/appointments*` and
 * `/api/admin/patient-merge*` (`assertAdminCountryFolderScope`), keyed on the
 * patient's own `countryFolderCode` — one authorization model across the admin
 * surface, not a second competing one. ADMIN, SUPER_ADMIN and the admin-token
 * fallback are never scoped and skip the lookup entirely.
 *
 * A patient with no country folder fails CLOSED for a LOCAL_ADMIN: the empty
 * string can never appear in an allow-list. The denial audit carries operational
 * identifiers only — never the request body, the patient's name/email/IDs or the
 * deletion reason.
 */
async function assertPatientDeletionCountryScope(
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
    auditReason: "LOCAL_ADMIN data-deletion access outside assigned country scope",
    deniedMessage: "This patient is outside your assigned country scope",
  });
}

const adminDataDeletionRoute: FastifyPluginAsync = async (app) => {
  // ─── List all deletion requests ───────────────────────────────────────────

  app.get(
    "/api/admin/data-deletion-requests",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const querySchema = z.object({
        status: z
          .enum(["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_COMPLETED", "COMPLETED", "REJECTED"])
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });

      const q = querySchema.safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send(errorResponse("Invalid query params", q.error.flatten()));
      }

      try {
        const result = await listDeletionRequests({
          status: q.data.status,
          limit: q.data.limit,
          offset: (q.data.page - 1) * q.data.limit,
          // Clamps the Prisma where-clause itself, so `total` and the page
          // describe the same in-scope set. null for the unscoped roles.
          allowedCountryFolders: await resolveAdminListCountryFolders(request),
        });
        return okResponse(result);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list deletion requests");
      }
    },
  );

  // ─── Update deletion request status ──────────────────────────────────────

  const patchSchema = z.object({
    status: z.enum(["UNDER_REVIEW", "PARTIALLY_COMPLETED", "COMPLETED", "REJECTED"]),
    adminNotes: z.string().max(2000).optional(),
    executeAnonymize: z.boolean().optional(),
  });

  app.patch<{ Params: { id: string } }>(
    "/api/admin/data-deletion-requests/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = patchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      // PR-5: anonymization runs BEFORE the status is written, and COMPLETED
      // has to be earned. Previously the status was committed first and
      // anonymization attempted after, so a failed anonymize left a request
      // permanently claiming COMPLETED with nothing erased.
      if (body.data.executeAnonymize && body.data.status === "COMPLETED") {
        return reply
          .status(400)
          .send(
            errorResponse(
              "Anonymizing queues the personal-object purge, which has not run yet — record this as PARTIALLY_COMPLETED and mark it COMPLETED once the purge has drained.",
            ),
          );
      }

      try {
        const req = await prisma.dataDeletionRequest.findUnique({
          where: { id: request.params.id },
          select: { patientProfileId: true },
        });
        if (!req) {
          return reply.status(404).send(errorResponse("Deletion request not found"));
        }

        // Country scope BEFORE anything is read further or written: a
        // LOCAL_ADMIN must not advance, or anonymize through, a request whose
        // patient belongs to another country's folder.
        const scope = await assertPatientDeletionCountryScope(request, req.patientProfileId);
        if (!scope.allowed) return reply.status(scope.status).send(errorResponse(scope.message));

        // COMPLETED must mean the objects are actually gone, not merely queued.
        if (body.data.status === "COMPLETED" && req.patientProfileId) {
          const { hasOutstandingPersonalObjectPurge } = await import(
            "../modules/outbox/outbox.js"
          );
          if (await hasOutstandingPersonalObjectPurge(req.patientProfileId)) {
            return reply
              .status(409)
              .send(
                errorResponse(
                  "A personal-object purge for this patient is still outstanding — the request cannot be COMPLETED yet.",
                ),
              );
          }
        }

        // Anonymize first: if it throws, the status is never written and the
        // request keeps its previous, still-truthful state.
        //
        // These are two transactions, not one — `anonymizePatient` owns its own.
        // The failure mode is deliberately the safe direction: if the status
        // write fails after anonymization committed, the request understates
        // progress rather than overstating it. A retry then re-runs
        // anonymization, which is idempotent on the columns (already null) and
        // on the purge queue (unique idempotencyKey), but does append a second
        // PATIENT_ANONYMIZED audit row. That duplicate is acceptable: AuditLog
        // is append-only evidence, and two records of a real erasure attempt
        // are preferable to a lost one.
        if (body.data.executeAnonymize && body.data.status === "PARTIALLY_COMPLETED") {
          if (req.patientProfileId) {
            await anonymizePatient({
              patientProfileId: req.patientProfileId,
              adminId,
              // Re-checked on the transaction's own snapshot, so a folder
              // changed between the precheck above and the erasure cannot slip
              // a foreign patient through.
              allowedCountryFolders: await resolveAdminListCountryFolders(request),
            });
          }
        }

        await updateDeletionRequest({
          requestId: request.params.id,
          requestStatus: body.data.status,
          reviewedByAdminId: adminId,
          notes: body.data.adminNotes,
        });

        return okResponse({ updated: true }, "Deletion request updated");
      } catch (error) {
        if (error instanceof PatientAnonymizeOutOfScopeError) {
          return reply.status(403).send(errorResponse(error.message));
        }
        return replyWithError(reply, app.log, error, "Could not update deletion request");
      }
    },
  );

  // ─── Directly anonymize a patient (separate from deletion workflow) ───────

  const anonymizeSchema = z.object({
    patientProfileId: z.string().min(1),
    reason: z.string().trim().min(10).max(500),
  });

  app.post(
    "/api/admin/patient-anonymize",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = anonymizeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      // Direct anonymization is the same irreversible erasure the workflow
      // performs, reachable without a DataDeletionRequest — it needs the same
      // country scope, verified against the target profile's own folder.
      const scope = await assertPatientDeletionCountryScope(
        request,
        body.data.patientProfileId,
      );
      if (!scope.allowed) return reply.status(scope.status).send(errorResponse(scope.message));

      try {
        await anonymizePatient({
          patientProfileId: body.data.patientProfileId,
          adminId,
          allowedCountryFolders: await resolveAdminListCountryFolders(request),
        });
        return okResponse({ anonymized: true }, "Patient data anonymized");
      } catch (error) {
        if (error instanceof PatientAnonymizeOutOfScopeError) {
          return reply.status(403).send(errorResponse(error.message));
        }
        return replyWithError(reply, app.log, error, "Could not anonymize patient");
      }
    },
  );
};

export default adminDataDeletionRoute;
