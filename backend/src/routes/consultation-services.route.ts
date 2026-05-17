import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  verifyClinicalReadAccess,
  verifyDoctorAccess,
} from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";

/**
 * Per-consultation services-rendered line items.
 *
 *   GET    /api/doctor/consultations/:consultationId/services
 *   POST   /api/doctor/consultations/:consultationId/services
 *   DELETE /api/doctor/consultation-services/:lineId
 *
 * Doctor logs the catalogue services performed during the consult.
 * Admin reads these for invoicing. Edits are blocked once the parent
 * Consultation is SIGNED (mirrors the SOAP lock rule).
 */

const addBodySchema = z
  .object({
    serviceId: z.string().trim().min(8).max(40).nullable().optional(),
    customLabel: z.string().trim().min(1).max(200).nullable().optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    unitPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
    currencyCode: z.string().trim().length(3).nullable().optional(),
  })
  .strict()
  .refine((d) => Boolean(d.serviceId) || Boolean(d.customLabel), {
    message: "Provide either a catalogue serviceId or a customLabel",
  });

async function ownedConsultation(doctorId: string, consultationId: string) {
  return prisma.consultation.findFirst({
    where: { id: consultationId, doctorId },
    select: { id: true, status: true },
  });
}

const consultationServicesRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { consultationId: string } }>(
    "/api/doctor/consultations/:consultationId/services",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const consult = await prisma.consultation.findFirst({
          where: {
            id: request.params.consultationId,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
          select: { id: true, status: true },
        });
        if (!consult) {
          return reply.status(404).send(errorResponse("Consultation not found"));
        }
        const items = await prisma.consultationService.findMany({
          where: { consultationId: consult.id },
          orderBy: { createdAt: "asc" },
          include: {
            service: {
              select: { id: true, name: true, basePriceCents: true, currencyCode: true },
            },
          },
        });
        return okResponse({
          items: items.map((r) => ({
            id: r.id,
            serviceId: r.serviceId,
            service: r.service
              ? {
                  id: r.service.id,
                  name: r.service.name,
                  basePriceCents: r.service.basePriceCents,
                  currencyCode: r.service.currencyCode,
                }
              : null,
            customLabel: r.customLabel,
            quantity: r.quantity,
            unitPriceCents: r.unitPriceCents,
            currencyCode: r.currencyCode,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load services-used"));
      }
    },
  );

  app.post<{ Params: { consultationId: string } }>(
    "/api/doctor/consultations/:consultationId/services",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = addBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid line item", body.error.flatten()));
      }
      try {
        const consult = await ownedConsultation(
          auth.doctorId,
          request.params.consultationId,
        );
        if (!consult) {
          return reply.status(404).send(errorResponse("Consultation not found"));
        }
        if (consult.status === "SIGNED") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed; line items are locked"));
        }
        // When a serviceId is supplied, default price/currency from the
        // catalogue row so the doctor doesn't have to retype.
        let unitPriceCents = body.data.unitPriceCents ?? null;
        let currencyCode = body.data.currencyCode ?? null;
        if (body.data.serviceId) {
          const svc = await prisma.service.findUnique({
            where: { id: body.data.serviceId },
            select: { id: true, basePriceCents: true, currencyCode: true },
          });
          if (!svc) {
            return reply.status(404).send(errorResponse("Service not found"));
          }
          if (unitPriceCents === null) unitPriceCents = svc.basePriceCents;
          if (!currencyCode) currencyCode = svc.currencyCode;
        }
        const row = await prisma.consultationService.create({
          data: {
            consultationId: consult.id,
            serviceId: body.data.serviceId ?? null,
            customLabel: body.data.customLabel ?? null,
            quantity: body.data.quantity ?? 1,
            unitPriceCents,
            currencyCode,
          },
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CONSULT_SERVICE_ADDED",
          entityType: "ConsultationService",
          entityId: row.id,
          metadata: { consultationId: consult.id, label: row.customLabel ?? row.serviceId },
          request,
        }).catch(() => {});
        return reply.status(201).send(
          okResponse({
            line: {
              ...row,
              createdAt: row.createdAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not add line item"));
      }
    },
  );

  app.delete<{ Params: { lineId: string } }>(
    "/api/doctor/consultation-services/:lineId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.consultationService.findUnique({
          where: { id: request.params.lineId },
          include: { consultation: { select: { doctorId: true, status: true } } },
        });
        if (!existing || existing.consultation.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Line item not found"));
        }
        if (existing.consultation.status === "SIGNED") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed; line items are locked"));
        }
        await prisma.consultationService.delete({ where: { id: existing.id } });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "CONSULT_SERVICE_REMOVED",
          entityType: "ConsultationService",
          entityId: existing.id,
          request,
        }).catch(() => {});
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete line item"));
      }
    },
  );
};

export default consultationServicesRoute;
