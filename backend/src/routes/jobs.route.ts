import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { deleteObject, putObject } from "../services/object-storage.js";
import { scanBufferForMalware } from "../services/malware-scan.js";
import {
  applicationFieldsSchema,
  jobIdParamsSchema,
  jobSlugParamsSchema,
  MAX_CV_BYTES,
  publicJobsQuerySchema,
  validateCvPdf,
} from "../modules/recruitment/recruitment.schema.js";
import {
  createApplicationAfterUpload,
  getOpenJobById,
  getPublicJob,
  JobClosedError,
  listPublicJobs,
} from "../modules/recruitment/recruitment.service.js";
import {
  recruitmentErrorCode,
  recruitmentOperationalError,
} from "../modules/recruitment/recruitment-log.js";
import { errorResponse, okResponse } from "../utils/response.js";

const APPLICATION_UNAVAILABLE = "Applications are temporarily unavailable. Please try again later.";
const fieldNames = new Set(["fullName", "email", "phone", "message", "privacyAcknowledged", "website"]);

const jobsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/jobs", async (request, reply) => {
    reply.header("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    const query = publicJobsQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send(errorResponse("Invalid jobs query", query.error.flatten()));
    try {
      return okResponse({ jobs: await listPublicJobs(query.data.countryCode, query.data.locale) });
    } catch (error) {
      app.log.error({ err: error }, "public jobs list failed");
      return reply.status(503).send(errorResponse("Jobs are temporarily unavailable."));
    }
  });

  app.get("/api/public/jobs/:slug", async (request, reply) => {
    reply.header("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");
    const params = jobSlugParamsSchema.safeParse(request.params);
    const query = publicJobsQuerySchema.safeParse(request.query);
    if (!params.success || !query.success) return reply.status(400).send(errorResponse("Invalid job lookup"));
    try {
      const job = await getPublicJob(params.data.slug, query.data.countryCode, query.data.locale);
      if (!job) return reply.status(404).send(errorResponse("Job not found"));
      return okResponse({ job });
    } catch (error) {
      app.log.error({ err: error }, "public job detail failed");
      return reply.status(503).send(errorResponse("Job is temporarily unavailable."));
    }
  });

  app.post(
    "/api/public/jobs/:id/applications",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour", skipOnError: false } } },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const params = jobIdParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid job"));
      if (!request.isMultipart()) return reply.status(400).send(errorResponse("A multipart form is required."));

      try {
        if (!(await getOpenJobById(params.data.id))) {
          return reply.status(409).send(errorResponse("This job is no longer accepting applications."));
        }

        const fields: Record<string, string> = {};
        let cv: { buffer: Buffer; filename: string; mimetype: string } | null = null;
        for await (const part of request.parts({
          limits: { files: 1, fields: 6, parts: 7, fileSize: MAX_CV_BYTES },
        })) {
          if (part.type === "file") {
            if (part.fieldname !== "cv" || cv) {
              part.file.resume();
              return reply.status(400).send(errorResponse('Exactly one PDF field named "cv" is required.'));
            }
            cv = { buffer: await part.toBuffer(), filename: part.filename, mimetype: part.mimetype };
            continue;
          }
          if (!fieldNames.has(part.fieldname) || Object.hasOwn(fields, part.fieldname)) {
            return reply.status(400).send(errorResponse("Unexpected or duplicate form field."));
          }
          fields[part.fieldname] = String(part.value ?? "");
        }

        const parsedFields = applicationFieldsSchema.safeParse(fields);
        if (!parsedFields.success) {
          return reply.status(400).send(errorResponse("Invalid application", parsedFields.error.flatten()));
        }
        // Bot trap: indistinguishable success, with no scan/storage/database write.
        if (parsedFields.data.website) return reply.status(201).send(okResponse({}, "Application received."));
        if (!cv) return reply.status(400).send(errorResponse("Please upload a valid PDF."));
        const cvCheck = validateCvPdf(cv.buffer, cv.filename, cv.mimetype);
        if (!cvCheck.ok) return reply.status(cvCheck.status).send(errorResponse(cvCheck.message));

        const scan = await scanBufferForMalware(cv.buffer);
        if (scan.result === "INFECTED") {
          return reply.status(422).send(errorResponse("This PDF could not be accepted."));
        }
        if (scan.result !== "CLEAN") return reply.status(503).send(errorResponse(APPLICATION_UNAVAILABLE));

        const storageKey = `recruitment/cv/${randomUUID()}.pdf`;
        try {
          await putObject(storageKey, cv.buffer, "application/pdf");
        } catch (error) {
          app.log.error(
            { ...recruitmentOperationalError(error), jobId: params.data.id },
            "recruitment CV storage failed",
          );
          return reply.status(503).send(errorResponse(APPLICATION_UNAVAILABLE));
        }

        try {
          await createApplicationAfterUpload({
            jobId: params.data.id,
            fields: parsedFields.data,
            cvStorageKey: storageKey,
            cvByteSize: cv.buffer.length,
          });
        } catch (error) {
          await deleteObject(storageKey).catch((cleanupError) =>
            app.log.error(
              { ...recruitmentOperationalError(cleanupError), jobId: params.data.id },
              "recruitment CV compensation failed",
            ),
          );
          if (error instanceof JobClosedError) {
            return reply.status(409).send(errorResponse("This job is no longer accepting applications."));
          }
          app.log.error(
            { ...recruitmentOperationalError(error), jobId: params.data.id },
            "recruitment application save failed",
          );
          return reply.status(503).send(errorResponse(APPLICATION_UNAVAILABLE));
        }
        return reply.status(201).send(okResponse({}, "Application received."));
      } catch (error) {
        const code = recruitmentErrorCode(error);
        if (code === "FST_REQ_FILE_TOO_LARGE" || code === "FST_FILES_LIMIT") {
          return reply.status(413).send(errorResponse("The PDF must be 5 MB or smaller."));
        }
        if (code === "FST_FIELDS_LIMIT" || code === "FST_PARTS_LIMIT") {
          return reply.status(400).send(errorResponse("The application form contains too many fields."));
        }
        app.log.error(
          { ...recruitmentOperationalError(error), jobId: params.data.id },
          "recruitment application request failed",
        );
        return reply.status(503).send(errorResponse(APPLICATION_UNAVAILABLE));
      }
    },
  );
};

export default jobsRoute;
