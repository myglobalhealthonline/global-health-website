import { prisma } from "../db/prisma.js";

/**
 * Medical Access Guard — §22 of the repo security plan.
 *
 * ALL medical-record read paths MUST call assertMedicalAccess() before
 * returning any PHI. This function:
 *   1. Runs access checks in priority order (first match wins).
 *   2. Writes a MedicalAccessLog row as a side effect (always).
 *   3. Creates a SecurityAlert for denied or abnormal access.
 *   4. Throws MedicalAccessDeniedError if access is not granted.
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

/** Check whether the patient has an active consent of the given type. */
async function hasActiveConsent(
  patientProfileId: string,
  consentType: string,
): Promise<boolean> {
  try {
    const consent = await (prisma as any).patientConsent.findFirst({
      where: {
        patientProfileId,
        consentType,
        isActive: true,
      },
      select: { id: true },
    });
    return consent !== null;
  } catch {
    return false;
  }
}

/**
 * Check whether the doctor has an active (non-cancelled/completed) appointment
 * with this patient.
 *
 * Appointment does not carry patientProfileId directly — it links via
 * Appointment.userId which matches PatientProfile.userId.
 */
async function doctorHasActiveAppointment(
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
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: { id: true },
    });
    return appt !== null;
  } catch {
    return false;
  }
}

/** Check the MedicalAccessGrant table for a live cross-country grant. */
async function hasLiveGrant(
  actorUserId: string,
  patientProfileId: string,
): Promise<boolean> {
  try {
    const now = new Date();
    const grant = await (prisma as any).medicalAccessGrant.findFirst({
      where: {
        grantedToUserId: actorUserId,
        patientProfileId,
        isRevoked: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
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
    // Cast through any: the generated client may lag the schema if prisma
    // generate hasn't been re-run after adding accessModel.
    const country = await (prisma.country.findFirst as any)({
      where: { code: countryFolder },
      select: { accessModel: true },
    }) as { accessModel: string } | null;
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
    await (prisma as any).medicalAccessLog.create({
      data: {
        patientProfileId: ctx.resource.patientProfileId,
        globalHealthNumber: ctx.resource.globalHealthNumber ?? null,
        accessedByUserId: ctx.actor.userId,
        accessedByRole: ctx.actor.role,
        accessedByName: ctx.actor.name,
        accessedResourceType: ctx.resource.resourceType,
        accessedResourceId: ctx.resource.resourceId ?? null,
        relatedAppointmentId: ctx.resource.relatedAppointmentId ?? null,
        accessReason: ctx.reason ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        loginSessionId: ctx.loginSessionId ?? null,
        accessGranted: result.allowed,
        consentLevelUsed: result.consentLevelUsed ?? null,
        denyReason: result.denyReason ?? null,
        isAbnormal,
      },
    });
  } catch {
    // Log failure must never break the calling endpoint.
  }
}

async function writeSecurityAlert(
  ctx: AccessContext,
  alertType: string,
  detail: string,
): Promise<void> {
  try {
    await (prisma as any).securityAlert.create({
      data: {
        alertType,
        userId: ctx.actor.userId,
        patientProfileId: ctx.resource.patientProfileId,
        detail,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        resolved: false,
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

  // Doctor accessed with no direct appointment relationship and no grant
  if (
    actor.role === "DOCTOR" &&
    result.allowed &&
    result.consentLevelUsed !== "DIRECT_ONLY" &&
    result.consentLevelUsed !== "CROSS_COUNTRY_GRANT"
  ) {
    return true;
  }

  // Actor's assigned country folders don't include the patient's folder
  if (
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
    throw new MedicalAccessDeniedError(result.denyReason!);
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
    throw new MedicalAccessDeniedError(result.denyReason!);
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
      throw new MedicalAccessDeniedError(result.denyReason!);
    }

    // 4b. Must have completed 2FA (normal deny, no alert)
    if (!actor.twoFactorVerifiedAt) {
      result = { allowed: false, denyReason: "DOCTOR_2FA_REQUIRED" };
      await writeMedicalAccessLog(ctx, result, false);
      throw new MedicalAccessDeniedError(result.denyReason!);
    }

    // 4c. Direct consent + active appointment
    const hasDirect = await hasActiveConsent(
      resource.patientProfileId,
      "MEDICAL_ACCESS_DIRECT",
    );
    if (hasDirect && actor.doctorId) {
      const hasAppt = await doctorHasActiveAppointment(
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
    throw new MedicalAccessDeniedError(result.denyReason!);
  }

  // ------------------------------------------------------------------
  // 5. Any other role — deny
  // ------------------------------------------------------------------
  result = { allowed: false, denyReason: "ROLE_NOT_PERMITTED" };
  await writeMedicalAccessLog(ctx, result, false);
  throw new MedicalAccessDeniedError(result.denyReason!);
}
