import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export async function upsertPatientProfileByEmail(
  input: {
    email: string;
    fullName?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
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

    const profile = await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        userId: user.role === UserRole.PATIENT ? user.id : null,
        fullName: input.fullName?.trim() || null,
        phone: input.phone?.trim() || null,
        dateOfBirth: input.dateOfBirth ?? null,
      },
      update: {
        userId: user.role === UserRole.PATIENT ? user.id : undefined,
        ...(input.fullName !== undefined ? { fullName: input.fullName?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
      },
    });

    await prisma.appointment.updateMany({
      where: { email: { equals: email, mode: "insensitive" }, userId: null },
      data: { userId: user.role === UserRole.PATIENT ? user.id : undefined },
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
  nationalIdNumber?: string | null;
  taxIdNumber?: string | null;
  passportNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  addressCountryCode?: string | null;
  preferredPharmacy?: string | null;
  pricingPlanId?: string | null;
};

export type ProfileWriteFieldsWithAlerts = ProfileWriteFields & {
  statusAlert?: string | null;
  clinicAlert?: string | null;
};

type WriteOutcome = {
  profile: Awaited<ReturnType<typeof prisma.patientProfile.findUnique>>;
  alertChanges: { statusAlert?: boolean; clinicAlert?: boolean };
};

/**
 * Validate `pricingPlanId` against the patient's most recent
 * appointment country. If the patient has no appointments yet, accept
 * any plan — first-time signups shouldn't be blocked.
 */
async function validatePricingPlan(
  email: string,
  pricingPlanId: string,
): Promise<void> {
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: pricingPlanId },
    select: { id: true, country: { select: { code: true } } },
  });
  if (!plan) {
    throw new PricingPlanCountryMismatchError();
  }
  const recentAppt = await prisma.appointment.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { countryCode: true },
  });
  if (recentAppt && recentAppt.countryCode.toUpperCase() !== plan.country.code.toUpperCase()) {
    throw new PricingPlanCountryMismatchError();
  }
}

/**
 * Persist the writable subset onto the PatientProfile row. Returns the
 * full row + which alerts mutated (so the route can decide whether to
 * emit a PATIENT_ALERT_UPDATED audit event).
 */
export async function applyPatientProfileUpdate(
  email: string,
  input: ProfileWriteFieldsWithAlerts,
  options: {
    fallbackFullName?: string | null;
    fallbackPhone?: string | null;
  } = {},
): Promise<WriteOutcome> {
  if (input.pricingPlanId) {
    await validatePricingPlan(email, input.pricingPlanId);
  }
  const before = await prisma.patientProfile.findUnique({
    where: { email },
    select: { statusAlert: true, clinicAlert: true },
  });
  try {
    const profile = await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        fullName: input.fullName ?? options.fallbackFullName ?? null,
        phone: input.phone ?? options.fallbackPhone ?? null,
        ...input,
      },
      update: input,
    });
    const alertChanges: WriteOutcome["alertChanges"] = {};
    if ("statusAlert" in input && (before?.statusAlert ?? null) !== (input.statusAlert ?? null)) {
      alertChanges.statusAlert = true;
    }
    if ("clinicAlert" in input && (before?.clinicAlert ?? null) !== (input.clinicAlert ?? null)) {
      alertChanges.clinicAlert = true;
    }
    return { profile, alertChanges };
  } catch (error) {
    throw normalizeDbError(error, "Patient profile update temporarily unavailable");
  }
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
  const { statusAlert, clinicAlert, ...rest } = profile;
  return {
    ...rest,
    ...(options.includeAlerts ? { statusAlert, clinicAlert } : {}),
    dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}
