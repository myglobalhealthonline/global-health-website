import type { FastifyPluginAsync } from "fastify";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { getPatientConsultationHistory } from "../modules/consultation-history/consultation-history.service.js";
import { prisma } from "../db/prisma.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";

const doctorConsultationHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/consultation-history",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const email = decodeURIComponent(request.params.email);
        // Scope the guard by the PatientProfile behind this email. A guest
        // booking that was never claimed has no profile → nothing to authorize
        // against, matching the `if (profile) { guard }` pattern used elsewhere.
        const profile = await prisma.patientProfile.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true },
        });
        if (profile) {
          try {
            await guardMedicalRead(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              { patientProfileId: profile.id, resourceType: "CONSULT_NOTE", accessAction: "VIEWED" },
            );
          } catch (guardError) {
            if (guardError instanceof MedicalAccessDeniedError) {
              return reply.status(403).send(medicalAccessDeniedResponse(guardError));
            }
            throw guardError;
          }
        }
        const data = await getPatientConsultationHistory(email, auth.doctorId);
        return okResponse(data);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load consultation history"));
      }
    },
  );
};

export default doctorConsultationHistoryRoute;
