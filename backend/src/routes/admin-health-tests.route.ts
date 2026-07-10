import type { FastifyPluginAsync } from "fastify";
import { recordEntityPurge } from "../modules/audit/audit.service.js";
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
  reorderAdminHealthTests,
  updateAdminHealthTest,
} from "../modules/health-tests/health-tests.service.js";
import {
  createHealthTestFaq,
  deleteHealthTestFaq,
  HealthTestFaqHealthTestNotFoundError,
  HealthTestFaqMaxLimitError,
  HealthTestFaqNotFoundError,
  listHealthTestFaqs,
  reorderHealthTestFaqs,
  updateHealthTestFaq,
} from "../modules/health-tests/health-test-faq.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminHealthTestCreateBodySchema,
  adminHealthTestsQuerySchema,
  adminHealthTestUpdateBodySchema,
  healthTestFaqCreateBodySchema,
  healthTestFaqIdParamsSchema,
  healthTestFaqReorderBodySchema,
  healthTestFaqUpdateBodySchema,
  healthTestIdParamsSchema,
} from "../validations/admin-health-tests.schema.js";
import { bulkReorderBodySchema } from "../validations/admin-services.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { LocaleNotSupportedError } from "../modules/shared/locale-support.js";

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

  app.patch("/api/admin/health-tests/reorder", async (request, reply) => {
    const body = bulkReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      await reorderAdminHealthTests(body.data.items);
      return okResponse({}, "Health tests reordered");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reorder health tests"));
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
      recordEntityPurge(request, "HealthTest", params.data.id);
      return okResponse({}, "Health test deleted");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  // ─── Health Test FAQs ─────────────────────────────────────────────────────

  app.get("/api/admin/health-tests/:id/faqs", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    try {
      const faqs = await listHealthTestFaqs(params.data.id);
      return okResponse({ faqs });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.post("/api/admin/health-tests/:id/faqs", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    const body = healthTestFaqCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ payload", body.error.flatten()));
    }
    try {
      const faq = await createHealthTestFaq(params.data.id, body.data);
      return reply.status(201).send({ success: true, data: { faq } });
    } catch (error) {
      if (error instanceof HealthTestFaqHealthTestNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof HealthTestFaqMaxLimitError) {
        return reply.status(422).send(errorResponse(error.message));
      }
      if (error instanceof LocaleNotSupportedError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.patch("/api/admin/health-tests/:id/faqs/reorder", async (request, reply) => {
    const params = healthTestIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid health test id", params.error.flatten()));
    }
    const body = healthTestFaqReorderBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid reorder payload", body.error.flatten()));
    }
    try {
      const faqs = await reorderHealthTestFaqs(params.data.id, body.data.orderedIds);
      return okResponse({ faqs }, "FAQs reordered");
    } catch (error) {
      if (error instanceof HealthTestFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      if (error instanceof LocaleNotSupportedError) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.patch("/api/admin/health-tests/:id/faqs/:faqId", async (request, reply) => {
    const params = healthTestFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    const body = healthTestFaqUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ update", body.error.flatten()));
    }
    try {
      const faq = await updateHealthTestFaq(params.data.faqId, body.data);
      return okResponse({ faq }, "FAQ updated");
    } catch (error) {
      if (error instanceof HealthTestFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });

  app.delete("/api/admin/health-tests/:id/faqs/:faqId", async (request, reply) => {
    const params = healthTestFaqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    try {
      await deleteHealthTestFaq(params.data.faqId);
      return okResponse({}, "FAQ deleted");
    } catch (error) {
      if (error instanceof HealthTestFaqNotFoundError) {
        return reply.status(404).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected FAQ error"));
    }
  });
};

export default adminHealthTestsRoute;
