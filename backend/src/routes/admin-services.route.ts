import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminService,
  disableAdminService,
  getAdminServiceById,
  listAdminServices,
  listSpecialtiesForAdminCountry,
  ServiceCountryNotFoundError,
  ServiceSpecialtyInvalidError,
  updateAdminService,
} from "../modules/services/services.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminServiceCreateBodySchema,
  adminServicesQuerySchema,
  adminServiceUpdateBodySchema,
  adminSpecialtiesQuerySchema,
  serviceIdParamsSchema,
} from "../validations/admin-services.schema.js";
import { verifyAdminToken } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleServiceWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (error instanceof ServiceCountryNotFoundError || error instanceof ServiceSpecialtyInvalidError) {
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
    const auth = verifyAdminToken(request.headers.authorization);
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
};

export default adminServicesRoute;
