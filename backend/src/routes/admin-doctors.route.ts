import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminDoctor,
  disableAdminDoctor,
  DoctorCountryNotFoundError,
  DoctorSpecialtyInvalidError,
  getAdminDoctorById,
  listAdminDoctors,
  updateAdminDoctor,
} from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminDoctorCreateBodySchema,
  adminDoctorUpdateBodySchema,
  adminDoctorsQuerySchema,
  doctorIdParamsSchema,
} from "../validations/admin-doctors.schema.js";
import { verifyAdminToken } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleDoctorWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (error instanceof DoctorCountryNotFoundError || error instanceof DoctorSpecialtyInvalidError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique doctor field (country + slug)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin doctors error"));
}

const adminDoctorsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = verifyAdminToken(request.headers.authorization);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/doctors", async (request, reply) => {
    const query = adminDoctorsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin doctors query", query.error.flatten()));
    }

    try {
      const data = await listAdminDoctors(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin doctors error"));
    }
  });

  app.get("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const doctor = await getAdminDoctorById(params.data.id);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      return okResponse({ doctor });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin doctor error"));
    }
  });

  app.post("/api/admin/doctors", async (request, reply) => {
    const body = adminDoctorCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid doctor payload", body.error.flatten()));
    }

    try {
      const doctor = await createAdminDoctor(body.data);
      return okResponse({ doctor }, "Doctor profile created");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    const body = adminDoctorUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid doctor update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const doctor = await updateAdminDoctor(params.data.id, body.data);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      return okResponse({ doctor }, "Doctor profile updated");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const doctor = await disableAdminDoctor(params.data.id);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      return okResponse({ doctor }, "Doctor profile deactivated");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });
};

export default adminDoctorsRoute;
