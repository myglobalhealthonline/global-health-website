import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { resolveAdminSessionActor } from "./admin-auth.js";
import { recordAudit } from "../modules/audit/audit.service.js";

export type OrderScopeResult =
  | { allowed: true }
  | { allowed: false; status: 403; message: string };

/**
 * LOCAL_ADMIN folder-scope guard for Order access (code review 2026-07-05,
 * bug #4). `/api/admin/orders*` gated only on `verifyAdminAccess`, which
 * treats LOCAL_ADMIN the same as ADMIN — a LOCAL_ADMIN scoped to one
 * country's folder could read and edit every other country's orders
 * (name, email, phone, address), with no block and no audit trail.
 *
 * Orders aren't a PatientProfile resource, so this is a lighter,
 * order-specific sibling to guard-medical-read.ts rather than reusing that
 * PHI-specific guard (which writes MedicalAccessLog rows keyed by
 * patientProfileId — orders have no such row). ADMIN/SUPER_ADMIN are never
 * scoped; LOCAL_ADMIN is restricted to `User.allowedCountryFolders`.
 */
export async function assertOrderCountryScope(
  request: FastifyRequest,
  orderId: string,
  orderCountryCode: string,
): Promise<OrderScopeResult> {
  const actor = resolveAdminSessionActor(request);
  // No session (e.g. the admin-token Bearer fallback) — that path is
  // already fully unscoped ADMIN by design (see admin-auth.ts), so there's
  // no LOCAL_ADMIN folder to restrict.
  if (!actor || actor.role !== "LOCAL_ADMIN") return { allowed: true };

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { allowedCountryFolders: true },
  });
  const allowedFolders = (user?.allowedCountryFolders ?? []).map((f) => f.toLowerCase());
  const folder = orderCountryCode.toLowerCase();
  if (allowedFolders.includes(folder)) return { allowed: true };

  await recordAudit({
    actorUserId: actor.userId,
    actorRole: "LOCAL_ADMIN",
    action: "SECURITY_ALERT_CREATED",
    entityType: "Order",
    entityId: orderId,
    metadata: {
      reason: "LOCAL_ADMIN order access outside assigned country scope",
      attemptedCountryCode: folder,
      allowedCountryFolders: allowedFolders,
    },
    request,
  }).catch(() => {});

  return {
    allowed: false,
    status: 403,
    message: "This order is outside your assigned country scope",
  };
}

/** Folder list for scoping the admin order LIST/bulk query's Prisma
 *  where-clause. Returns null for ADMIN/SUPER_ADMIN/no-session (unscoped);
 *  returns the (possibly empty) folder list for a real LOCAL_ADMIN session. */
export async function resolveOrderListCountryScope(
  request: FastifyRequest,
): Promise<string[] | null> {
  const actor = resolveAdminSessionActor(request);
  if (!actor || actor.role !== "LOCAL_ADMIN") return null;
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { allowedCountryFolders: true },
  });
  return (user?.allowedCountryFolders ?? []).map((f) => f.toLowerCase());
}
