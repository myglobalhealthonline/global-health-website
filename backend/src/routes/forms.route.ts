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
import { notifyAdmins } from "../modules/notifications/notify.service.js";

/**
 * Forms management — reusable templates the doctor builds for intake /
 * pre-consult / post-consult surveys, plus per-appointment submissions.
 *
 *   GET    /api/doctor/form-templates
 *   POST   /api/doctor/form-templates
 *   PATCH  /api/doctor/form-templates/:templateId
 *   DELETE /api/doctor/form-templates/:templateId
 *   GET    /api/doctor/appointments/:id/form-submissions
 *   POST   /api/doctor/appointments/:id/form-submissions
 *
 * Scope: each template is doctor-owned (`doctorId = self`) OR shared
 * (`doctorId = null`, admin-managed). Shared templates show up in every
 * doctor's list but only their owner-admin can edit them — doctor-side
 * GET filters return both, PATCH/DELETE require ownership.
 *
 * `fields` JSON shape is loose for MVP — the form builder UI emits
 * `{ key, label, type, required, options? }`. Stricter validation comes
 * in a follow-up once the builder ships.
 */

const fieldDef = z.object({
  key: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(200),
  type: z.enum(["text", "longtext", "choice", "number", "date"]),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().max(120)).max(40).optional(),
  helper: z.string().trim().max(400).optional(),
});

const createTemplateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    fields: z.array(fieldDef).min(1).max(50),
    isActive: z.boolean().optional(),
  })
  .strict();

const patchTemplateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    fields: z.array(fieldDef).min(1).max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const submissionSchema = z
  .object({
    templateId: z.string().trim().min(8).max(40),
    answers: z
      .array(
        z.object({
          key: z.string().trim().min(1).max(64),
          value: z.union([z.string().max(20000), z.number(), z.boolean(), z.null()]),
        }),
      )
      .max(100),
  })
  .strict();

const formsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/form-templates", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const items = await prisma.formTemplate.findMany({
        where: {
          OR: [{ doctorId: auth.doctorId }, { doctorId: null }],
        },
        orderBy: { updatedAt: "desc" },
      });
      return okResponse({
        items: items.map((t) => ({
          id: t.id,
          doctorId: t.doctorId,
          ownedBySelf: t.doctorId === auth.doctorId,
          title: t.title,
          description: t.description,
          fields: t.fields,
          isActive: t.isActive,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load templates"));
    }
  });

  app.post("/api/doctor/form-templates", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const body = createTemplateSchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid template", body.error.flatten()));
    }
    try {
      const row = await prisma.formTemplate.create({
        data: {
          doctorId: auth.doctorId,
          title: body.data.title,
          description: body.data.description ?? null,
          fields: body.data.fields,
          isActive: body.data.isActive ?? true,
        },
      });
      return reply.status(201).send(
        okResponse({
          template: {
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          },
        }),
      );
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not create template"));
    }
  });

  app.patch<{ Params: { templateId: string } }>(
    "/api/doctor/form-templates/:templateId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = patchTemplateSchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid update", body.error.flatten()));
      }
      try {
        const existing = await prisma.formTemplate.findUnique({
          where: { id: request.params.templateId },
          select: { id: true, doctorId: true },
        });
        if (!existing || existing.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Template not found"));
        }
        const row = await prisma.formTemplate.update({
          where: { id: existing.id },
          data: {
            ...(body.data.title !== undefined && { title: body.data.title }),
            ...(body.data.description !== undefined && {
              description: body.data.description,
            }),
            ...(body.data.fields !== undefined && { fields: body.data.fields }),
            ...(body.data.isActive !== undefined && { isActive: body.data.isActive }),
          },
        });
        return okResponse({
          template: {
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update template"));
      }
    },
  );

  app.delete<{ Params: { templateId: string } }>(
    "/api/doctor/form-templates/:templateId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.formTemplate.findUnique({
          where: { id: request.params.templateId },
          select: { id: true, doctorId: true },
        });
        if (!existing || existing.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Template not found"));
        }
        await prisma.formTemplate.delete({ where: { id: existing.id } });
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete template"));
      }
    },
  );

  /**
   * GET /api/doctor/form-submissions/:submissionId — single submission
   * keyed by id (the appointment-scoped list above is for the
   * workspace; this one feeds the print view at
   * /print/forms/[submissionId]). Returns appointment context too so
   * the print page has everything in one round-trip.
   */
  app.get<{ Params: { submissionId: string } }>(
    "/api/doctor/form-submissions/:submissionId",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const sub = await prisma.formSubmission.findUnique({
          where: { id: request.params.submissionId },
          include: {
            template: { select: { id: true, title: true, description: true, fields: true } },
            appointment: {
              select: {
                id: true,
                fullName: true,
                email: true,
                consultationType: true,
                countryCode: true,
                doctorId: true,
              },
            },
          },
        });
        if (!sub || !sub.appointment) {
          return reply.status(404).send(errorResponse("Submission not found"));
        }
        if (
          auth.role === "DOCTOR" &&
          sub.appointment.doctorId !== auth.doctorId
        ) {
          return reply.status(404).send(errorResponse("Submission not found"));
        }
        return okResponse({
          submission: {
            id: sub.id,
            template: sub.template,
            answers: sub.answers,
            submittedAt: sub.submittedAt.toISOString(),
          },
          appointment: {
            id: sub.appointment.id,
            fullName: sub.appointment.fullName,
            email: sub.appointment.email,
            consultationType: sub.appointment.consultationType,
            countryCode: sub.appointment.countryCode,
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

  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/form-submissions",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: {
            id: request.params.id,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const subs = await prisma.formSubmission.findMany({
          where: { appointmentId: appt.id },
          orderBy: { submittedAt: "desc" },
          include: { template: { select: { id: true, title: true, fields: true } } },
        });
        return okResponse({
          items: subs.map((s) => ({
            id: s.id,
            template: s.template,
            answers: s.answers,
            submittedAt: s.submittedAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load submissions"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/form-submissions",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = submissionSchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid submission", body.error.flatten()));
      }
      try {
        const [appt, template] = await Promise.all([
          prisma.appointment.findFirst({
            where: { id: request.params.id, doctorId: auth.doctorId },
            select: { id: true, userId: true },
          }),
          prisma.formTemplate.findFirst({
            where: {
              id: body.data.templateId,
              OR: [{ doctorId: auth.doctorId }, { doctorId: null }],
            },
            select: { id: true },
          }),
        ]);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        if (!template) {
          return reply.status(404).send(errorResponse("Template not available"));
        }
        const row = await prisma.formSubmission.create({
          data: {
            templateId: template.id,
            appointmentId: appt.id,
            patientUserId: appt.userId,
            answers: body.data.answers,
          },
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "FORM_SUBMITTED",
          entityType: "FormSubmission",
          entityId: row.id,
          metadata: { appointmentId: appt.id, templateId: template.id },
          request,
        }).catch(() => {});
        notifyAdmins("FORM_SUBMITTED", {
          appointmentId: appt.id,
        }).catch(() => {});
        return reply.status(201).send(
          okResponse({
            submission: {
              id: row.id,
              answers: row.answers,
              submittedAt: row.submittedAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save submission"));
      }
    },
  );
};

export default formsRoute;
