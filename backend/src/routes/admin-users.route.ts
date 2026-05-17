import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError, normalizeDbError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin patient + admin-user management.
 *
 * Surfaces:
 *   GET  /api/admin/users               — list + search + role filter (paginated)
 *   GET  /api/admin/users/:id           — single user detail + booking count
 *   PATCH /api/admin/users/:id          — flip isActive, change role
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
  })
  .refine(
    (d) =>
      d.isActive !== undefined || d.role !== undefined || d.doctorId !== undefined,
    { message: "Provide at least one of isActive, role, or doctorId" },
  );

const resetPasswordBodySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const adminUsersRoute: FastifyPluginAsync = async (app) => {
  // Gate every route on this plugin behind admin auth.
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
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

  app.patch("/api/admin/users/:id", async (request, reply) => {
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
      const updated = await prisma.user.update({
        where: { id: params.data.id },
        data: {
          ...(body.data.isActive !== undefined && { isActive: body.data.isActive }),
          ...(body.data.role !== undefined && { role: body.data.role }),
          ...(body.data.doctorId !== undefined && { doctorId: body.data.doctorId }),
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
      return okResponse({
        user: { ...updated, updatedAt: updated.updatedAt.toISOString() },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update user"));
    }
  });

  app.post("/api/admin/users/:id/reset-password", async (request, reply) => {
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
    try {
      const passwordHash = await bcrypt.hash(body.data.password, 12);
      await prisma.user.update({
        where: { id: params.data.id },
        data: { passwordHash },
      });
      // Burn outstanding reset tokens so they can't be replayed.
      await prisma.passwordResetToken.updateMany({
        where: { userId: params.data.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return okResponse({ reset: true }, "Password updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not reset password"));
    }
  });
};

export default adminUsersRoute;
