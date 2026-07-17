import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { alertUnauthorizedAccess } from "../modules/security-alerts/security-alert.service.js";

/**
 * Medical Access Guard — §22 of the repo security plan.
 *
 * ALL medical-record read paths MUST call assertMedicalAccess() before
 * returning any PHI. This function:
 *   1. Runs access checks in priority order (first match wins).
 *   2. Writes a MedicalAccessLog row as a side effect (always).
 *   3. Raises a SecurityAlert for denied or abnormal access.
 *   4. Throws MedicalAccessDeniedError if access is denied AND enforcement is on.
 *
 * ── Shadow vs Enforce ──────────────────────────────────────────────────────
 * Controlled by env.MEDICAL_ACCESS_ENFORCE:
 *   - false (default, SHADOW): a denied decision is still logged + alerted, but
 *     the guard returns { allowed:false } WITHOUT throwing — the caller proceeds.
 *     Lets the guard ship into a live system and build the audit trail before
 *     staff enroll 2FA / sign confidentiality / consent rows are backfilled.
 *   - true (ENFORCE): a denied decision throws MedicalAccessDeniedError.
 *
 * DB calls are individually wrapped in try/catch so a missing table
 * (during migrations) or a transient DB error never crashes a legitimate
 * medical read — it degrades gracefully to "deny + log failure".
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccessActor = {
  userId: string;
  role: string; // PATIENT | DOCTOR | ADMIN | LOCAL_ADMIN | SUPER_ADMIN
  name: string;
  doctorId?: string | null;
  countryCode?: string | null;
  adminScope?: string | null;
  allowedCountryFolders?: string[];
  twoFactorVerifiedAt?: Date | null;
  confidentialityAgreementAccepted?: boolean;
};

export type AccessResource = {
  patientProfileId: string;
  globalHealthNumber?: string | null;
  patientCountryFolder?: string | null;
  resourceType: string;
  /** VIEWED | DOWNLOADED | UPLOADED | UPDATED — required by MedicalAccessLog. */
  accessAction?: string;
  resourceId?: string | null;
  relatedAppointmentId?: string | null;
};

export type AccessContext = {
  actor: AccessActor;
  resource: AccessResource;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  loginSessionId?: string | null;
};

export type AccessResult = {
  allowed: boolean;
  consentLevelUsed?: string;
  denyReason?: string;
};

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class MedicalAccessDeniedError extends Error {
  readonly denyReason: string;
  constructor(denyReason: string) {
    super(`Medical access denied: ${denyReason}`);
    this.name = "MedicalAccessDeniedError";
    this.denyReason = denyReason;
  }
}

/**
 * Resolve a denied decision according to the enforcement mode.
 *  - ENFORCE: throw MedicalAccessDeniedError (caller returns 403).
 *  - SHADOW (default): return the deny result without throwing, so the caller
 *    proceeds. The access + alert have already been logged by the time this is
 *    called — shadow mode only suppresses the block, never the audit trail.
 */
function denyDecision(result: AccessResult): AccessResult {
  if (env.MEDICAL_ACCESS_ENFORCE) {
    throw new MedicalAccessDeniedError(result.denyReason ?? "ACCESS_DENIED");
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Fetch the userId associated with a PatientProfile. Returns null on error. */
async function getPatientUserId(patientProfileId: string): Promise<string | null> {
  try {
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: { userId: true },
    });
    return profile?.userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether the patient currently consents to the given access type.
 *
 * PatientConsent is APPEND-ONLY: there is no `isActive` flag. The current
 * state for a (patientProfileId, consentType) pair is the most recent row's
 * `consentValue`. A withdrawal is a newer row with consentValue=false.
 */
async function hasActiveConsent(
  patientProfileId: string,
  consentType: string,
): Promise<boolean> {
  try {
    const latest = await prisma.patientConsent.findFirst({
      where: { patientProfileId, consentType },
      orderBy: { createdAt: "desc" },
      select: { consentValue: true },
    });
    return latest?.consentValue === true;
  } catch {
    return false;
  }
}

/**
 * Check whether the doctor has a treatment relationship with this patient —
 * an appointment establishing doctor-of-record status. This includes
 * COMPLETED appointments: the doctor who ran the consult must keep access
 * afterward to write post-consult notes and review history. Only CANCELLED
 * is excluded (never treated the patient).
 *
 * Appointment does not carry patientProfileId directly — it links via
 * Appointment.userId which matches PatientProfile.userId.
 */
async function doctorHasTreatmentRelationship(
  doctorId: string,
  patientProfileId: string,
): Promise<boolean> {
  try {
    // Resolve the userId for this patient profile first.
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientProfileId },
      select: { userId: true },
    });
    if (!profile?.userId) return false;

    const appt = await prisma.appointment.findFirst({
      where: {
        doctorId,
        userId: profile.userId,
        status: { notIn: ["CANCELLED"] },
      },
      select: { id: true },
    });
    return appt !== null;
  } catch {
    return false;
  }
}

/** Check the MedicalAccessGrant table for a live cross-country grant.
 *  A grant is live when it is not revoked (revokedAt IS NULL) and not expired.
 *  `expiresAt` is a required column on the schema (never null). */
async function hasLiveGrant(
  actorUserId: string,
  patientProfileId: string,
): Promise<boolean> {
  try {
    const now = new Date();
    const grant = await prisma.medicalAccessGrant.findFirst({
      where: {
        grantedToUserId: actorUserId,
        patientProfileId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    return grant !== null;
  } catch {
    return false;
  }
}

/** Get the country's access model (returns null on error / not found). */
async function getCountryAccessModel(
  countryFolder: string,
): Promise<string | null> {
  try {
    // countryFolder stores the country code (e.g. "GB", "BR").
    const country = await prisma.country.findFirst({
      where: { code: countryFolder },
      select: { accessModel: true },
    });
    return country?.accessModel ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Side-effect helpers (silently swallow all errors)
// ---------------------------------------------------------------------------

async function writeMedicalAccessLog(
  ctx: AccessContext,
  result: AccessResult,
  isAbnormal: boolean,
): Promise<void> {
  try {
    await prisma.medicalAccessLog.create({
      data: {
        patientProfileId: ctx.resource.patientProfileId,
        globalHealthNumber: ctx.resource.globalHealthNumber ?? null,
        accessedByUserId: ctx.actor.userId,
        accessedByRole: ctx.actor.role,
        accessedByName: ctx.actor.name,
        accessedResourceType: ctx.resource.resourceType,
        accessedResourceId: ctx.resource.resourceId ?? null,
        accessAction: ctx.resource.accessAction ?? "VIEWED",
        relatedAppointmentId: ctx.resource.relatedAppointmentId ?? null,
        accessReason: ctx.reason ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        patientCountryFolder: ctx.resource.patientCountryFolder ?? null,
        actorCountry: ctx.actor.countryCode ?? null,
        loginSessionId: ctx.loginSessionId ?? null,
        consentLevelUsed: result.consentLevelUsed ?? null,
        isAbnormal,
        // No `accessGranted` / `denyReason` columns exist; surface the deny
        // reason via abnormalReason so denied attempts are explainable in the log.
        abnormalReason: result.allowed ? null : (result.denyReason ?? null),
      },
    });
  } catch {
    // Log failure must never break the calling endpoint.
  }
}

/** Raise a deduped, schema-correct SecurityAlert via the security-alert service
 *  (which carries severity/description/dedupeKey and matches the SecurityAlert
 *  model). dedupeKey is actor+patient+day-scoped inside the service, preventing
 *  alert storms on repeated denials. */
async function writeSecurityAlert(
  ctx: AccessContext,
  alertType: string,
  description: string,
): Promise<void> {
  try {
    await alertUnauthorizedAccess({
      actorId: ctx.actor.userId,
      actorRole: ctx.actor.role,
      patientId: ctx.resource.patientProfileId,
      globalHealthNumber: ctx.resource.globalHealthNumber ?? null,
      countryFolder: ctx.resource.patientCountryFolder ?? null,
      description,
      details: {
        alertType,
        resourceType: ctx.resource.resourceType,
        resourceId: ctx.resource.resourceId ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    });
  } catch {
    // Alert write failure must never block the calling flow.
  }
}

// ---------------------------------------------------------------------------
// Abnormal access detection
// ---------------------------------------------------------------------------

function detectAbnormal(ctx: AccessContext, result: AccessResult): boolean {
  const { actor, resource } = ctx;

  // Genuine anomaly: actor has an explicit country-folder scope and the
  // patient's folder is NOT in it, yet access still resolved. (Consent-based
  // clinic/global/grant access is NORMAL and intentionally not flagged here —
  // flagging it produced alert storms on every legitimate consented read.)
  if (
    result.allowed &&
    resource.patientCountryFolder &&
    actor.allowedCountryFolders &&
    actor.allowedCountryFolders.length > 0 &&
    !actor.allowedCountryFolders.includes(resource.patientCountryFolder)
  ) {
    return true;
  }

  // TODO: Detect repeated access in a short window (requires a separate
  // time-bucketed count query — deferred to avoid complexity here).

  return false;
}

// ---------------------------------------------------------------------------
// Main guard
// ---------------------------------------------------------------------------

/**
 * Assert that `ctx.actor` is allowed to access `ctx.resource`.
 *
 * Returns an AccessResult on success (allowed === true).
 * Throws MedicalAccessDeniedError if access is denied.
 *
 * Side effects: writes MedicalAccessLog + optionally SecurityAlert.
 */
export async function assertMedicalAccess(
  ctx: AccessContext,
): Promise<AccessResult> {
  const { actor, resource } = ctx;

  let result: AccessResult;
  let isAbnormal = false;

  // ------------------------------------------------------------------
  // 1. SUPER_ADMIN / ADMIN (global scope) — unconditional allow
  // ------------------------------------------------------------------
  if (actor.role === "SUPER_ADMIN" || actor.role === "ADMIN") {
    // S-002: optional break-glass reason for PLAIN ADMIN. Default OFF — when
    // env.ADMIN_PHI_REQUIRE_REASON is on, a plain ADMIN must supply ctx.reason
    // to read a record; a reasonless attempt is denied + logged. SUPER_ADMIN is
    // always unconditional. When the flag is off this branch is byte-identical
    // to the previous behaviour.
    if (actor.role === "ADMIN" && env.ADMIN_PHI_REQUIRE_REASON && !ctx.reason?.trim()) {
      result = { allowed: false, denyReason: "ADMIN_BREAK_GLASS_REASON_REQUIRED" };
      await writeMedicalAccessLog(ctx, result, false);
      return denyDecision(result);
    }
    result = { allowed: true, consentLevelUsed: "ADMIN_OVERRIDE" };
    isAbnormal = detectAbnormal(ctx, result);
    await writeMedicalAccessLog(ctx, result, isAbnormal);
    return result;
  }

  // ------------------------------------------------------------------
  // 2. PATIENT accessing their own record
  // ------------------------------------------------------------------
  if (actor.role === "PATIENT") {
    const patientUserId = await getPatientUserId(resource.patientProfileId);
    if (patientUserId && patientUserId === actor.userId) {
      result = { allowed: true, consentLevelUsed: "SELF" };
      await writeMedicalAccessLog(ctx, result, false);
      return result;
    }
    // Patient trying to access someone else's record
    result = { allowed: false, denyReason: "PATIENT_NOT_OWN_RECORD" };
    await writeMedicalAccessLog(ctx, result, true);
    await writeSecurityAlert(
      ctx,
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      `Patient ${actor.userId} attempted to access records for ${resource.patientProfileId}`,
    );
    return denyDecision(result);
  }

  // ------------------------------------------------------------------
  // 3. LOCAL_ADMIN — allow only if patient's folder is in their scope
  // ------------------------------------------------------------------
  if (actor.role === "LOCAL_ADMIN") {
    const folder = resource.patientCountryFolder;
    const allowed =
      !!folder &&
      !!actor.allowedCountryFolders &&
      actor.allowedCountryFolders.includes(folder);

    if (allowed) {
      result = { allowed: true, consentLevelUsed: "LOCAL_ADMIN_SCOPE" };
      await writeMedicalAccessLog(ctx, result, false);
      return result;
    }

    result = { allowed: false, denyReason: "LOCAL_ADMIN_OUT_OF_SCOPE" };
    isAbnormal = true;
    await writeMedicalAccessLog(ctx, result, isAbnormal);
    await writeSecurityAlert(
      ctx,
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      `LOCAL_ADMIN ${actor.userId} accessed patient outside allowed folders (${folder ?? "unknown"})`,
    );
    return denyDecision(result);
  }

  // ------------------------------------------------------------------
  // 4. DOCTOR — layered consent checks
  // ------------------------------------------------------------------
  if (actor.role === "DOCTOR") {
    // 4a. Must have signed confidentiality agreement
    if (!actor.confidentialityAgreementAccepted) {
      result = { allowed: false, denyReason: "DOCTOR_NO_CONFIDENTIALITY_AGREEMENT" };
      await writeMedicalAccessLog(ctx, result, false);
      await writeSecurityAlert(
        ctx,
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        `Doctor ${actor.userId} attempted record access without confidentiality agreement`,
      );
      return denyDecision(result);
    }

    // 4b. Must have completed 2FA (normal deny, no alert)
    if (!actor.twoFactorVerifiedAt) {
      result = { allowed: false, denyReason: "DOCTOR_2FA_REQUIRED" };
      await writeMedicalAccessLog(ctx, result, false);
      // REQUIRE_2FA_FOR_ROLES (default empty — never true today) hard-rejects
      // this specific deny even in MEDICAL_ACCESS_ENFORCE shadow mode, so a
      // role deliberately opted in can't silently fall through unverified.
      // Unset/empty flag => identical to the pre-existing denyDecision() path.
      if (env.REQUIRE_2FA_FOR_ROLES.has(actor.role)) {
        throw new MedicalAccessDeniedError(
          "DOCTOR_2FA_REQUIRED: enroll and verify TOTP two-factor authentication before accessing medical records.",
        );
      }
      return denyDecision(result);
    }

    // 4c. Direct consent + active appointment
    const hasDirect = await hasActiveConsent(
      resource.patientProfileId,
      "MEDICAL_ACCESS_DIRECT",
    );
    if (hasDirect && actor.doctorId) {
      const hasAppt = await doctorHasTreatmentRelationship(
        actor.doctorId,
        resource.patientProfileId,
      );
      if (hasAppt) {
        result = { allowed: true, consentLevelUsed: "DIRECT_ONLY" };
        await writeMedicalAccessLog(ctx, result, false);
        return result;
      }
    }

    // 4d. Country-clinic consent — doctor's country matches patient folder
    //     AND patient has country-clinic consent AND country is accessModel=CLINIC
    if (actor.countryCode && resource.patientCountryFolder) {
      const folderMatchesCountry =
        resource.patientCountryFolder.toLowerCase() ===
        actor.countryCode.toLowerCase();

      if (folderMatchesCountry) {
        const [hasClinicConsent, accessModel] = await Promise.all([
          hasActiveConsent(
            resource.patientProfileId,
            "MEDICAL_ACCESS_COUNTRY_CLINIC",
          ),
          getCountryAccessModel(resource.patientCountryFolder),
        ]);

        if (hasClinicConsent && accessModel === "CLINIC") {
          result = { allowed: true, consentLevelUsed: "COUNTRY_CLINIC" };
          isAbnormal = detectAbnormal(ctx, result);
          await writeMedicalAccessLog(ctx, result, isAbnormal);
          return result;
        }
      }
    }

    // 4e. Global network consent
    const hasGlobal = await hasActiveConsent(
      resource.patientProfileId,
      "MEDICAL_ACCESS_GLOBAL_NETWORK",
    );
    if (hasGlobal) {
      result = { allowed: true, consentLevelUsed: "GLOBAL_NETWORK" };
      isAbnormal = detectAbnormal(ctx, result);
      await writeMedicalAccessLog(ctx, result, isAbnormal);
      return result;
    }

    // 4f. Live cross-country grant
    const hasGrant = await hasLiveGrant(actor.userId, resource.patientProfileId);
    if (hasGrant) {
      result = { allowed: true, consentLevelUsed: "CROSS_COUNTRY_GRANT" };
      await writeMedicalAccessLog(ctx, result, false);
      return result;
    }

    // 4g. All doctor checks failed
    result = { allowed: false, denyReason: "DOCTOR_NO_VALID_ACCESS_PATH" };
    isAbnormal = true;
    await writeMedicalAccessLog(ctx, result, isAbnormal);
    await writeSecurityAlert(
      ctx,
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      `Doctor ${actor.userId} (doctorId=${actor.doctorId ?? "unknown"}) failed all access checks for patient ${resource.patientProfileId}`,
    );
    return denyDecision(result);
  }

  // ------------------------------------------------------------------
  // 5. Any other role — deny
  // ------------------------------------------------------------------
  result = { allowed: false, denyReason: "ROLE_NOT_PERMITTED" };
  await writeMedicalAccessLog(ctx, result, false);
  return denyDecision(result);
}
