import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  BASE_SLOT_MINUTES,
  bulkSetSlotBlockInRange,
  createAdHocSlots,
  createAdminAvailability,
  deleteAdminAvailability,
  ensureSlotsForRange,
  listAdminAvailability,
  patchAdminAvailability,
  removeSlotForDate,
  resizeSlot,
  resolveDoctorTimeZone,
  resolveDoctorTimeZones,
} from "../modules/doctor-availability/doctor-availability.service.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";

/**
 * Doctor self-service availability.
 *
 * Mirrors the admin endpoints but scopes to the caller's own `doctorId`
 * (resolved from the linked User row). Endpoints:
 *
 *   GET    /api/doctor/availability                 — recurring windows + concrete slots (next N days)
 *   POST   /api/doctor/availability                 — add a weekly window
 *   PATCH  /api/doctor/availability/:availabilityId — edit a window (hours, grid, dates, pause)
 *   DELETE /api/doctor/availability/:availabilityId — remove a window (+ orphan OPEN slots)
 *   PATCH  /api/doctor/time-slots/:slotId           — toggle OPEN ↔ BLOCKED and/or resize on the base grid
 *   DELETE /api/doctor/time-slots/:slotId           — remove a slot for that date only (+ exception)
 *   POST   /api/doctor/time-slots                   — add one-off slots at explicit instants
 *
 * BOOKED slots are never toggleable from here — those belong to real
 * appointments. Admin can release a BOOKED slot via the appointment
 * detail page (existing flow).
 */

const MAX_RANGE_MS = 120 * 24 * 60 * 60 * 1000;

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14),
  // Optional explicit UTC window for the calendar (a visible month ± padding).
  // When both are present they win over `days`.
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const bulkBlockBodySchema = z
  .object({
    fromUtc: z.string().datetime(),
    toUtc: z.string().datetime(),
    action: z.enum(["BLOCK", "UNBLOCK"]),
    reason: z.string().max(200).optional(),
  })
  .strict()
  .refine((d) => new Date(d.toUtc) > new Date(d.fromUtc), {
    message: "toUtc must be after fromUtc",
    path: ["toUtc"],
  });

const createBodySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(24 * 60 - 1),
    endMinute: z.number().int().min(1).max(24 * 60),
    slotDurationMinutes: z.number().int().min(5).max(240).optional(),
    effectiveFrom: z.string().datetime().nullable().optional(),
    effectiveUntil: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((d) => d.endMinute > d.startMinute, {
    message: "endMinute must be greater than startMinute",
    path: ["endMinute"],
  });

// Every field optional — the caller sends only what changed. `endMinute` can't
// be range-checked here (the start it must beat may live in the stored row);
// the route merges onto the existing window and checks there.
const patchBodySchema = z
  .object({
    weekday: z.number().int().min(0).max(6).optional(),
    startMinute: z.number().int().min(0).max(24 * 60 - 1).optional(),
    endMinute: z.number().int().min(1).max(24 * 60).optional(),
    slotDurationMinutes: z.number().int().min(5).max(240).optional(),
    effectiveFrom: z.string().datetime().nullable().optional(),
    effectiveUntil: z.string().datetime().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

/** Flip the status, resize on the base grid, or both — at least one. */
const slotPatchSchema = z
  .object({
    status: z.enum(["OPEN", "BLOCKED"]).optional(),
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

/** Optional note kept on the removal record. */
const slotDeleteSchema = z
  .object({ reason: z.string().trim().max(200).optional() })
  .strict();

/** Ad-hoc slots at explicit UTC instants — the doctor UI expands the date +
 *  time range it collected using the timezone it is displaying. */
const slotCreateSchema = z
  .object({
    startAts: z.array(z.string().datetime()).min(1).max(2000),
    durationMinutes: z.number().int().min(5).max(480),
  })
  .strict();

const slotIdParamSchema = z.object({ slotId: z.string().min(1).max(120) });
const availabilityIdParamSchema = z.object({
  availabilityId: z.string().min(1).max(120),
});

const doctorSelfAvailabilityRoute: FastifyPluginAsync = async (app) => {
  // ── List own windows + concrete slots for next N days ──────────────
  app.get<{ Querystring: { days?: string } }>(
    "/api/doctor/availability",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const query = querySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
      }

      try {
        // Calendar passes an explicit from/to window (a visible month);
        // the legacy availability page passes `days` (next-N-days list).
        let fromUtc: Date;
        let toUtc: Date;
        if (query.data.from && query.data.to) {
          fromUtc = new Date(query.data.from);
          toUtc = new Date(query.data.to);
          if (toUtc.getTime() - fromUtc.getTime() > MAX_RANGE_MS) {
            toUtc = new Date(fromUtc.getTime() + MAX_RANGE_MS);
          }
        } else {
          const now = new Date();
          fromUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          toUtc = new Date(
            fromUtc.getTime() + query.data.days * 24 * 60 * 60 * 1000,
          );
        }

        // Ensure DoctorTimeSlot rows are materialised so doctors can see
        // (and block) upcoming slots even before any patient hits the
        // public availability endpoint.
        await ensureSlotsForRange(auth.doctorId, fromUtc, toUtc);

        const [windows, slots, clinicTimezone, availableTimezones] = await Promise.all([
          listAdminAvailability(auth.doctorId),
          prisma.doctorTimeSlot.findMany({
            where: {
              doctorId: auth.doctorId,
              startAt: { gte: fromUtc, lt: toUtc },
            },
            orderBy: { startAt: "asc" },
            select: {
              id: true,
              startAt: true,
              endAt: true,
              status: true,
              blockReason: true,
              // Booked/held slots carry the claiming appointment — surface the
              // patient + consultation detail so the doctor's calendar can open
              // a booked slot the same way the admin calendar does.
              appointment: {
                select: {
                  id: true,
                  fullName: true,
                  consultationType: true,
                  meetingUrl: true,
                },
              },
            },
          }),
          resolveDoctorTimeZone(auth.doctorId),
          resolveDoctorTimeZones(auth.doctorId),
        ]);

        return okResponse({
          windows,
          slots: slots.map((s) => ({
            id: s.id,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            status: s.status,
            blockReason: s.blockReason,
            // Only booked slots have a patient behind them; open/blocked stay bare.
            appointmentId: s.appointment?.id ?? null,
            patientName: s.appointment?.fullName ?? null,
            consultationType: s.appointment?.consultationType ?? null,
            meetingUrl: s.appointment?.meetingUrl ?? null,
          })),
          clinicTimezone,
          availableTimezones,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load availability"));
      }
    },
  );

  // ── Create a recurring window ──────────────────────────────────────
  app.post(
    "/api/doctor/availability",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const parsed = createBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }

      try {
        const row = await createAdminAvailability(auth.doctorId, {
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
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create availability"));
      }
    },
  );

  // ── Edit own window (extend/shorten hours, re-date, pause) ─────────
  app.patch<{ Params: { availabilityId: string } }>(
    "/api/doctor/availability/:availabilityId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const params = availabilityIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const parsed = patchBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }

      try {
        // Merge onto the stored row before validating: a patch that only moves
        // the end time must still be checked against the start time it will
        // actually run against.
        const existing = await prisma.doctorAvailability.findFirst({
          where: { id: params.data.availabilityId, doctorId: auth.doctorId },
          select: { startMinute: true, endMinute: true },
        });
        if (!existing) return reply.status(404).send(errorResponse("Window not found"));

        const startMinute = parsed.data.startMinute ?? existing.startMinute;
        const endMinute = parsed.data.endMinute ?? existing.endMinute;
        if (endMinute <= startMinute) {
          return reply
            .status(400)
            .send(errorResponse("endMinute must be greater than startMinute"));
        }

        const row = await patchAdminAvailability(
          auth.doctorId,
          params.data.availabilityId,
          {
            ...parsed.data,
            effectiveFrom:
              parsed.data.effectiveFrom === undefined
                ? undefined
                : parsed.data.effectiveFrom === null
                  ? null
                  : new Date(parsed.data.effectiveFrom),
            effectiveUntil:
              parsed.data.effectiveUntil === undefined
                ? undefined
                : parsed.data.effectiveUntil === null
                  ? null
                  : new Date(parsed.data.effectiveUntil),
          },
        );
        if (!row) return reply.status(404).send(errorResponse("Window not found"));

        // The window moved, so future OPEN slots minted from its old shape are
        // stale — drop them and let the next range fetch re-materialise from
        // the new shape. BOOKED/HELD/BLOCKED stay: they are real commitments.
        try {
          await prisma.doctorTimeSlot.deleteMany({
            where: {
              doctorId: auth.doctorId,
              status: "OPEN",
              startAt: { gte: new Date() },
              // Admin-added one-off slots aren't derived from any window, so a
              // sweep would delete them permanently. They opt out.
              isAdHoc: false,
            },
          });
        } catch {
          /* non-fatal — stale open slots age out */
        }
        return okResponse({ availability: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update window"));
      }
    },
  );

  // ── Delete own window ──────────────────────────────────────────────
  app.delete<{ Params: { availabilityId: string } }>(
    "/api/doctor/availability/:availabilityId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const params = availabilityIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const ok = await deleteAdminAvailability(
          auth.doctorId,
          params.data.availabilityId,
        );
        if (!ok) return reply.status(404).send(errorResponse("Window not found"));
        // Clean up derived OPEN slots — leave BOOKED + BLOCKED alone
        try {
          await prisma.doctorTimeSlot.deleteMany({
            where: {
              doctorId: auth.doctorId,
              status: "OPEN",
              startAt: { gte: new Date() },
              // Admin-added one-off slots aren't derived from any window, so a
              // sweep would delete them permanently. They opt out.
              isAdHoc: false,
            },
          });
        } catch {
          /* non-fatal — slots will time out naturally */
        }
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete window"));
      }
    },
  );

  // ── Toggle a concrete slot OPEN ↔ BLOCKED ──────────────────────────
  // Doctor scoped: the slot must belong to this doctor.
  app.patch<{ Params: { slotId: string } }>(
    "/api/doctor/time-slots/:slotId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const params = slotIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      const body = slotPatchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      try {
        const slot = await prisma.doctorTimeSlot.findFirst({
          where: { id: params.data.slotId, doctorId: auth.doctorId },
          select: { id: true, status: true },
        });
        if (!slot) return reply.status(404).send(errorResponse("Slot not found"));

        // Hard-stop: BOOKED + HELD slots are bound to a cart / appointment.
        // Only OPEN ↔ BLOCKED is safe here.
        if (slot.status === "BOOKED" || slot.status === "HELD") {
          return reply
            .status(409)
            .send(
              errorResponse(
                "This slot has been claimed. Cancel the booking first to free it.",
              ),
            );
        }
        // Resize first: it can fail on a booked neighbour, and a status flip
        // that already landed would leave half the request applied.
        if (body.data.durationMinutes !== undefined) {
          const resized = await resizeSlot(
            auth.doctorId,
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

        if (body.data.status === undefined || slot.status === body.data.status) {
          const row = await prisma.doctorTimeSlot.findUnique({
            where: { id: slot.id },
            select: { id: true, status: true },
          });
          return okResponse({ id: slot.id, status: row?.status ?? slot.status });
        }

        const updated = await prisma.doctorTimeSlot.update({
          where: { id: slot.id },
          data: { status: body.data.status },
          select: { id: true, status: true },
        });
        return okResponse({ id: updated.id, status: updated.status });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update slot"));
      }
    },
  );

  // ── Remove a concrete slot (this date only) ────────────────────────
  // Deletes the row AND records an availability exception, because slots are
  // regenerated from the doctor's recurring windows on every read — without the
  // exception the slot would simply come back. The weekly window is untouched.
  app.delete<{ Params: { slotId: string } }>(
    "/api/doctor/time-slots/:slotId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const params = slotIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
      // A DELETE with no body at all is the common case — treat it as {}.
      const body = slotDeleteSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
      }

      try {
        const result = await removeSlotForDate(
          auth.doctorId,
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
                    "This slot has been claimed. Cancel the booking first to free it.",
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
    },
  );

  // ── Add one-off slots at explicit instants ─────────────────────────
  // Independent of the recurring windows; rows are flagged ad-hoc so a later
  // window edit can't sweep them away. Clashes are skipped, not fatal.
  app.post("/api/doctor/time-slots", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = slotCreateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
    }
    const startAts = body.data.startAts.map((iso) => new Date(iso));
    if (startAts.some((d) => Number.isNaN(d.getTime()))) {
      return reply.status(400).send(errorResponse("Invalid start time"));
    }

    try {
      const result = await createAdHocSlots(
        auth.doctorId,
        startAts,
        body.data.durationMinutes,
      );
      if (result.created === 0 && result.skippedOverlap > 0) {
        return reply
          .status(409)
          .send(
            errorResponse(
              result.skippedOverlap === 1
                ? "You already have a slot overlapping that time"
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

  // ── Bulk block / unblock a UTC range (whole-day / vacation time-off) ──
  // Blocks every OPEN slot in [fromUtc, toUtc) (materialising any missing
  // recurring slots first) or re-opens BLOCKED ones. BOOKED/HELD untouched.
  app.post("/api/doctor/time-slots/bulk-block", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    const body = bulkBlockBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid time-off request", body.error.flatten()));
    }

    try {
      const fromUtc = new Date(body.data.fromUtc);
      const toUtc = new Date(body.data.toUtc);
      const result = await bulkSetSlotBlockInRange(
        auth.doctorId,
        fromUtc,
        toUtc,
        body.data.action,
        body.data.reason ?? null,
      );
      return okResponse({ updated: result.updated, action: body.data.action });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update time-off"));
    }
  });
};

export default doctorSelfAvailabilityRoute;
