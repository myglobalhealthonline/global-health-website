import type { FastifyPluginAsync } from "fastify";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import {
  DoctorFaqNotFoundError,
  listAdminDoctorFaqs,
  replaceDoctorFaqs,
} from "../modules/doctor-faqs/doctor-faqs.service.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  doctorFaqIdParamsSchema,
  doctorFaqsReplaceBodySchema,
} from "../validations/doctor-faqs.schema.js";

const adminDoctorFaqsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/doctors/:doctorId/faqs", async (request, reply) => {
    const params = doctorFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const data = await listAdminDoctorFaqs(params.data.doctorId);
      if (!data) return reply.status(404).send(errorResponse("Doctor profile not found"));
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctor FAQs"));
    }
  });

  app.put("/api/admin/doctors/:doctorId/faqs", async (request, reply) => {
    const params = doctorFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    const body = doctorFaqsReplaceBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ payload", body.error.flatten()));
    }

    try {
      const faqs = await replaceDoctorFaqs(params.data.doctorId, body.data);
      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: params.data.doctorId,
        metadata: { faqs: faqs.length },
        request,
      }).catch(() => {});
      return okResponse({ faqs }, "Doctor FAQs saved");
    } catch (error) {
      if (error instanceof DoctorFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save doctor FAQs"));
    }
  });
};

export default adminDoctorFaqsRoute;
