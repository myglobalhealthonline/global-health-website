import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { ensureConsultationDraft } from "../modules/consultations/ensure-consultation-draft.js";
import { verifyDoctorAccess, verifyClinicalReadAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Clinical prescriptions issued by doctors during a consultation.
 *
 * Doctor surface (the consultation must exist first; locks once SIGNED):
 *   GET    /api/doctor/appointments/:id/prescriptions
 *   POST   /api/doctor/appointments/:id/prescriptions
 *   DELETE /api/doctor/prescriptions/:prescriptionId
 *
 * This is distinct from `ServiceKind.PRESCRIPTION` services managed at
 * `/admin/online-prescriptions` — those are orderable products. This
 * route is for the clinical script written into a SOAP note.
 */

const idParamSchema = z.object({ id: z.string().min(1).max(120) });
const prescriptionIdParamSchema = z.object({
  prescriptionId: z.string().min(1).max(120),
});

const createBodySchema = z.object({
  drugName: z.string().trim().min(1, "Drug name is required").max(200),
  dose: z.string().trim().max(120).optional().or(z.literal("")),
  frequency: z.string().trim().max(120).optional().or(z.literal("")),
  durationDays: z
    .union([z.number().int().min(1).max(3650), z.null()])
    .optional(),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
  refills: z.number().int().min(0).max(12).optional(),
});

type SerializedPrescription = {
  id: string;
  drugName: string;
  dose: string | null;
  frequency: string | null;
  durationDays: number | null;
  instructions: string | null;
  refills: number;
  consultationLocked: boolean;
  createdAt: string;
};

const prescriptionsRoute: FastifyPluginAsync = async (app) => {
  // ── Doctor: list prescriptions for an appointment ───────────────
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/prescriptions",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid appointment id"));
      }

      try {
        const appt = await prisma.appointment.findFirst({
          where: {
            id: params.data.id,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }

        const consultation = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
          select: { id: true, status: true },
        });

        if (!consultation) {
          return okResponse({ items: [] as SerializedPrescription[] });
        }

        const rows = await prisma.prescription.findMany({
          where: { consultationId: consultation.id },
          orderBy: { createdAt: "asc" },
        });

        const locked = consultation.status === "SIGNED";
        const items: SerializedPrescription[] = rows.map((r) => ({
          id: r.id,
          drugName: r.drugName,
          dose: r.dose,
          frequency: r.frequency,
          durationDays: r.durationDays,
          instructions: r.instructions,
          refills: r.refills,
          consultationLocked: locked,
          createdAt: r.createdAt.toISOString(),
        }));

        return okResponse({ items, consultationLocked: locked });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not load prescriptions"));
      }
    },
  );

  // ── Doctor: issue a prescription ─────────────────────────────────
  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/prescriptions",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = idParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send(errorResponse("Invalid appointment id"));
      }

      const body = createBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid prescription", body.error.flatten()));
      }

      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: params.data.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }

        const consultationResult = await ensureConsultationDraft(appt.id, auth.doctorId);
        if (consultationResult === "not_found") {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        if (consultationResult === "signed") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed — prescriptions are locked"));
        }

        const created = await prisma.prescription.create({
          data: {
            consultationId: consultationResult.id,
            doctorId: auth.doctorId,
            drugName: body.data.drugName,
            dose: body.data.dose && body.data.dose !== "" ? body.data.dose : null,
            frequency:
              body.data.frequency && body.data.frequency !== ""
                ? body.data.frequency
                : null,
            durationDays: body.data.durationDays ?? null,
            instructions:
              body.data.instructions && body.data.instructions !== ""
                ? body.data.instructions
                : null,
            refills: body.data.refills ?? 0,
          },
        });

        return okResponse(
          {
            item: {
              id: created.id,
              drugName: created.drugName,
              dose: created.dose,
              frequency: created.frequency,
              durationDays: created.durationDays,
              instructions: created.instructions,
              refills: created.refills,
              consultationLocked: false,
              createdAt: created.createdAt.toISOString(),
            } satisfies SerializedPrescription,
          },
          "Prescription issued",
        );
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not issue prescription"));
      }
    },
  );

  // ── Doctor: delete a prescription (only while consult is draft) ─
  app.delete<{ Params: { prescriptionId: string } }>(
    "/api/doctor/prescriptions/:prescriptionId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const params = prescriptionIdParamSchema.safeParse(request.params);
      if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

      try {
        const row = await prisma.prescription.findFirst({
          where: { id: params.data.prescriptionId, doctorId: auth.doctorId },
          select: {
            id: true,
            consultation: { select: { status: true } },
          },
        });
        if (!row) return reply.status(404).send(errorResponse("Prescription not found"));

        if (row.consultation.status === "SIGNED") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed — prescriptions are locked"));
        }

        await prisma.prescription.delete({ where: { id: row.id } });
        return okResponse({ ok: true });
      } catch (err) {
        if (err instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(err.message));
        }
        app.log.error(err);
        return reply.status(500).send(errorResponse("Could not delete prescription"));
      }
    },
  );
};

export default prescriptionsRoute;
