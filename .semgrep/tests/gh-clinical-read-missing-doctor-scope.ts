import type { FastifyPluginAsync } from "fastify";
import { verifyClinicalReadAccess } from "../../utils/doctor-auth.js";
import { prisma } from "../../db/prisma.js";

// Calls verifyClinicalReadAccess but never filters by auth.doctorId — any
// authenticated doctor can read any other doctor's patient prescriptions.
const missingScopeRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/api/doctor/appointments/:id/prescriptions", async (request, reply) => {
    // ruleid: gh-clinical-read-missing-doctor-scope
    const auth = await verifyClinicalReadAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
    const rows = await prisma.prescription.findMany({
      where: { consultationId: request.params.id },
    });
    return reply.send(rows);
  });
};
export default missingScopeRoute;

// Correctly scoped via the ternary spread pattern used throughout the repo.
const scopedRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/api/doctor/appointments/:id/prescriptions-ok", async (request, reply) => {
    // ok: gh-clinical-read-missing-doctor-scope
    const auth = await verifyClinicalReadAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
    const appt = await prisma.appointment.findFirst({
      where: {
        id: request.params.id,
        ...(auth.role === "DOCTOR" && auth.doctorId ? { doctorId: auth.doctorId } : {}),
      },
      select: { id: true },
    });
    if (!appt) return reply.status(404).send({ ok: false });
    const rows = await prisma.prescription.findMany({ where: { consultationId: appt.id } });
    return reply.send(rows);
  });
};

// Correctly scoped via an explicit ownership-comparison check instead of a
// where-clause spread.
const scopedViaOwnershipCheck: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/api/doctor/exam-results/:id", async (request, reply) => {
    // ok: gh-clinical-read-missing-doctor-scope
    const auth = await verifyClinicalReadAccess(request);
    if (!auth.ok) return reply.status(auth.status).send({ ok: false });
    const existing = await prisma.examResult.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.doctorId !== auth.doctorId) {
      return reply.status(404).send({ ok: false });
    }
    return reply.send(existing);
  });
};
