import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  getBrazilConsentFormData,
  getBrazilConsentForDoctor,
  submitBrazilConsent,
} from "../modules/brazil-consent/brazil-consent.service.js";

const submitSchema = z.object({
  appointmentId: z.string().min(1),
  fullName: z.string().trim().max(200).optional(),
  dob: z.string().trim().max(32).optional(),
  address: z.string().trim().max(500).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(40).optional(),
  pharmacy: z.string().trim().max(500).optional(),
  message: z.string().trim().max(5000).optional(),
  gdprConsent: z.literal(true),
});

const brazilConsentRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/public/brazil-consent", async (request, reply) => {
    const appointmentId = (request.query as { appointmentId?: string }).appointmentId;
    if (!appointmentId?.trim()) {
      return reply.status(400).send(errorResponse("appointmentId is required"));
    }
    try {
      const data = await getBrazilConsentFormData(appointmentId.trim());
      if (!data) {
        return reply.status(404).send(errorResponse("Brazil appointment not found"));
      }
      return okResponse({
        appointment: {
          id: data.appointment.id,
          fullName: data.appointment.fullName,
          email: data.appointment.email,
          phone: data.appointment.phone,
          pharmacy: data.appointment.pharmacy,
          symptoms: data.appointment.symptoms,
          dateOfBirth: data.appointment.dateOfBirth?.toISOString() ?? null,
        },
        submission: data.submission
          ? {
              id: data.submission.id,
              paymentStatus: data.submission.paymentStatus,
              paidAt: data.submission.paidAt?.toISOString() ?? null,
            }
          : null,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load consent form"));
    }
  });

  app.post("/api/public/brazil-consent/submit", async (request, reply) => {
    const body = submitSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid submission", body.error.flatten()));
    }
    try {
      const result = await submitBrazilConsent(body.data);
      if (!result) {
        return reply.status(404).send(errorResponse("Brazil appointment not found"));
      }
      return reply.status(201).send(
        okResponse(
          {
            submissionId: result.submission.id,
            checkoutUrl: result.checkoutUrl,
            paymentStatus: result.submission.paymentStatus,
          },
          "Consent submitted",
        ),
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("Consent is required")) {
        return reply.status(400).send(errorResponse(error.message));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not submit consent"));
    }
  });

  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/brazil-consent",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const row = await getBrazilConsentForDoctor(auth.doctorId, request.params.id);
        if (!row) {
          return reply.status(404).send(errorResponse("Submission not found"));
        }
        return okResponse({
          submission: {
            id: row.id,
            fullName: row.fullName,
            dob: row.dob,
            address: row.address,
            email: row.email,
            phone: row.phone,
            pharmacy: row.pharmacy,
            message: row.message,
            paymentStatus: row.paymentStatus,
            paidAt: row.paidAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load submission"));
      }
    },
  );
};

export default brazilConsentRoute;
