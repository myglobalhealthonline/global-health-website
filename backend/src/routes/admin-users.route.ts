import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { emailSchema, fullNameSchema } from "../validations/shared.schema.js";
import { applyPatientProfileUpdate } from "../modules/patient-profile/patient-profile.service.js";
import { issuePasswordResetToken } from "../modules/auth/auth.service.js";
import { sendEmailChangedEmail } from "../lib/email/templates.js";

// Signals "would remove the last active SUPER_ADMIN" out of the transaction
// below so the route can reply 409 instead of the generic 500 handler.
class LastSuperAdminError extends Error {}

// Raised inside the update transaction when the requested email is already
// taken by another User or by an unrelated PatientProfile row, so the route
// replies 409 instead of surfacing a raw P2002.
class EmailTakenError extends Error {}

/**
 * Admin patient + admin-user management.
 *
 * Surfaces:
 *   GET  /api/admin/users               — list + search + role filter (paginated)
 *   GET  /api/admin/users/:id           — single user detail + booking count
 *   PATCH /api/admin/users/:id          — flip isActive, change role/doctor
 *                                          link, correct identity fields
 *                                          (email, fullName, phone, DOB)
 *   POST /api/admin/users/:id/reset-password
 *     — set a fresh password directly (admin override; bypasses email
 *        token because the operator is acting on behalf of the user)
 *
 * Auth: every route runs `verifyAdminAccess` upfront so non-admin
 * sessions get 401/403 before any DB work. The token-fallback path
 * is honoured in dev only (see admin-auth.ts).
 */

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  role: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.nativeEnum(UserRole).optional(),
  ),
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  isActive: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === "true" || v === true) return true;
    if (v === "false" || v === false) return false;
    return undefined;
  }, z.boolean().optional()),
});

const idParamSchema = z.object({ id: z.string().min(1).max(120) });

const patchBodySchema = z
  .object({
    isActive: z.boolean().optional(),
    role: z.nativeEnum(UserRole).optional(),
    /** Link this user account to a Doctor profile (one-to-one).
     *  Pass null to unlink. Backend rejects when the target Doctor
     *  is already linked to another user. */
    doctorId: z.string().trim().min(1).nullable().optional(),
    /** Login identifier. Normalised to lowercase because every lookup
     *  (login, PatientProfile join) lower-cases before querying. */
    email: emailSchema.toLowerCase().optional(),
    fullName: fullNameSchema.optional(),
    phone: z.string().trim().min(6).max(32).nullable().optional(),
    dateOfBirth: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const resetPasswordBodySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const adminUsersRoute: FastifyPluginAsync = async (app) => {
  // Gate every route on this plugin behind admin auth.
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
    // S-003: this plugin is GLOBAL user administration (any user, any
    // country, including role escalation to SUPER_ADMIN) — out of scope
    // for a country-scoped LOCAL_ADMIN entirely, not just a matter of
    // filtering rows. LOCAL_ADMIN's patient-facing surfaces are the
    // country-scoped admin-patient-profile / admin-corporate routes.
    const actor = resolveAdminSessionActor(request);
    if (actor?.role === "LOCAL_ADMIN") {
      return reply.status(403).send(errorResponse("Global user administration requires ADMIN or SUPER_ADMIN"));
    }
  });

  app.get("/api/admin/users", async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid users query", query.error.flatten()));
    }
    const { page, pageSize, role, search, isActive } = query.data;

    const where = {
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { fullName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    try {
      const [total, rows] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            isActive: true,
            doctorId: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      return okResponse({
        items: rows.map((r) => ({
          ...r,
          emailVerifiedAt: r.emailVerifiedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      const norm = normalizeDbError(error, "Could not list users");
      app.log.error(norm);
      return reply.status(500).send(errorResponse("Could not list users"));
    }
  });

  app.get("/api/admin/users/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid user id"));
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: params.data.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          // dateOfBirth + doctorId are both edited from the detail page, so
          // they have to come back here to prefill the form. doctorId was
          // already declared on AdminUserDto and read by the page but never
          // selected, so the link input silently rendered empty.
          dateOfBirth: true,
          doctorId: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!user) return reply.status(404).send(errorResponse("User not found"));
      const appointmentCount = await prisma.appointment.count({
        where: { userId: user.id },
      });
      return okResponse({
        user: {
          ...user,
          dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
          emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        stats: { appointmentCount },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load user"));
    }
  });

  app.patch(
    "/api/admin/users/:id",
    // Role changes / activation flips — tighter than the 300/min global default.
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid user id"));
    }
    const body = patchBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid update", body.error.flatten()));
    }
    const sessionActor = resolveAdminSessionActor(request);
    // S-003: role changes (including escalation to SUPER_ADMIN) and
    // doctor-link changes are SUPER_ADMIN-only — a plain ADMIN keeps
    // isActive toggling for ordinary support work.
    if (
      (body.data.role !== undefined || body.data.doctorId !== undefined) &&
      sessionActor?.role !== "SUPER_ADMIN"
    ) {
      return reply
        .status(403)
        .send(errorResponse("Only SUPER_ADMIN can change a user's role or doctor link"));
    }
    // Email is the login identifier AND the password-reset destination —
    // open to ADMIN and SUPER_ADMIN (LOCAL_ADMIN is already excluded from
    // this whole plugin above; PATIENT/DOCTOR never reach admin auth).
    // The takeover primitive this guards against (retarget the email, then
    // reset the password) is mitigated below: the changed address always
    // gets a fresh temp password mailed to it, not a silent handoff.
    if (
      body.data.email !== undefined &&
      sessionActor?.role !== "SUPER_ADMIN" &&
      sessionActor?.role !== "ADMIN"
    ) {
      return reply
        .status(403)
        .send(errorResponse("Only an admin can change a user's email"));
    }
    // Self-protection: an admin acting on their own account can't change
    // their own role or deactivate themselves through this endpoint —
    // closes the "compromised session locks out real admins" and
    // "accidental self-lockout" failure modes in one guard.
    if (
      sessionActor?.userId === params.data.id &&
      (body.data.role !== undefined || body.data.isActive === false)
    ) {
      return reply.status(403).send(errorResponse("You cannot change your own role or deactivate your own account"));
    }
    try {
      // If the admin is linking a Doctor, check the target isn't already
      // taken by a different user. Without this the unique constraint
      // would raise a Prisma P2002 and we'd lose the friendly error.
      if (body.data.doctorId) {
        const existing = await prisma.user.findFirst({
          where: {
            doctorId: body.data.doctorId,
            id: { not: params.data.id },
          },
          select: { id: true, email: true },
        });
        if (existing) {
          return reply
            .status(409)
            .send(
              errorResponse(
                `That doctor profile is already linked to ${existing.email}`,
              ),
            );
        }
      }
      const before = await prisma.user.findUnique({
        where: { id: params.data.id },
        select: { role: true, isActive: true, email: true },
      });
      // Answer "no such user" directly. Falling through would hit the update
      // and surface a raw P2025 as a 500, and would also make `emailChanging`
      // below silently false for a request that did ask to change the email.
      if (!before) {
        return reply.status(404).send(errorResponse("User not found"));
      }
      // Only treat email as "changing" when it actually differs — a form that
      // round-trips the unchanged address must not nuke emailVerifiedAt or
      // log the admin out for nothing.
      const nextEmail = body.data.email;
      const emailChanging = nextEmail !== undefined && nextEmail !== before.email;
      // A corrected email may no longer be an inbox the patient can prove
      // control of via their old password, so hand them a fresh temp
      // password (mailed to the NEW address below) alongside the usual
      // set-your-own-password link — same shape as the admin-create-patient
      // and doctor-invite flows.
      const tempPassword = emailChanging ? randomBytes(9).toString("base64url") : null;
      const tempPasswordHash = tempPassword ? await bcrypt.hash(tempPassword, 12) : null;
      // Last-SUPER_ADMIN protection: refuse to demote or deactivate the
      // only remaining active SUPER_ADMIN — that would leave nobody able
      // to grant SUPER_ADMIN back.
      const losingSuperAdmin =
        before?.role === "SUPER_ADMIN" &&
        before.isActive &&
        ((body.data.role !== undefined && body.data.role !== "SUPER_ADMIN") ||
          body.data.isActive === false);
      // Bump the target's tokenVersion whenever a privilege-affecting field
      // changes so any existing session of theirs is rejected on its very
      // next request instead of lingering until natural JWT expiry (S-004).
      const bumpTokenVersion =
        body.data.role !== undefined ||
        body.data.isActive !== undefined ||
        body.data.doctorId !== undefined ||
        emailChanging;
      // Count + update run in one SERIALIZABLE transaction so two concurrent
      // demotions of different SUPER_ADMINs can't both pass the count check
      // and leave zero active SUPER_ADMINs (ReadCommitted would still let
      // both counts see the other admin as active; Serializable aborts one
      // with P2034 instead).
      const updated = await prisma.$transaction(async (tx) => {
        if (losingSuperAdmin) {
          const otherActiveSuperAdmins = await tx.user.count({
            where: { role: "SUPER_ADMIN", isActive: true, id: { not: params.data.id } },
          });
          if (otherActiveSuperAdmins === 0) {
            throw new LastSuperAdminError();
          }
        }
        if (emailChanging && nextEmail) {
          // Both tables carry a unique on email. Check them inside the tx so
          // the answer can't go stale between check and write, and so the
          // admin gets a readable 409 rather than a raw P2002.
          // nosemgrep: gh-phi-route-missing-guard -- admin-authenticated (verifyGlobalAdminAccess plugin hook); a data-integrity email-collision check on a user-email edit, narrow { id: true } select, not clinical content.
          const [takenByUser, takenByProfile] = await Promise.all([
            tx.user.findFirst({
              where: { email: nextEmail, id: { not: params.data.id } },
              select: { id: true },
            }),
            // nosemgrep: gh-phi-route-missing-guard -- same data-integrity check as above, narrow { id: true } select, not clinical content.
            tx.patientProfile.findFirst({
              where: { email: nextEmail, userId: { not: params.data.id } },
              select: { id: true },
            }),
          ]);
          if (takenByUser || takenByProfile) {
            throw new EmailTakenError();
          }
          // PatientProfile is joined by email, not by userId — every admin
          // and doctor read does findUnique({ where: { email } }). Moving the
          // User without moving the profile would strand the entire clinical
          // chart at the old address, so both move together or neither does.
          // nosemgrep: gh-phi-route-missing-guard -- admin-authenticated (verifyGlobalAdminAccess plugin hook); moves the linked PatientProfile row(s) to match a user's changed email, narrow { id, globalHealthNumber } select, not clinical content.
          const movedProfiles = await tx.patientProfile.findMany({
            where: { email: before.email },
            select: { id: true, globalHealthNumber: true },
          });
          await tx.patientProfile.updateMany({
            where: { email: before.email },
            data: { email: nextEmail },
          });
          // Task 1c: append-only contact-change log, same transaction as the
          // move so the log can't exist without the change (or vice versa).
          if (movedProfiles.length > 0) {
            await tx.patientContactChangeLog.createMany({
              data: movedProfiles.map((p) => ({
                patientProfileId: p.id,
                globalHealthNumber: p.globalHealthNumber ?? null,
                changedById: sessionActor?.userId ?? null,
                changedByRole: sessionActor?.role ?? "ADMIN",
                fieldChanged: "EMAIL",
                oldValue: before.email,
                newValue: nextEmail,
                ipAddress: request.ip ?? null,
              })),
            });
          }
        }
        return tx.user.update({
          where: { id: params.data.id },
          data: {
            ...(body.data.isActive !== undefined && { isActive: body.data.isActive }),
            ...(body.data.role !== undefined && { role: body.data.role }),
            ...(body.data.doctorId !== undefined && { doctorId: body.data.doctorId }),
            ...(body.data.email !== undefined && { email: body.data.email }),
            ...(body.data.fullName !== undefined && { fullName: body.data.fullName }),
            ...(body.data.phone !== undefined && { phone: body.data.phone }),
            ...(body.data.dateOfBirth !== undefined && {
              dateOfBirth: body.data.dateOfBirth ? new Date(body.data.dateOfBirth) : null,
            }),
            // A new address is unproven — drop verification so the account
            // re-verifies rather than inheriting the old address's trust.
            ...(emailChanging && { emailVerifiedAt: null }),
            // Temp password issued below travels only to the NEW address by
            // email, so the old password (possibly known only via the old,
            // now-wrong inbox) stops working the moment the email moves.
            ...(tempPasswordHash && { passwordHash: tempPasswordHash, mustChangePassword: true }),
            ...(bumpTokenVersion && { tokenVersion: { increment: 1 } }),
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isActive: true,
            doctorId: true,
            updatedAt: true,
          },
        });
      }, { isolationLevel: "Serializable" });
      // The clinical chart (PatientProfile) carries its own copy of
      // fullName/phone/dateOfBirth, keyed by email rather than userId, so it
      // doesn't move automatically when the User row above changes. Mirror
      // the edit onto an existing profile so "Account details" stays the
      // single source of truth an admin needs to touch. Only sync onto a
      // profile that already exists — a bare role=PATIENT flip with no
      // profile yet shouldn't mint one missing its Global Health Number.
      const identityChanged =
        body.data.fullName !== undefined ||
        body.data.phone !== undefined ||
        body.data.dateOfBirth !== undefined;
      if (identityChanged && updated.role === "PATIENT") {
        const existingProfile = await prisma.patientProfile.findUnique({
          where: { email: updated.email },
          select: { id: true },
        });
        if (existingProfile) {
          try {
            await applyPatientProfileUpdate(
              updated.email,
              {
                ...(body.data.fullName !== undefined && { fullName: body.data.fullName }),
                ...(body.data.phone !== undefined && { phone: body.data.phone }),
                ...(body.data.dateOfBirth !== undefined && {
                  dateOfBirth: body.data.dateOfBirth ? new Date(body.data.dateOfBirth) : null,
                }),
              },
              {
                actor: { userId: sessionActor?.userId ?? null, role: sessionActor?.role ?? "ADMIN" },
                ipAddress: request.ip,
              },
            );
          } catch (syncError) {
            // The User row already saved — don't fail the whole request over
            // a chart-sync hiccup, just surface it in the logs.
            app.log.error(syncError, "Failed to sync identity fields to PatientProfile");
          }
        }
      }
      // Notify the patient at their NEW address — the old inbox may no
      // longer be theirs, which is often the whole reason for the edit, so
      // it gets nothing. Runs after the transaction commits; a mail hiccup
      // must not roll back an already-saved email correction.
      let emailChangeNotified = false;
      if (emailChanging && tempPassword) {
        try {
          const inviteToken = await issuePasswordResetToken(updated.id, {
            ttlMinutes: 7 * 24 * 60,
            isInvite: true,
          });
          await sendEmailChangedEmail({
            to: updated.email,
            fullName: updated.fullName,
            tempPassword,
            token: inviteToken,
          });
          emailChangeNotified = true;
        } catch (notifyError) {
          app.log.error(notifyError, "Failed to send email-changed notification to patient");
        }
      }
      const roleChanged = body.data.role !== undefined && before?.role !== updated.role;
      // S-008: admin-user identity mutation (role change is a privilege
      // change) — audit write must not be silently swallowed.
      await recordCriticalAudit({
        actorUserId: sessionActor?.userId ?? null,
        actorRole: sessionActor?.role ?? "ADMIN",
        action: roleChanged ? "USER_ROLE_CHANGED" : "USER_UPDATED",
        entityType: "User",
        entityId: updated.id,
        metadata: {
          email: updated.email,
          changedFields: Object.keys(body.data),
          ...(roleChanged ? { roleFrom: before?.role, roleTo: updated.role } : {}),
          ...(body.data.isActive !== undefined ? { isActive: updated.isActive } : {}),
          ...(body.data.doctorId !== undefined ? { doctorLinked: Boolean(updated.doctorId) } : {}),
          ...(emailChanging ? { emailChangeNotified } : {}),
          // Both addresses are already-logged identifiers on this route, and
          // an email move is exactly the event an auditor needs to retrace.
          ...(emailChanging ? { emailFrom: before?.email, emailTo: updated.email } : {}),
        },
        request,
      });
      return okResponse({
        user: { ...updated, updatedAt: updated.updatedAt.toISOString() },
      });
    } catch (error) {
      if (error instanceof LastSuperAdminError) {
        return reply
          .status(409)
          .send(errorResponse("Cannot remove the last active SUPER_ADMIN"));
      }
      if (error instanceof EmailTakenError) {
        return reply
          .status(409)
          .send(errorResponse("That email is already in use by another account"));
      }
      // Backstop for the pre-check losing a race against a concurrent insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return reply
          .status(409)
          .send(errorResponse("That email is already in use by another account"));
      }
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update user"));
    }
    },
  );

  app.post(
    "/api/admin/users/:id/reset-password",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send(errorResponse("Invalid user id"));
    }
    const body = resetPasswordBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid password", body.error.flatten()));
    }
    // S-003: forcibly setting another user's password is SUPER_ADMIN-only.
    const sessionActor = resolveAdminSessionActor(request);
    if (sessionActor?.role !== "SUPER_ADMIN") {
      return reply.status(403).send(errorResponse("Only SUPER_ADMIN can reset another user's password"));
    }
    try {
      const passwordHash = await bcrypt.hash(body.data.password, 12);
      // tokenVersion bump (S-004): any session the target already holds is
      // rejected on its next request instead of remaining valid — an
      // admin-forced password reset must end existing sessions immediately.
      await prisma.user.update({
        where: { id: params.data.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      // Burn outstanding reset tokens so they can't be replayed.
      await prisma.passwordResetToken.updateMany({
        where: { userId: params.data.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      // S-008: admin-triggered password reset — audit write must not be
      // silently swallowed.
      await recordCriticalAudit({
        actorUserId: sessionActor?.userId ?? null,
        actorRole: sessionActor?.role ?? "ADMIN",
        action: "USER_PASSWORD_RESET",
        entityType: "User",
        entityId: params.data.id,
        request,
      });
      return okResponse({ reset: true }, "Password updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reset password"));
    }
    },
  );
};

export default adminUsersRoute;
