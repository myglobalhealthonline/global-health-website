import type { FastifyPluginAsync } from "fastify";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { getPatientConsultationHistory } from "../modules/consultation-history/consultation-history.service.js";

const doctorConsultationHistoryRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { email: string } }>(
    "/api/doctor/patients/:email/consultation-history",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const email = decodeURIComponent(request.params.email);
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
