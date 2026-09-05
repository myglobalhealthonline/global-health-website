// LOCAL_ADMIN country-folder scoping for admin resources.
//
// The filename is legacy: this started as the Order-only guard from the
// 2026-07-05 review and now also backs `/api/admin/invoices*`,
// `/api/admin/appointments*` and `/api/admin/calendar` (AZ-1). The rename is
// deliberately deferred so an authorization fix does not arrive bundled with an
// import churn across four route files.
import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { resolveAdminSessionActor } from "./admin-auth.js";
import { recordAudit } from "../modules/audit/audit.service.js";

export type CountryFolderScopeResult =
  | { allowed: true }
  | { allowed: false; status: 403; message: string };

export type CountryFolderScopeInput = {
  /** Audit `entityType` — the resource being reached for, e.g. "Order". */
  entityType: string;
  entityId: string;
  /** The resource's own country code. Compared case-insensitively. */
  countryCode: string;
  /** Denial message. Names the resource, never the country the admin asked for. */
  deniedMessage: string;
  auditReason: string;
};

/**
 * LOCAL_ADMIN folder-scope check for one country-owned admin resource.
 *
 * Extracted from `assertOrderCountryScope` (below, unchanged in behaviour) when
 * AZ-1 found the same missing check on `/api/admin/appointments*` and
 * `/api/admin/calendar`. Only the audit `entityType`, the audit reason and the
 * denial message vary per resource — the decision itself is identical, so it
 * lives here once rather than being copied into an appointment-shaped clone.
 *
 * ADMIN, SUPER_ADMIN and the unscoped admin-token fallback are never
 * restricted; only a real LOCAL_ADMIN session is.
 */
export async function assertAdminCountryFolderScope(
  request: FastifyRequest,
  input: CountryFolderScopeInput,
): Promise<CountryFolderScopeResult> {
  const actor = resolveAdminSessionActor(request);
  // No session (e.g. the admin-token Bearer fallback) — that path is already
  // fully unscoped ADMIN by design (see admin-auth.ts), so there is no
  // LOCAL_ADMIN folder to restrict.
  if (!actor || actor.role !== "LOCAL_ADMIN") return { allowed: true };

  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { allowedCountryFolders: true },
  });
  const allowedFolders = (user?.allowedCountryFolders ?? []).map((f) => f.toLowerCase());
  const folder = input.countryCode.toLowerCase();
  if (allowedFolders.includes(folder)) return { allowed: true };

  // PHI-free by construction: operational identifiers and client IP only.
  await recordAudit({
    actorUserId: actor.userId,
    actorRole: "LOCAL_ADMIN",
    action: "SECURITY_ALERT_CREATED",
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: {
      reason: input.auditReason,
      attemptedCountryCode: folder,
      allowedCountryFolders: allowedFolders,
    },
    request,
  }).catch(() => {});

  return { allowed: false, status: 403, message: input.deniedMessage };
}

/**
 * Folder list for clamping any admin LIST/calendar query's Prisma where-clause.
 * Returns null for ADMIN/SUPER_ADMIN/no-session (unscoped); returns the
 * (possibly empty) folder list for a real LOCAL_ADMIN session — an empty list
 * means that admin sees nothing, never everything.
 */
export async function resolveAdminListCountryFolders(
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

/**
 * Combine an admin's explicit `?countryCode=` filter with their folder scope.
 * Requesting a country outside scope must return zero rows — not the scope's
 * full set (which would silently ignore the admin's filter) and not every
 * country (which would leak out-of-scope rows). Mirrors the clause
 * `/api/admin/orders` has built inline since the 2026-07-05 review.
 */
export function buildCountryCodeFilter(
  requestedCountryCode: string | undefined,
  scopedFolders: string[] | null,
): string | { in: string[] } | undefined {
  if (requestedCountryCode && scopedFolders) {
    const requested = requestedCountryCode.toLowerCase();
    return scopedFolders.includes(requested) ? requested : { in: [] };
  }
  if (requestedCountryCode) return requestedCountryCode.toLowerCase();
  if (scopedFolders) return { in: scopedFolders };
  return undefined;
}

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
): Promise<CountryFolderScopeResult> {
  return assertAdminCountryFolderScope(request, {
    entityType: "Order",
    entityId: orderId,
    countryCode: orderCountryCode,
    auditReason: "LOCAL_ADMIN order access outside assigned country scope",
    deniedMessage: "This order is outside your assigned country scope",
  });
}

/** Folder list for scoping the admin order LIST/bulk query's Prisma
 *  where-clause. Returns null for ADMIN/SUPER_ADMIN/no-session (unscoped);
 *  returns the (possibly empty) folder list for a real LOCAL_ADMIN session. */
export async function resolveOrderListCountryScope(
  request: FastifyRequest,
): Promise<string[] | null> {
  return resolveAdminListCountryFolders(request);
}
