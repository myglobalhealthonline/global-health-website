import { AssetKind, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminDoctorCreateBody,
  AdminDoctorUpdateBody,
  AdminDoctorsQuery,
} from "../../validations/admin-doctors.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { sanitizeRichHtml } from "../../utils/sanitize-html.js";

export class DoctorCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "DoctorCountryNotFoundError";
  }
}

export class DoctorSpecialtyInvalidError extends Error {
  constructor(message = "Specialty not found or does not belong to this country") {
    super(message);
    this.name = "DoctorSpecialtyInvalidError";
  }
}

/** Create/update sync assets + M:N countries; default 5s Prisma timeout is too low on Windows dev. */
const ADMIN_DOCTOR_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

const adminDoctorInclude = {
  country: {
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      defaultLocale: true,
    },
  },
  additionalCountries: {
    include: {
      country: {
        select: { id: true, code: true, name: true, slug: true, defaultLocale: true },
      },
    },
  },
  specialties: {
    include: {
      specialty: {
        select: { id: true, slug: true, name: true, active: true },
      },
    },
  },
  assets: {
    where: { kind: AssetKind.IMAGE },
    select: { id: true, kind: true, key: true, path: true },
  },
  /**
   * Linked login user (User.doctorId one-to-one). Powers the
   * "Account access" card on /admin/doctors/[id] so the admin can see
   * invite state (no account / pending / verified) without a second
   * round-trip.
   */
  loginUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerifiedAt: true,
      isActive: true,
      createdAt: true,
    },
  },
} satisfies Prisma.DoctorInclude;

export type AdminDoctorRecord = Prisma.DoctorGetPayload<{ include: typeof adminDoctorInclude }>;

export type ListAdminDoctorsResult = {
  items: AdminDoctorRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function doctorProfileImageKey(doctorId: string): string {
  return `doctor-${doctorId}-profile`;
}

export async function listDoctors() {
  try {
    return await prisma.doctor.findMany({
      where: { active: true },
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      include: {
        country: true,
        specialties: {
          include: {
            specialty: true,
          },
        },
        assets: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

/**
 * Public roster for a country. Includes doctors whose *primary* country is
 * this one PLUS doctors linked in via the DoctorCountry join (active rows
 * only). Linked rows are deduped if the primary already matches.
 */
export async function listDoctorsByCountry(countryCode: string) {
  try {
    const rows = await prisma.doctor.findMany({
      where: {
        active: true,
        OR: [
          { country: { code: countryCode, isActive: true } },
          {
            additionalCountries: {
              some: {
                active: true,
                country: { code: countryCode, isActive: true },
              },
            },
          },
        ],
      },
      orderBy: [{ fullName: "asc" }],
      include: {
        country: { select: { id: true, code: true, slug: true, name: true } },
        specialties: { include: { specialty: true } },
        assets: {
          where: { isActive: true, kind: AssetKind.IMAGE },
          // Deterministic ordering — without an explicit orderBy the
          // listing endpoint and the detail endpoint can pick different
          // images for the same doctor (Postgres row order is
          // unspecified). createdAt ASC means whichever image was
          // uploaded first wins on both surfaces — same portrait
          // everywhere.
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, kind: true, key: true, path: true, altText: true },
        },
        // Per-market registration row. The single DoctorCountry record
        // for the country being viewed replaces the legacy
        // Doctor.imcRegistration field via the post-mapper below — once
        // every reader is on this path, the legacy column drops.
        additionalCountries: {
          where: { country: { code: countryCode } },
          select: {
            chamberEntity: true,
            registrationNumber: true,
            isVerified: true,
          },
          take: 1,
        },
        // Services the doctor is bookable for in this country. Doctor
        // profile page uses this to scope the service list shown next
        // to the calendar.
        assignedServices: {
          where: {
            isActive: true,
            service: {
              isActive: true,
              country: { code: countryCode, isActive: true },
            },
          },
          orderBy: { sortOrder: "asc" },
          select: { serviceId: true },
        },
      },
    });
    return rows.map((d) => overrideImcRegistrationFromCountry(d));
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

/**
 * Phase 2 shim: the legacy `Doctor.imcRegistration` column is gone.
 * Every public payload that used to surface it now gets the value
 * computed from `DoctorCountry.registrationNumber` for the country
 * being viewed. Frontend display code stays on the legacy field name
 * — only the data source moved.
 */
function overrideImcRegistrationFromCountry<
  T extends {
    additionalCountries?: Array<{
      chamberEntity: string | null;
      registrationNumber: string | null;
      isVerified: boolean;
    }>;
  },
>(doctor: T): T & { imcRegistration: string | null } {
  const link = doctor.additionalCountries?.[0];
  return {
    ...doctor,
    imcRegistration: link?.registrationNumber ?? null,
  };
}

/**
 * Single-profile lookup by `{ country code, doctor slug }`. Doctor's slug
 * is globally scoped to its primary country (schema `@@unique([countryId, slug])`),
 * but multi-country listings mean the URL `/{otherCountry}/{lang}/doctors/{slug}`
 * is also valid — we accept the match if the doctor is linked into that
 * country via DoctorCountry.
 */
export async function getDoctorByCountryAndSlug(countryCode: string, slug: string) {
  try {
    const doctor = await prisma.doctor.findFirst({
      where: {
        slug,
        active: true,
        OR: [
          { country: { code: countryCode, isActive: true } },
          {
            additionalCountries: {
              some: {
                active: true,
                country: { code: countryCode, isActive: true },
              },
            },
          },
        ],
      },
      include: {
        country: { select: { id: true, code: true, slug: true, name: true } },
        specialties: { include: { specialty: true } },
        assets: {
          where: { isActive: true, kind: AssetKind.IMAGE },
          // Match the listing endpoint's asset ordering so the same
          // doctor renders the same portrait on /{country}/{lang}/doctors
          // and on /{country}/{lang}/doctors/{slug}.
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, kind: true, key: true, path: true, altText: true },
        },
        // Per-market registration row for this country (see Phase 2
        // note on overrideImcRegistrationFromCountry below).
        additionalCountries: {
          where: { country: { code: countryCode } },
          select: {
            chamberEntity: true,
            registrationNumber: true,
            isVerified: true,
          },
          take: 1,
        },
        // Active service assignments scoped to the country being viewed.
        assignedServices: {
          where: {
            isActive: true,
            service: {
              isActive: true,
              country: { code: countryCode, isActive: true },
            },
          },
          orderBy: { sortOrder: "asc" },
          include: {
            service: {
              select: {
                id: true,
                slug: true,
                name: true,
                kind: true,
                summary: true,
                durationMinutes: true,
                basePriceCents: true,
                currencyCode: true,
              },
            },
          },
        },
      },
    });
    return doctor ? overrideImcRegistrationFromCountry(doctor) : null;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new DoctorCountryNotFoundError();
}

async function assertSpecialtiesForCountry(specialtyIds: string[], countryId: string): Promise<void> {
  if (specialtyIds.length === 0) return;
  const rows = await prisma.specialty.findMany({
    where: { id: { in: specialtyIds } },
    select: { id: true, countryId: true },
  });
  if (rows.length !== specialtyIds.length) {
    throw new DoctorSpecialtyInvalidError("One or more specialties were not found");
  }
  for (const row of rows) {
    if (row.countryId !== countryId) {
      throw new DoctorSpecialtyInvalidError();
    }
  }
}

function buildAdminDoctorWhere(query: AdminDoctorsQuery): Prisma.DoctorWhereInput {
  const where: Prisma.DoctorWhereInput = {};

  if (query.countryId) {
    where.countryId = query.countryId;
  }
  if (query.countryCode) {
    where.country = { code: query.countryCode };
  }
  if (query.specialtyId) {
    where.specialties = { some: { specialtyId: query.specialtyId } };
  }
  if (query.isActive !== undefined) {
    where.active = query.isActive;
  }

  const term = query.search?.trim();
  if (term && term.length > 0) {
    where.OR = [
      { fullName: { contains: term, mode: "insensitive" } },
      { title: { contains: term, mode: "insensitive" } },
      { bio: { contains: term, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listAdminDoctors(query: AdminDoctorsQuery): Promise<ListAdminDoctorsResult> {
  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));
  const where = buildAdminDoctorWhere(query);

  try {
    const total = await prisma.doctor.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const items = await prisma.doctor.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      include: adminDoctorInclude,
    });

    return {
      items,
      pagination: {
        page: effectivePage,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function getAdminDoctorById(id: string): Promise<AdminDoctorRecord | null> {
  try {
    return await prisma.doctor.findUnique({
      where: { id },
      include: adminDoctorInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

async function syncProfileImageAsset(
  doctorId: string,
  countryId: string,
  profileImagePath: string | null | undefined,
): Promise<void> {
  const key = doctorProfileImageKey(doctorId);

  if (profileImagePath === undefined) {
    return;
  }

  if (profileImagePath === null || profileImagePath === "") {
    await prisma.asset.deleteMany({
      where: {
        doctorId,
        kind: AssetKind.IMAGE,
        key,
      },
    });
    return;
  }

  // Deactivate any OTHER active IMAGE assets for this doctor before
  // writing the admin's canonical row. The doctor-portal upload flow
  // (POST /api/doctor/profile/photo) creates a separately-keyed asset
  // and deactivates everything else — if that ran after a prior admin
  // upload, the canonical `doctor-<id>-profile` row was left with
  // `isActive: false`. Public reads filter `isActive: true`, so the
  // doctor-portal row keeps winning and the admin's update appears to
  // "revert" after a few hours. Forcing isActive=true on upsert + sweeping
  // siblings here gives admin the last word.
  await prisma.$transaction([
    prisma.asset.updateMany({
      where: {
        doctorId,
        kind: AssetKind.IMAGE,
        isActive: true,
        NOT: { key },
      },
      data: { isActive: false },
    }),
    prisma.asset.upsert({
      where: {
        kind_key: { kind: AssetKind.IMAGE, key },
      },
      create: {
        kind: AssetKind.IMAGE,
        key,
        path: profileImagePath,
        doctorId,
        countryId,
        isActive: true,
      },
      update: {
        path: profileImagePath,
        doctorId,
        countryId,
        isActive: true,
      },
    }),
  ]);
}

/**
 * Sync the additional-country listings for a doctor. The primary country
 * stays on `Doctor.countryId` and is excluded from this set — only "extra"
 * countries the doctor practises in get a DoctorCountry row.
 *
 * Behavior on UNCHECKED countries:
 *   - If the row holds registration data (chamberEntity or registrationNumber),
 *     it is DEACTIVATED (`active: false`) — the row is preserved so the
 *     medical-registration that admins entered separately via the
 *     /admin/doctors/:id/registrations/:countryId endpoint is never silently
 *     destroyed by an unrelated profile save. Re-ticking the country in the
 *     profile form (or saving the registration again) re-activates the row.
 *   - If the row is empty (no registration data), it is DELETED — pure
 *     visibility toggle, no data to preserve.
 *
 * Pass `additionalCountryIds: undefined` to skip the sync entirely.
 */
async function syncAdditionalCountries(
  tx: Prisma.TransactionClient,
  doctorId: string,
  primaryCountryId: string,
  additionalCountryIds: string[] | undefined,
): Promise<void> {
  if (additionalCountryIds === undefined) return;
  // Never insert the primary country into the join table — it's tracked
  // by Doctor.countryId already.
  const desired = new Set(
    additionalCountryIds.filter((id) => id !== primaryCountryId),
  );
  const existing = await tx.doctorCountry.findMany({
    where: { doctorId },
    select: {
      id: true,
      countryId: true,
      active: true,
      chamberEntity: true,
      registrationNumber: true,
    },
  });
  const existingIds = new Set(existing.map((r) => r.countryId));

  const toCreate = [...desired].filter((id) => !existingIds.has(id));
  const toRemove = existing.filter((r) => !desired.has(r.countryId));
  const toReactivate = existing.filter(
    (r) => desired.has(r.countryId) && !r.active,
  );

  // Split removals: deactivate rows that hold registration data,
  // delete rows that are empty.
  const removeWithData = toRemove.filter(
    (r) => Boolean(r.chamberEntity) || Boolean(r.registrationNumber),
  );
  const removeEmpty = toRemove.filter(
    (r) => !r.chamberEntity && !r.registrationNumber,
  );

  if (removeEmpty.length > 0) {
    await tx.doctorCountry.deleteMany({
      where: { id: { in: removeEmpty.map((r) => r.id) } },
    });
  }
  if (removeWithData.length > 0) {
    await tx.doctorCountry.updateMany({
      where: { id: { in: removeWithData.map((r) => r.id) } },
      data: { active: false },
    });
  }
  if (toReactivate.length > 0) {
    await tx.doctorCountry.updateMany({
      where: { id: { in: toReactivate.map((r) => r.id) } },
      data: { active: true },
    });
  }
  if (toCreate.length > 0) {
    await tx.doctorCountry.createMany({
      data: toCreate.map((countryId) => ({ doctorId, countryId })),
    });
  }
}

export async function createAdminDoctor(input: AdminDoctorCreateBody): Promise<AdminDoctorRecord> {
  await assertCountryExists(input.countryId);
  await assertSpecialtiesForCountry(input.specialtyIds, input.countryId);

  try {
    const doctor = await prisma.$transaction(async (tx) => {
      const created = await tx.doctor.create({
        data: {
          countryId: input.countryId,
          slug: input.slug,
          fullName: input.fullName,
          title: input.title,
          bio: sanitizeRichHtml(input.bio),
          // Phase 2: imcRegistration column is gone. The admin schema
          // still accepts the field for backward compat with old form
          // submissions (a stale frontend cache might POST it); we just
          // drop it on the floor here. Real per-country registrations
          // are saved via /api/admin/doctors/:id/registrations/:countryId.
          medicalRegistrationUrl: input.medicalRegistrationUrl ?? null,
          qualifications: input.qualifications ?? [],
          whatsappNumber: input.whatsappNumber ?? null,
          languages: input.languages ?? [],
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          active: input.active ?? true,
          specialties: {
            create: input.specialtyIds.map((specialtyId) => ({
              specialty: { connect: { id: specialtyId } },
            })),
          },
        },
        include: adminDoctorInclude,
      });

      const path = input.profileImagePath;
      if (path !== undefined && path !== null && path !== "") {
        await tx.asset.upsert({
          where: {
            kind_key: {
              kind: AssetKind.IMAGE,
              key: doctorProfileImageKey(created.id),
            },
          },
          create: {
            kind: AssetKind.IMAGE,
            key: doctorProfileImageKey(created.id),
            path,
            doctorId: created.id,
            countryId: input.countryId,
          },
          update: {
            path,
            doctorId: created.id,
            countryId: input.countryId,
          },
        });
      }

      // Multi-country listings — the M:N join only carries additional
      // countries; the primary one lives on Doctor.countryId.
      await syncAdditionalCountries(
        tx,
        created.id,
        input.countryId,
        input.additionalCountryIds,
      );

      return tx.doctor.findUniqueOrThrow({
        where: { id: created.id },
        include: adminDoctorInclude,
      });
    }, ADMIN_DOCTOR_TX_OPTIONS);

    return doctor;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export type UpdateAdminDoctorResult = {
  doctor: AdminDoctorRecord;
  /**
   * Populated when the PATCH changed `Doctor.countryId`. Lets the route
   * handler emit a precise audit record (`from`/`to`) and bust caches
   * for the OLD country code in addition to the new one.
   */
  countryChange: {
    fromCountryId: string;
    fromCountryCode: string | null;
    toCountryId: string;
    toCountryCode: string | null;
  } | null;
};

export async function updateAdminDoctor(
  id: string,
  body: AdminDoctorUpdateBody,
): Promise<UpdateAdminDoctorResult | null> {
  const existing = await prisma.doctor.findUnique({
    where: { id },
    select: {
      countryId: true,
      country: { select: { code: true } },
    },
  });
  if (!existing) return null;

  const nextCountryId = body.countryId ?? existing.countryId;
  const countryChanging =
    body.countryId !== undefined && body.countryId !== existing.countryId;

  // Honor admin-supplied specialtyIds when present (validated against the
  // NEW primary country). When the country changes and admin did NOT send a
  // new specialty list, clear the existing assignments — they belong to the
  // old country and would FK-conflict with new-country specialties.
  const nextSpecialtyIds =
    body.specialtyIds !== undefined
      ? body.specialtyIds
      : countryChanging
        ? []
        : undefined;
  if (nextSpecialtyIds !== undefined && nextSpecialtyIds.length > 0) {
    await assertSpecialtiesForCountry(nextSpecialtyIds, nextCountryId);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.doctor.update({
        where: { id },
        data: {
          ...(body.countryId !== undefined && { countryId: body.countryId }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.fullName !== undefined && { fullName: body.fullName }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.bio !== undefined && { bio: sanitizeRichHtml(body.bio) }),
          // Phase 2: imcRegistration column dropped — silently ignore
          // any legacy frontend that still posts it. Real registrations
          // live on DoctorCountry rows now.
          ...(body.medicalRegistrationUrl !== undefined && { medicalRegistrationUrl: body.medicalRegistrationUrl }),
          ...(body.qualifications !== undefined && { qualifications: body.qualifications }),
          ...(body.whatsappNumber !== undefined && { whatsappNumber: body.whatsappNumber }),
          ...(body.languages !== undefined && { languages: body.languages }),
          ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
          ...(body.seoDescription !== undefined && {
            seoDescription: body.seoDescription,
          }),
          ...(body.active !== undefined && { active: body.active }),
          ...(body.canCreateManualAppointments !== undefined && {
            canCreateManualAppointments: body.canCreateManualAppointments,
          }),
        },
        include: { country: { select: { id: true, code: true } } },
      });

      if (nextSpecialtyIds !== undefined) {
        await tx.doctorSpecialty.deleteMany({ where: { doctorId: id } });
        if (nextSpecialtyIds.length > 0) {
          await tx.doctorSpecialty.createMany({
            data: nextSpecialtyIds.map((specialtyId) => ({ doctorId: id, specialtyId })),
          });
        }
      }

      const effectiveCountryId = updated.countryId;
      await syncProfileImageAsset(id, effectiveCountryId, body.profileImagePath);

      await syncAdditionalCountries(
        tx,
        id,
        effectiveCountryId,
        body.additionalCountryIds,
      );

      // When the primary country changed, repoint the existing portrait
      // Asset.countryId so country-scoped admin asset queries don't keep
      // classifying the doctor's image under the OLD country. syncProfileImageAsset
      // above only fires when the admin actually re-uploaded — for a country-only
      // PATCH we still need to repoint the row in place.
      if (countryChanging && body.profileImagePath === undefined) {
        await tx.asset.updateMany({
          where: {
            doctorId: id,
            kind: AssetKind.IMAGE,
            key: doctorProfileImageKey(id),
          },
          data: { countryId: effectiveCountryId },
        });
      }

      // When the primary country changed, prune ServiceDoctor join rows
      // that point at services the doctor is no longer reachable from.
      // Effective country set = new primary + supplied additionalCountryIds
      // (when omitted, we fall back to the rows currently in DoctorCountry).
      if (countryChanging) {
        const effectiveCountryIds = new Set<string>([effectiveCountryId]);
        if (body.additionalCountryIds !== undefined) {
          for (const cid of body.additionalCountryIds) {
            effectiveCountryIds.add(cid);
          }
        } else {
          const linked = await tx.doctorCountry.findMany({
            where: { doctorId: id, active: true },
            select: { countryId: true },
          });
          for (const link of linked) effectiveCountryIds.add(link.countryId);
        }
        await tx.serviceDoctor.deleteMany({
          where: {
            doctorId: id,
            service: { countryId: { notIn: [...effectiveCountryIds] } },
          },
        });
      }

      const refreshed = await tx.doctor.findUniqueOrThrow({
        where: { id },
        include: adminDoctorInclude,
      });
      return {
        doctor: refreshed,
        countryChange: countryChanging
          ? {
              fromCountryId: existing.countryId,
              fromCountryCode: existing.country?.code ?? null,
              toCountryId: effectiveCountryId,
              toCountryCode: updated.country?.code ?? null,
            }
          : null,
      } satisfies UpdateAdminDoctorResult;
    }, ADMIN_DOCTOR_TX_OPTIONS);

    return result;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function disableAdminDoctor(id: string): Promise<AdminDoctorRecord | null> {
  const existing = await prisma.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  try {
    return await prisma.doctor.update({
      where: { id },
      data: { active: false },
      include: adminDoctorInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function purgeAdminDoctor(id: string): Promise<boolean> {
  const existing = await prisma.doctor.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;

  try {
    await prisma.doctor.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}
