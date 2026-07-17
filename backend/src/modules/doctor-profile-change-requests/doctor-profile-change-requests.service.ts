import { Prisma, type LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { assertLocaleSupported } from "../shared/locale-support.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";
import {
  doctorPendingProfileImageKey,
  doctorProfileImageKey,
} from "../../utils/doctor-image-key.js";

/**
 * Doctor-initiated edits to admin-locked profile fields.
 *
 * The locked set (full name, qualifications, per-market bio + registration,
 * profile photo) is everything a patient uses to judge a clinician's identity
 * and credentials, so a doctor proposes rather than writes: the live profile
 * keeps serving the public site and approval copies the proposal onto
 * Doctor / DoctorCountry / Asset.
 *
 * This deliberately differs from ServiceDoctor, where the pending row IS the
 * request (a not-yet-approved service simply isn't bookable, so there's no live
 * value to protect). Here there is, hence the separate table.
 *
 * Unlocked and still written directly: languages, WhatsApp number, and payout
 * bank details.
 */

export const GLOBAL_PROFILE_CHANGE_FIELDS = [
  "fullName",
  "qualifications",
  "photo",
] as const;

export const MARKET_PROFILE_CHANGE_FIELDS = ["bio", "registration"] as const;

export const DOCTOR_PROFILE_CHANGE_FIELDS = [
  ...GLOBAL_PROFILE_CHANGE_FIELDS,
  ...MARKET_PROFILE_CHANGE_FIELDS,
] as const;

export type GlobalProfileChangeField = (typeof GLOBAL_PROFILE_CHANGE_FIELDS)[number];
export type MarketProfileChangeField = (typeof MARKET_PROFILE_CHANGE_FIELDS)[number];
export type DoctorProfileChangeField = GlobalProfileChangeField | MarketProfileChangeField;

export type DoctorProfileChangeStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

/** Market-scoped fields carry a countryId; global fields never do. */
export function isMarketProfileChangeField(
  field: DoctorProfileChangeField,
): field is MarketProfileChangeField {
  return (MARKET_PROFILE_CHANGE_FIELDS as readonly string[]).includes(field);
}

/* ── Proposed / previous value shapes (per field) ─────────────────── */

export type FullNameChangeValue = { value: string };
export type QualificationsChangeValue = { value: string[] };
export type BioChangeValue = {
  translations: Array<{ locale: LocaleCode; bio: string | null }>;
};
export type RegistrationChangeValue = {
  chamberEntity: string | null;
  registrationNumber: string | null;
  division: string | null;
};
/** `removed` distinguishes "take my photo down" from "use this new one". */
export type PhotoChangeValue =
  | { removed: true }
  | {
      removed: false;
      path: string;
      storageKey: string | null;
      focalX: number;
      focalY: number;
      zoom: number;
    };

export type DoctorProfileChangeValue =
  | FullNameChangeValue
  | QualificationsChangeValue
  | BioChangeValue
  | RegistrationChangeValue
  | PhotoChangeValue;

/* ── Errors ───────────────────────────────────────────────────────── */

export class DoctorProfileChangeInvalidError extends Error {
  constructor(message = "Invalid profile change request") {
    super(message);
    this.name = "DoctorProfileChangeInvalidError";
  }
}

/** The proposal already matches the live value — nothing to review. */
export class DoctorProfileChangeNoopError extends Error {
  constructor(message = "That matches your current value — nothing to approve") {
    super(message);
    this.name = "DoctorProfileChangeNoopError";
  }
}

export class DoctorProfileChangeNotFoundError extends Error {
  constructor(message = "Change request not found") {
    super(message);
    this.name = "DoctorProfileChangeNotFoundError";
  }
}

export class DoctorProfileChangeMarketDeniedError extends Error {
  constructor(message = "Doctor is not approved for this market") {
    super(message);
    this.name = "DoctorProfileChangeMarketDeniedError";
  }
}

/* ── Submit input ─────────────────────────────────────────────────── */

export type DoctorProfileChangeSubmitInput = { doctorNote?: string | null } & (
  | { field: "fullName"; value: string }
  | { field: "qualifications"; value: string[] }
  | { field: "photo"; photo: PhotoChangeValue }
  | {
      field: "bio";
      countryId: string;
      translations: Array<{ locale: LocaleCode; bio: string | null }>;
    }
  | ({ field: "registration"; countryId: string } & RegistrationChangeValue)
);

/* ── DTOs ─────────────────────────────────────────────────────────── */

export type DoctorProfileChangeRequestDto = {
  id: string;
  doctorId: string;
  field: DoctorProfileChangeField;
  countryId: string | null;
  status: DoctorProfileChangeStatus;
  proposedValue: DoctorProfileChangeValue;
  previousValue: DoctorProfileChangeValue | null;
  doctorNote: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminDoctorProfileChangeRequestDto = DoctorProfileChangeRequestDto & {
  doctorName: string;
  doctorSlug: string;
  /** Market the change targets; falls back to the doctor's primary country
   *  for global fields so the admin queue can always show a flag. */
  countryCode: string;
  countryName: string;
  /** True when countryId is null — i.e. the change is not market-scoped. */
  isGlobal: boolean;
};

/** Everything the caller needs to bust the public caches this doctor appears in. */
export type DoctorProfileCacheInfo = {
  countryCode: string;
  slug: string;
  additionalCountryCodes: string[];
};

const CHANGE_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

/* ── Helpers ──────────────────────────────────────────────────────── */

/**
 * Stable stringification for the "did anything actually change?" check —
 * sorts object keys and drops undefined so a proposal built by one code path
 * compares equal to a snapshot built by another.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>)
          .filter(([, v]) => v !== undefined)
          .sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return val;
  });
}

function sameValue(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function toDto(row: {
  id: string;
  doctorId: string;
  field: string;
  countryId: string | null;
  status: string;
  proposedValue: Prisma.JsonValue;
  previousValue: Prisma.JsonValue | null;
  doctorNote: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): DoctorProfileChangeRequestDto {
  return {
    id: row.id,
    doctorId: row.doctorId,
    field: row.field as DoctorProfileChangeField,
    countryId: row.countryId,
    status: row.status as DoctorProfileChangeStatus,
    proposedValue: row.proposedValue as unknown as DoctorProfileChangeValue,
    previousValue: (row.previousValue ?? null) as unknown as DoctorProfileChangeValue | null,
    doctorNote: row.doctorNote,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Normalizes submit input into the JSON we persist as `proposedValue`. */
function buildProposedValue(
  input: DoctorProfileChangeSubmitInput,
): DoctorProfileChangeValue {
  switch (input.field) {
    case "fullName":
      return { value: input.value.trim() };
    case "qualifications":
      return {
        value: input.value.map((entry) => entry.trim()).filter(Boolean),
      };
    case "bio":
      return {
        translations: input.translations.map((entry) => ({
          locale: entry.locale,
          // Sanitize at submit, not at approve: the admin must review exactly
          // the markup that will go live, and approval is then a pure copy.
          bio: entry.bio == null || entry.bio.trim() === "" ? null : sanitizeRichHtml(entry.bio),
        })),
      };
    case "registration":
      return {
        chamberEntity: input.chamberEntity?.trim() || null,
        registrationNumber: input.registrationNumber?.trim() || null,
        division: input.division?.trim() || null,
      };
    case "photo":
      return input.photo;
  }
}

/** Snapshots the live value in the same shape as the proposal, for diffing. */
async function snapshotLiveValue(
  doctorId: string,
  input: DoctorProfileChangeSubmitInput,
): Promise<DoctorProfileChangeValue | null> {
  switch (input.field) {
    case "fullName": {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { fullName: true },
      });
      return doctor ? { value: doctor.fullName } : null;
    }
    case "qualifications": {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { qualifications: true },
      });
      return doctor ? { value: doctor.qualifications } : null;
    }
    case "photo": {
      const asset = await prisma.asset.findFirst({
        where: { doctorId, kind: "IMAGE", isActive: true },
        orderBy: { createdAt: "desc" },
        select: { path: true, focalX: true, focalY: true, zoom: true },
      });
      if (!asset) return { removed: true };
      return {
        removed: false,
        path: asset.path,
        storageKey: null,
        focalX: asset.focalX,
        focalY: asset.focalY,
        zoom: asset.zoom,
      };
    }
    case "bio": {
      const market = await prisma.doctorCountry.findUnique({
        where: { doctorId_countryId: { doctorId, countryId: input.countryId } },
        select: { translations: { select: { locale: true, bio: true } } },
      });
      const byLocale = new Map(
        (market?.translations ?? []).map((entry) => [entry.locale, entry.bio]),
      );
      // Only the locales being proposed — a doctor editing EN shouldn't have
      // their untouched PT bio show up as part of the diff.
      return {
        translations: input.translations.map((entry) => ({
          locale: entry.locale,
          bio: byLocale.get(entry.locale) ?? null,
        })),
      };
    }
    case "registration": {
      const market = await prisma.doctorCountry.findUnique({
        where: { doctorId_countryId: { doctorId, countryId: input.countryId } },
        select: { chamberEntity: true, registrationNumber: true, division: true },
      });
      if (!market) return null;
      return {
        chamberEntity: market.chamberEntity,
        registrationNumber: market.registrationNumber,
        division: market.division,
      };
    }
  }
}

async function loadCacheInfo(doctorId: string): Promise<DoctorProfileCacheInfo | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: {
      slug: true,
      country: { select: { code: true } },
      additionalCountries: {
        where: { active: true },
        select: { country: { select: { code: true } } },
      },
    },
  });
  if (!doctor) return null;
  return {
    countryCode: doctor.country.code,
    slug: doctor.slug,
    additionalCountryCodes: doctor.additionalCountries.map((link) => link.country.code),
  };
}

/* ── Doctor-side ──────────────────────────────────────────────────── */

/**
 * Records (or supersedes) a doctor's proposed change to one locked field.
 *
 * Resubmitting while a request is pending updates that row in place rather
 * than stacking a second one — the partial unique index in the migration is
 * the backstop for a concurrent double-submit.
 */
export async function submitDoctorProfileChangeRequest(
  doctorId: string,
  input: DoctorProfileChangeSubmitInput,
): Promise<DoctorProfileChangeRequestDto> {
  try {
    const countryId = isMarketProfileChangeField(input.field)
      ? (input as { countryId: string }).countryId
      : null;

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, active: true },
    });
    if (!doctor || !doctor.active) {
      throw new DoctorProfileChangeNotFoundError("Doctor profile not found");
    }

    if (countryId) {
      const market = await prisma.doctorCountry.findUnique({
        where: { doctorId_countryId: { doctorId, countryId } },
        select: { active: true },
      });
      if (!market || !market.active) throw new DoctorProfileChangeMarketDeniedError();
    }

    if (input.field === "bio") {
      for (const entry of input.translations) {
        await assertLocaleSupported(input.countryId, entry.locale);
      }
    }

    if (input.field === "fullName" && input.value.trim() === "") {
      throw new DoctorProfileChangeInvalidError("Full name cannot be empty");
    }

    const proposedValue = buildProposedValue(input);
    const previousValue = await snapshotLiveValue(doctorId, input);

    if (previousValue && sameValue(proposedValue, previousValue)) {
      throw new DoctorProfileChangeNoopError();
    }

    const row = await prisma.$transaction(async (tx) => {
      const existingPending = await tx.doctorProfileChangeRequest.findFirst({
        where: { doctorId, field: input.field, countryId, status: "pending" },
        select: { id: true },
      });
      const data = {
        proposedValue: proposedValue as unknown as Prisma.InputJsonValue,
        // DbNull (SQL NULL), not JsonNull: "we couldn't snapshot a previous
        // value" is the absence of a value, not a stored JSON `null`.
        previousValue: (previousValue ?? Prisma.DbNull) as
          | Prisma.InputJsonValue
          | typeof Prisma.DbNull,
        doctorNote: input.doctorNote?.trim() || null,
      };
      if (existingPending) {
        return tx.doctorProfileChangeRequest.update({
          where: { id: existingPending.id },
          data,
        });
      }
      return tx.doctorProfileChangeRequest.create({
        data: {
          doctorId,
          countryId,
          field: input.field,
          status: "pending",
          ...data,
        },
      });
    }, CHANGE_TX_OPTIONS);

    return toDto(row);
  } catch (error) {
    if (
      error instanceof DoctorProfileChangeInvalidError ||
      error instanceof DoctorProfileChangeNoopError ||
      error instanceof DoctorProfileChangeNotFoundError ||
      error instanceof DoctorProfileChangeMarketDeniedError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Could not submit the change request");
  }
}

/**
 * A freshly uploaded photo, parked for review.
 *
 * The bytes are already in object storage by the time this runs; the Asset row
 * created here is inactive, so nothing public or admin-facing selects it. It
 * exists so the upload has a durable home (and a stable key to overwrite on
 * re-upload) while it waits — approval copies its path onto the canonical row.
 */
export async function submitDoctorPhotoUpload(
  doctorId: string,
  upload: { path: string; storageKey: string },
): Promise<DoctorProfileChangeRequestDto> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { fullName: true, countryId: true },
  });
  if (!doctor) throw new DoctorProfileChangeNotFoundError("Doctor profile not found");

  const pendingKey = doctorPendingProfileImageKey(doctorId);
  const assetFields = {
    doctorId,
    countryId: doctor.countryId,
    path: upload.path,
    altText: doctor.fullName,
    title: doctor.fullName,
    isActive: false,
  };
  await prisma.asset.upsert({
    where: { kind_key: { kind: "IMAGE", key: pendingKey } },
    create: { kind: "IMAGE", key: pendingKey, ...assetFields },
    update: assetFields,
  });

  return submitDoctorProfileChangeRequest(doctorId, {
    field: "photo",
    photo: {
      removed: false,
      path: upload.path,
      storageKey: upload.storageKey,
      focalX: 50,
      focalY: 50,
      zoom: 1,
    },
  });
}

/** Doctor asks for their photo to be taken down. */
export async function submitDoctorPhotoRemoval(
  doctorId: string,
  doctorNote?: string | null,
): Promise<DoctorProfileChangeRequestDto> {
  return submitDoctorProfileChangeRequest(doctorId, {
    field: "photo",
    photo: { removed: true },
    ...(doctorNote !== undefined ? { doctorNote } : {}),
  });
}

/**
 * A crop/zoom-only change, folded into the same `photo` request as an upload.
 *
 * It re-crops whichever image the doctor is proposing (a pending upload) or
 * currently shows (the live asset) — so tweaking the crop while a new photo is
 * pending refines that photo rather than forking a second request. Cropping
 * while a *removal* is pending supersedes the removal, which is the honest
 * reading of "actually, keep it, just move it up a bit".
 */
export async function submitDoctorPhotoFocalChange(
  doctorId: string,
  focal: { focalX: number; focalY: number; zoom: number },
): Promise<DoctorProfileChangeRequestDto> {
  const pending = await prisma.doctorProfileChangeRequest.findFirst({
    where: { doctorId, field: "photo", countryId: null, status: "pending" },
    select: { proposedValue: true },
  });
  const pendingPhoto = pending?.proposedValue as unknown as PhotoChangeValue | undefined;
  if (pendingPhoto && pendingPhoto.removed === false) {
    return submitDoctorProfileChangeRequest(doctorId, {
      field: "photo",
      photo: { ...pendingPhoto, ...focal },
    });
  }

  const live = await prisma.asset.findFirst({
    where: { doctorId, kind: "IMAGE", isActive: true },
    orderBy: { createdAt: "desc" },
    select: { path: true },
  });
  if (!live) {
    throw new DoctorProfileChangeInvalidError("No profile photo to adjust");
  }
  return submitDoctorProfileChangeRequest(doctorId, {
    field: "photo",
    photo: { removed: false, path: live.path, storageKey: null, ...focal },
  });
}

/**
 * The latest request per (field, market) for this doctor — exactly what the
 * profile UI needs: a pending row means "locked, awaiting review", a rejected
 * row means "show the admin's reason", anything else means the field is free.
 */
export async function listDoctorProfileChangeRequests(
  doctorId: string,
): Promise<DoctorProfileChangeRequestDto[]> {
  try {
    const rows = await prisma.doctorProfileChangeRequest.findMany({
      where: { doctorId },
      orderBy: { createdAt: "desc" },
      distinct: ["field", "countryId"],
    });
    return rows.map(toDto);
  } catch (error) {
    throw normalizeDbError(error, "Profile change requests are unavailable");
  }
}

/** Doctor withdraws their own pending request, unlocking the field again. */
export async function cancelDoctorProfileChangeRequest(
  doctorId: string,
  requestId: string,
): Promise<DoctorProfileChangeRequestDto> {
  try {
    const existing = await prisma.doctorProfileChangeRequest.findFirst({
      where: { id: requestId, doctorId },
      select: { id: true, status: true },
    });
    if (!existing) throw new DoctorProfileChangeNotFoundError();
    if (existing.status !== "pending") {
      throw new DoctorProfileChangeInvalidError(
        "Only a pending request can be withdrawn",
      );
    }
    const row = await prisma.doctorProfileChangeRequest.update({
      where: { id: existing.id },
      data: { status: "cancelled" },
    });
    return toDto(row);
  } catch (error) {
    if (
      error instanceof DoctorProfileChangeNotFoundError ||
      error instanceof DoctorProfileChangeInvalidError
    ) {
      throw error;
    }
    throw normalizeDbError(error, "Could not withdraw the change request");
  }
}

/* ── Admin-side ───────────────────────────────────────────────────── */

const adminRequestInclude = {
  doctor: {
    select: {
      fullName: true,
      slug: true,
      country: { select: { code: true, name: true } },
    },
  },
  country: { select: { code: true, name: true } },
} satisfies Prisma.DoctorProfileChangeRequestInclude;

function toAdminDto(
  row: Prisma.DoctorProfileChangeRequestGetPayload<{
    include: typeof adminRequestInclude;
  }>,
): AdminDoctorProfileChangeRequestDto {
  return {
    ...toDto(row),
    doctorName: row.doctor.fullName,
    doctorSlug: row.doctor.slug,
    countryCode: row.country?.code ?? row.doctor.country.code,
    countryName: row.country?.name ?? row.doctor.country.name,
    isGlobal: row.countryId === null,
  };
}

/**
 * Pending profile change requests awaiting review — drives the admin badge +
 * notification feed. `countryCode` scopes a LOCAL_ADMIN to their own queue:
 * market-scoped rows match on the target market, global rows on the doctor's
 * primary country.
 */
export async function listPendingDoctorProfileChangeRequests(opts?: {
  countryCode?: string | null;
}): Promise<{ count: number; items: AdminDoctorProfileChangeRequestDto[] }> {
  try {
    const countryCode = opts?.countryCode?.trim() || null;
    const rows = await prisma.doctorProfileChangeRequest.findMany({
      where: {
        status: "pending",
        ...(countryCode
          ? {
              OR: [
                { country: { code: { equals: countryCode, mode: "insensitive" } } },
                {
                  countryId: null,
                  doctor: {
                    country: { code: { equals: countryCode, mode: "insensitive" } },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: adminRequestInclude,
    });
    const items = rows.map(toAdminDto);
    return { count: items.length, items };
  } catch (error) {
    throw normalizeDbError(
      error,
      "Pending profile change requests are unavailable",
    );
  }
}

/** Full request history for one doctor (admin detail page), newest first. */
export async function listAdminDoctorProfileChangeRequests(
  doctorId: string,
): Promise<AdminDoctorProfileChangeRequestDto[]> {
  try {
    const rows = await prisma.doctorProfileChangeRequest.findMany({
      where: { doctorId },
      orderBy: { createdAt: "desc" },
      include: adminRequestInclude,
    });
    return rows.map(toAdminDto);
  } catch (error) {
    throw normalizeDbError(error, "Profile change requests are unavailable");
  }
}

/**
 * Copies an approved proposal onto the live profile. Runs inside the review
 * transaction so a failure here leaves the request pending rather than
 * marking it approved with nothing applied.
 */
async function applyApprovedChange(
  tx: Prisma.TransactionClient,
  row: {
    doctorId: string;
    countryId: string | null;
    field: string;
    proposedValue: Prisma.JsonValue;
  },
  markVerified: boolean,
): Promise<void> {
  const field = row.field as DoctorProfileChangeField;

  async function requireMarket(): Promise<string> {
    if (!row.countryId) {
      throw new DoctorProfileChangeInvalidError(
        "Market-scoped change is missing its market",
      );
    }
    const market = await tx.doctorCountry.findUnique({
      where: {
        doctorId_countryId: { doctorId: row.doctorId, countryId: row.countryId },
      },
      select: { id: true, active: true },
    });
    if (!market || !market.active) {
      throw new DoctorProfileChangeInvalidError(
        "The doctor is no longer listed in that market",
      );
    }
    return market.id;
  }

  switch (field) {
    case "fullName": {
      const value = row.proposedValue as unknown as FullNameChangeValue;
      await tx.doctor.update({
        where: { id: row.doctorId },
        data: { fullName: value.value },
      });
      // The photo asset's alt/title mirror the doctor's name on upload, so
      // keep them honest rather than leaving the old name in the alt text.
      await tx.asset.updateMany({
        where: { doctorId: row.doctorId, kind: "IMAGE" },
        data: { altText: value.value, title: value.value },
      });
      break;
    }
    case "qualifications": {
      const value = row.proposedValue as unknown as QualificationsChangeValue;
      await tx.doctor.update({
        where: { id: row.doctorId },
        data: { qualifications: value.value },
      });
      break;
    }
    case "bio": {
      const doctorCountryId = await requireMarket();
      const value = row.proposedValue as unknown as BioChangeValue;
      for (const entry of value.translations) {
        await tx.doctorMarketTranslation.upsert({
          where: {
            doctorCountryId_locale: { doctorCountryId, locale: entry.locale },
          },
          create: { doctorCountryId, locale: entry.locale, bio: entry.bio },
          update: { bio: entry.bio },
        });
      }
      break;
    }
    case "registration": {
      const doctorCountryId = await requireMarket();
      const value = row.proposedValue as unknown as RegistrationChangeValue;
      // Verification is the admin's call in this same action — approving the
      // number is not the same as having sighted the documentation, so this
      // fails closed unless the admin explicitly ticked "mark verified".
      await tx.doctorCountry.update({
        where: { id: doctorCountryId },
        data: {
          chamberEntity: value.chamberEntity,
          registrationNumber: value.registrationNumber,
          division: value.division,
          isVerified: markVerified,
          verifiedAt: markVerified ? new Date() : null,
        },
      });
      break;
    }
    case "photo": {
      const value = row.proposedValue as unknown as PhotoChangeValue;
      if (value.removed) {
        await tx.asset.updateMany({
          where: { doctorId: row.doctorId, kind: "IMAGE", isActive: true },
          data: { isActive: false },
        });
        break;
      }
      const doctor = await tx.doctor.findUnique({
        where: { id: row.doctorId },
        select: { fullName: true, countryId: true },
      });
      if (!doctor) throw new DoctorProfileChangeInvalidError("Doctor profile not found");
      const canonicalKey = doctorProfileImageKey(row.doctorId);
      // The pending upload row is already isActive:false, so it is untouched
      // here — only competing *live* image assets get stood down.
      await tx.asset.updateMany({
        where: {
          doctorId: row.doctorId,
          kind: "IMAGE",
          isActive: true,
          NOT: { key: canonicalKey },
        },
        data: { isActive: false },
      });
      await tx.asset.upsert({
        where: { kind_key: { kind: "IMAGE", key: canonicalKey } },
        create: {
          doctorId: row.doctorId,
          countryId: doctor.countryId,
          kind: "IMAGE",
          key: canonicalKey,
          path: value.path,
          altText: doctor.fullName,
          title: doctor.fullName,
          isActive: true,
          focalX: value.focalX,
          focalY: value.focalY,
          zoom: value.zoom,
        },
        update: {
          doctorId: row.doctorId,
          countryId: doctor.countryId,
          path: value.path,
          altText: doctor.fullName,
          title: doctor.fullName,
          isActive: true,
          focalX: value.focalX,
          focalY: value.focalY,
          zoom: value.zoom,
        },
      });
      break;
    }
  }
}

/**
 * Admin approves or rejects a pending request. Approval applies the change to
 * the live profile in the same transaction that records the decision.
 *
 * `markVerified` only means anything for a `registration` change.
 */
export async function reviewDoctorProfileChangeRequest(
  doctorId: string,
  requestId: string,
  input: {
    status: "approved" | "rejected";
    reviewNote?: string | null;
    markVerified?: boolean;
    reviewedByUserId?: string | null;
  },
): Promise<{
  request: AdminDoctorProfileChangeRequestDto;
  cache: DoctorProfileCacheInfo | null;
} | null> {
  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.doctorProfileChangeRequest.findFirst({
        where: { id: requestId, doctorId },
        select: {
          id: true,
          doctorId: true,
          countryId: true,
          field: true,
          status: true,
          proposedValue: true,
        },
      });
      if (!existing) return null;
      if (existing.status !== "pending") {
        throw new DoctorProfileChangeInvalidError(
          `This request was already ${existing.status}`,
        );
      }

      if (input.status === "approved") {
        await applyApprovedChange(tx, existing, input.markVerified === true);
      }

      return tx.doctorProfileChangeRequest.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote?.trim() || null,
          reviewedByUserId: input.reviewedByUserId ?? null,
          reviewedAt: new Date(),
        },
        include: adminRequestInclude,
      });
    }, CHANGE_TX_OPTIONS);

    if (!row) return null;
    return { request: toAdminDto(row), cache: await loadCacheInfo(doctorId) };
  } catch (error) {
    if (error instanceof DoctorProfileChangeInvalidError) throw error;
    throw normalizeDbError(error, "Could not review the change request");
  }
}
