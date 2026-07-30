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
  createAdHocSlot,
  removeSlotForDate,
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

const bodySchema = z
  .object({
    status: z.enum(["OPEN", "BLOCKED"]),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

/** DELETE carries an optional note only — the slot is identified by the path. */
const deleteBodySchema = z
  .object({ reason: z.string().trim().max(200).optional() })
  .strict();

/** Doctor-scoped params for the collection route (add a slot). */
const doctorParamsSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
});

/**
 * One-off slot. `startAt` is a UTC instant — the admin UI converts the clinic
 * (or whatever zone it's displaying) wall-clock the admin typed, so this route
 * never has to guess a timezone. 8h ceiling on the duration is a sanity bound,
 * not a product rule.
 */
const createBodySchema = z
  .object({
    startAt: z.string().datetime(),
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
     * Add a one-off slot to a doctor's calendar for a single date/time, with no
     * reference to their recurring weekly windows. The row is flagged ad-hoc so
     * a later window edit can't sweep it away.
     */
    app.post("/api/admin/doctors/:doctorId/time-slots", async (request, reply) => {
      const params = doctorParamsSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      const body = createBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }
      const startAt = new Date(body.data.startAt);
      if (Number.isNaN(startAt.getTime())) {
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

        const result = await createAdHocSlot(
          doctor.id,
          startAt,
          body.data.durationMinutes,
        );
        if (!result.ok) {
          return result.code === "PAST"
            ? reply.status(400).send(errorResponse("Pick a time in the future"))
            : reply
                .status(409)
                .send(
                  errorResponse(
                    "This doctor already has a slot overlapping that time",
                  ),
                );
        }

        return okResponse({
          slot: {
            id: result.slot.id,
            startAt: result.slot.startAt.toISOString(),
            endAt: result.slot.endAt.toISOString(),
            status: "OPEN",
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not add slot"));
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
          operation: body.data.status === "BLOCKED" ? "block_slot" : "unblock_slot",
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

        const updated = await prisma.doctorTimeSlot.update({
          where: { id: slot.id },
          data: {
            status: body.data.status,
            blockReason:
              body.data.status === "BLOCKED" ? body.data.reason?.trim() || "Blocked by admin" : null,
          },
          select: { id: true, status: true, blockReason: true },
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
