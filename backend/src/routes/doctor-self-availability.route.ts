import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createAdminAvailability,
  deleteAdminAvailability,
  ensureSlotsForRange,
  listAdminAvailability,
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
 *   DELETE /api/doctor/availability/:availabilityId — remove a window (+ orphan OPEN slots)
 *   PATCH  /api/doctor/time-slots/:slotId           — toggle OPEN ↔ BLOCKED (mark busy)
 *
 * BOOKED slots are never toggleable from here — those belong to real
 * appointments. Admin can release a BOOKED slot via the appointment
 * detail page (existing flow).
 */

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14),
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

const slotPatchSchema = z.object({
  status: z.enum(["OPEN", "BLOCKED"]),
});

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
        const now = new Date();
        const fromUtc = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const toUtc = new Date(
          fromUtc.getTime() + query.data.days * 24 * 60 * 60 * 1000,
        );

        // Ensure DoctorTimeSlot rows are materialised so doctors can see
        // (and block) upcoming slots even before any patient hits the
        // public availability endpoint.
        await ensureSlotsForRange(auth.doctorId, fromUtc, toUtc);

        const [windows, slots] = await Promise.all([
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
            },
          }),
        ]);

        return okResponse({
          windows,
          slots: slots.map((s) => ({
            id: s.id,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            status: s.status,
          })),
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
        if (slot.status === body.data.status) {
          return okResponse({ id: slot.id, status: slot.status });
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
};

export default doctorSelfAvailabilityRoute;
