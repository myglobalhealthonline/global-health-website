import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Read-only exam catalogue for the doctor's exams-prescription picker.
 *
 *   GET /api/doctor/exam-types?q=glucose
 *
 * Deliberately narrow: name, code and category only. It exists so a prescribed
 * exam can carry a catalogue id — which is what lets the admin lab queue price
 * it against a collection centre and match a result back to it — without
 * exposing the admin catalogue endpoints (which carry supplier costs and
 * markups) to doctor sessions.
 *
 * The catalogue holds thousands of rows, so results are always capped and a
 * blank query returns the first page rather than everything.
 */

const querySchema = z.object({
  q: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().trim().min(1).max(120).optional(),
  ),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((n) => Math.min(n, 50)),
});

const doctorExamCatalogueRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/exam-types", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const query = querySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid catalogue query", query.error.flatten()));
    }

    try {
      const term = query.data.q;
      const rows = await prisma.examType.findMany({
        where: {
          isActive: true,
          ...(term
            ? {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { code: { contains: term, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, code: true, name: true, category: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: query.data.limit,
      });
      return okResponse({ examTypes: rows });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load the exam catalogue"));
    }
  });
};

export default doctorExamCatalogueRoute;
