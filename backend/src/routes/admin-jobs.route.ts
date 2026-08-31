import { JobListingStatus, Prisma } from "@prisma/client";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  createAdminJobGroup,
  getAdminJobGroup,
  listAdminJobs,
  RecruitmentConflictError,
  RecruitmentNotReadyError,
  RecruitmentValidationError,
  updateAdminJobGroup,
} from "../modules/recruitment/recruitment.service.js";
import {
  adminJobGroupCreateBodySchema,
  adminJobGroupPatchBodySchema,
  adminJobsQuerySchema,
  jobIdParamsSchema,
} from "../modules/recruitment/recruitment.schema.js";
import { isMediaStorageConfigured } from "../services/object-storage.js";
import { pingMalwareScanner } from "../services/malware-scan.js";
import { env } from "../config/env.js";
import { resolveAdminSessionActor, verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(app: FastifyInstance, reply: FastifyReply, error: unknown) {
  if (error instanceof RecruitmentValidationError) return reply.status(400).send(errorResponse(error.message));
  if (error instanceof RecruitmentConflictError) {
    return reply.status(409).send(errorResponse("This job changed while you were editing. Reload and try again."));
  }
  if (error instanceof RecruitmentNotReadyError) return reply.status(503).send(errorResponse(error.message));
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("A job already exists with this country, locale, and slug."));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Could not save job."));
}

const adminJobsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/jobs", async (request, reply) => {
    const query = adminJobsQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send(errorResponse("Invalid jobs query", query.error.flatten()));
    try {
      return okResponse(await listAdminJobs(query.data));
    } catch (error) {
      app.log.error(error);
      return reply.status(503).send(errorResponse("Jobs are temporarily unavailable."));
    }
  });

  app.get("/api/admin/jobs/:id", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid job"));
    const job = await getAdminJobGroup(params.data.id);
    if (!job) return reply.status(404).send(errorResponse("Job not found"));
    return okResponse({ job });
  });

  app.post("/api/admin/job-groups", async (request, reply) => {
    const body = adminJobGroupCreateBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send(errorResponse("Invalid job", body.error.flatten()));
    const actor = resolveAdminSessionActor(request);
    try {
      const job = await createAdminJobGroup(body.data, actor?.userId ?? null);
      const common = {
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        entityType: "JobListing",
        entityId: job.id,
        request,
        metadata: {
          countryId: job.countryId,
          slug: job.slug,
          jobIds: job.localizations.map(({ id }) => id),
          locales: job.localizations.map(({ locale }) => locale),
        },
      };
      await recordAudit({ ...common, action: "JOB_CREATED" });
      if (job.status === JobListingStatus.PUBLISHED) {
        await recordAudit({ ...common, action: "JOB_PUBLISHED" });
      }
      return reply.status(201).send(okResponse({ job }));
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/job-groups/:id", async (request, reply) => {
    const params = jobIdParamsSchema.safeParse(request.params);
    const body = adminJobGroupPatchBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.status(400).send(errorResponse("Invalid job update"));
    const actor = resolveAdminSessionActor(request);
    try {
      const updated = await updateAdminJobGroup(params.data.id, body.data, actor?.userId ?? null);
      if (!updated) return reply.status(404).send(errorResponse("Job not found"));
      const { job, previousStatus } = updated;
      const common = {
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        entityType: "JobListing",
        entityId: job.id,
        request,
        metadata: {
          anchorId: params.data.id,
          countryId: job.countryId,
          slug: job.slug,
          jobIds: job.localizations.map(({ id }) => id),
          locales: job.localizations.map(({ locale }) => locale),
        },
      };
      await recordAudit({ ...common, action: "JOB_UPDATED" });
      if (previousStatus !== job.status && job.status === JobListingStatus.PUBLISHED) {
        await recordAudit({ ...common, action: "JOB_PUBLISHED" });
      }
      if (previousStatus !== job.status && job.status === JobListingStatus.ARCHIVED) {
        await recordAudit({ ...common, action: "JOB_ARCHIVED" });
      }
      return okResponse({ job });
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.get("/api/admin/recruitment/health", async () => {
    const storageConfigured = isMediaStorageConfigured();
    const scannerConfigured = Boolean(env.CLAMAV_HOST);
    const scannerReachable = scannerConfigured ? await pingMalwareScanner() : false;
    return okResponse({
      storage: { configured: storageConfigured },
      scanner: { configured: scannerConfigured, reachable: scannerReachable },
      ready: storageConfigured && scannerReachable,
    });
  });
};

export default adminJobsRoute;
