import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Returns the calling doctor's effective permission flags so the
 * frontend can show / hide gated UI (manual appointment entry, future
 * billing-only flows, etc.). Single round-trip query — extend the
 * select as new flags land.
 */
const doctorPermissionsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/me/permissions", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const doctor = await prisma.doctor.findUnique({
      where: { id: auth.doctorId },
      select: {
        canCreateManualAppointments: true,
        canRequestCrossJurisdictionRx: true,
        isCountryDirector: true,
        // Country-director grants. Same `where` as verifyCountryDirectorAccess so
        // the nav entry this drives can't appear for a doctor the endpoint would
        // then 403. Empty unless the master flag is on (filtered below).
        additionalCountries: {
          where: { directorAccess: true, active: true },
          select: { country: { select: { code: true, name: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    const isCountryDirector = Boolean(doctor?.isCountryDirector);
    const directorCountries = isCountryDirector
      ? (doctor?.additionalCountries ?? []).map((row) => ({
          code: row.country.code,
          name: row.country.name,
        }))
      : [];
    return okResponse({
      doctorId: auth.doctorId,
      canCreateManualAppointments: Boolean(doctor?.canCreateManualAppointments),
      canRequestCrossJurisdictionRx: Boolean(doctor?.canRequestCrossJurisdictionRx),
      // Both must be true for access: the master flag alone grants nothing when
      // no market is ticked, so the UI keys off `directorCountries.length`.
      isCountryDirector: isCountryDirector && directorCountries.length > 0,
      directorCountries,
    });
  });
};

export default doctorPermissionsRoute;
