import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken } from "./auth-session.js";

type CurrentAdmin = {
  role: string;
  allowedCountryFolders: string[];
};

type CountryScopeAudit = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: "SECURITY_ALERT_CREATED";
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
};

export type AdminCountryScopeDependencies = {
  findCountry(countryId: string): Promise<{ code: string } | null>;
  findCurrentAdmin(userId: string): Promise<CurrentAdmin | null>;
  auditDenied(input: CountryScopeAudit): Promise<void>;
};

export type AdminAuthenticatedAccess = Extract<AdminAccessResult, { ok: true }>;

export type AdminCountryScopeResult =
  | { allowed: true; countryCode: string }
  | { allowed: false; status: 403 | 404 | 503; message: string };

export type AdminCountryScopeInput = {
  request: FastifyRequest;
  authenticatedAccess: AdminAuthenticatedAccess;
  countryId: string;
  operation: string;
  resourceType: string;
  resourceId?: string;
};

export type NestedCountryOwnershipInput = {
  request: FastifyRequest;
  authenticatedAccess: AdminAuthenticatedAccess;
  operation: string;
  routeCountryId: string;
  routeCountryCode: string;
  resourceCountryId: string;
  resourceType: string;
  resourceId: string;
};

export type NestedCountryOwnershipAuditDependencies = {
  auditDenied(input: CountryScopeAudit): Promise<void>;
};

const defaultDependencies: AdminCountryScopeDependencies = {
  findCountry: (countryId) =>
    prisma.country.findUnique({ where: { id: countryId }, select: { code: true } }),
  findCurrentAdmin: (userId) =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, allowedCountryFolders: true },
    }),
  auditDenied: (input) => recordAudit(input),
};

function normalizeCountryCode(value: string): string {
  return value.trim().toLowerCase();
}

function resolveSessionSubject(request: FastifyRequest): string | null {
  const token = request.cookies?.[env.AUTH_COOKIE_NAME];
  return token ? verifyAuthToken(token)?.sub ?? null : null;
}

/**
 * Authorize an already-authenticated admin against one country resource.
 * The JWT supplies only the user id. Role and folder assignments always come
 * from the current database row, so demotions and scope changes take effect
 * immediately. The configured maintenance-token fallback remains unscoped.
 */
export function createAdminCountryScopeGuard(
  dependencies: AdminCountryScopeDependencies = defaultDependencies,
) {
  return async function verifyAdminCountryScope(
    input: AdminCountryScopeInput,
  ): Promise<AdminCountryScopeResult> {
    let country: { code: string } | null;
    try {
      country = await dependencies.findCountry(input.countryId);
    } catch {
      return {
        allowed: false,
        status: 503,
        message: "Country authorization is temporarily unavailable",
      };
    }
    if (!country) {
      return { allowed: false, status: 404, message: "Country not found" };
    }

    const countryCode = normalizeCountryCode(country.code);
    if (input.authenticatedAccess.method === "token_fallback") {
      return { allowed: true, countryCode };
    }

    const userId = resolveSessionSubject(input.request);
    if (!userId) {
      return {
        allowed: false,
        status: 403,
        message: "Admin account scope could not be verified",
      };
    }

    let currentAdmin: CurrentAdmin | null;
    try {
      currentAdmin = await dependencies.findCurrentAdmin(userId);
    } catch {
      return {
        allowed: false,
        status: 503,
        message: "Country authorization is temporarily unavailable",
      };
    }
    if (!currentAdmin) {
      return {
        allowed: false,
        status: 403,
        message: "Admin account scope could not be verified",
      };
    }
    if (currentAdmin.role === "ADMIN" || currentAdmin.role === "SUPER_ADMIN") {
      return { allowed: true, countryCode };
    }

    if (currentAdmin.role !== "LOCAL_ADMIN") {
      return {
        allowed: false,
        status: 403,
        message: "Admin account scope could not be verified",
      };
    }

    const allowedCountryFolders = currentAdmin.allowedCountryFolders
      .map(normalizeCountryCode)
      .filter(Boolean);
    if (allowedCountryFolders.includes(countryCode)) {
      return { allowed: true, countryCode };
    }

    // This audit payload is deliberately PHI-free. In particular, request
    // body/query content is never forwarded into the durable event.
    try {
      await dependencies.auditDenied({
        actorUserId: userId,
        actorRole: "LOCAL_ADMIN",
        action: "SECURITY_ALERT_CREATED",
        entityType: "Country",
        entityId: input.countryId,
        metadata: {
          reason: "LOCAL_ADMIN access outside assigned country scope",
          operation: input.operation,
          resourceType: input.resourceType,
          resourceId: input.resourceId ?? null,
          attemptedCountryCode: countryCode,
          allowedCountryFolders,
        },
        ipAddress: input.request.ip ?? null,
      });
    } catch {
      // Authorization is fail-closed even if the operational audit sink is
      // unavailable. Never turn an audit outage into a scope bypass.
    }

    return {
      allowed: false,
      status: 403,
      message: "This country is outside your assigned scope",
    };
  };
}

export const verifyAdminCountryScope = createAdminCountryScopeGuard();

/** Audit a nested resource whose owner country does not match the country in
 * the route. The sink receives only operational identifiers and client IP;
 * request body, query, and headers are intentionally excluded. */
export function createNestedCountryOwnershipAuditor(
  dependencies: NestedCountryOwnershipAuditDependencies = {
    auditDenied: (input) => recordAudit(input),
  },
) {
  return async function auditNestedCountryOwnershipMismatch(
    input: NestedCountryOwnershipInput,
  ): Promise<void> {
    const actorUserId =
      input.authenticatedAccess.method === "session"
        ? resolveSessionSubject(input.request)
        : null;
    try {
      await dependencies.auditDenied({
        actorUserId,
        actorRole:
          input.authenticatedAccess.method === "token_fallback"
            ? "ADMIN_TOKEN_FALLBACK"
            : "ADMIN_SESSION",
        action: "SECURITY_ALERT_CREATED",
        entityType: input.resourceType,
        entityId: input.resourceId,
        metadata: {
          reason: "Nested resource country mismatch",
          operation: input.operation,
          routeCountryId: input.routeCountryId,
          routeCountryCode: normalizeCountryCode(input.routeCountryCode),
          resourceCountryId: input.resourceCountryId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
        },
        ipAddress: input.request.ip ?? null,
      });
    } catch {
      // The ownership denial remains fail-closed if the audit sink is down.
    }
  };
}

export const auditNestedCountryOwnershipMismatch =
  createNestedCountryOwnershipAuditor();
