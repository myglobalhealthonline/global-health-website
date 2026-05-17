import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   POST /api/doctor/consultations/:consultationId/share-link
 *   GET  /api/share-links/:token        (public — no auth)
 *   DELETE /api/doctor/share-links/:id  (revoke)
 *
 * Doctor mints a signed URL for a SIGNED consultation so a referring
 * colleague can read it without an account. Token is 32 bytes of CSPRNG
 * hex; default expiry 7 days, capped at 90.
 */

const createBodySchema = z
  .object({
    expiresInDays: z.number().int().min(1).max(90).optional(),
  })
  .strict();

const shareLinksRoute: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { consultationId: string } }>(
    "/api/doctor/consultations/:consultationId/share-link",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = createBodySchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid body", body.error.flatten()));
      }
      try {
        const consult = await prisma.consultation.findFirst({
          where: { id: request.params.consultationId, doctorId: auth.doctorId },
          select: { id: true, status: true },
        });
        if (!consult) {
          return reply.status(404).send(errorResponse("Consultation not found"));
        }
        if (consult.status !== "SIGNED") {
          return reply
            .status(400)
            .send(
              errorResponse("Sign the consultation before sharing it externally"),
            );
        }
        const token = randomBytes(32).toString("hex");
        const days = body.data.expiresInDays ?? 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const row = await prisma.shareLink.create({
          data: {
            scope: "CONSULTATION",
            consultationId: consult.id,
            token,
            expiresAt,
            createdByUserId: auth.userId,
          },
        });
        return reply.status(201).send(
          okResponse({
            shareLink: {
              id: row.id,
              token: row.token,
              expiresAt: row.expiresAt.toISOString(),
              createdAt: row.createdAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not create share link"));
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/doctor/share-links/:id",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.shareLink.findUnique({
          where: { id: request.params.id },
          select: { id: true, createdByUserId: true },
        });
        if (!existing || existing.createdByUserId !== auth.userId) {
          return reply.status(404).send(errorResponse("Share link not found"));
        }
        await prisma.shareLink.update({
          where: { id: existing.id },
          data: { revokedAt: new Date() },
        });
        return okResponse({ revoked: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not revoke share link"));
      }
    },
  );

  // Public — no auth. Token is opaque. We DO NOT 401 on expired —
  // a friendly 410 helps the receiver realise the link has lapsed.
  app.get<{ Params: { token: string } }>(
    "/api/share-links/:token",
    async (request, reply) => {
      reply.header("Cache-Control", "private, no-store");
      try {
        const link = await prisma.shareLink.findUnique({
          where: { token: request.params.token },
          include: {
            consultation: {
              include: {
                appointment: {
                  select: {
                    fullName: true,
                    email: true,
                    phone: true,
                    consultationType: true,
                    countryCode: true,
                    scheduledAt: true,
                    dateOfBirth: true,
                    createdAt: true,
                  },
                },
                doctor: { select: { fullName: true, title: true } },
              },
            },
          },
        });
        if (!link) {
          return reply.status(404).send(errorResponse("Share link not found"));
        }
        if (link.revokedAt) {
          return reply.status(410).send(errorResponse("This link has been revoked"));
        }
        if (link.expiresAt.getTime() < Date.now()) {
          return reply.status(410).send(errorResponse("This link has expired"));
        }
        const c = link.consultation;
        if (!c) {
          return reply.status(404).send(errorResponse("Consultation not found"));
        }
        return okResponse({
          consultation: {
            id: c.id,
            status: c.status,
            signedAt: c.signedAt?.toISOString() ?? null,
            chiefComplaint: c.chiefComplaint,
            subjective: c.subjective,
            objective: c.objective,
            assessment: c.assessment,
            plan: c.plan,
            doctor: c.doctor,
            appointment: {
              ...c.appointment,
              scheduledAt: c.appointment.scheduledAt?.toISOString() ?? null,
              dateOfBirth: c.appointment.dateOfBirth?.toISOString() ?? null,
              createdAt: c.appointment.createdAt.toISOString(),
            },
          },
          expiresAt: link.expiresAt.toISOString(),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load shared consult"));
      }
    },
  );
};

export default shareLinksRoute;
