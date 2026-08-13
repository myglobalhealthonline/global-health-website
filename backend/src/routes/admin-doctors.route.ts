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
  getDoctorDeleteImpact,
  listAdminDoctors,
  purgeAdminDoctor,
  updateAdminDoctor,
  type DoctorDeleteBlockers,
} from "../modules/doctors/doctors.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { issuePasswordResetToken } from "../modules/auth/auth.service.js";
import { sendDoctorInviteEmail } from "../lib/email/templates.js";
import { recordAudit, recordCriticalAudit } from "../modules/audit/audit.service.js";
import {
  adminDoctorCreateBodySchema,
  adminDoctorUpdateBodySchema,
  adminDoctorsQuerySchema,
  doctorIdParamsSchema,
  doctorInviteBodySchema,
} from "../validations/admin-doctors.schema.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  adminAssignServiceToDoctor,
  adminRemoveDoctorService,
  adminUpdateDoctorService,
  listAdminDoctorServices,
  listPendingDoctorServiceRequests,
  type ServiceDoctorStatus,
} from "../modules/doctor-services/doctor-services.service.js";
import {
  DoctorProfileChangeInvalidError,
  listAdminDoctorProfileChangeRequests,
  listPendingDoctorProfileChangeRequests,
  reviewDoctorProfileChangeRequest,
} from "../modules/doctor-profile-change-requests/doctor-profile-change-requests.service.js";
import {
  adminDoctorProfileChangeParamsSchema,
  adminDoctorProfileChangeReviewBodySchema,
  pendingProfileChangeRequestsQuerySchema,
} from "../validations/doctor-profile-change-requests.schema.js";
import { z } from "zod";

/** Raised inside the login-email change transaction when the requested
 *  address already belongs to another User or PatientProfile. */
class DoctorEmailTakenError extends Error {}

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
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
    return reply
      .status(503)
      .send(errorResponse("Doctor save timed out — retry; if it persists, check database load"));
  }
  // A Restrict relation refused the write — for deletes this means clinical
  // records still reference the doctor. The purge route checks for these up
  // front; this is the backstop so a race surfaces as 409, not a bare 500.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return reply
      .status(409)
      .send(
        errorResponse(
          "Cannot delete: linked medical records still reference this doctor. Deactivate the profile instead.",
          { code: "CLINICAL_RECORDS_EXIST" },
        ),
      );
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  app.log.error(error);
  return reply.status(500).send(errorResponse("Unexpected admin doctors error"));
}

const purgeDoctorQuerySchema = z.object({
  /** Set once the admin has seen and accepted the future-appointment warning. */
  force: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const DOCTOR_BLOCKER_LABELS: Record<keyof DoctorDeleteBlockers, [string, string]> = {
  consultations: ["consultation", "consultations"],
  prescriptions: ["prescription", "prescriptions"],
  examResults: ["exam result", "exam results"],
  generatedDocuments: ["generated document", "generated documents"],
  appointmentDocuments: ["attached document", "attached documents"],
  medicalNotes: ["medical note", "medical notes"],
};

/** "3 consultations, 1 prescription" — only the non-zero counts, in order. */
function describeDoctorBlockers(blockers: DoctorDeleteBlockers): string {
  return Object.entries(blockers)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const [singular, plural] = DOCTOR_BLOCKER_LABELS[key as keyof DoctorDeleteBlockers];
      return `${count} ${count === 1 ? singular : plural}`;
    })
    .join(", ");
}

const adminDoctorServiceAssignBodySchema = z.object({
  serviceId: z.string().trim().min(1),
  doctorAmountCents: z.number().int().min(0).nullable().optional(),
});

const adminDoctorServicePatchBodySchema = z
  .object({
    status: z.enum(["pending", "active", "rejected", "disabled"]).optional(),
    doctorAmountCents: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (b) => b.status !== undefined || b.doctorAmountCents !== undefined,
    { message: "Provide a status and/or a payout amount to update" },
  );

const serviceDoctorIdParamsSchema = z.object({
  id: z.string().trim().min(1),
  serviceDoctorId: z.string().trim().min(1),
});

const pendingServiceRequestsQuerySchema = z.object({
  countryCode: z.string().trim().min(1).max(8).optional(),
});

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
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
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
      const result = await updateAdminDoctor(params.data.id, body.data);
      if (!result) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const { doctor, countryChange } = result;
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
        actorRole: "ADMIN",
        action: "DOCTOR_UPDATED",
        entityType: "Doctor",
        entityId: doctor.id,
        metadata: {
          changed: Object.keys(body.data),
          ...(countryChange && {
            countryChange: {
              from: countryChange.fromCountryCode ?? countryChange.fromCountryId,
              to: countryChange.toCountryCode ?? countryChange.toCountryId,
            },
          }),
        },
        request,
      }).catch(() => {});
      return okResponse({ doctor, countryChange }, "Doctor profile updated");
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.delete(
    "/api/admin/doctors/:id",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }

    try {
      const doctor = await disableAdminDoctor(params.data.id);
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
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
    },
  );

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
  app.post(
    "/api/admin/doctors/:id/invite",
    // Sends an email + mints a 7-day password-set token — throttle re-invite spam.
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
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

      // The doctor may already have a linked login user. If the admin submits
      // a DIFFERENT address this is an email CHANGE, not a fresh invite:
      // rewrite the existing User in place. Creating a second User instead
      // would just hit the `User.doctorId` unique and 409 with a misleading
      // "email already registered" — which is why the old UI could only ever
      // resend to the address captured on the first invite.
      const linked = await prisma.user.findUnique({
        where: { doctorId: doctor.id },
        select: { id: true, email: true },
      });
      const emailChanged = Boolean(linked && linked.email !== email);
      if (linked && emailChanged) {
        // Same bar as PATCH /api/admin/users/:id: the login address is also
        // the password-reset destination, so rewriting it is an
        // account-takeover primitive. Country-scoped LOCAL_ADMINs and the
        // dev token fallback (no session actor) are excluded.
        const actorRole = resolveAdminSessionActor(request)?.role;
        if (actorRole !== "ADMIN" && actorRole !== "SUPER_ADMIN") {
          return reply
            .status(403)
            .send(
              errorResponse(
                "Only a global admin can change a doctor's login email",
              ),
            );
        }
        const previousEmail = linked.email;
        await prisma.$transaction(
          async (tx) => {
            // Both tables carry a unique on email. Check inside the tx so the
            // answer can't go stale, and so the admin gets a readable 409
            // instead of a raw P2002.
            // nosemgrep: gh-phi-route-missing-guard -- admin-authenticated (verifyAdminAccess plugin hook); a data-integrity email-collision check on a doctor-email edit, narrow { id: true } select, not clinical content.
            const [takenByUser, takenByProfile] = await Promise.all([
              tx.user.findFirst({
                where: { email, id: { not: linked.id } },
                select: { id: true },
              }),
              // nosemgrep: gh-phi-route-missing-guard -- same data-integrity check as above, narrow { id: true } select, not clinical content.
              tx.patientProfile.findFirst({
                where: { email, userId: { not: linked.id } },
                select: { id: true },
              }),
            ]);
            if (takenByUser || takenByProfile) {
              throw new DoctorEmailTakenError();
            }
            // PatientProfile is joined by email, not userId — a doctor who is
            // also a patient here would otherwise have their chart stranded at
            // the old address. Both move together or neither does.
            // nosemgrep: gh-phi-route-missing-guard -- admin-authenticated (verifyAdminAccess plugin hook); moves the linked PatientProfile row(s) to match a doctor's changed email, narrow { id, globalHealthNumber } select, not clinical content.
            const movedProfiles = await tx.patientProfile.findMany({
              where: { email: previousEmail },
              select: { id: true, globalHealthNumber: true },
            });
            await tx.patientProfile.updateMany({
              where: { email: previousEmail },
              data: { email },
            });
            if (movedProfiles.length > 0) {
              await tx.patientContactChangeLog.createMany({
                data: movedProfiles.map((p) => ({
                  patientProfileId: p.id,
                  globalHealthNumber: p.globalHealthNumber ?? null,
                  changedById: resolveAdminSessionActor(request)?.userId ?? null,
                  changedByRole: actorRole,
                  fieldChanged: "EMAIL",
                  oldValue: previousEmail,
                  newValue: email,
                  ipAddress: request.ip ?? null,
                })),
              });
            }
            await tx.user.update({
              where: { id: linked.id },
              data: {
                email,
                // The new address is unproven, and any session still open on
                // the old one must die immediately rather than at JWT expiry.
                emailVerifiedAt: null,
                tokenVersion: { increment: 1 },
              },
            });
          },
          { isolationLevel: "Serializable" },
        );
        const emailChangeActor = resolveAdminSessionActor(request);
        await recordCriticalAudit({
          actorUserId: emailChangeActor?.userId ?? null,
          actorRole: emailChangeActor?.role ?? "ADMIN",
          action: "USER_UPDATED",
          entityType: "User",
          entityId: linked.id,
          metadata: {
            doctorId: doctor.id,
            changedFields: ["email"],
            emailFrom: previousEmail,
            emailTo: email,
          },
          request,
        });
      }

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

      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId ?? null,
        actorRole: actor?.role ?? "ADMIN",
        action: "DOCTOR_INVITED",
        entityType: "Doctor",
        entityId: doctor.id,
        metadata: {
          userId: user.id,
          email: user.email,
          resend: Boolean(existing),
          emailed,
          emailChanged,
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
            emailChanged,
          },
          emailChanged
            ? "Login email changed — invite sent to the new address"
            : existing
              ? "Invite resent"
              : "Doctor invited",
        ),
      );
    } catch (error) {
      if (error instanceof DoctorEmailTakenError) {
        return reply
          .status(409)
          .send(errorResponse("That email is already in use by another account"));
      }
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
    },
  );

  /**
   * Pending doctor-initiated service requests awaiting approval. Drives the
   * admin alert badge + notification feed. `countryCode` scopes the queue to
   * one country; omit for the global queue.
   */
  app.get("/api/admin/doctor-service-requests", async (request, reply) => {
    const query = pendingServiceRequestsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", query.error.flatten()));
    }
    try {
      const data = await listPendingDoctorServiceRequests({
        countryCode: query.data.countryCode ?? null,
      });
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load pending service requests"));
    }
  });

  /**
   * Doctor-proposed edits to admin-locked profile fields (name, qualifications,
   * per-market bio + registration, photo). Same shape as the service-request
   * queue above: a global list for the badge/feed, a per-doctor list for the
   * review page, and a PATCH that approves (applying the change to the live
   * profile) or rejects.
   */
  app.get("/api/admin/doctor-profile-change-requests", async (request, reply) => {
    const query = pendingProfileChangeRequestsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid query", query.error.flatten()));
    }
    try {
      const data = await listPendingDoctorProfileChangeRequests({
        countryCode: query.data.countryCode ?? null,
      });
      return okResponse(data);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load pending profile change requests"));
    }
  });

  app.get("/api/admin/doctors/:id/profile-change-requests", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: params.data.id },
        select: { id: true },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const items = await listAdminDoctorProfileChangeRequests(params.data.id);
      return okResponse({ items });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply
        .status(500)
        .send(errorResponse("Could not load profile change requests"));
    }
  });

  app.patch(
    "/api/admin/doctors/:id/profile-change-requests/:requestId",
    async (request, reply) => {
      const params = adminDoctorProfileChangeParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid parameters", params.error.flatten()));
      }
      const body = adminDoctorProfileChangeReviewBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid review", body.error.flatten()));
      }
      try {
        const actor = resolveAdminSessionActor(request);
        const result = await reviewDoctorProfileChangeRequest(
          params.data.id,
          params.data.requestId,
          {
            status: body.data.status,
            reviewNote: body.data.reviewNote ?? null,
            markVerified: body.data.markVerified === true,
            reviewedByUserId: actor?.userId ?? null,
          },
        );
        if (!result) {
          return reply.status(404).send(errorResponse("Change request not found"));
        }
        recordAudit({
          actorUserId: actor?.userId ?? null,
          actorRole: "ADMIN",
          action: "DOCTOR_PROFILE_CHANGE_REVIEWED",
          entityType: "Doctor",
          entityId: params.data.id,
          metadata: {
            requestId: params.data.requestId,
            field: result.request.field,
            status: body.data.status,
            markVerified: body.data.markVerified === true,
          },
          request,
        }).catch(() => {});
        return okResponse(
          { request: result.request, cache: result.cache },
          body.data.status === "approved"
            ? "Change approved and applied"
            : "Change rejected",
        );
      } catch (error) {
        if (error instanceof DoctorProfileChangeInvalidError) {
          return reply.status(400).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply
          .status(500)
          .send(errorResponse("Could not review the change request"));
      }
    },
  );

  app.get("/api/admin/doctors/:id/services", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: params.data.id },
        select: { id: true },
      });
      if (!doctor) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const items = await listAdminDoctorServices(params.data.id);
      return okResponse({ items });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load doctor services"));
    }
  });

  app.post("/api/admin/doctors/:id/services", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    const body = adminDoctorServiceAssignBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid service assignment", body.error.flatten()));
    }
    try {
      const row = await adminAssignServiceToDoctor(
        params.data.id,
        body.data.serviceId,
        body.data.doctorAmountCents,
      );
      if (!row) {
        return reply
          .status(404)
          .send(errorResponse("Doctor or service not found for this country"));
      }
      return okResponse({ assignment: row }, "Service assigned to doctor");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not assign service"));
    }
  });

  app.patch(
    "/api/admin/doctors/:id/services/:serviceDoctorId",
    async (request, reply) => {
      const params = serviceDoctorIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid parameters", params.error.flatten()));
      }
      const body = adminDoctorServicePatchBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid status update", body.error.flatten()));
      }
      try {
        const row = await adminUpdateDoctorService(
          params.data.id,
          params.data.serviceDoctorId,
          {
            status: body.data.status as ServiceDoctorStatus | undefined,
            doctorAmountCents: body.data.doctorAmountCents,
          },
        );
        if (!row) {
          return reply.status(404).send(errorResponse("Assignment not found"));
        }
        return okResponse({ assignment: row }, "Assignment updated");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update assignment"));
      }
    },
  );

  app.delete(
    "/api/admin/doctors/:id/services/:serviceDoctorId",
    async (request, reply) => {
      const params = serviceDoctorIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid parameters", params.error.flatten()));
      }
      try {
        const removed = await adminRemoveDoctorService(
          params.data.id,
          params.data.serviceDoctorId,
        );
        if (!removed) {
          return reply.status(404).send(errorResponse("Assignment not found"));
        }
        return okResponse({}, "Assignment removed");
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not remove assignment"));
      }
    },
  );

  app.get("/api/admin/doctors/:id/delete-impact", async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    try {
      const impact = await getDoctorDeleteImpact(params.data.id);
      if (!impact) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      return okResponse(impact);
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
  });

  app.delete(
    "/api/admin/doctors/:id/purge",
    // Hard delete — irreversible.
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const params = doctorIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid doctor id", params.error.flatten()));
    }
    const query = purgeDoctorQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send(errorResponse("Invalid purge query", query.error.flatten()));
    }

    try {
      const impact = await getDoctorDeleteImpact(params.data.id);
      if (!impact) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      // Clinical records are Restrict-linked AND legally retained. No amount
      // of admin confirmation may destroy them — deactivation is the only
      // available action for a doctor who has practised.
      if (impact.blocked) {
        return reply.status(409).send(
          errorResponse(
            `Cannot delete: this doctor has ${describeDoctorBlockers(impact.blockers)}. ` +
              "Medical records must be retained — deactivate the profile instead.",
            { code: "CLINICAL_RECORDS_EXIST", impact },
          ),
        );
      }

      // Appointments are SetNull-linked, so a purge only unassigns them — the
      // patient keeps the booking. Warn once; proceed when the admin confirms.
      if (impact.futureAppointments > 0 && !query.data.force) {
        return reply.status(409).send(
          errorResponse(
            `This doctor has ${impact.futureAppointments} future appointment(s). ` +
              "Deleting keeps those bookings but leaves them unassigned.",
            { code: "FUTURE_APPOINTMENTS_EXIST", impact },
          ),
        );
      }

      const deleted = await purgeAdminDoctor(params.data.id);
      if (!deleted) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
      const actor = resolveAdminSessionActor(request);
      recordAudit({
        actorUserId: actor?.userId,
        actorRole: "ADMIN",
        action: "DOCTOR_PURGED",
        entityType: "Doctor",
        entityId: params.data.id,
        metadata: {
          forced: query.data.force,
          unassignedFutureAppointments: impact.futureAppointments,
          unassignedPastAppointments: impact.pastAppointments,
        },
        request,
      }).catch(() => {});
      return okResponse(
        { unassignedAppointments: impact.futureAppointments + impact.pastAppointments },
        "Doctor profile deleted",
      );
    } catch (error) {
      return handleDoctorWriteError(app, reply, error);
    }
    },
  );
};

export default adminDoctorsRoute;
