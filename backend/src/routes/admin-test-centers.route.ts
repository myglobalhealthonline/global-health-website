import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { recordEntityPurge } from "../modules/audit/audit.service.js";
import {
  ExamTypeNotFoundError,
  TestCenterCountryNotFoundError,
  TestCenterCurrencyNotFoundError,
  TestCenterNotFoundError,
  createAdminExamType,
  createAdminTestCenter,
  createTestCenterExam,
  deleteTestCenterExam,
  disableAdminExamType,
  disableAdminTestCenter,
  getAdminTestCenterById,
  listAdminExamTypeCategories,
  listAdminExamTypes,
  listAdminTestCenters,
  listTestCenterExams,
  purgeAdminTestCenter,
  updateAdminExamType,
  updateAdminTestCenter,
  updateTestCenterExam,
} from "../modules/test-centers/test-centers.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  adminExamTypeCreateBodySchema,
  adminExamTypesQuerySchema,
  adminExamTypeUpdateBodySchema,
  adminTestCenterCreateBodySchema,
  adminTestCentersQuerySchema,
  adminTestCenterUpdateBodySchema,
  adminTestCenterExamCreateBodySchema,
  adminTestCenterExamsQuerySchema,
  adminTestCenterExamUpdateBodySchema,
  examTypeIdParamsSchema,
  testCenterExamIdParamsSchema,
  testCenterIdParamsSchema,
} from "../validations/admin-test-centers.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (
    error instanceof TestCenterCountryNotFoundError ||
    error instanceof TestCenterCurrencyNotFoundError ||
    error instanceof ExamTypeNotFoundError ||
    error instanceof TestCenterNotFoundError
  ) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply
      .status(409)
      .send(
        errorResponse(
          "Duplicate value for a unique field (slug, GH code, supplier code, or this exam is already on the center)",
        ),
      );
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected test center error"));
}

const adminTestCentersRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  // ─── Exam-type catalogue (global) ────────────────────────────────────────

  app.get("/api/admin/exam-types", async (request, reply) => {
    const query = adminExamTypesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid exam type query", query.error.flatten()));
    }
    try {
      const { items, pagination } = await listAdminExamTypes(query.data);
      return okResponse({ examTypes: items, pagination });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected test center error"));
    }
  });

  // Distinct category labels — feeds the catalogue filter dropdown.
  app.get("/api/admin/exam-types/categories", async (request, reply) => {
    try {
      const categories = await listAdminExamTypeCategories();
      return okResponse({ categories });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected test center error"));
    }
  });

  app.post("/api/admin/exam-types", async (request, reply) => {
    const body = adminExamTypeCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid exam type payload", body.error.flatten()));
    }
    try {
      const examType = await createAdminExamType(body.data);
      return okResponse({ examType }, "Exam type created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/exam-types/:id", async (request, reply) => {
    const params = examTypeIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid exam type id", params.error.flatten()));
    }
    const body = adminExamTypeUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid exam type update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const examType = await updateAdminExamType(params.data.id, body.data);
      if (!examType) {
        return reply.status(404).send(errorResponse("Exam type not found"));
      }
      return okResponse({ examType }, "Exam type updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/exam-types/:id", async (request, reply) => {
    const params = examTypeIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid exam type id", params.error.flatten()));
    }
    try {
      const examType = await disableAdminExamType(params.data.id);
      if (!examType) {
        return reply.status(404).send(errorResponse("Exam type not found"));
      }
      return okResponse({ examType }, "Exam type deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  // ─── Test centers (country-scoped) ───────────────────────────────────────

  app.get("/api/admin/test-centers", async (request, reply) => {
    const query = adminTestCentersQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid test center query", query.error.flatten()));
    }
    try {
      const testCenters = await listAdminTestCenters(query.data);
      return okResponse({ testCenters });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected test center error"));
    }
  });

  app.get("/api/admin/test-centers/:id", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    try {
      const testCenter = await getAdminTestCenterById(params.data.id);
      if (!testCenter) {
        return reply.status(404).send(errorResponse("Test center not found"));
      }
      return okResponse({ testCenter });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected test center error"));
    }
  });

  app.post("/api/admin/test-centers", async (request, reply) => {
    const body = adminTestCenterCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid test center payload", body.error.flatten()));
    }
    try {
      const testCenter = await createAdminTestCenter(body.data);
      return okResponse({ testCenter }, "Test center created");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/test-centers/:id", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    const body = adminTestCenterUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid test center update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const testCenter = await updateAdminTestCenter(params.data.id, body.data);
      if (!testCenter) {
        return reply.status(404).send(errorResponse("Test center not found"));
      }
      return okResponse({ testCenter }, "Test center updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/test-centers/:id", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    try {
      const testCenter = await disableAdminTestCenter(params.data.id);
      if (!testCenter) {
        return reply.status(404).send(errorResponse("Test center not found"));
      }
      return okResponse({ testCenter }, "Test center deactivated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/test-centers/:id/purge", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    try {
      const deleted = await purgeAdminTestCenter(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Test center not found"));
      }
      recordEntityPurge(request, "TestCenter", params.data.id);
      return okResponse({}, "Test center deleted");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  // ─── Exam offerings on a center ──────────────────────────────────────────

  app.get("/api/admin/test-centers/:id/exams", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    const query = adminTestCenterExamsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid exam offering query", query.error.flatten()));
    }
    try {
      const { items, pagination } = await listTestCenterExams(params.data.id, query.data);
      return okResponse({ exams: items, pagination });
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.post("/api/admin/test-centers/:id/exams", async (request, reply) => {
    const params = testCenterIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid test center id", params.error.flatten()));
    }
    const body = adminTestCenterExamCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid exam offering payload", body.error.flatten()));
    }
    try {
      const exam = await createTestCenterExam(params.data.id, body.data);
      return okResponse({ exam }, "Exam added to center");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/test-centers/:id/exams/:offeringId", async (request, reply) => {
    const params = testCenterExamIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    const body = adminTestCenterExamUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid exam offering update", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }
    try {
      const exam = await updateTestCenterExam(params.data.offeringId, body.data);
      if (!exam) {
        return reply.status(404).send(errorResponse("Exam offering not found"));
      }
      return okResponse({ exam }, "Exam offering updated");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/test-centers/:id/exams/:offeringId", async (request, reply) => {
    const params = testCenterExamIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid params", params.error.flatten()));
    }
    try {
      const deleted = await deleteTestCenterExam(params.data.offeringId);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Exam offering not found"));
      }
      return okResponse({}, "Exam removed from center");
    } catch (error) {
      return handleWriteError(app, reply, error);
    }
  });
};

export default adminTestCentersRoute;
