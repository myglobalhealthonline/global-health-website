import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createAdminFaq,
  disableAdminFaq,
  FaqCountryNotFoundError,
  getAdminFaqById,
  listAdminFaqs,
  purgeAdminFaq,
  updateAdminFaq,
} from "../modules/faqs/faqs.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminFaqCreateBodySchema,
  adminFaqsQuerySchema,
  adminFaqUpdateBodySchema,
  faqIdParamsSchema,
} from "../validations/admin-faqs.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof FaqCountryNotFoundError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for unique FAQ fields"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin FAQs error"));
}

const adminFaqsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/faqs", async (request, reply) => {
    const query = adminFaqsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ query", query.error.flatten()));
    }
    try {
      const data = await listAdminFaqs(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin FAQs error"));
    }
  });

  app.get("/api/admin/faqs/:id", async (request, reply) => {
    const params = faqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ id", params.error.flatten()));
    }
    try {
      const faq = await getAdminFaqById(params.data.id);
      if (!faq) {
        return reply.status(404).send(errorResponse("FAQ not found"));
      }
      return okResponse({ faq });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin FAQ error"));
    }
  });

  app.post("/api/admin/faqs", async (request, reply) => {
    const body = adminFaqCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ payload", body.error.flatten()));
    }
    try {
      const faq = await createAdminFaq(body.data);
      return okResponse({ faq }, "FAQ created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/faqs/:id", async (request, reply) => {
    const params = faqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ id", params.error.flatten()));
    }
    const body = adminFaqUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const faq = await updateAdminFaq(params.data.id, body.data);
      if (!faq) {
        return reply.status(404).send(errorResponse("FAQ not found"));
      }
      return okResponse({ faq }, "FAQ updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/faqs/:id", async (request, reply) => {
    const params = faqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ id", params.error.flatten()));
    }
    try {
      const faq = await disableAdminFaq(params.data.id);
      if (!faq) {
        return reply.status(404).send(errorResponse("FAQ not found"));
      }
      return okResponse({ faq }, "FAQ deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/faqs/:id/purge", async (request, reply) => {
    const params = faqIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid FAQ id", params.error.flatten()));
    }
    try {
      const deleted = await purgeAdminFaq(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("FAQ not found"));
      }
      return okResponse({}, "FAQ deleted");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });
};

export default adminFaqsRoute;
