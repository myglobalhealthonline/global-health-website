import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createAdHocSlots,
  listAdminSlotsInRange,
  removeSlotForDate,
  resizeSlot,
  runBulkSlotAction,
} from "../modules/test-center-availability/test-center-availability.service.js";
import { BASE_SLOT_MINUTES } from "../modules/scheduling/slot-grid.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import type { AdminAccessResult } from "../utils/admin-access-evaluator.js";
import {
  verifyAdminCountryScope,
  type AdminAuthenticatedAccess,
  type AdminCountryScopeInput,
  type AdminCountryScopeResult,
} from "../utils/admin-country-scope.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Concrete slot management for one test center — the write side of the admin
 * week grid (add ad-hoc slots, block/unblock, resize, remove, bulk).
 *
 * Country-scoped, matching `admin-doctor-time-slots.route.ts`: a center belongs
 * to exactly one country, so a LOCAL_ADMIN must not be able to edit another
 * market's inventory. The scope check resolves the center's own `countryId`
 * rather than trusting anything in the request.
 */

const centerParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
});

const slotParamsSchema = z.object({
  id: z.string().trim().min(1).max(64),
  slotId: z.string().trim().min(1).max(64),
});

const rangeQuerySchema = z.object({
  fromUtc: z.string().datetime(),
  toUtc: z.string().datetime(),
});

/**
 * One-off slots. `startAts` are UTC instants — the admin UI expands the date
 * range + daily time range it collected using the zone it is displaying, so
 * this route never has to guess a timezone. The 2000 cap is a request-size
 * bound (a month of 15-min slots over a 12h day is ~1440).
 */
const createBodySchema = z
  .object({
    startAts: z.array(z.string().datetime()).min(1).max(2000),
    durationMinutes: z.number().int().min(5).max(480),
  })
  .strict();

/**
 * Either flips the status, resizes the slot on the base grid, or both. At least
 * one of the two has to be present — an empty PATCH is a client bug, not a
 * no-op worth pretending succeeded.
 */
const patchBodySchema = z
  .object({
    status: z.enum(["OPEN", "BLOCKED"]).optional(),
    reason: z.string().trim().max(200).optional(),
    durationMinutes: z
      .number()
      .int()
      .min(BASE_SLOT_MINUTES)
      .max(480)
      .refine((v) => v % BASE_SLOT_MINUTES === 0, {
        message: `Must be a multiple of ${BASE_SLOT_MINUTES} minutes`,
      })
      .optional(),
  })
  .strict()
  .refine((d) => d.status !== undefined || d.durationMinutes !== undefined, {
    message: "Provide a status, a durationMinutes, or both",
  });

const deleteBodySchema = z
  .object({ reason: z.string().trim().max(200).optional() })
  .strict();

const bulkBodySchema = z
  .object({
    action: z.enum(["BLOCK", "UNBLOCK", "REMOVE"]),
    spans: z
      .array(z.object({ fromUtc: z.string().datetime(), toUtc: z.string().datetime() }))
      .max(500)
      .optional(),
    slotIds: z.array(z.string().trim().min(1).max(64)).max(2000).optional(),
    reason: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.spans?.length) || Boolean(d.slotIds?.length), {
    message: "Provide spans or slotIds",
  });

type Dependencies = {
  verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult>;
  verifyCountryScope(input: AdminCountryScopeInput): Promise<AdminCountryScopeResult>;
};

const defaultDependencies: Dependencies = {
  verifyAdminAccess,
  verifyCountryScope: verifyAdminCountryScope,
};

export function createAdminTestCenterTimeSlotsRoute(
  overrides: Partial<Dependencies> = {},
): FastifyPluginAsync {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async (app) => {
    const authenticatedRequests = new WeakMap<
      FastifyRequest,
      AdminAuthenticatedAccess
    >();

    app.addHook("onRequest", async (request, reply) => {
      const auth = await dependencies.verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      authenticatedRequests.set(request, auth);
    });

    /**
     * Resolve the center and authorize the caller against ITS country. Returns
     * a discriminated result so each handler can bail with the right status
     * without duplicating the lookup.
     */
    async function authorizeCenter(
      request: FastifyRequest,
      testCenterId: string,
      operation: string,
    ): Promise<
      | { ok: true }
      | { ok: false; status: number; message: string }
    > {
      const authenticatedAccess = authenticatedRequests.get(request);
      if (!authenticatedAccess) {
        return {
          ok: false,
          status: 503,
          message: "Admin authorization is temporarily unavailable",
        };
      }
      const center = await prisma.testCenter.findUnique({
        where: { id: testCenterId },
        select: { id: true, countryId: true },
      });
      if (!center) {
        return { ok: false, status: 404, message: "Test center not found" };
      }
      const scope = await dependencies.verifyCountryScope({
        request,
        authenticatedAccess,
        countryId: center.countryId,
        operation,
        resourceType: "TestCenterTimeSlot",
      });
      if (!scope.allowed) {
        return { ok: false, status: scope.status, message: scope.message };
      }
      return { ok: true };
    }

    function fail(
      reply: { status: (c: number) => { send: (b: unknown) => unknown } },
      denial: { status: number; message: string },
    ) {
      return reply.status(denial.status).send(errorResponse(denial.message));
    }

    /** Every slot in a range, whatever its status — the grid's read. */
    app.get<{ Params: { id: string } }>(
      "/api/admin/test-centers/:id/time-slots",
      async (request, reply) => {
        const params = centerParamsSchema.safeParse(request.params);
        if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
        const query = rangeQuerySchema.safeParse(request.query);
        if (!query.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid range", query.error.flatten()));
        }
        try {
          const auth = await authorizeCenter(request, params.data.id, "list_slots");
          if (!auth.ok) return fail(reply, auth);

          const slots = await listAdminSlotsInRange(
            params.data.id,
            new Date(query.data.fromUtc),
            new Date(query.data.toUtc),
          );
          return okResponse({ slots });
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not load slots"));
        }
      },
    );

    /**
     * Add one-off slots for specific instants, with no reference to the
     * recurring windows. Instants that clash with an existing slot (or sit in
     * the past) are skipped and reported, not fatal — a date range routinely
     * covers times the center is already booked for.
     */
    app.post<{ Params: { id: string } }>(
      "/api/admin/test-centers/:id/time-slots",
      async (request, reply) => {
        const params = centerParamsSchema.safeParse(request.params);
        if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
        const body = createBodySchema.safeParse(request.body);
        if (!body.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid body", body.error.flatten()));
        }
        const startAts = body.data.startAts.map((iso) => new Date(iso));
        if (startAts.some((d) => Number.isNaN(d.getTime()))) {
          return reply.status(400).send(errorResponse("Invalid start time"));
        }
        try {
          const auth = await authorizeCenter(request, params.data.id, "add_slot");
          if (!auth.ok) return fail(reply, auth);

          const result = await createAdHocSlots(
            params.data.id,
            startAts,
            body.data.durationMinutes,
          );
          // Nothing landed and nothing was in the past → every instant clashed.
          // That is the one case worth an error: the admin's whole range was a
          // no-op and a success toast would be a lie.
          if (result.created === 0 && result.skippedOverlap > 0) {
            return reply
              .status(409)
              .send(
                errorResponse(
                  result.skippedOverlap === 1
                    ? "This center already has a slot overlapping that time"
                    : "Every time in that range already has a slot",
                ),
              );
          }
          if (result.created === 0) {
            return reply.status(400).send(errorResponse("Pick a time in the future"));
          }
          return okResponse(result);
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not add slots"));
        }
      },
    );

    /**
     * Bulk block / unblock / remove. Slots that are BOOKED or HELD are skipped
     * and counted, never mutated.
     */
    app.post<{ Params: { id: string } }>(
      "/api/admin/test-centers/:id/time-slots/bulk",
      async (request, reply) => {
        const params = centerParamsSchema.safeParse(request.params);
        if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
        const body = bulkBodySchema.safeParse(request.body);
        if (!body.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid request", body.error.flatten()));
        }
        try {
          const auth = await authorizeCenter(request, params.data.id, "bulk_slots");
          if (!auth.ok) return fail(reply, auth);

          const result = await runBulkSlotAction(params.data.id, body.data);
          return okResponse(result);
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not update slots"));
        }
      },
    );

    /** Flip status, resize on the base grid, or both. */
    app.patch<{ Params: { id: string; slotId: string } }>(
      "/api/admin/test-centers/:id/time-slots/:slotId",
      async (request, reply) => {
        const params = slotParamsSchema.safeParse(request.params);
        if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
        const body = patchBodySchema.safeParse(request.body);
        if (!body.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid body", body.error.flatten()));
        }
        try {
          const auth = await authorizeCenter(request, params.data.id, "update_slot");
          if (!auth.ok) return fail(reply, auth);

          if (body.data.durationMinutes !== undefined) {
            const resized = await resizeSlot(
              params.data.id,
              params.data.slotId,
              body.data.durationMinutes,
            );
            if (!resized.ok) {
              if (resized.code === "NOT_FOUND") {
                return reply.status(404).send(errorResponse("Slot not found"));
              }
              return reply
                .status(409)
                .send(
                  errorResponse(
                    resized.code === "OCCUPIED"
                      ? "That slot is booked and cannot be resized"
                      : "A booking overlaps the new length",
                  ),
                );
            }
          }

          if (body.data.status !== undefined) {
            const result = await runBulkSlotAction(params.data.id, {
              action: body.data.status === "BLOCKED" ? "BLOCK" : "UNBLOCK",
              slotIds: [params.data.slotId],
              reason: body.data.reason,
            });
            if (result.skippedMissing > 0) {
              return reply.status(404).send(errorResponse("Slot not found"));
            }
            if (result.changed === 0 && result.skippedOccupied > 0) {
              return reply
                .status(409)
                .send(errorResponse("That slot is booked and cannot be changed"));
            }
          }

          return okResponse({ updated: true });
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not update slot"));
        }
      },
    );

    /** Remove one slot for one date, leaving a tombstone. */
    app.delete<{ Params: { id: string; slotId: string } }>(
      "/api/admin/test-centers/:id/time-slots/:slotId",
      async (request, reply) => {
        const params = slotParamsSchema.safeParse(request.params);
        if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
        const body = deleteBodySchema.safeParse(request.body ?? {});
        if (!body.success) {
          return reply
            .status(400)
            .send(errorResponse("Invalid body", body.error.flatten()));
        }
        try {
          const auth = await authorizeCenter(request, params.data.id, "remove_slot");
          if (!auth.ok) return fail(reply, auth);

          const result = await removeSlotForDate(
            params.data.id,
            params.data.slotId,
            body.data.reason,
          );
          if (!result.ok) {
            if (result.code === "NOT_FOUND") {
              return reply.status(404).send(errorResponse("Slot not found"));
            }
            return reply
              .status(409)
              .send(errorResponse("That slot is booked and cannot be removed"));
          }
          return okResponse({ removed: true });
        } catch (error) {
          if (error instanceof DatabaseUnavailableError) {
            return reply.status(503).send(errorResponse(error.message));
          }
          app.log.error(error);
          return reply.status(500).send(errorResponse("Could not remove slot"));
        }
      },
    );
  };
}

export default createAdminTestCenterTimeSlotsRoute();
