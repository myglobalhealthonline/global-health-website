import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createAdminAvailability,
  deleteAdminAvailability,
  listAdminAvailability,
  patchAdminAvailability,
  resolveTestCenterTimeZone,
} from "../modules/test-center-availability/test-center-availability.service.js";
import {
  adminTestCenterAvailabilityCreateBodySchema,
  adminTestCenterAvailabilityUpdateBodySchema,
  testCenterAvailabilityParamsSchema,
  testCenterIdParamsSchema,
} from "../validations/admin-test-center-availability.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin CRUD for a test center's recurring weekly opening hours.
 *
 * Deliberately shaped like `/api/admin/doctors/:id/availability` — same payload,
 * same response row — so the shared admin week-grid UI drives either owner by
 * swapping the base path.
 *
 * Auth is the plugin-level `onRequest` hook rather than a per-route call: it
 * cannot be forgotten on a route added later, which is what the Semgrep
 * authorization rules and `authz-matrix.test.ts` check for.
 */
const adminTestCenterAvailabilityRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  async function testCenterExists(id: string): Promise<boolean> {
    const row = await prisma.testCenter.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  function handleError(reply: unknown, error: unknown, message: string) {
    const r = reply as {
      status: (c: number) => { send: (b: unknown) => unknown };
    };
    if (error instanceof DatabaseUnavailableError) {
      return r.status(503).send(errorResponse(error.message));
    }
    app.log.error(error);
    return r.status(500).send(errorResponse(message));
  }

  /**
   * List a center's windows, plus the timezone those wall-clock minutes are
   * expressed in — the grid cannot render "09:00" correctly without it.
   */
  app.get<{ Params: { id: string } }>(
    "/api/admin/test-centers/:id/availability",
    async (request, reply) => {
      const params = testCenterIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid test center id"));
      }
      try {
        if (!(await testCenterExists(params.data.id))) {
          return reply.status(404).send(errorResponse("Test center not found"));
        }
        const [availability, timeZone] = await Promise.all([
          listAdminAvailability(params.data.id),
          resolveTestCenterTimeZone(params.data.id),
        ]);
        return okResponse({ availability, timeZone });
      } catch (error) {
        return handleError(reply, error, "Could not load availability");
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/admin/test-centers/:id/availability",
    async (request, reply) => {
      const params = testCenterIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid test center id"));
      }
      const parsed = adminTestCenterAvailabilityCreateBodySchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }
      try {
        if (!(await testCenterExists(params.data.id))) {
          return reply.status(404).send(errorResponse("Test center not found"));
        }
        const row = await createAdminAvailability(params.data.id, {
          weekday: parsed.data.weekday,
          startMinute: parsed.data.startMinute,
          endMinute: parsed.data.endMinute,
          slotDurationMinutes: parsed.data.slotDurationMinutes,
          effectiveFrom: parsed.data.effectiveFrom
            ? new Date(parsed.data.effectiveFrom)
            : null,
          effectiveUntil: parsed.data.effectiveUntil
            ? new Date(parsed.data.effectiveUntil)
            : null,
        });
        return reply.status(201).send(okResponse({ availability: row }));
      } catch (error) {
        return handleError(reply, error, "Could not create availability");
      }
    },
  );

  app.patch<{ Params: { id: string; availabilityId: string } }>(
    "/api/admin/test-centers/:id/availability/:availabilityId",
    async (request, reply) => {
      const params = testCenterAvailabilityParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid availability id"));
      }
      const parsed = adminTestCenterAvailabilityUpdateBodySchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }
      try {
        const row = await patchAdminAvailability(
          params.data.id,
          params.data.availabilityId,
          {
            ...(parsed.data.weekday !== undefined && {
              weekday: parsed.data.weekday,
            }),
            ...(parsed.data.startMinute !== undefined && {
              startMinute: parsed.data.startMinute,
            }),
            ...(parsed.data.endMinute !== undefined && {
              endMinute: parsed.data.endMinute,
            }),
            ...(parsed.data.slotDurationMinutes !== undefined && {
              slotDurationMinutes: parsed.data.slotDurationMinutes,
            }),
            ...(parsed.data.effectiveFrom !== undefined && {
              effectiveFrom: parsed.data.effectiveFrom
                ? new Date(parsed.data.effectiveFrom)
                : null,
            }),
            ...(parsed.data.effectiveUntil !== undefined && {
              effectiveUntil: parsed.data.effectiveUntil
                ? new Date(parsed.data.effectiveUntil)
                : null,
            }),
            ...(parsed.data.isActive !== undefined && {
              isActive: parsed.data.isActive,
            }),
          },
        );
        // Null means "no such window on THIS center" — scoping the lookup by
        // center id is what stops one center patching another's hours.
        if (!row) {
          return reply.status(404).send(errorResponse("Availability not found"));
        }
        return okResponse({ availability: row });
      } catch (error) {
        return handleError(reply, error, "Could not update availability");
      }
    },
  );

  app.delete<{ Params: { id: string; availabilityId: string } }>(
    "/api/admin/test-centers/:id/availability/:availabilityId",
    async (request, reply) => {
      const params = testCenterAvailabilityParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid availability id"));
      }
      try {
        const removed = await deleteAdminAvailability(
          params.data.id,
          params.data.availabilityId,
        );
        if (!removed) {
          return reply.status(404).send(errorResponse("Availability not found"));
        }
        return okResponse({ deleted: true });
      } catch (error) {
        return handleError(reply, error, "Could not delete availability");
      }
    },
  );
};

export default adminTestCenterAvailabilityRoute;
