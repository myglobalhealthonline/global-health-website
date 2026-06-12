import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";

export type DoctorCredentialInput = {
  countryCode?: string | null;
  label: string;
  bodyName: string;
  bodyUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type DoctorCredentialRow = {
  id: string;
  doctorId: string;
  countryCode: string | null;
  label: string;
  bodyName: string;
  bodyUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

const SELECT = {
  id: true,
  doctorId: true,
  countryCode: true,
  label: true,
  bodyName: true,
  bodyUrl: true,
  sortOrder: true,
  isActive: true,
} as const;

export async function listDoctorCredentials(doctorId: string): Promise<DoctorCredentialRow[]> {
  try {
    return await prisma.doctorCredential.findMany({
      where: { doctorId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Doctor credentials unavailable");
  }
}

export async function createDoctorCredential(
  doctorId: string,
  input: DoctorCredentialInput,
): Promise<DoctorCredentialRow | null> {
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } });
  if (!doctor) return null;
  try {
    return await prisma.doctorCredential.create({
      data: {
        doctorId,
        countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
        label: input.label,
        bodyName: input.bodyName,
        bodyUrl: input.bodyUrl ?? null,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not create credential");
  }
}

export async function updateDoctorCredential(
  id: string,
  input: Partial<DoctorCredentialInput>,
): Promise<DoctorCredentialRow | null> {
  const existing = await prisma.doctorCredential.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    return await prisma.doctorCredential.update({
      where: { id },
      data: {
        ...(input.countryCode !== undefined && {
          countryCode: input.countryCode ? input.countryCode.toUpperCase() : null,
        }),
        ...(input.label !== undefined && { label: input.label }),
        ...(input.bodyName !== undefined && { bodyName: input.bodyName }),
        ...(input.bodyUrl !== undefined && { bodyUrl: input.bodyUrl }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: SELECT,
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not update credential");
  }
}

export async function deleteDoctorCredential(id: string): Promise<boolean> {
  const existing = await prisma.doctorCredential.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return false;
  try {
    await prisma.doctorCredential.delete({ where: { id } });
    return true;
  } catch (error) {
    throw normalizeDbError(error, "Could not delete credential");
  }
}
