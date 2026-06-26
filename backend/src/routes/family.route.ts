import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import {
  familyMemberCreateSchema,
  familyMemberIdParamsSchema,
  familyMemberUpdateSchema,
} from "../validations/family.schema.js";

/**
 * Patient-managed family members (§ appointment-claim G5). The "approved
 * family list" the booking flow targets. Every handler is scoped to the
 * logged-in user via `primaryUserId === authUser.sub` — the same ownership
 * guard the cart/checkout pricing path re-enforces. `canUseCredits` is the
 * self-service "approved to use plan benefits" toggle (D5).
 *
 *   GET    /api/account/family
 *   POST   /api/account/family
 *   PATCH  /api/account/family/:id
 *   DELETE /api/account/family/:id
 */

/** Parse a `YYYY-MM-DD` (or ISO) string to a UTC start-of-day Date, or null. */
function parseDob(input: string | undefined): Date | null {
  if (!input) return null;
  const datePart = input.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serialize(member: {
  id: string;
  fullName: string;
  relationship: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  canUseCredits: boolean;
  createdAt: Date;
}) {
  return {
    id: member.id,
    fullName: member.fullName,
    relationship: member.relationship,
    email: member.email,
    dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString() : null,
    canUseCredits: member.canUseCredits,
    createdAt: member.createdAt.toISOString(),
  };
}

const familyRoute: FastifyPluginAsync = async (app) => {
  // All routes require a logged-in account.
  app.addHook("preHandler", requireAuth);

  app.get("/api/account/family", async (request, reply) => {
    const userId = request.authUser!.sub;
    try {
      const members = await prisma.familyMember.findMany({
        where: { primaryUserId: userId },
        orderBy: { createdAt: "asc" },
      });
      return okResponse({ items: members.map(serialize) });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not load family members"));
    }
  });

  app.post("/api/account/family", async (request, reply) => {
    const userId = request.authUser!.sub;
    const body = familyMemberCreateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid family member", body.error.flatten()));
    }
    try {
      const created = await prisma.familyMember.create({
        data: {
          primaryUserId: userId,
          fullName: body.data.fullName,
          relationship: body.data.relationship || null,
          email: body.data.email || null,
          dateOfBirth: parseDob(body.data.dateOfBirth || undefined),
          canUseCredits: body.data.canUseCredits ?? false,
        },
      });
      return okResponse(serialize(created));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not add family member"));
    }
  });

  app.patch<{ Params: { id: string } }>("/api/account/family/:id", async (request, reply) => {
    const userId = request.authUser!.sub;
    const params = familyMemberIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));
    const body = familyMemberUpdateSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send(errorResponse("Invalid body", body.error.flatten()));
    }

    try {
      // Ownership check before mutating — never trust the id alone.
      const existing = await prisma.familyMember.findFirst({
        where: { id: params.data.id, primaryUserId: userId },
        select: { id: true },
      });
      if (!existing) return reply.status(404).send(errorResponse("Family member not found"));

      const updated = await prisma.familyMember.update({
        where: { id: existing.id },
        data: {
          ...(body.data.fullName !== undefined ? { fullName: body.data.fullName } : {}),
          ...(body.data.relationship !== undefined
            ? { relationship: body.data.relationship || null }
            : {}),
          ...(body.data.email !== undefined ? { email: body.data.email || null } : {}),
          ...(body.data.dateOfBirth !== undefined
            ? { dateOfBirth: parseDob(body.data.dateOfBirth || undefined) }
            : {}),
          ...(body.data.canUseCredits !== undefined
            ? { canUseCredits: body.data.canUseCredits }
            : {}),
        },
      });
      return okResponse(serialize(updated));
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not update family member"));
    }
  });

  app.delete<{ Params: { id: string } }>("/api/account/family/:id", async (request, reply) => {
    const userId = request.authUser!.sub;
    const params = familyMemberIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send(errorResponse("Invalid id"));

    try {
      const existing = await prisma.familyMember.findFirst({
        where: { id: params.data.id, primaryUserId: userId },
        select: { id: true },
      });
      if (!existing) return reply.status(404).send(errorResponse("Family member not found"));

      // FK onDelete: SetNull keeps historical cart/order lines intact.
      await prisma.familyMember.delete({ where: { id: existing.id } });
      return okResponse({ id: existing.id, deleted: true });
    } catch (err) {
      if (err instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(err.message));
      }
      app.log.error(err);
      return reply.status(500).send(errorResponse("Could not remove family member"));
    }
  });
};

export default familyRoute;
