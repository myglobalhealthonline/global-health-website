import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { UserRole, VerificationStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  encryptPhiFields,
  decryptPhiFields,
  encryptClinicalFields,
  decryptClinicalFields,
} from "../../lib/crypto/phi-crypto.js";
import { generateGlobalHealthNumber } from "../../lib/global-health-number.js";
import { linkAppointmentsToPatientProfile } from "./appointment-patient-link.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../../lib/blind-index.js";
import {
  AlertRemovalRequiresNoteError,
  normalizeAlert,
} from "./patient-alert-log.service.js";

/**
 * Compute the nameDob blind index from a (fullName, dob) pair. Returns null
 * unless BOTH are present — a half-identity isn't a usable dedup key.
 */
function nameDobHashFor(
  fullName: string | null | undefined,
  dob: Date | null | undefined,
): string | null {
  if (!fullName || !dob) return null;
  return computeNameDobBlindIndex(fullName, dob);
}

export async function upsertPatientProfileByEmail(
  input: {
    email: string;
    fullName?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    /** Clinic/data-residency folder (lowercase Country.code), e.g. from the
     *  booking's countryCode. Only ever fills a missing value — matches
     *  backfill-country-folder-code.ts's "never overwrite" rule, since an
     *  existing folder may already reflect a deliberate, different
     *  assignment. */
    countryFolderCode?: string | null;
  },
  options?: {
    /** Pre-computed bcrypt hash to use when creating the User row.
     *  Skips the throwaway random-placeholder hash + saves a bcrypt
     *  round when the caller already needs a real password (e.g. the
     *  admin manual-booking flow that generates a temp password the
     *  patient will use to log in). Ignored when the user already
     *  exists. */
    passwordHashOverride?: string;
    /** Set User.mustChangePassword when creating the row. Used by the
     *  manual-booking flow so the patient is force-redirected to the
     *  change-password page on first sign-in. */
    mustChangePassword?: boolean;
    /** Correct an existing countryFolderCode instead of only filling a null
     *  one. A manual booking's country is derived from the service being
     *  booked (never patient-entered), so it's more authoritative than a
     *  stale folder value — unlike self-service signup, where an existing
     *  folder may reflect a deliberate, different assignment. Without this,
     *  a profile that picked up a wrong/stale folder (e.g. from
     *  backfill-country-folder-code.ts) stays stuck on it forever and
     *  disappears from that country's admin patient list even though every
     *  subsequent booking is in the correct country. */
    overwriteCountryFolder?: boolean;
  },
) {
  const email = input.email.trim().toLowerCase();
  try {
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    const created = !user;
    if (!user) {
      const newHash =
        options?.passwordHashOverride ??
        (await bcrypt.hash(randomBytes(32).toString("hex"), 12));
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: newHash,
          fullName: input.fullName?.trim() || email,
          phone: input.phone?.trim() || null,
          dateOfBirth: input.dateOfBirth ?? null,
          role: UserRole.PATIENT,
          ...(options?.mustChangePassword ? { mustChangePassword: true } : {}),
        },
        select: { id: true, role: true },
      });
    } else if (user.role === UserRole.PATIENT) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
          ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        },
      });
    }

    // Generate GHN only when we know we need to create a new profile row.
    let ghn: string | null = null;
    const existing = await prisma.patientProfile.findUnique({
      where: { email },
      select: { globalHealthNumber: true, fullName: true, dateOfBirth: true, countryFolderCode: true },
    });
    if (!existing) {
      try {
        ghn = await generateGlobalHealthNumber();
      } catch {
        ghn = `GH-${new Date().getFullYear()}-T${Date.now().toString(36).toUpperCase()}`;
      }
    }

    // ── Blind-index recomputation (no-op until BLIND_INDEX_KEY is set) ──
    // CREATE: all incoming values are authoritative.
    const createFullName = input.fullName?.trim() || null;
    const createPhone = input.phone?.trim() || null;
    const createDob = input.dateOfBirth ?? null;
    // UPDATE: merge incoming partials over the stored row so nameDobHash can
    // be derived even when only one of fullName/dob is in this patch.
    const mergedFullName =
      input.fullName !== undefined ? input.fullName?.trim() || null : existing?.fullName ?? null;
    const mergedDob =
      input.dateOfBirth !== undefined ? input.dateOfBirth ?? null : existing?.dateOfBirth ?? null;

    const profile = await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        userId: user.role === UserRole.PATIENT ? user.id : null,
        fullName: createFullName,
        phone: createPhone,
        dateOfBirth: createDob,
        ...(ghn ? { globalHealthNumber: ghn } : {}),
        ...(input.countryFolderCode ? { countryFolderCode: input.countryFolderCode.toLowerCase() } : {}),
        emailHash: computeEmailBlindIndex(email),
        phoneHash: createPhone ? computePhoneBlindIndex(createPhone) : null,
        nameDobHash: nameDobHashFor(createFullName, createDob),
      },
      update: {
        userId: user.role === UserRole.PATIENT ? user.id : undefined,
        ...(input.fullName !== undefined ? { fullName: input.fullName?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
        // Backfill GHN for profiles that existed before this feature shipped.
        ...(!existing?.globalHealthNumber && ghn ? { globalHealthNumber: ghn } : {}),
        // Same never-overwrite rule as the backfill script by default — only
        // fills a currently-null folder. Manual-booking callers opt into
        // overwriteCountryFolder so a fresh booking's country corrects a
        // stale one instead of being silently dropped.
        ...(input.countryFolderCode &&
        (options?.overwriteCountryFolder || !existing?.countryFolderCode)
          ? { countryFolderCode: input.countryFolderCode.toLowerCase() }
          : {}),
        // Recompute affected blind indexes when the source field changes.
        ...(input.phone !== undefined
          ? { phoneHash: createPhone ? computePhoneBlindIndex(createPhone) : null }
          : {}),
        ...(input.fullName !== undefined || input.dateOfBirth !== undefined
          ? { nameDobHash: nameDobHashFor(mergedFullName, mergedDob) }
          : {}),
      },
    });

    await prisma.appointment.updateMany({
      where: { email: { equals: email, mode: "insensitive" }, userId: null },
      data: { userId: user.role === UserRole.PATIENT ? user.id : undefined },
    });

    // Same claim for the clinical link, through the ONE helper that owns the
    // corroboration rules. Doing it inline here with an email-only filter is a
    // cross-patient disclosure: this function is called with the PURCHASER's
    // address from the order-portal-access path, so an email-only sweep would
    // attribute a dependent's consultation to whoever paid for it.
    await linkAppointmentsToPatientProfile(prisma, {
      patientProfileId: profile.id,
      email,
      userId: user.role === UserRole.PATIENT ? user.id : null,
    });

    return {
      profile,
      userId: user.role === UserRole.PATIENT ? user.id : null,
      created,
    };
  } catch (error) {
    throw normalizeDbError(error, "Patient profile is temporarily unavailable");
  }
}

export class PricingPlanCountryMismatchError extends Error {
  constructor() {
    super("Pricing plan must belong to the patient's country");
    this.name = "PricingPlanCountryMismatchError";
  }
}

/** Thrown when a patient (not admin) tries to change their own phone number
 *  after it has already passed VERIFIED status. Support/admin can still
 *  change it via the admin route (that path never sets `actor.role`
 *  to "PATIENT"). */
/** The resolved chart is gone (deleted or re-keyed) by the time the write
 *  lands. Raised only by the id-keyed path, where there is no address to fall
 *  back to and inventing a replacement chart is exactly the bug. */
export class PatientProfileNotFoundError extends Error {
  constructor(message = "Patient profile not found") {
    super(message);
    this.name = "PatientProfileNotFoundError";
  }
}

/** Somebody claimed the address between the eligibility proof and the insert.
 *  A first-chart create must fail here rather than degrade into updating the
 *  row that appeared concurrently — that row belongs to whoever just took the
 *  address, who was never the patient this caller proved. */
export class PatientProfileEmailConflictError extends Error {
  constructor(message = "Patient profile already exists for this address") {
    super(message);
    this.name = "PatientProfileEmailConflictError";
  }
}

export class VerifiedPhoneLockedError extends Error {
  constructor() {
    super("Verified phone number can only be changed by support/admin");
    this.name = "VerifiedPhoneLockedError";
  }
}

/**
 * Fire-and-forget PatientContactChangeLog write (Task 1c). Never blocks or
 * fails the caller's update — a missing log row must not roll back a
 * profile edit, matching every other audit writer in this codebase.
 */
async function logContactChange(params: {
  patientProfileId: string;
  globalHealthNumber?: string | null;
  changedById?: string | null;
  changedByRole: string;
  fieldChanged: "EMAIL" | "PHONE";
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await prisma.patientContactChangeLog.create({
      data: {
        patientProfileId: params.patientProfileId,
        globalHealthNumber: params.globalHealthNumber ?? null,
        changedById: params.changedById ?? null,
        changedByRole: params.changedByRole,
        fieldChanged: params.fieldChanged,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.warn("[patient-contact-change-log] failed to record", {
      patientProfileId: params.patientProfileId,
      fieldChanged: params.fieldChanged,
      err: err instanceof Error ? err.message : err,
    });
  }
}

/**
 * Fields any role can write to. Patient self can set every field in
 * this set; doctor/admin add `statusAlert` / `clinicAlert` on top via
 * `ProfileWriteFieldsWithAlerts`.
 */
export type ProfileWriteFields = {
  fullName?: string | null;
  phone?: string | null;
  dateOfBirth?: Date | null;
  weightKg?: number | null;
  heightM?: number | null;
  bmi?: number | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
  familyHistory?: string[];
  socialHabits?: string[];
  surgeries?: string[];
  usualMedication?: string[];
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  nationalIdNumber?: string | null;
  taxIdNumber?: string | null;
  passportNumber?: string | null;
  utenteNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountryCode?: string | null;
  preferredPharmacy?: string | null;
  pricingPlanId?: string | null;
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceDocumentStatus?: VerificationStatus;
};

export type ProfileWriteFieldsWithAlerts = ProfileWriteFields & {
  statusAlert?: string | null;
  clinicAlert?: string | null;
};

type WriteOutcome = {
  profile: Awaited<ReturnType<typeof prisma.patientProfile.findUnique>>;
  alertChanges: { statusAlert?: boolean; clinicAlert?: boolean };
  /** Alert text as it stood before this write, so the caller can log the
   *  SET/UPDATED history row without re-reading the row. */
  alertPrevious: { statusAlert: string | null; clinicAlert: string | null };
};

/**
 * Validate `pricingPlanId` against the patient's most recent
 * appointment country. If the patient has no appointments yet, accept
 * any plan — first-time signups shouldn't be blocked.
 */
async function validatePricingPlan(
  scope: { email: string } | { patientProfileId: string },
  pricingPlanId: string,
): Promise<void> {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: pricingPlanId },
    select: { id: true, country: { select: { code: true } } },
  });
  if (!plan) {
    throw new PricingPlanCountryMismatchError();
  }
  // For the id scope, the patient's own address is looked up rather than
  // trusted from the caller, and BOTH shapes are searched: a patient resolved
  // through the legacy corroboration path has appointments that predate the
  // durable link, and matching on the link alone would find no history and
  // skip the country check entirely for exactly that population.
  let where;
  if ("patientProfileId" in scope) {
    const owner = await prisma.patientProfile.findUnique({
      where: { id: scope.patientProfileId },
      select: { email: true },
    });
    where = {
      OR: [
        { patientProfileId: scope.patientProfileId },
        ...(owner ? [{ email: { equals: owner.email, mode: "insensitive" as const } }] : []),
      ],
    };
  } else {
    where = { email: { equals: scope.email, mode: "insensitive" as const } };
  }
  const recentAppt = await prisma.appointment.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    select: { countryCode: true },
  });
  if (recentAppt && recentAppt.countryCode.toUpperCase() !== plan.country.code.toUpperCase()) {
    throw new PricingPlanCountryMismatchError();
  }
}

/**
 * Which row this write lands on — and how it is allowed to get there.
 *
 * An email address is not a write identity. `upsertByEmail` is the legacy
 * shape, kept for the surfaces whose patient IS the address holder by
 * construction (a patient editing their own account, an admin who looked the
 * row up by address and re-checked it). Everywhere identity had to be RESOLVED
 * first — the doctor portal, where a released address can be held by a stranger
 * — the resolved id is carried through to persistence instead, because
 * "check by id, then upsert by email" names two different rows the moment
 * ownership of the address moves in between, and the upsert half silently
 * creates the duplicate chart.
 *
 * `create` exists so first-chart creation does not have to borrow the upsert:
 * an upsert asked to create will happily UPDATE the row that appeared
 * concurrently, which is the same wrong-patient write by another route.
 */
export type ProfileWriteTarget =
  | { kind: "upsertByEmail"; email: string }
  | { kind: "id"; patientProfileId: string }
  | {
      kind: "create";
      email: string;
      /** The account the caller PROVED owns this booking, or null for a guest
       *  row. It is stamped on the new chart and used to claim the appointments
       *  that belong to it — without both, the chart is created and then never
       *  resolves again, because the resolver has no link and no account to
       *  corroborate against, and the doctor is locked out of the patient they
       *  just created. */
      userId?: string | null;
    };

/**
 * Persist the writable subset onto the PatientProfile row. Returns the
 * full row + which alerts mutated (so the route can decide whether to
 * emit a PATIENT_ALERT_UPDATED audit event).
 */
export async function writePatientProfile(
  target: ProfileWriteTarget,
  input: ProfileWriteFieldsWithAlerts,
  options: {
    fallbackFullName?: string | null;
    fallbackPhone?: string | null;
    /** Who's making the change — drives the verified-phone lock (PATIENT
     *  role only) and is stamped onto PatientContactChangeLog rows. */
    actor?: { userId: string | null; role: string };
    ipAddress?: string | null;
  } = {},
): Promise<WriteOutcome> {
  if (input.pricingPlanId) {
    await validatePricingPlan(
      target.kind === "id"
        ? { patientProfileId: target.patientProfileId }
        : { email: target.email },
      input.pricingPlanId,
    );
  }
  const before =
    target.kind === "create"
      ? null
      : await prisma.patientProfile.findUnique({
          where:
            target.kind === "id"
              ? { id: target.patientProfileId }
              : { email: target.email },
          select: {
            id: true,
            statusAlert: true,
            clinicAlert: true,
            fullName: true,
            dateOfBirth: true,
            phone: true,
            phoneVerificationStatus: true,
            globalHealthNumber: true,
          },
        });
  // The id-keyed path addresses one immutable row. If it is gone, there is no
  // address to fall back to and no chart to invent — say so and stop.
  if (target.kind === "id" && !before) {
    throw new PatientProfileNotFoundError();
  }

  // Task 1c: a patient (never admin/doctor) may not change their own phone
  // once it's VERIFIED — only support/admin can, via the admin route (which
  // never passes actor.role = "PATIENT").
  if (
    "phone" in input &&
    options.actor?.role === "PATIENT" &&
    before?.phoneVerificationStatus === "VERIFIED" &&
    (input.phone ?? null) !== (before.phone ?? null)
  ) {
    throw new VerifiedPhoneLockedError();
  }
  // An alert may be set or reworded here, but never cleared: wiping a
  // colleague's red banner has to carry a reason, which only
  // removePatientAlert() collects. Empty-to-empty is not a removal, so a form
  // that always posts every field still works.
  for (const field of ["statusAlert", "clinicAlert"] as const) {
    if (!(field in input)) continue;
    const next = normalizeAlert(input[field]);
    if (next === null && normalizeAlert(before?.[field]) !== null) {
      throw new AlertRemovalRequiresNoteError();
    }
    // Normalize "" to null so a blanked-then-retyped alert doesn't leave an
    // empty string behind that renders as a banner with no text.
    input = { ...input, [field]: next };
  }

  // Encrypt the government-ID fields before they touch the DB (no-op when
  // PHI_ENCRYPTION_KEY is unset). The returned row is decrypted below.
  // fullName/phone/dateOfBirth are NOT PHI-encrypted, so the plaintext on
  // `input` is what's used to derive the blind indexes below.
  const writeInput = encryptClinicalFields(encryptPhiFields(input));

  // ── Blind-index recomputation (no-op until BLIND_INDEX_KEY is set) ──
  const createFullName = input.fullName ?? options.fallbackFullName ?? null;
  const createPhone = input.phone ?? options.fallbackPhone ?? null;
  const createDob = input.dateOfBirth ?? null;
  // For update, merge the incoming partial over the stored row so nameDobHash
  // can be derived when only one of fullName/dateOfBirth is being changed.
  const mergedFullName =
    "fullName" in input ? input.fullName ?? null : before?.fullName ?? null;
  const mergedDob =
    "dateOfBirth" in input ? input.dateOfBirth ?? null : before?.dateOfBirth ?? null;

  const createData = (email: string) => ({
    email,
    fullName: writeInput.fullName ?? options.fallbackFullName ?? null,
    phone: writeInput.phone ?? options.fallbackPhone ?? null,
    ...writeInput,
    emailHash: computeEmailBlindIndex(email),
    phoneHash: createPhone ? computePhoneBlindIndex(createPhone) : null,
    nameDobHash: nameDobHashFor(createFullName, createDob),
  });
  const updateData = {
    ...writeInput,
    ...("phone" in input
      ? {
          phoneHash: input.phone
            ? computePhoneBlindIndex(input.phone)
            : null,
        }
      : {}),
    ...("fullName" in input || "dateOfBirth" in input
      ? { nameDobHash: nameDobHashFor(mergedFullName, mergedDob) }
      : {}),
  };

  // The profile write gets its own try, because the classification below is by
  // error CODE and the calls further down raise the same codes for entirely
  // different reasons — a concurrently deleted `User` row makes the sync update
  // throw P2025, which read as "the chart is gone" and returned a 404 for a
  // profile write that had already committed.
  let profile: Awaited<ReturnType<typeof prisma.patientProfile.update>>;
  try {
    profile =
      target.kind === "id"
        ? await prisma.patientProfile.update({
            where: { id: target.patientProfileId },
            data: updateData,
          })
        : target.kind === "create"
          ? await prisma.patientProfile.create({
              data: { ...createData(target.email), userId: target.userId ?? null },
            })
          : await prisma.patientProfile.upsert({
              where: { email: target.email },
              create: createData(target.email),
              update: updateData,
            });
  } catch (error) {
    // P2025 = the id-keyed row vanished between the read and the update;
    // P2002 = somebody took the address between the eligibility proof and the
    // insert. Both mean "this is no longer the patient you resolved", and both
    // have to surface as a refusal rather than land on whoever is there now.
    const code = (error as { code?: string }).code;
    if (target.kind === "id" && code === "P2025") {
      throw new PatientProfileNotFoundError();
    }
    if (target.kind === "create" && code === "P2002") {
      throw new PatientProfileEmailConflictError();
    }
    throw normalizeDbError(error, "Patient profile update temporarily unavailable");
  }

  try {
    // A brand-new chart claims the appointments that provably belong to it,
    // through the one helper that owns those rules. Without it the chart has no
    // durable link and nothing corroborates it, so the next lookup by the same
    // address resolves to nobody and the doctor who just created the patient
    // gets a 404 for them forever.
    if (target.kind === "create") {
      await linkAppointmentsToPatientProfile(prisma, {
        patientProfileId: profile.id,
        email: target.email,
        userId: target.userId ?? null,
      });
    }
    const alertChanges: WriteOutcome["alertChanges"] = {};
    if ("statusAlert" in input && (before?.statusAlert ?? null) !== (input.statusAlert ?? null)) {
      alertChanges.statusAlert = true;
    }
    if ("clinicAlert" in input && (before?.clinicAlert ?? null) !== (input.clinicAlert ?? null)) {
      alertChanges.clinicAlert = true;
    }
    // Task 1c: log an actual phone change, regardless of which route drove it.
    if ("phone" in input && (before?.phone ?? null) !== (profile.phone ?? null)) {
      void logContactChange({
        patientProfileId: profile.id,
        globalHealthNumber: profile.globalHealthNumber,
        changedById: options.actor?.userId ?? null,
        changedByRole: options.actor?.role ?? "SYSTEM",
        fieldChanged: "PHONE",
        oldValue: before?.phone ?? null,
        newValue: profile.phone ?? null,
        ipAddress: options.ipAddress ?? null,
      });
    }
    // Keep the login account (User) in step with the medical profile —
    // whichever surface (patient/doctor/admin) edits identity fields here,
    // the account name/phone/dob shouldn't silently drift out of sync.
    if (
      profile.userId &&
      ("fullName" in input || "phone" in input || "dateOfBirth" in input)
    ) {
      await prisma.user.update({
        where: { id: profile.userId },
        data: {
          ...(input.fullName ? { fullName: input.fullName.trim() } : {}),
          ...("phone" in input ? { phone: input.phone?.trim() || null } : {}),
          ...("dateOfBirth" in input ? { dateOfBirth: input.dateOfBirth ?? null } : {}),
        },
      });
    }
    // Push a name change onto the patient's still-active appointments too,
    // so the name a doctor/admin sees on an upcoming booking matches the
    // profile. COMPLETED/CANCELLED rows are left alone — those are closed
    // clinical records and keep the name as it was at that visit.
    if (input.fullName && profile.userId) {
      await prisma.appointment.updateMany({
        where: {
          userId: profile.userId,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
        data: { fullName: input.fullName.trim() },
      });
    }
    return {
      profile,
      alertChanges,
      alertPrevious: {
        statusAlert: before?.statusAlert ?? null,
        clinicAlert: before?.clinicAlert ?? null,
      },
    };
  } catch (error) {
    throw normalizeDbError(error, "Patient profile update temporarily unavailable");
  }
}

/**
 * Legacy address-keyed shape. Safe only where the caller's patient IS the
 * current holder of the address by construction; anything that had to resolve
 * an identity first must carry the resolved id (`writePatientProfile` with an
 * `id` target) all the way to persistence instead.
 */
export async function applyPatientProfileUpdate(
  email: string,
  input: ProfileWriteFieldsWithAlerts,
  options: {
    fallbackFullName?: string | null;
    fallbackPhone?: string | null;
    actor?: { userId: string | null; role: string };
    ipAddress?: string | null;
  } = {},
): Promise<WriteOutcome> {
  return writePatientProfile({ kind: "upsertByEmail", email }, input, options);
}

/**
 * Serializer that all three roles return through, so the response
 * shape stays consistent. Pass `includeAlerts=false` for the
 * patient-facing endpoint so the doctor-only flags never leak.
 */
export function serializeProfile(
  profile: Awaited<ReturnType<typeof prisma.patientProfile.findUnique>>,
  options: { includeAlerts: boolean },
) {
  if (!profile) return null;
  // Decrypt the government-ID fields for output (passthrough on legacy
  // plaintext / when encryption is off).
  const decrypted = decryptClinicalFields(decryptPhiFields(profile));
  const { statusAlert, clinicAlert, ...rest } = decrypted;
  return {
    ...rest,
    ...(options.includeAlerts ? { statusAlert, clinicAlert } : {}),
    dateOfBirth: decrypted.dateOfBirth?.toISOString() ?? null,
    createdAt: decrypted.createdAt.toISOString(),
    updatedAt: decrypted.updatedAt.toISOString(),
  };
}
