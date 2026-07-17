import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "./auth-session.js";

/**
 * Auth gate for /api/doctor/* WRITE endpoints.
 *
 * Returns the logged-in user's id + linked Doctor profile id when the
 * session belongs to a `role=DOCTOR` user (or ADMIN with a doctorId
 * link) who has been assigned to a Doctor profile.
 *
 * Refuses (401 / 403) when:
 *   - no session cookie or invalid JWT
 *   - user is not active
 *   - user role is not DOCTOR / ADMIN
 *   - user has no Doctor profile linked
 */
export type DoctorAuthResult =
  | {
      ok: true;
      userId: string;
      doctorId: string;
      email: string;
      /** "DOCTOR" or "ADMIN" — exposed so routes can gate admin-only
       *  surfaces (e.g. the downloadable patient-document archive). */
      role: "DOCTOR" | "ADMIN";
    }
  | { ok: false; status: 401 | 403; message: string };

/** No-op (returns false) unless the operator opted `role` into
 *  REQUIRE_2FA_FOR_ROLES — default empty, so this never fires today.
 *  Task 4: satisfied by EITHER TOTP enrollment OR a completed email-OTP
 *  verification — both stamp `twoFactorVerifiedAt`, so an account using
 *  the easy fallback isn't hard-blocked just for never enrolling TOTP. */
function require2faUnmet(
  role: string,
  twoFactorEnabled: boolean,
  twoFactorVerifiedAt: Date | null,
): boolean {
  return env.REQUIRE_2FA_FOR_ROLES.has(role) && !twoFactorEnabled && !twoFactorVerifiedAt;
}

const TWO_FA_REQUIRED_RESULT = {
  ok: false as const,
  status: 403 as const,
  message:
    "Two-factor authentication is required for this role. Sign in again to receive an email code, or enroll an authenticator app in account security settings.",
};

export async function verifyDoctorAccess(
  request: FastifyRequest,
): Promise<DoctorAuthResult> {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (payload.role !== "DOCTOR" && payload.role !== "ADMIN") {
    // Patients are explicitly bounced; admins are tolerated for support
    // workflows but they need a doctorId to read this surface, which
    // they typically won't have.
    return { ok: false, status: 403, message: "Doctor access required" };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true,
        doctorId: true,
        tokenVersion: true,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true,
      },
    });
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      return { ok: false, status: 401, message: "Not authenticated" };
    }
    if (require2faUnmet(user.role, user.twoFactorEnabled, user.twoFactorVerifiedAt)) {
      return TWO_FA_REQUIRED_RESULT;
    }
    if (!user.doctorId) {
      return {
        ok: false,
        status: 403,
        message: "No doctor profile is linked to this account",
      };
    }
    return {
      ok: true,
      userId: user.id,
      doctorId: user.doctorId,
      email: user.email,
      role: user.role as "DOCTOR" | "ADMIN",
    };
  } catch {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
}

/**
 * Permissive READ gate for clinical resources (print views, support
 * lookups). Allows ADMINs without a linked doctorId — they can read
 * any doctor's data — while DOCTORs are still scoped to their own
 * `User.doctorId` (returned in `doctorId`). Callers MUST branch on
 * `role` to decide whether to apply a `doctorId = ?` filter or read
 * across all doctors.
 *
 * Refuses identical 401/403 conditions to verifyDoctorAccess, minus
 * the "no doctorId linked" check for admins.
 */
export type ClinicalReadResult =
  | {
      ok: true;
      userId: string;
      role: "DOCTOR" | "ADMIN";
      /** Doctor's own profile id. Null when ADMIN without a link. */
      doctorId: string | null;
      email: string;
    }
  | { ok: false; status: 401 | 403; message: string };

/**
 * Per-doctor permission gate for manual appointment creation. ADMINs
 * always pass; DOCTORs need `Doctor.canCreateManualAppointments=true`.
 * Returns the same Result shape as `verifyDoctorAccess` so callers can
 * chain validations consistently.
 */
export async function verifyManualEntryPermission(
  request: FastifyRequest,
): Promise<DoctorAuthResult> {
  const auth = await verifyDoctorAccess(request);
  if (!auth.ok) return auth;
  // Resolve role again — verifyDoctorAccess collapses both DOCTOR and
  // ADMIN into the success branch; ADMIN bypasses the per-doctor flag.
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = token ? verifyAuthToken(token) : null;
  if (payload?.role === "ADMIN") return auth;
  const doctor = await prisma.doctor.findUnique({
    where: { id: auth.doctorId },
    select: { canCreateManualAppointments: true },
  });
  if (!doctor?.canCreateManualAppointments) {
    return {
      ok: false,
      status: 403,
      message:
        "Your account isn't enabled for manual entry. Ask an admin to enable it.",
    };
  }
  return auth;
}

export async function verifyClinicalReadAccess(
  request: FastifyRequest,
): Promise<ClinicalReadResult> {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (payload.role !== "DOCTOR" && payload.role !== "ADMIN") {
    return { ok: false, status: 403, message: "Clinical access required" };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true,
        doctorId: true,
        tokenVersion: true,
        twoFactorEnabled: true,
        twoFactorVerifiedAt: true,
      },
    });
    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      return { ok: false, status: 401, message: "Not authenticated" };
    }
    if (require2faUnmet(user.role, user.twoFactorEnabled, user.twoFactorVerifiedAt)) {
      return TWO_FA_REQUIRED_RESULT;
    }
    if (user.role === "DOCTOR" && !user.doctorId) {
      return {
        ok: false,
        status: 403,
        message: "No doctor profile is linked to this account",
      };
    }
    return {
      ok: true,
      userId: user.id,
      role: user.role as "DOCTOR" | "ADMIN",
      doctorId: user.doctorId ?? null,
      email: user.email,
    };
  } catch {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
}
