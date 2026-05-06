import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminPricingPlan,
  disableAdminPricingPlan,
  getAdminPricingPlanById,
  listAdminPricingPlans,
  PricingCountryChangeNotAllowedError,
  PricingCountryNotFoundError,
  PricingCurrencyNotFoundError,
  updateAdminPricingPlan,
} from "../modules/pricing/pricing.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminPricingCreateBodySchema,
  adminPricingQuerySchema,
  adminPricingUpdateBodySchema,
  pricingPlanIdParamsSchema,
} from "../validations/admin-pricing.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handlePricingWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (
    error instanceof PricingCountryNotFoundError ||
    error instanceof PricingCurrencyNotFoundError ||
    error instanceof PricingCountryChangeNotAllowedError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique pricing field (country + slug)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin pricing error"));
}

const adminPricingRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/pricing", async (request, reply) => {
    const query = adminPricingQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin pricing query", query.error.flatten()));
    }

    try {
      const data = await listAdminPricingPlans(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin pricing error"));
    }
  });

  app.get("/api/admin/pricing/:id", async (request, reply) => {
    const params = pricingPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid pricing plan id", params.error.flatten()));
    }

    try {
      const plan = await getAdminPricingPlanById(params.data.id);
      if (!plan) {
        return reply.status(404).send(errorResponse("Pricing plan not found"));
      }
      return okResponse({ plan });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin pricing error"));
    }
  });

  app.post("/api/admin/pricing", async (request, reply) => {
    const body = adminPricingCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid pricing payload", body.error.flatten()));
    }

    try {
      const plan = await createAdminPricingPlan(body.data);
      return okResponse({ plan }, "Pricing plan created");
    } catch (error) {
      return handlePricingWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/pricing/:id", async (request, reply) => {
    const params = pricingPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid pricing plan id", params.error.flatten()));
    }

    const body = adminPricingUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid pricing update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const plan = await updateAdminPricingPlan(params.data.id, body.data);
      if (!plan) {
        return reply.status(404).send(errorResponse("Pricing plan not found"));
      }
      return okResponse({ plan }, "Pricing plan updated");
    } catch (error) {
      return handlePricingWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/pricing/:id", async (request, reply) => {
    const params = pricingPlanIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid pricing plan id", params.error.flatten()));
    }

    try {
      const plan = await disableAdminPricingPlan(params.data.id);
      if (!plan) {
        return reply.status(404).send(errorResponse("Pricing plan not found"));
      }
      return okResponse({ plan }, "Pricing plan deactivated");
    } catch (error) {
      return handlePricingWriteError(app, reply, error);
    }
  });
};

export default adminPricingRoute;
