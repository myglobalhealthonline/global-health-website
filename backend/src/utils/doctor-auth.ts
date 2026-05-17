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
  | { ok: true; userId: string; doctorId: string; email: string }
  | { ok: false; status: 401 | 403; message: string };

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
      select: { id: true, email: true, isActive: true, role: true, doctorId: true },
    });
    if (!user || !user.isActive) {
      return { ok: false, status: 401, message: "Not authenticated" };
    }
    if (!user.doctorId) {
      return {
        ok: false,
        status: 403,
        message: "No doctor profile is linked to this account",
      };
    }
    return { ok: true, userId: user.id, doctorId: user.doctorId, email: user.email };
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
      select: { id: true, email: true, isActive: true, role: true, doctorId: true },
    });
    if (!user || !user.isActive) {
      return { ok: false, status: 401, message: "Not authenticated" };
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
