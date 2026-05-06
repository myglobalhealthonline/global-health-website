import { AssetKind, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import type {
  AdminDoctorCreateBody,
  AdminDoctorUpdateBody,
  AdminDoctorsQuery,
} from "../../validations/admin-doctors.schema.js";
import { normalizeDbError } from "../shared/db-errors.js";

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

const adminDoctorInclude = {
  country: {
    select: {
      id: true,
      code: true,
      name: true,
      teamPath: true,
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

  await prisma.asset.upsert({
    where: {
      kind_key: { kind: AssetKind.IMAGE, key },
    },
    create: {
      kind: AssetKind.IMAGE,
      key,
      path: profileImagePath,
      doctorId,
      countryId,
    },
    update: {
      path: profileImagePath,
      doctorId,
      countryId,
    },
  });
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
          bio: input.bio ?? null,
          imcRegistration: input.imcRegistration ?? null,
          whatsappNumber: input.whatsappNumber ?? null,
          languages: input.languages ?? [],
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

      return tx.doctor.findUniqueOrThrow({
        where: { id: created.id },
        include: adminDoctorInclude,
      });
    });

    return doctor;
  } catch (error) {
    throw normalizeDbError(error, "Doctors data is unavailable");
  }
}

export async function updateAdminDoctor(
  id: string,
  body: AdminDoctorUpdateBody,
): Promise<AdminDoctorRecord | null> {
  const existing = await prisma.doctor.findUnique({
    where: { id },
    select: { countryId: true },
  });
  if (!existing) return null;

  if (body.countryId !== undefined && body.countryId !== existing.countryId) {
    throw new DoctorSpecialtyInvalidError(
      "Country cannot be changed on an existing profile — create a new doctor profile in the target country and deactivate this one if needed",
    );
  }

  const nextCountryId = existing.countryId;

  const nextSpecialtyIds = body.specialtyIds;
  if (nextSpecialtyIds !== undefined) {
    await assertSpecialtiesForCountry(nextSpecialtyIds, nextCountryId);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.doctor.update({
        where: { id },
        data: {
          ...(body.countryId !== undefined && { countryId: body.countryId }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.fullName !== undefined && { fullName: body.fullName }),
          ...(body.title !== undefined && { title: body.title }),
          ...(body.bio !== undefined && { bio: body.bio }),
          ...(body.imcRegistration !== undefined && { imcRegistration: body.imcRegistration }),
          ...(body.whatsappNumber !== undefined && { whatsappNumber: body.whatsappNumber }),
          ...(body.languages !== undefined && { languages: body.languages }),
          ...(body.active !== undefined && { active: body.active }),
        },
        include: adminDoctorInclude,
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

      return tx.doctor.findUniqueOrThrow({
        where: { id },
        include: adminDoctorInclude,
      });
    });
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
