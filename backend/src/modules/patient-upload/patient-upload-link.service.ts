import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { normalizeDbError } from "../shared/db-errors.js";

// SF5 (code review 2026-07-05): was a 100-year, unrevocable HMAC-signed
// token with no server-side record — a leaked link (forwarded email, browser
// history) was valid effectively forever and could never be individually
// invalidated. Now backed by a DB row: short TTL, hash-only storage (a DB
// leak doesn't hand out usable tokens), and revocable.
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type PatientUploadTokenClaims = {
  email: string;
  appointmentId: string;
  doctorId: string;
  /** When set, binds the link to one exams prescription (v3 layout). */
  documentId?: string;
};

/**
 * Mint a new patient-upload token. Any still-active link previously issued
 * for the same (email, appointmentId, documentId) scope is revoked in the
 * same transaction — re-sending a link (the doctor's "resend" action) is
 * the natural revoke trigger, so a stale forwarded link stops working the
 * moment a fresh one is issued.
 */
export async function createPatientUploadToken(
  claims: PatientUploadTokenClaims,
): Promise<{ token: string; expiresAt: Date }> {
  const normalizedEmail = claims.email.trim().toLowerCase();
  const appointmentId = claims.appointmentId.trim();
  const doctorId = claims.doctorId.trim();
  const documentId = claims.documentId?.trim() || null;
  if (!normalizedEmail || !appointmentId || !doctorId) {
    throw new Error("email, appointmentId and doctorId are required");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  try {
    await prisma.$transaction([
      prisma.patientUploadLink.updateMany({
        where: { email: normalizedEmail, appointmentId, documentId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.patientUploadLink.create({
        data: { tokenHash, email: normalizedEmail, appointmentId, doctorId, documentId, expiresAt },
      }),
    ]);
  } catch (error) {
    throw normalizeDbError(error, "Could not create upload link");
  }

  return { token, expiresAt };
}

export async function verifyPatientUploadToken(
  token: string,
): Promise<
  | { ok: true; email: string; appointmentId: string; doctorId: string; documentId?: string }
  | { ok: false; message: string }
> {
  try {
    const tokenHash = hashToken(token);
    const row = await prisma.patientUploadLink.findUnique({ where: { tokenHash } });
    if (!row) return { ok: false, message: "Invalid upload link" };
    if (row.revokedAt) return { ok: false, message: "Upload link has been revoked" };
    if (row.expiresAt.getTime() < Date.now()) {
      return { ok: false, message: "Upload link has expired" };
    }

    // Diagnostic only — never gates access, so a failed write here must
    // never fail the upload itself.
    prisma.patientUploadLink
      .update({ where: { tokenHash }, data: { usedAt: new Date() } })
      .catch(() => {});

    return {
      ok: true,
      email: row.email,
      appointmentId: row.appointmentId,
      doctorId: row.doctorId,
      documentId: row.documentId ?? undefined,
    };
  } catch {
    return { ok: false, message: "Invalid upload link" };
  }
}

export function buildPatientUploadUrl(token: string): string {
  const base = (env.PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/patient-upload?token=${encodeURIComponent(token)}`;
}
