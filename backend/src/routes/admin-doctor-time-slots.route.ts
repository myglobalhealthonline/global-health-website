import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import type { AdminAccessResult } from "../utils/admin-access-evaluator.js";
import {
  verifyAdminCountryScope,
  type AdminAuthenticatedAccess,
  type AdminCountryScopeInput,
  type AdminCountryScopeResult,
} from "../utils/admin-country-scope.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  BASE_SLOT_MINUTES,
  createAdHocSlots,
  removeSlotForDate,
  resizeSlot,
} from "../modules/doctor-availability/doctor-availability.service.js";

/**
 * Admin block/unblock of a single doctor time slot — the admin-side twin of
 * the doctor's own PATCH /api/doctor/time-slots/:slotId. The doctor route
 * authorizes by `doctorId` off the session; an admin has no such anchor, so
 * this one resolves the slot's owning doctor and runs the country-scope guard
 * against that doctor's country. A country-scoped admin therefore cannot
 * touch another country's inventory.
 */

const paramsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  slotId: z.string().trim().min(1).max(64),
});

/**
 * Either flips the status, resizes the slot on the base grid, or both. At least
 * one of the two has to be present — an empty PATCH is a client bug, not a
 * no-op worth pretending succeeded.
 */
const bodySchema = z
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

/** DELETE carries an optional note only — the slot is identified by the path. */
const deleteBodySchema = z
  .object({ reason: z.string().trim().max(200).optional() })
  .strict();

/** Doctor-scoped params for the collection route (add a slot). */
const doctorParamsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
});

/**
 * One-off slots. `startAts` are UTC instants — the admin UI expands the date
 * range + daily time range it collected into concrete instants using the zone
 * it's displaying, so this route never has to guess a timezone. The 2000 cap is
 * a request-size bound (a month of 15-min slots over a 12h day is ~1440).
 */
const createBodySchema = z
  .object({
    startAts: z.array(z.string().datetime()).min(1).max(2000),
    durationMinutes: z.number().int().min(5).max(480),
  })
  .strict();

type AdminDoctorTimeSlotsDependencies = {
  verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult>;
  verifyCountryScope(input: AdminCountryScopeInput): Promise<AdminCountryScopeResult>;
};

const defaultDependencies: AdminDoctorTimeSlotsDependencies = {
  verifyAdminAccess,
  verifyCountryScope: verifyAdminCountryScope,
};

export function createAdminDoctorTimeSlotsRoute(
  overrides: Partial<AdminDoctorTimeSlotsDependencies> = {},
): FastifyPluginAsync {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async (app) => {
    const authenticatedRequests = new WeakMap<FastifyRequest, AdminAuthenticatedAccess>();

    app.addHook("onRequest", async (request, reply) => {
      const auth = await dependencies.verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      authenticatedRequests.set(request, auth);
    });

    /**
     * Add one-off slots to a doctor's calendar for specific instants, with no
     * reference to their recurring weekly windows. Rows are flagged ad-hoc so a
     * later window edit can't sweep them away. Instants that clash with an
     * existing slot (or sit in the past) are skipped and reported, not fatal —
     * a date range routinely covers times the doctor is already booked for.
     */
    app.post("/api/admin/doctors/:doctorId/time-slots", async (request, reply) => {
      const params = doctorParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const body = createBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }
      const startAts = body.data.startAts.map((iso) => new Date(iso));
      if (startAts.some((d) => Number.isNaN(d.getTime()))) {
        return reply.status(400).send(errorResponse("Invalid start time"));
      }

      const authenticatedAccess = authenticatedRequests.get(request);
      if (!authenticatedAccess) {
        return reply
          .status(503)
          .send(errorResponse("Admin authorization is temporarily unavailable"));
      }

      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: params.data.doctorId },
          select: { id: true, countryId: true },
        });
        if (!doctor) return reply.status(404).send(errorResponse("Doctor not found"));

        const scope = await dependencies.verifyCountryScope({
          request,
          authenticatedAccess,
          countryId: doctor.countryId,
          operation: "add_slot",
          resourceType: "DoctorTimeSlot",
        });
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        const result = await createAdHocSlots(
          doctor.id,
          startAts,
          body.data.durationMinutes,
        );
        // Nothing landed and nothing was in the past → every instant clashed.
        // That's the one case worth an error: the admin's whole range was a
        // no-op and a success toast would be a lie.
        if (result.created === 0 && result.skippedOverlap > 0) {
          return reply
            .status(409)
            .send(
              errorResponse(
                result.skippedOverlap === 1
                  ? "This doctor already has a slot overlapping that time"
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
    });

    app.patch("/api/admin/doctors/:doctorId/time-slots/:slotId", async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      const authenticatedAccess = authenticatedRequests.get(request);
      if (!authenticatedAccess) {
        return reply
          .status(503)
          .send(errorResponse("Admin authorization is temporarily unavailable"));
      }

      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: params.data.doctorId },
          select: { id: true, countryId: true },
        });
        if (!doctor) return reply.status(404).send(errorResponse("Doctor not found"));

        const scope = await dependencies.verifyCountryScope({
          request,
          authenticatedAccess,
          countryId: doctor.countryId,
          operation:
            body.data.status === "BLOCKED"
              ? "block_slot"
              : body.data.status === "OPEN"
                ? "unblock_slot"
                : "resize_slot",
          resourceType: "DoctorTimeSlot",
          resourceId: params.data.slotId,
        });
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        // Scope the lookup by doctorId too: a slot id from another doctor must
        // 404 rather than be mutated through this doctor's authorized country.
        const slot = await prisma.doctorTimeSlot.findFirst({
          where: { id: params.data.slotId, doctorId: doctor.id },
          select: { id: true, status: true },
        });
        if (!slot) return reply.status(404).send(errorResponse("Slot not found"));

        // BOOKED/HELD slots carry a patient. Blocking one would strand a real
        // appointment, so only free inventory flips.
        if (slot.status !== "OPEN" && slot.status !== "BLOCKED") {
          return reply
            .status(409)
            .send(errorResponse("Only open or blocked slots can be changed"));
        }

        // Resize first: it can fail on a booked neighbour, and a status flip
        // that already landed would leave the admin with half of what they
        // asked for and no way to tell which half.
        if (body.data.durationMinutes !== undefined) {
          const resized = await resizeSlot(
            doctor.id,
            slot.id,
            body.data.durationMinutes,
          );
          if (!resized.ok) {
            return resized.code === "NOT_FOUND"
              ? reply.status(404).send(errorResponse("Slot not found"))
              : reply
                  .status(409)
                  .send(
                    errorResponse(
                      resized.code === "BLOCKED_BY_BOOKING"
                        ? "A booked or held slot sits in the way of that length"
                        : "Only open or blocked slots can be changed",
                    ),
                  );
          }
        }

        if (body.data.status === undefined) {
          const row = await prisma.doctorTimeSlot.findUnique({
            where: { id: slot.id },
            select: { id: true, status: true, blockReason: true, startAt: true, endAt: true },
          });
          return okResponse({ slot: row });
        }

        const updated = await prisma.doctorTimeSlot.update({
          where: { id: slot.id },
          data: {
            status: body.data.status,
            blockReason:
              body.data.status === "BLOCKED" ? body.data.reason?.trim() || "Blocked by admin" : null,
          },
          select: { id: true, status: true, blockReason: true, startAt: true, endAt: true },
        });

        return okResponse({ slot: updated });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update slot"));
      }
    });

    /**
     * Remove one slot for its own date only. Deletes the row AND records a
     * `DoctorAvailabilityException` for the same span, because slots are
     * regenerated from the recurring weekly windows on every availability read
     * — without the exception the slot would simply come back. The weekly
     * window is not touched: the same weekday next week still generates.
     */
    app.delete("/api/admin/doctors/:doctorId/time-slots/:slotId", async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      // A DELETE with no body at all is the common case — treat it as {}.
      const body = deleteBodySchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      const authenticatedAccess = authenticatedRequests.get(request);
      if (!authenticatedAccess) {
        return reply
          .status(503)
          .send(errorResponse("Admin authorization is temporarily unavailable"));
      }

      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: params.data.doctorId },
          select: { id: true, countryId: true },
        });
        if (!doctor) return reply.status(404).send(errorResponse("Doctor not found"));

        const scope = await dependencies.verifyCountryScope({
          request,
          authenticatedAccess,
          countryId: doctor.countryId,
          operation: "remove_slot",
          resourceType: "DoctorTimeSlot",
          resourceId: params.data.slotId,
        });
        if (!scope.allowed) {
          return reply.status(scope.status).send(errorResponse(scope.message));
        }

        const result = await removeSlotForDate(
          doctor.id,
          params.data.slotId,
          body.data.reason,
        );
        if (!result.ok) {
          return result.code === "NOT_FOUND"
            ? reply.status(404).send(errorResponse("Slot not found"))
            : reply
                .status(409)
                .send(
                  errorResponse(
                    "This slot is booked or on hold — cancel the appointment before removing it",
                  ),
                );
        }

        return okResponse({
          removed: {
            id: params.data.slotId,
            startAt: result.startAt.toISOString(),
            endAt: result.endAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not remove slot"));
      }
    });
  };
}

const adminDoctorTimeSlotsRoute = createAdminDoctorTimeSlotsRoute();

export default adminDoctorTimeSlotsRoute;
