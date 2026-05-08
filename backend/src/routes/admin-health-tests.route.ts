import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminHealthTest,
  disableAdminHealthTest,
  getAdminHealthTestById,
  HealthTestCountryChangeNotAllowedError,
  HealthTestCountryNotFoundError,
  HealthTestCurrencyNotFoundError,
  listAdminHealthTests,
  purgeAdminHealthTest,
  updateAdminHealthTest,
} from "../modules/health-tests/health-tests.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminHealthTestCreateBodySchema,
  adminHealthTestsQuerySchema,
  adminHealthTestUpdateBodySchema,
  healthTestIdParamsSchema,
} from "../validations/admin-health-tests.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (
    error instanceof HealthTestCountryNotFoundError ||
    error instanceof HealthTestCurrencyNotFoundError ||
    error instanceof HealthTestCountryChangeNotAllowedError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique health test field (country + slug)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin health test error"));
}

const adminHealthTestsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/health-tests", async (request, reply) => {
    const query = adminHealthTestsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin health test query", query.error.flatten()));
    }
    try {
      const data = await listAdminHealthTests(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin health test error"));
    }
  });

  app.get("/api/admin/health-tests/:id", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    try {
      const test = await getAdminHealthTestById(params.data.id);
      if (!test) {
        return reply.status(404).send(errorResponse("Health test not found"));
      }
      return okResponse({ healthTest: test });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin health test error"));
    }
  });

  app.post("/api/admin/health-tests", async (request, reply) => {
    const body = adminHealthTestCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid health test payload", body.error.flatten()));
    }
    try {
      const healthTest = await createAdminHealthTest(body.data);
      return okResponse({ healthTest }, "Health test created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/health-tests/:id", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    const body = adminHealthTestUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid health test update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const healthTest = await updateAdminHealthTest(params.data.id, body.data);
      if (!healthTest) {
        return reply.status(404).send(errorResponse("Health test not found"));
      }
      return okResponse({ healthTest }, "Health test updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/health-tests/:id", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    try {
      const healthTest = await disableAdminHealthTest(params.data.id);
      if (!healthTest) {
        return reply.status(404).send(errorResponse("Health test not found"));
      }
      return okResponse({ healthTest }, "Health test deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/health-tests/:id/purge", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    try {
      const deleted = await purgeAdminHealthTest(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Health test not found"));
      }
      return okResponse({}, "Health test deleted");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });
};

export default adminHealthTestsRoute;
