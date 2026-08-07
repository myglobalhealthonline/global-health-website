import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";
import { recordAudit } from "../modules/audit/audit.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  cancelMembershipImport,
  commitMembershipImport,
  getMembershipImportBatch,
  previewMembershipImport,
  MembershipImportError,
  MembershipImportNotFoundError,
} from "../modules/memberships/membership-import.service.js";
import { requireManageMemberships } from "../utils/manage-memberships-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Membership CSV import — preview then commit (§8), phase 2.
 *
 * MANAGE_MEMBERSHIPS. The upload endpoint only ever writes a
 * `MembershipImportBatch`; nothing reaches `MembershipEnrollment` until an
 * admin commits, and the commit reads the batch's server-side `previewData`
 * rather than anything the client sends back.
 */

const batchIdParamsSchema = z.object({ batchId: z.string().trim().min(1) });

/** 2,000 rows of member data comfortably under the global 10 MB multipart cap. */
const MAX_CSV_BYTES = 5 * 1024 * 1024;

function handleImportError(
  app: { log: { error: (e: unknown) => void } },
  reply: FastifyReply,
  error: unknown,
) {
  if (error instanceof MembershipImportNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof MembershipImportError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected membership import error"));
}

const adminMembershipImportRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/admin/membership-imports", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    if (!request.isMultipart()) {
      return reply.status(400).send(errorResponse("Upload the CSV as multipart/form-data"));
    }

    let planId = "";
    let fileName = "members.csv";
    let csv: string | null = null;

    try {
      for await (const part of request.parts()) {
        if (part.type === "file" && part.fieldname === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > MAX_CSV_BYTES) {
            return reply.status(413).send(errorResponse("File too large (max 5 MB)"));
          }
          fileName = part.filename || fileName;
          csv = buffer.toString("utf8");
        } else if (part.type === "field" && part.fieldname === "planId") {
          planId = String(part.value ?? "").trim();
        }
      }
    } catch (error) {
      return handleImportError(app, reply, error);
    }

    if (!planId) return reply.status(400).send(errorResponse("planId is required"));
    if (!csv || csv.trim() === "") return reply.status(400).send(errorResponse("File is required"));

    try {
      const batch = await previewMembershipImport({
        planId,
        fileName,
        csv,
        adminId: auth.actorUserId,
      });
      // No audit row here on purpose: a preview changes nothing. The commit
      // writes one, with the file name and the counts (§14).
      return okResponse({ batch }, "Import previewed");
    } catch (error) {
      return handleImportError(app, reply, error);
    }
  });

  app.get("/api/admin/membership-imports/:batchId", async (request, reply) => {
    if (!(await requireManageMemberships(request, reply))) return;
    const params = batchIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid batch id"));
    try {
      return okResponse({ batch: await getMembershipImportBatch(params.data.batchId) });
    } catch (error) {
      return handleImportError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-imports/:batchId/commit", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = batchIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid batch id"));
    try {
      const result = await commitMembershipImport(params.data.batchId, auth.actorUserId);
      if (!result.claimed) {
        // A double-click, a retry or a racing cancel: report the batch's
        // current state rather than applying anything twice (§8.2).
        return okResponse(
          { batch: result.batch, applied: false },
          `This import is already ${result.batch.status.toLowerCase()}`,
        );
      }
      recordAudit({
        actorUserId: auth.actorUserId,
        actorRole: auth.actorRole,
        action: "MEMBERSHIP_IMPORT_COMMITTED",
        entityType: "MembershipImportBatch",
        entityId: result.batch.id,
        metadata: {
          planId: result.batch.planId,
          fileName: result.batch.fileName,
          created: result.created,
          revived: result.revived,
          skipped: result.skipped.length,
        },
        request,
      }).catch(() => {});
      return okResponse(
        {
          batch: result.batch,
          applied: true,
          created: result.created,
          revived: result.revived,
          skipped: result.skipped,
          revalidated: result.revalidated,
        },
        "Import committed",
      );
    } catch (error) {
      return handleImportError(app, reply, error);
    }
  });

  app.post("/api/admin/membership-imports/:batchId/cancel", async (request, reply) => {
    const auth = await requireManageMemberships(request, reply);
    if (!auth) return;
    const params = batchIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid batch id"));
    try {
      const result = await cancelMembershipImport(params.data.batchId);
      if (result.claimed) {
        recordAudit({
          actorUserId: auth.actorUserId,
          actorRole: auth.actorRole,
          action: "MEMBERSHIP_IMPORT_CANCELLED",
          entityType: "MembershipImportBatch",
          entityId: result.batch.id,
          metadata: { planId: result.batch.planId, fileName: result.batch.fileName },
          request,
        }).catch(() => {});
      }
      return okResponse(
        { batch: result.batch, cancelled: result.claimed },
        result.claimed
          ? "Import cancelled"
          : `This import is already ${result.batch.status.toLowerCase()}`,
      );
    } catch (error) {
      return handleImportError(app, reply, error);
    }
  });
};

export default adminMembershipImportRoute;
