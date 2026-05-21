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
      select: { canCreateManualAppointments: true },
    });
    return okResponse({
      doctorId: auth.doctorId,
      canCreateManualAppointments: Boolean(doctor?.canCreateManualAppointments),
    });
  });
};

export default doctorPermissionsRoute;
