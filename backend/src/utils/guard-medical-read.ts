import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  assertMedicalAccess,
  MedicalAccessDeniedError,
  type AccessResult,
} from "../lib/medical-access-guard.js";
import { hasAcceptedCurrentAgreement } from "../modules/confidentiality/confidentiality.service.js";

export { MedicalAccessDeniedError };

/** Explicit actor identity, taken from the route's auth gate
 *  (verifyDoctorAccess / verifyAdminAccess / requireAuth). We don't read
 *  request.authUser because several PHI routes authenticate via the verify*
 *  helpers which don't populate it. */
export type GuardActor = {
  userId: string;
  /** PATIENT | DOCTOR | ADMIN | LOCAL_ADMIN | SUPER_ADMIN */
  role: string;
  /** Doctor profile id when the actor is a doctor (from verifyDoctorAccess). */
  doctorId?: string | null;
};

export type GuardMedicalReadArgs = {
  /** The PatientProfile.id whose PHI is being accessed. */
  patientProfileId: string;
  /** MEDICAL_DOC | CONSULT_NOTE | PRESCRIPTION | EXAM_REQUEST | EXAM_RESULT |
   *  ID_DOC | NATIONALITY_DOC | SENSITIVE_PROFILE | INSURANCE_DOC */
  resourceType: string;
  /** VIEWED | DOWNLOADED | UPLOADED | UPDATED (default VIEWED). */
  accessAction?: string;
  resourceId?: string | null;
  relatedAppointmentId?: string | null;
  reason?: string;
};

/**
 * Single entry point every PHI read path calls before returning medical data.
 *
 * Resolves the actor (role, doctor country + confidentiality + 2FA, admin
 * scope) and the patient resource context (GHN + country folder) from the
 * authenticated request, then delegates to `assertMedicalAccess`, which logs
 * the access and raises alerts as side effects.
 *
 * Behaviour:
 *  - SHADOW mode (env.MEDICAL_ACCESS_ENFORCE=false, default): never throws on a
 *    deny decision — the access is logged + alerted and the caller proceeds.
 *  - ENFORCE mode: throws `MedicalAccessDeniedError` on deny; callers map it to
 *    a 403. A missing session always throws (the route's own auth should have
 *    caught that already).
 *
 * Usage in a route handler:
 *   try {
 *     await guardMedicalRead(request, { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
 *       { patientProfileId, resourceType: "SENSITIVE_PROFILE" });
 *   } catch (e) {
 *     if (e instanceof MedicalAccessDeniedError) {
 *       return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
 *     }
 *     throw e;
 *   }
 */
/** S-002 break-glass: resolve the access reason. Priority: explicit
 *  `args.reason` from the route, then the `x-phi-reason` request header,
 *  then the short-TTL `gh_phi_reason` cookie set by the admin UI reason
 *  gate. The cookie path means plain `<a href>` document downloads carry
 *  the reason too — no per-route threading needed. Values are decoded,
 *  trimmed and capped before landing in MedicalAccessLog.accessReason. */
function resolvePhiReason(
  request: FastifyRequest,
  explicit?: string,
): string | undefined {
  const header = request.headers["x-phi-reason"];
  const cookie = (request.cookies as Record<string, string | undefined> | undefined)?.[
    "gh_phi_reason"
  ];
  let raw = explicit ?? (typeof header === "string" ? header : undefined) ?? cookie;
  if (!raw) return undefined;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep the raw value if it isn't valid percent-encoding
  }
  const trimmed = raw.trim().slice(0, 500);
  return trimmed || undefined;
}

export async function guardMedicalRead(
  request: FastifyRequest,
  actor: GuardActor,
  args: GuardMedicalReadArgs,
): Promise<AccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: {
      fullName: true,
      email: true,
      doctorId: true,
      adminScope: true,
      allowedCountryFolders: true,
      twoFactorVerifiedAt: true,
    },
  });

  const doctorId = actor.doctorId ?? user?.doctorId ?? null;
  let countryCode: string | null = null;
  let confidentialityAccepted = false;

  if (actor.role === "DOCTOR" && doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { country: { select: { code: true } } },
    });
    countryCode = doctor?.country?.code ?? null;
    confidentialityAccepted = await hasAcceptedCurrentAgreement(doctorId);
  }

  const patient = await prisma.patientProfile.findUnique({
    where: { id: args.patientProfileId },
    select: { globalHealthNumber: true, countryFolderCode: true },
  });

  const forwarded = request.headers["x-forwarded-for"];
  const ipAddress =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ??
    request.ip ??
    null;
  const userAgent = request.headers["user-agent"] ?? null;

  return assertMedicalAccess({
    actor: {
      userId: actor.userId,
      role: actor.role,
      name: user?.fullName ?? user?.email ?? actor.userId,
      doctorId,
      countryCode,
      adminScope: user?.adminScope ?? null,
      // allowedCountryFolders is an admin-scoping concept. Doctors get [] so a
      // legitimate consent/grant-based cross-folder read is not flagged abnormal.
      allowedCountryFolders:
        actor.role === "DOCTOR" ? [] : (user?.allowedCountryFolders ?? []),
      twoFactorVerifiedAt: user?.twoFactorVerifiedAt ?? null,
      confidentialityAgreementAccepted: confidentialityAccepted,
    },
    resource: {
      patientProfileId: args.patientProfileId,
      globalHealthNumber: patient?.globalHealthNumber ?? null,
      patientCountryFolder: patient?.countryFolderCode ?? null,
      resourceType: args.resourceType,
      accessAction: args.accessAction,
      resourceId: args.resourceId ?? null,
      relatedAppointmentId: args.relatedAppointmentId ?? null,
    },
    reason: resolvePhiReason(request, args.reason),
    ipAddress,
    userAgent,
  });
}
