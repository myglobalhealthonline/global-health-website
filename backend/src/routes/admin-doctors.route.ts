import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import {
  createAdminDoctor,
  disableAdminDoctor,
  DoctorCountryNotFoundError,
  DoctorSpecialtyInvalidError,
  getAdminDoctorById,
  listAdminDoctors,
  purgeAdminDoctor,
  updateAdminDoctor,
} from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { issuePasswordResetToken } from "../modules/auth/auth.service.js";
import { sendDoctorInviteEmail } from "../lib/email/templates.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import {
  adminDoctorCreateBodySchema,
  adminDoctorUpdateBodySchema,
  adminDoctorsQuerySchema,
  doctorIdParamsSchema,
  doctorInviteBodySchema,
} from "../validations/admin-doctors.schema.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

function handleDoctorWriteError(
  app: { log: { error: (e: unknown) => void } },
  reply: {
    status: (code: number) => { send: (body: unknown) => unknown };
  },
  error: unknown,
) {
  if (error instanceof DoctorCountryNotFoundError || error instanceof DoctorSpecialtyInvalidError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return reply.status(409).send(errorResponse("Duplicate value for a unique doctor field (country + slug)"));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin doctors error"));
}

const adminDoctorsRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.get("/api/admin/doctors", async (request, reply) => {
    const query = adminDoctorsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid admin doctors query", query.error.flatten()));
    }

    try {
      const data = await listAdminDoctors(query.data);
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin doctors error"));
    }
  });

  app.get("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const doctor = await getAdminDoctorById(params.data.id);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      return okResponse({ doctor });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected admin doctor error"));
    }
  });

  app.post("/api/admin/doctors", async (request, reply) => {
    const body = adminDoctorCreateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid doctor payload", body.error.flatten()));
    }

    try {
      const doctor = await createAdminDoctor(body.data);
      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id,
        actorRole: "ADMIN",
        action: "DOCTOR_CREATED",
        entityType: "Doctor",
        entityId: doctor.id,
        metadata: { slug: doctor.slug, countryCode: doctor.country?.code ?? null },
        request,
      }).catch(() => {});
      return okResponse({ doctor }, "Doctor profile created");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.patch("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    const body = adminDoctorUpdateBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid doctor update", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send(errorResponse("No fields to update"));
    }

    try {
      const doctor = await updateAdminDoctor(params.data.id, body.data);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id,
        actorRole: "ADMIN",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: doctor.id,
        metadata: { changed: Object.keys(body.data) },
        request,
      }).catch(() => {});
      return okResponse({ doctor }, "Doctor profile updated");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.delete("/api/admin/doctors/:id", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const doctor = await disableAdminDoctor(params.data.id);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id,
        actorRole: "ADMIN",
        action: "DOCTOR_DEACTIVATED",
        entityType: "Doctor",
        entityId: doctor.id,
        request,
      }).catch(() => {});
      return okResponse({ doctor }, "Doctor profile deactivated");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  /**
   * Admin invites a doctor to the portal by email. Idempotent: re-running
   * for the same Doctor row just refreshes the invite token + re-sends.
   *
   * Race / collision rules:
   *   - If the email already belongs to a different doctor profile, 409.
   *   - If the email matches an existing User of another role (PATIENT,
   *     ADMIN), 409 — admin must use /admin/users/[id] to change role first.
   *   - Otherwise we create-or-link the User to this Doctor and issue a
   *     7-day password-set token.
   */
  app.post("/api/admin/doctors/:id/invite", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    const body = doctorInviteBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid invite payload", body.error.flatten()));
    }

    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: params.data.id },
        select: { id: true, fullName: true, title: true },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      const email = body.data.email;
      const fullName = body.data.fullName?.trim() || doctor.fullName;

      // Locate existing user by email (case-insensitive); decide between
      // create / link / conflict based on what's there.
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, doctorId: true, isActive: true },
      });

      if (existing) {
        if (existing.doctorId && existing.doctorId !== doctor.id) {
          return reply
            .status(409)
            .send(
              errorResponse(
                "Doctor profile is already linked to another user",
              ),
            );
        }
        if (
          existing.role !== "DOCTOR" &&
          existing.role !== "PATIENT" &&
          existing.doctorId !== doctor.id
        ) {
          return reply
            .status(409)
            .send(
              errorResponse(
                "Email already belongs to an admin account — change role from /admin/users first",
              ),
            );
        }
      }

      const placeholderHash = await bcrypt.hash(
        randomBytes(32).toString("hex"),
        12,
      );

      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: {
              role: "DOCTOR",
              doctorId: doctor.id,
              fullName,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              emailVerifiedAt: true,
            },
          })
        : await prisma.user.create({
            data: {
              email,
              passwordHash: placeholderHash,
              fullName,
              role: "DOCTOR",
              doctorId: doctor.id,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              emailVerifiedAt: true,
            },
          });

      const token = await issuePasswordResetToken(user.id, {
        ttlMinutes: 7 * 24 * 60,
        isInvite: true,
      });

      let emailed = false;
      try {
        await sendDoctorInviteEmail({
          to: user.email,
          fullName: user.fullName,
          token,
          doctorTitle: doctor.title,
        });
        emailed = true;
      } catch (err) {
        app.log.warn(
          { err, doctorId: doctor.id },
          "Failed to send doctor invite email — admin can share the link manually",
        );
      }

      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "DOCTOR_INVITED",
        entityType: "Doctor",
        entityId: doctor.id,
        metadata: {
          userId: user.id,
          email: user.email,
          resend: Boolean(existing),
          emailed,
        },
        request,
      }).catch(() => {});

      return reply.status(201).send(
        okResponse(
          {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            },
            resend: Boolean(existing),
            emailed,
          },
          existing ? "Invite resent" : "Doctor invited",
        ),
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return reply
          .status(409)
          .send(errorResponse("Email already registered to another account"));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not send invite"));
    }
  });

  app.delete("/api/admin/doctors/:id/purge", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const deleted = await purgeAdminDoctor(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const actor = await resolveOptionalAuthUser(request);
      recordAudit({
        actorUserId: actor?.id,
        actorRole: "ADMIN",
        action: "DOCTOR_PURGED",
        entityType: "Doctor",
        entityId: params.data.id,
        request,
      }).catch(() => {});
      return okResponse({}, "Doctor profile deleted");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });
};

export default adminDoctorsRoute;
