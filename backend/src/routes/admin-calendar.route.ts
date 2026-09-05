import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { getAdminCalendar } from "../modules/admin-calendar/admin-calendar.service.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import {
  buildCountryCodeFilter,
  resolveAdminListCountryFolders,
} from "../utils/order-country-scope.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin cross-doctor calendar (read-only).
 *
 *   GET /api/admin/calendar?from=…&to=…[&doctorId=…][&consultationType=…][&countryCode=…]
 *
 * Returns every doctor's slots + every scheduled consultation in the window.
 * Default (no doctorId) spans all doctors. Filters narrow by a single doctor,
 * a consultation type, and/or a country.
 */

const MAX_RANGE_MS = 120 * 24 * 60 * 60 * 1000;

const querySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  doctorId: z.string().min(1).max(120).optional(),
  consultationType: z.string().min(1).max(120).optional(),
  countryCode: z.string().min(1).max(10).optional(),
});

const adminCalendarRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/calendar", async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid calendar query", query.error.flatten()));
    }

    try {
      const fromUtc = new Date(query.data.from);
      let toUtc = new Date(query.data.to);
      if (toUtc <= fromUtc) {
        return reply.status(400).send(errorResponse("`to` must be after `from`"));
      }
      if (toUtc.getTime() - fromUtc.getTime() > MAX_RANGE_MS) {
        toUtc = new Date(fromUtc.getTime() + MAX_RANGE_MS);
      }

      // AZ-1: `verifyAdminAccess` treats LOCAL_ADMIN like ADMIN, so this
      // cross-doctor calendar returned every country's consultations —
      // patient name included — to a single-country admin. Clamp to the
      // admin's assigned folders; ADMIN/SUPER_ADMIN resolve to null (unscoped)
      // and are unaffected.
      const scopedFolders = await resolveAdminListCountryFolders(request);
      const countryCode =
        buildCountryCodeFilter(query.data.countryCode, scopedFolders) ?? null;

      const data = await getAdminCalendar({
        fromUtc,
        toUtc,
        doctorId: query.data.doctorId ?? null,
        consultationType: query.data.consultationType ?? null,
        countryCode,
      });
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load calendar"));
    }
  });
};

export default adminCalendarRoute;
