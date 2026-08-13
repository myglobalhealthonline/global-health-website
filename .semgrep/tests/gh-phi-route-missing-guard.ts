import type { FastifyPluginAsync } from "fastify";
import { guardMedicalRead, guardMedicalReadForAppointment, MedicalAccessDeniedError } from "../../utils/guard-medical-read.js";
import { prisma } from "../../db/prisma.js";

// A PHI read with no guard call anywhere in the file — the basic violation.
const unguardedRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/x", async (request, reply) => {
    // ruleid: gh-phi-route-missing-guard
    const rows = await prisma.prescription.findMany({ where: { id: "x" } });
    return reply.send(rows);
  });
};
export default unguardedRoute;

// Guarded via the standard try/catch(guardError) shape.
const guardedTryCatch: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/y", async (request, reply) => {
    try {
      await guardMedicalRead(
        request,
        { userId: "u1", role: "DOCTOR" },
        { patientProfileId: "p1", resourceType: "PRESCRIPTION" },
      );
    } catch (guardError) {
      if (guardError instanceof MedicalAccessDeniedError) {
        return reply.status(403).send({ ok: false });
      }
      throw guardError;
    }
    // ok: gh-phi-route-missing-guard
    const rows = await prisma.prescription.findMany({ where: { id: "x" } });
    return reply.send(rows);
  });
};

// Guarded via the .catch() tail shape (medical-documents.route.ts pattern).
const guardedCatchTail: FastifyPluginAsync = async (app) => {
  app.get("/api/account/medical-documents", async (request, reply) => {
    await guardMedicalRead(
      request,
      { userId: "u1", role: "PATIENT" },
      { patientProfileId: "p1", resourceType: "MEDICAL_DOC" },
    ).catch((e) => {
      if (!(e instanceof MedicalAccessDeniedError)) throw e;
    });
    // ok: gh-phi-route-missing-guard
    const doc = await prisma.medicalDocument.findFirst({ where: { id: "x" } });
    return reply.send(doc);
  });
};

// Guarded via guardMedicalReadForAppointment, including the guest-booking
// null-return path (no PatientProfile) — presence of the call is what
// matters, not whether it happens to throw for this particular appointment.
const guardedForAppointment: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/api/doctor/appointments/:id/prescriptions", async (request, reply) => {
    const result = await guardMedicalReadForAppointment(
      request,
      { userId: "u1", role: "DOCTOR", doctorId: "d1" },
      request.params.id,
      { resourceType: "PRESCRIPTION" },
    );
    if (result === null) {
      // Guest booking — no PatientProfile to gate against. Legitimate.
    }
    // ok: gh-phi-route-missing-guard
    const rows = await prisma.prescription.findMany({ where: { consultationId: "c1" } });
    return reply.send(rows);
  });
};

// HealthTest is the orderable-test PRODUCT CATALOG, not clinical PHI —
// never in this rule's model list, so it must never fire regardless of
// guard presence.
const productCatalogRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/health-tests", async (request, reply) => {
    // ok: gh-phi-route-missing-guard
    const tests = await prisma.healthTest.findMany({ where: { active: true } });
    return reply.send(tests);
  });
};

// A count/groupBy aggregation on a PHI model is not a content read — the
// rule only targets find* methods, not count/groupBy/aggregate.
const countOnlyRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/reports", async (request, reply) => {
    // ok: gh-phi-route-missing-guard
    const total = await prisma.consultation.count({ where: { doctorId: "d1" } });
    return reply.send({ total });
  });
};
