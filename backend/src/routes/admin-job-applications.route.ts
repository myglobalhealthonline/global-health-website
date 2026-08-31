import { NoSuchKey } from "@aws-sdk/client-s3";
import type { FastifyPluginAsync } from "fastify";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import {
  getAdminApplication,
  getApplicationForCv,
  listAdminApplications,
  purgeApplicationRow,
  setApplicationStatus,
} from "../modules/recruitment/recruitment.service.js";
import {
  adminApplicationsQuerySchema,
  applicationPurgeBodySchema,
  applicationStatusBodySchema,
  jobIdParamsSchema,
} from "../modules/recruitment/recruitment.schema.js";
import { recruitmentOperationalError } from "../modules/recruitment/recruitment-log.js";
import {
  deleteObject,
  getObject,
  isMediaStorageConfigured,
  MediaObjectNotFoundError,
  streamToNodeReadable,
} from "../services/object-storage.js";
import { resolveAdminSessionActor, verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { contentDisposition } from "../utils/content-disposition.js";
import { errorResponse, okResponse } from "../utils/response.js";

const adminJobApplicationsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "private, no-store");
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/job-applications", async (request, reply) => {
    const query = adminApplicationsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid applications query", query.error.flatten()));
    }
    const actor = resolveAdminSessionActor(request);
    try {
      const result = await listAdminApplications(query.data);
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "JOB_APPLICATION_LIST_VIEWED",
        entityType: "JobApplicationList",
        entityId: "recruitment",
        metadata: {
          ...(query.data.countryId ? { countryId: query.data.countryId } : {}),
          ...(query.data.jobId ? { jobListingId: query.data.jobId } : {}),
          ...(query.data.status ? { status: query.data.status } : {}),
          ...(query.data.submittedFrom ? { submittedFrom: query.data.submittedFrom.toISOString() } : {}),
          ...(query.data.submittedTo ? { submittedTo: query.data.submittedTo.toISOString() } : {}),
          resultCount: result.items.length,
        },
        request,
      });
      return okResponse(result);
    } catch (error) {
      app.log.error(recruitmentOperationalError(error), "job application list failed");
      return reply.status(503).send(errorResponse("Applications are temporarily unavailable."));
    }
  });

  app.get("/api/admin/job-applications/:id", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid application"));
    const actor = resolveAdminSessionActor(request);
    try {
      const application = await getAdminApplication(params.data.id);
      if (!application) return reply.status(404).send(errorResponse("Application not found"));
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "JOB_APPLICATION_VIEWED",
        entityType: "JobApplication",
        entityId: application.id,
        request,
      });
      return okResponse({
        application: {
          ...application,
          cvDownloadPath: `/api/admin/job-applications/${encodeURIComponent(application.id)}/cv`,
        },
      });
    } catch (error) {
      app.log.error(recruitmentOperationalError(error), "job application detail failed");
      return reply.status(503).send(errorResponse("Application is temporarily unavailable."));
    }
  });

  app.patch("/api/admin/job-applications/:id", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    const body = applicationStatusBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send(errorResponse("Invalid status update"));
    const actor = resolveAdminSessionActor(request);
    try {
      const application = await setApplicationStatus(params.data.id, body.data.status, {
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
      });
      if (!application) return reply.status(404).send(errorResponse("Application not found"));
      return okResponse({ application });
    } catch (error) {
      app.log.error(recruitmentOperationalError(error), "job application status failed");
      return reply.status(503).send(errorResponse("Could not update application."));
    }
  });

  app.get("/api/admin/job-applications/:id/cv", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid application"));
    const actor = resolveAdminSessionActor(request);
    try {
      const application = await getApplicationForCv(params.data.id);
      if (!application) return reply.status(404).send(errorResponse("Application not found"));
      await recordCriticalAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "JOB_APPLICATION_CV_DOWNLOADED",
        entityType: "JobApplication",
        entityId: application.id,
        metadata: { jobListingId: application.jobListing.id },
        request,
      });
      const object = await getObject(application.cvStorageKey);
      const stream = streamToNodeReadable(object.Body);
      if (!stream) return reply.status(500).send(errorResponse("Could not read CV."));
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", contentDisposition(`candidate-cv-${application.id}.pdf`));
      reply.header("Cache-Control", "private, no-store");
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Content-Security-Policy", "sandbox; default-src 'none'; object-src 'none'");
      return reply.send(stream);
    } catch (error) {
      if (error instanceof NoSuchKey || error instanceof MediaObjectNotFoundError) {
        return reply.status(404).send(errorResponse("CV not found"));
      }
      app.log.error(recruitmentOperationalError(error), "job application CV read failed");
      return reply.status(503).send(errorResponse("CV is temporarily unavailable."));
    }
  });

  app.delete("/api/admin/job-applications/:id", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    const body = applicationPurgeBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send(errorResponse("Invalid purge request"));
    const actor = resolveAdminSessionActor(request);
    try {
      const application = await getApplicationForCv(params.data.id);
      if (!application) return reply.status(404).send(errorResponse("Application not found"));
      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("CV storage is temporarily unavailable."));
      }
      await deleteObject(application.cvStorageKey);
      const deleted = await purgeApplicationRow(application.id, body.data.reason, {
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
      });
      if (!deleted) return reply.status(404).send(errorResponse("Application not found"));
      return okResponse({ deleted: true });
    } catch (error) {
      app.log.error(recruitmentOperationalError(error), "job application purge failed");
      return reply.status(503).send(errorResponse("Could not purge application."));
    }
  });
};

export default adminJobApplicationsRoute;
