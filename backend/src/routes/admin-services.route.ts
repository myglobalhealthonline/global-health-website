import type { FastifyPluginAsync } from "fastify";
import { recordAudit, recordEntityPurge } from "../modules/audit/audit.service.js";
import { Prisma } from "@prisma/client";
import {
  createAdminSpecialty,
  disableAdminSpecialty,
  createAdminService,
  disableAdminService,
  getAdminServiceById,
  getAdminSpecialtyById,
  listAdminServices,
  listSpecialtiesForAdminCountry,
  purgeAdminService,
  purgeAdminSpecialty,
  reorderAdminServices,
  reorderAdminSpecialties,
  ServiceCountryNotFoundError,
  ServiceKindInvalidError,
  ServiceSpecialtyInvalidError,
  updateAdminSpecialty,
  updateAdminService,
} from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminServiceCreateBodySchema,
  adminServicesQuerySchema,
  adminServiceUpdateBodySchema,
  adminSpecialtyCreateBodySchema,
  adminSpecialtiesQuerySchema,
  adminSpecialtyUpdateBodySchema,
  bulkReorderBodySchema,
  serviceIdParamsSchema,
  serviceFaqIdParamsSchema,
  serviceFaqCreateBodySchema,
  serviceFaqUpdateBodySchema,
  serviceFaqReorderBodySchema,
} from "../validations/admin-services.schema.js";
import {
  listServiceFaqs,
  createServiceFaq,
  updateServiceFaq,
  deleteServiceFaq,
  reorderServiceFaqs,
  ServiceFaqNotFoundError,
  ServiceFaqServiceNotFoundError,
  ServiceFaqMaxLimitError,
} from "../services/service-faq.service.js";
import { resolveAdminSessionActor, verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { bookingPauseBodySchema } from "../validations/booking-pause.schema.js";
import { setServiceBookingPause } from "../modules/bookability/bookability.service.js";

function handleServiceWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (
    error instanceof ServiceCountryNotFoundError ||
    error instanceof ServiceSpecialtyInvalidError ||
    error instanceof ServiceKindInvalidError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique service field (country + slug)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin services error"));
}

const adminServicesRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/specialties", async (request, reply) => {
    const query = adminSpecialtiesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid specialties query", query.error.flatten()));
    }

    try {
      const specialties = await listSpecialtiesForAdminCountry(query.data.countryId);
      return okResponse({ specialties });
    } catch (error) {
      if (error instanceof ServiceCountryNotFoundError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin specialties error"));
    }
  });

  app.get("/api/admin/specialties/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid specialty id", params.error.flatten()));
    }
    try {
      const specialty = await getAdminSpecialtyById(params.data.id);
      if (!specialty) {
        return reply.status(404).send(errorResponse("Specialty not found"));
      }
      return okResponse({ specialty });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin specialty error"));
    }
  });

  app.post("/api/admin/specialties", async (request, reply) => {
    const body = adminSpecialtyCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid specialty payload", body.error.flatten()));
    }
    try {
      const specialty = await createAdminSpecialty(body.data);
      return okResponse({ specialty }, "Specialty created");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/specialties/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid specialty id", params.error.flatten()));
    }
    const body = adminSpecialtyUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid specialty update", body.error.flatten()));
    }
    try {
      const specialty = await updateAdminSpecialty(params.data.id, body.data);
      if (!specialty) {
        return reply.status(404).send(errorResponse("Specialty not found"));
      }
      return okResponse({ specialty }, "Specialty updated");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/specialties/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid specialty id", params.error.flatten()));
    }
    try {
      const specialty = await disableAdminSpecialty(params.data.id);
      if (!specialty) {
        return reply.status(404).send(errorResponse("Specialty not found"));
      }
      return okResponse({ specialty }, "Specialty deactivated");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/specialties/:id/purge", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid specialty id", params.error.flatten()));
    }
    try {
      const deleted = await purgeAdminSpecialty(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Specialty not found"));
      }
      recordEntityPurge(request, "Specialty", params.data.id);
      return okResponse({}, "Specialty deleted");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.get("/api/admin/services", async (request, reply) => {
    const query = adminServicesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin services query", query.error.flatten()));
    }

    try {
      const data = await listAdminServices(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin services error"));
    }
  });

  app.get("/api/admin/services/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }

    try {
      const service = await getAdminServiceById(params.data.id);
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return okResponse({ service });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin service error"));
    }
  });

  app.patch("/api/admin/services/:id/booking-pause", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    const body = bookingPauseBodySchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send(
        errorResponse("Invalid service booking pause", {
          params: params.success ? undefined : params.error.flatten(),
          body: body.success ? undefined : body.error.flatten(),
        }),
      );
    }
    try {
      const service = await setServiceBookingPause(params.data.id, {
        bookingPausedFrom: body.data.from,
        bookingPausedUntil: body.data.until,
        bookingPauseReason: body.data.reasonCode,
      });
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
        actorRole: "ADMIN",
        action: "BOOKING_PAUSE_SET",
        entityType: "Service",
        entityId: service.id,
        metadata: {
          from: service.bookingPausedFrom?.toISOString() ?? null,
          until: service.bookingPausedUntil?.toISOString() ?? null,
          reasonCode: service.bookingPauseReason,
        },
        request,
      }).catch(() => {});
      return okResponse({ service }, "Service booking pause saved");
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/services/:id/booking-pause", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    try {
      const service = await setServiceBookingPause(params.data.id, { bookingPausedFrom: null });
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
        actorRole: "ADMIN",
        action: "BOOKING_PAUSE_CLEARED",
        entityType: "Service",
        entityId: service.id,
        request,
      }).catch(() => {});
      return okResponse({ service }, "Service booking pause cleared");
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.post("/api/admin/services", async (request, reply) => {
    const body = adminServiceCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid service payload", body.error.flatten()));
    }

    try {
      const service = await createAdminService(body.data);
      return okResponse({ service }, "Service created");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/services/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }

    const body = adminServiceUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid service update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const service = await updateAdminService(params.data.id, body.data);
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return okResponse({ service }, "Service updated");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/services/:id", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }

    try {
      const service = await disableAdminService(params.data.id);
      if (!service) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      return okResponse({ service }, "Service deactivated");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/services/:id/purge", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }

    try {
      const deleted = await purgeAdminService(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Service not found"));
      }
      recordEntityPurge(request, "Service", params.data.id);
      return okResponse({}, "Service deleted");
    } catch (error) {
      return handleServiceWriteError(app, reply, error);
    }
  });
  // ─── Service FAQs ──────────────────────────────────────────────────────────

  app.get("/api/admin/services/:id/faqs", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    try {
      const faqs = await listServiceFaqs(params.data.id);
      return okResponse({ faqs });
    } catch (error) {
      if (error instanceof ServiceFaqServiceNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.post("/api/admin/services/:id/faqs", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    const body = serviceFaqCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ payload", body.error.flatten()));
    }
    try {
      const faq = await createServiceFaq(params.data.id, body.data);
      return reply.status(201).send({ success: true, data: { faq } });
    } catch (error) {
      if (error instanceof ServiceFaqServiceNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof ServiceFaqMaxLimitError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.patch("/api/admin/services/:id/faqs/:faqId", async (request, reply) => {
    const params = serviceFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    const body = serviceFaqUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ update", body.error.flatten()));
    }
    try {
      const faq = await updateServiceFaq(params.data.faqId, body.data);
      return okResponse({ faq }, "FAQ updated");
    } catch (error) {
      if (error instanceof ServiceFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.delete("/api/admin/services/:id/faqs/:faqId", async (request, reply) => {
    const params = serviceFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    try {
      await deleteServiceFaq(params.data.faqId);
      return okResponse({}, "FAQ deleted");
    } catch (error) {
      if (error instanceof ServiceFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.patch("/api/admin/services/reorder", async (request, reply) => {
    const body = bulkReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      await reorderAdminServices(body.data.items);
      return okResponse({}, "Services reordered");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reorder services"));
    }
  });

  app.patch("/api/admin/specialties/reorder", async (request, reply) => {
    const body = bulkReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      await reorderAdminSpecialties(body.data.items);
      return okResponse({}, "Specialties reordered");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reorder specialties"));
    }
  });

  app.patch("/api/admin/services/:id/faqs/reorder", async (request, reply) => {
    const params = serviceIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid service id", params.error.flatten()));
    }
    const body = serviceFaqReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      const faqs = await reorderServiceFaqs(params.data.id, body.data.orderedIds);
      return okResponse({ faqs }, "FAQs reordered");
    } catch (error) {
      if (error instanceof ServiceFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });
};

export default adminServicesRoute;
