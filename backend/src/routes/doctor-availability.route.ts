import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createAdminAvailability,
  deleteAdminAvailability,
  listAdminAvailability,
  listOpenSlotsForDoctor,
  patchAdminAvailability,
} from "../modules/doctor-availability/doctor-availability.service.js";
import { countryCodeSchema } from "../validations/shared.schema.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";

const publicAvailabilityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14),
});

const adminCreateBodySchema = z
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

const adminPatchBodySchema = z
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

const doctorAvailabilityRoute: FastifyPluginAsync = async (app) => {
  /**
   * Public: open slots for a specific doctor over the next N days.
   * Used by the booking form when the patient arrives with `?doctor=<slug>`.
   * Country path-param scopes the lookup so the same slug can't leak data
   * across markets.
   */
  app.get<{
    Params: { countryCode: string; slug: string };
    Querystring: { days?: string };
  }>("/api/doctors/:countryCode/:slug/availability", async (request, reply) => {
    const countryParse = countryCodeSchema.safeParse(request.params.countryCode);
    if (!countryParse.success) {
      return reply.status(400).send(errorResponse("Invalid country code"));
    }
    const query = publicAvailabilityQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid query", query.error.flatten()));
    }

    try {
      const doctor = await prisma.doctor.findFirst({
        where: {
          slug: request.params.slug,
          active: true,
          OR: [
            { country: { code: countryParse.data, isActive: true } },
            {
              additionalCountries: {
                some: {
                  active: true,
                  country: { code: countryParse.data, isActive: true },
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor not found"));
      }

      const now = new Date();
      const fromUtc = new Date(now.getTime() + 60 * 60 * 1000); // 1h buffer — don't show slots about to start
      const toUtc = new Date(
        now.getTime() + query.data.days * 24 * 60 * 60 * 1000,
      );

      const slots = await listOpenSlotsForDoctor(doctor.id, fromUtc, toUtc);
      return okResponse({ slots });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load availability"));
    }
  });

  /** Admin: list a doctor's weekly availability windows. */
  app.get<{ Params: { id: string } }>(
    "/api/admin/doctors/:id/availability",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      try {
        const rows = await listAdminAvailability(request.params.id);
        return okResponse({ items: rows });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load availability"));
      }
    },
  );

  /** Admin: create a weekly availability window for the doctor. */
  app.post<{ Params: { id: string } }>(
    "/api/admin/doctors/:id/availability",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const parsed = adminCreateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }
      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: request.params.id },
          select: { id: true },
        });
        if (!doctor) {
          return reply.status(404).send(errorResponse("Doctor not found"));
        }
        const row = await createAdminAvailability(request.params.id, {
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

  /** Admin: patch an existing window. */
  app.patch<{ Params: { id: string; availabilityId: string } }>(
    "/api/admin/doctors/:id/availability/:availabilityId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      const parsed = adminPatchBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid availability", parsed.error.flatten()));
      }
      try {
        const row = await patchAdminAvailability(
          request.params.id,
          request.params.availabilityId,
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
        if (!row) {
          return reply.status(404).send(errorResponse("Availability not found"));
        }
        return okResponse({ availability: row });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update availability"));
      }
    },
  );

  /** Admin: delete a window (also removes future un-claimed slots). */
  app.delete<{ Params: { id: string; availabilityId: string } }>(
    "/api/admin/doctors/:id/availability/:availabilityId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) {
        return reply.status(auth.status).send(errorResponse(auth.message));
      }
      try {
        const ok = await deleteAdminAvailability(
          request.params.id,
          request.params.availabilityId,
        );
        if (!ok) {
          return reply.status(404).send(errorResponse("Availability not found"));
        }
        // Also tidy up future OPEN slots that were derived from this window
        // (BOOKED slots remain — those are real appointments).
        try {
          await prisma.doctorTimeSlot.deleteMany({
            where: {
              doctorId: request.params.id,
              status: "OPEN",
              startAt: { gte: new Date() },
            },
          });
        } catch (cleanupErr) {
          app.log.warn(
            { err: cleanupErr },
            "Failed to clean up open slots after availability delete",
          );
        }
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete availability"));
      }
    },
  );
};

export default doctorAvailabilityRoute;
